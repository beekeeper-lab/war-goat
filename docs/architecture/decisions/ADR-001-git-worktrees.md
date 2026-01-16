# ADR-001: Git Worktrees for Parallel Agent Workflows

## Status

Accepted

## Date

2026-01-16

## Context

We want to run multiple AI coding agents in parallel, each working on different features, bugs, or chores simultaneously. This requires:

1. **Code isolation** - Each agent needs its own working directory to avoid conflicts
2. **Branch management** - Each task should be on its own branch for clean merges
3. **Lightweight setup** - Spinning up a new workspace should be fast
4. **Shared history** - All workspaces should share the same git history

The traditional approach of running one agent at a time is too slow for complex projects with multiple work streams.

## Decision

Use **Git Worktrees** to create isolated workspaces for each parallel agent workflow.

Each workflow gets:
- Its own directory (e.g., `../war-goat-f001/`)
- Its own branch (e.g., `feature/F001-obsidian`)
- Full access to the codebase
- Shared `.git` directory with main repo

```bash
# Create worktree for a workflow
git worktree add ../war-goat-f001 -b feature/F001-obsidian

# Each agent runs in its own worktree
cd ../war-goat-f001
claude  # Start agent session
```

## Consequences

### Positive

- **True parallelism**: Multiple agents can work simultaneously without blocking
- **No merge conflicts during work**: Each agent has isolated files
- **Lightweight**: Worktrees share `.git` (no full clone needed)
- **Fast setup**: Creating a worktree takes seconds
- **Clean git history**: Each workflow is on its own branch
- **Easy cleanup**: `git worktree remove` cleans up completely

### Negative

- **Disk space**: Each worktree is a full checkout (mitigated by shared .git)
- **Requires git knowledge**: Team needs to understand worktrees
- **Path management**: Must track which worktree is for which workflow
- **Node modules**: Each worktree needs its own `node_modules` (or use symlinks)

### Neutral

- Worktrees are a standard git feature (not a new tool to learn)
- Works with existing git workflows (PRs, merges, rebases)

## Alternatives Considered

### Alternative 1: Dev Containers

Run each agent in a separate Docker dev container.

**Why not chosen**:
- Heavy overhead (full container per workflow)
- Slower to spin up (container build time)
- More complex configuration
- Overkill for code isolation when we just need branch separation

### Alternative 2: Multiple Clones

Create separate full clones of the repository for each workflow.

**Why not chosen**:
- Wastes disk space (full .git per clone)
- Slower to set up (full clone each time)
- History diverges (no shared refs)
- Harder to manage

### Alternative 3: Single Checkout with Branch Switching

Use one checkout and have agents switch branches.

**Why not chosen**:
- No parallelism (only one agent at a time)
- Risk of uncommitted changes being lost
- Agents would need to coordinate branch switching

## References

- [Git Worktrees Documentation](https://git-scm.com/docs/git-worktree)
- [Multi-Agent Workflow Documentation](../MULTI-AGENT-WORKFLOW.md)
- `scripts/workflow.sh` - Workflow management script with worktree support
