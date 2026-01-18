# F002: Brave Search Integration - Implementation Spec

> **Source**: workflow/F002/2-architecture.md
> **Status**: Ready for Implementation
> **Last Updated**: 2026-01-17

## Quick Reference

### New Files to Create
1. `server/services/brave-search.js` - Brave Search MCP service layer
2. `src/components/SearchModal.tsx` - Search modal with input, filters, results
3. `src/components/SearchResultCard.tsx` - Individual search result display
4. `src/hooks/useSearch.ts` - Search state management hook
5. `server/__tests__/brave-search.test.js` - Backend service unit tests
6. `src/components/__tests__/SearchModal.test.tsx` - Frontend component tests

### Files to Modify
1. `server/index.js` - Add 3 search API endpoints
2. `server/services/index.js` - Export brave-search service
3. `src/types/index.ts` - Add search-related interfaces
4. `src/services/api.ts` - Add search API client functions
5. `src/components/InterestCard.tsx` - Add "Find Related" button
6. `src/components/Header.tsx` - Add search button with keyboard shortcut
7. `src/App.tsx` - Add SearchModal state and integration
8. `package.json` - Add @modelcontextprotocol/server-brave-search dependency

### API Endpoints
- `POST /api/search` - General web/news/video search
- `POST /api/search/related/:id` - Find related content for an interest
- `GET /api/search/status` - Check Brave Search availability

---

## Architecture Decisions

### ADR-1: Use MCP Server for Brave Search
**Context**: Need to integrate Brave Search API into War Goat.
**Decision**: Use the official `@modelcontextprotocol/server-brave-search` MCP server for consistency with existing YouTube MCP integration.
**Alternatives**: Direct API calls, custom wrapper library.
**Consequences**: Consistent architecture, leverages existing MCP infrastructure, requires BRAVE_API_KEY env var.

### ADR-2: Modal-based Search UI
**Context**: Need a UI pattern for search functionality.
**Decision**: Use a modal dialog (similar to AddInterestModal) accessible via Cmd/Ctrl+K.
**Alternatives**: Dedicated search page, inline expansion in header.
**Consequences**: Quick access, non-disruptive, familiar pattern from other apps.

### ADR-3: Server-side Result Caching
**Context**: Need to optimize API usage (2,000 queries/month free tier).
**Decision**: Implement in-memory cache on server with 15-minute TTL using Map with timestamp tracking.
**Alternatives**: Client-side caching, Redis, no caching.
**Consequences**: Reduced API calls, faster repeated searches, no persistence across restarts (acceptable for MVP).

---

## Technical Design

### Data Models

```typescript
// src/types/index.ts - Add these interfaces

// Search result from Brave API
export interface SearchResult {
  title: string;
  url: string;
  description: string;
  thumbnail?: string;
  publishedDate?: string;
  source: string;
  type: 'web' | 'news' | 'video';
  // Video-specific
  duration?: string;
  // News-specific
  age?: string;
}

// Search request options
export interface SearchOptions {
  query: string;
  type?: 'web' | 'news' | 'video';
  freshness?: 'pd' | 'pw' | 'pm' | 'py';  // past day/week/month/year
  count?: number;
  summary?: boolean;
}

// Search response
export interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  summary?: string;
  query: string;
  cached?: boolean;
  error?: string;
}

// Related search response (includes the generated query)
export interface RelatedSearchResponse extends SearchResponse {
  generatedQuery: string;
}

// Brave Search status
export interface BraveSearchStatus {
  available: boolean;
  error?: string;
}
```

### API Endpoints

#### POST /api/search
General search across web, news, or video.

```typescript
// Request
{
  query: string;        // Required, max 400 chars
  type?: 'web' | 'news' | 'video';  // Default: 'web'
  freshness?: 'pd' | 'pw' | 'pm' | 'py';  // Optional time filter
  count?: number;       // Default: 10, max: 20
  summary?: boolean;    // Default: false, request AI summary
}

// Response
{
  success: true,
  results: SearchResult[],
  summary?: string,
  query: string,
  cached: boolean
}
```

