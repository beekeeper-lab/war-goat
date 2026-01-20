---
id: F003
stage: architecture
title: "GitHub Repository Enrichment"
started_at: 2026-01-20T13:30:00Z
completed_at: 2026-01-20T14:15:00Z
status: complete
handoff_ready: true
checkpoints:
  - name: requirements_addressed
    status: pass
    message: "All 8 FRs and 14 ACs mapped to design elements"
  - name: design_complete
    status: pass
    message: "Data models, APIs, components, and services fully specified"
  - name: tasks_defined
    status: pass
    message: "10 implementation tasks with verification steps"
  - name: tests_planned
    status: pass
    message: "Unit and E2E tests specified for all acceptance criteria"
retry_count: 0
last_failure: null
previous_stage: 1-requirements.md
---

# Architecture & Implementation Spec: GitHub Repository Enrichment

## Work Item
- **ID**: F003
- **Requirements Doc**: workflow/F003/1-requirements.md
- **Type**: Feature

## Requirements Summary

Enable War Goat to auto-enrich GitHub repository URLs with:
- Repository metadata (stars, forks, language, topics, license) (FR-1, FR-2)
- README content fetched and stored for later viewing (FR-3)
- Preview card during add flow showing repo info (FR-4)
- GitHub-specific data persistence (FR-5)
- Distinct display for GitHub items (FR-6)
- README viewing in detail view (FR-7)
- External link to browse repository (FR-8)

## Requirements Traceability

| Requirement | Addressed By | Section |
|-------------|--------------|---------|
| FR-1 Auto-Detect | `isGitHubUrl()` + URL_PATTERNS | Service Layer |
| FR-2 Fetch Metadata | `GitHubService.getMetadata()` | Service Layer |
| FR-3 Fetch README | `GitHubService.getReadme()` | Service Layer |
| FR-4 Preview Card | `GitHubPreview` component | Component Design |
| FR-5 Store Data | Extended InterestItem interface | Data Model |
| FR-6 Display Distinct | InterestCard GitHub rendering | Component Design |
| FR-7 View README | InterestDetail README section | Component Design |
| FR-8 Explore Repo | External link button | Component Design |
| AC-1 Auto-detect type | `detectSourceType()` + enrichment trigger | Service Layer |
| AC-2 Enrichment timing | Parallel API calls with timeout | Service Layer |
| AC-3 Preview card | GitHubPreview component | Component Design |
| AC-4 Stored fields | db.json schema extension | Data Model |
| AC-5 Topics to categories | `mapTopicsToCategories()` | Service Layer |
| AC-6 Card display | InterestCard conditional rendering | Component Design |
| AC-7 README section | InterestDetail collapsible section | Component Design |
| AC-8 README storage | Reuse `/data/transcripts/` | API Changes |
| AC-9 Non-existent repo | 404 handling with clear error | Service Layer |
| AC-10 Private repo | 403/404 handling with message | Service Layer |
| AC-11 Rate limiting | 403 detection + retry messaging | Service Layer |
| AC-12 No README | `hasReadme: false` handling | Service Layer |
| AC-13 Owner avatar | `ownerAvatar` field mapping | Data Model |
| AC-14 External link | Existing ExternalLink button | Component Design |

## Architectural Analysis

