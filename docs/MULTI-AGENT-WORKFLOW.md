# Multi-Agent Workflow System

This document provides a comprehensive guide to the multi-agent workflow system for developing features, fixing bugs, and completing tasks with AI assistance.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Starting Claude](#starting-claude)
4. [Issue Tracking with Beans](#issue-tracking-with-beans)
5. [Git Worktrees](#git-worktrees)
6. [Workflow Stages](#workflow-stages)
7. [Persistent Artifacts](#persistent-artifacts)
8. [Safety Hooks](#safety-hooks)
9. [Usage Tracking](#usage-tracking)
10. [Parallel Workflows](#parallel-workflows)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The multi-agent workflow system splits development work across five specialized AI agents, each focused on a specific aspect of the development process:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  REQUIREMENTS   │ ──▶ │  ARCHITECTURE   │ ──▶ │ IMPLEMENTATION  │ ──▶ │       QA        │ ──▶ │ INTEGRATION     │
│     Agent       │     │     Agent       │     │     Agent       │     │     Agent       │     │   GATE Agent    │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
       │                       │                       │                       │                       │
       ▼                       ▼                       ▼                       ▼                       ▼
  Requirements Doc       Technical Spec         Working Code           QA Report            Integration Report
  (User Stories + AC)    (For Implementor)      (Tests + Code)         (Verification)       (Merge + Retest)
```

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **TDD Throughout** | Test-Driven Development from requirements through QA |
| **Parallel Work** | Run multiple workflows simultaneously in isolated git worktrees |
| **Specialization** | Each agent focuses on one aspect of development |
| **Quality Gates** | Each stage produces documented deliverables before proceeding |
| **Traceability** | Clear documentation traces requirements → design → code → verification |
| **Test Impact Tracking** | Predict and verify test changes across the entire workflow |
| **Isolation** | Git worktrees prevent conflicts between parallel workflows |
| **Safety** | Hooks protect against dangerous operations |
| **Visibility** | Track AI token usage and timing per stage and workflow |
| **Integration Gate** | Verify merge with main passes all tests before PR creation |
| **Machine-Checkable Evidence** | All stage checkpoints have captured evidence artifacts |
| **Overlap Detection** | Detect when multiple workflows modify the same files |
| **PR Safety Guards** | Block PR creation unless all stages approved |

---

## Getting Started

### Prerequisites

1. **Claude Code CLI** - Install from https://claude.ai/claude-code
2. **tmux** - Terminal multiplexer for parallel agent panes
3. **Beans** - Issue tracking CLI (optional but recommended)
4. **gh** - GitHub CLI for PR creation

```bash
# Install tmux
sudo pacman -S tmux    # Arch
sudo apt install tmux  # Debian/Ubuntu
brew install tmux      # macOS

# Install Beans (issue tracker)
cargo install beans-cli

# Install GitHub CLI
sudo pacman -S github-cli  # Arch
sudo apt install gh        # Debian/Ubuntu
brew install gh            # macOS
```

### Quick Start (5 minutes)

```bash
# 1. Start Claude in tmux
./tmux_claude.sh

# 2. In Claude, start a workflow from a Beans issue
/start-workflow F004

# 3. Watch the agent panel (right side) - it auto-chains through all 4 stages
#    Switch panes: Ctrl+b then arrow keys

# 4. When complete, a PR is automatically created
```

---

## Starting Claude

### Recommended: Use the Launcher Script

The `tmux_claude.sh` script is the recommended way to start Claude for workflow development:

```bash
./tmux_claude.sh
```

This script:
1. Starts a tmux session named "workflow"
2. Launches Claude inside the session
3. Auto-runs `/prime` to orient Claude with the codebase
4. Enables `/start-workflow` to spawn agent panes

### Manual Start

If you prefer to start manually:

```bash
# Start tmux session
tmux new -s workflow

# Start Claude
claude

# Orient with the codebase
/prime
```

### Without tmux

The workflow system works without tmux, but agents will run sequentially in your terminal instead of in parallel panes:

```bash
claude
/start-workflow F004
# Agent runs in current terminal, auto-chains through all stages
```

---

## Issue Tracking with Beans

[Beans](https://github.com/beekeeper-lab/beans) is the recommended issue tracker for managing work items. It integrates with the workflow system.

### Setting Up Beans

```bash
# Initialize Beans in your project
beans init

# Configure GitHub integration (optional)
beans config github.repo "owner/repo"
```

### Creating Work Items

Use a naming convention for work item IDs:
- `F###` - Features (e.g., F001, F002)
- `B###` - Bugs (e.g., B001, B002)
- `C###` - Chores/Tasks (e.g., C001, C002)

```bash
# Create a feature
beans new --title "F004: Article/Web Page Enrichment" --type feature

# Create a bug
beans new --title "B001: Transcript fetch timeout" --type bug

# Create a chore
beans new --title "C001: Upgrade React to v19" --type chore
```

### Managing Work Items

```bash
# List all work items
beans list

# Show details
beans show <bean-id>

# Update status
beans update <bean-id> -s in-progress
beans update <bean-id> -s completed

# Add notes
beans update <bean-id> --note "Blocked on API access"
```

### Workflow Integration

The workflow stages automatically update Beans:
- **Start**: Requirements agent marks issue as `in-progress`
- **Complete**: QA agent marks issue as `completed` (if approved)

---

## Git Worktrees

Git worktrees allow multiple checkouts of the same repository, enabling parallel development without conflicts.

### How Worktrees Work

```
main repo (.git)
├── main branch (original checkout)
├── ../project-f001/ (worktree → feature/F001 branch)
├── ../project-f002/ (worktree → feature/F002 branch)
└── ../project-b001/ (worktree → fix/B001 branch)
```

### Benefits

- **Isolation**: Each workflow has its own working directory
- **Parallel Development**: Run multiple workflows simultaneously
- **Shared History**: All worktrees share the same `.git` directory
- **Lightweight**: No need to clone the entire repo

### Automatic Worktree Creation

When you run `/start-workflow`, the system automatically:

1. Creates a branch based on work item type:
   - Features → `feature/F001`
   - Bugs → `fix/B001`
   - Chores → `chore/C001`

2. Creates a worktree at `../project-name-<id>/`

3. Copies workflow files to the worktree

### Manual Worktree Commands

```bash
# List worktrees
git worktree list

# Create worktree manually
git worktree add ../project-f001 -b feature/F001

# Remove worktree
git worktree remove ../project-f001

# Prune stale worktrees
git worktree prune
```

### Worktree Lifecycle

```
1. /start-workflow F001
   └─▶ Creates ../project-f001/ with feature/F001 branch

2. Agent works in worktree
   └─▶ Commits and pushes to feature/F001

3. QA completes, PR created
   └─▶ PR: feature/F001 → main

4. After merge, cleanup:
   git worktree remove ../project-f001
   git branch -d feature/F001
```

---

## Workflow Stages

### Stage 1: Requirements Agent

**Command**: `/workflow-requirements <ID>`

**Purpose**: Understand the request, analyze impact, analyze test impact, document requirements

**Inputs**:
- Work item ID and description (from Beans)
- Existing requirements (if updating)
- Existing test suite (runs tests to establish baseline)

**Outputs**:
- `docs/requirements/{ID}-requirements.md` (persistent)
- `workflow/{ID}/1-requirements.md` (tracking)
- `workflow/{ID}/test-impact-report.md` (test tracking - Section 1)

**Deliverables**:
- User stories with acceptance criteria
- Functional requirements (FR-1, FR-2, ...)
- Non-functional requirements
- System impact analysis
- **Test impact analysis** (which tests will break/change)
- Open questions for Architecture

**Checkpoints**:
| Checkpoint | Criteria |
|------------|----------|
| `requirements_identified` | At least 3 functional requirements defined |
| `impact_analyzed` | Components affected are identified with impact levels |
| `test_impact_analyzed` | Existing tests run, impacted tests identified |
| `acceptance_criteria_defined` | Each AC is specific, measurable, and testable |
| `no_open_blockers` | No unanswered questions that block architecture |

### Stage 2: Architecture Agent

**Command**: `/workflow-architecture <ID>`

**Purpose**: Design the solution, make technical decisions, plan test architecture, create implementation plan

**Inputs**:
- Requirements from Stage 1
- Test Impact Report from Stage 1
- Existing codebase patterns

**Outputs**:
- `specs/{ID}-spec.md` (persistent - THE source for Implementor)
- `workflow/{ID}/2-architecture.md` (tracking)
- `workflow/{ID}/test-impact-report.md` (updated - Section 2)

**Deliverables**:
- Architecture Decision Records (ADRs)
- Technical design (data models, APIs, components)
- **Test architecture decisions** (tooling, structure, data strategy)
- File change list with line numbers
- Step-by-step tasks for Implementor
- Test strategy (TDD approach)

**Checkpoints**:
| Checkpoint | Criteria |
|------------|----------|
| `requirements_addressed` | Every requirement has a design solution |
| `design_complete` | Data models, APIs, and components fully specified |
| `test_architecture_defined` | Test tooling and structure planned |
| `tasks_defined` | Step-by-step tasks are clear and executable |
| `tests_planned` | Test files and test cases specified for TDD |

### Stage 3: Implementation Agent

**Command**: `/workflow-implement <ID>`

**Purpose**: Implement the solution following TDD principles

**Inputs**:
- `specs/{ID}-spec.md` (PRIMARY input)
- Test Impact Report (predicted test changes)
- Architecture document from Stage 2

**Outputs**:
- `workflow/{ID}/3-implementation.md` (tracking)
- `workflow/{ID}/test-impact-report.md` (updated - Section 3)
- Actual code changes
- Tests (unit, component, E2E)
- Git commits

**Approach**:
1. **Run existing tests first** (establish baseline)
2. **RED**: Write failing tests first
3. **GREEN**: Implement code to pass tests
4. **REFACTOR**: Clean up while keeping tests green
5. **Track deviations** from predicted test changes

**Checkpoints**:
| Checkpoint | Criteria |
|------------|----------|
| `baseline_tests_run` | Existing tests run before changes, baseline captured |
| `tests_written` | All tests from architecture spec implemented |
| `code_complete` | All tasks from architecture spec implemented |
| `tests_passing` | All unit and E2E tests pass (including pre-existing) |
| `no_lint_errors` | Code passes linting with no errors |

### Stage 4: QA Agent

**Command**: `/workflow-qa <ID>`

**Purpose**: Verify implementation, verify test predictions, fill test gaps, approve or reject

**Inputs**:
- `docs/requirements/{ID}-requirements.md` (What was requested)
- `specs/{ID}-spec.md` (What was designed)
- `workflow/{ID}/3-implementation.md` (What was built)
- `workflow/{ID}/test-impact-report.md` (Test predictions to verify)
- Actual code and tests

**Outputs**:
- `workflow/{ID}/4-qa-report.md` (tracking)
- `workflow/{ID}/test-impact-report.md` (finalized - Section 4)
- Additional tests (gap filling)
- Bug reports (if issues found)
- Documentation updates

**Verification**:
- All acceptance criteria met
- All tests pass
- **Test predictions verified** (accuracy documented)
- No critical bugs
- Documentation updated

**Checkpoints**:
| Checkpoint | Criteria |
|------------|----------|
| `criteria_verified` | All acceptance criteria verified |
| `tests_passing` | All automated tests pass |
| `test_predictions_verified` | Test Impact Report predictions reviewed |
| `no_critical_bugs` | No critical/blocking bugs remain |
| `docs_updated` | Documentation reflects implementation |

**Verdict**: `APPROVED` or `REJECTED`

### Stage 5: Integration Gate Agent

**Command**: `/workflow-integration-gate <ID>`

**Purpose**: Verify the work integrates cleanly with main before PR creation

**Why This Stage Exists**: The Integration Gate catches issues that only appear when merging with main:
- Other PRs may have been merged since you started
- Your changes may conflict with recent updates
- Tests may pass on your branch but fail after merge

**Inputs**:
- QA Report with `qa_verdict: approved`
- Current branch state
- Latest `origin/main`

**Outputs**:
- `workflow/{ID}/5-integration-gate.md` (report)
- `workflow/{ID}/evidence/integration-gate/` (evidence files)
- Updated stage-results.json

**Process**:
1. **Verify QA Approval** - Check QA report has `qa_verdict: approved`
2. **Capture Pre-Merge State** - Run tests, record baseline
3. **Fetch Latest Main** - `git fetch origin main`
4. **Attempt Rebase** - `git rebase origin/main` (stop if conflicts)
5. **Run Full Test Suite** - Capture results
6. **Run Build** - Verify it succeeds
7. **Compare Results** - Check for regressions
8. **Capture Evidence** - Store all results

**Checkpoints**:
| Checkpoint | Criteria |
|------------|----------|
| `qa_approved` | Previous stage (QA) has `qa_verdict: approved` |
| `rebase_clean` | Rebase onto origin/main completed without conflicts |
| `tests_pass_post_merge` | All tests pass after rebase |
| `build_succeeds` | Build completes successfully |
| `no_regressions` | No new test failures introduced |

**Verdict**: `APPROVED` (ready for PR) or `REJECTED` (needs work)

---

## Persistent Artifacts

The workflow produces two types of artifacts:

### 1. Persistent Documents (Live Forever)

These documents are maintained across workflows and represent the current state of requirements and designs:

```
docs/requirements/
├── F001-requirements.md   # User stories + AC for F001
├── F002-requirements.md   # User stories + AC for F002
└── ...

specs/
├── F001-spec.md           # Technical spec for F001
├── F002-spec.md           # Technical spec for F002
└── ...
```

### 2. Workflow Documents (Per-Workflow Tracking)

These documents track the progress of a specific workflow execution:

```
workflow/
├── F001/
│   ├── status.json             # Workflow state
│   ├── stage-results.json      # Machine-checkable stage results + evidence
│   ├── usage.json              # AI token usage and timing
│   ├── agent.log               # Agent activity log
│   ├── test-impact-report.md   # Test predictions and verification
│   ├── 1-requirements.md       # Requirements stage output
│   ├── 2-architecture.md       # Architecture stage output
│   ├── 3-implementation.md     # Implementation stage output
│   ├── 4-qa-report.md          # QA stage output
│   ├── 5-integration-gate.md   # Integration Gate stage output
│   └── evidence/               # Machine-checkable evidence
│       ├── requirements/       # Evidence for requirements stage
│       ├── architecture/       # Evidence for architecture stage
│       ├── implement/          # Evidence for implementation stage
│       ├── qa/                 # Evidence for QA stage
│       └── integration-gate/   # Evidence for integration gate
│           ├── pre-rebase-tests.txt
│           ├── post-rebase-tests.txt
│           ├── build-output.txt
│           └── rebase-output.txt
├── _reports/
│   └── overlap-report.md       # Cross-workflow overlap detection
└── _archive/                   # Completed workflows
```

### 3. Test Impact Report

The Test Impact Report (`test-impact-report.md`) is a special artifact that flows through all stages:

| Section | Stage | Content |
|---------|-------|---------|
| Section 1 | Requirements | Baseline test run, predicted test changes |
| Section 2 | Architecture | Test tooling decisions, test structure plan |
| Section 3 | Implementation | Actual test changes, deviations from plan |
| Section 4 | QA | Prediction accuracy, lessons learned |

This creates a feedback loop for improving test impact predictions over time.

### Document Flow

```
User Request
     │
     ▼
┌─────────────────────────────────────────────┐
│  Requirements Agent                          │
│  ───────────────                             │
│  Creates/Updates:                            │
│    • docs/requirements/{ID}-requirements.md  │
│    • workflow/{ID}/1-requirements.md         │
└─────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────┐
│  Architecture Agent                          │
│  ──────────────────                          │
│  Reads: docs/requirements/{ID}-requirements.md│
│  Creates:                                    │
│    • specs/{ID}-spec.md (PRIMARY for impl)   │
│    • workflow/{ID}/2-architecture.md         │
└─────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────┐
│  Implementation Agent                        │
│  ────────────────────                        │
│  Reads: specs/{ID}-spec.md (PRIMARY)         │
│  Creates:                                    │
│    • Code + Tests                            │
│    • workflow/{ID}/3-implementation.md       │
└─────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────┐
│  QA Agent                                    │
│  ────────                                    │
│  Reads:                                      │
│    • docs/requirements/{ID}-requirements.md  │
│    • specs/{ID}-spec.md                      │
│    • workflow/{ID}/3-implementation.md       │
│  Creates:                                    │
│    • workflow/{ID}/4-qa-report.md            │
│  Updates: Beans issue status                 │
└─────────────────────────────────────────────┘
```

---

## Safety Hooks

The workflow system includes safety hooks to protect against dangerous operations. These are defined in `.claude/hooks/`.

### Bash Safety Hook

**File**: `.claude/hooks/bash_safety.py`

Blocks dangerous bash commands:

| Protection | Pattern | Message |
|------------|---------|---------|
| Delete root | `rm -rf /` | Cannot delete root filesystem |
| Delete home | `rm -rf ~` | Cannot delete home directory |
| Delete cwd | `rm -rf .` | Cannot recursively delete current directory |
| Push to main | `git push origin main` | Cannot push directly to main. Use a PR instead |
| Force push | `git push --force` | Force push is disabled for safety |
| Merge to main | `git merge ... main` | Cannot merge to main directly |
| Pipe to shell | `curl ... \| bash` | Cannot pipe curl to shell (security risk) |

**Soft Blocks** (require confirmation):
- `rm` commands that aren't obviously safe (not deleting node_modules, dist, etc.)

### Write Safety Hook

**File**: `.claude/hooks/write_safety.py`

Blocks writes to sensitive files:

| Protection | Files | Message |
|------------|-------|---------|
| SSH | `~/.ssh/*` | Cannot write to SSH directory |
| System config | `/etc/*` | Cannot write to system config directory |
| Root home | `/root/*` | Cannot write to root home directory |
| AWS | `~/.aws/credentials`, `~/.aws/config` | Cannot write to AWS credentials |
| GPG | `~/.gnupg/*` | Cannot write to GPG directory |
| Git config | `~/.gitconfig` | Cannot write to global git config |
| Environment | `.env`, `.env.*` | Cannot write to environment file |
| Keys | `*.pem`, `*.key`, `*.p12`, `*.pfx` | Cannot write to key/certificate file |
| Credentials | `credentials.json`, `secrets.json`, etc. | Cannot write to credentials file |

### Enabling Hooks

Hooks are configured in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/bash_safety.py\""
          }
        ]
      },
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/write_safety.py\""
          }
        ]
      }
    ]
  }
}
```

### Creating Custom Hooks

Hooks receive JSON via stdin with the tool invocation:

```json
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "rm -rf /important/files"
  }
}
```

Exit codes:
- `0` - Allow the operation
- `2` - Block the operation (message to stderr shown to user)

---

## Machine-Checkable Evidence

The workflow system captures machine-checkable evidence for all stage checkpoints, enabling automated verification and audit trails.

### Evidence Capture

Evidence is captured using `scripts/capture-evidence.py`:

```bash
# Capture a checkpoint result
python3 scripts/capture-evidence.py F001 qa tests_passing pass \
    workflow/F001/evidence/qa/test-output.txt \
    --message "All 47 tests passed"

