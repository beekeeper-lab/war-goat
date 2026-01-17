---
id: F004
stage: requirements
title: "Article/Web Page Enrichment"
started_at: 2026-01-17T17:32:58-05:00
completed_at: 2026-01-17T18:15:00-05:00
status: complete
handoff_ready: true
checkpoints:
  - name: requirements_identified
    status: pass
    message: "8 functional requirements defined"
  - name: impact_analyzed
    status: pass
    message: "7 components analyzed with impact levels"
  - name: acceptance_criteria_defined
    status: pass
    message: "14 measurable acceptance criteria defined"
  - name: no_open_blockers
    status: pass
    message: "All questions resolved with reasonable defaults"
retry_count: 0
last_failure: null
---

# Requirements: Article/Web Page Enrichment

## Work Item
- **ID**: F004
- **Type**: Feature
- **Source**: [workflow/F004/status.json](./status.json)

## Executive Summary

This feature extends War Goat's content enrichment capabilities from YouTube videos to general web articles and documentation pages. Users can paste an article URL and the system will automatically extract readable content, metadata (title, author, site name, publication date), and generate AI-powered summaries. This provides a consistent enrichment experience across all content types in the learning management system.

## Detailed Requirements

### Functional Requirements

- **FR-1**: Auto-Extract Article Content - When a user pastes an article URL, the system automatically extracts the main readable content (stripping navigation, ads, and boilerplate) using a reader-mode algorithm.

- **FR-2**: Article Metadata Extraction - The system extracts and populates article metadata including: title, author/byline, site name, publication date, description/excerpt, and a representative image (og:image or first content image).

- **FR-3**: Reader Mode View - Display articles in a clean, distraction-free format within the InterestDetail view, showing only the extracted article content without the original page's chrome.

- **FR-4**: AI Article Summary - Generate AI-powered summaries of article content using MCP, extracting key points, main themes, and actionable takeaways (similar to YouTube study notes).

- **FR-5**: Article Series Detection - Identify when articles belong to a series or documentation hierarchy by detecting navigation patterns (prev/next links, breadcrumbs, numbered titles) and suggest grouping related articles.

- **FR-6**: Documentation Site Support - Handle structured documentation platforms (like ReadTheDocs, GitBook, Docusaurus) by recognizing their URL patterns and extracting content appropriately from their specific layouts.

- **FR-7**: Content Storage - Store extracted article content in the same lazy-loading pattern as YouTube transcripts (`data/articles/{id}.txt`), keeping the main database lightweight.

- **FR-8**: Fallback for Protected Content - When content extraction fails (paywall, login-required, JavaScript-heavy pages), store the URL with a flag indicating extraction failed and allow manual content entry.

### Non-Functional Requirements

- **NFR-1**: Performance - Article content extraction completes within 10 seconds for standard web pages. Pages with complex JavaScript may take up to 15 seconds.

- **NFR-2**: Reliability - Extraction should succeed for at least 80% of standard blog/article URLs. Failed extractions are logged with specific error reasons (timeout, paywall detected, parsing failure).

- **NFR-3**: Usability - The enrichment status indicator shows clear progress: "Extracting content...", "Analyzing article...", "Done!" with visual feedback matching the YouTube enrichment UX pattern.

### Constraints

- **CON-1**: Client-side JavaScript rendering is limited - some SPAs and heavy JS sites may not extract properly without a headless browser (Playwright MCP can help but adds complexity).

- **CON-2**: Paywall/login-protected content cannot be automatically extracted - the system must gracefully handle these cases.

- **CON-3**: Rate limiting - respect robots.txt and implement reasonable delays between requests to the same domain.

- **CON-4**: Content size limit - cap extracted content at 100KB to prevent storage bloat; larger articles are truncated with a notice.

## System Impact Analysis

### Components Affected

| Component | Impact Level | Description |
|-----------|--------------|-------------|
| `server/index.js` | High | Add article enrichment route in `/api/enrich` handler |
| `server/services/article.js` | High | New service for article extraction and metadata parsing |
| `src/services/enrich.ts` | Medium | Add `isArticleUrl()` detection and article enrichment path |
| `src/components/AddInterestModal.tsx` | Medium | Extend auto-enrichment to trigger on article URLs |
| `src/components/InterestDetail.tsx` | Medium | Add reader mode view for displaying extracted article content |
| `src/types/index.ts` | Low | Add article-specific fields (articleContent, wordCount, readingTime, etc.) |
| New: `data/articles/` | Medium | New directory for storing extracted article content |

### Data Changes

- **Database schema changes**: Yes - Add optional fields to InterestItem:
  - `articleContent?: string` (stored separately, like transcript)
  - `hasArticleContent?: boolean`
  - `articleError?: string`
  - `wordCount?: number`
  - `readingTime?: number` (estimated minutes)
  - `excerpt?: string` (first ~200 chars for preview)

- **API changes**: Yes - Extend existing endpoint:
  - `POST /api/enrich` - Add article enrichment path (parallel to YouTube)
  - `GET /api/articles/:id` - Retrieve stored article content

- **Configuration changes**: No - Uses existing enrichment infrastructure

### Dependencies

- **Internal**:
  - Existing enrichment service pattern (`server/services/youtube.js` as template)
  - Transcript storage pattern (reuse for article content)
  - MCP client infrastructure for AI summaries

- **External**:
  - Content extraction library (options: `@mozilla/readability`, `node-readability`, or custom DOM parsing)
  - HTML parser (`cheerio` or `jsdom` for Node.js)
  - Playwright MCP (optional, for JavaScript-heavy pages)
  - Fetch/HTTP client for retrieving pages

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| JavaScript-rendered content fails to extract | High | Medium | Detect SPA patterns and offer Playwright fallback; show clear error |
| Paywall/login detection false positives | Medium | Low | Conservative detection; allow manual override |
| Content extraction quality varies | Medium | Medium | Use well-tested library (Readability); manual content entry fallback |
| Rate limiting by target sites | Low | Low | Implement request delays; respect robots.txt |
| Large articles cause storage issues | Low | Medium | Implement 100KB content cap with truncation notice |

