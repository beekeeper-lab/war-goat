---
id: F002
stage: architecture
title: "Brave Search Integration"
started_at: 2026-01-17T20:00:00-05:00
completed_at: 2026-01-17T20:35:00-05:00
status: complete
handoff_ready: true
checkpoints:
  - name: requirements_addressed
    status: pass
    message: "All 7 FRs and 12 ACs mapped to design elements"
  - name: design_complete
    status: pass
    message: "Data models, APIs, components fully specified"
  - name: tasks_defined
    status: pass
    message: "13 tasks with files, descriptions, verification steps"
  - name: tests_planned
    status: pass
    message: "Unit, component, and E2E tests specified"
retry_count: 0
last_failure: null
previous_stage: 1-requirements.md
---

# Architecture & Implementation Spec: Brave Search Integration

## Work Item
- **ID**: F002
- **Requirements Doc**: workflow/F002/1-requirements.md
- **Persistent Spec**: specs/F002-brave-search-spec.md
- **Type**: Feature

## Requirements Summary

This feature adds intelligent content discovery to War Goat using Brave Search MCP. Users can:
- Search for web content, news, and videos (FR-1)
- Find content related to existing interests (FR-2)
- Get URL enrichment with related articles and summaries (FR-3)
- Filter by content type and freshness (FR-4, FR-5)
- Search from interest context "Find More Like This" (FR-6)
- Add search results directly to interests (FR-7)

## Requirements Traceability

| Requirement | Addressed By | Section |
|-------------|--------------|---------|
| FR-1: Topic Search | POST /api/search endpoint + SearchModal | API Endpoints, Components |
| FR-2: Related Content | POST /api/search/related/:id + buildRelatedQuery | API Endpoints, Service Layer |
| FR-3: URL Enrichment | webSearch + newsSearch + Summarizer | Service Layer |
| FR-4: Type Filtering | SearchModal type filter + API params | Components, API |
| FR-5: Freshness Control | SearchModal freshness filter + API params | Components, API |
| FR-6: Search from Context | InterestCard "Find Related" button | Components |
| FR-7: Add from Results | SearchResultCard "Add to Interests" | Components |
| AC-1: 3-second response | Service caching + async flow | Service Layer |
| AC-2: Pre-populated query | SearchModal initialQuery prop | Components |
| AC-3: Type filter UI | SearchModal tabs/buttons | Components |
| AC-4: Freshness filter | SearchModal dropdown | Components |
| AC-5: Add to interests | onAddToInterests callback | Components |
| AC-6: AI Summary | brave_summarizer tool | Service Layer |
| AC-7: Graceful errors | Try/catch + error state | All layers |
| AC-8: 15-min cache | Server-side Map cache | Service Layer |
| AC-9: 400-char truncation | Query validation + notification | Components |
| AC-10: Cmd+K shortcut | App.tsx useEffect | App Integration |
| AC-11: Video metadata | SearchResultCard video fields | Components |
| AC-12: News metadata | SearchResultCard news fields | Components |

## Architectural Analysis

### Current State

War Goat currently has:
- MCP infrastructure for YouTube (transcript fetching)
- `mcp-sdk-client.js` for official SDK-based MCP calls
- Modal pattern for adding interests (AddInterestModal)
- Service layer pattern (youtube.js, obsidian.js)
- Keyboard shortcut not yet implemented

### Proposed Changes

1. **New MCP Integration**: Add Brave Search MCP server using existing SDK pattern
2. **New Service**: `server/services/brave-search.js` with caching
3. **New API Endpoints**: 3 endpoints for search operations
4. **New UI Components**: SearchModal and SearchResultCard
5. **Modified Components**: Header (search button), InterestCard (Find Related)
6. **App Integration**: Keyboard shortcut, state management

### Architecture Decision Records (ADRs)

#### ADR-1: Use MCP Server for Brave Search
- **Context**: Need to integrate Brave Search API
- **Decision**: Use `@modelcontextprotocol/server-brave-search` MCP server
- **Alternatives**: Direct API calls, custom wrapper
- **Consequences**: Consistent with YouTube MCP pattern, easier maintenance

#### ADR-2: Modal-based Search UI
- **Context**: Need UI pattern for search
- **Decision**: Modal dialog accessible via Cmd/Ctrl+K
- **Alternatives**: Dedicated page, inline expansion
- **Consequences**: Quick access, familiar UX pattern

#### ADR-3: Server-side In-memory Caching
- **Context**: Need to optimize API usage (2000 queries/month)
- **Decision**: In-memory Map cache with 15-minute TTL
- **Alternatives**: Client-side, Redis, no caching
- **Consequences**: Reduced API calls, no persistence (acceptable for MVP)