#### POST /api/search/related/:id
Find content related to an existing interest.

```typescript
// No request body needed - uses interest data

// Response
{
  success: true,
  results: SearchResult[],
  query: string,           // Original interest query data
  generatedQuery: string,  // The search query we built
  cached: boolean
}
```

#### GET /api/search/status
Check if Brave Search is available.

```typescript
// Response
{
  available: true
}
// or
{
  available: false,
  error: "BRAVE_API_KEY not configured"
}
```

### Service Layer Design

```javascript
// server/services/brave-search.js

/**
 * Brave Search Service
 *
 * Provides search functionality using Brave Search MCP.
 * Includes caching for performance optimization.
 */

import { callTool, createMCPClient } from './mcp-sdk-client.js';

// Cache configuration
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const cache = new Map();

// Brave Search MCP configuration
const BRAVE_SEARCH_CONFIG = {
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-brave-search'],
  env: {
    BRAVE_API_KEY: process.env.BRAVE_API_KEY,
  },
};

/**
 * Check if Brave Search is available
 */
export function isAvailable() {
  return !!process.env.BRAVE_API_KEY;
}

/**
 * Get cached result or null
 */
function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Set cache entry
 */
function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Build cache key from search params
 */
function buildCacheKey(type, query, freshness) {
  return `${type}:${query}:${freshness || 'any'}`;
}

/**
 * Perform web search
 */
export async function webSearch(query, options = {}) {
  const { freshness, count = 10, summary = false } = options;
  const cacheKey = buildCacheKey('web', query, freshness);

  const cached = getCached(cacheKey);
  if (cached) return { ...cached, cached: true };

  const result = await callTool(BRAVE_SEARCH_CONFIG, 'brave_web_search', {
    query,
    count,
    freshness,
    summary,
  });

  const parsed = parseWebResults(result);
  setCache(cacheKey, parsed);
  return { ...parsed, cached: false };
}

/**
 * Perform news search
 */
export async function newsSearch(query, options = {}) {
  const { freshness = 'pw', count = 10 } = options;
  const cacheKey = buildCacheKey('news', query, freshness);

  const cached = getCached(cacheKey);
  if (cached) return { ...cached, cached: true };

  const result = await callTool(BRAVE_SEARCH_CONFIG, 'brave_news_search', {
    query,
    count,
    freshness,
  });

  const parsed = parseNewsResults(result);
  setCache(cacheKey, parsed);
  return { ...parsed, cached: false };
}

/**
 * Perform video search
 */
export async function videoSearch(query, options = {}) {
  const { freshness, count = 10 } = options;
  const cacheKey = buildCacheKey('video', query, freshness);

  const cached = getCached(cacheKey);
  if (cached) return { ...cached, cached: true };

  const result = await callTool(BRAVE_SEARCH_CONFIG, 'brave_video_search', {
    query,
    count,
    freshness,
  });

  const parsed = parseVideoResults(result);
  setCache(cacheKey, parsed);
  return { ...parsed, cached: false };
}

/**
 * Generate search query from interest item
 */
export function buildRelatedQuery(item) {
  const parts = [];

  // Use title as primary query
  if (item.title) {
    // Extract key terms from title (remove common words)
    const titleTerms = item.title
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 4)
      .join(' ');
    parts.push(titleTerms);
  }

  // Add primary category if available
  if (item.categories && item.categories[0]) {
    parts.push(item.categories[0]);
  }

  // Combine and limit to 400 chars
  return parts.join(' ').slice(0, 400);
}

/**
 * Search for content related to an interest
 */
export async function relatedSearch(item, options = {}) {
  const generatedQuery = buildRelatedQuery(item);
  const result = await webSearch(generatedQuery, options);
  return {
    ...result,
    generatedQuery,
  };
}

// Result parsers
function parseWebResults(result) { /* ... */ }
function parseNewsResults(result) { /* ... */ }
function parseVideoResults(result) { /* ... */ }
```

