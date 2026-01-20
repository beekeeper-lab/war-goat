#!/usr/bin/env python3
"""
Workflow Overlap Detection

Detects when multiple workflows modify overlapping files and produces
warnings with risk scores.

Usage:
    detect-overlap.py [--project-dir PATH] [--output-format json|markdown]
    detect-overlap.py --check <workflow-id> [--project-dir PATH]

Outputs:
    - workflow/_reports/overlap-report.md (default)
    - JSON format for programmatic use
"""

import json
import sys
import os
from datetime import datetime
from pathlib import Path
import subprocess
import argparse
from collections import defaultdict
from typing import Optional


def get_active_workflows(project_dir: Path) -> list:
    """Get all active workflows (not archived)."""
    workflow_dir = project_dir / "workflow"
    workflows = []

    if not workflow_dir.exists():
        return workflows

    for item in workflow_dir.iterdir():
        if item.is_dir() and not item.name.startswith(('_', '.')):
            status_file = item / "status.json"
            if status_file.exists():
                try:
                    with open(status_file, 'r') as f:
                        status = json.load(f)
                    workflows.append({
                        "id": item.name,
                        "path": str(item),
                        "status": status,
                        "branch": status.get("branch", f"feature/{item.name}"),
                        "current_stage": status.get("currentStage", "unknown"),
                        "type": status.get("type", "feature"),
                        "title": status.get("title", item.name)
                    })
                except (json.JSONDecodeError, IOError):
                    pass

    return workflows


def get_worktree_path(workflow: dict, project_dir: Path) -> Optional[Path]:
    """Get the worktree path for a workflow."""
    # Try from status.json
    worktree = workflow["status"].get("worktree")
    if worktree:
        path = project_dir / worktree
        if path.exists():
            return path

    # Try common pattern: project-name-workflowid
    project_name = project_dir.name
    worktree_path = project_dir.parent / f"{project_name}-{workflow['id'].lower()}"
    if worktree_path.exists():
        return worktree_path

    return None


def get_branch_files(branch: str, base_branch: str = "main",
                     cwd: Path = None) -> set:
    """Get files modified in a branch compared to base."""
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", f"{base_branch}...{branch}"],
            capture_output=True, text=True, cwd=str(cwd) if cwd else None
        )
        if result.returncode == 0:
            return set(result.stdout.strip().split('\n')) - {''}
    except Exception:
        pass
    return set()


def get_worktree_modified_files(worktree_path: Path) -> set:
    """Get files modified in a worktree (staged + unstaged + committed)."""
    files = set()

    try:
        # Get files different from main
        result = subprocess.run(
            ["git", "diff", "--name-only", "origin/main...HEAD"],
            capture_output=True, text=True, cwd=str(worktree_path)
        )
        if result.returncode == 0:
            files.update(result.stdout.strip().split('\n'))

        # Get staged files
        result = subprocess.run(
            ["git", "diff", "--name-only", "--cached"],
            capture_output=True, text=True, cwd=str(worktree_path)
        )
        if result.returncode == 0:
            files.update(result.stdout.strip().split('\n'))

        # Get unstaged files
        result = subprocess.run(
            ["git", "diff", "--name-only"],
            capture_output=True, text=True, cwd=str(worktree_path)
        )
        if result.returncode == 0:
            files.update(result.stdout.strip().split('\n'))

    except Exception:
        pass

    return files - {''}


def get_implementation_files(workflow: dict, project_dir: Path) -> set:
    """Get files from implementation report."""
    files = set()
    impl_report = project_dir / "workflow" / workflow["id"] / "3-implementation.md"

    if impl_report.exists():
        try:
            with open(impl_report, 'r') as f:
                content = f.read()
            # Look for file paths in various sections
            import re
            # Match common file patterns
            patterns = [
                r'\| `?([^\s|`]+\.[a-zA-Z]+)`? \|',  # Table entries
                r'- `([^\s`]+\.[a-zA-Z]+)`',  # List entries
                r'File: `([^\s`]+)`',  # File: entries
            ]
            for pattern in patterns:
                matches = re.findall(pattern, content)
                files.update(matches)
        except IOError:
            pass

    return files


