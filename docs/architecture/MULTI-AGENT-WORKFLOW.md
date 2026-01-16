# Multi-Agent Workflow

This document describes the multi-agent workflow system for War Goat. The system uses specialized Claude Code agents working in sequence, each with a distinct role, validation checkpoints, and handoff documents.

## Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  REQUIREMENTS   │ ──▶ │  ARCHITECTURE   │ ──▶ │ IMPLEMENTATION  │ ──▶ │       QA        │
│    Agent        │     │    Agent        │     │    Agent        │     │    Agent        │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │                       │
        ▼                       ▼                       ▼                       ▼
  1-requirements.md       2-architecture.md      3-implementation.md      4-qa-report.md
```

Each agent:
- Has a specific role and skill (`/workflow-*`)
- Outputs a handoff document with YAML frontmatter
- Must pass validation checkpoints before handoff
- Owns its own retry loop (up to 3 attempts)
- Runs in an isolated git worktree

## Quick Start

### 1. Create a Workflow

```bash
# Create a new workflow for work item F001
./scripts/workflow.sh create F001 feature "Obsidian Integration"
```

### 2. Set Up Worktree

```bash
# Create isolated git worktree for this workflow
./scripts/workflow.sh worktree F001

# Navigate to worktree
cd ../war-goat-f001
```

### 3. Run Each Stage

In the worktree, start a Claude Code session and run each stage:

```bash
claude
# Then: /workflow-requirements F001
# Then: /workflow-architecture F001
# Then: /workflow-implement F001
# Then: /workflow-qa F001
```

### 4. Check Status

```bash
./scripts/workflow.sh status F001
./scripts/workflow.sh list
```

### 5. Clean Up

```bash
./scripts/workflow.sh clean F001
```

## Architecture Decisions

The workflow design is documented in these ADRs:

| ADR | Decision |
|-----|----------|
| [ADR-001](decisions/ADR-001-git-worktrees.md) | Use git worktrees for agent isolation |
| [ADR-002](decisions/ADR-002-full-agents.md) | Use full Claude Code sessions (not sub-agents) |
| [ADR-003](decisions/ADR-003-beans-integration.md) | Beans for issue tracking, custom workflow for orchestration |
| [ADR-004](decisions/ADR-004-handoff-format.md) | Markdown with YAML frontmatter, agent-owned retries |

## Stages

### Stage 1: Requirements Agent

**Skill**: `/workflow-requirements`

**Purpose**: Analyze the request, research the codebase, identify requirements and system impact.

**Checkpoints**:
| Checkpoint | Criteria |
|------------|----------|
| `requirements_identified` | At least 3 functional requirements defined |
| `impact_analyzed` | Components affected with impact levels |
| `acceptance_criteria_defined` | Specific, measurable, testable criteria |
| `no_open_blockers` | No unanswered blocking questions |

**Output**: `workflow/{ID}/1-requirements.md`

### Stage 2: Architecture Agent

**Skill**: `/workflow-architecture`

**Purpose**: Design the technical solution, define implementation tasks, plan tests.

**Checkpoints**:
| Checkpoint | Criteria |
|------------|----------|
| `requirements_addressed` | All requirements have design coverage |
| `design_complete` | Architecture decisions documented |
| `tasks_defined` | Implementation tasks are specific and ordered |
| `tests_planned` | Test strategy defined for each requirement |

**Output**: `workflow/{ID}/2-architecture.md`

### Stage 3: Implementation Agent

**Skill**: `/workflow-implement`

**Purpose**: Write tests first (TDD), then implement the solution.

**Checkpoints**:
| Checkpoint | Criteria |
|------------|----------|
| `tests_written` | Tests exist for all acceptance criteria |
| `code_complete` | All tasks from architecture are implemented |
| `tests_passing` | All tests pass |
| `no_lint_errors` | Code passes linting/formatting checks |

**Output**: `workflow/{ID}/3-implementation.md`

### Stage 4: QA Agent

**Skill**: `/workflow-qa`

**Purpose**: Verify acceptance criteria, run comprehensive tests, file bugs.

**Checkpoints**:
| Checkpoint | Criteria |
|------------|----------|
| `criteria_verified` | All acceptance criteria tested and passing |
| `tests_passing` | All test suites pass |
| `no_critical_bugs` | No critical bugs remain unfixed |
| `docs_updated` | Documentation reflects changes |

**Output**: `workflow/{ID}/4-qa-report.md`

## Handoff Documents

Each stage produces a markdown document with YAML frontmatter:

```yaml
---
id: F001
stage: requirements
title: "Obsidian Integration"
started_at: 2026-01-16T10:00:00Z
completed_at: 2026-01-16T10:45:00Z
status: complete
handoff_ready: true
checkpoints:
  - name: requirements_identified
    status: pass
    message: ""
  - name: impact_analyzed
    status: pass
    message: ""
