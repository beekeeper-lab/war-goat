/**
 * Unit tests for Article Service
 * Following TDD - these tests are written FIRST (RED phase)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isArticleUrl,
  detectDocumentationSite,
  extractMetadata,
  detectSeries,
  extractArticle,
  enrichArticleUrl,
} from '../services/article.js';

describe('Article Service', () => {
  describe('isArticleUrl', () => {
    it('returns true for standard HTTP URLs', () => {
      expect(isArticleUrl('https://example.com/article')).toBe(true);
      expect(isArticleUrl('http://blog.example.com/post/123')).toBe(true);
      expect(isArticleUrl('https://medium.com/@user/my-article')).toBe(true);
    });

    it('returns false for YouTube URLs', () => {
      expect(isArticleUrl('https://youtube.com/watch?v=abc123')).toBe(false);
      expect(isArticleUrl('https://youtu.be/abc123')).toBe(false);
      expect(isArticleUrl('https://www.youtube.com/shorts/abc123')).toBe(false);
    });

    it('returns false for GitHub repository URLs', () => {
      expect(isArticleUrl('https://github.com/user/repo')).toBe(false);
      expect(isArticleUrl('https://github.com/org/project/')).toBe(false);
    });

    it('returns false for non-HTTP URLs', () => {
      expect(isArticleUrl('ftp://example.com/file')).toBe(false);
      expect(isArticleUrl('mailto:test@example.com')).toBe(false);
      expect(isArticleUrl('')).toBe(false);
    });
  });

  describe('detectDocumentationSite', () => {
    it('detects ReadTheDocs sites', () => {
      const result = detectDocumentationSite('https://project.readthedocs.io/en/latest/guide.html');
      expect(result.isDocumentation).toBe(true);
      expect(result.platform).toBe('readthedocs');
    });

    it('detects GitBook sites', () => {
      const result = detectDocumentationSite('https://docs.example.gitbook.io/my-docs/');
      expect(result.isDocumentation).toBe(true);
      expect(result.platform).toBe('gitbook');
    });

    it('detects Docusaurus sites', () => {
      const result = detectDocumentationSite('https://example.com/docs/getting-started');
      expect(result.isDocumentation).toBe(true);
      expect(result.platform).toBe('docusaurus');
    });

    it('detects MkDocs sites', () => {
      const result = detectDocumentationSite('https://example.com/mkdocs/tutorial/');
      expect(result.isDocumentation).toBe(true);
      expect(result.platform).toBe('mkdocs');
    });

    it('returns false for non-documentation sites', () => {
      const result = detectDocumentationSite('https://blog.example.com/article');
      expect(result.isDocumentation).toBe(false);
      expect(result.platform).toBeUndefined();
    });
  });

  describe('extractMetadata', () => {
    const createMockDocument = (html) => {
      // This will be implemented using JSDOM in the actual tests
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM(html, { url: 'https://example.com/article' });
      return dom.window.document;
    };

    it('extracts og:title when present', () => {
      const doc = createMockDocument(`
        <html>
          <head>
            <meta property="og:title" content="Test Article Title">
            <title>Fallback Title</title>
          </head>
          <body></body>
        </html>
      `);
      const metadata = extractMetadata(doc, 'https://example.com/article');
      expect(metadata.title).toBe('Test Article Title');
    });

    it('falls back to title tag when og:title missing', () => {
      const doc = createMockDocument(`
        <html>
          <head><title>Page Title</title></head>
          <body></body>
        </html>
      `);
      const metadata = extractMetadata(doc, 'https://example.com/article');
      expect(metadata.title).toBe('Page Title');
    });

    it('extracts og:image for thumbnail', () => {
      const doc = createMockDocument(`
        <html>
          <head>
            <meta property="og:image" content="https://example.com/image.jpg">
          </head>
          <body></body>
        </html>
      `);
      const metadata = extractMetadata(doc, 'https://example.com/article');
      expect(metadata.thumbnail).toBe('https://example.com/image.jpg');
    });

    it('extracts author from meta tag', () => {
      const doc = createMockDocument(`
        <html>
          <head>
            <meta name="author" content="John Doe">
          </head>
          <body></body>
        </html>
      `);
      const metadata = extractMetadata(doc, 'https://example.com/article');
      expect(metadata.author).toBe('John Doe');
    });

    it('extracts og:site_name', () => {
      const doc = createMockDocument(`
        <html>
          <head>
            <meta property="og:site_name" content="Example Blog">
          </head>
          <body></body>
        </html>
      `);
      const metadata = extractMetadata(doc, 'https://example.com/article');
      expect(metadata.siteName).toBe('Example Blog');
    });

    it('falls back to domain for siteName when og:site_name missing', () => {
      const doc = createMockDocument(`
        <html><head></head><body></body></html>
      `);
      const metadata = extractMetadata(doc, 'https://blog.example.com/article');
      expect(metadata.siteName).toBe('blog.example.com');
    });

    it('extracts published date from article:published_time', () => {
      const doc = createMockDocument(`
        <html>
          <head>
            <meta property="article:published_time" content="2024-01-15T10:30:00Z">
          </head>
          <body></body>
        </html>
      `);
      const metadata = extractMetadata(doc, 'https://example.com/article');
      expect(metadata.publishedDate).toBe('2024-01-15T10:30:00Z');
    });
  });

  describe('detectSeries', () => {
    const createMockDocument = (html) => {
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM(html, { url: 'https://example.com/article' });
      return dom.window.document;
    };

    it('detects prev/next navigation links', () => {
      const doc = createMockDocument(`
        <html>
          <body>
            <a rel="prev" href="/part-1">Previous</a>
            <a rel="next" href="/part-3">Next</a>
          </body>
        </html>
      `);
      const series = detectSeries(doc);
      expect(series.isPart).toBe(true);
      expect(series.prevUrl).toBe('/part-1');
      expect(series.nextUrl).toBe('/part-3');
    });

    it('detects breadcrumb navigation', () => {
      const doc = createMockDocument(`
        <html>
          <body>
            <nav aria-label="breadcrumb">
              <ol>
                <li><a href="/">Home</a></li>
                <li><a href="/tutorials">Tutorials</a></li>
                <li>Current Article</li>
              </ol>
            </nav>
          </body>
        </html>
      `);
      const series = detectSeries(doc);
      expect(series.isPart).toBe(true);
      expect(series.breadcrumbs).toContain('Tutorials');
    });

    it('returns isPart false when no series indicators found', () => {
      const doc = createMockDocument(`
        <html><body><p>Just a regular article</p></body></html>
      `);
      const series = detectSeries(doc);
      expect(series.isPart).toBe(false);
    });
  });

  describe('extractArticle', () => {
    it('extracts readable content using Readability', async () => {
      const html = `
        <html>
          <head><title>Test Article</title></head>
          <body>
            <nav>Navigation content to strip</nav>
            <article>
              <h1>Main Article Title</h1>
              <p>This is the main article content that should be extracted. It contains important information that readers want to see.</p>
              <p>Here is another paragraph with more content to ensure we have enough text for the readability algorithm to work with properly.</p>
            </article>
            <aside>Sidebar content to strip</aside>
          </body>
        </html>
      `;
      const result = await extractArticle(html, 'https://example.com/article');

      expect(result.content).toContain('main article content');
      expect(result.content).not.toContain('Navigation content');
      expect(result.excerpt).toBeDefined();
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.readingTime).toBeGreaterThan(0);
    });

    it('calculates word count correctly', async () => {
      const html = `
        <html>
          <head><title>Test</title></head>
          <body>
            <article>
              <p>One two three four five six seven eight nine ten.</p>
              <p>Eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty.</p>
            </article>
          </body>
        </html>
      `;
      const result = await extractArticle(html, 'https://example.com/article');
      expect(result.wordCount).toBe(20);
    });

    it('calculates reading time at 200 wpm', async () => {
      // 400 words should be 2 minutes
      const words = Array(400).fill('word').join(' ');
      const html = `
        <html>
          <head><title>Test</title></head>
          <body><article><p>${words}</p></article></body>
        </html>
      `;
      const result = await extractArticle(html, 'https://example.com/article');
      expect(result.readingTime).toBe(2);
    });

    it('truncates content at 100KB limit', async () => {
      // Create content larger than 100KB
      const largeContent = 'x'.repeat(150 * 1024);
      const html = `
        <html>
          <head><title>Large Article</title></head>
          <body><article><p>${largeContent}</p></article></body>
        </html>
      `;
      const result = await extractArticle(html, 'https://example.com/article');
      expect(result.content.length).toBeLessThanOrEqual(100 * 1024 + 100); // Allow for truncation message
      expect(result.truncated).toBe(true);
    });

    it('creates excerpt from first 200 characters', async () => {
      const html = `
        <html>
          <head><title>Test</title></head>
          <body>
            <article>
              <p>This is the beginning of the article content that will be used to generate an excerpt for preview purposes in the UI.</p>
            </article>
          </body>
        </html>
      `;
      const result = await extractArticle(html, 'https://example.com/article');
      expect(result.excerpt.length).toBeLessThanOrEqual(200);
      expect(result.excerpt).toContain('beginning');
    });

    it('returns error for content that cannot be extracted', async () => {
      const html = `<html><head></head><body><script>window.location = '/login'</script></body></html>`;
      const result = await extractArticle(html, 'https://example.com/article');
      expect(result.error).toBeDefined();
    });
  });

  describe('enrichArticleUrl', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns properly shaped result object', async () => {
      // Mock fetch to return a sample HTML page
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`
          <html>
            <head>
              <title>Sample Article</title>
              <meta property="og:title" content="Sample Article">
              <meta name="author" content="Test Author">
              <meta property="og:site_name" content="Test Site">
              <meta property="og:image" content="https://example.com/thumb.jpg">
            </head>
            <body>
              <article>
                <h1>Sample Article</h1>
                <p>This is sample article content for testing the enrichment function. It needs enough text to be considered valid by readability.</p>
                <p>Adding more paragraphs helps the extraction algorithm work better with our test content.</p>
              </article>
            </body>
          </html>
        `),
      });

      const result = await enrichArticleUrl('https://example.com/sample-article');

      expect(result.success).toBe(true);
      expect(result.type).toBe('article');
      expect(result.data).toMatchObject({
        url: 'https://example.com/sample-article',
        type: 'article',
        title: expect.any(String),
        articleContent: expect.any(String),
        wordCount: expect.any(Number),
        readingTime: expect.any(Number),
      });
    });

    it('handles fetch errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await enrichArticleUrl('https://example.com/article');

      // Per architecture spec: always return success: true with articleError in data
      expect(result.success).toBe(true);
      expect(result.data.articleError).toBeDefined();
      expect(result.data.articleError).toContain('Network error');
    });

    it('handles extraction failures gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html><body></body></html>'),
      });

      const result = await enrichArticleUrl('https://example.com/empty');

      expect(result.success).toBe(true);
      expect(result.data.articleError).toBeDefined();
    });

    it('enrichment completes within reasonable time', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`
          <html>
            <head><title>Test</title></head>
            <body><article><p>Test content</p></article></body>
          </html>
        `),
      });

      const start = Date.now();
      await enrichArticleUrl('https://example.com/article');
      const elapsed = Date.now() - start;

      // Should complete well under 10 seconds (requirement AC-14)
      expect(elapsed).toBeLessThan(5000);
    });
  });
});
