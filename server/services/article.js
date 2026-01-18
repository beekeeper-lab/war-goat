/**
 * Article Service
 *
 * High-level service for article extraction and enrichment.
 * Uses Mozilla Readability for content extraction and JSDOM for parsing.
 *
 * @example
 * import { enrichArticleUrl, isArticleUrl } from './services/article.js';
 *
 * if (isArticleUrl(url)) {
 *   const data = await enrichArticleUrl(url);
 *   // { title, author, siteName, articleContent, ... }
 * }
 */

import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// Content size limit (100KB)
const MAX_CONTENT_SIZE = 100 * 1024;

// URL patterns to exclude from article detection
const NON_ARTICLE_PATTERNS = [
  /youtube\.com/,
  /youtu\.be/,
  /github\.com\/[\w-]+\/[\w-]+\/?$/,  // GitHub repos
  /github\.com\/[\w-]+\/[\w-]+\/?(?:\?.*)?$/,
  /spotify\.com/,
  /podcasts\.apple\.com/,
  /audible\.com/,
];

// Documentation site patterns
const DOC_SITE_PATTERNS = {
  readthedocs: /\.readthedocs\.io/,
  gitbook: /\.gitbook\.io/,
  docusaurus: /\/docs\//,
  mkdocs: /mkdocs/,
  sphinx: /sphinx/,
};

/**
 * Check if URL should be treated as an article
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isArticleUrl(url) {
  if (!url) return false;

  // Must be HTTP or HTTPS
  if (!/^https?:\/\//i.test(url)) {
    return false;
  }

  // Check against exclusion patterns
  for (const pattern of NON_ARTICLE_PATTERNS) {
    if (pattern.test(url)) {
      return false;
    }
  }

  return true;
}

/**
 * Detect known documentation site patterns
 * @param {string} url - URL to check
 * @returns {{ isDocumentation: boolean, platform?: string }}
 */
export function detectDocumentationSite(url) {
  if (!url) return { isDocumentation: false };

  for (const [platform, pattern] of Object.entries(DOC_SITE_PATTERNS)) {
    if (pattern.test(url)) {
      return { isDocumentation: true, platform };
    }
  }

  return { isDocumentation: false };
}

/**
 * Extract article metadata from parsed document
 * @param {Document} document - Parsed DOM document
 * @param {string} url - Original URL for fallbacks
 * @returns {Object} - { title, author, siteName, publishedDate, thumbnail }
 */
export function extractMetadata(document, url) {
  const getMetaContent = (selectors) => {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        return el.getAttribute('content') || el.textContent;
      }
    }
    return null;
  };

  // Extract title (og:title > title tag)
  const title = getMetaContent([
    'meta[property="og:title"]',
    'meta[name="title"]',
  ]) || document.title || 'Untitled';

  // Extract author
  const author = getMetaContent([
    'meta[name="author"]',
    'meta[property="article:author"]',
    'meta[name="twitter:creator"]',
  ]) || extractBylineFromContent(document);

  // Extract site name
  let siteName = getMetaContent([
    'meta[property="og:site_name"]',
    'meta[name="application-name"]',
  ]);

  // Fallback to domain name
  if (!siteName) {
    try {
      const urlObj = new URL(url);
      siteName = urlObj.hostname;
    } catch {
      siteName = null;
    }
  }

  // Extract published date
  const publishedDate = getMetaContent([
    'meta[property="article:published_time"]',
    'meta[name="date"]',
    'meta[name="pubdate"]',
    'meta[property="og:published_time"]',
  ]);

  // Extract thumbnail
  const thumbnail = getMetaContent([
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
  ]) || findFirstContentImage(document, url);

  // Extract description/excerpt
  const description = getMetaContent([
    'meta[property="og:description"]',
    'meta[name="description"]',
    'meta[name="twitter:description"]',
  ]);

  return {
    title: title?.trim(),
    author: author?.trim(),
    siteName: siteName?.trim(),
    publishedDate,
    thumbnail,
    description: description?.trim(),
  };
}

/**
 * Try to extract author from article byline
 * @param {Document} document
 * @returns {string|null}
 */
