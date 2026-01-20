# Implementation Spec: T001 - Unit Tests for Backend Services

## Overview
- **Work Item**: T001
- **Type**: Task (Chore)
- **Requirements**: `docs/requirements/T001-requirements.md`

This spec provides detailed implementation guidance for adding comprehensive unit tests to all backend services in the War Goat application.

## Requirements Traceability

| Requirement | Addressed By | Test File |
|-------------|--------------|-----------|
| FR-1: YouTube Service tests | Task 1 | `youtube.test.js` |
| FR-2: MCP Client tests | Task 2 | `mcp-client.test.js` |
| FR-3: MCP SDK Client tests | Task 3 | `mcp-sdk-client.test.js` |
| FR-4: Obsidian Service tests | Task 4 | `obsidian.test.js` |
| FR-5: API Handler tests | Task 5 | `api-handlers.test.js` |
| FR-6: Test isolation | All Tasks | Module-level mocking |
| AC-1 through AC-10 | See AC Mapping | Various |

## Architectural Decisions

### ADR-1: Mock Strategy for External Dependencies
- **Decision**: Use `vi.mock()` at module level for all external dependencies
- **Rationale**: Follows existing patterns in `brave-search.test.js` and `article.test.js`
- **Implementation**: Mock `child_process`, `@modelcontextprotocol/sdk`, `@anthropic-ai/sdk`, and `global.fetch`

### ADR-2: Express Route Testing Approach
- **Decision**: Mock request/response objects directly (not supertest)
- **Rationale**: Faster execution, simpler setup, no new dependencies (CON-3)
- **Implementation**: Create mock `req`, `res`, `next` objects per test

### ADR-3: Test File Organization
- **Decision**: One test file per service module, one file for API handlers
- **Rationale**: Mirrors source structure, easier maintenance
- **Structure**: `server/__tests__/{service-name}.test.js`

### ADR-4: Shared Test Utilities
- **Decision**: No separate test-utils file initially
- **Rationale**: Start simple, extract if patterns emerge during implementation
- **Implementation**: Define mock factories within each test file

## Test Architecture

### Test Files to Create

| File | Service | Functions to Test | Est. Tests |
|------|---------|-------------------|------------|
| `server/__tests__/youtube.test.js` | `youtube.js` | extractVideoId, isYouTubeUrl, getMetadata, getTranscript, enrichYouTubeUrl, getVideoMetrics | 20+ |
| `server/__tests__/mcp-client.test.js` | `mcp-client.js` | MCPClient (7 methods), MCPRegistry (3 methods) | 15+ |
| `server/__tests__/mcp-sdk-client.test.js` | `mcp-sdk-client.js` | createMCPClient, callTool, listTools, callYouTubeTranscript, listYouTubeTranscriptTools | 12+ |
| `server/__tests__/obsidian.test.js` | `obsidian.js` | sanitizeFilename, buildNoteContent, checkConnection, findExistingNote, exportInterest, updateNoteFrontmatter, syncAll, generateStudyNotes | 25+ |
| `server/__tests__/api-handlers.test.js` | `index.js` | /api/enrich, /api/health, transcripts routes, articles routes, obsidian routes, search routes | 20+ |

### Mock Strategy by Module

#### youtube.test.js
```javascript
// Mock mcp-client registry
vi.mock('../services/mcp-client.js', () => ({
  mcpRegistry: {
    getClient: vi.fn(),
  },
}));

// Mock global fetch for oEmbed API
global.fetch = vi.fn();
```

#### mcp-client.test.js
```javascript
// Mock child_process spawn
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));
```

#### mcp-sdk-client.test.js
```javascript
// Mock the official MCP SDK
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(),
}));
vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn(),
}));
```

#### obsidian.test.js
```javascript
// Mock mcp-client, anthropic, and global fetch
vi.mock('../services/mcp-client.js', () => ({
  mcpRegistry: {
    getClient: vi.fn(),
  },
}));
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(),
}));
global.fetch = vi.fn();
```

#### api-handlers.test.js
```javascript
// Mock all service imports
vi.mock('./services/index.js', () => ({
  enrichYouTubeUrl: vi.fn(),
  isYouTubeUrl: vi.fn(),
  // ... etc
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));
```

---

## Implementation Tasks

### Task 1: YouTube Service Unit Tests

**File**: `server/__tests__/youtube.test.js`

**Setup**:
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/mcp-client.js', () => ({
  mcpRegistry: {
    getClient: vi.fn(),
  },
}));