### Component Design

```
ComponentTree:
├── App.tsx
│   ├── Header.tsx (modified - add search button)
│   ├── SearchModal.tsx (NEW)
│   │   ├── SearchInput (internal)
│   │   ├── SearchFilters (internal)
│   │   ├── SearchResultsList (internal)
│   │   │   └── SearchResultCard.tsx (NEW)
│   │   └── LoadingState / ErrorState
│   └── InterestCard.tsx (modified - add Find Related)
```

#### SearchModal Component
```typescript
// src/components/SearchModal.tsx

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToInterests: (result: SearchResult) => void;
  initialQuery?: string;  // For "Find Related" pre-population
}

// Internal state:
// - query: string
// - type: 'web' | 'news' | 'video'
// - freshness: string | undefined
// - results: SearchResult[]
// - loading: boolean
// - error: string | null
// - summary: string | null
```

#### SearchResultCard Component
```typescript
// src/components/SearchResultCard.tsx

interface SearchResultCardProps {
  result: SearchResult;
  onAddToInterests: () => void;
}

// Displays:
// - Thumbnail (if video)
// - Title (linked to URL)
// - Description (truncated)
// - Source domain
// - Published date / age
// - "Add to Interests" button
```

### Keyboard Shortcut Integration

```typescript
// In App.tsx or custom hook
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Cmd/Ctrl + K opens search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setShowSearchModal(true);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## File Changes Detail

### Files to Create

| File | Purpose |
|------|---------|
| `server/services/brave-search.js` | Service layer wrapping Brave Search MCP with caching |
| `src/components/SearchModal.tsx` | Main search modal with input, filters, results |
| `src/components/SearchResultCard.tsx` | Individual search result card component |
| `src/hooks/useSearch.ts` | Custom hook for search state management |
| `server/__tests__/brave-search.test.js` | Unit tests for brave-search service |
| `src/components/__tests__/SearchModal.test.tsx` | Component tests for SearchModal |

### Files to Modify

| File | Changes |
|------|---------|
| `server/index.js` | Add POST /api/search, POST /api/search/related/:id, GET /api/search/status |
| `server/services/index.js` | Export brave-search service functions |
| `src/types/index.ts` | Add SearchResult, SearchOptions, SearchResponse, BraveSearchStatus interfaces |
| `src/services/api.ts` | Add search(), searchRelated(), getSearchStatus() functions |
| `src/components/InterestCard.tsx` | Add "Find Related" button (Search icon) |
| `src/components/Header.tsx` | Add search button with Cmd+K hint |
| `src/App.tsx` | Add SearchModal state, keyboard shortcut, handlers |
| `package.json` | Add @modelcontextprotocol/server-brave-search |

### Test Files (TDD)

| File | Type | Tests to Write |
|------|------|----------------|
| `server/__tests__/brave-search.test.js` | Unit | Cache TTL, query building, result parsing |
| `src/components/__tests__/SearchModal.test.tsx` | Component | Render, search flow, filters, add to interests |
| `e2e/tests/search.spec.ts` | E2E | Full search flow, keyboard shortcut, caching |

---

## Implementation Plan (TDD)

### Phase 1: Write Failing Tests (RED)

#### Unit Tests - Backend
```javascript
// server/__tests__/brave-search.test.js

describe('brave-search service', () => {
  describe('isAvailable', () => {
    test('returns true when BRAVE_API_KEY is set');
    test('returns false when BRAVE_API_KEY is missing');
  });

  describe('buildRelatedQuery', () => {
    test('extracts key terms from title');
    test('includes primary category');
    test('limits to 400 characters');
    test('handles items with no categories');
  });

  describe('caching', () => {
    test('returns cached result for identical queries');
    test('cache expires after 15 minutes');
    test('different query types have separate cache entries');
  });

  describe('webSearch', () => {
    test('calls brave_web_search with correct params');
    test('parses results correctly');
    test('handles API errors gracefully');
  });
});
```

#### Component Tests - Frontend
```typescript
// src/components/__tests__/SearchModal.test.tsx

