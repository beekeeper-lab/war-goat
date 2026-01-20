# Claude Commands

This document describes the custom Claude Code commands available for the project. These commands help streamline common development workflows.

## Command Overview

| Command | Type | Purpose |
|---------|------|---------|
| `/bug` | Planning | Create a structured plan to fix a bug |
| `/chore` | Planning | Create a structured plan for maintenance tasks |
| `/feature` | Planning | Create a structured plan for new features |
| `/implement` | Execution | Execute a plan from specs/*.md |
| `/deploy-test` | Deployment | Deploy to test environment |
| `/deploy-prod` | Deployment | Deploy to production environment |
| `/commit` | Git | Run tests, commit, push, and create PR |
| `/review` | Quality | Comprehensive code, security, and docs review |
| `/test-gen` | Quality | Generate tests for a component or functionality |
| `/prime` | Utility | Get oriented with the codebase |
| `/start` | Utility | Start the development environment |
| `/install` | Utility | Install all dependencies |
| `/test` | Utility | Run all tests |
| `/tools` | Utility | List available Claude tools |
| `/add-video` | Content | Add a YouTube video with AI enrichment |
| `/import-channel` | Content | Batch import videos from a YouTube channel |
| `/start-workflow` | Workflow | Start a multi-agent workflow session |
| `/merge-prs` | Workflow | Merge all workflow PRs safely |

### Multi-Agent Workflow Commands (Internal)

These commands are used internally by the multi-agent workflow system:

| Command | Stage | Purpose |
|---------|-------|---------|
| `/workflow-requirements` | 1 | Requirements Agent - gather and document requirements |
| `/workflow-architecture` | 2 | Architecture Agent - design technical solution |
| `/workflow-implement` | 3 | Implementor Agent - write the code |
| `/workflow-qa` | 4 | QA Agent - test and validate |
| `/workflow-integration-gate` | 5 | Integration Gate - final validation before PR |

See [Multi-Agent Workflow Documentation](../../docs/MULTI-AGENT-WORKFLOW.md) for details.

---

## Planning Commands

These commands create detailed implementation plans in the `specs/` directory. The workflow is:
1. Run a planning command (`/bug`, `/chore`, or `/feature`)
2. Review the generated plan in `specs/*.md`
3. Run `/implement specs/<plan-name>.md` to execute the plan

### /bug - Bug Fix Planning

Creates a comprehensive bug investigation and fix plan with root cause analysis.

**Usage:**
```
/bug <description of the bug>
```

**Examples:**
```
/bug Users cannot save kidney service when biopsy laterality is set to "Left"

/bug The Case Log table shows incorrect dates for cross clamp times in Pacific timezone

/bug Login fails with "block_nested_popups" error when using Safari browser
```

**What it produces:**
- Bug description and symptoms
- Steps to reproduce
- Root cause analysis
- Step-by-step fix tasks
- Validation commands

**Output location:** `specs/bug-<name>.md`

---

### /chore - Maintenance Task Planning

Creates a plan for maintenance tasks like refactoring, dependency updates, or cleanup.

**Usage:**
```
/chore <description of the maintenance task>
```

**Examples:**
```
/chore Update all npm dependencies to latest versions

/chore Refactor the CasesController to reduce code duplication

/chore Add indexes to improve Case Log query performance

/chore Clean up unused CSS classes in the components directory
```

**What it produces:**
- Chore description
- Relevant files to modify
- Step-by-step tasks
- Validation commands

**Output location:** `specs/chore-<name>.md`

---

### /feature - Feature Planning

Creates a comprehensive feature implementation plan with user stories, phases, and testing strategy.

**Usage:**
```
/feature <description of the new feature>
```

**Examples:**
```

```

**What it produces:**
- Feature description and user story
- Problem and solution statements
- Implementation phases (Backend → Frontend → Integration)
- Testing strategy with edge cases
- Acceptance criteria
- Validation commands

**Output location:** `specs/feature-<name>.md`

---

## Execution Commands

### /implement - Execute a Plan

Reads a plan file and implements it step by step, then reports the changes.

**Usage:**
```
/implement specs/<plan-file>.md
```

**Examples:**
```
/implement specs/bug-biopsy-laterality-save.md

/implement specs/feature-pdf-export.md

/implement specs/chore-update-dependencies.md
```

**What it does:**
1. Reads the plan file
2. Executes each step in order
3. Runs validation commands
4. Reports files changed via `git diff --stat`

---

## Quality Commands

### /review - Comprehensive Code Review

Performs a full code review covering coding practices, security, and documentation.

**Usage:**
```
/review
```

**What it reviews:**

1. **Code Quality**
   - Naming conventions, dead code, function length
   - Error handling, DRY principle, TypeScript types
   - React best practices, code smells

2. **Security**
   - Authentication & authorization on all endpoints
   - Input validation (SQL injection, XSS)
   - Secrets management, data protection
   - Dependency vulnerabilities

3. **Documentation**
   - Code comments, API docs
   - Architecture docs accuracy
   - CLAUDE.md up to date

4. **Test Coverage**
   - New code has tests
   - Edge cases covered

**Output:**
Findings organized by priority:
- 🔴 **Critical** - Fix immediately (security, data exposure)
- 🟠 **High** - Fix soon (bugs, missing error handling)
- 🟡 **Medium** - Should fix (code smells, doc gaps)
- 🟢 **Low** - Nice to have (style, optional refactoring)

Each finding includes a recommendation and discussion on whether to fix now or defer.

---

### /test-gen - Generate Tests

Generates comprehensive tests for a specified component or functionality.

**Usage:**
```
/test-gen <description of what to test>
```

**Examples:**
```
/test-gen Write tests for CaseEditBasicInfo component covering form validation and save functionality

/test-gen Create tests for the laterality dropdown ensuring inactive options display correctly

/test-gen Test the BillingTable component's pagination and filtering behavior

/test-gen Add tests for the caseApi.updateCase function covering success and error cases
```

**What it produces:**
- Test file following project conventions (Jest + React Testing Library)
- Organized describe blocks for related functionality
- Positive and negative test cases
- Edge case coverage (null values, empty states, errors)
- Mocked dependencies where needed

**Testing conventions used:**
- Uses `@testing-library/react` for component rendering
- Uses `screen.getByRole`, `screen.queryByRole` for accessible queries
- Creates `defaultProps` for reusable test setup
- Clears mocks in `beforeEach`

**Output location:** Test file next to the component (e.g., `Component.test.tsx`)

---

## Git Commands

### /commit - Commit, Push, and Create PR

A guided workflow for committing changes safely.

**Usage:**
```
/commit
```

**What it does:**
1. Runs all tests (`npm test` + `dotnet build`)
2. Shows changes and proposes a descriptive commit message
3. Asks once: "Commit and push? Also run code review?" (Y/N/Review only)
4. After approval, executes fully: commit → optional review → push → create PR
5. Reports PR URL and summary

**Safeguards:**
- Will NOT proceed if tests fail or build errors occur
- Pauses only for destructive actions or genuine ambiguities
- Single approval point, then autonomous execution

---

## Deployment Commands

### /deploy-test - Deploy to Test Environment

Deploys both backend and frontend to the test Azure environment.

**Usage:**
```
/deploy-test
```

**What it does:**
1. Builds backend with `dotnet publish`
2. Deploys to test Azure Web App
3. Builds frontend with test environment variables
4. Uploads to test storage account
5. Purges CDN cache
6. Verifies health endpoint

**Environment:**
Configure your test environment URLs in the deploy-test.md file.

---

### /deploy-prod - Deploy to Production

Deploys both backend and frontend to the production Azure environment.

**Usage:**
```
/deploy-prod
```

**Pre-deployment checklist:**
- All tests passing
- Backend builds without errors
- Changes merged to main branch
- Test environment verified working

**Environment:**
Configure your production environment URLs in the manual-deploy-prod.md file.

---

## Utility Commands

### /prime - Get Oriented

Quickly understand the codebase structure and recent activity.

**Usage:**
```
/prime
```

**What it does:**
1. Lists project files
2. Reads README.md and architecture docs
3. Summarizes tech stack, directories, and recent commits

**Use when:** Starting a new session or unfamiliar with the project

---

### /start - Start Development Environment

Starts both frontend and backend development servers.

**Usage:**
```
/start
```

**What it runs:** `npm run dev:full`

**Result:**
- Frontend at http://localhost:3000
- Backend at http://localhost:5062
- Uses local SQLite database

---

### /install - Install Dependencies

Installs all npm and .NET dependencies.

**Usage:**
```
/install
```

**What it runs:**
1. `npm install`
2. `cd backend && dotnet restore`
3. Verifies with `npm test` and `dotnet build`

---

### /test - Run All Tests

Runs the complete test suite.

**Usage:**
```
/test
```

**What it runs:**
1. `npm test` - Frontend Jest tests
2. `dotnet build` - Backend compilation check

---

### /tools - List Available Tools

Lists all built-in Claude Code tools.

**Usage:**
```
/tools
```

---

## Content Commands

### /add-video - Add YouTube Video

Adds a YouTube video to the collection with AI-enhanced metadata.

**Usage:**
```
/add-video <youtube-url>
```

**What it does:**
1. Fetches video metadata (title, author, thumbnail)
2. Retrieves transcript if available
3. Generates AI summary and key points
4. Auto-categorizes based on content
5. Adds to the database

---

### /import-channel - Batch Import Channel

Imports multiple videos from a YouTube channel.

**Usage:**
```
/import-channel <channel-name-or-url>
```

**What it does:**
1. Searches for the channel
2. Lists recent videos
3. Lets you select which to import
4. Batch processes selected videos

---

## Multi-Agent Workflow Commands

These commands power the multi-agent workflow system for parallel feature development.
See [Multi-Agent Workflow Documentation](../../docs/MULTI-AGENT-WORKFLOW.md) for complete details.

### /start-workflow - Start Workflow Session

Initializes a new workflow for a work item.

**Usage:**
```
/start-workflow <WORK_ITEM_ID> <type> "<title>"
```

**Examples:**
```
/start-workflow F001 feature "Add user authentication"
/start-workflow B002 bug "Fix login timeout"
/start-workflow C003 chore "Update dependencies"
```

**What it does:**
1. Creates a git worktree for isolated development
2. Sets up workflow directory structure
3. Initializes the Requirements Agent
4. Starts the tmux-based workflow monitor

---

### /merge-prs - Merge All Workflow PRs

Safely merges all PRs from completed workflows.

**Usage:**
```
/merge-prs
```

**What it does:**
1. Discovers PRs with `workflow-ready` label
2. For each PR:
   - Updates branch if behind main
   - Waits for CI checks to pass
   - Verifies approval status
   - Squash merges
   - Verifies main is healthy
3. Generates merge session report

**Safeguards:**
- Never bypasses branch protection
- Stops on first failure
- Full audit trail in `workflow/_reports/`

---

## Typical Workflows

### Bug Fix Workflow (Simple)
```
1. /bug Users see wrong date format in Case Log
2. Review specs/bug-date-format.md
3. /implement specs/bug-date-format.md
4. /test
5. /commit
```

### Feature Development Workflow (Simple)
```
1. /feature Add PDF export to Reports panel
2. Review specs/feature-pdf-export.md
3. /implement specs/feature-pdf-export.md
4. /test
5. /deploy-test
6. Verify on test environment
7. /commit
8. After merge: /deploy-prod
```

### Multi-Agent Workflow (Complex Features)
```
1. /start-workflow F001 feature "Complex new feature"
2. Agents run automatically through stages:
   - Requirements → Architecture → Implementation → QA → Integration Gate
3. Review the generated PR
4. /merge-prs (at end of work session)
```

### Quick Start Workflow
```
1. /prime          # Understand the codebase
2. /install        # Install dependencies
3. /start          # Start dev servers
```

---

## Directory Structure

```
.claude/
└── commands/
    ├── README.md                    # This file
    │
    │   # Planning Commands
    ├── bug.md                       # Bug planning template (TDD)
    ├── chore.md                     # Chore planning template (TDD)
    ├── feature.md                   # Feature planning template (TDD)
    ├── implement.md                 # Plan execution
    │
    │   # Quality Commands
    ├── commit.md                    # Commit, push, PR workflow
    ├── review.md                    # Comprehensive code review
    ├── test-gen.md                  # Test generation (UI-first)
    ├── test.md                      # Run tests
    │
    │   # Deployment Commands
    ├── deploy-test.md               # Test deployment
    ├── manual-deploy-prod.md        # Production deployment
    │
    │   # Utility Commands
    ├── prime.md                     # Codebase orientation
    ├── start.md                     # Start dev environment
    ├── install.md                   # Install dependencies
    ├── tools.md                     # List tools
    │
    │   # Content Commands
    ├── add-video.md                 # Add YouTube video with AI enrichment
    ├── import-channel.md            # Batch import from YouTube channel
    │
    │   # Multi-Agent Workflow Commands
    ├── start-workflow.md            # Start workflow session
    ├── merge-prs.md                 # Merge all workflow PRs
    ├── workflow-requirements.md     # Stage 1: Requirements Agent
    ├── workflow-architecture.md     # Stage 2: Architecture Agent
    ├── workflow-implement.md        # Stage 3: Implementor Agent
    ├── workflow-qa.md               # Stage 4: QA Agent
    └── workflow-integration-gate.md # Stage 5: Integration Gate

specs/
├── bug-*.md            # Bug fix plans
├── chore-*.md          # Maintenance plans
└── feature-*.md        # Feature plans

workflow/
├── {WORK_ITEM_ID}/     # Workflow artifacts per work item
│   ├── 1-requirements.md
│   ├── 2-architecture.md
│   ├── 3-implementation.md
│   ├── 4-qa-report.md
│   └── 5-integration-gate.md
└── _reports/           # Merge session reports
```