import {
  extractVideoId,
  isYouTubeUrl,
  getMetadata,
  getTranscript,
  enrichYouTubeUrl,
  getVideoMetrics,
} from '../services/youtube.js';
import { mcpRegistry } from '../services/mcp-client.js';
```

**Test Cases**:

1. **extractVideoId**
   - `returns video ID from standard watch URL` - `youtube.com/watch?v=dQw4w9WgXcQ` → `dQw4w9WgXcQ`
   - `returns video ID from youtu.be short URL` - `youtu.be/dQw4w9WgXcQ` → `dQw4w9WgXcQ`
   - `returns video ID from shorts URL` - `youtube.com/shorts/abc123` → `abc123`
   - `returns video ID from embed URL` - `youtube.com/embed/xyz789` → `xyz789`
   - `returns video ID from v/ URL` - `youtube.com/v/test123` → `test123`
   - `returns null for non-YouTube URLs` - `example.com` → `null`
   - `returns null for empty string` - `` → `null`

2. **isYouTubeUrl**
   - `returns true for valid YouTube URLs`
   - `returns false for non-YouTube URLs`
   - `returns false for malformed URLs`

3. **getMetadata**
   - `fetches metadata via oEmbed API` - mock fetch, verify response shape
   - `returns null for invalid video ID`
   - `returns null when oEmbed API fails`
   - `constructs correct thumbnail URLs`

4. **getTranscript**
   - `calls MCP client with correct parameters`
   - `returns success object with transcript`
   - `returns error object when MCP fails`
   - `handles missing content in MCP response`

5. **enrichYouTubeUrl**
   - `returns full enrichment for valid URL`
   - `returns error for invalid URL`
   - `calls metadata and transcript in parallel`
   - `handles partial failures gracefully`

6. **getVideoMetrics**
   - `parses metrics from MCP response`
   - `returns null when MCP call fails`

**Verification**: Run `npx vitest run server/__tests__/youtube.test.js`

---

### Task 2: MCP Client Unit Tests

**File**: `server/__tests__/mcp-client.test.js`

**Setup**:
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import { MCPClient, MCPRegistry, mcpRegistry } from '../services/mcp-client.js';
import { spawn } from 'child_process';
```

**Mock Factory for spawn**:
```javascript
function createMockProcess(options = {}) {
  const proc = new EventEmitter();
  proc.stdin = { write: vi.fn(), end: vi.fn() };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.kill = vi.fn();

  if (options.stdout) {
    setTimeout(() => proc.stdout.emit('data', Buffer.from(options.stdout)), 10);
  }
  if (options.exitCode !== undefined) {
    setTimeout(() => proc.emit('close', options.exitCode), 20);
  }

  return proc;
}
```

**Test Cases**:

1. **MCPClient.nextRequestId**
   - `increments request ID on each call`
   - `starts from 1`

2. **MCPClient.connect**
   - `spawns process with correct config`
   - `sets connected to true`
   - `handles spawn errors`
   - `is idempotent when already connected`

3. **MCPClient.disconnect**
   - `kills the process`
   - `sets connected to false`
   - `handles already disconnected state`

4. **MCPClient.request**
   - `sends JSON-RPC request via stdin`
   - `parses JSON-RPC response from stdout`
   - `rejects on timeout (30s)`
   - `rejects on non-zero exit code`
   - `rejects on spawn error`

5. **MCPClient.parseResponse**
   - `extracts result from valid JSON-RPC response`
   - `handles multi-line output`
   - `throws on missing JSON-RPC response`
   - `returns error property when present`

6. **MCPClient.listTools**
   - `calls tools/list method`
   - `returns tools array`

7. **MCPClient.callTool**
   - `calls tools/call with name and arguments`
   - `returns tool result`

8. **MCPRegistry.register**
   - `stores server config by name`

9. **MCPRegistry.getClient**
   - `returns MCPClient for registered server`
   - `throws for unregistered server`

10. **MCPRegistry.loadFromConfig**
    - `loads multiple servers from config object`

**Verification**: Run `npx vitest run server/__tests__/mcp-client.test.js`

---

### Task 3: MCP SDK Client Unit Tests

**File**: `server/__tests__/mcp-sdk-client.test.js`

**Setup**:
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClient = {
  connect: vi.fn(),
  close: vi.fn(),
  callTool: vi.fn(),
  listTools: vi.fn(),
};

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(() => mockClient),
}));
vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn(),
}));

