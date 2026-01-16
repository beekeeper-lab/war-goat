# Test: Unit Tests for Backend Services

> **ID**: T001
> **Type**: Test
> **Status**: Planned
> **Priority**: High
> **Effort**: M
> **Created**: 2026-01-16
> **Blocked By**: None

## Overview

Add comprehensive unit tests for all backend services, utilities, and business logic to ensure reliability and catch regressions early.

---

## Test Scope

### Services to Test

#### 1. YouTube Service (`server/services/youtube.js`)

**Functions to test**:
- `isYouTubeUrl(url)` - URL detection
- `extractVideoId(url)` - Video ID extraction from various URL formats
- `getMetadata(url)` - Metadata fetching (mock oEmbed)
- `getTranscript(url)` - Transcript fetching (mock MCP)
- `enrichYouTubeUrl(url)` - Full enrichment flow

**Test cases**:
- [ ] Valid YouTube URL formats (watch, short, embed, mobile)
- [ ] Invalid URLs return appropriate errors
- [ ] Missing video ID handling
- [ ] oEmbed API failure handling
- [ ] MCP transcript unavailable handling
- [ ] Successful enrichment returns all expected fields

#### 2. MCP Client (`server/services/mcp-client.js`)

**Functions to test**:
- `MCPClient.connect()` - Connection establishment
- `MCPClient.request()` - JSON-RPC request formatting
- `MCPClient.callTool()` - Tool invocation
- `MCPRegistry.register()` - Server registration
- `MCPRegistry.getClient()` - Client retrieval

**Test cases**:
- [ ] Valid JSON-RPC request structure
- [ ] Request ID incrementing
- [ ] Timeout handling
- [ ] Process spawn errors
- [ ] Invalid server configuration

#### 3. MCP SDK Client (`server/services/mcp-sdk-client.js`)

**Functions to test**:
- `createMCPClient(config)` - Client creation
- `callMCPTool(client, name, args)` - Tool calls

**Test cases**:
- [ ] Client connects with correct parameters
- [ ] Tool calls format arguments correctly
- [ ] Connection errors handled gracefully

#### 4. Data Layer (`server/index.js` - API handlers)

**Endpoints to test**:
- `GET /api/interests` - List with filtering
- `POST /api/interests` - Create new interest
- `PATCH /api/interests/:id` - Update interest
- `DELETE /api/interests/:id` - Delete interest
- `POST /api/enrich` - URL enrichment
- `GET /api/interests/:id/transcript` - Transcript retrieval

**Test cases**:
- [ ] CRUD operations work correctly
- [ ] Filtering by type, status, category
- [ ] Invalid ID returns 404
- [ ] Validation errors return 400
- [ ] Database file handling (read/write)

---

## Technical Setup

### Testing Framework

```json
// package.json additions
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "c8": "^9.0.0"
  },
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --dir server/__tests__",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Test File Structure

```
server/
├── __tests__/
│   ├── services/
│   │   ├── youtube.test.js
│   │   ├── mcp-client.test.js
│   │   └── mcp-sdk-client.test.js
│   ├── api/
│   │   ├── interests.test.js
│   │   └── enrich.test.js
│   └── utils/
│       └── helpers.test.js
├── __mocks__/
│   ├── mcp-responses.js
│   └── youtube-responses.js
└── services/
    └── ...
```

### Mocking Strategy

```javascript
// Mock MCP calls - don't spawn actual processes
vi.mock('../services/mcp-client.js', () => ({
  MCPRegistry: vi.fn().mockImplementation(() => ({
    getClient: vi.fn().mockReturnValue({
      callTool: vi.fn().mockResolvedValue({ content: [{ text: 'mocked' }] })
    })
  }))
}));

// Mock fetch for oEmbed
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ title: 'Test Video', author_name: 'Test Channel' })
});
```

---

## Acceptance Criteria

- [ ] All service functions have unit tests
- [ ] Test coverage > 80% for services
- [ ] All API endpoints have tests
- [ ] Tests run in < 30 seconds
- [ ] No external dependencies (all mocked)
- [ ] Tests can run in CI environment
- [ ] Clear test descriptions (describe what, not how)

---

## Example Tests

```javascript
// server/__tests__/services/youtube.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isYouTubeUrl, extractVideoId, enrichYouTubeUrl } from '../../services/youtube.js';

describe('YouTube Service', () => {
  describe('isYouTubeUrl', () => {
    it('returns true for standard watch URLs', () => {
      expect(isYouTubeUrl('https://www.youtube.com/watch?v=abc123')).toBe(true);
    });

    it('returns true for short URLs', () => {
      expect(isYouTubeUrl('https://youtu.be/abc123')).toBe(true);
    });

    it('returns false for non-YouTube URLs', () => {
      expect(isYouTubeUrl('https://vimeo.com/123')).toBe(false);
    });
  });

  describe('extractVideoId', () => {
    it('extracts ID from watch URL', () => {
      expect(extractVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts ID from short URL', () => {
      expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('returns null for invalid URL', () => {
      expect(extractVideoId('https://example.com')).toBeNull();
    });
  });

  describe('enrichYouTubeUrl', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns enriched data for valid video', async () => {
      const result = await enrichYouTubeUrl('https://youtube.com/watch?v=test123');

      expect(result.success).toBe(true);
      expect(result.type).toBe('youtube');
      expect(result.data).toHaveProperty('title');
      expect(result.data).toHaveProperty('author');
    });

    it('handles missing transcript gracefully', async () => {
      // Mock MCP to return no transcript
      const result = await enrichYouTubeUrl('https://youtube.com/watch?v=noTranscript');

      expect(result.success).toBe(true);
      expect(result.data.hasTranscript).toBe(false);
    });
  });
});
```

---

## Dependencies

- Vitest (testing framework)
- c8 (coverage reporting)
- No additional mocking libraries needed (Vitest has built-in mocking)

---

## Notes

- Prefer Vitest over Jest for better ESM support
- Use `vi.mock()` for module mocking
- Keep tests focused - one assertion concept per test
- Use descriptive test names that explain the behavior
- Mock at the boundary (MCP calls, fetch) not internal functions
