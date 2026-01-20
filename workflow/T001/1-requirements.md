---
id: T001
stage: requirements
title: "Unit Tests for Backend Services"
started_at: 2026-01-20T13:01:52-05:00
completed_at: 2026-01-20T13:15:00-05:00
status: complete
handoff_ready: true
checkpoints:
  - name: requirements_identified
    status: pass
    message: "6 functional requirements defined covering all backend services"
  - name: impact_analyzed
    status: pass
    message: "7 components identified with impact levels, dependencies documented"
  - name: test_impact_analyzed
    status: pass
    message: "Baseline 47 tests passing, 5 new test areas identified, Test Impact Report created"
  - name: acceptance_criteria_defined
    status: pass
    message: "10 specific, measurable acceptance criteria defined"
  - name: no_open_blockers
    status: pass
    message: "No blocking questions - implementation details deferred to Architecture"
retry_count: 0
last_failure: null
---

# Requirements: Unit Tests for Backend Services

## Work Item
- **ID**: T001
- **Type**: Task (Chore)
- **Source**: beans issue Hackshop_Agentic_Dev_Tools-mqkb

## Executive Summary

This task adds comprehensive unit tests for all backend services in the War Goat application, including YouTube enrichment, MCP clients, Obsidian integration, and API handlers. The goal is to achieve >80% test coverage with fast execution (<30s) and complete isolation from external services.

## Detailed Requirements

### Functional Requirements

- **FR-1**: YouTube Service unit tests - All functions in `server/services/youtube.js` must have comprehensive unit tests covering URL detection patterns (5 regex patterns), video ID extraction, metadata fetching via oEmbed, transcript retrieval via MCP, and full enrichment flow.

- **FR-2**: MCP Client unit tests - All functions in `server/services/mcp-client.js` must have unit tests covering MCPClient class methods (nextRequestId, connect, disconnect, request, parseResponse, listTools, callTool) and MCPRegistry class methods (register, getClient, loadFromConfig).

- **FR-3**: MCP SDK Client unit tests - All functions in `server/services/mcp-sdk-client.js` must have unit tests covering createMCPClient, callTool, listTools, and pre-configured server helpers.

- **FR-4**: Obsidian Service unit tests - All functions in `server/services/obsidian.js` must have unit tests covering core utilities (sanitizeFilename, buildNoteContent), connection checking, CRUD operations (findExistingNote, exportInterest, updateNoteFrontmatter), bulk sync, and AI study notes generation.

- **FR-5**: Data Layer API tests - Express route handlers in `server/index.js` must have unit tests for all endpoints.

- **FR-6**: Test isolation - All tests must be isolated with external dependencies mocked (Docker, YouTube API, Obsidian REST API, Brave Search API, Anthropic API).

### Non-Functional Requirements

- **NFR-1**: Performance - Complete test suite must run in under 30 seconds
- **NFR-2**: Coverage - Test coverage for services directory must exceed 80%
- **NFR-3**: Maintainability - Tests must follow existing Vitest/vi.mock patterns
- **NFR-4**: Reliability - No flaky tests, deterministic execution

### Constraints

- **CON-1**: Must use existing test framework (Vitest)
- **CON-2**: Must not require external services to be running
- **CON-3**: Must not add new runtime dependencies
- **CON-4**: Tests must work in CI environment without Docker

## System Impact Analysis

### Components Affected
| Component | Impact Level | Description |
|-----------|--------------|-------------|
| `server/services/youtube.js` | High | Primary target - 6 functions, 209 LOC |
| `server/services/mcp-client.js` | High | Primary target - 2 classes, 283 LOC |
| `server/services/mcp-sdk-client.js` | High | Primary target - 5 functions, 184 LOC |
| `server/services/obsidian.js` | Medium | Primary target - 8 functions, 586 LOC |
| `server/index.js` | Medium | API handlers - ~636 LOC |
| `server/__tests__/` | High | 5 new test files to be added |
| `package.json` | Low | May need coverage config |

### Data Changes
- Database schema changes: No
- API changes: No
- Configuration changes: May need vitest coverage config

### Dependencies
- Internal: All server services, existing test utilities
- External: Vitest (existing), vi mocking utilities (existing), jsdom (existing)

### Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Flaky tests due to timing | Medium | Medium | Use vi.useFakeTimers(), proper async handling |
| Incomplete mocking causing side effects | Medium | Low | Review mocks, use vi.spyOn carefully |
| Test suite becomes slow | Low | Medium | Keep tests focused, parallel execution |
| Coverage gaps in complex code paths | Medium | Low | Use coverage reports to identify gaps |

