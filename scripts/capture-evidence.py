#!/usr/bin/env python3
"""
Evidence Capture Helper for Workflow Stages

Captures machine-checkable evidence for stage completion including:
- Test execution results with exit codes
- File change diffs
- Checkpoint verification status
- Timestamps for audit trail

Usage:
    capture-evidence.py <workflow-id> <stage> <checkpoint> <status> <evidence-file> [--message "msg"]
    capture-evidence.py <workflow-id> <stage> --test-results <exit-code> <output-file>
    capture-evidence.py <workflow-id> <stage> --finalize
    capture-evidence.py <workflow-id> --stage-results <stage>
"""

import json
import sys
import os
from datetime import datetime
from pathlib import Path
import hashlib
import subprocess
import argparse


def get_workflow_dir(workflow_id: str, project_dir: str = None) -> Path:
    """Get the workflow directory path."""
    if project_dir:
        return Path(project_dir) / "workflow" / workflow_id
    return Path("workflow") / workflow_id


def get_evidence_dir(workflow_id: str, stage: str, project_dir: str = None) -> Path:
    """Get the evidence directory for a stage."""
    workflow_dir = get_workflow_dir(workflow_id, project_dir)
    evidence_dir = workflow_dir / "evidence" / stage
    evidence_dir.mkdir(parents=True, exist_ok=True)
    return evidence_dir


def compute_file_hash(filepath: Path) -> str:
    """Compute SHA256 hash of a file."""
    if not filepath.exists():
        return "file_not_found"
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            sha256.update(chunk)
    return sha256.hexdigest()


def get_git_diff_stat(project_dir: str = None) -> dict:
    """Get git diff statistics."""
    try:
        cwd = project_dir if project_dir else "."
        result = subprocess.run(
            ["git", "diff", "--stat", "HEAD~1"],
            capture_output=True, text=True, cwd=cwd
        )
        return {
            "diff_stat": result.stdout.strip(),
            "exit_code": result.returncode
        }
    except Exception as e:
        return {"error": str(e)}


def load_stage_results(workflow_id: str, project_dir: str = None) -> dict:
    """Load existing stage results or create new."""
    workflow_dir = get_workflow_dir(workflow_id, project_dir)
    results_file = workflow_dir / "stage-results.json"

    if results_file.exists():
        with open(results_file, 'r') as f:
            return json.load(f)

    return {
        "workflow_id": workflow_id,
        "created_at": datetime.utcnow().isoformat() + 'Z',
        "stages": {}
    }


def save_stage_results(workflow_id: str, results: dict, project_dir: str = None):
    """Save stage results to file."""
    workflow_dir = get_workflow_dir(workflow_id, project_dir)
    results_file = workflow_dir / "stage-results.json"

    results["last_updated"] = datetime.utcnow().isoformat() + 'Z'

    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)


def capture_checkpoint(workflow_id: str, stage: str, checkpoint: str,
                       status: str, evidence_file: str = None,
                       message: str = None, project_dir: str = None):
    """Capture a checkpoint result with evidence."""
    results = load_stage_results(workflow_id, project_dir)

    if stage not in results["stages"]:
        results["stages"][stage] = {
            "started_at": datetime.utcnow().isoformat() + 'Z',
            "checkpoints": {},
            "test_results": None,
            "finalized": False
        }

    checkpoint_data = {
        "status": status,  # "pass" or "fail"
        "captured_at": datetime.utcnow().isoformat() + 'Z',
        "message": message
    }

    if evidence_file:
        evidence_path = Path(evidence_file)
        if evidence_path.exists():
            checkpoint_data["evidence_file"] = str(evidence_file)
            checkpoint_data["evidence_hash"] = compute_file_hash(evidence_path)

    results["stages"][stage]["checkpoints"][checkpoint] = checkpoint_data
    save_stage_results(workflow_id, results, project_dir)

    print(f"[evidence] Captured checkpoint: {stage}/{checkpoint} = {status}")
    return checkpoint_data


def capture_test_results(workflow_id: str, stage: str, exit_code: int,
                        output_file: str = None, project_dir: str = None):
    """Capture test execution results."""
    results = load_stage_results(workflow_id, project_dir)
    evidence_dir = get_evidence_dir(workflow_id, stage, project_dir)

    if stage not in results["stages"]:
        results["stages"][stage] = {
            "started_at": datetime.utcnow().isoformat() + 'Z',
            "checkpoints": {},
            "test_results": None,
            "finalized": False
        }

    test_data = {
        "exit_code": exit_code,
        "passed": exit_code == 0,
        "captured_at": datetime.utcnow().isoformat() + 'Z'
    }

    # Copy test output to evidence directory
    if output_file and Path(output_file).exists():
        evidence_file = evidence_dir / "test-output.txt"
        with open(output_file, 'r') as src:
            content = src.read()
        with open(evidence_file, 'w') as dst:
            dst.write(content)

        test_data["output_file"] = str(evidence_file)
        test_data["output_hash"] = compute_file_hash(evidence_file)

        # Parse test summary if possible
        test_data["summary"] = parse_test_output(content)

    results["stages"][stage]["test_results"] = test_data
    save_stage_results(workflow_id, results, project_dir)

    status = "PASS" if exit_code == 0 else "FAIL"
    print(f"[evidence] Captured test results: {stage} = {status} (exit code: {exit_code})")
    return test_data