## Technical Design

### Data Model Changes

```typescript
// src/types/index.ts - NEW INTERFACES

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  thumbnail?: string;
  publishedDate?: string;
  source: string;
  type: 'web' | 'news' | 'video';
  duration?: string;  // video
  age?: string;       // news
}

export interface SearchOptions {
  query: string;
  type?: 'web' | 'news' | 'video';
  freshness?: 'pd' | 'pw' | 'pm' | 'py';
  count?: number;
  summary?: boolean;
}

export interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  summary?: string;
  query: string;
  cached?: boolean;
  error?: string;
}

export interface BraveSearchStatus {
  available: boolean;
  error?: string;
}
```

### API Changes

```
POST /api/search
  Request: { query, type?, freshness?, count?, summary? }
  Response: { success, results[], summary?, query, cached }

POST /api/search/related/:id
  Request: (none - uses interest data)
  Response: { success, results[], query, generatedQuery, cached }

GET /api/search/status
  Response: { available, error? }
```

### Component Design

```
ComponentTree:
├── App.tsx (modified)
│   ├── Header.tsx (modified - add search button)
│   ├── SearchModal.tsx (NEW)
│   │   ├── SearchInput
│   │   ├── SearchFilters (type, freshness)
│   │   └── SearchResultsList
│   │       └── SearchResultCard.tsx (NEW)
│   └── InterestCard.tsx (modified - add Find Related)
```

### Service Layer

```javascript
// server/services/brave-search.js

// Configuration
const BRAVE_SEARCH_CONFIG = {
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-brave-search'],
  env: { BRAVE_API_KEY: process.env.BRAVE_API_KEY },
};

// Cache with 15-minute TTL
const cache = new Map();
const CACHE_TTL = 15 * 60 * 1000;

// Main exports
export function isAvailable(): boolean
export async function webSearch(query, options): Promise<SearchResponse>
export async function newsSearch(query, options): Promise<SearchResponse>
export async function videoSearch(query, options): Promise<SearchResponse>
export function buildRelatedQuery(item): string
export async function relatedSearch(item, options): Promise<SearchResponse>
```

## File Changes

### Files to Create

| File | Purpose |
|------|---------|
| `server/services/brave-search.js` | Brave Search MCP service with caching |
| `src/components/SearchModal.tsx` | Search modal with input, filters, results |
| `src/components/SearchResultCard.tsx` | Individual search result display |
| `src/hooks/useSearch.ts` | Search state management hook |
| `server/__tests__/brave-search.test.js` | Backend unit tests |
| `src/components/__tests__/SearchModal.test.tsx` | Frontend component tests |

### Files to Modify

| File | Changes |
|------|---------|
| `server/index.js` | Add 3 search API endpoints |
| `server/services/index.js` | Export brave-search service |
| `src/types/index.ts` | Add search interfaces |
| `src/services/api.ts` | Add search API functions |
| `src/components/InterestCard.tsx` | Add "Find Related" button |
| `src/components/Header.tsx` | Add search button |
| `src/App.tsx` | Add SearchModal, keyboard shortcut |
| `package.json` | Add MCP dependency |

### Test Files (TDD)

| File | Type | Tests to Write |
|------|------|----------------|
| `server/__tests__/brave-search.test.js` | Unit | isAvailable, buildRelatedQuery, caching, search functions |
| `src/components/__tests__/SearchModal.test.tsx` | Component | Render states, filters, add to interests |
| `e2e/tests/search.spec.ts` | E2E | Full search flow, keyboard shortcut |

## Implementation Plan (TDD)

### Phase 1: Write Failing Tests (RED)

#### Unit Tests
- [ ] `server/__tests__/brave-search.test.js`
  - Test: isAvailable returns true when BRAVE_API_KEY set
  - Test: buildRelatedQuery extracts title terms
  - Test: Cache returns cached result for identical queries
  - Test: Cache expires after 15 minutes

#### Component Tests
- [ ] `src/components/__tests__/SearchModal.test.tsx`
  - Test: Renders search input when open
  - Test: Displays results after search
  - Test: Calls onAddToInterests when button clicked
  - Test: Pre-populates from initialQuery

### Phase 2: Implement Backend (GREEN)

1. Create `server/services/brave-search.js`
2. Implement cache with Map + timestamps
3. Implement webSearch, newsSearch, videoSearch
4. Add API endpoints to `server/index.js`
5. Update `server/services/index.js` exports
6. Run unit tests - verify passing

### Phase 3: Implement Frontend (GREEN)

