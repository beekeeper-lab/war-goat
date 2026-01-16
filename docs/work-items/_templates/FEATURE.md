# Feature: [Feature Name]

> **Type**: Feature
> **Status**: Draft | Ready | In Progress | Complete
> **Priority**: Low | Medium | High | Critical
> **Effort**: S | M | L | XL
> **Created**: YYYY-MM-DD
> **Updated**: YYYY-MM-DD

## Overview

Brief description of what this feature does and why it's valuable.

**MCP Server Required**: None | [Server name] (configured/needs setup)

---

## User Stories

### US-1: [Story Title]

> As a [user type], I want [goal] so that [benefit].

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### US-2: [Story Title]

> As a [user type], I want [goal] so that [benefit].

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

---

## Technical Design

### Data Model Changes

```typescript
// New or modified types
interface NewType {
  field: string;
}
```

### API Endpoints

```
METHOD /api/endpoint
  - Description
  - Body: { field: type }
  - Response: { field: type }
```

### Service Layer

- New service file(s) needed
- Changes to existing services
- MCP integration approach

### Frontend Components

1. **ComponentName** - Description
2. **ComponentName** - Description

---

## Questions to Resolve

1. Question that needs answering before/during implementation
2. Another question

---

## Dependencies

- Package or tool needed
- Configuration required
- External API access

---

## Testing Scenarios

1. Scenario → Expected result
2. Scenario → Expected result
3. Edge case → Expected handling

---

## Future Enhancements

- Ideas for v2
- Nice-to-haves deferred

---

## Implementation Notes

_Added during/after implementation:_

- Decision made and why
- Deviation from original design
- Lessons learned