def parse_test_output(output: str) -> dict:
    """Parse test output to extract summary statistics."""
    summary = {}

    # Try to parse vitest output
    if "Tests" in output:
        lines = output.split('\n')
        for line in lines:
            # vitest format: "Tests  X passed | Y failed"
            if "passed" in line.lower() and ("test" in line.lower() or "spec" in line.lower()):
                summary["raw_line"] = line.strip()
                # Try to extract numbers
                import re
                passed = re.search(r'(\d+)\s*passed', line, re.IGNORECASE)
                failed = re.search(r'(\d+)\s*failed', line, re.IGNORECASE)
                if passed:
                    summary["passed"] = int(passed.group(1))
                if failed:
                    summary["failed"] = int(failed.group(1))
                break

    return summary


def finalize_stage(workflow_id: str, stage: str, project_dir: str = None):
    """Finalize a stage and compute overall status."""
    results = load_stage_results(workflow_id, project_dir)

    if stage not in results["stages"]:
        print(f"[evidence] ERROR: Stage {stage} not found")
        return None

    stage_data = results["stages"][stage]

    # Compute overall checkpoint status
    checkpoints = stage_data.get("checkpoints", {})
    all_pass = all(cp.get("status") == "pass" for cp in checkpoints.values())

    # Check test results
    test_results = stage_data.get("test_results")
    tests_pass = test_results is None or test_results.get("passed", False)

    # Overall status
    overall_pass = all_pass and tests_pass

    stage_data["finalized"] = True
    stage_data["completed_at"] = datetime.utcnow().isoformat() + 'Z'
    stage_data["overall_status"] = "pass" if overall_pass else "fail"
    stage_data["summary"] = {
        "checkpoints_total": len(checkpoints),
        "checkpoints_passed": sum(1 for cp in checkpoints.values() if cp.get("status") == "pass"),
        "tests_passed": tests_pass,
        "all_checks_passed": overall_pass
    }

    # Capture git diff
    stage_data["git_diff"] = get_git_diff_stat(project_dir)

    save_stage_results(workflow_id, results, project_dir)

    status = "PASS" if overall_pass else "FAIL"
    print(f"[evidence] Finalized stage: {stage} = {status}")
    print(f"[evidence]   Checkpoints: {stage_data['summary']['checkpoints_passed']}/{stage_data['summary']['checkpoints_total']}")
    print(f"[evidence]   Tests: {'PASS' if tests_pass else 'FAIL'}")

    return stage_data


def get_stage_status(workflow_id: str, stage: str, project_dir: str = None) -> dict:
    """Get the status of a specific stage."""
    results = load_stage_results(workflow_id, project_dir)

    if stage not in results.get("stages", {}):
        return {"status": "not_started", "stage": stage}

    stage_data = results["stages"][stage]
    return {
        "status": "finalized" if stage_data.get("finalized") else "in_progress",
        "stage": stage,
        "overall_status": stage_data.get("overall_status", "unknown"),
        "summary": stage_data.get("summary", {}),
        "checkpoints": list(stage_data.get("checkpoints", {}).keys())
    }


def verify_stage_complete(workflow_id: str, stage: str,
                         required_checkpoints: list, project_dir: str = None) -> dict:
    """Verify that a stage is complete with all required checkpoints passing."""
    results = load_stage_results(workflow_id, project_dir)

    verification = {
        "stage": stage,
        "verified_at": datetime.utcnow().isoformat() + 'Z',
        "is_complete": False,
        "missing_checkpoints": [],
        "failed_checkpoints": []
    }

    if stage not in results.get("stages", {}):
        verification["error"] = "Stage not found"
        return verification

    stage_data = results["stages"][stage]
    checkpoints = stage_data.get("checkpoints", {})

    for required in required_checkpoints:
        if required not in checkpoints:
            verification["missing_checkpoints"].append(required)
        elif checkpoints[required].get("status") != "pass":
            verification["failed_checkpoints"].append(required)

    verification["is_complete"] = (
        not verification["missing_checkpoints"] and
        not verification["failed_checkpoints"] and
        stage_data.get("finalized", False) and
        stage_data.get("overall_status") == "pass"
    )

    return verification


def main():
    parser = argparse.ArgumentParser(description="Capture evidence for workflow stages")
    parser.add_argument("workflow_id", help="Workflow ID")
    parser.add_argument("stage", nargs="?", help="Stage name")
    parser.add_argument("checkpoint", nargs="?", help="Checkpoint name")
    parser.add_argument("status", nargs="?", choices=["pass", "fail"], help="Checkpoint status")
    parser.add_argument("evidence_file", nargs="?", help="Path to evidence file")
    parser.add_argument("--message", "-m", help="Optional message")
    parser.add_argument("--test-results", nargs=2, metavar=("EXIT_CODE", "OUTPUT_FILE"),
                       help="Capture test results")
    parser.add_argument("--finalize", action="store_true", help="Finalize stage")
    parser.add_argument("--stage-results", action="store_true", help="Get stage results")
    parser.add_argument("--verify", nargs="+", metavar="CHECKPOINT",
                       help="Verify stage with required checkpoints")
    parser.add_argument("--project-dir", "-p", help="Project directory path")

    args = parser.parse_args()

    if args.test_results:
        exit_code, output_file = args.test_results
        capture_test_results(args.workflow_id, args.stage, int(exit_code),
                           output_file, args.project_dir)
    elif args.finalize:
        finalize_stage(args.workflow_id, args.stage, args.project_dir)
    elif args.stage_results:
        result = get_stage_status(args.workflow_id, args.stage, args.project_dir)
        print(json.dumps(result, indent=2))
    elif args.verify:
        result = verify_stage_complete(args.workflow_id, args.stage,
                                       args.verify, args.project_dir)
        print(json.dumps(result, indent=2))
        sys.exit(0 if result["is_complete"] else 1)
    elif args.checkpoint and args.status:
        capture_checkpoint(args.workflow_id, args.stage, args.checkpoint,
                          args.status, args.evidence_file, args.message,
                          args.project_dir)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