function extractBylineFromContent(document) {
  const bylineSelectors = [
    '.author',
    '.byline',
    '[rel="author"]',
    '.post-author',
    '.article-author',
  ];

  for (const selector of bylineSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      return el.textContent?.trim();
    }
  }

  return null;
}

/**
 * Find first content image in the article
 * @param {Document} document
 * @param {string} baseUrl - Base URL for resolving relative URLs
 * @returns {string|null}
 */
function findFirstContentImage(document, baseUrl) {
  const article = document.querySelector('article') || document.body;
  const img = article?.querySelector('img[src]');

  if (img) {
    const src = img.getAttribute('src');
    try {
      // Convert relative URLs to absolute
      return new URL(src, baseUrl).href;
    } catch {
      return src;
    }
  }

  return null;
}

/**
 * Detect if article is part of a series
 * @param {Document} document
 * @returns {Object} - { isPart, prevUrl, nextUrl, breadcrumbs }
 */
export function detectSeries(document) {
  const result = {
    isPart: false,
    prevUrl: null,
    nextUrl: null,
    breadcrumbs: [],
  };

  // Check for prev/next links
  const prevLink = document.querySelector('a[rel="prev"], a.prev, .pagination a.previous');
  const nextLink = document.querySelector('a[rel="next"], a.next, .pagination a.next');

  if (prevLink) {
    result.prevUrl = prevLink.getAttribute('href');
    result.isPart = true;
  }

  if (nextLink) {
    result.nextUrl = nextLink.getAttribute('href');
    result.isPart = true;
  }

  // Check for breadcrumbs
  const breadcrumbNav = document.querySelector(
    'nav[aria-label="breadcrumb"], .breadcrumb, .breadcrumbs, [itemtype*="BreadcrumbList"]'
  );

  if (breadcrumbNav) {
    const items = breadcrumbNav.querySelectorAll('li, a, span[itemprop="name"]');
    const crumbs = [];

    items.forEach((item) => {
      const text = item.textContent?.trim();
      if (text && text.length > 0 && text.length < 100) {
        crumbs.push(text);
      }
    });

    if (crumbs.length > 1) {
      result.breadcrumbs = crumbs.slice(0, -1); // Exclude current page
      result.isPart = true;
    }
  }

  // Check for numbered title patterns (e.g., "Part 2:", "Chapter 3")
  const title = document.title || '';
  if (/(?:part|chapter|section|lesson|episode)\s*\d+/i.test(title)) {
    result.isPart = true;
  }

  return result;
}

/**
 * Extract readable article content
 * @param {string} html - Raw HTML content
 * @param {string} url - Original URL
 * @returns {Promise<Object>} - { content, excerpt, wordCount, readingTime, truncated, error }
 */
export async function extractArticle(html, url) {
  try {
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;

    // Clone document for Readability (it modifies the DOM)
    const docClone = document.cloneNode(true);

    const reader = new Readability(docClone);
    const article = reader.parse();

    if (!article || !article.textContent) {
      return {
        content: null,
        excerpt: null,
        wordCount: 0,
        readingTime: 0,
        truncated: false,
        error: 'Could not extract content from this page. The page may require JavaScript or be behind a paywall.',
      };
    }

    // Get plain text content
    let content = article.textContent;
    let truncated = false;

    // Enforce size limit
    if (content.length > MAX_CONTENT_SIZE) {
      content = content.substring(0, MAX_CONTENT_SIZE) + '\n\n[Content truncated. Original article may be longer.]';
      truncated = true;
    }

    // Calculate word count
    const words = content.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    // Calculate reading time (200 wpm)
    const readingTime = Math.ceil(wordCount / 200);

    // Create excerpt (first ~200 chars)
    const excerpt = content.substring(0, 200).trim() + (content.length > 200 ? '...' : '');

    return {
      content,
      excerpt,
      wordCount,
      readingTime,
      truncated,
      title: article.title,
      error: null,
    };
  } catch (err) {
    console.error('[Article] Extraction failed:', err.message);
    return {
      content: null,
      excerpt: null,
      wordCount: 0,
      readingTime: 0,
      truncated: false,
      error: `Extraction failed: ${err.message}`,
    };
  }
}

