---
id: F004
stage: architecture
title: "Article/Web Page Enrichment"
started_at: 2026-01-17T18:30:00-05:00
completed_at: 2026-01-17T19:15:00-05:00
status: complete
handoff_ready: true
checkpoints:
  - name: requirements_addressed
    status: pass
    message: "All 8 FRs and 14 ACs mapped to design elements"
  - name: design_complete
    status: pass
    message: "Data models, APIs, and components fully specified"
  - name: tasks_defined
    status: pass
    message: "12 implementation tasks with verification steps"
  - name: tests_planned
    status: pass
    message: "Unit and E2E tests specified for TDD approach"
retry_count: 0
last_failure: null
previous_stage: 1-requirements.md
---

# Architecture & Implementation Spec: Article/Web Page Enrichment

## Work Item
- **ID**: F004
- **Requirements Doc**: workflow/F004/1-requirements.md
- **Type**: Feature

## Requirements Summary

This feature extends War Goat's content enrichment from YouTube videos to general web articles. When a user pastes an article URL, the system automatically extracts readable content (stripping ads/navigation), extracts metadata (title, author, site name, publication date, thumbnail), stores article content in a lazy-loading pattern (`data/articles/`), and enables AI-powered summaries. A reader mode view displays articles in a clean, distraction-free format.

## Requirements Traceability

| Requirement | Addressed By | Section |
|-------------|--------------|---------|
| FR-1: Auto-Extract Article Content | `extractArticle()` in article.js using Readability | Technical Design > Service Layer |
| FR-2: Article Metadata Extraction | `extractMetadata()` parsing og: tags and DOM | Technical Design > Service Layer |
| FR-3: Reader Mode View | ArticleReader component with prose classes | Technical Design > Component Design |
| FR-4: AI Article Summary | `generateArticleSummary()` reusing obsidian.js pattern | Technical Design > Service Layer |
| FR-5: Article Series Detection | `detectSeries()` checking nav patterns | Technical Design > Service Layer |
| FR-6: Documentation Site Support | Doc site URL pattern matching | Technical Design > Service Layer |
| FR-7: Content Storage | `data/articles/{id}.txt` storage pattern | Technical Design > Data Model |
| FR-8: Fallback for Protected Content | `articleError` field + manual entry UI | Technical Design > Data Model |
| AC-1 through AC-14 | See Acceptance Criteria Mapping below | Implementation Plan |

## Architectural Analysis

### Current State

The system currently supports YouTube URL enrichment with this flow:
1. `AddInterestModal.tsx` detects YouTube URLs via `isYouTubeUrl()`
2. Calls `enrichUrl()` in `src/services/enrich.ts`
3. Backend `/api/enrich` routes to `enrichYouTubeUrl()` in `server/services/youtube.js`
4. Metadata fetched via oEmbed API, transcript via MCP
5. Transcript stored in `data/transcripts/{id}.txt`, loaded lazily
6. `InterestDetail.tsx` displays expandable transcript section

Key patterns to reuse:
- Service layer pattern (`server/services/youtube.js`)
- Lazy content storage (`data/transcripts/` → `data/articles/`)
- MCP client for external integrations
- Enrichment status UI in AddInterestModal
- Content expansion in InterestDetail

### Proposed Changes

1. **New Service**: Create `server/services/article.js` following youtube.js pattern
2. **Extended API**: Add article detection and enrichment path in `/api/enrich`
3. **New Storage**: Add `data/articles/` directory for article content
4. **Extended Types**: Add article-specific fields to InterestItem
5. **Extended Frontend**:
   - Trigger enrichment for article URLs in AddInterestModal
   - Add reader mode view in InterestDetail
6. **New Dependencies**: Add `@mozilla/readability` and `jsdom` for content extraction

### Architecture Decision Records (ADRs)

#### ADR-1: Content Extraction Library
- **Context**: Need to extract readable article content from arbitrary web pages
- **Decision**: Use `@mozilla/readability` with `jsdom` for DOM parsing
- **Alternatives Considered**:
  - Custom regex parsing (fragile, maintenance burden)
  - Playwright MCP (heavier, adds complexity)
  - `cheerio` only (no built-in readability algorithm)
- **Consequences**: Battle-tested library (Firefox Reader Mode), good extraction quality for standard articles

