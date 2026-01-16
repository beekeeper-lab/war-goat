# ADR-004: Markdown Handoffs with YAML Frontmatter and Agent-Owned Retries

## Status

Accepted

## Date

2026-01-16

## Context

In our multi-agent workflow, agents must hand off work between stages:
- Requirements → Architecture → Implementation → QA

We need to decide:
1. **Format**: How should handoff documents be structured?
2. **Validation**: How do we know a stage is complete?
3. **Retries**: Who handles failures and how?

## Decision

### 1. Format: Markdown with YAML Frontmatter

Handoff documents use markdown for content with YAML frontmatter for structured metadata:

```markdown
---
id: F001
stage: requirements
status: complete
started_at: 2026-01-16T10:00:00Z
completed_at: 2026-01-16T10:45:00Z
checkpoints:
  - name: requirements_identified
    status: pass
  - name: impact_analyzed
    status: pass
  - name: acceptance_criteria_defined
    status: pass
handoff_ready: true
retry_count: 0
---

# Requirements: Obsidian Integration

## Executive Summary
...markdown content...
```

### 2. Validation: Stage-Specific Checkpoints

Each stage has checkpoints that must pass before handoff:

| Stage | Checkpoints |
|-------|-------------|
| Requirements | `requirements_identified`, `impact_analyzed`, `acceptance_criteria_defined`, `no_open_blockers` |
| Architecture | `requirements_addressed`, `design_complete`, `tasks_defined`, `tests_planned` |
| Implementation | `tests_written`, `code_complete`, `tests_passing`, `no_lint_errors` |
| QA | `criteria_verified`, `tests_passing`, `no_critical_bugs`, `docs_updated` |

### 3. Retries: Current Agent Owns Retry Loop

The agent executing a stage handles its own retries:

```
┌─────────────────────────────────────────────────┐
│              AGENT EXECUTION LOOP               │
│                                                 │
│   Work → Validate → Pass? → Handoff            │
│              ↓                                  │
│             Fail                                │
│              ↓                                  │
│     Get Feedback (what failed, why)            │
│              ↓                                  │
│     Retry (up to 3 attempts)                   │
│              ↓                                  │
│     Still failing? → Escalate to human         │
└─────────────────────────────────────────────────┘
```

**Retry feedback structure:**
```markdown
## Validation Failed

### Checkpoint: acceptance_criteria_defined
**Status**: FAIL
**Reason**: Acceptance criteria are not testable
**Details**:
- AC-1: "System works well" - not measurable

### What to Fix
1. Rewrite AC-1 with specific, measurable outcome

### Retry Attempt: 2 of 3
```

### 4. Escalation: When to Involve Human

Agent escalates (does not retry) when:
- 3 retry attempts exhausted
- Blocking question requires human decision
- Scope change detected
- External dependency unavailable

```yaml
---
status: blocked
block_reason: needs_human_input
block_details: "Cannot determine auth method preference"
retry_count: 3
---
```

## Consequences

### Positive

- **Human readable**: Markdown is natural for both humans and agents
- **Machine parseable**: YAML frontmatter enables automation
- **Clear gates**: Checkpoints define "done" unambiguously
- **Context preserved**: Retrying agent has full context of what failed
- **Bounded retries**: 3 attempts prevents infinite loops
- **Graceful degradation**: Escalation path when agent is stuck

### Negative

- **Frontmatter overhead**: Agents must maintain structured metadata
- **Checkpoint design**: Must carefully define checkpoints per stage
- **Retry complexity**: Agents need retry logic in their prompts

### Neutral

- Validation is self-assessed (agent validates own output)
- Frontmatter can be parsed with standard YAML libraries
- Retry count visible in document history

## Alternatives Considered

### Alternative 1: Pure JSON Handoffs

Use JSON instead of markdown for handoffs.

**Why not chosen:**
- Less readable for humans
- Agents write markdown more naturally
- Loses rich formatting (code blocks, tables)

### Alternative 2: Pure Markdown (No Frontmatter)

Use markdown without structured metadata.

**Why not chosen:**
- Hard to programmatically check status
- No clear checkpoint tracking
- Validation state not machine-readable

### Alternative 3: Next Agent Handles Retries

Pass failures to next stage, let them send back.

**Why not chosen:**
- Loses context (current agent knows what it tried)
- More complex coordination
- Unclear ownership of the problem

### Alternative 4: Unlimited Retries

Let agent retry indefinitely.

**Why not chosen:**
- Could loop forever on impossible tasks
- Wastes resources
- Human should intervene if 3 attempts fail

## Implementation

### Frontmatter Schema

```yaml
---
# Identity
id: string           # Work item ID (F001, B001, etc.)
stage: string        # requirements | architecture | implementation | qa
title: string        # Human-readable title

# Timing
started_at: string   # ISO 8601 timestamp
completed_at: string # ISO 8601 timestamp (null if incomplete)

# Status
status: string       # in_progress | complete | failed | blocked
handoff_ready: bool  # True if all checkpoints pass

# Validation
checkpoints:
  - name: string     # Checkpoint identifier
    status: string   # pass | fail | skip
    message: string  # Optional details

# Retry tracking
retry_count: int     # Number of retry attempts (0-3)
last_failure: string # Description of most recent failure

# Blocking (if status: blocked)
block_reason: string # needs_human_input | external_dependency | scope_change
block_details: string
---
```

### Validation Function (Pseudo-code)

```javascript
function validateStage(document, stage) {
  const required = CHECKPOINTS[stage];
  const results = [];

  for (const checkpoint of required) {
    const result = runCheckpoint(checkpoint, document);
    results.push({ name: checkpoint, ...result });
  }

  const allPass = results.every(r => r.status === 'pass');

  return {
    handoff_ready: allPass,
    checkpoints: results,
    retry_needed: !allPass && document.retry_count < 3,
    escalate: !allPass && document.retry_count >= 3
  };
}
```

## References

- [ADR-001: Git Worktrees](./ADR-001-git-worktrees.md)
- [ADR-002: Full Agents](./ADR-002-full-agents.md)
- [ADR-003: Beans Integration](./ADR-003-beans-integration.md)
- [Multi-Agent Workflow Documentation](../MULTI-AGENT-WORKFLOW.md)
