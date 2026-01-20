# Requirements: T001 - Unit Tests for Backend Services

## Work Item
- **ID**: T001
- **Type**: Task (Chore)
- **Source**: beans issue Hackshop_Agentic_Dev_Tools-mqkb
- **Priority**: High

## Executive Summary

This task adds comprehensive unit tests for all backend services in the War Goat application. The backend services include YouTube enrichment, MCP clients (both manual and SDK-based), data layer API handlers, and utility functions. The goal is to achieve >80% test coverage for services while maintaining fast test execution (<30 seconds) with all external dependencies mocked.

## Detailed Requirements

### Functional Requirements

- **FR-1**: YouTube Service unit tests - All functions in `server/services/youtube.js` must have comprehensive unit tests covering URL detection patterns, video ID extraction, metadata fetching, transcript retrieval, and full enrichment flow.

- **FR-2**: MCP Client unit tests - All functions in `server/services/mcp-client.js` must have unit tests covering MCPClient class methods (connect, disconnect, request, parseResponse, listTools, callTool) and MCPRegistry class methods (register, getClient, loadFromConfig).

- **FR-3**: MCP SDK Client unit tests - All functions in `server/services/mcp-sdk-client.js` must have unit tests covering createMCPClient, callTool, listTools, and pre-configured server helpers (callYouTubeTranscript, listYouTubeTranscriptTools).

- **FR-4**: Obsidian Service unit tests - All functions in `server/services/obsidian.js` must have unit tests covering sanitizeFilename, buildNoteContent, checkConnection, findExistingNote, exportInterest, updateNoteFrontmatter, syncAll, and generateStudyNotes.

- **FR-5**: Data Layer API tests - Express route handlers in `server/index.js` must have unit tests covering /api/enrich, /api/health, /api/transcripts/:id (GET/PUT/POST), /api/articles/:id (GET/PUT), /api/articles/:id/summary, /api/obsidian/* routes, /api/search/* routes, and JSON Server integration.

- **FR-6**: Test isolation - All tests must be isolated and not depend on external services (Docker, YouTube API, Obsidian, Brave Search API, Anthropic API). All external dependencies must be mocked.

### Non-Functional Requirements

- **NFR-1**: Performance - Complete test suite must run in under 30 seconds.
- **NFR-2**: Coverage - Test coverage for services directory must exceed 80%.
- **NFR-3**: Maintainability - Tests must follow existing patterns established in article.test.js and brave-search.test.js (Vitest, vi.mock, vi.fn).
- **NFR-4**: Reliability - Tests must be deterministic and not flaky. No timing-dependent tests without proper mocking.

### Constraints

- **CON-1**: Must use existing test framework (Vitest) and patterns.
- **CON-2**: Must not require external services to be running.
- **CON-3**: Must not add new runtime dependencies.
- **CON-4**: Tests must work in CI environment without Docker.

## System Impact Analysis

### Components Affected

| Component | Impact Level | Description |
|-----------|--------------|-------------|
| `server/services/youtube.js` | High | Primary target for new tests |
| `server/services/mcp-client.js` | High | Primary target for new tests |
| `server/services/mcp-sdk-client.js` | High | Primary target for new tests |
| `server/services/obsidian.js` | Medium | New tests for export functionality |
| `server/index.js` | Medium | API handler tests |
| `server/__tests__/` | High | New test files added |
| `package.json` | Low | May add test scripts/config |

### Data Changes
- Database schema changes: No
- API changes: No
- Configuration changes: May add vitest.config.ts tweaks for coverage

### Dependencies
- Internal: All server services, existing test utilities
- External: Vitest (existing), vi mocking utilities (existing)

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Flaky tests due to timing | Medium | Medium | Use fake timers, proper async handling |
| Incomplete mocking causing side effects | Medium | Low | Review mocks, use spyOn carefully |
| Test suite becomes slow | Low | Medium | Keep tests focused, use parallel execution |
| Coverage gaps in complex code paths | Medium | Low | Use coverage reports to identify gaps |

## User Stories

### Primary User Story
As a developer
I want comprehensive unit tests for backend services
So that I can safely refactor and extend the codebase with confidence

### Additional User Stories
- As a CI/CD pipeline, I want fast tests so builds complete quickly
- As a new contributor, I want tests as documentation of expected behavior
- As a maintainer, I want high coverage to catch regressions early

## Acceptance Criteria

- [ ] **AC-1**: YouTube Service has unit tests for all 6 exported functions (extractVideoId, isYouTubeUrl, getMetadata, getTranscript, enrichYouTubeUrl, getVideoMetrics)
- [ ] **AC-2**: MCP Client has unit tests for MCPClient class (6 methods) and MCPRegistry class (3 methods)
- [ ] **AC-3**: MCP SDK Client has unit tests for all 5 exported functions
- [ ] **AC-4**: Obsidian Service has unit tests for all 8 exported functions
- [ ] **AC-5**: API handlers have integration-style unit tests using supertest or similar
- [ ] **AC-6**: All external dependencies are properly mocked (fetch, child_process.spawn, MCP SDK)
- [ ] **AC-7**: Test coverage for server/services/ exceeds 80% (verified via vitest --coverage)
- [ ] **AC-8**: Full test suite completes in under 30 seconds
- [ ] **AC-9**: All tests pass consistently (no flaky tests)
- [ ] **AC-10**: Tests follow established patterns from existing test files

## Out of Scope

- Frontend component tests (covered by T002)
- E2E tests (covered by T003)
- Performance testing/benchmarking
- Load testing
- Integration tests requiring live services

## Open Questions

- Q1: Should we add supertest for Express route testing or mock at request handler level? [Blocker: no - Architecture can decide]
- Q2: Should coverage thresholds be enforced in CI? [Blocker: no - Implementation detail]

## Documentation Impact

- [ ] Update README.md test section if needed
- [ ] Add test patterns documentation if patterns evolve

---
*Persistent Requirements Document for T001*
*Created by Requirements Agent*
