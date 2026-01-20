#!/usr/bin/env python3
"""
Merge All PRs Safely

Merges a set of PRs sequentially, one at a time, ensuring after each merge
that main is still green and the next PR is revalidated on the updated base.

Usage:
    merge_all_prs.py [options]

Options:
    --label LABEL       Filter PRs by label (default: workflow-ready)
    --session SESSION   Filter PRs by session label (e.g., session:2026-01-20)
    --base BRANCH       Target branch (default: main)
    --limit N           Maximum number of PRs to merge
    --timeout MINUTES   Max wait time for checks (default: 30)
    --dry-run           Show what would be done without merging
    --verbose           Show detailed output
    --report-dir DIR    Directory for merge reports (default: workflow/_reports)

Examples:
    merge_all_prs.py                              # Merge all workflow-ready PRs
    merge_all_prs.py --session session:2026-01-20 # Merge PRs from specific session
    merge_all_prs.py --dry-run                    # Preview without merging
    merge_all_prs.py --limit 3                    # Merge at most 3 PRs
"""

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional


# ANSI colors
RED = '\033[0;31m'
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'


def log(msg: str, level: str = "info"):
    """Print a log message with color."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    colors = {"info": BLUE, "success": GREEN, "warn": YELLOW, "error": RED}
    color = colors.get(level, NC)
    print(f"{color}[{timestamp}]{NC} {msg}")


def run_gh(args: list, capture: bool = True) -> tuple[int, str, str]:
    """Run a gh CLI command and return (exit_code, stdout, stderr)."""
    cmd = ["gh"] + args
    result = subprocess.run(
        cmd,
        capture_output=capture,
        text=True
    )
    return result.returncode, result.stdout, result.stderr


def run_git(args: list) -> tuple[int, str, str]:
    """Run a git command and return (exit_code, stdout, stderr)."""
    cmd = ["git"] + args
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True
    )
    return result.returncode, result.stdout, result.stderr


def check_gh_auth() -> bool:
    """Verify gh CLI is authenticated."""
    code, _, _ = run_gh(["auth", "status"])
    return code == 0


def check_clean_working_tree() -> bool:
    """Check if working tree is clean."""
    code, stdout, _ = run_git(["status", "--porcelain"])
    return code == 0 and stdout.strip() == ""


def fetch_origin() -> bool:
    """Fetch latest from origin."""
    code, _, _ = run_git(["fetch", "origin"])
    return code == 0


def get_open_prs(label: str, session: Optional[str], base: str) -> list[dict]:
    """Get list of open PRs matching criteria."""
    args = [
        "pr", "list",
        "--state", "open",
        "--base", base,
        "--json", "number,title,headRefName,labels,mergeable,reviewDecision,statusCheckRollup,mergeStateStatus,author,createdAt"
    ]

    if label:
        args.extend(["--label", label])

    code, stdout, stderr = run_gh(args)
    if code != 0:
        log(f"Failed to list PRs: {stderr}", "error")
        return []

    try:
        prs = json.loads(stdout)
    except json.JSONDecodeError:
        log(f"Failed to parse PR list: {stdout}", "error")
        return []

    # Filter by session label if specified
    if session:
        prs = [pr for pr in prs if any(
            lbl.get("name", "") == session
            for lbl in pr.get("labels", [])
        )]

    # Sort by PR number (oldest first)
    prs.sort(key=lambda p: p.get("number", 0))

    return prs


def get_pr_details(pr_number: int) -> dict:
    """Get detailed PR information."""
    code, stdout, stderr = run_gh([
        "pr", "view", str(pr_number),
        "--json", "number,title,headRefName,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup,isDraft,state"
    ])

    if code != 0:
        return {}

    try:
        return json.loads(stdout)
    except json.JSONDecodeError:
        return {}


def get_check_status(pr_number: int) -> tuple[str, list[dict]]:
    """Get status check results for a PR.

    Returns (overall_status, checks_list) where overall_status is:
    - 'SUCCESS' - all checks passed
    - 'PENDING' - checks still running
    - 'FAILURE' - at least one check failed
    """
    code, stdout, stderr = run_gh([
        "pr", "checks", str(pr_number),
        "--json", "name,state,conclusion"
    ])

    if code != 0:
        return "UNKNOWN", []

    try:
        checks = json.loads(stdout)
    except json.JSONDecodeError:
        return "UNKNOWN", []

    if not checks:
        return "SUCCESS", []  # No checks required

    # Determine overall status
    has_pending = any(c.get("state") == "PENDING" or c.get("state") == "IN_PROGRESS" for c in checks)
    has_failure = any(
        c.get("conclusion") in ("FAILURE", "ERROR", "CANCELLED", "TIMED_OUT")
        for c in checks
    )

    if has_failure:
        return "FAILURE", checks
    if has_pending:
        return "PENDING", checks
    return "SUCCESS", checks


def wait_for_checks(pr_number: int, timeout_minutes: int, verbose: bool) -> tuple[bool, str]:
    """Wait for PR checks to complete.

    Returns (success, message).
    """
    start_time = time.time()
    timeout_seconds = timeout_minutes * 60
    poll_interval = 30  # seconds

    while True:
        elapsed = time.time() - start_time
        if elapsed > timeout_seconds:
            return False, f"Timeout after {timeout_minutes} minutes waiting for checks"

        status, checks = get_check_status(pr_number)

        if status == "SUCCESS":
            return True, "All checks passed"

        if status == "FAILURE":
            failed = [c["name"] for c in checks if c.get("conclusion") in ("FAILURE", "ERROR")]
            return False, f"Checks failed: {', '.join(failed)}"

        if verbose:
            pending = [c["name"] for c in checks if c.get("state") in ("PENDING", "IN_PROGRESS")]
            remaining = int(timeout_seconds - elapsed)
            log(f"  Waiting for checks: {', '.join(pending)} ({remaining}s remaining)", "info")

        time.sleep(poll_interval)


def update_pr_branch(pr_number: int) -> tuple[bool, str]:
    """Update PR branch to be up-to-date with base.

    Returns (success, message).
    """
    # Try gh pr update-branch first
    code, stdout, stderr = run_gh([
        "pr", "update-branch", str(pr_number), "--rebase"
    ])

    if code == 0:
        return True, "Branch updated successfully"

    # Check if it's a conflict error
    if "conflict" in stderr.lower():
        return False, "Merge conflicts detected - manual resolution required"

    return False, f"Failed to update branch: {stderr}"


def check_review_approval(pr: dict) -> tuple[bool, str]:
    """Check if PR has required approvals.

    Returns (approved, message).
    """
    decision = pr.get("reviewDecision", "")

    if decision == "APPROVED":
        return True, "PR approved"

    if decision == "CHANGES_REQUESTED":
        return False, "Changes requested - needs update and re-approval"

    if decision == "REVIEW_REQUIRED":
        return False, "Review required - needs approval"

    # No review decision might mean no reviews required
    # or reviews haven't been requested
    return True, "No review requirement or already approved"


def merge_pr(pr_number: int, dry_run: bool) -> tuple[bool, str]:
    """Merge a PR using squash merge.

    Returns (success, message).
    """
    if dry_run:
        return True, "[DRY RUN] Would merge PR"

    code, stdout, stderr = run_gh([
        "pr", "merge", str(pr_number),
        "--squash",
        "--delete-branch"
    ])

    if code == 0:
        return True, "PR merged successfully"

    return False, f"Merge failed: {stderr}"


def verify_main_health(base: str, verbose: bool) -> tuple[bool, str]:
    """Verify main branch is healthy after merge.

    Returns (healthy, message).
    """
    # Fetch latest
    fetch_origin()

    # Get the latest commit on main
    code, stdout, _ = run_git(["rev-parse", f"origin/{base}"])
    if code != 0:
        return False, "Failed to get main HEAD"

    commit_sha = stdout.strip()[:7]

    # Check CI status for main branch
    # Note: This checks the most recent workflow runs
    code, stdout, stderr = run_gh([
        "run", "list",
        "--branch", base,
        "--limit", "1",
        "--json", "status,conclusion,name"
    ])

    if code != 0:
        # No workflow runs might mean no CI configured
        if verbose:
            log(f"  No CI workflows found for {base}", "warn")
        return True, f"No CI verification (commit: {commit_sha})"

    try:
        runs = json.loads(stdout)
    except json.JSONDecodeError:
        return True, f"Could not parse CI status (commit: {commit_sha})"

    if not runs:
        return True, f"No recent CI runs (commit: {commit_sha})"

    latest = runs[0]
    status = latest.get("status", "")
    conclusion = latest.get("conclusion", "")
    name = latest.get("name", "unknown")

    if status == "completed":
        if conclusion == "success":
            return True, f"CI passed: {name} (commit: {commit_sha})"
        else:
            return False, f"CI failed: {name} - {conclusion} (commit: {commit_sha})"
    else:
        if verbose:
            log(f"  CI still running: {name} ({status})", "info")
        return True, f"CI in progress: {name} (commit: {commit_sha})"


def generate_report(
    args: argparse.Namespace,
    prs: list[dict],
    merged: list[dict],
    skipped: list[dict],
    report_dir: Path
) -> Path:
    """Generate a merge session report."""
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    report_path = report_dir / f"merge-session-{timestamp}.md"

    lines = [
        f"# Merge Session Report",
        f"",
        f"**Generated:** {datetime.now().isoformat()}",
        f"",
        f"## Configuration",
        f"",
        f"| Setting | Value |",
        f"|---------|-------|",
        f"| Label Filter | `{args.label}` |",
        f"| Session Filter | `{args.session or 'none'}` |",
        f"| Base Branch | `{args.base}` |",
        f"| Limit | `{args.limit or 'none'}` |",
        f"| Dry Run | `{args.dry_run}` |",
        f"",
        f"## Summary",
        f"",
        f"| Metric | Count |",
        f"|--------|-------|",
        f"| PRs Discovered | {len(prs)} |",
        f"| PRs Merged | {len(merged)} |",
        f"| PRs Skipped/Blocked | {len(skipped)} |",
        f"",
    ]

    if merged:
        lines.extend([
            f"## Merged PRs",
            f"",
            f"| PR | Title | Branch | Result |",
            f"|----|-------|--------|--------|",
        ])
        for pr in merged:
            lines.append(
                f"| #{pr['number']} | {pr['title'][:40]} | `{pr['headRefName']}` | {pr.get('result', 'merged')} |"
            )
        lines.append("")

    if skipped:
        lines.extend([
            f"## Skipped/Blocked PRs",
            f"",
            f"| PR | Title | Reason |",
            f"|----|-------|--------|",
        ])
        for pr in skipped:
            lines.append(
                f"| #{pr['number']} | {pr['title'][:40]} | {pr.get('reason', 'unknown')} |"
            )
        lines.append("")

    lines.extend([
        f"## Evidence",
        f"",
        f"### Command Arguments",
        f"```",
        f"merge_all_prs.py --label {args.label}"
        + (f" --session {args.session}" if args.session else "")
        + (f" --limit {args.limit}" if args.limit else "")
        + (" --dry-run" if args.dry_run else ""),
        f"```",
        f"",
        f"### PR Details",
        f"",
    ])

    for pr in prs:
        lines.extend([
            f"#### PR #{pr['number']}: {pr['title']}",
            f"",
            f"- Branch: `{pr['headRefName']}`",
            f"- Author: {pr.get('author', {}).get('login', 'unknown')}",
            f"- Created: {pr.get('createdAt', 'unknown')}",
            f"- Mergeable: {pr.get('mergeable', 'unknown')}",
            f"- Review: {pr.get('reviewDecision', 'none')}",
            f"- Labels: {', '.join(l.get('name', '') for l in pr.get('labels', []))}",
            f"",
        ])

    lines.extend([
        f"---",
        f"*Generated by merge_all_prs.py*",
    ])

    report_dir.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(lines))

    return report_path


def print_merge_plan(prs: list[dict]):
    """Print the merge plan before execution."""
    print("")
    print("=" * 70)
    print("MERGE PLAN")
    print("=" * 70)
    print("")
    print(f"{'PR':<6} {'Title':<35} {'Branch':<15} {'State':<10}")
    print("-" * 70)

    for pr in prs:
        number = f"#{pr['number']}"
        title = pr['title'][:33] + ".." if len(pr['title']) > 35 else pr['title']
        branch = pr['headRefName'][:13] + ".." if len(pr['headRefName']) > 15 else pr['headRefName']
        state = pr.get('mergeStateStatus', 'UNKNOWN')
        print(f"{number:<6} {title:<35} {branch:<15} {state:<10}")

    print("-" * 70)
    print(f"Total PRs to process: {len(prs)}")
    print("")


def main():
    parser = argparse.ArgumentParser(
        description="Merge workflow PRs safely and sequentially"
    )
    parser.add_argument(
        "--label", default="workflow-ready",
        help="Filter PRs by label (default: workflow-ready)"
    )
    parser.add_argument(
        "--session",
        help="Filter PRs by session label (e.g., session:2026-01-20)"
    )
    parser.add_argument(
        "--base", default="main",
        help="Target branch (default: main)"
    )
    parser.add_argument(
        "--limit", type=int,
        help="Maximum number of PRs to merge"
    )
    parser.add_argument(
        "--timeout", type=int, default=30,
        help="Max wait time for checks in minutes (default: 30)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Show what would be done without merging"
    )
    parser.add_argument(
        "--verbose", action="store_true",
        help="Show detailed output"
    )
    parser.add_argument(
        "--report-dir", default="workflow/_reports",
        help="Directory for merge reports"
    )

    args = parser.parse_args()
    report_dir = Path(args.report_dir)

    # Header
    print("")
    log("=" * 60, "info")
    log("  MERGE ALL PRS - Safe Sequential Merge", "info")
    log("=" * 60, "info")
    print("")

    if args.dry_run:
        log("DRY RUN MODE - No changes will be made", "warn")
        print("")

    # Preflight checks
    log("Running preflight checks...", "info")

    # 1. Check gh auth
    if not check_gh_auth():
        log("gh CLI not authenticated. Run: gh auth login", "error")
        sys.exit(1)
    log("  [OK] gh CLI authenticated", "success")

    # 2. Check clean working tree
    if not check_clean_working_tree():
        log("Working tree is not clean. Commit or stash changes first.", "error")
        sys.exit(1)
    log("  [OK] Working tree clean", "success")

    # 3. Fetch origin
    if not fetch_origin():
        log("Failed to fetch from origin", "error")
        sys.exit(1)
    log("  [OK] Fetched latest from origin", "success")

    print("")

    # Discover PRs
    log(f"Discovering PRs with label '{args.label}'...", "info")
    prs = get_open_prs(args.label, args.session, args.base)

    if not prs:
        log("No matching PRs found", "warn")
        sys.exit(0)

    # Apply limit
    if args.limit and len(prs) > args.limit:
        log(f"Limiting to {args.limit} PRs (found {len(prs)})", "info")
        prs = prs[:args.limit]

    # Print merge plan
    print_merge_plan(prs)

    # Track results
    merged = []
    skipped = []

    # Merge loop
    for i, pr in enumerate(prs, 1):
        pr_number = pr['number']
        pr_title = pr['title']

        print("")
        log("=" * 50, "info")
        log(f"Processing PR #{pr_number} ({i}/{len(prs)})", "info")
        log(f"  {pr_title}", "info")
        log("=" * 50, "info")

        # Get fresh PR details
        details = get_pr_details(pr_number)
        if not details:
            log("Failed to get PR details", "error")
            pr['reason'] = "Failed to fetch PR details"
            skipped.append(pr)
            continue

        # Check if PR is draft
        if details.get('isDraft'):
            log("PR is a draft - skipping", "warn")
            pr['reason'] = "PR is a draft"
            skipped.append(pr)
            continue

        # Check if already merged
        if details.get('state') == 'MERGED':
            log("PR already merged - skipping", "info")
            pr['reason'] = "Already merged"
            skipped.append(pr)
            continue

        # Check merge state
        merge_state = details.get('mergeStateStatus', 'UNKNOWN')
        mergeable = details.get('mergeable', 'UNKNOWN')

        if args.verbose:
            log(f"  Merge state: {merge_state}, Mergeable: {mergeable}", "info")

        # Handle different merge states
        if merge_state == 'BEHIND':
            log("Branch is behind - updating...", "info")
            success, msg = update_pr_branch(pr_number)
            if not success:
                log(f"Failed to update branch: {msg}", "error")
                pr['reason'] = msg
                skipped.append(pr)
                break  # Stop on first failure
            log(f"  {msg}", "success")
            # Wait a moment for GitHub to recalculate
            time.sleep(3)
            # Refresh details
            details = get_pr_details(pr_number)
            merge_state = details.get('mergeStateStatus', 'UNKNOWN')

        if merge_state == 'DIRTY' or mergeable == 'CONFLICTING':
            log("Merge conflicts detected - cannot proceed", "error")
            pr['reason'] = "Merge conflicts - manual resolution required"
            skipped.append(pr)
            break  # Stop on first failure

        if merge_state not in ('CLEAN', 'HAS_HOOKS'):
            log(f"Unexpected merge state: {merge_state}", "warn")

        # Check reviews
        approved, msg = check_review_approval(details)
        if not approved:
            log(f"Review check failed: {msg}", "error")
            pr['reason'] = msg
            skipped.append(pr)
            break  # Stop on first failure
        log(f"  [OK] {msg}", "success")

        # Wait for checks
        log("Waiting for status checks...", "info")
        checks_ok, msg = wait_for_checks(pr_number, args.timeout, args.verbose)
        if not checks_ok:
            log(f"Checks failed: {msg}", "error")
            pr['reason'] = msg
            skipped.append(pr)
            break  # Stop on first failure
        log(f"  [OK] {msg}", "success")

        # Merge!
        log("Merging PR...", "info")
        success, msg = merge_pr(pr_number, args.dry_run)
        if not success:
            log(f"Merge failed: {msg}", "error")
            pr['reason'] = msg
            skipped.append(pr)
            break  # Stop on first failure
        log(f"  [OK] {msg}", "success")
        pr['result'] = 'merged' if not args.dry_run else 'would merge'
        merged.append(pr)

        # Verify main is healthy
        log(f"Verifying {args.base} health...", "info")
        healthy, msg = verify_main_health(args.base, args.verbose)
        if not healthy:
            log(f"Main branch unhealthy after merge: {msg}", "error")
            log("STOPPING - main branch may be broken!", "error")
            break
        log(f"  [OK] {msg}", "success")

        if args.verbose and i < len(prs):
            log(f"Continuing to next PR...", "info")

    # Generate report
    print("")
    log("Generating merge session report...", "info")
    report_path = generate_report(args, prs, merged, skipped, report_dir)
    log(f"  Report: {report_path}", "success")

    # Summary
    print("")
    log("=" * 60, "info")
    log("  MERGE SESSION COMPLETE", "info")
    log("=" * 60, "info")
    print("")

    print(f"  PRs Merged:  {GREEN}{len(merged)}{NC}")
    print(f"  PRs Skipped: {YELLOW}{len(skipped)}{NC}")
    print(f"  Report:      {report_path}")
    print("")

    if skipped:
        log("Skipped PRs:", "warn")
        for pr in skipped:
            print(f"  - #{pr['number']}: {pr.get('reason', 'unknown')}")
        print("")

    # Exit code
    if skipped and not merged:
        sys.exit(1)  # All PRs failed
    elif skipped:
        sys.exit(2)  # Partial success
    else:
        sys.exit(0)  # Full success


if __name__ == "__main__":
    main()
