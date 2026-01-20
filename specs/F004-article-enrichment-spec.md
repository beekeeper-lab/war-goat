# Article/Web Page Enrichment Specification

## Overview

Extend War Goat's content enrichment capabilities from YouTube videos to general web articles and documentation pages.

## Implementation Summary

### New Service: `server/services/article.js`

```javascript
// Core functions to implement
export function isArticleUrl(url)           // Check if URL is an article
export function detectDocumentationSite(url) // Detect ReadTheDocs, GitBook, etc.
export function extractMetadata(document, url) // Parse og: tags, meta tags
export function detectSeries(document)       // Find prev/next, breadcrumbs
export async function extractArticle(html, url) // Use Readability
export async function fetchAndExtract(url)   // Full extraction pipeline
export async function enrichArticleUrl(url)  // Main enrichment entry point
export async function generateArticleSummary(content, title) // AI summary
```

### API Endpoints

- `POST /api/enrich` - Extended to handle article URLs
- `GET /api/articles/:id` - Retrieve stored article content
- `PUT /api/articles/:id` - Save article content

### Data Model Extensions

```typescript
interface InterestItem {
  // New article-specific fields
  articleContent?: string;      // Stored in data/articles/{id}.txt
  hasArticleContent?: boolean;
  articleError?: string;
  excerpt?: string;
  wordCount?: number;
  readingTime?: number;
  siteName?: string;
  publishedDate?: string;
  isDocumentation?: boolean;
  seriesInfo?: {
    isPart: boolean;
    prevUrl?: string;
    nextUrl?: string;
    breadcrumbs?: string[];
  };
}
```

### Frontend Changes

1. **AddInterestModal**: Detect article URLs, trigger enrichment with "Extracting content..." message
2. **InterestDetail**: Add ArticleReaderSection with prose-styled content, Generate Summary button

### Dependencies

```bash
npm install @mozilla/readability jsdom
```

## Task Summary

1. Add dependencies
2. Create article service tests (TDD - RED)
3. Implement article service (GREEN)
4. Create data/articles/ directory
5. Add API routes
6. Update TypeScript types
7. Update frontend services
8. Extend AddInterestModal
9. Add ArticleReader to InterestDetail
10. Add Generate Summary feature
11. Final verification

## Key Design Decisions

- **Extraction Library**: `@mozilla/readability` (Firefox's reader mode algorithm)
- **Storage**: Plain text in `data/articles/{id}.txt` (matches transcript pattern)
- **AI Summary**: Reuse obsidian.js pattern with Anthropic SDK
- **Content Limit**: 100KB max, truncated with notice

## Full Spec

See `workflow/F004/2-architecture.md` for complete architecture document.
