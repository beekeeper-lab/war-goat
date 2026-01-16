# Feature: Article/Web Page Enrichment

> **ID**: F004
> **Type**: Feature
> **Status**: Planned
> **Priority**: High
> **Effort**: M-L
> **Created**: 2026-01-16
> **MCP Required**: Fetch MCP (optional, can use Readability directly)

## Overview

Automatically extract and enrich content from articles, blog posts, and documentation pages using web scraping and AI summarization.

---

## User Stories

### US-1: Auto-Extract Article Content

> As a user, I want article URLs to be automatically enriched with the article content so that I can read and study them within War Goat.

**Acceptance Criteria**:
- [ ] When adding an article URL, automatically fetch:
  - Title (from og:title or <title>)
  - Author (from meta tags or byline)
  - Publish date
  - Site name / publication
  - Featured image
  - Full article text (cleaned of ads/navigation)
  - Estimated reading time
- [ ] Handle paywalled content gracefully (show what's available)
- [ ] Detect and handle cookie consent / GDPR modals
- [ ] Support common platforms: Medium, Dev.to, Substack, personal blogs

### US-2: Reader Mode View

> As a user, I want to read articles in a clean, distraction-free view so that I can focus on learning.

**Acceptance Criteria**:
- [ ] "Reader Mode" button in detail view
- [ ] Clean typography, proper formatting
- [ ] Code blocks with syntax highlighting
- [ ] Images displayed inline
- [ ] Configurable font size, line height, theme (light/dark)
- [ ] Progress indicator (% read)
- [ ] Resume where you left off

### US-3: AI Article Summary

> As a user, I want AI to summarize articles so that I can quickly decide if they're worth reading in full.

**Acceptance Criteria**:
- [ ] Auto-generate summary when adding article
- [ ] Summary includes:
  - TL;DR (1-2 sentences)
  - Key Points (3-5 bullets)
  - Main takeaways
  - Prerequisites / assumed knowledge
  - Difficulty level
- [ ] "Full summary" vs "Quick summary" options
- [ ] Highlight/extract code examples separately

### US-4: Article Series Detection

> As a user, I want War Goat to detect when an article is part of a series so that I can add the whole series.

**Acceptance Criteria**:
- [ ] Detect "Part 1 of 3" patterns in title/content
- [ ] Look for "Previous/Next" links
- [ ] Detect series from URL patterns (e.g., /tutorial-part-1/)
- [ ] Offer to add all parts at once
- [ ] Group series articles in the UI

### US-5: Documentation Site Support

> As a user, I want to add documentation pages and have War Goat understand the doc structure.

**Acceptance Criteria**:
- [ ] Detect documentation sites (ReadTheDocs, GitBook, Docusaurus, etc.)
- [ ] Extract: current page, navigation structure, related pages
- [ ] Option to add entire section/chapter
- [ ] Track reading progress across doc pages
- [ ] Link related pages in notes

---

## Technical Design

### Web Scraping Approaches

#### Option 1: Fetch MCP (Puppeteer-based)

```json
// .mcp.json addition
{
  "mcpServers": {
    "fetch": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-fetch"]
    }
  }
}
```

#### Option 2: Direct Fetch + Readability

```javascript
// server/services/article.js
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export async function extractArticle(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; WarGoat/1.0)'
    }
  });

  const html = await response.text();
  const dom = new JSDOM(html, { url });

  // Extract with Mozilla Readability
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  return {
    title: article.title,
    author: article.byline,
    content: article.content,      // Clean HTML
    textContent: article.textContent, // Plain text
    excerpt: article.excerpt,
    siteName: article.siteName,
    length: article.length,        // Character count
    readingTime: Math.ceil(article.length / 1500) // ~250 wpm
  };
}
```

#### Option 3: Hybrid (Try Readability, Fall Back to Puppeteer)

```javascript
async function enrichArticle(url) {
  try {
    // Try simple fetch first (faster, works for most sites)
    return await extractWithReadability(url);
  } catch (err) {
    // Fall back to Puppeteer for JS-heavy sites
    console.log('Readability failed, trying Puppeteer:', err.message);
    return await extractWithPuppeteer(url);
  }
}
```

### Content Extraction Pipeline

```
URL Input
    ↓
Detect site type:
  ├─ Medium → use Medium-specific extraction
  ├─ Dev.to → use Dev.to API if available
  ├─ Documentation → use doc-specific extraction
  └─ Generic → use Readability
    ↓
Fetch page (handle redirects, cookies)
    ↓
Extract metadata:
  ├─ og:title, og:description, og:image
  ├─ article:author, article:published_time
  ├─ Schema.org/JSON-LD data
  └─ Twitter card data
    ↓
Clean content:
  ├─ Remove navigation, ads, footers
  ├─ Preserve code blocks
  ├─ Normalize image URLs
  └─ Convert to markdown (optional)
    ↓
Generate summary (AI)
    ↓
Store: metadata in db.json, content in /data/articles/{id}.html
```

### Data Model Extension

```typescript
interface ArticleMetadata {
  siteName: string;
  author: string | null;
  publishedDate: string | null;
  modifiedDate: string | null;
  featuredImage: string | null;
  readingTimeMinutes: number;
  wordCount: number;
  language: string;
  series: {
    name: string;
    part: number;
    total: number;
    otherParts: string[]; // URLs
  } | null;
  contentHash: string; // To detect updates
}

interface InterestItem {
  // ... existing fields
  article?: ArticleMetadata;
  hasContent: boolean;  // Like hasTranscript
}
```

### API Endpoints to Add

```
POST /api/enrich (extend existing)
  - Detect article URL → call article enrichment

GET /api/interests/:id/content
  - Fetch/return article content (lazy load)

POST /api/interests/:id/refresh-content
  - Re-fetch article (detect updates)

POST /api/interests/:id/summarize
  - Generate/regenerate AI summary
```

### Site-Specific Handlers

```javascript
// server/services/article-handlers/
const handlers = {
  'medium.com': extractMedium,
  'dev.to': extractDevTo,
  'substack.com': extractSubstack,
  'docs.': extractDocumentation,  // Pattern match
  'readthedocs.': extractReadTheDocs,
};

function getHandler(url) {
  const hostname = new URL(url).hostname;
  for (const [pattern, handler] of Object.entries(handlers)) {
    if (hostname.includes(pattern)) {
      return handler;
    }
  }
  return extractGeneric; // Default
}
```

### Frontend Components

1. **ArticleCard** - Card with reading time, author
2. **ReaderModeView** - Clean reading experience
   - Typography controls
   - Progress bar
   - Table of contents (if headers detected)
3. **ArticleSummaryPanel** - AI summary display
4. **SeriesIndicator** - "Part 2 of 5" badge with navigation
5. **ReadingProgressTracker** - Resume position

### Reading Progress Tracking

```typescript
interface ReadingProgress {
  interestId: string;
  scrollPosition: number;     // Percentage or pixel
  lastReadAt: string;
  timeSpent: number;          // Seconds
  completed: boolean;
}

// Store in localStorage or db.json
```

---

## Questions to Resolve

1. **Storage**: Store full HTML or convert to markdown?
2. **Updates**: How often to check for article updates?
3. **Paywalls**: How to handle? Show preview only?
4. **Images**: Proxy images or link directly? Broken image handling?
5. **Cookies**: How to handle cookie consent banners?
6. **JavaScript sites**: When to use Puppeteer vs simple fetch?
7. **Legal**: Any concerns with storing article content?

---

## Dependencies

For Option 2 (Recommended for simplicity):
```json
{
  "dependencies": {
    "@mozilla/readability": "^0.5.0",
    "jsdom": "^24.0.0",
    "turndown": "^7.1.2"  // HTML to Markdown
  }
}
```

For Option 1 (MCP):
- Fetch MCP server
- Puppeteer (handled by MCP)

---

## Platform-Specific Notes

### Medium
- Has clean HTML structure
- May require handling "member-only" content
- Detect via `medium.com` or custom domains with Medium

### Dev.to
- Has public API: `https://dev.to/api/articles/{id}`
- Very clean, structured content
- Easy to extract

### Substack
- Email-first platform, web version is clean
- Detect via `*.substack.com`
- May have paywalled content

### Documentation Sites
- Look for `docs.`, `documentation`, `/docs/` patterns
- Often have structured navigation (sidebar)
- Consider adding entire sections

---

## Testing Scenarios

1. Medium article → extract title, author, content
2. Dev.to post → use API, get clean content
3. Personal blog → Readability extraction
4. Documentation page → detect structure
5. Paywalled article → show preview, indicate paywall
6. JS-heavy site → fallback to Puppeteer
7. Article with code blocks → preserve syntax highlighting
8. Article series → detect and link parts
9. Non-English article → detect language
10. Article update → detect content changes

---

## Future Enhancements

- **Offline reading**: Download articles for offline access
- **Annotation**: Highlight and annotate within articles
- **Citation**: Generate citations in various formats
- **Newsletter tracking**: Monitor Substack/newsletter sources
- **Archive.org fallback**: Fetch from Wayback Machine if original is dead
- **PDF support**: Extract content from PDF articles
- **Text-to-speech**: Read articles aloud
- **Translation**: Auto-translate non-English articles
