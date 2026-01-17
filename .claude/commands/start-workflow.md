# Start Workflow

Initialize a new multi-agent workflow from a Beans issue. This will:
1. Create a git worktree (isolated branch)
2. Launch an agent in a new tmux pane
3. The agent auto-chains through all 4 stages
4. Creates a PR when done

## Usage
```
/start-workflow <bean-id-or-title>
```

## Examples
```
/start-workflow zgnb
/start-workflow F003
/start-workflow "GitHub Repository Enrichment"
```

## Prerequisites

**You should be running in tmux!** If not, start it:
```bash
tmux new -s workflow
```

## Instructions

### Step 1: Find the Bean

Run `beans list` and find the bean matching: **$ARGUMENTS**

Use `beans show <id>` to get the full details.

### Step 2: Extract Info

From the bean, extract:
- **Work Item ID**: From title (e.g., `F003` from "F003: GitHub...")
- **Type**: `feature`, `bug`, or `task`
- **Title**: The descriptive title (without the ID prefix)

### Step 3: Update Bean Status

Mark the bean as in-progress:
```bash
beans update <bean-id> -s in-progress
```

### Step 4: Launch the Workflow

Run the start-workflow script:
```bash
./scripts/start-workflow.sh <WORK_ITEM_ID> <type> "<title>"
```

For example:
```bash
./scripts/start-workflow.sh F003 feature "GitHub Repository Enrichment"
```

This will:
1. Create `workflow/F003/` with status tracking
2. Create git worktree at `../project-name-f003/`
3. Create branch `feature/F003`
4. Launch agent in new tmux pane
5. Agent runs: requirements → architecture → implement → qa
6. Each stage auto-commits, pushes, and chains to next
7. Final stage creates a PR

### Step 5: Monitor

Tell the user how to monitor:
- **Switch panes**: `Ctrl+b` then arrow keys
- **Check status**: `beans list` or `./scripts/workflow.sh status <ID>`
- **Answer questions**: Switch to agent pane, respond, agent continues

## How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                          TMUX SESSION                                │
├─────────────────┬───────────────────────────────────────────────────┤
│  Main Pane      │  Agent Pane (F003)                                │
│  (You + Me)     │  ┌─────────────────────────────────────────────┐  │
│                 │  │ Requirements Agent running...               │  │
│  Can start more │  │ > Analyzing codebase                        │  │
│  workflows here │  │ > Writing 1-requirements.md                 │  │
│                 │  │                                             │  │
│  beans list     │  │ [Commits, pushes, launches Architecture]    │  │
│  shows status   │  │                                             │  │
│                 │  │ Architecture Agent running...               │  │
│                 │  │ ...                                         │  │
│                 │  └─────────────────────────────────────────────┘  │
└─────────────────┴───────────────────────────────────────────────────┘
```

## Bean ID
$ARGUMENTS
