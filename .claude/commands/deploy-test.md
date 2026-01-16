# Deploy to Test Environment

Trigger the GitHub Actions test deployment workflow.

## Usage

```
/deploy-test [action] [branch]
```

- **action**: Deployment action (optional, defaults to `deploy-only`)
- **branch**: Branch to deploy (optional, defaults to `main`)

## Examples

### Deploy from main (default)

```bash
/deploy-test                    # deploy-only from main
/deploy-test deploy-only        # same as above, explicit
/deploy-test full-deploy        # full infrastructure rebuild from main
/deploy-test ui-only            # just the UI from main
/deploy-test api-only           # just the API from main
```

### Deploy from a feature branch

```bash
/deploy-test deploy-only feature/add-billing-tab
/deploy-test ui-only feature/new-header-design
/deploy-test full-deploy fix/database-migration-issue
```

### Real-world scenarios

| Scenario | Command |
|----------|---------|
| Normal deployment after merging PR | `/deploy-test` |
| Test a feature branch before merging | `/deploy-test deploy-only feature/my-feature` |
| Quick UI fix on a branch | `/deploy-test ui-only fix/button-color` |
| Recreate test env from a branch | `/deploy-test full-deploy feature/new-terraform` |
| Refresh test database from prod | `/deploy-test refresh-database` |
| Run health checks only | `/deploy-test validate` |

## Deployment Actions

| Action | Description | When to Use |
|--------|-------------|-------------|
| `deploy-only` | Build + migrate + deploy | **Most common** - standard deployment |
| `full-deploy` | Infrastructure + DB copy + build + deploy | Test env doesn't exist or needs full recreation |
| `ui-only` | Build and deploy frontend only | Frontend-only changes |
| `api-only` | Build and deploy backend only | Backend-only changes |
| `migrations` | Run EF Core migrations only | Database schema changes only |
| `refresh-database` | Copy prod DB + create MI user + migrate | Need fresh production data |
| `infrastructure` | Terraform apply only | Infrastructure changes only |
| `validate` | Health checks only | Verify deployment status |

## Environment URLs

| Purpose | URL |
|---------|-----|
| API |  |
| UI (Public) |  |
| UI (Storage) |  |
| Health Check |  |

## Instructions

1. Parse the user's command to determine action and branch
2. Trigger the GitHub workflow using the `gh` CLI
3. Provide the workflow run URL so the user can monitor progress

## Steps

### 1. Trigger the Workflow

```bash
# With defaults (deploy-only from main)
gh workflow run test-deploy.yml -f action=deploy-only -f branch=main

# With specific action and branch
gh workflow run test-deploy.yml -f action=<action> -f branch=<branch>
```

### 2. Get the Run URL

```bash
# Wait a moment for the run to start, then get the URL
sleep 3
gh run list --workflow=test-deploy.yml --limit=1 --json url,status,conclusion,headBranch --jq '.[0]'
```

### 3. Monitor Progress (Optional)

```bash
# Watch the run in terminal
gh run watch

# Or open in browser
gh run view --web
```

## Report

After triggering the workflow, report:
1. Which action was triggered
2. Which branch is being deployed
3. The GitHub Actions run URL
4. Remind the user they can monitor with `gh run watch` or view in browser
