# Smart Production Deployment

Perform an intelligent production deployment that analyzes what changed and only deploys what's necessary.

## Instructions

Follow these steps in order:

### Phase 1: Analysis - Determine What to Deploy

1. **Check we're on main branch** (or confirm with user if not)
2. **Find what changed since last production deployment**
   - Compare HEAD against the last known deployed commit
   - If unknown, ask user or compare against recent commits

3. **Categorize changed files:**
   - **Frontend (UI)**: `src/**`, `public/**`, `package.json`, `tailwind.config.js`, `tsconfig.json`
   - **Backend (API)**: `backend/**`
   - **Infrastructure/Config**: `.github/**`, `terraform/**`, root config files
   - **Docs only**: `docs/**`, `*.md`, `specs/**` (no deployment needed)

4. **Determine deployment scope:**
   - If ONLY frontend files changed → **UI only**
   - If ONLY backend files changed → **API only**
   - If both changed → **Both UI and API**
   - If only docs/specs changed → **No deployment needed**

### Phase 2: Pre-Deployment Checklist

Before ANY deployment, verify:

```bash
# 1. All tests pass
npm test

# 2. Backend builds
cd backend/** && dotnet build
```

If tests fail, STOP and report. Do not proceed with deployment.

### Phase 3: Create Deployment Spec

Create a brief deployment spec summarizing:
- What changed (list of files/areas)
- Deployment scope (UI only / API only / Both)
- Any migrations needed (check for new files in `backend/**/Migrations/`)
- Known risks or considerations

Present this spec to the user and wait for approval before proceeding.

### Phase 4: Execute Deployment

#### If deploying API:

```bash
# 1. CRITICAL: Clean the publish directory to avoid contamination
cd backend/**
rm -rf publish publish-prod publish-test bin obj deploy-prod.zip

# 2. Build fresh
dotnet publish -c Release -o publish-prod

# 3. Verify no nested directories (IMPORTANT - past bug)
ls -la publish-prod/
# Should see DLLs directly, NOT nested publish-* folders

# 4. Create deployment package
cd publish-prod && zip -r ../deploy-prod.zip . && cd ..

# 5. Deploy
az webapp deploy --resource-group <resource-group> --name <api-app-name> --src-path deploy-prod.zip --type zip --async false

# 6. Wait for deployment to complete and verify health
sleep 10
curl -s https://<api-url>/health
```

#### If deploying UI:

```bash
# 1. Clean build
rm -rf build

# 2. Build with production environment
REACT_APP_API_BASE_URL=https://<api-url>/api \
REACT_APP_REDIRECT_URI=https://<ui-url> \
npm run build

# 3. Upload to Azure Storage
az storage blob upload-batch \
  --account-name <storage-account-name> \
  --destination '$web' \
  --source build \
  --overwrite \
  --auth-mode login

# 4. Purge CDN cache (if applicable)
```

### Phase 5: Post-Deployment Verification

#### After API deployment:

```bash
# 1. Health check
curl -s https://<api-url>/health

# 2. Verify any required app settings exist
az webapp config appsettings list \
  --resource-group <resource-group> \
  --name <api-app-name> \
  --output table
```

#### After UI deployment:

```bash
# 1. Verify UI is accessible
curl -s -o /dev/null -w "%{http_code}" https://<ui-url>/

# 2. Check for new bundle hash (confirms deployment)
curl -s https://<ui-url>/ | grep -o 'main\.[a-f0-9]*\.js' | head -1
```

## Environment Reference

| Resource | Value |
|----------|-------|
| API URL | `<api-url>` |
| UI URL | `<ui-url>` |
| Resource Group | `<resource-group>` |
| API App Service | `<api-app-name>` |
| UI Storage Account | `<storage-account-name>` |

## Known Issues & Safeguards

### ⚠️ Build Contamination
Always clean ALL publish directories before building:
```bash
rm -rf publish publish-prod publish-test bin obj
```
Nested directories from previous builds can cause the wrong DLLs to be deployed.

### ⚠️ Don't Deploy API for UI-Only Changes
If only frontend files changed (src/, public/, etc.), DO NOT deploy the API. This avoids unnecessary risk.

## Report

After deployment, summarize:
1. **Deployment scope**: What was deployed (UI/API/Both)
2. **Files changed**: Brief summary of what changed
3. **Verification results**: Health check status, blob settings confirmed
4. **Any issues encountered**: Note any warnings or manual steps taken
