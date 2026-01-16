# Multi-Agent Workflow System

This document describes how to run parallel, multi-stage agent workflows for developing features, fixing bugs, and completing chores.

## Overview

Instead of using a single agent for an entire task, we split work across specialized agents:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  REQUIREMENTS   │ ──▶ │  ARCHITECTURE   │ ──▶ │ IMPLEMENTATION  │ ──▶ │       QA        │
│     Agent       │     │     Agent       │     │     Agent       │     │     Agent       │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
       │                       │                       │                       │
       ▼                       ▼                       ▼                       ▼
  1-requirements.md      2-architecture.md     3-implementation.md      4-qa-report.md
```

### Why This Approach?

| Benefit | Description |
|---------|-------------|
| **Parallel Work** | Run multiple workflows simultaneously |
| **Specialization** | Each agent focuses on one aspect |
| **Quality Gates** | Each stage is reviewed before proceeding |
| **Traceability** | Clear documentation at each stage |
| **Isolation** | Git worktrees prevent conflicts |

## Quick Start

### 1. Create a Workflow

```bash
# Create a new workflow for a feature
./scripts/workflow.sh create F001 feature "Obsidian Integration"

# Create a workflow for a bug
./scripts/workflow.sh create B001 bug "Transcript fetch timeout"

# Create a workflow for a chore
./scripts/workflow.sh create C001 chore "Upgrade React to v19"
```

### 2. Set Up Isolated Worktree

```bash
# Create a git worktree for the workflow
./scripts/workflow.sh worktree F001

# This creates: ../war-goat-f001/ with branch feature/F001
```

### 3. Run Each Stage

Open a terminal in the worktree and start Claude:

```bash
cd ../war-goat-f001
claude

# In Claude, run each stage:
/workflow-requirements F001
# Wait for completion...

/workflow-architecture F001
# Wait for completion...

/workflow-implement F001
# Wait for completion...

/workflow-qa F001
# Wait for completion...
```

### 4. Review and Merge

After QA approval:
```bash
# In the worktree
git push -u origin feature/F001

# Create PR
gh pr create

# After merge, clean up
./scripts/workflow.sh clean F001
```

## Running Multiple Workflows in Parallel

The real power is running multiple workflows simultaneously:

### Terminal Layout (tmux example)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Terminal 1: F001 Obsidian    │ Terminal 2: F002 Brave Search       │
│ ─────────────────────────────│───────────────────────────────────── │
│ cd ../war-goat-f001          │ cd ../war-goat-f002                  │
│ claude                       │ claude                               │
│ > /workflow-requirements F001│ > /workflow-requirements F002        │
│                              │                                      │
├─────────────────────────────────────────────────────────────────────┤
│ Terminal 3: B001 Bug Fix     │ Terminal 4: Main (orchestration)     │
│ ─────────────────────────────│───────────────────────────────────── │
│ cd ../war-goat-b001          │ ./scripts/workflow.sh list           │
│ claude                       │ ./scripts/workflow.sh status F001    │
│ > /workflow-requirements B001│                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Setup Script for Parallel Work

```bash
#!/bin/bash
# setup-parallel.sh - Set up multiple parallel workflows

# Create workflows
./scripts/workflow.sh create F001 feature "Obsidian Integration"
./scripts/workflow.sh create F002 feature "Brave Search"
./scripts/workflow.sh create B001 bug "Transcript timeout"

# Create worktrees
./scripts/workflow.sh worktree F001
./scripts/workflow.sh worktree F002
./scripts/workflow.sh worktree B001

# Start tmux session with 4 panes
tmux new-session -d -s workflows
tmux split-window -h
tmux split-window -v
tmux select-pane -t 0
tmux split-window -v

# Send commands to each pane
tmux send-keys -t 0 'cd ../war-goat-f001 && claude' C-m
tmux send-keys -t 1 'cd ../war-goat-f002 && claude' C-m
tmux send-keys -t 2 'cd ../war-goat-b001 && claude' C-m
tmux send-keys -t 3 './scripts/workflow.sh list' C-m

