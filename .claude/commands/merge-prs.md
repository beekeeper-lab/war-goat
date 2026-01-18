# Merge All Open PRs

Merge all open pull requests one at a time, following best practices for clean merges. **Automatically resolve merge conflicts when possible.**

## Process

For each open PR:
1. Check status (mergeable, checks, reviews)
2. If clean → merge directly
3. If conflicts → checkout, rebase, resolve conflicts, push, then merge
4. Squash merge and delete branch
5. Move to next PR

## Instructions

### Step 1: Get Open PRs

```bash
gh pr list --state open --json number,title,headRefName,statusCheckRollup,reviewDecision,mergeable
```

List all open PRs. Process in order by PR number (oldest first).

### Step 2: Process Each PR

For each PR:

#### 2a. Check Status

```bash
gh pr view <number> --json statusCheckRollup,reviewDecision,mergeable,mergeStateStatus,headRefName
```

**If `mergeStateStatus` is `CLEAN`:**
- Skip to Step 2d (merge directly)

**If `mergeStateStatus` is `BEHIND`:**
- Try `gh pr update-branch <number> --rebase`
- If that works, wait for checks, then merge
- If conflicts, proceed to 2b

**If `mergeStateStatus` is `DIRTY` or `mergeable` is `CONFLICTING`:**
- Proceed to 2b to resolve conflicts

#### 2b. Resolve Merge Conflicts

When a PR has conflicts, resolve them locally:

```bash
# 1. Stash any local changes
git stash

# 2. Fetch latest and checkout the PR branch
git fetch origin
git checkout <branch-name>

# 3. Rebase on main
git rebase origin/main
```

**When conflicts occur during rebase:**

For each conflicted file, read the file and look for conflict markers:
- `<<<<<<< HEAD` - Start of main branch changes
- `=======` - Separator
- `>>>>>>> commit` - End of feature branch changes

**Resolution Strategy (most conflicts are additive):**

1. **Import conflicts**: Keep ALL imports from both sides
   ```typescript
   // WRONG - picking one side
   <<<<<<< HEAD
   import { foo } from './foo';
   =======
   import { bar } from './bar';
   >>>>>>> feature

   // RIGHT - keep both
   import { foo } from './foo';
   import { bar } from './bar';
   ```

2. **Export conflicts**: Keep ALL exports from both sides
   ```javascript
   // Keep both export blocks
   export { foo } from './foo.js';
   export { bar } from './bar.js';
   ```

3. **Type definition conflicts**: Keep ALL type definitions
   - If same interface defined twice, keep the more complete one
   - If different interfaces, keep both

4. **Code section conflicts**: Usually keep both sections
   - Look for section comment headers (e.g., `// ============`)
   - Each feature adds its own section - keep all sections

**After resolving each file:**
```bash
git add <resolved-file>
```

**After all conflicts resolved:**
```bash
git rebase --continue
```

**If rebase completes successfully:**
```bash
# Force push the rebased branch
git push --force-with-lease origin <branch-name>

# Return to main
git checkout main

# Restore stashed changes if any
git stash pop 2>/dev/null || true
```

#### 2c. Wait for GitHub to Update

After force push, GitHub needs a moment to recalculate merge status:
```bash
sleep 3
gh pr view <number> --json mergeable,mergeStateStatus
```

Verify `mergeStateStatus` is now `CLEAN`.

#### 2d. Merge the PR

```bash
gh pr merge <number> --squash --delete-branch
```

#### 2e. Verify and Continue

```bash
gh pr view <number> --json state,mergedAt
```

Confirm `state` is `MERGED`, then proceed to next PR.

### Step 3: Update Local Main

After all PRs processed:
```bash
git checkout main
git pull origin main
```

Handle any local conflicts with incoming changes:
```bash
# If untracked files conflict, remove them (they're in main now)
git clean -fd workflow/
git pull origin main
```

### Step 4: Report Summary

Report:
- PRs merged successfully (with line counts if available)
- PRs that failed (with reasons)
- Any manual intervention needed

## Conflict Resolution Examples

### Example 1: Import Statement Conflicts

**Before (conflicted):**
```typescript
import {
  foo,
<<<<<<< HEAD
  braveSearch,
  newsSearch,
=======
  articleParser,
  summarize,
>>>>>>> feature
} from './services';
```

**After (resolved):**
```typescript
import {
  foo,
  braveSearch,
  newsSearch,
  articleParser,
  summarize,
} from './services';
```

### Example 2: Service Index Exports

**Before (conflicted):**
```javascript
<<<<<<< HEAD
// Brave Search
export { search } from './brave-search.js';
=======
// Article Parser
export { parse } from './article.js';
>>>>>>> feature
```

**After (resolved):**
```javascript
// Brave Search
export { search } from './brave-search.js';

// Article Parser
export { parse } from './article.js';
```

### Example 3: Type Definitions

**Before (conflicted):**
```typescript
<<<<<<< HEAD
export interface SearchResult {
  title: string;
  url: string;
}
=======
export interface ArticleMeta {
  author: string;
  date: string;
}
>>>>>>> feature
```

**After (resolved):**
```typescript
export interface SearchResult {
  title: string;
  url: string;
}

export interface ArticleMeta {
  author: string;
  date: string;
}
```

## Edge Cases

### Duplicate Definitions
If both sides define the same thing (e.g., same interface name), keep the more complete version or merge their properties.

### Conflicting Logic Changes
If both sides modify the SAME function differently (not just adding new functions), this requires careful review:
1. Understand what each change does
2. Determine if they can coexist
3. If not, prefer the newer/feature branch change and note it in the merge

### Rebase Fails Completely
If rebase cannot proceed even after resolving conflicts:
```bash
git rebase --abort
git checkout main
```
Skip this PR and note it needs manual attention.

## Safety

- Always use `--force-with-lease` (not `--force`) when pushing rebased branches
- Verify PR is mergeable before attempting merge
- Don't merge if checks are failing
- Keep a record of what was merged for the summary

## Error Recovery

If something goes wrong mid-process:
```bash
# Abort any in-progress rebase
git rebase --abort 2>/dev/null

# Return to main
git checkout main

# Clean up
git stash pop 2>/dev/null
```

## Run

Process all open PRs now, automatically resolving conflicts where possible.

$ARGUMENTS
