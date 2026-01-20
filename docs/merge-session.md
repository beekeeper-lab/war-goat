# Merge Session Guide

This document explains how to safely merge workflow PRs at the end of a work session using the `merge_all_prs.py` script.

## Overview

When running multiple workflows in parallel, each workflow creates a PR. At the end of a work session, you need to merge these PRs safely:

1. **One at a time** - Each PR is merged individually
2. **Sequential verification** - After each merge, main is verified healthy
3. **Fail-fast** - If anything fails, the process stops immediately
4. **Full audit trail** - A report is generated with evidence

## Prerequisites

1. **gh CLI** installed and authenticated:
   ```bash
   gh auth status
   # If not logged in: gh auth login
   ```

2. **Clean working directory**:
   ```bash
   git status  # Should show no uncommitted changes
   ```

3. **PRs labeled correctly**:
   - Each workflow PR should have the `workflow-ready` label
   - Optionally, add a session label like `session:2026-01-20`

## Quick Start

```bash
# Preview what would be merged (dry run)
./scripts/workflow/merge_all_prs.py --dry-run

# Merge all workflow-ready PRs
./scripts/workflow/merge_all_prs.py

# Merge PRs from a specific session
./scripts/workflow/merge_all_prs.py --session session:2026-01-20

# Merge at most 3 PRs
./scripts/workflow/merge_all_prs.py --limit 3
```

## How PRs Are Selected

The script selects PRs based on:

1. **Label filter** (default: `workflow-ready`)
   - PRs must have this label to be included
   - Change with `--label <label>`

2. **Session filter** (optional)
   - Filter to PRs with a specific session label
   - Use `--session session:2026-01-20`

3. **Base branch** (default: `main`)
   - Only PRs targeting this branch are included
   - Change with `--base <branch>`

4. **Order** - PRs are processed by PR number (oldest first)

## Labeling PRs for Merge

### Automatic Labeling

To have workflow PRs automatically labeled, update `agent-runner.sh` to add labels when creating PRs:

```bash
gh pr create --title "..." --body "..." --label "workflow-ready" --label "session:$(date +%Y-%m-%d)"
```

### Manual Labeling

Add labels after PR creation:

```bash
# Add workflow-ready label
gh pr edit <number> --add-label "workflow-ready"

# Add session label
gh pr edit <number> --add-label "session:2026-01-20"
```

### Remove from Merge Queue

To exclude a PR from the merge session:

```bash
gh pr edit <number> --remove-label "workflow-ready"
```

## Merge Process

For each PR in the queue, the script:

### 1. Preflight Checks

- Verifies `gh` CLI is authenticated
- Checks working tree is clean
- Fetches latest from origin

### 2. Per-PR Checks

| Check | Action on Failure |
|-------|-------------------|
| Not a draft | Skip PR |
| Not already merged | Skip PR |
| No merge conflicts | STOP - needs manual resolution |
| Branch up-to-date | Auto-update branch |
| Has required approvals | STOP - needs approval |
| Status checks pass | WAIT up to timeout, then STOP |

### 3. Merge

- Uses squash merge (`--squash`)
- Deletes source branch (`--delete-branch`)
- No admin override flags

### 4. Post-Merge Verification

- Fetches updated main
- Checks CI status on main
- If main is unhealthy, STOPS immediately

### 5. Next PR

- Continues to next PR in queue
- Repeats checks (branch may now need update)

## What the Script Will NOT Do

The script is designed to respect branch protection rules:

| Action | Script Behavior |
|--------|-----------------|
| Bypass required approvals | STOPS and reports |
| Merge with failing checks | STOPS and reports |
| Force merge with conflicts | STOPS and reports |
| Use admin override | Never used |
| Continue after failure | STOPS by default |
| Merge drafts | Skips draft PRs |

## Command Line Options

```
Usage: merge_all_prs.py [options]

Options:
  --label LABEL       Filter PRs by label (default: workflow-ready)
  --session SESSION   Filter PRs by session label
  --base BRANCH       Target branch (default: main)
  --limit N           Maximum number of PRs to merge
  --timeout MINUTES   Max wait time for checks (default: 30)
  --dry-run           Show what would be done without merging
  --verbose           Show detailed output
  --report-dir DIR    Directory for reports (default: workflow/_reports)
```