describe('SearchModal', () => {
  test('renders search input when open');
  test('does not render when closed');
  test('displays loading state during search');
  test('displays results after successful search');
  test('displays error message on failure');
  test('calls onAddToInterests when button clicked');
  test('filters by type correctly');
  test('filters by freshness correctly');
  test('pre-populates query from initialQuery prop');
  test('truncates query over 400 characters with notification');
});
```

### Phase 2: Implement Backend (GREEN)

1. **Create brave-search service**
   - Create `server/services/brave-search.js`
   - Implement cache with Map + timestamps
   - Implement webSearch, newsSearch, videoSearch
   - Implement buildRelatedQuery
   - Implement result parsers

2. **Add API endpoints**
   - Add POST /api/search in server/index.js
   - Add POST /api/search/related/:id
   - Add GET /api/search/status
   - Wire up error handling

3. **Update service exports**
   - Export from server/services/index.js

4. **Run unit tests** - verify passing

### Phase 3: Implement Frontend (GREEN)

1. **Add TypeScript types**
   - Add interfaces to src/types/index.ts

2. **Add API client functions**
   - Add search functions to src/services/api.ts

3. **Create SearchResultCard component**
   - Display result with title, description, source
   - Add "Add to Interests" button

4. **Create SearchModal component**
   - Search input with debounce
   - Type filter (web/news/video)
   - Freshness filter
   - Results list
   - Loading/error states

5. **Create useSearch hook**
   - Manage search state
   - Handle debounced queries

6. **Modify InterestCard**
   - Add "Find Related" button

7. **Modify Header**
   - Add search button

8. **Modify App.tsx**
   - Add SearchModal integration
   - Add keyboard shortcut
   - Handle "Add to Interests" from search

9. **Run component tests** - verify passing

### Phase 4: Integration (GREEN)

1. Wire up full flow
2. Test with real Brave Search API
3. Run E2E tests

### Phase 5: Refactor

1. Extract common styles
2. Clean up error messages
3. Add loading skeletons if needed

---

## Step-by-Step Tasks for Implementor

### Task 1: Install Dependencies
**Files**: `package.json`
**Description**: Add Brave Search MCP server dependency
**Test First**: N/A (dependency)
**Commands**:
```bash
npm install @modelcontextprotocol/server-brave-search
```
**Verification**: Package appears in package.json

### Task 2: Add TypeScript Types
**Files**: `src/types/index.ts`
**Description**: Add SearchResult, SearchOptions, SearchResponse, BraveSearchStatus interfaces
**Test First**: Type checking compilation
**Verification**: `npm run typecheck` passes

### Task 3: Create Brave Search Service
**Files**: `server/services/brave-search.js`, `server/__tests__/brave-search.test.js`
**Description**: Implement brave-search service with caching
**Test First**: Write unit tests for isAvailable, buildRelatedQuery, caching
**Verification**: `npm run test:unit -- brave-search` passes

### Task 4: Export Service
**Files**: `server/services/index.js`
**Description**: Export brave-search functions
**Verification**: Imports work in server/index.js

### Task 5: Add API Endpoints
**Files**: `server/index.js`
**Description**: Add POST /api/search, POST /api/search/related/:id, GET /api/search/status
**Test First**: Integration tests for endpoints
**Verification**: `curl http://localhost:3001/api/search/status` returns valid JSON

### Task 6: Add API Client Functions
**Files**: `src/services/api.ts`
**Description**: Add search(), searchRelated(), getSearchStatus() functions
**Verification**: Functions can be imported and called