## User Stories

### Primary User Story

As a **learner using War Goat**,
I want to **paste an article URL and have it automatically enriched with content and metadata**
So that **I can read articles in a clean format and have AI help me summarize the key points**.

### Additional User Stories

1. As a user, I want to see article content in a distraction-free reader mode so that I can focus on learning without ads and navigation clutter.

2. As a user, I want AI-generated summaries of articles so that I can quickly understand the main points before committing to read the full content.

3. As a user, I want the system to detect when articles are part of a series so that I can track my progress through multi-part content.

4. As a user, I want to know when content extraction fails so that I can manually add the content or try a different approach.

5. As a user, I want estimated reading time displayed so that I can plan my learning sessions effectively.

## Acceptance Criteria

- [ ] **AC-1**: Verify that pasting an article URL (e.g., `https://example.com/blog/my-article`) in AddInterestModal triggers auto-enrichment with status "Extracting content...".

- [ ] **AC-2**: Verify that after enrichment completes, the title field is auto-populated with the article's `<title>` or `og:title`.

- [ ] **AC-3**: Verify that the author field is populated when available from `<meta name="author">` or article byline.

- [ ] **AC-4**: Verify that a thumbnail is displayed when the article has an `og:image` or suitable content image.

- [ ] **AC-5**: Verify that the InterestDetail view shows a "Read Article" tab/section displaying the extracted content in reader mode format.

- [ ] **AC-6**: Verify that reader mode content includes: title, author, publication date (if available), and article body with preserved headings and paragraphs.

- [ ] **AC-7**: Verify that word count and estimated reading time (words / 200 wpm) are displayed in the article metadata.

- [ ] **AC-8**: Verify that clicking "Generate Summary" produces an AI summary with: 3-5 key points, main theme, and suggested tags.

- [ ] **AC-9**: Verify that article content is stored in `data/articles/{id}.txt` and loaded lazily (not in main db.json).

- [ ] **AC-10**: Verify that extraction failure displays a user-friendly message: "Could not extract content from this page. You can add content manually."

- [ ] **AC-11**: Verify that articles over 100KB are truncated with a notice: "Content truncated. Original article may be longer."

- [ ] **AC-12**: Verify that known documentation site patterns (ReadTheDocs, GitBook, Docusaurus URLs) are detected and tagged appropriately.

- [ ] **AC-13**: Verify that the `siteName` field is populated from `og:site_name` or domain name.

- [ ] **AC-14**: Verify that the enrichment flow completes within 10 seconds for standard article pages (excluding AI summary generation).

## Out of Scope

- **Full browser automation for all pages** - Playwright-based extraction for JS-heavy sites is optional/future enhancement
- **Paywall bypass or login** - Cannot extract content from protected pages
- **PDF extraction** - PDF files are a separate content type, not covered here
- **Image extraction/storage** - Only store image URLs, not the images themselves
- **Automatic series linking** - Detection only; automatic grouping deferred to future work
- **Offline reading/caching** - Content is fetched on demand, not pre-cached

## Open Questions

All questions resolved with reasonable defaults:

- Q1: Content extraction library? **Resolved**: Use `@mozilla/readability` (battle-tested, used by Firefox). [Blocker: no]
- Q2: JavaScript-heavy page handling? **Resolved**: Start with static fetch; Playwright MCP as optional enhancement. [Blocker: no]
- Q3: Article content storage format? **Resolved**: Plain text in `data/articles/`, matching transcript pattern. [Blocker: no]
- Q4: AI summary provider? **Resolved**: Use existing MCP/Claude integration from Obsidian study notes. [Blocker: no]
- Q5: Reader mode styling? **Resolved**: Use existing Tailwind prose classes for clean typography. [Blocker: no]

## Documentation Impact

- [ ] Update `README.md` features section to include article enrichment
- [ ] Add `docs/ARTICLE-ENRICHMENT.md` with usage guide and supported sites
- [ ] Update `docs/MCP-INTEGRATION.md` if Playwright MCP is used

## Handoff to Architecture Agent

### Key Decisions Needed

1. **Content Extraction Approach**: Should we use `@mozilla/readability` directly in Node.js, or leverage the Playwright MCP for more robust extraction?

2. **AI Summary Integration**: Reuse the study notes generation pattern from Obsidian, or create a specialized article summary prompt?

3. **Series Detection Algorithm**: How sophisticated should the series detection be? Simple regex patterns vs. DOM analysis?

4. **Storage Architecture**: Store extracted HTML or plain text? Consider future features like syntax highlighting for code articles.

### Suggested Approach

1. Create `server/services/article.js` following the `youtube.js` pattern:
   - `isArticleUrl(url)` - Returns true for http(s) URLs not matching other patterns
   - `extractArticle(url)` - Fetches and parses using Readability
   - `enrichArticleUrl(url)` - Full enrichment with metadata and content

2. Extend `/api/enrich` endpoint to detect article URLs and call the new service

3. Add article content storage using existing transcript pattern (`data/articles/`)

4. Extend `AddInterestModal.tsx` to trigger enrichment for article URLs (mirror YouTube pattern)

5. Add reader mode view in `InterestDetail.tsx` using Tailwind prose classes

6. Reuse Obsidian study notes AI prompt pattern for article summaries

---
*Generated by Requirements Agent*
*Timestamp: 2026-01-17T18:15:00-05:00*