def get_spec_files(workflow: dict, project_dir: Path) -> set:
    """Get files mentioned in the spec."""
    files = set()
    spec_file = project_dir / "specs" / f"{workflow['id']}-spec.md"

    if spec_file.exists():
        try:
            with open(spec_file, 'r') as f:
                content = f.read()
            import re
            patterns = [
                r'\| `?([^\s|`]+\.[a-zA-Z]+)`? \|',
                r'- `([^\s`]+\.[a-zA-Z]+)`',
                r'`([^\s`]+\.[a-zA-Z]+)`',
            ]
            for pattern in patterns:
                matches = re.findall(pattern, content)
                # Filter to likely file paths (contains / or common extensions)
                for match in matches:
                    if '/' in match or match.endswith(('.ts', '.tsx', '.js', '.jsx', '.py', '.md', '.json', '.css')):
                        files.add(match)
        except IOError:
            pass

    return files


def collect_workflow_files(workflow: dict, project_dir: Path) -> set:
    """Collect all files associated with a workflow from all sources."""
    files = set()

    # From git worktree
    worktree_path = get_worktree_path(workflow, project_dir)
    if worktree_path:
        files.update(get_worktree_modified_files(worktree_path))

    # From branch (if we can access it)
    branch = workflow.get("branch")
    if branch:
        branch_files = get_branch_files(branch, "main", project_dir)
        files.update(branch_files)

    # From implementation report
    files.update(get_implementation_files(workflow, project_dir))

    # From spec
    files.update(get_spec_files(workflow, project_dir))

    # Filter out workflow-specific files (these don't conflict)
    workflow_id = workflow["id"]
    files = {f for f in files if not (
        f.startswith(f"workflow/{workflow_id}/") or
        f.startswith(f"specs/{workflow_id}") or
        f.startswith(f"docs/requirements/{workflow_id}")
    )}

    return files


def calculate_risk_score(overlaps: dict, workflow1: dict, workflow2: dict) -> int:
    """Calculate risk score for overlap between two workflows.

    Risk factors:
    - Number of overlapping files (1 point each, max 20)
    - Critical files overlap (src/, server/, components/): +10 per file
    - Both workflows in late stage: +20
    - Config files overlap: +15
    - Test files overlap: +5 (less risky, tests can merge)
    """
    score = 0
    files = overlaps.get("files", [])

    # Base score from file count
    score += min(len(files), 20)

    for f in files:
        # Critical source files
        if any(f.startswith(p) for p in ['src/', 'server/', 'components/', 'lib/']):
            score += 10
        # Config files are high risk
        elif f.endswith(('.json', '.config.js', '.config.ts', 'package.json')):
            score += 15
        # Test files are lower risk
        elif '.test.' in f or '.spec.' in f or f.startswith('tests/'):
            score += 5

    # Stage-based risk
    late_stages = {'implementation', 'qa', 'integration-gate'}
    w1_stage = workflow1.get("current_stage", "")
    w2_stage = workflow2.get("current_stage", "")

    if w1_stage in late_stages and w2_stage in late_stages:
        score += 20

    return score