tmux attach-session -t workflows
```

## Workflow Stages in Detail

### Stage 1: Requirements Agent

**Skill**: `/workflow-requirements`

**Purpose**: Analyze the request, understand impact, document requirements

**Input**: Work item ID and description

**Output**: `workflow/{ID}/1-requirements.md`

**Key Deliverables**:
- Functional requirements (FR-1, FR-2, ...)
- Non-functional requirements
- System impact analysis
- Acceptance criteria
- Open questions for Architecture

### Stage 2: Architecture Agent

**Skill**: `/workflow-architecture`

**Purpose**: Design the solution, make technical decisions, create implementation plan

**Input**: Requirements document from Stage 1

**Output**: `workflow/{ID}/2-architecture.md`

**Key Deliverables**:
- Architecture Decision Records (ADRs)
- Technical design (data models, APIs, components)
- File change list
- Step-by-step tasks for Implementor
- Test strategy (TDD)

### Stage 3: Implementor Agent

**Skill**: `/workflow-implement`

**Purpose**: Implement the solution following TDD principles

**Input**: Architecture spec from Stage 2

**Output**: `workflow/{ID}/3-implementation.md` + actual code changes

**Key Deliverables**:
- Working code
- Tests (unit, component, E2E)
- Implementation report
- Git commits

### Stage 4: QA Agent

**Skill**: `/workflow-qa`

**Purpose**: Verify implementation, fill test gaps, update docs

**Input**: All previous stage documents + implementation

**Output**: `workflow/{ID}/4-qa-report.md`

**Key Deliverables**:
- Verification of acceptance criteria
- Test results
- Bug reports (if issues found)
- Additional tests (for gaps)
- Documentation updates
- Final approval or rejection

## Workflow Management Commands

```bash
# Create new workflow
./scripts/workflow.sh create <ID> <type> "<title>"

# List all active workflows
./scripts/workflow.sh list

# Show status of a workflow
./scripts/workflow.sh status <ID>

# Show next stage to run
./scripts/workflow.sh next <ID>

# Create/show worktree
./scripts/workflow.sh worktree <ID>

# Clean up completed workflow
./scripts/workflow.sh clean <ID>
```

## Directory Structure

```
project/
├── workflow/                    # Workflow tracking
│   ├── .templates/             # Status template
│   ├── F001/                   # Feature workflow
│   │   ├── status.json         # Workflow state
│   │   ├── 1-requirements.md   # Stage 1 output
│   │   ├── 2-architecture.md   # Stage 2 output
│   │   ├── 3-implementation.md # Stage 3 output
│   │   └── 4-qa-report.md      # Stage 4 output
│   └── _archive/               # Completed workflows
├── scripts/
│   └── workflow.sh             # Workflow management
└── .claude/commands/
    ├── workflow-requirements.md
    ├── workflow-architecture.md
    ├── workflow-implement.md
    └── workflow-qa.md

# Worktrees (outside main project)
../war-goat-f001/               # Isolated checkout for F001
../war-goat-f002/               # Isolated checkout for F002
../war-goat-b001/               # Isolated checkout for B001
```

## Git Worktree Basics

### Why Worktrees?

Git worktrees let you have multiple checkouts of the same repository:

```
main repo (.git)
├── main branch (original checkout)
├── ../war-goat-f001 (worktree → feature/F001 branch)
├── ../war-goat-f002 (worktree → feature/F002 branch)
└── ../war-goat-b001 (worktree → fix/B001 branch)
```

### Benefits
- Each agent works on its own branch
- No merge conflicts during parallel work
- Lightweight (shares .git directory)
- Easy to merge when ready

### Common Commands

```bash
# List worktrees
git worktree list

# Add worktree
git worktree add ../path -b branch-name

# Remove worktree
git worktree remove ../path

# Prune stale worktrees
git worktree prune
```

## Handling Stage Failures

### If Requirements Needs Clarification

```
User notices open questions in 1-requirements.md
↓
User provides answers
↓
Re-run /workflow-requirements with additional context
```

### If Architecture Needs Revision

```
Implementor finds issue with spec
↓
Create note in 3-implementation.md deviations section
↓
OR: Return to Architecture stage for revision
```

### If QA Rejects

```
QA finds issues
↓
Bugs filed in docs/work-items/B00X-*.md
↓
Implementation stage re-run to fix
↓
QA re-run to verify
```

## Best Practices

### 1. Keep Workflows Small

Split large features into smaller, independent work items.

### 2. Don't Skip Stages

Each stage builds on the previous. Skipping leads to rework.

### 3. Review Stage Outputs

Before moving to next stage, review the output document.

### 4. Use Worktrees for Parallel Work

Always use isolated worktrees when running parallel workflows.

### 5. Commit Frequently

Implementor should commit after each task, not at the end.

### 6. Document Deviations

If implementation differs from spec, document why.

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

# Run the incomplete stage first
./scripts/workflow.sh next F001
```

### "Worktree already exists"

```bash
# List worktrees
git worktree list

# Remove and recreate
git worktree remove ../war-goat-f001
./scripts/workflow.sh worktree F001
```

### "Merge conflicts"

```bash
# In the worktree
git fetch origin
git rebase origin/main

# Resolve conflicts, then continue
```

## Future Enhancements

- [ ] Slack/Discord notifications when stage completes
- [ ] Web dashboard for workflow status
- [ ] Automated stage transitions
- [ ] Claude API orchestrator for fully automated workflows
- [ ] Integration with GitHub Actions
