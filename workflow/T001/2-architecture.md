---
id: T001
stage: architecture
title: "Unit Tests for Backend Services"
started_at: 2026-01-20T13:20:00-05:00
completed_at: 2026-01-20T13:35:00-05:00
status: complete
handoff_ready: true
checkpoints:
  - name: requirements_addressed
    status: pass
    message: "All 6 FRs and 10 ACs mapped to implementation tasks"
  - name: design_complete
    status: pass
    message: "4 ADRs documented, mock strategies defined, test structure specified"
  - name: test_architecture_defined
    status: pass
    message: "Test tooling confirmed, 5 test files planned with ~135 tests total"
  - name: tasks_defined
    status: pass
    message: "7 sequential tasks with files, descriptions, and verification steps"
  - name: tests_planned
    status: pass
    message: "All test cases specified per function with expected behavior"
retry_count: 0
last_failure: null
previous_stage: 1-requirements.md
---

# Architecture & Implementation Spec: Unit Tests for Backend Services

## Work Item
- **ID**: T001
- **Requirements Doc**: `workflow/T001/1-requirements.md`
- **Persistent Requirements**: `docs/requirements/T001-requirements.md`
- **Implementation Spec**: `specs/T001-spec.md` **(PRIMARY DELIVERABLE)**
- **Type**: Task (Chore)

## Requirements Summary

Add comprehensive unit tests for all backend services achieving >80% coverage with <30s execution time. All external dependencies (Docker, YouTube API, Obsidian, Brave Search API, Anthropic API) must be mocked. Tests must follow existing Vitest patterns.

## Requirements Traceability

| Requirement | Addressed By | Implementation |
|-------------|--------------|----------------|
| FR-1: YouTube tests | Task 1 | `youtube.test.js` - 24 tests |
| FR-2: MCP Client tests | Task 2 | `mcp-client.test.js` - 26 tests |
| FR-3: MCP SDK Client tests | Task 3 | `mcp-sdk-client.test.js` - 16 tests |
| FR-4: Obsidian tests | Task 4 | `obsidian.test.js` - 39 tests |
| FR-5: API Handler tests | Task 5 | `api-handlers.test.js` - 30 tests |
| FR-6: Test isolation | All Tasks | `vi.mock()` for all externals |
| AC-1 through AC-10 | See spec | Detailed mapping in spec |

## Architectural Analysis

### Current State
- 2 existing test files: `article.test.js` (29 tests), `brave-search.test.js` (18 tests)
- Vitest configured in `package.json`
- Established patterns: `vi.mock()`, `vi.fn()`, `beforeEach` cleanup
- No test coverage reporting configured

### Proposed Changes
- Add 5 new test files (~135 tests)
- Install `@vitest/coverage-v8` for coverage reporting
- No changes to source code or runtime dependencies

## Architecture Decision Records (ADRs)

### ADR-1: Mock Strategy for External Dependencies
- **Context**: Services depend on child_process, MCP SDK, Anthropic SDK, and fetch
- **Decision**: Use `vi.mock()` at module level before imports
- **Alternatives**: vi.spyOn (partial), manual dependency injection
- **Consequences**: Full isolation, fast tests, follows existing patterns

### ADR-2: Express Route Testing Approach
- **Context**: Need to test Express route handlers
- **Decision**: Mock request/response objects directly
- **Alternatives**: supertest (requires Express instance, slower)
- **Consequences**: No new dependencies (CON-3), faster execution

### ADR-3: Test File Organization
- **Context**: Need consistent test organization
- **Decision**: One test file per service, all in `server/__tests__/`
- **Alternatives**: Split by function, nested directories
- **Consequences**: Mirrors source structure, easy to navigate

### ADR-4: Shared Test Utilities
- **Context**: Multiple tests need mock factories
- **Decision**: Define mock factories within each test file (no shared utils)
- **Alternatives**: Shared `test-utils.js` file
- **Consequences**: Self-contained tests, can extract later if needed

## Technical Design

### Mock Patterns

#### Global Fetch
```javascript
global.fetch = vi.fn();
// In beforeEach: vi.clearAllMocks()
```

#### Child Process Spawn
```javascript
vi.mock('child_process', () => ({ spawn: vi.fn() }));
// Mock process with EventEmitter pattern
```

#### MCP SDK
```javascript
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(() => mockClient),
}));
```

#### Anthropic SDK
```javascript
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({ messages: { create: vi.fn() } })),
}));
```

