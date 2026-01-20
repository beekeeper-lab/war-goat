/**
 * Brave Search Service Tests
 *
 * Unit tests for the brave-search service covering:
 * - isAvailable() environment check
 * - buildRelatedQuery() query generation
 * - Cache behavior (TTL, key format)
 * - Result parsing
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the mcp-sdk-client module
vi.mock('../services/mcp-sdk-client.js', () => ({
  callTool: vi.fn(),
}));

// Import after mocking
import {
  isAvailable,
  buildRelatedQuery,
  webSearch,
  newsSearch,
  videoSearch,
  clearCache,
  getCacheSize,
} from '../services/brave-search.js';

import { callTool } from '../services/mcp-sdk-client.js';

describe('brave-search service', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isAvailable', () => {
    test('returns true when BRAVE_API_KEY is set', () => {
      const originalKey = process.env.BRAVE_API_KEY;
      process.env.BRAVE_API_KEY = 'test-api-key';

      expect(isAvailable()).toBe(true);

      process.env.BRAVE_API_KEY = originalKey;
    });

    test('returns false when BRAVE_API_KEY is missing', () => {
      const originalKey = process.env.BRAVE_API_KEY;
      delete process.env.BRAVE_API_KEY;

      expect(isAvailable()).toBe(false);

      process.env.BRAVE_API_KEY = originalKey;
    });

    test('returns false when BRAVE_API_KEY is empty string', () => {
      const originalKey = process.env.BRAVE_API_KEY;
      process.env.BRAVE_API_KEY = '';

      expect(isAvailable()).toBe(false);

      process.env.BRAVE_API_KEY = originalKey;
    });
  });

  describe('buildRelatedQuery', () => {
    test('extracts key terms from title', () => {
      const item = {
        title: 'Introduction to Machine Learning with Python',
        categories: [],
      };

      const query = buildRelatedQuery(item);

      // Should extract words longer than 3 chars
      expect(query).toContain('Introduction');
      expect(query).toContain('Machine');
      expect(query).toContain('Learning');
    });

    test('includes primary category', () => {
      const item = {
        title: 'Quick Tutorial',
        categories: ['Programming', 'AI'],
      };

      const query = buildRelatedQuery(item);

      expect(query).toContain('Programming');
    });

    test('limits to 400 characters', () => {
      const item = {
        title: 'A '.repeat(300) + 'very long title',
        categories: ['Category1', 'Category2'],
      };

      const query = buildRelatedQuery(item);

      expect(query.length).toBeLessThanOrEqual(400);
    });

    test('handles items with no categories', () => {
      const item = {
        title: 'Some interesting video about coding',
      };

      const query = buildRelatedQuery(item);

      expect(query).toBeTruthy();
      expect(query.length).toBeGreaterThan(0);
    });

    test('handles items with empty categories array', () => {
      const item = {
        title: 'Learning React Hooks',
        categories: [],
      };

      const query = buildRelatedQuery(item);

      expect(query).toBeTruthy();
    });

    test('filters out short words (<=3 chars)', () => {
      const item = {
        title: 'How to Use the API for Data',
        categories: [],
      };

      const query = buildRelatedQuery(item);

      // Words like "How", "to", "Use", "the", "API", "for", "Data"
      // Only "Data" should remain (length > 3)
      expect(query).not.toContain(' to ');
      expect(query).not.toContain(' the ');
      expect(query).not.toContain(' for ');
    });
  });

  describe('caching', () => {
    test('returns cached result for identical queries', async () => {
      const mockResult = {
        content: [{
          text: JSON.stringify({
            web: {
              results: [
                { title: 'Result 1', url: 'https://example.com', description: 'Desc' }
              ]
            }
          })
        }]
      };
      callTool.mockResolvedValue(mockResult);

      // First call - should hit the API
      await webSearch('test query');
      expect(callTool).toHaveBeenCalledTimes(1);

      // Second call with same query - should use cache
      await webSearch('test query');
      expect(callTool).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    test('different query types have separate cache entries', async () => {
      const mockResult = {
        content: [{
          text: JSON.stringify({
            web: { results: [] },
            news: { results: [] },
            videos: { results: [] }
          })
        }]
      };
      callTool.mockResolvedValue(mockResult);

      await webSearch('test query');
      await newsSearch('test query');
      await videoSearch('test query');

      // Should call API 3 times (different types)
      expect(callTool).toHaveBeenCalledTimes(3);
    });

    test('different freshness values have separate cache entries', async () => {
      const mockResult = {
        content: [{
          text: JSON.stringify({
            web: { results: [] }
          })
        }]
      };
      callTool.mockResolvedValue(mockResult);

      await webSearch('test query', { freshness: 'pd' });
      await webSearch('test query', { freshness: 'pw' });

      expect(callTool).toHaveBeenCalledTimes(2);
    });

    test('cache can be cleared', async () => {
      const mockResult = {
        content: [{
          text: JSON.stringify({
            web: { results: [] }
          })
        }]
      };
      callTool.mockResolvedValue(mockResult);

      await webSearch('test query');
      expect(getCacheSize()).toBe(1);

      clearCache();
      expect(getCacheSize()).toBe(0);
    });
  });

  describe('webSearch', () => {
    test('calls brave_web_search with correct params', async () => {
      const mockResult = {
        content: [{
          text: JSON.stringify({
            web: { results: [] }
          })
        }]
      };
      callTool.mockResolvedValue(mockResult);

      await webSearch('react hooks', { count: 15, freshness: 'pw' });

      expect(callTool).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'npx',
        }),
        'brave_web_search',
        expect.objectContaining({
          query: 'react hooks',
          count: 15,
          freshness: 'pw',
        })
      );
    });

    test('parses web results correctly', async () => {
      const mockResult = {
        content: [{
          text: JSON.stringify({
            web: {
              results: [
                {
                  title: 'React Hooks Guide',
                  url: 'https://react.dev/hooks',
                  description: 'Learn about React Hooks',
                  meta_url: { hostname: 'react.dev' },
                  age: '2 days ago'
                }
              ]
            }
          })
        }]
      };
      callTool.mockResolvedValue(mockResult);

      const response = await webSearch('react hooks');

      expect(response.success).toBe(true);
      expect(response.results).toHaveLength(1);
      expect(response.results[0]).toMatchObject({
        title: 'React Hooks Guide',
        url: 'https://react.dev/hooks',
        description: 'Learn about React Hooks',
        source: 'react.dev',
        type: 'web',
      });
    });

    test('handles API errors gracefully', async () => {
      callTool.mockRejectedValue(new Error('API Error'));

      const response = await webSearch('test');

      expect(response.success).toBe(false);
      expect(response.error).toBe('API Error');
      expect(response.results).toEqual([]);
    });
  });

  describe('newsSearch', () => {
    test('parses news results correctly', async () => {
      const mockResult = {
        content: [{
          text: JSON.stringify({
            news: {
              results: [
                {
                  title: 'Breaking News',
                  url: 'https://news.example.com/story',
                  description: 'News description',
                  meta_url: { hostname: 'news.example.com' },
                  age: '1 hour ago'
                }
              ]
            }
          })
        }]
      };
      callTool.mockResolvedValue(mockResult);

      const response = await newsSearch('latest tech');

      expect(response.success).toBe(true);
      expect(response.results[0]).toMatchObject({
        type: 'news',
        age: '1 hour ago',
      });
    });
  });

  describe('videoSearch', () => {
    test('parses video results correctly', async () => {
      const mockResult = {
        content: [{
          text: JSON.stringify({
            videos: {
              results: [
                {
                  title: 'Tutorial Video',
                  url: 'https://youtube.com/watch?v=123',
                  description: 'A great tutorial',
                  meta_url: { hostname: 'youtube.com' },
                  thumbnail: { src: 'https://img.youtube.com/thumb.jpg' },
                  duration: '10:30',
                  age: '1 week ago'
                }
              ]
            }
          })
        }]
      };
      callTool.mockResolvedValue(mockResult);

      const response = await videoSearch('coding tutorial');

      expect(response.success).toBe(true);
      expect(response.results[0]).toMatchObject({
        type: 'video',
        duration: '10:30',
        thumbnail: 'https://img.youtube.com/thumb.jpg',
      });
    });
  });
});