1. Add types to `src/types/index.ts`
2. Add API functions to `src/services/api.ts`
3. Create `SearchResultCard` component
4. Create `SearchModal` component
5. Create `useSearch` hook
6. Modify `InterestCard` - add Find Related
7. Modify `Header` - add search button
8. Integrate in `App.tsx`
9. Run component tests - verify passing

### Phase 4: Integration (GREEN)

1. Connect all pieces
2. Test with real BRAVE_API_KEY
3. Run E2E tests

### Phase 5: Refactor

1. Clean up styles
2. Add loading skeletons
3. Polish error messages

## Step-by-Step Tasks for Implementor

**IMPORTANT: Follow specs/F002-brave-search-spec.md for detailed implementation guidance.**

### Task 1: Install Dependencies
**Files**: `package.json`
**Description**: Add @modelcontextprotocol/server-brave-search
**Verification**: `npm install` succeeds

### Task 2: Add TypeScript Types
**Files**: `src/types/index.ts`
**Description**: Add SearchResult, SearchOptions, SearchResponse, BraveSearchStatus
**Test First**: TypeScript compilation
**Verification**: `npm run typecheck` passes

### Task 3: Create Brave Search Service
**Files**: `server/services/brave-search.js`, `server/__tests__/brave-search.test.js`
**Description**: Implement service with caching
**Test First**: Write unit tests
**Verification**: Tests pass

### Task 4: Export Service
**Files**: `server/services/index.js`
**Description**: Export brave-search functions
**Verification**: Imports work

### Task 5: Add API Endpoints
**Files**: `server/index.js`
**Description**: Add search endpoints
**Verification**: curl returns valid JSON

### Task 6: Add API Client
**Files**: `src/services/api.ts`
**Description**: Add search functions
**Verification**: Functions callable

### Task 7: Create SearchResultCard
**Files**: `src/components/SearchResultCard.tsx`
**Description**: Result display component
**Verification**: Renders with mock data

### Task 8: Create SearchModal
**Files**: `src/components/SearchModal.tsx`, `src/components/__tests__/SearchModal.test.tsx`
**Description**: Main search modal
**Test First**: Write component tests
**Verification**: Tests pass

### Task 9: Create useSearch Hook
**Files**: `src/hooks/useSearch.ts`
**Description**: Search state hook
**Verification**: Hook works in component

### Task 10: Modify InterestCard
**Files**: `src/components/InterestCard.tsx`
**Description**: Add Find Related button
**Verification**: Button appears, click works

### Task 11: Modify Header
**Files**: `src/components/Header.tsx`
**Description**: Add search button
**Verification**: Button appears

### Task 12: Integrate in App
**Files**: `src/App.tsx`
**Description**: Add SearchModal, keyboard shortcut
**Verification**: Cmd+K opens search

### Task 13: Final Verification
**Run all tests**:
```bash
npm run test:unit
npm run test
npm run build
```

## Acceptance Criteria Mapping

| AC | How Implemented | How Tested |
|----|-----------------|------------|
| AC-1 | SearchModal + async search | E2E timeout |
| AC-2 | initialQuery prop | Component test |
| AC-3 | Type filter tabs | Component test |
| AC-4 | Freshness dropdown | Component test |
| AC-5 | onAddToInterests callback | Component test |
| AC-6 | summary: true param | Unit test |
| AC-7 | Error state display | Component test |
| AC-8 | Cache hit logging | Unit test |
| AC-9 | Query truncation | Component test |
| AC-10 | useEffect keydown | E2E test |
| AC-11 | Video fields render | Component test |
| AC-12 | News fields render | Component test |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Rate limiting | 15-minute cache |
| API key exposure | Server-side only |
| MCP unavailable | /api/search/status check |
| Query too long | 400-char truncation |

## Open Questions Resolved

| Question | Answer |
|----------|--------|
| MCP vs Direct API? | MCP for consistency |
| Modal vs Page? | Modal for quick access |
| Cache strategy? | Server-side in-memory, 15-min TTL |
| Result enrichment? | Title, URL, desc, thumbnail, date, source |

## Handoff to Implementor Agent

### Critical Notes
1. Follow **specs/F002-brave-search-spec.md** for complete implementation details
2. BRAVE_API_KEY env var required for testing
3. Use mcp-sdk-client.js pattern for MCP calls
4. Cache key format: `{type}:{query}:{freshness}`

### Recommended Order
1. Types (enables type checking)
2. Backend service (enables API testing)
3. API endpoints (enables frontend dev)
4. Components bottom-up
5. App integration last

### Watch Out For
- MCP needs npx to spawn
- Brave Search nested result structure
- Different fields for web/news/video
- Keyboard shortcut should skip input fields

---
*Generated by Architecture Agent*
*Timestamp: 2026-01-17T20:35:00-05:00*
