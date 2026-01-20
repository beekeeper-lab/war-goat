---
id: F002
stage: requirements
title: "Brave Search Integration"
started_at: 2026-01-17T19:25:00-05:00
completed_at: 2026-01-17T19:55:00-05:00
status: complete
handoff_ready: true
checkpoints:
  - name: requirements_identified
    status: pass
    message: "7 functional requirements defined covering search, discovery, enrichment, and filtering"
  - name: impact_analyzed
    status: pass
    message: "7 components analyzed with impact levels, dependencies identified"
  - name: acceptance_criteria_defined
    status: pass
    message: "12 measurable acceptance criteria with specific, testable conditions"
  - name: no_open_blockers
    status: pass
    message: "All questions resolved with reasonable defaults"
retry_count: 0
last_failure: null
---

# Requirements: Brave Search Integration

## Work Item
- **ID**: F002
- **Type**: Feature
- **Source**: [.beans/Hackshop_Agentic_Dev_Tools-icyu--f002-brave-search-integration-content-discovery-an.md](../../.beans/Hackshop_Agentic_Dev_Tools-icyu--f002-brave-search-integration-content-discovery-an.md)

## Executive Summary

This feature adds intelligent content discovery capabilities to War Goat using the Brave Search MCP server. Users can discover related content based on existing interests, find new learning resources through smart search, verify and enrich URLs with additional context, and perform topic deep dives - all without leaving the application.

## Detailed Requirements

### Functional Requirements

- **FR-1**: Topic Search - Users can search the web for content related to any topic using Brave Search. Results include web pages, news articles, and videos with titles, descriptions, URLs, and publication dates.

- **FR-2**: Related Content Discovery - Given an existing interest item, the system can find related content by generating contextual search queries based on the item's title, tags, categories, and description.

- **FR-3**: URL Enrichment - When adding a non-YouTube URL (article, webpage), the system queries Brave Search to provide related articles, recent news, alternative sources, and AI-generated summary.

- **FR-4**: Content Type Filtering - Search results can be filtered by content type (web, news, video, image) to help users find specific formats.

- **FR-5**: Freshness Control - Users can filter search results by recency (past day, week, month, year) to find current or evergreen content.

- **FR-6**: Search from Interest Context - Users can initiate a "Find More Like This" search directly from any interest card, pre-populating search with relevant context.

- **FR-7**: Add from Search Results - Users can add search results directly to their interests list with one click, auto-populating metadata from the search result.

### Non-Functional Requirements

- **NFR-1**: Performance - Search queries return results within 3 seconds under normal network conditions.

- **NFR-2**: Reliability - Search failures degrade gracefully with clear error messages; app remains functional.

- **NFR-3**: Usability - Search interface follows existing War Goat UI patterns; results are scannable and actionable.

- **NFR-4**: Cost Efficiency - Result caching (15-minute TTL) to reduce API calls; free tier supports 2,000 queries/month.

### Constraints

- **CON-1**: Requires `BRAVE_API_KEY` environment variable configured.

- **CON-2**: Free tier limits: 2,000 queries/month with rate limiting.

- **CON-3**: Local/business search excluded (requires Pro plan).

- **CON-4**: Search query limited to 400 characters / 50 words.

## System Impact Analysis

### Components Affected

| Component | Impact Level | Description |
|-----------|--------------|-------------|
| `server/index.js` | High | Add new search endpoints and Brave MCP integration |
| `server/services/` | High | New `brave-search.js` service layer |
| `src/services/api.ts` | Medium | Add client functions for search endpoints |
| `src/types/index.ts` | Low | Add SearchResult and SearchOptions interfaces |
| `src/components/` | High | New SearchModal and SearchResults components |
| `InterestCard.tsx` | Low | Add "Find Related" quick action button |
| `.mcp.json` | Low | Add brave-search MCP server configuration |

### Data Changes

- **Database schema changes**: No - search results are transient, not persisted
- **API changes**: Yes - Add 3 new endpoints:
  - `POST /api/search` - General web search
  - `POST /api/search/related/:id` - Find related content for an interest
  - `POST /api/search/enrich-url` - Get context for a URL
- **Configuration changes**: Yes - Requires `BRAVE_API_KEY` environment variable

### Dependencies

- **Internal**:
  - Existing Interest CRUD operations (for "Add from Search")
  - Interest metadata (for Related Content Discovery)
  - MCP client infrastructure

- **External**:
  - Brave Search MCP server (`@modelcontextprotocol/server-brave-search`)
  - Brave Search API (free tier: 2,000 queries/month)

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API rate limiting | Medium | Medium | Implement caching, show user-friendly limits message |
| API key exposure | Low | High | Server-side only calls; never expose key to frontend |
| Search result quality variance | Medium | Low | Allow user filtering; show source domains |
| MCP server unavailability | Low | Medium | Graceful degradation; disable search when unavailable |

## User Stories

