# GitHub Branch Protection & Merge Guards

This document describes the recommended GitHub settings to protect the `main` branch and ensure code quality through required checks, reviews, and merge rules.

## Overview

The multi-agent workflow system creates PRs from isolated worktrees. To maintain code quality and prevent accidental corruption of `main`, GitHub must be configured with branch protection rules.

**Key principles:**
- All changes to `main` must go through PRs
- PRs must pass automated checks before merging
- PRs require human approval (or automated approval from trusted systems)
- History is kept clean with squash merges

---

## Recommended GitHub Settings

### Branch Protection Rules (or Rulesets)

Configure these settings in GitHub under **Settings → Branches → Branch protection rules** or **Settings → Rules → Rulesets**.

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Require pull request before merging** | Enabled | All changes to main must be reviewed |
| **Required approvals** | 1 | At least one approval before merge |
| **Dismiss stale approvals** | Enabled | New commits invalidate previous approvals |
| **Require review from code owners** | Enabled (if CODEOWNERS defined) | Critical files need expert review |
| **Require conversation resolution** | Enabled | All review comments must be addressed |
| **Require status checks to pass** | Enabled | Automated tests must pass |
| **Required checks** | `lint`, `build`, `test` | See "Required Status Checks" below |
| **Require branches to be up-to-date** | Enabled | Prevents merge conflicts |
| **Require linear history** | Enabled | Squash or rebase only, no merge commits |
| **Do not allow bypassing** | Enabled | Even admins follow the rules |
| **Restrict force pushes** | Enabled (block all) | Prevent history rewriting |
| **Restrict deletions** | Enabled | Prevent accidental branch deletion |

### Required Status Checks

When CI is configured, require these checks:

| Check Name | Source | Purpose |
|------------|--------|---------|
| `lint` | GitHub Actions | ESLint passes with no errors |
| `build` | GitHub Actions | TypeScript compiles and Vite builds |
| `test` | GitHub Actions | Vitest tests pass |

**Note:** Until CI is configured, you can skip status check requirements but MUST add them once workflows are created.

### Merge Method

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Allow merge commits** | Disabled | Keeps history linear |
| **Allow squash merging** | Enabled (default) | One commit per feature/fix |
| **Allow rebase merging** | Disabled | Squash is preferred for simplicity |
| **Default merge message** | PR title + description | Meaningful commit messages |
| **Delete branch on merge** | Enabled | Automatic cleanup |

**Why squash merge?**
- Each PR becomes a single commit on main
- Easy to revert entire features
- Clean, readable git log
- Commit history within PR preserved in GitHub

---

## Settings Checklist

Use this checklist to configure GitHub. Check each box after enabling the setting.

### Repository Settings

- [ ] **Settings → General → Pull Requests**
  - [ ] Allow squash merging: **Enabled**
  - [ ] Allow merge commits: **Disabled**
  - [ ] Allow rebase merging: **Disabled**
  - [ ] Default to PR title for squash commit: **Enabled**
  - [ ] Automatically delete head branches: **Enabled**

### Branch Protection (Settings → Branches → Add rule)

Target: `main`

- [ ] **Protect matching branches**: Enabled
- [ ] **Require a pull request before merging**: Enabled
  - [ ] Required number of approvals: **1**
  - [ ] Dismiss stale pull request approvals: **Enabled**
  - [ ] Require review from Code Owners: **Enabled** (after adding CODEOWNERS)
  - [ ] Require approval of the most recent reviewable push: **Enabled**
- [ ] **Require status checks to pass before merging**: Enabled
  - [ ] Require branches to be up to date: **Enabled**
  - [ ] Required checks (add when CI exists):
    - [ ] `lint`
    - [ ] `build`
    - [ ] `test`
- [ ] **Require conversation resolution before merging**: Enabled
- [ ] **Require linear history**: Enabled
- [ ] **Do not allow bypassing the above settings**: Enabled
- [ ] **Restrict who can push to matching branches**: Optional (for stricter control)
- [ ] **Allow force pushes**: **Disabled** (leave unchecked)
- [ ] **Allow deletions**: **Disabled** (leave unchecked)

### Rulesets Alternative (Newer GitHub Feature)

If using Rulesets instead of branch protection:

1. Go to **Settings → Rules → Rulesets**
2. Create new ruleset for `main`
3. Apply same settings as branch protection above
4. Rulesets support more granular control and can be applied organization-wide

---

## CODEOWNERS Configuration

The `.github/CODEOWNERS` file specifies who must review changes to specific files or directories.

### High-Risk Areas Requiring Code Owner Review

| Path Pattern | Risk Level | Reason |
|--------------|------------|--------|
| `.github/` | Critical | CI/CD and repository configuration |
| `scripts/` | High | Automation scripts affect workflow |
| `server/` | High | Backend API changes |
| `.claude/` | High | AI agent configuration |
| `docs/MULTI-AGENT-WORKFLOW.md` | Medium | Core process documentation |
| `package.json` | Medium | Dependency changes |
| `*.config.*` | Medium | Configuration files |

### Current CODEOWNERS

See `.github/CODEOWNERS` for the configured code owners.

---

## CI Workflow Configuration (Future)

When adding GitHub Actions CI, create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test -- --run
```

**Important:** Once this workflow is added:
1. Go to branch protection settings
2. Add `lint`, `build`, and `test` as required status checks

---

## Merge Automation Constraints

The `merge_all_prs.py` script respects these protections:

| Protection | Script Behavior |
|------------|-----------------|
| Required approvals | Stops if PR lacks approvals |
| Required checks | Waits for checks, stops if they fail |
| Up-to-date requirement | Updates branch before merge |
| Merge conflicts | Stops and reports conflicts |
| Linear history | Uses squash merge only |

**The script will NOT:**
- Bypass branch protection
- Force merge without approvals
- Merge with failing checks
- Use admin override flags
- Force push to protected branches

---

## Security Considerations

### What Branch Protection Prevents

| Attack Vector | Protection |
|---------------|------------|
| Direct push to main | Blocked by PR requirement |
| Force push history rewrite | Blocked by force push restriction |
| Merging untested code | Blocked by required checks |
| Self-approving changes | Blocked by dismiss stale approvals + code owners |
| Deleting main branch | Blocked by deletion restriction |

### Additional Recommendations

1. **Enable 2FA** for all repository contributors
2. **Use signed commits** for audit trail
3. **Review Actions permissions** (Settings → Actions → General)
4. **Audit log monitoring** for sensitive operations

---

## Troubleshooting

### "Merge blocked: required status checks are missing"

**Cause:** CI workflow not configured or check names don't match

**Fix:**
1. Verify CI workflow exists at `.github/workflows/ci.yml`
2. Ensure job names match required checks exactly
3. Re-run the workflow if needed

### "Merge blocked: review required"

**Cause:** PR needs approval

**Fix:**
1. Request review from appropriate team member
2. If using CODEOWNERS, ensure the right owner approves

### "Merge blocked: branch is out of date"

**Cause:** `main` has new commits since PR was created

**Fix:**
1. Update PR branch: `gh pr update-branch <number> --rebase`
2. Or use GitHub UI "Update branch" button
3. Wait for checks to re-run

### "Merge blocked: conversations unresolved"

**Cause:** Review comments haven't been resolved

**Fix:**
1. Address all review comments
2. Mark conversations as resolved
3. Re-request review if needed

---

## References

- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [CODEOWNERS Syntax](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [Required Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging)

---

*Last updated: 2026-01-20*
