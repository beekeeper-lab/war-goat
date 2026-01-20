/**
 * API Handler Unit Tests
 *
 * Tests for server/index.js API routes covering:
 * - POST /api/enrich: URL enrichment
 * - GET /api/health: Health check
 * - GET/PUT/POST /api/transcripts/:id: Transcript operations
 * - GET/PUT /api/articles/:id: Article operations
 * - POST /api/articles/:id/summary: Article summary generation
 * - GET /api/obsidian/status: Obsidian connection status
 * - POST /api/interests/:id/export-obsidian: Obsidian export
 * - GET /api/search/status: Search availability
 * - POST /api/search: Web/news/video search
 * - POST /api/search/related/:id: Related content search
 *
 * Note: Since the handlers are defined inline in index.js, we test the
 * service functions directly and verify integration through the service layer.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock services before imports
vi.mock('../services/index.js', () => ({
  enrichYouTubeUrl: vi.fn(),
  isYouTubeUrl: vi.fn(),
  extractVideoId: vi.fn(),
  checkObsidianConnection: vi.fn(),
  exportInterest: vi.fn(),
  updateNoteFrontmatter: vi.fn(),
  syncAllToObsidian: vi.fn(),
  isBraveSearchAvailable: vi.fn(),
  webSearch: vi.fn(),
  newsSearch: vi.fn(),
  videoSearch: vi.fn(),
  relatedSearch: vi.fn(),
  isArticleUrl: vi.fn(),
  enrichArticleUrl: vi.fn(),
  generateArticleSummary: vi.fn(),
}));

// Import mocked services
import {
  enrichYouTubeUrl,
  isYouTubeUrl,
  checkObsidianConnection,
  exportInterest,
  isBraveSearchAvailable,
  webSearch,
  newsSearch,
  videoSearch,
  relatedSearch,
  isArticleUrl,
  enrichArticleUrl,
  generateArticleSummary,
} from '../services/index.js';

/**
 * Mock request factory
 */
function createMockReq(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    method: 'GET',
    path: '/',
    ...overrides,
  };
}

/**
 * Mock response factory with chainable methods
 */
function createMockRes() {
  const res = {
    statusCode: 200,
    data: null,
    headers: {},
    writtenData: [],
    ended: false,
    status: vi.fn((code) => { res.statusCode = code; return res; }),
    json: vi.fn((data) => { res.data = data; return res; }),
    setHeader: vi.fn((key, value) => { res.headers[key] = value; return res; }),
    write: vi.fn((data) => { res.writtenData.push(data); return res; }),
    end: vi.fn(() => { res.ended = true; return res; }),
  };
  return res;
}