import {
  createMCPClient,
  callTool,
  listTools,
  callYouTubeTranscript,
  listYouTubeTranscriptTools,
} from '../services/mcp-sdk-client.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
```

**Test Cases**:

1. **createMCPClient**
   - `creates transport with correct config`
   - `creates client and connects`
   - `returns connected client`

2. **callTool**
   - `creates client, calls tool, closes client`
   - `returns tool result`
   - `closes client even on error`
   - `propagates errors from callTool`

3. **listTools**
   - `creates client, lists tools, closes client`
   - `returns tools array`

4. **callYouTubeTranscript**
   - `calls get_transcript tool with URL`
   - `extracts text from response`
   - `returns null when no text in response`
   - `throws on API errors`

5. **listYouTubeTranscriptTools**
   - `uses correct config for youtube-transcript`
   - `returns tools list`

**Verification**: Run `npx vitest run server/__tests__/mcp-sdk-client.test.js`

---

### Task 4: Obsidian Service Unit Tests

**File**: `server/__tests__/obsidian.test.js`

**Setup**:
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/mcp-client.js', () => ({
  mcpRegistry: {
    getClient: vi.fn(),
  },
}));

const mockAnthropicCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: { create: mockAnthropicCreate },
  })),
}));

import {
  sanitizeFilename,
  buildNoteContent,
  checkConnection,
  findExistingNote,
  exportInterest,
  updateNoteFrontmatter,
  syncAll,
  generateStudyNotes,
} from '../services/obsidian.js';
import { mcpRegistry } from '../services/mcp-client.js';
```

**Test Cases**:

1. **sanitizeFilename**
   - `removes illegal filesystem characters`
   - `normalizes whitespace`
   - `limits to 100 characters`
   - `returns "untitled" for empty/null input`
   - `removes control characters`

2. **buildNoteContent**
   - `generates valid YAML frontmatter`
   - `includes all required metadata fields`
   - `formats tags as hashtags`
   - `formats categories as wiki links`
   - `includes transcript in collapsible section`
   - `includes AI study notes when provided`
   - `handles missing optional fields`

3. **checkConnection**
   - `returns connected when REST API responds`
   - `falls back to MCP when REST fails`
   - `returns not connected when both fail`
   - `includes vault name when connected`

4. **findExistingNote**
   - `searches via REST API first`
   - `falls back to MCP search`
   - `returns path when found`
   - `returns null when not found`

5. **exportInterest**
   - `creates note with correct content`
   - `respects forceOverwrite option`
   - `returns existed:true for duplicate`
   - `generates study notes when requested`
   - `handles export errors gracefully`

6. **updateNoteFrontmatter**
   - `reads existing note content`
   - `updates specified frontmatter fields`
   - `preserves other content`
   - `handles missing note`

7. **syncAll**
   - `exports each item`
   - `tracks created/skipped/failed counts`
   - `calls progress callback`
   - `respects forceOverwrite option`
   - `adds delay between exports`

8. **generateStudyNotes**
   - `calls Anthropic API with transcript`
   - `parses JSON response`
   - `returns null when API key missing`
   - `returns null for short transcripts`
   - `truncates long transcripts`

**Verification**: Run `npx vitest run server/__tests__/obsidian.test.js`

---

### Task 5: API Handler Unit Tests

**File**: `server/__tests__/api-handlers.test.js`