def detect_overlaps(project_dir: Path) -> dict:
    """Detect file overlaps between all active workflows."""
    workflows = get_active_workflows(project_dir)

    # Collect files for each workflow
    workflow_files = {}
    for wf in workflows:
        files = collect_workflow_files(wf, project_dir)
        workflow_files[wf["id"]] = {
            "workflow": wf,
            "files": files
        }

    # Find overlaps
    overlaps = []
    workflow_ids = list(workflow_files.keys())

    for i, id1 in enumerate(workflow_ids):
        for id2 in workflow_ids[i+1:]:
            files1 = workflow_files[id1]["files"]
            files2 = workflow_files[id2]["files"]
            common = files1 & files2

            if common:
                wf1 = workflow_files[id1]["workflow"]
                wf2 = workflow_files[id2]["workflow"]

                overlap = {
                    "workflow1": id1,
                    "workflow2": id2,
                    "files": sorted(list(common)),
                    "workflow1_stage": wf1.get("current_stage"),
                    "workflow2_stage": wf2.get("current_stage"),
                    "workflow1_title": wf1.get("title"),
                    "workflow2_title": wf2.get("title")
                }

                overlap["risk_score"] = calculate_risk_score(overlap, wf1, wf2)
                overlap["risk_level"] = (
                    "critical" if overlap["risk_score"] >= 50 else
                    "high" if overlap["risk_score"] >= 30 else
                    "medium" if overlap["risk_score"] >= 15 else
                    "low"
                )

                overlaps.append(overlap)

    # Sort by risk score descending
    overlaps.sort(key=lambda x: x["risk_score"], reverse=True)

    return {
        "generated_at": datetime.utcnow().isoformat() + 'Z',
        "total_workflows": len(workflows),
        "workflows_with_files": len([w for w in workflow_files.values() if w["files"]]),
        "total_overlaps": len(overlaps),
        "critical_overlaps": len([o for o in overlaps if o["risk_level"] == "critical"]),
        "high_risk_overlaps": len([o for o in overlaps if o["risk_level"] == "high"]),
        "overlaps": overlaps,
        "workflow_summary": {
            wf_id: {
                "title": data["workflow"].get("title"),
                "stage": data["workflow"].get("current_stage"),
                "file_count": len(data["files"]),
                "files": sorted(list(data["files"]))[:20]  # Limit for readability
            }
            for wf_id, data in workflow_files.items()
        }
    }


def check_workflow_overlaps(workflow_id: str, project_dir: Path) -> dict:
    """Check if a specific workflow has overlaps with others."""
    all_overlaps = detect_overlaps(project_dir)

    relevant = [o for o in all_overlaps["overlaps"]
                if o["workflow1"] == workflow_id or o["workflow2"] == workflow_id]

    return {
        "workflow_id": workflow_id,
        "has_overlaps": len(relevant) > 0,
        "overlap_count": len(relevant),
        "max_risk_score": max((o["risk_score"] for o in relevant), default=0),
        "max_risk_level": max((o["risk_level"] for o in relevant),
                             key=lambda x: ["low", "medium", "high", "critical"].index(x),
                             default="none"),
        "overlaps": relevant,
        "recommendation": get_recommendation(relevant)
    }


def get_recommendation(overlaps: list) -> str:
    """Get a recommendation based on overlaps."""
    if not overlaps:
        return "No overlaps detected. Safe to proceed."

    max_risk = max(o["risk_score"] for o in overlaps)

    if max_risk >= 50:
        return "CRITICAL: Coordinate with other workflows before proceeding. Manual merge likely required."
    elif max_risk >= 30:
        return "HIGH RISK: Review overlapping files carefully. Consider sequencing workflows."
    elif max_risk >= 15:
        return "MEDIUM RISK: Be aware of potential merge conflicts. Test thoroughly after integration."
    else:
        return "LOW RISK: Minor overlaps detected. Standard merge process should work."