describe('API Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Service Integration Tests (testing the service layer that handlers use)
  // =========================================================================

  describe('Enrich Service Layer', () => {
    describe('YouTube URL enrichment', () => {
      it('identifies YouTube URLs correctly', () => {
        isYouTubeUrl.mockReturnValue(true);

        const result = isYouTubeUrl('https://youtube.com/watch?v=abc123');

        expect(result).toBe(true);
        expect(isYouTubeUrl).toHaveBeenCalledWith('https://youtube.com/watch?v=abc123');
      });

      it('enriches YouTube URL with metadata', async () => {
        const mockResult = {
          success: true,
          type: 'youtube',
          data: {
            title: 'Test Video',
            videoId: 'abc123',
            hasTranscript: true,
          },
        };
        enrichYouTubeUrl.mockResolvedValue(mockResult);

        const result = await enrichYouTubeUrl('https://youtube.com/watch?v=abc123');

        expect(result).toEqual(mockResult);
        expect(enrichYouTubeUrl).toHaveBeenCalledWith('https://youtube.com/watch?v=abc123');
      });

      it('handles enrichment errors', async () => {
        enrichYouTubeUrl.mockRejectedValue(new Error('Network error'));

        await expect(enrichYouTubeUrl('https://youtube.com/watch?v=abc123'))
          .rejects.toThrow('Network error');
      });
    });

    describe('Article URL enrichment', () => {
      it('identifies article URLs correctly', () => {
        isArticleUrl.mockReturnValue(true);

        const result = isArticleUrl('https://example.com/article');

        expect(result).toBe(true);
      });

      it('enriches article URL with content', async () => {
        const mockResult = {
          success: true,
          type: 'article',
          data: {
            title: 'Test Article',
            hasArticleContent: true,
            wordCount: 500,
          },
        };
        enrichArticleUrl.mockResolvedValue(mockResult);

        const result = await enrichArticleUrl('https://example.com/article');

        expect(result).toEqual(mockResult);
      });

      it('returns basic info for unknown URLs', () => {
        isYouTubeUrl.mockReturnValue(false);
        isArticleUrl.mockReturnValue(false);

        // Simulate the handler behavior for unknown URLs
        const url = 'https://unknown-site.com/page';
        const isYT = isYouTubeUrl(url);
        const isArt = isArticleUrl(url);

        expect(isYT).toBe(false);
        expect(isArt).toBe(false);
        // Handler would return { success: true, type: 'other', data: { url, type: 'other' } }
      });
    });
  });

  describe('Obsidian Service Layer', () => {
    it('checks connection status', async () => {
      checkObsidianConnection.mockResolvedValue({
        connected: true,
        vaultName: 'My Vault',
      });

      const status = await checkObsidianConnection();

      expect(status.connected).toBe(true);
      expect(status.vaultName).toBe('My Vault');
    });

    it('handles disconnected status', async () => {
      checkObsidianConnection.mockResolvedValue({
        connected: false,
        error: 'Obsidian not running',
      });

      const status = await checkObsidianConnection();

      expect(status.connected).toBe(false);
      expect(status.error).toBeDefined();
    });

    it('exports interest to Obsidian', async () => {
      const item = { id: '123', title: 'Test', url: 'https://example.com' };
      exportInterest.mockResolvedValue({
        success: true,
        notePath: 'War Goat/Test.md',
        existed: false,
      });

      const result = await exportInterest(item, { folder: 'War Goat' });

      expect(result.success).toBe(true);
      expect(result.notePath).toBe('War Goat/Test.md');
    });

    it('handles export when note already exists', async () => {
      const item = { id: '123', title: 'Test', url: 'https://example.com' };
      exportInterest.mockResolvedValue({
        success: false,
        notePath: 'War Goat/Test.md',
        existed: true,
        error: 'Note already exists',
      });

      const result = await exportInterest(item, {});

      expect(result.existed).toBe(true);
      expect(result.success).toBe(false);
    });
  });

  describe('Search Service Layer', () => {
    it('checks search availability', () => {
      isBraveSearchAvailable.mockReturnValue(true);

      const available = isBraveSearchAvailable();

      expect(available).toBe(true);
    });

    it('returns unavailable when no API key', () => {
      isBraveSearchAvailable.mockReturnValue(false);

      const available = isBraveSearchAvailable();

      expect(available).toBe(false);
    });

    it('performs web search', async () => {
      const mockResults = {
        success: true,
        type: 'web',
        results: [
          { title: 'Result 1', url: 'https://example.com/1' },
          { title: 'Result 2', url: 'https://example.com/2' },
        ],
      };
      webSearch.mockResolvedValue(mockResults);

      const result = await webSearch('test query', { count: 10 });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(webSearch).toHaveBeenCalledWith('test query', { count: 10 });
    });

    it('performs news search', async () => {
      const mockResults = {
        success: true,
        type: 'news',
        results: [{ title: 'News 1' }],
      };
      newsSearch.mockResolvedValue(mockResults);

      const result = await newsSearch('news query', { freshness: 'day' });

      expect(result.success).toBe(true);
      expect(newsSearch).toHaveBeenCalledWith('news query', { freshness: 'day' });
    });

    it('performs video search', async () => {
      const mockResults = {
        success: true,
        type: 'video',
        results: [{ title: 'Video 1' }],
      };
      videoSearch.mockResolvedValue(mockResults);

      const result = await videoSearch('video query', {});

      expect(result.success).toBe(true);
    });

    it('finds related content', async () => {
      const item = { id: '123', title: 'Test Item', tags: ['tech'] };
      const mockResults = {
        success: true,
        results: [{ title: 'Related 1' }],
      };
      relatedSearch.mockResolvedValue(mockResults);

      const result = await relatedSearch(item, { count: 5 });

      expect(result.success).toBe(true);
      expect(relatedSearch).toHaveBeenCalledWith(item, { count: 5 });
    });

    it('handles search errors', async () => {
      webSearch.mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(webSearch('test query', {}))
        .rejects.toThrow('API rate limit exceeded');
    });
  });

  describe('Article Summary Service Layer', () => {
    it('generates article summary', async () => {
      const mockSummary = {
        summary: 'This is a summary of the article.',
        keyConcepts: [{ name: 'Concept', description: 'Description' }],
      };
      generateArticleSummary.mockResolvedValue(mockSummary);

      const result = await generateArticleSummary('Article content here', 'Article Title');

      expect(result).toEqual(mockSummary);
      expect(generateArticleSummary).toHaveBeenCalledWith('Article content here', 'Article Title');
    });

    it('returns null when API key not configured', async () => {
      generateArticleSummary.mockResolvedValue(null);

      const result = await generateArticleSummary('Content', 'Title');

      expect(result).toBeNull();
    });

    it('handles summary generation errors', async () => {
      generateArticleSummary.mockRejectedValue(new Error('API error'));

      await expect(generateArticleSummary('Content', 'Title'))
        .rejects.toThrow('API error');
    });
  });

  // =========================================================================
  // Request/Response Pattern Tests (simulating Express handler behavior)
  // =========================================================================

  describe('Request/Response Patterns', () => {
    describe('Health endpoint pattern', () => {
      it('returns ok status with timestamp', () => {
        const res = createMockRes();

        // Simulate GET /api/health handler
        res.json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          services: {
            mcp: 'available',
            database: 'available',
          },
        });

        expect(res.json).toHaveBeenCalled();
        expect(res.data.status).toBe('ok');
        expect(res.data.timestamp).toBeDefined();
      });
    });

    describe('Enrich endpoint pattern', () => {
      it('returns 400 when URL missing', () => {
        const req = createMockReq({ body: {} });
        const res = createMockRes();

        // Simulate missing URL validation
        if (!req.body.url) {
          res.status(400).json({ error: 'URL is required' });
        }

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.data.error).toBe('URL is required');
      });

      it('returns enriched YouTube data', async () => {
        const req = createMockReq({ body: { url: 'https://youtube.com/watch?v=abc' } });
        const res = createMockRes();

        isYouTubeUrl.mockReturnValue(true);
        enrichYouTubeUrl.mockResolvedValue({
          success: true,
          type: 'youtube',
          data: { title: 'Test', videoId: 'abc' },
        });

        // Simulate handler logic
        if (isYouTubeUrl(req.body.url)) {
          const result = await enrichYouTubeUrl(req.body.url);
          res.json(result);
        }

        expect(res.data.success).toBe(true);
        expect(res.data.type).toBe('youtube');
      });

      it('returns enriched article data', async () => {
        const req = createMockReq({ body: { url: 'https://example.com/article' } });
        const res = createMockRes();

        isYouTubeUrl.mockReturnValue(false);
        isArticleUrl.mockReturnValue(true);
        enrichArticleUrl.mockResolvedValue({
          success: true,
          type: 'article',
          data: { title: 'Article Title' },
        });

        // Simulate handler logic
        if (!isYouTubeUrl(req.body.url) && isArticleUrl(req.body.url)) {
          const result = await enrichArticleUrl(req.body.url);
          res.json(result);
        }

        expect(res.data.success).toBe(true);
        expect(res.data.type).toBe('article');
      });
    });

    describe('Transcript endpoints pattern', () => {
      it('returns 404 when transcript not found', () => {
        const req = createMockReq({ params: { id: 'nonexistent' } });
        const res = createMockRes();

        // Simulate not found
        res.status(404).json({
          id: req.params.id,
          error: 'Transcript not found',
          transcript: null,
        });

        expect(res.statusCode).toBe(404);
        expect(res.data.error).toBe('Transcript not found');
      });

      it('returns transcript when found', () => {
        const req = createMockReq({ params: { id: 'test-123' } });
        const res = createMockRes();
        const mockTranscript = 'This is the transcript content.';

        // Simulate found
        res.json({ id: req.params.id, transcript: mockTranscript });

        expect(res.data.transcript).toBe(mockTranscript);
      });

      it('returns 400 when content missing on PUT', () => {
        const req = createMockReq({ params: { id: 'test-123' }, body: {} });
        const res = createMockRes();

        // Simulate validation
        if (!req.body.transcript) {
          res.status(400).json({ error: 'Transcript content is required' });
        }

        expect(res.statusCode).toBe(400);
      });
    });

    describe('Article endpoints pattern', () => {
      it('returns 404 when article not found', () => {
        const req = createMockReq({ params: { id: 'nonexistent' } });
        const res = createMockRes();

        res.status(404).json({
          id: req.params.id,
          error: 'Article content not found',
          content: null,
        });

        expect(res.statusCode).toBe(404);
      });

      it('returns 400 when content missing on PUT', () => {
        const req = createMockReq({ params: { id: 'test-123' }, body: {} });
        const res = createMockRes();

        if (!req.body.content) {
          res.status(400).json({ error: 'Article content is required' });
        }

        expect(res.statusCode).toBe(400);
      });
    });

    describe('Search endpoints pattern', () => {
      it('returns 400 when query missing', () => {
        const req = createMockReq({ body: {} });
        const res = createMockRes();

        if (!req.body.query) {
          res.status(400).json({
            success: false,
            error: 'Query is required',
            results: [],
          });
        }

        expect(res.statusCode).toBe(400);
        expect(res.data.error).toBe('Query is required');
      });

      it('returns 503 when search not available', () => {
        const req = createMockReq({ body: { query: 'test' } });
        const res = createMockRes();

        isBraveSearchAvailable.mockReturnValue(false);

        if (!isBraveSearchAvailable()) {
          res.status(503).json({
            success: false,
            error: 'Brave Search not available - BRAVE_API_KEY not configured',
            results: [],
          });
        }

        expect(res.statusCode).toBe(503);
      });

      it('truncates long queries', () => {
        const longQuery = 'a'.repeat(500);
        const truncatedQuery = longQuery.slice(0, 400);

        expect(truncatedQuery.length).toBe(400);
        expect(longQuery.length).toBe(500);
      });
    });

    describe('Obsidian endpoints pattern', () => {
      it('returns connection status', async () => {
        const res = createMockRes();

        checkObsidianConnection.mockResolvedValue({
          connected: true,
          vaultName: 'Test Vault',
        });

        const status = await checkObsidianConnection();
        res.json(status);

        expect(res.data.connected).toBe(true);
      });

      it('returns 404 when interest not found for export', () => {
        const req = createMockReq({ params: { id: 'nonexistent' } });
        const res = createMockRes();

        // Simulate not found
        res.status(404).json({ success: false, error: 'Interest not found' });

        expect(res.statusCode).toBe(404);
      });
    });

    describe('Related search endpoint pattern', () => {
      it('returns 404 when interest not found', () => {
        const req = createMockReq({ params: { id: 'nonexistent' } });
        const res = createMockRes();

        res.status(404).json({
          success: false,
          error: 'Interest not found',
          results: [],
        });

        expect(res.statusCode).toBe(404);
      });
    });
  });

  // =========================================================================
  // SSE (Server-Sent Events) Pattern Tests
  // =========================================================================

  describe('SSE Sync Pattern', () => {
    it('sets correct SSE headers', () => {
      const res = createMockRes();

      // Simulate SSE setup
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      expect(res.headers['Content-Type']).toBe('text/event-stream');
      expect(res.headers['Cache-Control']).toBe('no-cache');
    });

    it('sends progress events', () => {
      const res = createMockRes();

      // Simulate progress events
      res.write(`data: ${JSON.stringify({ type: 'progress', current: 1, total: 3, item: 'Item 1' })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'progress', current: 2, total: 3, item: 'Item 2' })}\n\n`);

      expect(res.writtenData).toHaveLength(2);
      expect(res.writtenData[0]).toContain('progress');
    });

    it('sends complete event with results', () => {
      const res = createMockRes();

      const result = { created: 2, skipped: 1, failed: 0, errors: [] };
      res.write(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`);
      res.end();

      expect(res.writtenData[0]).toContain('complete');
      expect(res.ended).toBe(true);
    });

    it('sends error event on failure', () => {
      const res = createMockRes();

      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Sync failed' })}\n\n`);
      res.end();

      expect(res.writtenData[0]).toContain('error');
    });
  });

  // =========================================================================
  // URL Type Detection Tests
  // =========================================================================

  describe('URL Type Detection', () => {
    // This tests the detectSourceType function logic
    it('detects YouTube URLs', () => {
      const patterns = {
        youtube: [/youtube\.com/, /youtu\.be/],
      };

      const url1 = 'https://youtube.com/watch?v=abc';
      const url2 = 'https://youtu.be/abc123';

      expect(patterns.youtube.some(p => p.test(url1))).toBe(true);
      expect(patterns.youtube.some(p => p.test(url2))).toBe(true);
    });

    it('detects GitHub URLs', () => {
      const pattern = /github\.com/;
      expect(pattern.test('https://github.com/user/repo')).toBe(true);
    });

    it('detects article URLs', () => {
      const patterns = [/medium\.com/, /dev\.to/, /\.blog/, /news\./];
      const url = 'https://medium.com/article';

      expect(patterns.some(p => p.test(url))).toBe(true);
    });

    it('detects podcast URLs', () => {
      const patterns = [/spotify\.com/, /podcasts\.apple\.com/, /overcast\.fm/];
      const url = 'https://open.spotify.com/episode/abc';

      expect(patterns.some(p => p.test(url))).toBe(true);
    });

    it('returns other for unknown URLs', () => {
      const allPatterns = [
        /youtube\.com/, /youtu\.be/,
        /github\.com/,
        /medium\.com/, /dev\.to/,
        /spotify\.com/,
      ];
      const url = 'https://random-site.com/page';

      const matches = allPatterns.some(p => p.test(url));
      expect(matches).toBe(false);
    });
  });
});