**Setup**:
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all service imports
vi.mock('../services/index.js', () => ({
  enrichYouTubeUrl: vi.fn(),
  isYouTubeUrl: vi.fn(),
  extractVideoId: vi.fn(),
  checkObsidianConnection: vi.fn(),
  exportInterest: vi.fn(),
  updateNoteFrontmatter: vi.fn(),
  syncAllToObsidian: vi.fn(),
  isBraveSearchAvailable: vi.fn(),
  webSearch: vi.fn(),
  newsSearch: vi.fn(),
  videoSearch: vi.fn(),
  relatedSearch: vi.fn(),
  isArticleUrl: vi.fn(),
  enrichArticleUrl: vi.fn(),
  generateArticleSummary: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));
```

**Mock Request/Response Factory**:
```javascript
function createMockReq(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    ...overrides,
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    data: null,
    status: vi.fn((code) => { res.statusCode = code; return res; }),
    json: vi.fn((data) => { res.data = data; return res; }),
    setHeader: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
  };
  return res;
}
```

**Test Cases**:

1. **POST /api/enrich**
   - `returns 400 when URL missing`
   - `enriches YouTube URL`
   - `enriches article URL`
   - `returns other type for unknown URLs`
   - `handles enrichment errors`

2. **GET /api/health**
   - `returns ok status`
   - `includes timestamp`

3. **GET /api/transcripts/:id**
   - `returns transcript when exists`
   - `returns 404 when not found`

4. **PUT /api/transcripts/:id**
   - `saves transcript content`
   - `returns 400 when content missing`
   - `handles write errors`

5. **POST /api/transcripts/:id**
   - `same behavior as PUT`

6. **GET /api/articles/:id**
   - `returns article content when exists`
   - `returns 404 when not found`

7. **PUT /api/articles/:id**
   - `saves article content`
   - `returns 400 when content missing`

8. **POST /api/articles/:id/summary**
   - `generates summary for article`
   - `returns 404 when article not found`
   - `handles summary generation errors`

9. **GET /api/obsidian/status**
   - `returns connection status`

10. **POST /api/interests/:id/export-obsidian**
    - `exports interest to Obsidian`
    - `returns 404 when interest not found`
    - `updates db with obsidianPath`

11. **GET /api/search/status**
    - `returns available when API key set`
    - `returns error when not configured`

12. **POST /api/search**
    - `performs web search`
    - `performs news search`
    - `performs video search`
    - `returns 400 when query missing`
    - `truncates query to 400 chars`

13. **POST /api/search/related/:id**
    - `finds related content for interest`
    - `returns 404 when interest not found`

**Verification**: Run `npx vitest run server/__tests__/api-handlers.test.js`

---

### Task 6: Coverage Verification

**Actions**:
1. Install coverage dependencies (if not present):
   ```bash
   npm install -D @vitest/coverage-v8
   ```

2. Add coverage script to package.json:
   ```json
   "test:coverage": "vitest run --coverage"
   ```

3. Run coverage report:
   ```bash
   npm run test:coverage
   ```

4. Verify server/services/ directory exceeds 80% coverage

**Verification**: Coverage report shows >80% for all service files

---

### Task 7: Final Verification

**Run full test suite**:
```bash
npm run test
```

**Expected outcome**:
- All tests pass
- Duration < 30 seconds
- No flaky behavior on repeated runs

**Checklist**:
- [ ] All 5 new test files created
- [ ] All tests pass consistently
- [ ] Coverage >80% for services
- [ ] Test duration <30s
- [ ] No external service dependencies

---

## Acceptance Criteria Mapping

| AC | How Implemented | Test File |
|----|-----------------|-----------|
| AC-1: YouTube Service tests | Task 1: 20+ test cases | youtube.test.js |
| AC-2: MCP Client tests | Task 2: 15+ test cases | mcp-client.test.js |
| AC-3: MCP SDK Client tests | Task 3: 12+ test cases | mcp-sdk-client.test.js |
| AC-4: Obsidian Service tests | Task 4: 25+ test cases | obsidian.test.js |
| AC-5: API handler tests | Task 5: 20+ test cases | api-handlers.test.js |
| AC-6: External deps mocked | All Tasks: vi.mock() | All test files |
| AC-7: >80% coverage | Task 6: coverage verification | @vitest/coverage-v8 |
| AC-8: <30s execution | Task 7: timing verification | npm run test |
| AC-9: No flaky tests | Task 7: repeated runs | All test files |
| AC-10: Follow patterns | All Tasks: vi.mock/vi.fn | All test files |

---

## Open Questions Resolved

| Question | Answer |
|----------|--------|
| Q1: Use supertest for Express? | No - mock req/res directly (ADR-2) |
| Q2: Enforce coverage in CI? | Defer - can add later via vitest.config |

---

## Implementation Order

1. **youtube.test.js** - Start here, straightforward service
2. **mcp-sdk-client.test.js** - Required for youtube tests to work
3. **mcp-client.test.js** - More complex spawn mocking
4. **obsidian.test.js** - Multiple dependencies
5. **api-handlers.test.js** - Depends on understanding services
6. **Coverage verification** - After all tests pass
7. **Final verification** - Performance and reliability check

## Watch Out For

1. **Import order matters** - `vi.mock()` must come before imports
2. **Async mock cleanup** - Use `vi.clearAllMocks()` in beforeEach
3. **Global fetch** - Must mock `global.fetch` not import fetch
4. **Process.env** - Save and restore in tests that modify it
5. **Spawn timing** - Use event emitters with setTimeout for realistic behavior

---
*Generated by Architecture Agent*
*Timestamp: 2026-01-20T13:30:00-05:00*