## Merge Session Report

After each run, a report is generated at:

```
workflow/_reports/merge-session-<timestamp>.md
```

The report includes:

- Configuration used
- PRs discovered
- PRs merged (with results)
- PRs skipped (with reasons)
- Full evidence trail

Example report structure:

```markdown
# Merge Session Report

**Generated:** 2026-01-20T15:30:00

## Summary
| Metric | Count |
|--------|-------|
| PRs Discovered | 5 |
| PRs Merged | 3 |
| PRs Skipped | 2 |

## Merged PRs
| PR | Title | Branch | Result |
|----|-------|--------|--------|
| #42 | Feature A | feature/F001 | merged |
| #43 | Feature B | feature/F002 | merged |
...

## Skipped PRs
| PR | Title | Reason |
|----|-------|--------|
| #44 | Feature C | Merge conflicts |
...
```

## Error Recovery

### Merge Conflicts

```
Error: Merge conflicts detected - manual resolution required
```

**Fix:**
1. Checkout the PR branch
2. Rebase on main and resolve conflicts
3. Push the resolved branch
4. Re-run merge script

```bash
git checkout feature/F003
git rebase origin/main
# Resolve conflicts in each file
git add .
git rebase --continue
git push --force-with-lease
# Re-run merge
./scripts/workflow/merge_all_prs.py
```

### Missing Approval

```
Error: Review required - needs approval
```

**Fix:**
1. Request review from appropriate person
2. Wait for approval
3. Re-run merge script

### Failing Checks

```
Error: Checks failed: lint, test
```

**Fix:**
1. Look at the PR for check details
2. Fix the failing tests/lint
3. Push fixes
4. Re-run merge script

### Main Unhealthy After Merge

```
Error: CI failed on main after merge
```

**Fix:**
1. **Do not continue merging!**
2. Investigate what broke main
3. Create a fix PR and merge it first
4. Then continue with remaining PRs

## Integration with Workflow System

### Automatic Trigger (Optional)

Set environment variable to auto-run after last workflow:

```bash
export MERGE_SESSION_ON_COMPLETE=1
./scripts/start-workflow.sh F005 feature "My Feature"
```

When the workflow completes, it will prompt to run the merge script.

### Manual Trigger

At the end of a work session:

```bash
# From main repo (not a worktree)
./scripts/workflow/merge_all_prs.py --dry-run  # Preview
./scripts/workflow/merge_all_prs.py            # Execute
```

## Best Practices

### Before Starting Work Session

1. Ensure main is green
2. Decide on session label: `session:2026-01-20`
3. Start workflows with consistent labeling

### During Work Session

1. Monitor workflows for issues
2. Address review comments promptly
3. Ensure all PRs get approved

### End of Work Session

1. Check all workflows completed
2. Verify all PRs have `workflow-ready` label
3. Run merge script with `--dry-run` first
4. Execute merge
5. Review the report
6. Handle any failures

### After Work Session

1. Review merge session report
2. Archive completed workflow directories
3. Update issue tracker (Beans)

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All PRs merged successfully |
| 1 | All PRs failed to merge |
| 2 | Partial success (some merged, some failed) |

## Troubleshooting

### "gh CLI not authenticated"

```bash
gh auth login
```

### "Working tree is not clean"

```bash
git stash  # or git commit your changes
```

### "No matching PRs found"

Check that:
1. PRs exist and are open
2. PRs have the correct label
3. PRs target the correct base branch

```bash
gh pr list --state open --label workflow-ready
```

### "Timeout waiting for checks"

Increase timeout or check why CI is slow:

```bash
./scripts/workflow/merge_all_prs.py --timeout 60  # 60 minutes
```

---

## See Also

- [GitHub Merge Guards](github-merge-guards.md) - Branch protection settings
- [Multi-Agent Workflow](MULTI-AGENT-WORKFLOW.md) - Complete workflow documentation
- [Merge PRs Command](../.claude/commands/merge-prs.md) - Interactive merge command

---

*Last updated: 2026-01-20*