/**
 * Fetch HTML content from URL
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; WarGoat/1.0; +https://wargoat.example.com)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15000), // 15 second timeout
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.text();
}

/**
 * Fetch and extract article from URL
 * @param {string} url
 * @returns {Promise<Object>} - Full extraction result
 */
export async function fetchAndExtract(url) {
  const html = await fetchHtml(url);
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  // Extract metadata
  const metadata = extractMetadata(document, url);

  // Detect documentation site
  const docInfo = detectDocumentationSite(url);

  // Detect series
  const seriesInfo = detectSeries(document);

  // Extract article content
  const articleResult = await extractArticle(html, url);

  return {
    ...metadata,
    ...docInfo,
    seriesInfo,
    ...articleResult,
  };
}

/**
 * Full article enrichment - main entry point
 * @param {string} url
 * @returns {Promise<Object>} - Enrichment result matching API response shape
 */
export async function enrichArticleUrl(url) {
  try {
    console.log(`[Article] Enriching: ${url}`);

    const result = await fetchAndExtract(url);

    return {
      success: true,
      type: 'article',
      data: {
        url,
        type: 'article',
        title: result.title || 'Untitled Article',
        author: result.author,
        siteName: result.siteName,
        publishedDate: result.publishedDate,
        thumbnail: result.thumbnail,
        description: result.description,
        excerpt: result.excerpt,
        articleContent: result.content,
        wordCount: result.wordCount || 0,
        readingTime: result.readingTime || 0,
        isDocumentation: result.isDocumentation || false,
        seriesInfo: result.seriesInfo,
        hasArticleContent: !!result.content,
        articleError: result.error,
        truncated: result.truncated,
      },
    };
  } catch (err) {
    console.error('[Article] Enrichment failed:', err.message);

    return {
      success: true, // Still "successful" but with error in data
      type: 'article',
      data: {
        url,
        type: 'article',
        title: 'Article',
        hasArticleContent: false,
        articleError: `Could not extract content: ${err.message}`,
        wordCount: 0,
        readingTime: 0,
      },
    };
  }
}

/**
 * Generate AI summary for article content
 * @param {string} content - Article text
 * @param {string} title - Article title
 * @returns {Promise<Object>} - Summary with key points
 */
export async function generateArticleSummary(content, title) {
  if (!ANTHROPIC_API_KEY) {
    console.warn('[Article] ANTHROPIC_API_KEY not set, skipping summary generation');
    return null;
  }

  if (!content || content.length < 100) {
    return null;
  }

  try {
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    // Truncate content if too long
    const maxLength = 50000;
    const truncatedContent = content.length > maxLength
      ? content.substring(0, maxLength) + '\n\n[Content truncated...]'
      : content;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Analyze the following article "${title}" and create a structured summary.

Return a JSON object with this exact structure:
{
  "summary": "2-3 paragraph summary of the main content",
  "keyPoints": [
    "Key point 1",
    "Key point 2",
    "Key point 3"
  ],
  "mainTheme": "One sentence describing the main theme",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "actionItems": ["Actionable takeaway 1", "Actionable takeaway 2"]
}

Include 3-5 key points, a clear main theme, 3-5 suggested tags, and 2-3 action items.

ARTICLE CONTENT:
${truncatedContent}

Respond with ONLY the JSON object, no other text.`
      }]
    });

    const text = response.content[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const summary = JSON.parse(jsonMatch[0]);
      return {
        summary: summary.summary || '',
        keyPoints: summary.keyPoints || [],
        mainTheme: summary.mainTheme || '',
        suggestedTags: summary.suggestedTags || [],
        actionItems: summary.actionItems || [],
      };
    }

    return null;
  } catch (err) {
    console.error('[Article] Summary generation failed:', err);
    return null;
  }
}

export default {
  isArticleUrl,
  detectDocumentationSite,
  extractMetadata,
  detectSeries,
  extractArticle,
  fetchAndExtract,
  enrichArticleUrl,
  generateArticleSummary,
};