### Primary User Story

As a **War Goat user**,
I want to **search for and discover new learning content**
So that **I can expand my interests and find valuable resources without leaving the app**.

### Additional User Stories

1. As a user, I want to find content related to my existing interests so I can deepen my knowledge.

2. As a user, I want to filter search results by content type (articles, videos, news) to find the format I prefer.

3. As a user, I want to add search results directly to my interests list to streamline my workflow.

4. As a user, I want to get context about URLs I add so I can understand them better.

## Acceptance Criteria

- [ ] **AC-1**: Verify that entering a search query in the Search Modal returns results within 3 seconds, displaying at least title, URL, and description for each result.

- [ ] **AC-2**: Verify that clicking "Find Related" on an interest card opens Search Modal pre-populated with a query derived from the item's title and primary category.

- [ ] **AC-3**: Verify that search results can be filtered by type (web, news, video) and the UI reflects the active filter.

- [ ] **AC-4**: Verify that search results can be filtered by freshness (past day, week, month, year) and results respect the filter.

- [ ] **AC-5**: Verify that clicking "Add to Interests" on a search result creates a new interest item with title, URL, and description pre-populated.

- [ ] **AC-6**: Verify that the Brave Summarizer can generate a summary for web search results when available.

- [ ] **AC-7**: Verify that the search feature gracefully handles API errors, displaying "Search unavailable" message without crashing.

- [ ] **AC-8**: Verify that repeated identical searches within 15 minutes use cached results (observable via network tab or logs).

- [ ] **AC-9**: Verify that search queries exceeding 400 characters are truncated with user notification.

- [ ] **AC-10**: Verify that the Search Modal is accessible via keyboard shortcuts (e.g., Cmd/Ctrl+K) and main navigation.

- [ ] **AC-11**: Verify that video search results display thumbnail, title, source, and duration when available.

- [ ] **AC-12**: Verify that news search results display publication date and source domain.

## Out of Scope

- **Local/Business Search** - Requires Brave Pro plan; not included in MVP
- **Image Search Download** - Images viewable but not downloadable within app
- **Saved Searches** - No persistent search queries or alerts for MVP
- **Search History** - No tracking of past searches for MVP
- **AI-powered Query Suggestions** - No auto-complete or suggestion engine

## Open Questions

All questions resolved with reasonable defaults for MVP:

- Q1: Which Brave Search tools to integrate? **Resolved**: Web, News, Video search + Summarizer. [Blocker: no]
- Q2: How to handle rate limits? **Resolved**: Cache results, show warning when approaching limits. [Blocker: no]
- Q3: Where to configure API key? **Resolved**: Environment variable `BRAVE_API_KEY`. [Blocker: no]
- Q4: Result pagination? **Resolved**: Single page (10 results) for MVP; expand later. [Blocker: no]

## Documentation Impact

- [ ] Update `docs/MCP-INTEGRATION.md` with Brave Search MCP configuration
- [ ] Add `docs/BRAVE-SEARCH.md` user guide for search features
- [ ] Update `docs/API-REFERENCE.md` with new endpoints
- [ ] Update `.mcp.json` with brave-search server config

## Handoff to Architecture Agent

### Key Decisions Needed

1. **MCP vs Direct API**: Should search use Brave Search MCP server or direct API calls?
   - Recommendation: Use MCP for consistency with existing architecture

2. **Search UI Pattern**: Modal vs dedicated page vs inline expansion?
   - Recommendation: Modal for quick access, consistent with AddInterestModal

3. **Caching Strategy**: Where to cache (server memory, Redis, client)?
   - Recommendation: Server-side in-memory cache with 15-minute TTL

4. **Result Enrichment**: How much metadata to extract from search results?
   - Recommendation: Title, URL, description, thumbnail, date, source domain

### Suggested Approach

1. Configure Brave Search MCP in `.mcp.json`
2. Create `server/services/brave-search.js` service wrapping MCP calls
3. Add Express endpoints for search operations
4. Create `SearchModal` component with search input, filters, and results
5. Add "Find Related" button to `InterestCard`
6. Implement result caching on server side
7. Add keyboard shortcut for quick search access

### Brave Search MCP Tools Available

| Tool | Purpose | Use Case |
|------|---------|----------|
| `brave_web_search` | General web search | Topic discovery, related content |
| `brave_news_search` | News articles | Current events, recent updates |
| `brave_video_search` | Video content | Tutorial discovery |
| `brave_summarizer` | AI summaries | Quick content overview |

### API Design Sketch

```
POST /api/search
Body: { query, type?, freshness?, count? }
Response: { results: [], summary?: string }

POST /api/search/related/:id
Response: { results: [], query: string }

POST /api/search/enrich-url
Body: { url }
Response: { related: [], news: [], summary?: string }
```

---
*Generated by Requirements Agent*
*Timestamp: 2026-01-17T19:55:00-05:00*