retry_count: 0
last_failure: null
---

# Requirements: Obsidian Integration

...markdown content...
```

### Statuses

- `in_progress` - Agent is working
- `complete` - Checkpoints passed, ready for handoff
- `failed` - Validation failed, retrying
- `blocked` - Needs human intervention

## Validation & Retries

Each agent owns its validation:

```
Work → Validate → Pass? → Handoff
                    ↓
                   Fail
                    ↓
            Retry < 3? ─── Yes → Fix & Retry
                    ↓
                   No
                    ↓
             Escalate to Human
```

When blocked, the document contains:

```yaml
---
status: blocked
block_reason: needs_human_input
block_details: "Cannot determine OAuth vs API key preference"
retry_count: 3
---
```

## Directory Structure

```
workflow/
├── .templates/
│   └── status.json          # Template for workflow state
├── F001/
│   ├── status.json          # Current workflow state
│   ├── 1-requirements.md    # Stage 1 output
│   ├── 2-architecture.md    # Stage 2 output
│   ├── 3-implementation.md  # Stage 3 output
│   └── 4-qa-report.md       # Stage 4 output
└── _archive/                # Completed workflows
```

## Git Worktrees

Each workflow runs in an isolated git worktree to prevent conflicts:

```
project/
├── war-goat/                # Main worktree (main branch)
├── war-goat-f001/           # F001 worktree (feature/F001 branch)
├── war-goat-b001/           # B001 worktree (bug/B001 branch)
└── ...
```

Benefits:
- Parallel work without branch switching
- Clean isolation between features
- Each agent has its own workspace
- Easy cleanup when done

## CLI Reference

```bash
# Create new workflow
./scripts/workflow.sh create <ID> <type> <title>
# Example: ./scripts/workflow.sh create F001 feature "Obsidian Integration"

# List active workflows
./scripts/workflow.sh list

# Show workflow status
./scripts/workflow.sh status <ID>

# Show next stage to run
./scripts/workflow.sh next <ID>

# Create/show git worktree
./scripts/workflow.sh worktree <ID>

# Archive completed workflow
./scripts/workflow.sh clean <ID>
```

## Beans Integration (Optional)

For issue tracking, you can use [Beans](https://github.com/hmans/beans):

```bash
# Install
npm install -g @hmans/beans
beans init

# Create issue, then workflow
beans new --type feature --title "Obsidian Integration"
./scripts/workflow.sh create F001 feature "Obsidian Integration"

# QA files bugs
beans new --type bug --title "Export fails on large files"

# Archive when complete
beans archive F001
./scripts/workflow.sh clean F001
```

See [ADR-003](decisions/ADR-003-beans-integration.md) for integration details.

## Example Workflow

```bash
# 1. Create workflow
./scripts/workflow.sh create F001 feature "Add user preferences"

# 2. Set up worktree
./scripts/workflow.sh worktree F001
cd ../war-goat-f001

# 3. Start Claude Code
claude

# 4. Run Stage 1 (Requirements)
# /workflow-requirements F001
# Agent outputs: workflow/F001/1-requirements.md

# 5. Run Stage 2 (Architecture)
# /workflow-architecture F001
# Agent outputs: workflow/F001/2-architecture.md

# 6. Run Stage 3 (Implementation)
# /workflow-implement F001
# Agent outputs: workflow/F001/3-implementation.md

# 7. Run Stage 4 (QA)
# /workflow-qa F001
# Agent outputs: workflow/F001/4-qa-report.md

# 8. Merge and clean up
cd ../war-goat
git merge feature/F001
./scripts/workflow.sh clean F001
```

## Related Documentation

- [Work Items](../work-items/README.md) - Feature, bug, and chore definitions
- [ADR Index](decisions/README.md) - All architecture decisions
- [Planning Skills](../../.claude/commands/) - `/feature`, `/bug`, `/chore` skills
