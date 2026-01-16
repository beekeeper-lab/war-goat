# ADR-003: Beans for Issue Tracking with Custom Workflow Orchestration

## Status

Accepted

## Date

2026-01-16

## Context

We need to track work items (features, bugs, chores) and orchestrate multi-agent workflows. There are two concerns:

1. **Issue Tracking**: What needs to be done (backlog, bugs, features)
2. **Workflow Orchestration**: How work progresses through agent stages

We discovered [Beans](https://github.com/hmans/beans), an open-source flat-file issue tracker designed specifically for coding agents. We need to decide how to integrate it with our existing workflow system.

## Decision

Use a **hybrid approach**:

- **Beans**: Issue tracking and project memory (what needs to be done)
- **Custom Workflow System**: Agent orchestration and stage handoffs (how it gets done)

```
┌─────────────────────────────────────────────────────────────────┐
│                          BEANS                                   │
│         (Issue Tracking - What needs to be done)                │
│                                                                  │
│  .beans/                                                         │
│  ├── F001-obsidian-integration.md     ← Feature issue           │
│  ├── F002-brave-search.md             ← Feature issue           │
│  ├── B001-transcript-timeout.md       ← Bug issue               │
│  └── _archive/                        ← Project memory          │
│                                                                  │
│  CLI: beans list, beans new, beans prime                        │
│  Query: GraphQL for efficient agent access                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Pick issue to work on
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW SYSTEM                               │
│         (Orchestration - How it gets done)                      │
│                                                                  │
│  workflow/F001/                                                  │
│  ├── status.json              ← Workflow state                  │
│  ├── 1-requirements.md        ← Requirements Agent output       │
│  ├── 2-architecture.md        ← Architecture Agent output       │
│  ├── 3-implementation.md      ← Implementor Agent output        │
│  └── 4-qa-report.md           ← QA Agent output                 │
│                                                                  │
│  Skills: /workflow-requirements, /workflow-architecture, etc.   │
│  Script: scripts/workflow.sh                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ QA finds bugs
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACK TO BEANS                                │
│                                                                  │
│  QA Agent runs: beans new --type bug --title "Found issue"      │
│  New bug tracked in .beans/B002-found-issue.md                  │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Points

1. **Starting Work**: Pick an issue from Beans → Create workflow
2. **During QA**: QA Agent files bugs via `beans new`
3. **Completion**: Archive issue in Beans, archive workflow
4. **Project Memory**: Beans archive serves as historical context

### Agent Priming

Add to `CLAUDE.md` or agent instructions:
```
Before starting work, run `beans prime` to understand the project context.
```

## Consequences

### Positive

- **Right tool for each job**: Beans excels at tracking, our system excels at orchestration
- **Agent-friendly**: Beans designed for AI agents (GraphQL, CLI, flat files)
- **Project memory**: Beans archive provides historical context
- **Standard tracking**: Beans follows familiar issue tracker patterns
- **Flexible**: Can use Beans independently of workflow
- **Future-proof**: Can swap either system without affecting the other

### Negative

- **Two systems to learn**: Beans + workflow system
- **Sync overhead**: Must keep issue status in sync with workflow status
- **Beans is under development**: APIs may change
- **Additional dependency**: Need to install and configure Beans

### Neutral

- Both systems use flat markdown files (consistent approach)
- Both are git-friendly (version controlled)
- QA Agent bridges the two systems

## Alternatives Considered

### Alternative 1: Use Beans for Everything

Replace our workflow system entirely with Beans.

**Why not chosen**:
- Beans is designed for issue tracking, not workflow orchestration
- No built-in concept of stages/handoffs
- Would need to extend Beans significantly
- Our workflow stages have specific document formats

### Alternative 2: Use Our System for Everything

Extend `docs/work-items/` to be a full issue tracker.

**Why not chosen**:
- Reinventing the wheel
- Beans already has agent-friendly features (GraphQL, CLI)
- Beans has project memory/archive concept
- Our system would grow in complexity

### Alternative 3: Use External Issue Tracker (GitHub Issues, Linear)

Use a SaaS issue tracker instead of Beans.

**Why not chosen**:
- Requires API integration
- Not flat-file (harder for agents to access)
- Not designed for AI agents
- External dependency

## Implementation Notes

### Installing Beans

```bash
# Install Beans CLI
npm install -g @hmans/beans

# Initialize in project
cd /path/to/war-goat
beans init
```

### Workflow Integration

```bash
# 1. Create issue in Beans
beans new --type feature --title "Obsidian Integration"
# Creates .beans/F001-obsidian-integration.md

# 2. Start workflow for that issue
./scripts/workflow.sh create F001 feature "Obsidian Integration"

# 3. QA Agent files bugs
beans new --type bug --title "Export fails on large files"
# Creates .beans/B001-export-fails.md

# 4. When complete, archive both
beans archive F001
./scripts/workflow.sh clean F001
```

## References

- [Beans GitHub Repository](https://github.com/hmans/beans)
- [ADR-001: Git Worktrees](./ADR-001-git-worktrees.md)
- [ADR-002: Full Agents](./ADR-002-full-agents.md)
- [Multi-Agent Workflow Documentation](../MULTI-AGENT-WORKFLOW.md)