#### ADR-2: Content Storage Format
- **Context**: How to store extracted article content
- **Decision**: Store as plain text in `data/articles/{id}.txt`, matching transcript pattern
- **Alternatives Considered**:
  - Store HTML (preserves formatting but larger, security concerns)
  - Store in db.json (bloats main database)
  - Store Markdown (requires conversion, adds complexity)
- **Consequences**: Simple, consistent with existing pattern, may lose some formatting

#### ADR-3: AI Summary Integration
- **Context**: How to generate AI summaries for articles
- **Decision**: Reuse `generateStudyNotes()` pattern from obsidian.js with article-specific prompt
- **Alternatives Considered**:
  - Separate MCP server (over-engineered)
  - Client-side summarization (no Claude access)
- **Consequences**: Consistent UX, reuses existing Anthropic SDK integration

#### ADR-4: Article URL Detection
- **Context**: How to distinguish article URLs from other URL types
- **Decision**: Default to `article` type for any `http(s)://` URL not matching specific patterns (YouTube, GitHub, etc.)
- **Alternatives Considered**:
  - Explicit article domain list (too limiting)
  - Content-type sniffing (requires HTTP request)
- **Consequences**: Broad support, may attempt extraction on non-article pages (handled by error fallback)

## Technical Design

### Data Model Changes

```typescript
// Additions to src/types/index.ts

export interface InterestItem {
  // ... existing fields ...

  // Article-specific fields (new)
  articleContent?: string;      // Stored separately in data/articles/{id}.txt
  hasArticleContent?: boolean;  // Flag for lazy loading
  articleError?: string;        // Extraction failure reason
  excerpt?: string;             // First ~200 chars for preview
  wordCount?: number;           // Total word count
  readingTime?: number;         // Estimated minutes (words / 200)
  siteName?: string;            // og:site_name or domain
  publishedDate?: string;       // Article publication date
  isDocumentation?: boolean;    // Documentation site flag
  seriesInfo?: {                // Series detection result
    isPart: boolean;
    prevUrl?: string;
    nextUrl?: string;
    breadcrumbs?: string[];
  };
}

// Extend EnrichedCreateInput
export interface EnrichedCreateInput extends CreateInterestInput {
  // ... existing fields ...
  articleContent?: string;
  excerpt?: string;
  wordCount?: number;
  readingTime?: number;
  siteName?: string;
  publishedDate?: string;
  isDocumentation?: boolean;
  seriesInfo?: SeriesInfo;
}
```

### API Changes

```
POST /api/enrich
  Request: { url: string }
  Response (article): {
    success: boolean,
    type: 'article',
    data: {
      url: string,
      type: 'article',
      title: string,
      author?: string,
      siteName?: string,
      publishedDate?: string,
      thumbnail?: string,
      excerpt: string,
      articleContent: string,
      wordCount: number,
      readingTime: number,
      isDocumentation: boolean,
      seriesInfo?: SeriesInfo,
      articleError?: string
    }
  }

GET /api/articles/:id
  Response: { id: string, content: string } | { id: string, error: string, content: null }

PUT /api/articles/:id
  Request: { content: string }
  Response: { id: string, success: boolean }
```

### Component Design

```
ComponentTree (InterestDetail.tsx modifications):
├── InterestDetail
│   ├── Header (type icon, close button)
│   ├── Thumbnail
│   ├── Metadata (title, author, reading time - enhanced)
│   ├── Description
│   ├── OpenOriginal link
│   ├── StatusEditor
│   ├── TagsEditor
│   ├── NotesEditor
│   ├── TranscriptSection (existing - for YouTube)
│   ├── ArticleReaderSection (NEW)
│   │   ├── ExpandToggle ("Read Article")
│   │   ├── ArticleMetadata (word count, reading time, site name)
│   │   ├── ArticleContent (prose-styled, lazy-loaded)
│   │   └── TruncationNotice (if over 100KB)
│   └── ActionButtons
│       ├── GenerateSummary (NEW - for articles)
│       ├── ExportToObsidian
│       └── SaveChanges
```

### Service Layer