## Test Architecture

### Test Structure
```
server/__tests__/
├── article.test.js         (existing - 29 tests)
├── brave-search.test.js    (existing - 18 tests)
├── youtube.test.js         (new - 24 tests)
├── mcp-client.test.js      (new - 26 tests)
├── mcp-sdk-client.test.js  (new - 16 tests)
├── obsidian.test.js        (new - 39 tests)
└── api-handlers.test.js    (new - 30 tests)
```

**Total: 182 tests (47 existing + 135 new)**

### Test Impact Report
See: `workflow/T001/test-impact-report.md` - Section 2 updated with architecture decisions.

## Implementation Plan Summary

See `specs/T001-spec.md` for detailed implementation guidance.

### Task Order
1. **youtube.test.js** - Simple service, good starting point
2. **mcp-sdk-client.test.js** - Required for youtube's MCP dependency
3. **mcp-client.test.js** - Complex spawn mocking
4. **obsidian.test.js** - Multiple dependencies
5. **api-handlers.test.js** - Depends on understanding services
6. **Coverage verification** - Install and run coverage
7. **Final verification** - Performance and reliability

### File Changes

| File | Action | Purpose |
|------|--------|---------|
| `server/__tests__/youtube.test.js` | Create | 24 tests for YouTube service |
| `server/__tests__/mcp-client.test.js` | Create | 26 tests for MCP client |
| `server/__tests__/mcp-sdk-client.test.js` | Create | 16 tests for MCP SDK client |
| `server/__tests__/obsidian.test.js` | Create | 39 tests for Obsidian service |
| `server/__tests__/api-handlers.test.js` | Create | 30 tests for API handlers |
| `package.json` | Modify | Add coverage script, install coverage dep |

## Acceptance Criteria Mapping

| AC | Implementation | Verification |
|----|----------------|--------------|
| AC-1 | Task 1: youtube.test.js | 24 tests cover 6 functions |
| AC-2 | Task 2: mcp-client.test.js | 26 tests cover 2 classes |
| AC-3 | Task 3: mcp-sdk-client.test.js | 16 tests cover 5 functions |
| AC-4 | Task 4: obsidian.test.js | 39 tests cover 8 functions |
| AC-5 | Task 5: api-handlers.test.js | 30 tests cover ~15 routes |
| AC-6 | All tasks use vi.mock() | No real network/spawn calls |
| AC-7 | Task 6: coverage report | vitest --coverage shows >80% |
| AC-8 | Task 7: timing check | npm run test completes <30s |
| AC-9 | Task 7: repeated runs | 3 consecutive runs all pass |
| AC-10 | All tasks | Same patterns as article.test.js |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Flaky tests due to timing | Use vi.useFakeTimers(), setTimeout in mocks |
| Incomplete mocking | Verify no real network calls in CI |
| Slow test suite | Run in parallel, keep tests focused |
| Coverage gaps | Use coverage report to identify gaps |

## Open Questions Resolved

| Question | Answer |
|----------|--------|
| Q1: Use supertest? | No - mock req/res directly (ADR-2) |
| Q2: Coverage in CI? | Defer - can add threshold later |

## Handoff to Implementor Agent

### Primary Deliverable
**`specs/T001-spec.md`** - Contains all implementation details, test cases, and verification steps.

### Critical Notes
1. **Import order matters**: `vi.mock()` calls must come BEFORE imports
2. **Process.env tests**: Save and restore original values
3. **Async cleanup**: Always use `vi.clearAllMocks()` in beforeEach
4. **EventEmitter mocks**: Use setTimeout for realistic spawn behavior

### Recommended Order
1. Start with youtube.test.js (straightforward, good learning)
2. Then mcp-sdk-client.test.js (needed by youtube)
3. Then mcp-client.test.js (complex spawn mocking)
4. Then obsidian.test.js (multiple dependencies)
5. Finally api-handlers.test.js (integration-style)
6. Run coverage, verify >80%
7. Run full suite 3x, verify <30s and no flakes

### Watch Out For
- Global fetch mock must be on `global.fetch`, not imported
- Spawn processes need stdin.write, stdin.end, and EventEmitter events
- Anthropic SDK returns `{ messages: { create: fn } }` structure
- MCP SDK Client has transport separate from client

---
*Generated by Architecture Agent*
*Timestamp: 2026-01-20T13:35:00-05:00*