# Capture test results with exit code
python3 scripts/capture-evidence.py F001 implement \
    --test-results 0 workflow/F001/evidence/implement/test-output.txt

# Finalize a stage (compute overall status)
python3 scripts/capture-evidence.py F001 qa --finalize

# Get stage status
python3 scripts/capture-evidence.py F001 qa --stage-results

# Verify stage is complete with required checkpoints
python3 scripts/capture-evidence.py F001 qa \
    --verify criteria_verified tests_passing no_critical_bugs
```

### stage-results.json Format

```json
{
  "workflow_id": "F001",
  "created_at": "2026-01-20T10:00:00Z",
  "last_updated": "2026-01-20T12:30:00Z",
  "stages": {
    "requirements": {
      "started_at": "2026-01-20T10:00:00Z",
      "completed_at": "2026-01-20T10:15:00Z",
      "finalized": true,
      "overall_status": "pass",
      "checkpoints": {
        "requirements_identified": {
          "status": "pass",
          "captured_at": "2026-01-20T10:14:00Z",
          "evidence_file": "workflow/F001/evidence/requirements/...",
          "evidence_hash": "sha256:..."
        }
      },
      "test_results": {
        "exit_code": 0,
        "passed": true,
        "output_file": "workflow/F001/evidence/requirements/baseline-tests.txt",
        "output_hash": "sha256:..."
      }
    }
  }
}
```

### PR Safety Verification

Before creating a PR, the system automatically verifies:

1. **Integration Gate approved** - `5-integration-gate.md` has `integration_verdict: approved`
2. **QA approved** - `4-qa-report.md` has `qa_verdict: approved`
3. **All stages passed** - `stage-results.json` shows `overall_status: pass` for all stages
4. **No critical overlaps** - Overlap detection doesn't report critical conflicts

If any check fails, PR creation is blocked with a clear error message.

---

## Overlap Detection

When running multiple workflows in parallel, they may modify the same files, leading to merge conflicts. The overlap detection system warns about potential conflicts.

### Running Overlap Detection

```bash
# Generate overlap report for all workflows
python3 scripts/detect-overlap.py