### Task 7: Create SearchResultCard Component
**Files**: `src/components/SearchResultCard.tsx`
**Description**: Component to display a single search result
**Test First**: Write component tests for rendering
**Verification**: Component renders with mock data

### Task 8: Create SearchModal Component
**Files**: `src/components/SearchModal.tsx`, `src/components/__tests__/SearchModal.test.tsx`
**Description**: Main search modal with input, filters, results
**Test First**: Write component tests for all states
**Verification**: Modal renders and tests pass

### Task 9: Create useSearch Hook
**Files**: `src/hooks/useSearch.ts`
**Description**: Custom hook for search state management with debounce
**Verification**: Hook can be used in component

### Task 10: Modify InterestCard
**Files**: `src/components/InterestCard.tsx`
**Description**: Add "Find Related" button with Search icon
**Verification**: Button appears on cards, click handler works

### Task 11: Modify Header
**Files**: `src/components/Header.tsx`
**Description**: Add search button with Cmd+K keyboard hint
**Verification**: Button appears in header

### Task 12: Integrate in App.tsx
**Files**: `src/App.tsx`
**Description**: Add SearchModal state, keyboard shortcut, add-to-interests handler
**Verification**: Cmd+K opens search, results can be added to interests

### Task 13: Final Verification
**Run all tests**:
```bash
npm run test:unit
npm run test
npm run build
npm run typecheck
```
**Manual testing**:
- Set BRAVE_API_KEY env var
- Open app, press Cmd+K
- Search for a topic
- Filter by type and freshness
- Click "Add to Interests" on a result
- Verify item added to list
- Click "Find Related" on an existing item
- Verify search opens with pre-populated query

---

## Acceptance Criteria Mapping

| AC | How Implemented | How Tested |
|----|-----------------|------------|
| AC-1 | SearchModal displays results within 3s | E2E test with timeout assertion |
| AC-2 | InterestCard "Find Related" passes query to SearchModal | Component test + E2E |
| AC-3 | SearchModal type filter tabs | Component test for filter state |
| AC-4 | SearchModal freshness dropdown | Component test for filter state |
| AC-5 | SearchResultCard "Add to Interests" calls createInterest | Component test + integration |
| AC-6 | brave-search service requests summary | Unit test for params |
| AC-7 | Error boundary + graceful error state | Component test for error display |
| AC-8 | Cache returns cached results | Unit test for cache behavior |
| AC-9 | Query truncation with notification | Component test for long query |
| AC-10 | Keyboard shortcut + header button | E2E test for accessibility |
| AC-11 | Video results show thumbnail/duration | Component test for SearchResultCard |
| AC-12 | News results show date/source | Component test for SearchResultCard |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| API rate limiting (2000/month) | 15-minute server-side cache reduces redundant calls |
| API key exposure | Server-side only; never sent to frontend |
| MCP server unavailable | /api/search/status endpoint, disable search when unavailable |
| Query too long | Frontend truncates at 400 chars with user notification |

---

## Handoff to Implementor Agent

### Critical Notes
1. **BRAVE_API_KEY Required**: Set env var before testing
2. **MCP SDK Pattern**: Follow existing mcp-sdk-client.js pattern
3. **Cache Key Format**: `{type}:{query}:{freshness}` for uniqueness
4. **Modal Pattern**: Mirror AddInterestModal structure and styling

### Recommended Order
1. Types first (enables TypeScript checking throughout)
2. Backend service (enables API testing)
3. API endpoints (enables frontend development)
4. Components bottom-up (SearchResultCard before SearchModal)
5. Integration last (App.tsx changes)

### Watch Out For
- MCP server needs npx to spawn - ensure Node.js available
- Brave Search returns nested result structure - check parsing
- Video results have different fields than web results
- Cache should use query + type + freshness as composite key
- Keyboard shortcut should not fire when in input fields (check event target)

---

*Generated by Architecture Agent*
*Timestamp: 2026-01-17T20:30:00-05:00*
