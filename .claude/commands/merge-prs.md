# Merge All Open PRs

Merge all open pull requests one at a time, following best practices for clean merges.

## Process

For each open PR:
1. Check all status checks pass (CI, tests, etc.)
2. Check required reviews are approved
3. Update branch with latest main (rebase preferred)
4. Wait for checks to pass after update
5. Squash and merge
6. Delete the feature branch
7. Move to next PR

## Instructions

### Step 1: Get Open PRs

```bash
gh pr list --state open --json number,title,headRefName,statusCheckRollup,reviewDecision,mergeable
```

List all open PRs and their status.

### Step 2: Process Each PR

For each PR, in order (oldest first or by PR number):

#### 2a. Check Prerequisites

```bash
gh pr view <number> --json statusCheckRollup,reviewDecision,mergeable,mergeStateStatus
```

Verify:
- `mergeable` is `MERGEABLE`
- `reviewDecision` is `APPROVED` or not required
- `statusCheckRollup` shows all checks passed (or no checks required)
- `mergeStateStatus` is `CLEAN` or `BEHIND` (not `BLOCKED` or `DIRTY`)

If checks are still running, wait:
```bash
gh pr checks <number> --watch
```

#### 2b. Update Branch with Main

If the branch is behind main, update it:

```bash
# Preferred: Rebase (cleaner history)
gh pr update-branch <number> --rebase

# If rebase fails due to conflicts, try merge
gh pr update-branch <number>
```

If there are merge conflicts:
1. Report the conflict to the user
2. Skip this PR and continue with others
3. List conflicting PRs at the end

#### 2c. Wait for Checks After Update

After updating the branch, checks will re-run:

```bash
gh pr checks <number> --watch
```

Wait for all checks to pass before merging.

#### 2d. Merge the PR

Use squash merge for clean history:

```bash
gh pr merge <number> --squash --delete-branch
```

Options used:
- `--squash`: Combines all commits into one clean commit
- `--delete-branch`: Removes the feature branch after merge

#### 2e. Verify Merge

```bash
gh pr view <number> --json state,mergedAt
```

Confirm state is `MERGED`.

### Step 3: Update Local Main

After all PRs are merged:

```bash
git checkout main
git pull origin main
```

### Step 4: Report Summary

Report:
- Number of PRs merged successfully
- Any PRs skipped (with reasons: conflicts, failing checks, etc.)
- Any PRs that need manual attention

## Error Handling

### Merge Conflicts

If a PR has conflicts with main:
1. Log: "PR #X has merge conflicts - skipping"
2. Add to skipped list
3. Continue with next PR
4. At end, report: "PRs with conflicts that need manual resolution: #X, #Y"

### Failing Checks

If checks fail:
1. Log: "PR #X has failing checks - skipping"
2. Add to skipped list with failure reason
3. Continue with next PR

### Branch Protection

If branch protection prevents merge:
1. Log the specific protection rule that blocked
2. Skip and continue

### Rate Limiting

If GitHub rate limits:
1. Wait and retry
2. Use: `gh api rate_limit` to check remaining

## Example Output

```
=== Merging Open PRs ===

Found 3 open PRs:
  #1 - feat(F004): Article/Web Page Enrichment
  #2 - feat(F002): Brave Search Integration
  #3 - fix(B001): Transcript timeout fix

Processing PR #1...
  ✓ Checks passing
  ✓ Review approved
  ⟳ Updating branch with main...
  ✓ Branch updated
  ⟳ Waiting for checks...
  ✓ Checks passed
  ⟳ Merging...
  ✓ PR #1 merged successfully

Processing PR #2...
  ✓ Checks passing
  ✓ Review approved
  ✓ Branch up to date
  ⟳ Merging...
  ✓ PR #2 merged successfully

Processing PR #3...
  ✗ Has merge conflicts with main
  → Skipped (needs manual resolution)

=== Summary ===
Merged: 2 PRs (#1, #2)
Skipped: 1 PR (#3 - merge conflicts)

Local main updated to latest.
```

## Safety Checks

Before starting:
1. Confirm we're not on a feature branch
2. Confirm there are open PRs to merge
3. Show list of PRs that will be processed
4. Ask for confirmation before proceeding

## Configuration

Default merge strategy: `--squash`
- Creates clean, single-commit history
- Preserves full commit history in PR

Alternative strategies (if needed):
- `--merge`: Regular merge commit
- `--rebase`: Rebase and merge (linear history)

## Notes

- Process PRs in order (oldest first) to minimize conflicts
- Each merge updates main, so subsequent PRs may need rebasing
- Always delete branches after merge to keep repo clean
- If a PR was created by the workflow system, its worktree should already be cleaned up

## Run

Process all open PRs now.

$ARGUMENTS