# Check specific workflow
python3 scripts/detect-overlap.py --check F001

# Generate JSON format
python3 scripts/detect-overlap.py --output-format json
```

### Overlap Report

The report is generated at `workflow/_reports/overlap-report.md`:

```markdown
# Workflow Overlap Report

## Summary
- **Active Workflows**: 3
- **Total Overlaps Detected**: 2
- **Critical Overlaps**: 1

## Overlap Details

| Risk | Workflow 1 | Workflow 2 | Files | Score |
|------|------------|------------|-------|-------|
| CRITICAL | F001 (implement) | F002 (qa) | 5 | 55 |
| MEDIUM | F001 (implement) | B001 (architecture) | 2 | 18 |

### F001 <-> F002
- Risk: CRITICAL (Score: 55)
- Overlapping Files:
  - `src/components/VideoCard.tsx`
  - `src/services/api.ts`
  ...
```

### Risk Scoring

The system calculates risk scores based on:

| Factor | Points |
|--------|--------|
| Each overlapping file | 1 (max 20) |
| Critical source files (src/, server/) | +10 per file |
| Config files (package.json, etc.) | +15 per file |
| Test files | +5 per file |
| Both workflows in late stage | +20 |

Risk Levels:
- **CRITICAL** (≥50): Manual coordination required
- **HIGH** (≥30): Review carefully, consider sequencing
- **MEDIUM** (≥15): Be aware of potential conflicts
- **LOW** (<15): Standard merge process should work

### Automatic Detection

Overlap detection runs automatically before PR creation. Critical overlaps trigger a warning (but don't block PR creation).

---

## Usage Tracking

The workflow system tracks AI token usage for each stage, enabling cost analysis and pattern detection.

### How It Works

After each workflow stage completes, `scripts/track-usage.py` extracts usage data from Claude's session transcript and stores it in two locations:

1. **Centralized Log**: `data/ai-usage.jsonl`
   - Append-only JSONL format
   - One record per stage completion
   - Easy to query with `jq`

2. **Per-Workflow Summary**: `workflow/{ID}/usage.json`
   - Breakdown by stage
   - Running totals
   - Stays with workflow artifacts

### Data Schema

```json
{
  "timestamp": "2026-01-17T10:30:00Z",
  "work_item_id": "F004",
  "stage": "implementation",
  "input_tokens": 45000,
  "output_tokens": 12000,
  "cache_read_tokens": 8000,
  "cache_write_tokens": 3000,
  "total_tokens": 68000,
  "tool_calls": 45,
  "duration_ms": 180000,
  "model": "claude-opus-4-5-20251101"
}
```

### Querying Usage Data

Use the `scripts/query-usage.sh` script:

```bash
# Overall summary
./scripts/query-usage.sh summary

