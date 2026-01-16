# ADR-002: Full Agents over Sub-Agents

## Status

Accepted

## Date

2026-01-16

## Context

When implementing a multi-agent workflow for software development, we need to decide how agents communicate and operate. There are two primary approaches:

1. **Full Agents**: Each agent is a completely separate Claude Code session running in its own terminal
2. **Sub-Agents**: A parent Claude session spawns child agents using the `Task` tool

Our workflow has four stages:
- Requirements Agent
- Architecture Agent
- Implementor Agent
- QA Agent

We need to determine whether these should be independent sessions or orchestrated by a parent.

## Decision

Use **Full Agents** (separate Claude Code sessions) for each stage of the workflow.

Each agent:
- Runs in its own terminal window
- Operates in its own git worktree
- Has no shared context with other agents
- Communicates via handoff documents (markdown files)

```
Terminal 1              Terminal 2              Terminal 3
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ Claude Code  │       │ Claude Code  │       │ Claude Code  │
│ Session      │       │ Session      │       │ Session      │
│ (F001)       │       │ (F002)       │       │ (B001)       │
└──────────────┘       └──────────────┘       └──────────────┘
      │                      │                      │
      ▼                      ▼                      ▼
 ../war-goat-f001      ../war-goat-f002      ../war-goat-b001
```

## Consequences

### Positive

- **True parallelism**: Run multiple workflows simultaneously in different terminals
- **Complete isolation**: Each agent has full context window available
- **Observable**: Watch each agent's progress independently
- **Interruptible**: Stop/redirect one agent without affecting others
- **Simple mental model**: One terminal = one task
- **No context overflow**: Complex tasks don't exhaust parent's context
- **Natural handoff**: Documents force clear communication between stages

### Negative

- **Manual orchestration**: Human must start each stage (no automatic chaining)
- **No shared memory**: Agents can't directly reference previous conversation
- **More terminals**: Need multiple terminal windows/tmux panes
- **Handoff overhead**: Must write/read documents between stages

### Neutral

- Agents read each other's outputs via files (workflow/{ID}/*.md)
- Each session starts fresh (no accumulated context)
- User controls the pace of progression through stages

## Alternatives Considered

### Alternative 1: Sub-Agents via Task Tool

Use Claude Code's `Task` tool to spawn child agents from a parent session.

```
Parent Session
├── Task: Requirements Agent (background)
├── Task: Architecture Agent (background)
└── Task: Implementor Agent (background)
```

**Why not chosen**:
- Parent context grows with each sub-agent result
- Risk of context window exhaustion on complex tasks
- Less visibility into individual agent progress
- Harder to interrupt specific sub-agents
- Sub-agents share parent's context (less isolation)

### Alternative 2: Hybrid (Parent + Sub-Agents)

Parent orchestrates, spawns sub-agents for heavy lifting.

**Why not chosen**:
- Added complexity without clear benefit
- Still has context growth problem
- Unclear responsibility boundaries
- More difficult to debug

### Alternative 3: API-Based Orchestration

External script calls Claude API directly to chain agents.

**Why not chosen**:
- Requires API access and key management
- More complex infrastructure
- Loses Claude Code's tool access
- Higher implementation effort
- Can be added later if needed

## References

- [ADR-001: Git Worktrees](./ADR-001-git-worktrees.md) - Enables isolated workspaces for full agents
- [Multi-Agent Workflow Documentation](../MULTI-AGENT-WORKFLOW.md)
- Claude Code Task tool documentation