```javascript
// server/services/article.js

/**
 * Check if URL should be treated as an article
 * @param {string} url
 * @returns {boolean}
 */
export function isArticleUrl(url) {
  // Returns true for http(s) URLs not matching YouTube, GitHub, etc.
}

/**
 * Detect known documentation site patterns
 * @param {string} url
 * @returns {{ isDocumentation: boolean, platform?: string }}
 */
export function detectDocumentationSite(url) {
  // Check for ReadTheDocs, GitBook, Docusaurus patterns
}

/**
 * Extract article metadata from HTML
 * @param {Document} document - Parsed DOM
 * @param {string} url - Original URL
 * @returns {Object} - { title, author, siteName, publishedDate, thumbnail }
 */
export function extractMetadata(document, url) {
  // Parse og: tags, meta tags, and DOM elements
}

/**
 * Detect if article is part of a series
 * @param {Document} document
 * @returns {Object} - { isPart, prevUrl, nextUrl, breadcrumbs }
 */
export function detectSeries(document) {
  // Check for prev/next links, breadcrumbs, numbered titles
}

/**
 * Extract readable article content
 * @param {string} html - Raw HTML
 * @param {string} url - Original URL
 * @returns {Promise<Object>} - { content, excerpt, wordCount, readingTime }
 */
export async function extractArticle(html, url) {
  // Use Readability to parse, calculate metrics
}

/**
 * Fetch and extract article from URL
 * @param {string} url
 * @returns {Promise<Object>} - Full extraction result
 */
export async function fetchAndExtract(url) {
  // Fetch HTML, run extraction pipeline
}

/**
 * Full article enrichment
 * @param {string} url
 * @returns {Promise<Object>} - Enrichment result matching API response shape
 */
export async function enrichArticleUrl(url) {
  // Orchestrate full enrichment flow
}

/**
 * Generate AI summary for article content
 * @param {string} content - Article text
 * @param {string} title - Article title
 * @returns {Promise<Object>} - Summary with key points
 */
export async function generateArticleSummary(content, title) {
  // Reuse study notes pattern with article-specific prompt
}
```

## File Changes

### Files to Create

| File | Purpose |
|------|---------|
| `server/services/article.js` | Article extraction and enrichment service |
| `data/articles/.gitkeep` | Directory for article content storage |
| `server/__tests__/article.test.js` | Unit tests for article service |

### Files to Modify

| File | Changes |
|------|---------|
| `server/index.js` | Add article enrichment path in `/api/enrich`, add `/api/articles/:id` routes |
| `server/services/index.js` | Export article service functions |
| `src/types/index.ts` | Add article-specific fields to InterestItem |
| `src/services/enrich.ts` | Add `isArticleUrl()` detection |
| `src/services/api.ts` | Add `fetchArticleContent()`, `saveArticleContent()` functions |
| `src/components/AddInterestModal.tsx` | Extend auto-enrichment for article URLs |
| `src/components/InterestDetail.tsx` | Add ArticleReaderSection, GenerateSummary button |
| `package.json` | Add `@mozilla/readability` and `jsdom` dependencies |

### Test Files (TDD)

| File | Type | Tests to Write |
|------|------|----------------|
| `server/__tests__/article.test.js` | Unit | `isArticleUrl()`, `extractMetadata()`, `detectSeries()`, `extractArticle()` |
| `e2e/tests/article-enrichment.spec.ts` | E2E | Full enrichment flow, reader mode display |

## Implementation Plan (TDD)

### Phase 1: Write Failing Tests (RED)

#### Unit Tests
- [ ] `server/__tests__/article.test.js`
  - Test: `isArticleUrl()` returns true for standard URLs, false for YouTube/GitHub
  - Test: `detectDocumentationSite()` identifies ReadTheDocs, GitBook, Docusaurus
  - Test: `extractMetadata()` parses og:title, og:image, author meta tags
  - Test: `detectSeries()` finds prev/next links and breadcrumbs
  - Test: `extractArticle()` returns content, excerpt, wordCount, readingTime
  - Test: `enrichArticleUrl()` returns properly shaped result object

### Phase 2: Implement Backend (GREEN)

1. Install dependencies: `npm install @mozilla/readability jsdom`
2. Create `server/services/article.js` with all functions
3. Update `server/services/index.js` exports
4. Extend `/api/enrich` in `server/index.js`
5. Add `/api/articles/:id` routes
6. Run unit tests - verify they pass

### Phase 3: Implement Frontend (GREEN)