# Usage grouped by workflow
./scripts/query-usage.sh by-workflow

# Average usage by stage (find which stages cost most)
./scripts/query-usage.sh by-stage

# Details for specific workflow
./scripts/query-usage.sh workflow F004

# Most recent records
./scripts/query-usage.sh recent 10

# Most expensive workflows
./scripts/query-usage.sh expensive 5
```

### Example Output

```bash
$ ./scripts/query-usage.sh by-stage
=== Average Usage by Stage ===
[
  {
    "stage": "architecture",
    "count": 5,
    "avg_tokens": 52000,
    "avg_tool_calls": 35
  },
  {
    "stage": "implementation",
    "count": 5,
    "avg_tokens": 85000,
    "avg_tool_calls": 120
  },
  {
    "stage": "qa",
    "count": 5,
    "avg_tokens": 45000,
    "avg_tool_calls": 60
  },
  {
    "stage": "requirements",
    "count": 5,
    "avg_tokens": 25000,
    "avg_tool_calls": 20
  }
]
```

---

## Parallel Workflows

The real power of this system is running multiple workflows simultaneously.

### Terminal Layout with tmux

```
┌─────────────────────────────────────────────────────────────────────┐
│ Pane 0: Main (You + Claude)│ Pane 1: F001 Agent                     │
│ ─────────────────────────────│───────────────────────────────────── │
│ ./tmux_claude.sh              │ [Requirements Agent running...]      │
│ /start-workflow F001          │ > Analyzing codebase                 │
│ /start-workflow F002          │ > Writing requirements               │
│                               │                                      │
├─────────────────────────────────────────────────────────────────────┤
│ Pane 2: F002 Agent            │ Pane 3: B001 Agent                   │
│ ─────────────────────────────│───────────────────────────────────── │
│ [Architecture Agent running...│ [Implementation Agent running...]    │
│ > Reading requirements        │ > Writing tests (RED)                │
│ > Designing solution          │ > Implementing code (GREEN)          │
└─────────────────────────────────────────────────────────────────────┘
```

### tmux Keybindings

| Key | Action |
|-----|--------|
| `Ctrl+b` then `→` | Move to right pane |
| `Ctrl+b` then `←` | Move to left pane |
| `Ctrl+b` then `↑` | Move to upper pane |
| `Ctrl+b` then `↓` | Move to lower pane |
| `Ctrl+b` then `z` | Zoom current pane (toggle) |
| `Ctrl+b` then `d` | Detach from session |
| `Ctrl+b` then `x` | Close current pane |

### Starting Multiple Workflows

```bash
# In Claude (main pane)
/start-workflow F001
/start-workflow F002
/start-workflow B001

# Each creates a new pane with an agent
```

### Monitoring Progress

#### Real-Time Dashboard (Recommended)

Run the workflow monitor in the main pane for a real-time dashboard:

```bash
./scripts/workflow-monitor.sh
```

This displays:
- All active workflows with current stage
- Progress bars (stages 1-4)
- Elapsed time per workflow
- Recent output captured from each pane
- Alerts when a workflow needs input

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  WORKFLOW DASHBOARD                                      Refresh: 5s         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  F005     [feature] My New Feature                                           ║
║  [██████████░░░░░░░░░░] 2/4  architecture  Running: 12m 30s                  ║
║  Recent output:                                                              ║
║    > Analyzing component dependencies...                                     ║
║    > Writing 2-architecture.md                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  F006     [feature] Another Feature                                          ║
║  [████░░░░░░░░░░░░░░░░] 1/4  requirements  Running: 5m 10s                   ║
║  Recent output:                                                              ║
║    > Running existing tests for baseline...                                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

#### Quick Status Commands

From the main pane:

```bash
# Check all work items
beans list

# Check specific workflow status
./scripts/workflow.sh status F001

# See what stage is running
./scripts/workflow.sh next F001

# Follow agent logs
tail -f workflow/F001/agent.log
```

---

## Troubleshooting

### "Workflow not found"

```bash
# Check workflow exists
ls workflow/

# Create if missing
./scripts/workflow.sh create F001 feature "Title"
```

### "Previous stage not complete"

```bash
# Check status
./scripts/workflow.sh status F001

# See which stage to run
./scripts/workflow.sh next F001
```

### "Worktree already exists"

```bash
# List worktrees
git worktree list

# Remove and recreate
git worktree remove ../project-f001
./scripts/workflow.sh worktree F001
```

### Agent Not Starting in Pane

Make sure you're running inside tmux:

```bash
# Check if in tmux
echo $TMUX

# If empty, start tmux first
./tmux_claude.sh
```

### Hook Blocking Legitimate Operation

If a safety hook blocks something you need to do:

1. Review why it was blocked (the message explains)
2. If legitimate, run the command manually outside Claude
3. Or modify the hook pattern in `.claude/hooks/`

### Merge Conflicts

```bash
# In the worktree
cd ../project-f001
git fetch origin
git rebase origin/main

# Resolve conflicts, then
git rebase --continue

# Re-run the stage if needed
```

### Usage Tracking Not Working

```bash
# Check if transcript exists
ls -la ~/.claude/projects/

# Run tracking manually
python3 scripts/track-usage.py F001 requirements /path/to/project
```

---

## Directory Structure Reference

```
project/
├── .claude/
│   ├── commands/                 # Claude slash commands
│   │   ├── workflow-requirements.md
│   │   ├── workflow-architecture.md
│   │   ├── workflow-implement.md
│   │   ├── workflow-qa.md
│   │   ├── workflow-integration-gate.md  # NEW: Integration Gate stage
│   │   ├── start-workflow.md
│   │   └── ...
│   ├── hooks/                    # Safety hooks
│   │   ├── bash_safety.py
│   │   └── write_safety.py
│   └── settings.json             # Hook configuration
│
├── scripts/
│   ├── workflow.sh               # Workflow management
│   ├── start-workflow.sh         # Launch workflow + agent
│   ├── agent-runner.sh           # Run stages, auto-chain, safety checks
│   ├── workflow-monitor.sh       # Real-time dashboard
│   ├── workflow-summary.py       # Display timing + token summary
│   ├── track-usage.py            # Extract AI usage data
│   ├── query-usage.sh            # Query usage data
│   ├── capture-evidence.py       # NEW: Capture checkpoint evidence
│   └── detect-overlap.py         # NEW: Detect workflow file overlaps
│
├── docs/
│   ├── requirements/             # Persistent requirements
│   │   ├── F001-requirements.md
│   │   └── ...
│   ├── templates/
│   │   └── test-impact-report.md # Template for test tracking
│   └── MULTI-AGENT-WORKFLOW.md   # This document
│
├── specs/                        # Persistent technical specs
│   ├── F001-spec.md
│   └── ...
│
├── workflow/                     # Workflow tracking
│   ├── F001/
│   │   ├── status.json           # Workflow state + pane ID
│   │   ├── stage-results.json    # NEW: Machine-checkable results
│   │   ├── usage.json            # AI token usage + timing
│   │   ├── agent.log             # Agent activity log
│   │   ├── test-impact-report.md # Test predictions + verification
│   │   ├── 1-requirements.md
│   │   ├── 2-architecture.md
│   │   ├── 3-implementation.md
│   │   ├── 4-qa-report.md
│   │   ├── 5-integration-gate.md # NEW: Integration Gate report
│   │   └── evidence/             # NEW: Machine-checkable evidence
│   │       └── integration-gate/
│   ├── _reports/
│   │   └── overlap-report.md     # NEW: Overlap detection report
│   └── _archive/
│
├── data/
│   └── ai-usage.jsonl            # Centralized usage log
│
├── tmux_claude.sh                # Launcher script
└── ...

# Worktrees (outside main project)
../project-f001/                  # feature/F001 branch
../project-f002/                  # feature/F002 branch
../project-b001/                  # fix/B001 branch
```

---

## Merge Sessions

At the end of a work session with multiple parallel workflows, use the merge session script to safely merge all PRs.

### PR Labeling

Each workflow PR should be labeled for merge tracking:

| Label | Purpose |
|-------|---------|
| `workflow-ready` | Marks PR as ready for automated merge |
| `session:YYYY-MM-DD` | Groups PRs by work session date |

PRs are automatically labeled when created by the workflow system (or add labels manually with `gh pr edit`).

### Running a Merge Session

```bash
# Preview what would be merged
./scripts/workflow/merge_all_prs.py --dry-run

# Merge all workflow-ready PRs
./scripts/workflow/merge_all_prs.py

# Merge PRs from specific session
./scripts/workflow/merge_all_prs.py --session session:2026-01-20

# Limit to 3 PRs
./scripts/workflow/merge_all_prs.py --limit 3
```

### What the Merge Script Does

For each PR in order (oldest first):

1. **Checks prerequisites**: Not draft, not already merged
2. **Updates branch**: If behind main, auto-updates
3. **Verifies approvals**: Stops if reviews required but missing
4. **Waits for checks**: Polls until status checks complete (or timeout)
5. **Merges**: Squash merge with branch deletion
6. **Verifies main**: Confirms CI on main is healthy
7. **Continues**: Moves to next PR only if main is green

### What the Merge Script Will NOT Do

| Action | Script Behavior |
|--------|-----------------|
| Bypass required approvals | **STOPS** and reports |
| Merge with failing checks | **STOPS** and reports |
| Force merge with conflicts | **STOPS** and reports |
| Use admin override | Never used |
| Continue after failure | **STOPS** by default |

### Merge Session Reports

After each run, a report is generated:

```
workflow/_reports/merge-session-<timestamp>.md
```

Reports include: PRs discovered, merged, skipped, and reasons.

### GitHub Branch Protection

For merge automation to work correctly, configure GitHub branch protection:

- Require PRs for all changes to main
- Require status checks (`lint`, `build`, `test`)
- Require at least 1 approval
- Require linear history (squash merge only)

See [GitHub Merge Guards](github-merge-guards.md) for the full setup checklist.

---

## Summary

The multi-agent workflow system provides:

1. **TDD Throughout**: Test-Driven Development from requirements analysis through QA verification
2. **Test Impact Tracking**: Predict test changes in requirements, verify accuracy in QA
3. **Structured Development**: Five specialized agents handle requirements, architecture, implementation, QA, and integration
4. **Integration Gate**: Verify merge with main passes all tests before PR creation
5. **Machine-Checkable Evidence**: All checkpoints have captured evidence for audit trails
6. **Parallel Execution**: Git worktrees and tmux enable simultaneous workflows
7. **Overlap Detection**: Detect when multiple workflows modify the same files
8. **Real-Time Monitoring**: Dashboard shows all workflows, captures pane output, alerts on input needed
9. **Safety Guardrails**: Hooks prevent dangerous operations + PR safety checks
10. **Full Traceability**: Every decision documented from request to verification
11. **Usage Insights**: Track AI token usage and timing to optimize costs
12. **Integration**: Works with Beans for issue tracking, GitHub for PRs
13. **Merge Sessions**: Safely merge all workflow PRs at end of session

### Workflow Flow

```
Requirements → Architecture → Implementation → QA → Integration Gate → PR
```

Each stage:
- Has defined checkpoints with evidence capture
- Must pass all checkpoints before proceeding
- Auto-chains to the next stage

Start with:
```bash
./tmux_claude.sh
/start-workflow <bean-id>
./scripts/workflow-monitor.sh  # In main pane for dashboard
```

And let the agents work!