### Current State

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  AddInterestModal.tsx → enrichUrl() → YouTube enrichment    │
│  InterestCard.tsx → Type icons, badges                      │
│  InterestDetail.tsx → Transcript section                    │
│         │                                                    │
│         └──► src/services/enrich.ts (isYouTubeUrl only)    │
│         └──► src/services/api.ts                           │
└─────────────────────────────────────────────────────────────┘
                         │ HTTP
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express Server                            │
│  POST /api/enrich → YouTube only                            │
│  GET/PUT /api/transcripts/:id → file storage                │
│         │                                                    │
│         └──► server/services/youtube.js                     │
│                      │                                       │
│                      └──► mcpRegistry (MCP Client)          │
└─────────────────────────────────────────────────────────────┘
```

### Proposed Changes

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  AddInterestModal.tsx → enrichUrl() → YouTube OR GitHub     │
│      └──► GitHubPreview component (NEW for GitHub preview)  │
│  InterestCard.tsx → GitHub star badge, language indicator   │
│  InterestDetail.tsx → README section (reuse transcript UI)  │
│         │                                                    │
│         └──► src/services/enrich.ts (+isGitHubUrl)         │
│         └──► src/services/api.ts (unchanged)               │
└─────────────────────────────────────────────────────────────┘
                         │ HTTP
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express Server                            │
│  POST /api/enrich → YouTube OR GitHub (MODIFIED)            │
│  GET/PUT /api/transcripts/:id → README storage (REUSED)     │
│         │                                                    │
│         └──► server/services/github.js (NEW)               │
│                      │                                       │
│                      └──► GitHub REST API (direct HTTP)     │
└─────────────────────────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  GitHub REST API                             │
│  GET /repos/{owner}/{repo}         → metadata               │
│  GET /repos/{owner}/{repo}/readme  → README content         │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Decision Records (ADRs)

#### ADR-F003-1: Direct GitHub API (No MCP)

- **Context**: GitHub enrichment needs to fetch repository metadata and README. Unlike YouTube, there's no existing MCP server for GitHub.
- **Decision**: Use direct HTTP calls to GitHub REST API from the backend service. No MCP involvement.
- **Alternatives Considered**:
  - Create a GitHub MCP server (overkill for this feature)
  - Use a third-party GitHub library (adds dependency)
- **Consequences**: Simpler implementation; direct control over API calls; must handle rate limiting ourselves.

#### ADR-F003-2: Reuse Transcript Storage for README

- **Context**: README content needs to be stored separately (like transcripts) for lazy loading.
- **Decision**: Store README in `/data/transcripts/{id}.txt` alongside YouTube transcripts. Reuse existing `/api/transcripts/:id` endpoints.
- **Alternatives Considered**:
  - Create separate `/data/readmes/` directory (unnecessary complexity)
  - Store README inline in db.json (performance issue with large files)
- **Consequences**: No new storage infrastructure; label changes in UI ("README" vs "Transcript"); `hasReadme` flag mirrors `hasTranscript` pattern.

#### ADR-F003-3: Unauthenticated API by Default

- **Context**: GitHub API has 60 req/hr limit unauthenticated, 5000 req/hr authenticated.
- **Decision**: Use unauthenticated calls by default. Support optional `GITHUB_TOKEN` environment variable for higher limits.
- **Alternatives Considered**:
  - Require authentication (barrier to adoption)
  - Implement caching layer (complexity for MVP)
- **Consequences**: Acceptable for typical usage; clear rate limit error messaging; future enhancement path.

#### ADR-F003-4: Topics Direct Mapping to Categories

- **Context**: GitHub topics should become War Goat categories for consistency.
- **Decision**: Map GitHub topics directly to the `categories` array. No transformation - topics become categories 1:1.
- **Alternatives Considered**:
  - Keyword-based categorization like YouTube (inconsistent with explicit topics)
  - Merge with existing category system (complexity)
- **Consequences**: Consistent with user expectations; may result in many categories; can filter later.

## Technical Design

### Data Model Changes

```typescript
// src/types/index.ts - EXTEND InterestItem (some fields exist, add missing)
export interface InterestItem {
  // ... existing fields ...

  // GitHub specific - EXTEND existing partial definition
  stars?: number;           // Already exists
  language?: string;        // Already exists
  forks?: number;           // NEW
  topics?: string[];        // NEW
  license?: string;         // NEW
  lastCommitDate?: string;  // NEW - ISO timestamp
  hasReadme?: boolean;      // NEW - mirrors hasTranscript pattern
  ownerAvatar?: string;     // NEW - GitHub user/org avatar URL
  openIssues?: number;      // NEW
  defaultBranch?: string;   // NEW
  fullName?: string;        // NEW - "owner/repo" format
}

// src/types/index.ts - EXTEND EnrichedCreateInput
export interface EnrichedCreateInput extends CreateInterestInput {
  // ... existing fields ...

  // GitHub specific
  stars?: number;
  forks?: number;
  language?: string;
  topics?: string[];
  license?: string;
  ownerAvatar?: string;
  hasReadme?: boolean;
}
```

### API Changes

```
POST /api/enrich (MODIFIED)
  Request: { url: string }

  Response (GitHub):
  {
    success: true,
    type: "github",
    data: {
      url: string,
      type: "github",
      title: string,              // repo name
      description: string,
      author: string,             // owner name
      thumbnail: string,          // owner avatar URL
      fullName: string,           // "owner/repo"
      stars: number,
      forks: number,
      language: string | null,
      topics: string[],
      license: string | null,
      openIssues: number,
      lastCommitDate: string,     // ISO timestamp
      defaultBranch: string,
      hasReadme: boolean,
      readme: string | null,      // README content (may be null if fetch fails)
      readmeError: string | null  // Error message if README fetch failed
    }
  }

  Response (GitHub error - non-existent repo):
  {
    success: false,
    type: "github",
    error: "Repository not found: owner/repo"
  }

  Response (GitHub error - rate limited):
  {
    success: false,
    type: "github",
    error: "GitHub API rate limit exceeded. Try again in X minutes.",
    rateLimitReset: number  // Unix timestamp when limit resets
  }

