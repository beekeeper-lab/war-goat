# Feature: Brave Search Integration

> **ID**: F002
> **Type**: Feature
> **Status**: Planned
> **Priority**: Medium
> **Effort**: M
> **Created**: 2026-01-16
> **MCP Required**: Brave Search (needs setup, requires API key)

## Overview

Add intelligent content discovery using Brave Search MCP to find related learning resources and expand your knowledge base.

---

## User Stories

### US-1: Find Related Content

> As a user, I want to find related videos/articles based on an interest I've added so that I can deepen my understanding of a topic.

**Acceptance Criteria**:
- [ ] "Find Related" button on interest detail view
- [ ] Searches for content related to the interest's title/topics
- [ ] Returns 5-10 relevant results with:
  - Title, URL, snippet
  - Source type detection (YouTube, article, GitHub, etc.)
  - Relevance indicator
- [ ] User can add any result directly to War Goat with one click
- [ ] Results filtered to exclude already-added URLs

### US-2: Smart Content Discovery

> As a user, I want War Goat to suggest new learning content based on my interests so that I can discover valuable resources I might have missed.

**Acceptance Criteria**:
- [ ] "Discover" tab/section in the UI
- [ ] AI analyzes user's existing interests to identify:
  - Common themes/topics
  - Skill gaps (mentioned but not covered)
  - Trending related topics
- [ ] Searches Brave for content matching these patterns
- [ ] Presents curated suggestions with reasoning
- [ ] "Not interested" option to improve future suggestions

### US-3: Verify and Enrich URLs

> As a user, I want War Goat to verify that URLs I add are still valid and fetch additional context so that my list stays accurate.

**Acceptance Criteria**:
- [ ] When adding non-YouTube URL, search Brave to verify/enrich
- [ ] Fetch: page title, description, publish date, author
- [ ] Detect if URL is dead/redirected
- [ ] Suggest canonical URL if redirect detected
- [ ] Show preview of page content

### US-4: Topic Deep Dive

> As a user, I want to explore a topic comprehensively so that I can build a complete learning path.

**Acceptance Criteria**:
- [ ] "Deep Dive" feature for any category or tag
- [ ] Searches for:
  - Beginner tutorials
  - Advanced content
  - Documentation/references
  - Community discussions
  - Recent news/updates
- [ ] Groups results by type and difficulty
- [ ] Creates a suggested learning path (ordered list)
- [ ] Bulk add entire path to War Goat

---

## Technical Design

### Brave Search MCP Setup

```json
// .mcp.json addition
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-brave-search"],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      }
    }
  }
}
```

### MCP Tools Available

| Tool | Purpose |
|------|---------|
| `brave_web_search` | General web search |
| `brave_local_search` | Local/regional search (not needed) |

### Search Query Construction

For "Find Related" feature:
```javascript
function buildRelatedQuery(interest) {
  const parts = [];

  // Primary: title keywords (remove common words)
  parts.push(extractKeywords(interest.title));

  // Secondary: author/channel for more from same source
  if (interest.author) {
    parts.push(`"${interest.author}"`);
  }

  // Tertiary: categories for topic context
  if (interest.categories?.length) {
    parts.push(interest.categories[0]);
  }

  // Filter by type
  const typeFilters = {
    youtube: 'site:youtube.com',
    github: 'site:github.com',
    article: '-site:youtube.com -site:github.com'
  };

  return parts.join(' ') + ' ' + (typeFilters[interest.type] || '');
}
```

### API Endpoints to Add

```
POST /api/search/related
  - Find content related to an interest
  - Body: { interestId: string, maxResults: number, types: string[] }

POST /api/search/discover
  - Get personalized suggestions
  - Body: { basedOn: 'all' | 'recent' | 'category', limit: number }

POST /api/search/deep-dive
  - Comprehensive topic search
  - Body: { topic: string, includeTypes: string[] }

GET /api/search/verify?url=<url>
  - Verify and enrich a URL
```

### Frontend Components

1. **RelatedContentPanel** - Sidebar/modal showing related results
2. **DiscoverFeed** - Card-based discovery suggestions
3. **DeepDiveWizard** - Multi-step topic exploration
4. **QuickAddButton** - One-click add from search results
5. **SearchResultCard** - Display search result with preview

### Service Layer

```javascript
// server/services/search.js
export async function searchRelated(interest, options = {}) {
  const query = buildRelatedQuery(interest);
  const results = await mcpRegistry.getClient('brave-search')
    .callTool('brave_web_search', { query, count: options.maxResults || 10 });

  return results
    .filter(r => !isAlreadyAdded(r.url))
    .map(r => ({
      ...r,
      detectedType: detectSourceType(r.url),
      relevanceScore: calculateRelevance(r, interest)
    }));
}
```

### Caching Strategy

Search results should be cached to avoid API rate limits:

```javascript
const searchCache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function cachedSearch(query) {
  const cacheKey = hashQuery(query);
  const cached = searchCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.results;
  }

  const results = await performSearch(query);
  searchCache.set(cacheKey, { results, timestamp: Date.now() });
  return results;
}
```

---

## Questions to Resolve

1. **API Key management**: Where to store Brave API key securely?
2. **Rate limiting**: Brave API limits? How to handle?
3. **Result quality**: How to filter out low-quality results?
4. **Deduplication**: How to detect same content at different URLs?
5. **Language**: Support non-English content?
6. **Safe search**: Filter adult/inappropriate content?

---

## Dependencies

- Brave Search API key (free tier: 2000 queries/month)
- `@anthropic/mcp-brave-search` package
- Network access to Brave API

---

## Testing Scenarios

1. Search related to programming video → get relevant tutorials
2. Search related to book → get reviews, summaries, author content
3. Deep dive on "React" → get tutorials, docs, GitHub repos
4. Verify valid URL → return enriched data
5. Verify dead URL → return error with suggestions
6. Discover based on AI/ML interests → get relevant suggestions
7. Rate limit handling → graceful degradation
8. Empty results → helpful message

---

## Future Enhancements

- **Scheduled discovery**: Daily/weekly email with new suggestions
- **Social signals**: Prioritize content with high engagement
- **Freshness filter**: Option to only show recent content
- **Source preferences**: Learn which sites user prefers
- **Collaborative filtering**: Suggest based on similar users
- **RSS integration**: Monitor favorite sources for new content