1. Update `src/types/index.ts` with article fields
2. Update `src/services/enrich.ts` with `isArticleUrl()`
3. Update `src/services/api.ts` with article content functions
4. Extend `AddInterestModal.tsx` for article enrichment
5. Add ArticleReaderSection to `InterestDetail.tsx`
6. Add GenerateSummary button functionality

### Phase 4: Integration (GREEN)

1. Test full flow: paste article URL → enrichment → reader mode
2. Test AI summary generation
3. Verify article content lazy loading
4. Test extraction error handling

### Phase 5: Refactor

1. Extract common patterns between YouTube and article services
2. Ensure consistent error handling
3. Add performance logging

## Step-by-Step Tasks for Implementor

IMPORTANT: Execute in order. Each step should be completable independently.

### Task 1: Add Dependencies
**Files**: `package.json`
**Description**: Install `@mozilla/readability` and `jsdom` packages
**Test First**: N/A (dependency installation)
**Verification**: `npm install` succeeds, packages in node_modules

### Task 2: Create Article Service Tests
**Files**: `server/__tests__/article.test.js`
**Description**: Write unit tests for article service functions (RED phase)
**Test First**: This IS the test-first step
**Verification**: Tests exist and fail (functions not implemented yet)

### Task 3: Create Article Service
**Files**: `server/services/article.js`, `server/services/index.js`
**Description**: Implement `isArticleUrl()`, `detectDocumentationSite()`, `extractMetadata()`, `detectSeries()`, `extractArticle()`, `fetchAndExtract()`, `enrichArticleUrl()`
**Test First**: Tests from Task 2
**Verification**: `npm test server/__tests__/article.test.js` passes

### Task 4: Create Articles Directory
**Files**: `data/articles/.gitkeep`
**Description**: Create storage directory for article content files
**Test First**: N/A (directory creation)
**Verification**: Directory exists

### Task 5: Add Article API Routes
**Files**: `server/index.js`
**Description**:
- Extend `/api/enrich` to call `enrichArticleUrl()` for article URLs
- Add `GET /api/articles/:id` route
- Add `PUT /api/articles/:id` route
**Test First**: Manual API test with curl
**Verification**:
- `curl -X POST localhost:3001/api/enrich -H "Content-Type: application/json" -d '{"url":"https://example.com/article"}'` returns article data
- `curl localhost:3001/api/articles/test-id` returns 404 (no content yet)

### Task 6: Update TypeScript Types
**Files**: `src/types/index.ts`
**Description**: Add article-specific fields to `InterestItem`, `EnrichedCreateInput`
**Test First**: TypeScript compilation
**Verification**: `npm run build` succeeds (type-checks pass)

### Task 7: Update Frontend Enrich Service
**Files**: `src/services/enrich.ts`
**Description**: Add `isArticleUrl()` function that returns true for http(s) URLs not matching other patterns
**Test First**: N/A (simple function)
**Verification**: Import and call in browser console

### Task 8: Update Frontend API Service
**Files**: `src/services/api.ts`
**Description**: Add `fetchArticleContent(id)` and `saveArticleContent(id, content)` functions following transcript pattern
**Test First**: N/A
**Verification**: Functions callable, TypeScript compiles

### Task 9: Extend AddInterestModal for Articles
**Files**: `src/components/AddInterestModal.tsx`
**Description**:
- Import and use `isArticleUrl()` to detect article URLs
- Trigger enrichment with message "Extracting content..."
- Display article metadata when enriched (title, author, siteName)
- Show excerpt preview instead of transcript
**Test First**: Manual UI test
**Verification**: Pasting an article URL triggers enrichment, metadata populates

### Task 10: Add Article Reader to InterestDetail
**Files**: `src/components/InterestDetail.tsx`
**Description**:
- Add ArticleReaderSection component (expandable like transcript)
- Show article metadata: word count, reading time, site name
- Lazy-load article content when expanded
- Use Tailwind prose classes for reader mode styling
- Show truncation notice if applicable
**Test First**: Manual UI test
**Verification**: Article items show "Read Article" section, expands to show content

### Task 11: Add Generate Summary Feature
**Files**: `src/components/InterestDetail.tsx`, `src/services/api.ts`, `server/index.js`
**Description**:
- Add "Generate Summary" button for articles
- Add `/api/articles/:id/summary` endpoint
- Call `generateArticleSummary()` (pattern from obsidian.js)
- Display summary in article detail view
**Test First**: Manual test
**Verification**: Clicking Generate Summary produces AI summary

