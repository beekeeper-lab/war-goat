# Test: [Area/Feature to Test]

> **Type**: Test
> **Status**: Draft | Ready | In Progress | Complete
> **Priority**: Low | Medium | High | Critical
> **Test Type**: Unit | Integration | E2E | Performance
> **Created**: YYYY-MM-DD
> **Updated**: YYYY-MM-DD

## Overview

What area of the codebase needs test coverage and why.

**Current Coverage**: X% (if known)
**Target Coverage**: Y%

---

## Scope

### In Scope
- Component/module 1
- Component/module 2
- Specific functionality

### Out of Scope
- What we're NOT testing in this work item
- Deferred to future test work items

---

## Test Cases

### TC-1: [Test Case Name]

**Description**: What this test verifies

**Type**: Unit | Integration | E2E

**File**: `path/to/file.ts`

**Function/Component**: `functionName` or `<ComponentName />`

**Scenarios**:

| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Happy path | valid input | expected result |
| Edge case | boundary input | expected handling |
| Error case | invalid input | error thrown/handled |

**Setup Required**:
- Mock X
- Test fixture Y

---

### TC-2: [Test Case Name]

**Description**: What this test verifies

**Type**: Unit | Integration | E2E

**File**: `path/to/file.ts`

**Scenarios**:

| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Scenario 1 | input | output |
| Scenario 2 | input | output |

---

## Mocks & Fixtures

### Mocks Needed

```typescript
// Example mock
const mockMCPClient = {
  callTool: vi.fn().mockResolvedValue({ content: [{ text: 'result' }] })
};
```

### Test Fixtures

```typescript
// Example fixture
const sampleInterest: InterestItem = {
  id: 'test-1',
  url: 'https://example.com',
  // ...
};
```

### Fixture Files
- `test/fixtures/sample-transcript.txt`
- `test/fixtures/sample-response.json`

---

## Test Environment

### Setup
```bash
# Commands to set up test environment
npm install
```

### Dependencies
- vitest (already installed)
- @testing-library/react (if frontend)
- msw (for API mocking, if needed)

### Configuration
```typescript
// Any special vitest config needed
```

---

## Implementation Plan

### Phase 1: Unit Tests
- [ ] `services/mcp-client.js` - MCP client methods
- [ ] `services/youtube.js` - YouTube enrichment
- [ ] `services/categorize.ts` - Auto-categorization

### Phase 2: Integration Tests
- [ ] API endpoints (`/api/enrich`, `/api/interests`)
- [ ] Service + MCP interaction

### Phase 3: E2E Tests (if applicable)
- [ ] Add interest flow
- [ ] Status cycling
- [ ] Filter/search

---

## Acceptance Criteria

- [ ] All test cases passing
- [ ] Coverage meets target (X%)
- [ ] No flaky tests
- [ ] Tests run in CI (if configured)
- [ ] Test documentation updated

---

## Test File Locations

```
test/
├── unit/
│   ├── services/
│   │   ├── mcp-client.test.js
│   │   └── youtube.test.js
│   └── components/
│       └── InterestCard.test.tsx
├── integration/
│   └── api/
│       └── enrich.test.js
├── e2e/
│   └── add-interest.test.js
└── fixtures/
    ├── interests.json
    └── transcripts/
```

---

## Notes

- Known limitations of test approach
- Areas that are hard to test and why
- Recommendations for future test improvements

---

## Related Items

- Feature: [Feature this tests]
- Bug: [Bug this prevents]