def generate_markdown_report(overlaps: dict, output_path: Path):
    """Generate markdown report."""
    lines = [
        "# Workflow Overlap Report",
        "",
        f"Generated: {overlaps['generated_at']}",
        "",
        "## Summary",
        "",
        f"- **Active Workflows**: {overlaps['total_workflows']}",
        f"- **Workflows with File Changes**: {overlaps['workflows_with_files']}",
        f"- **Total Overlaps Detected**: {overlaps['total_overlaps']}",
        f"- **Critical Overlaps**: {overlaps['critical_overlaps']}",
        f"- **High Risk Overlaps**: {overlaps['high_risk_overlaps']}",
        "",
    ]

    if overlaps['total_overlaps'] == 0:
        lines.extend([
            "## Status: All Clear",
            "",
            "No file overlaps detected between active workflows.",
            ""
        ])
    else:
        lines.extend([
            "## Overlap Details",
            "",
            "| Risk | Workflow 1 | Workflow 2 | Files | Score |",
            "|------|------------|------------|-------|-------|"
        ])

        for o in overlaps["overlaps"]:
            risk_emoji = {
                "critical": "🔴",
                "high": "🟠",
                "medium": "🟡",
                "low": "🟢"
            }.get(o["risk_level"], "⚪")

            lines.append(
                f"| {risk_emoji} {o['risk_level'].upper()} | "
                f"{o['workflow1']} ({o['workflow1_stage']}) | "
                f"{o['workflow2']} ({o['workflow2_stage']}) | "
                f"{len(o['files'])} | {o['risk_score']} |"
            )

        lines.append("")

        # Detailed sections for each overlap
        for o in overlaps["overlaps"]:
            lines.extend([
                f"### {o['workflow1']} <-> {o['workflow2']}",
                "",
                f"**Risk Level**: {o['risk_level'].upper()} (Score: {o['risk_score']})",
                "",
                f"- **{o['workflow1']}**: {o['workflow1_title']} (Stage: {o['workflow1_stage']})",
                f"- **{o['workflow2']}**: {o['workflow2_title']} (Stage: {o['workflow2_stage']})",
                "",
                "**Overlapping Files**:",
                ""
            ])
            for f in o["files"][:15]:  # Limit display
                lines.append(f"- `{f}`")
            if len(o["files"]) > 15:
                lines.append(f"- ... and {len(o['files']) - 15} more files")
            lines.append("")

    # Workflow summary
    lines.extend([
        "## Workflow File Summary",
        "",
        "| Workflow | Stage | Files Changed |",
        "|----------|-------|---------------|"
    ])

    for wf_id, summary in overlaps.get("workflow_summary", {}).items():
        lines.append(f"| {wf_id} | {summary['stage']} | {summary['file_count']} |")

    lines.extend([
        "",
        "---",
        "*Generated by detect-overlap.py*"
    ])

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        f.write('\n'.join(lines))


def main():
    parser = argparse.ArgumentParser(description="Detect workflow file overlaps")
    parser.add_argument("--project-dir", "-p", default=".",
                       help="Project directory path")
    parser.add_argument("--output-format", "-f", choices=["json", "markdown"],
                       default="markdown", help="Output format")
    parser.add_argument("--check", "-c", metavar="WORKFLOW_ID",
                       help="Check specific workflow for overlaps")
    parser.add_argument("--output", "-o", help="Output file path")

    args = parser.parse_args()
    project_dir = Path(args.project_dir).resolve()

    if args.check:
        result = check_workflow_overlaps(args.check, project_dir)
        print(json.dumps(result, indent=2))

        # Exit with non-zero if high risk
        if result["max_risk_level"] in ("critical", "high"):
            sys.exit(1)
        sys.exit(0)

    overlaps = detect_overlaps(project_dir)

    if args.output_format == "json":
        output = args.output or "workflow/_reports/overlap-report.json"
        output_path = project_dir / output
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w') as f:
            json.dump(overlaps, f, indent=2)
        print(f"JSON report written to: {output_path}")
    else:
        output = args.output or "workflow/_reports/overlap-report.md"
        output_path = project_dir / output
        generate_markdown_report(overlaps, output_path)
        print(f"Markdown report written to: {output_path}")

    # Summary to stdout
    print(f"\nOverlap Summary:")
    print(f"  Total workflows: {overlaps['total_workflows']}")
    print(f"  Overlaps found: {overlaps['total_overlaps']}")
    print(f"  Critical: {overlaps['critical_overlaps']}")
    print(f"  High risk: {overlaps['high_risk_overlaps']}")

    # Exit with non-zero if critical overlaps
    if overlaps['critical_overlaps'] > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