### Task 12: Final Verification
**Files**: All
**Description**: End-to-end testing of complete flow
**Test First**: N/A
**Verification**:
```bash
npm run build
npm run dev:full
# In browser:
# 1. Paste article URL → enrichment triggers
# 2. Title, author, thumbnail populate
# 3. Save interest
# 4. Open detail → reader mode available
# 5. Generate Summary works
# 6. Check data/articles/ for stored content
```

## Acceptance Criteria Mapping

| AC | How Implemented | How Tested |
|----|-----------------|------------|
| AC-1 | AddInterestModal detects article URLs, shows "Extracting content..." | Manual: paste article URL |
| AC-2 | `extractMetadata()` parses `<title>` and `og:title` | Unit test + manual |
| AC-3 | `extractMetadata()` parses author meta tag and byline | Unit test + manual |
| AC-4 | `extractMetadata()` gets `og:image` or first content image | Unit test + manual |
| AC-5 | ArticleReaderSection in InterestDetail | Manual: open article detail |
| AC-6 | Reader mode shows title, author, date, prose-styled body | Manual: expand reader section |
| AC-7 | `extractArticle()` calculates wordCount, readingTime displayed | Unit test + manual |
| AC-8 | Generate Summary button calls AI, displays result | Manual test |
| AC-9 | Content saved to `data/articles/{id}.txt`, `hasArticleContent` flag | Check filesystem + API |
| AC-10 | `articleError` field populated, UI shows manual entry option | Test with blocked URL |
| AC-11 | `extractArticle()` truncates at 100KB, sets truncation notice | Unit test with large content |
| AC-12 | `detectDocumentationSite()` identifies platform, `isDocumentation` flag | Unit test |
| AC-13 | `extractMetadata()` populates `siteName` from og:site_name or domain | Unit test |
| AC-14 | Enrichment completes within 10s (measured) | Performance test |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| JavaScript-rendered content fails to extract | Detect common SPA patterns, show clear error with manual entry fallback |
| Paywall/login detection false positives | Conservative detection (look for explicit paywall markers), allow manual override |
| Content extraction quality varies | Use well-tested Readability library; manual content entry fallback |
| Rate limiting by target sites | Implement request delays; extraction is user-initiated (not bulk) |
| Large articles cause storage issues | 100KB content cap with truncation notice |

## Open Questions Resolved

| Question | Answer |
|----------|--------|
| Q1: Content extraction library? | Use `@mozilla/readability` with `jsdom` |
| Q2: JavaScript-heavy page handling? | Start with static fetch; Playwright MCP as future enhancement |
| Q3: Article content storage format? | Plain text in `data/articles/`, matching transcript pattern |
| Q4: AI summary provider? | Reuse existing Anthropic SDK integration from obsidian.js |
| Q5: Reader mode styling? | Use Tailwind prose classes for clean typography |

## Handoff to Implementor Agent

### Critical Notes

1. **Follow TDD pattern**: Write tests FIRST for the article service functions before implementing them
2. **Mirror YouTube pattern**: The article service should closely follow `server/services/youtube.js` structure
3. **Lazy loading is critical**: Article content must be stored separately in `data/articles/` and loaded on-demand, NOT stored in db.json
4. **Error handling**: Always populate `articleError` field when extraction fails rather than throwing
5. **Content size limit**: Enforce 100KB cap to prevent storage bloat

### Recommended Order

1. Dependencies first (Task 1)
2. Tests for article service (Task 2 - RED)
3. Article service implementation (Task 3 - GREEN)
4. Backend API routes (Tasks 4, 5)
5. TypeScript types and services (Tasks 6, 7, 8)
6. Frontend components (Tasks 9, 10, 11)
7. Integration testing (Task 12)

### Watch Out For

- **JSDOM initialization**: Use `new JSDOM(html, { url })` to handle relative URLs correctly
- **Readability requires**: The Readability constructor needs a document, not a string
- **Content encoding**: Fetch may return various encodings; use proper charset handling
- **Image URLs**: Convert relative image URLs to absolute using the page URL
- **Rate limits**: Don't add artificial delays in the service; let user-initiated requests proceed normally

---
*Generated by Architecture Agent*
*Timestamp: 2026-01-17T19:15:00-05:00*