GET /api/transcripts/:id (UNCHANGED - reused for README)
PUT /api/transcripts/:id (UNCHANGED - reused for README)
```

### Component Design

```
ComponentTree (changes highlighted):
├── App.tsx
│   ├── Header.tsx
│   ├── AddInterestModal.tsx (MODIFIED)
│   │   ├── Thumbnail preview (existing - shows owner avatar for GitHub)
│   │   └── GitHubPreview (NEW) - star badge, language, topics
│   ├── InterestList.tsx
│   │   └── InterestCard.tsx (MODIFIED - GitHub-specific badges)
│   └── InterestDetail.tsx (MODIFIED - README section)
```

**Modified Components:**

1. **AddInterestModal.tsx** (MODIFIED)
   - Add GitHub URL detection alongside YouTube
   - Show `GitHubPreview` component when `type === 'github'`
   - Update placeholder text to mention GitHub

2. **GitHubPreview** (`src/components/GitHubPreview.tsx`) (NEW)
   - Props: `{ stars: number, language: string, topics: string[], description: string }`
   - Shows: Star badge (★ 1.2k), language indicator with color dot, topic pills
   - Renders below thumbnail in add modal

3. **InterestCard.tsx** (MODIFIED)
   - Add conditional rendering for `type === 'github'`
   - Show star count badge next to type icon
   - Show language indicator if present

4. **InterestDetail.tsx** (MODIFIED)
   - Rename transcript section label to be generic or conditional
   - Show "README" label for GitHub items, "Transcript" for YouTube
   - Same lazy-loading pattern via `fetchTranscript()`

### Service Layer

```javascript
// server/services/github.js

/**
 * GitHub Service
 *
 * High-level service for GitHub repository enrichment.
 * Uses GitHub REST API directly (no MCP).
 */

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * GitHub URL patterns for owner/repo extraction
 */