## Test Impact Analysis

### Existing Test Baseline
```bash
# Test run command and summary
npx vitest run --reporter=verbose
# Total: 47 tests, 47 passing, 0 failing
# Duration: 945ms
```

### Related Test Files
| Test File | Type | Tests | Relevance | Predicted Impact |
|-----------|------|-------|-----------|------------------|
| `server/__tests__/article.test.js` | Unit | 29 | High | Keep - Pattern reference |
| `server/__tests__/brave-search.test.js` | Unit | 18 | High | Keep - Pattern reference |

### Tests Predicted to Break/Change
| Test | File | Reason | Action Needed |
|------|------|--------|---------------|
| N/A | N/A | This is additive - no existing tests affected | None |

### New Test Coverage Needed
| Area | Type | Priority | Reason |
|------|------|----------|--------|
| YouTube Service | Unit | High | 0% current coverage, 6 functions |
| MCP Client | Unit | High | 0% current coverage, 2 classes |
| MCP SDK Client | Unit | High | 0% current coverage, 5 functions |
| Obsidian Service | Unit | Medium | 0% current coverage, 8 functions |
| API Handlers | Unit | Medium | 0% current coverage, ~15 routes |

### Test Impact Report
See: `workflow/T001/test-impact-report.md`

## User Stories

### Primary User Story
As a developer
I want comprehensive unit tests for backend services
So that I can safely refactor and extend the codebase with confidence

### Additional User Stories
- As a CI/CD pipeline, I want fast tests so builds complete quickly
- As a new contributor, I want tests as documentation of expected behavior

## Acceptance Criteria

- [ ] **AC-1**: YouTube Service has unit tests for all 6 exported functions with multiple test cases each
- [ ] **AC-2**: MCP Client has unit tests for MCPClient (7 methods) and MCPRegistry (3 methods)
- [ ] **AC-3**: MCP SDK Client has unit tests for all 5 exported functions
- [ ] **AC-4**: Obsidian Service has unit tests for all 8 exported functions
- [ ] **AC-5**: API handlers have tests covering all routes in server/index.js
- [ ] **AC-6**: All external dependencies are properly mocked (fetch, child_process.spawn, MCP SDK, Anthropic)
- [ ] **AC-7**: Test coverage for server/services/ exceeds 80% (verified via vitest --coverage)
- [ ] **AC-8**: Full test suite completes in under 30 seconds
- [ ] **AC-9**: All tests pass consistently with no flaky behavior
- [ ] **AC-10**: Tests follow patterns established in article.test.js and brave-search.test.js

## Out of Scope

- Frontend component tests (T002)
- E2E UI tests (T003)
- Performance testing/benchmarking
- Load testing
- Integration tests requiring live services

## Open Questions

- Q1: Should we add supertest for Express route testing? [Blocker: no - Architecture decides]
- Q2: Should coverage thresholds be enforced in CI? [Blocker: no - Implementation detail]

## Documentation Impact

- [ ] Update README.md test section if patterns change
- [ ] Add JSDoc comments to tested functions if missing

## Handoff to Architecture Agent

### Key Decisions Needed
1. **Test file organization**: Should API handler tests be in a single file or split by route group?
2. **Mock strategy for MCP**: Mock at module level (vi.mock) vs instance level (vi.spyOn)?
3. **Express testing approach**: Use supertest or mock req/res objects directly?
4. **Shared test utilities**: Create test-utils.js for mock factories?

### Suggested Approach
Based on the existing patterns in article.test.js and brave-search.test.js:

1. **Mock at module level** for external dependencies (child_process, fetch, @anthropic-ai/sdk, @modelcontextprotocol/sdk)
2. **Use vi.fn()** for creating mock implementations
3. **Follow describe/it structure** matching the module's export structure
4. **Use beforeEach** to clear mocks between tests

### Files to Focus On
1. `server/services/youtube.js` - Start here, well-documented, clear functions
2. `server/services/mcp-client.js` - Complex, needs careful spawn mocking
3. `server/services/mcp-sdk-client.js` - Mock the SDK client/transport
4. `server/services/obsidian.js` - Multiple external dependencies to mock
5. `server/index.js` - Decide on Express testing strategy

### Existing Patterns to Follow
```javascript
// From brave-search.test.js
vi.mock('../services/mcp-sdk-client.js', () => ({
  callTool: vi.fn(),
}));

// From article.test.js
const createMockDocument = (html) => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html, { url: 'https://example.com/article' });
  return dom.window.document;
};
```

---
*Generated by Requirements Agent*
*Timestamp: 2026-01-20T13:15:00-05:00*