const GITHUB_PATTERNS = [
  /github\.com\/([^\/]+)\/([^\/\?#]+)/,
];

/**
 * Extract owner and repo from a GitHub URL
 * @param {string} url - GitHub URL
 * @returns {{owner: string, repo: string} | null}
 */
export function extractRepoInfo(url) { /* ... */ }

/**
 * Check if a URL is a GitHub repository URL
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isGitHubUrl(url) { /* ... */ }

/**
 * Fetch repository metadata from GitHub API
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object|null>} Repository data or null on error
 */
export async function getMetadata(owner, repo) { /* ... */ }

/**
 * Fetch README content from GitHub API
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<{success: boolean, content?: string, error?: string}>}
 */
export async function getReadme(owner, repo) { /* ... */ }

/**
 * Format star count for display (e.g., 1234 → "1.2k")
 * @param {number} count - Star count
 * @returns {string}
 */
export function formatStarCount(count) { /* ... */ }

/**
 * Map GitHub topics to War Goat categories
 * @param {string[]} topics - GitHub topics
 * @returns {string[]} Categories (capitalized)
 */
export function mapTopicsToCategories(topics) { /* ... */ }

/**
 * Fully enrich a GitHub URL with metadata and README
 * @param {string} url - GitHub repository URL
 * @returns {Promise<Object>} Enriched data
 */
export async function enrichGitHubUrl(url) { /* ... */ }

export default {
  extractRepoInfo,
  isGitHubUrl,
  getMetadata,
  getReadme,
  formatStarCount,
  mapTopicsToCategories,
  enrichGitHubUrl,
};
```

### GitHub API Integration Details

```javascript
// GET /repos/{owner}/{repo}
// Response fields we use:
{
  name: string,           // → title
  full_name: string,      // → fullName
  description: string,    // → description
  owner: {
    login: string,        // → author
    avatar_url: string,   // → thumbnail, ownerAvatar
  },
  stargazers_count: number,  // → stars
  forks_count: number,       // → forks
  language: string | null,   // → language
  topics: string[],          // → topics, categories
  license: { name: string } | null,  // → license
  open_issues_count: number,  // → openIssues
  pushed_at: string,         // → lastCommitDate
  default_branch: string,    // → defaultBranch
}

// GET /repos/{owner}/{repo}/readme
// Returns: { content: string (base64), encoding: "base64" }
// Decode and return raw markdown

// Headers to send:
{
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'WarGoat/1.0',
  // If GITHUB_TOKEN is set:
  'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
}

// Rate limit headers to check:
// X-RateLimit-Remaining: number
// X-RateLimit-Reset: Unix timestamp
```

## File Changes

### Files to Create

| File | Purpose |
|------|---------|
| `server/services/github.js` | GitHub API service layer |
| `src/components/GitHubPreview.tsx` | GitHub preview card for AddInterestModal |
| `server/__tests__/github.test.js` | Unit tests for GitHub service |

### Files to Modify

| File | Changes |
|------|---------|
| `server/index.js` | Add GitHub enrichment to POST /api/enrich |
| `server/services/index.js` | Export GitHub service functions |
| `src/types/index.ts` | Extend InterestItem with GitHub fields |
| `src/services/enrich.ts` | Add `isGitHubUrl()` function |
| `src/components/AddInterestModal.tsx` | Add GitHub enrichment trigger and preview |
| `src/components/InterestCard.tsx` | Add GitHub star badge and language indicator |
| `src/components/InterestDetail.tsx` | Conditional label for README vs Transcript |

### Test Files (TDD)

| File | Type | Tests to Write |
|------|------|----------------|
| `server/__tests__/github.test.js` | Unit | extractRepoInfo, isGitHubUrl, formatStarCount, mapTopicsToCategories |
| `server/__tests__/github-api.test.js` | Integration | enrichGitHubUrl with mocked fetch |
| `src/__tests__/GitHubPreview.test.tsx` | Component | Render with props, star formatting |
| `e2e/github-enrichment.spec.ts` | E2E | AC-1 through AC-14 scenarios |

## Implementation Plan (TDD)

### Phase 1: Write Failing Tests (RED)

#### Unit Tests
- [ ] `server/__tests__/github.test.js`
  - Test: `extractRepoInfo` extracts owner/repo from various URL formats
  - Test: `isGitHubUrl` returns true for valid GitHub URLs
  - Test: `isGitHubUrl` returns false for non-GitHub URLs
  - Test: `formatStarCount` formats 1234 as "1.2k"
  - Test: `formatStarCount` handles small numbers (< 1000)
  - Test: `mapTopicsToCategories` capitalizes topics

#### Integration Tests
- [ ] `server/__tests__/github-api.test.js`
  - Test: `enrichGitHubUrl` returns success with valid repo
  - Test: `enrichGitHubUrl` handles 404 for non-existent repo
  - Test: `enrichGitHubUrl` handles 403 rate limit response
  - Test: `enrichGitHubUrl` returns partial success when README fails

### Phase 2: Implement Backend (GREEN)

1. Create `server/services/github.js` with all functions
2. Add GitHub handling to POST /api/enrich in `server/index.js`
3. Export functions from `server/services/index.js`
4. Run unit tests - verify they pass

### Phase 3: Implement Frontend (GREEN)

1. Extend types in `src/types/index.ts`
2. Add `isGitHubUrl()` to `src/services/enrich.ts`
3. Create `GitHubPreview` component
4. Modify `AddInterestModal.tsx` to trigger GitHub enrichment
5. Modify `InterestCard.tsx` for GitHub display
6. Modify `InterestDetail.tsx` for README label
7. Run component tests - verify they pass

### Phase 4: Integration (GREEN)

1. End-to-end testing with real GitHub API
2. Test error scenarios (rate limiting, private repos)
3. Run E2E tests - verify they pass

### Phase 5: Refactor

1. Add rate limit remaining display (optional)
2. Optimize API call timing if needed

## Step-by-Step Tasks for Implementor

IMPORTANT: Execute in order. Each step should be completable independently.

### Task 1: Extend Type Definitions
**Files**: `src/types/index.ts`
**Description**: Add missing GitHub-specific fields to InterestItem: forks, topics, license, lastCommitDate, hasReadme, ownerAvatar, openIssues, defaultBranch, fullName. Extend EnrichedCreateInput with GitHub fields.
**Test First**: N/A (type definitions)
**Verification**: TypeScript compiles without errors; `npm run build` succeeds

### Task 2: Create GitHub Service - URL Utilities
**Files**: `server/services/github.js`, `server/__tests__/github.test.js`
**Description**: Implement `extractRepoInfo(url)`, `isGitHubUrl(url)`, `formatStarCount(count)`, `mapTopicsToCategories(topics)`. Write unit tests first.
**Test First**:
```javascript
test('extractRepoInfo extracts owner and repo', () => {
  expect(extractRepoInfo('https://github.com/anthropics/claude-code'))
    .toEqual({ owner: 'anthropics', repo: 'claude-code' });
});

test('isGitHubUrl returns true for valid URL', () => {
  expect(isGitHubUrl('https://github.com/owner/repo')).toBe(true);
});

test('formatStarCount formats thousands', () => {
  expect(formatStarCount(1234)).toBe('1.2k');
  expect(formatStarCount(500)).toBe('500');
});
```
**Verification**: `npm test server/__tests__/github.test.js` passes

### Task 3: Create GitHub Service - API Functions
**Files**: `server/services/github.js`, `server/__tests__/github-api.test.js`
**Description**: Implement `getMetadata(owner, repo)`, `getReadme(owner, repo)`. Use fetch with proper headers. Handle GITHUB_TOKEN env var for auth.
**Test First**: Mock fetch, test response parsing
```javascript
test('getMetadata returns repo data', async () => {
  // Mock successful response
  const data = await getMetadata('owner', 'repo');
  expect(data).toHaveProperty('stars');
  expect(data).toHaveProperty('language');
});
```
**Verification**: Manual test with real API: `node -e "import('./server/services/github.js').then(m => m.getMetadata('facebook', 'react').then(console.log))"`

### Task 4: Create GitHub Service - Enrichment Function
**Files**: `server/services/github.js`
**Description**: Implement `enrichGitHubUrl(url)` that combines metadata and README fetch in parallel (like YouTube pattern). Return structured response matching API spec.
**Test First**: Integration test with mocked API calls
**Verification**: Call enrichGitHubUrl with test URL, verify response shape

### Task 5: Integrate into Enrich Endpoint
**Files**: `server/index.js`, `server/services/index.js`
**Description**: Add GitHub handling to POST /api/enrich. Export GitHub functions from services/index.js.
```javascript
// In server/index.js POST /api/enrich handler
if (isGitHubUrl(url)) {
  const result = await enrichGitHubUrl(url);
  return res.json(result);
}
```
**Test First**: Integration test with supertest
**Verification**: `curl -X POST http://localhost:3001/api/enrich -H "Content-Type: application/json" -d '{"url":"https://github.com/facebook/react"}'` returns GitHub data

### Task 6: Add Frontend URL Detection
**Files**: `src/services/enrich.ts`
**Description**: Add `isGitHubUrl(url)` function matching backend pattern.
```typescript
export function isGitHubUrl(url: string): boolean {
  return /github\.com\/[\w-]+\/[\w-]+/.test(url);
}
```
**Test First**: N/A (simple regex)
**Verification**: Import and test in browser console

### Task 7: Create GitHubPreview Component
**Files**: `src/components/GitHubPreview.tsx`
**Description**: Create component showing star badge, language indicator with color dot, topics as pills, and description snippet.
```tsx
interface GitHubPreviewProps {
  stars: number;
  language: string | null;
  topics: string[];
  description: string;
}
```
**Test First**: Component render test
**Verification**: Component renders correctly with sample props

### Task 8: Modify AddInterestModal for GitHub
**Files**: `src/components/AddInterestModal.tsx`
**Description**:
1. Import `isGitHubUrl` from enrich service
2. Add GitHub enrichment trigger in `handleUrlChange` (similar to YouTube)
3. Store GitHub-specific state (stars, language, topics)
4. Render `GitHubPreview` when type === 'github' and enrichment successful
5. Pass GitHub fields in submit
**Test First**: E2E test for GitHub URL enrichment flow
**Verification**: Paste GitHub URL, see preview card with stars/language/topics

### Task 9: Modify InterestCard for GitHub Display
**Files**: `src/components/InterestCard.tsx`
**Description**: Add conditional rendering for GitHub items:
- Star count badge (using Star icon from lucide-react)
- Language indicator with colored dot
**Test First**: Component test with GitHub type item
**Verification**: GitHub items show star badge and language

### Task 10: Modify InterestDetail for README
**Files**: `src/components/InterestDetail.tsx`
**Description**:
1. Change "Transcript" label to be conditional based on item.type
2. Show "README" for GitHub items, "Transcript" for YouTube
3. Existing lazy-load pattern works unchanged
**Test First**: Component test with GitHub item
**Verification**: GitHub items show "README" section header

### Task 11: Final Verification
**Run all tests**:
```bash
npm run test
npm run build
# Manual testing
npm run dev:full
# Add a GitHub repo: https://github.com/facebook/react
# Verify: auto-enrichment, preview, save, display, README view
```
**Verification**: All tests pass, build succeeds, manual testing confirms AC-1 through AC-14

## Acceptance Criteria Mapping

| AC | How Implemented | How Tested |
|----|-----------------|------------|
| AC-1 | `isGitHubUrl()` triggers enrichment in AddInterestModal | E2E: paste GitHub URL, verify enrichment starts |
| AC-2 | Parallel `getMetadata()` + `getReadme()` with timeout | Unit: verify <3s; Integration: time the call |
| AC-3 | GitHubPreview component renders during enrichment | E2E: verify star badge, language, topics visible |
| AC-4 | `enrichGitHubUrl()` populates all fields in response | Unit: verify response shape; E2E: check db.json |
| AC-5 | `mapTopicsToCategories()` maps to categories array | Unit: verify mapping; E2E: check saved item |
| AC-6 | InterestCard conditional GitHub rendering | Component: render GitHub item, verify badges |
| AC-7 | InterestDetail "README" label for GitHub items | Component: render GitHub item, verify label |
| AC-8 | README saved via existing transcript endpoint | Integration: verify file in /data/transcripts/ |
| AC-9 | 404 handling in `getMetadata()` returns clear error | Unit: mock 404, verify error message |
| AC-10 | 403/404 handling with "Private repository" message | Unit: mock response, verify message |
| AC-11 | 403 rate limit detection with reset time | Unit: mock 403 with headers, verify message |
| AC-12 | `hasReadme: false` when README fetch fails | Unit: mock README failure, verify flag |
| AC-13 | Owner avatar used as thumbnail | Unit: verify thumbnail field from avatar_url |
| AC-14 | Existing ExternalLink button works for GitHub URLs | E2E: click external link, verify opens |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| GitHub API rate limiting | Clear error message with reset time; optional GITHUB_TOKEN support |
| Private repository access | Return "Private repository" message; document public-only limitation |
| Large README files (>1MB) | GitHub API returns 404 for large files; handle gracefully |
| Network timeouts | 10s timeout on API calls; show partial data if metadata succeeds |
| Invalid URL formats | Robust regex patterns; clear error for malformed URLs |

## Open Questions Resolved

| Question | Answer |
|----------|--------|
| Service Layer Structure | Create separate `github.js` mirroring `youtube.js` pattern (ADR-F003-1) |
| README Storage | Reuse `/data/transcripts/` - no new infrastructure (ADR-F003-2) |
| API Response Format | Match YouTube structure with GitHub-specific fields |
| Error Handling Pattern | Return success with null/error fields for partial failures |
| Rate Limit Strategy | Simple fail-fast with clear messaging; optional auth (ADR-F003-3) |

## Handoff to Implementor Agent

### Critical Notes

1. **GitHub API Headers**: Always include `User-Agent` header (GitHub requires it). Format: `User-Agent: WarGoat/1.0`

2. **Rate Limit Handling**: Check `X-RateLimit-Remaining` header. When 0, check `X-RateLimit-Reset` for Unix timestamp when limit resets.

3. **README Decoding**: GitHub API returns README as base64. Use `Buffer.from(content, 'base64').toString('utf-8')` to decode.

4. **Optional Auth**: Check for `process.env.GITHUB_TOKEN`. If set, add `Authorization: Bearer ${token}` header.

5. **Parallel Fetching**: Fetch metadata and README in parallel (like YouTube pattern), but don't fail the whole enrichment if README fails.

### Recommended Order

1. Types first (Task 1) - foundation for everything
2. Backend service utilities (Task 2) - testable core functions
3. Backend API functions (Tasks 3-4) - GitHub integration
4. Backend endpoint (Task 5) - expose to frontend
5. Frontend URL detection (Task 6) - triggers enrichment
6. Frontend preview component (Task 7) - visual feedback
7. Frontend integration (Tasks 8-10) - wire it all together
8. Final verification (Task 11)

### Watch Out For

- GitHub API requires `User-Agent` header or returns 403
- README endpoint returns 404 for files >1MB (handle gracefully)
- Some repos have no README (check for 404)
- Topics array may be empty
- License may be null (not all repos have license)
- Language may be null (empty repos or documentation-only)
- Star/fork counts can be very large (format for display)
- URL patterns should handle trailing slashes and query params

---
*Generated by Architecture Agent*
*Timestamp: 2026-01-20T14:15:00Z*
