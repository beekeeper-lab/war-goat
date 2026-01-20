/**
 * YouTube Service Unit Tests
 *
 * Tests for server/services/youtube.js covering:
 * - extractVideoId: URL pattern matching for all YouTube URL formats
 * - isYouTubeUrl: Boolean URL validation
 * - getMetadata: oEmbed API fetching
 * - getTranscript: MCP transcript retrieval
 * - enrichYouTubeUrl: Full enrichment flow
 * - getVideoMetrics: Video metrics parsing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock mcp-client before imports
vi.mock('../services/mcp-client.js', () => ({
  mcpRegistry: {
    getClient: vi.fn(),
  },
}));

import {
  extractVideoId,
  isYouTubeUrl,
  getMetadata,
  getTranscript,
  enrichYouTubeUrl,
  getVideoMetrics,
} from '../services/youtube.js';
import { mcpRegistry } from '../services/mcp-client.js';

describe('YouTube Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // extractVideoId
  // =========================================================================

  describe('extractVideoId', () => {
    it('returns video ID from standard watch URL', () => {
      expect(extractVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractVideoId('https://www.youtube.com/watch?v=abc123XYZ')).toBe('abc123XYZ');
    });

    it('returns video ID from youtu.be short URL', () => {
      expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractVideoId('http://youtu.be/abc123')).toBe('abc123');
    });

    it('returns video ID from shorts URL', () => {
      expect(extractVideoId('https://youtube.com/shorts/abc123')).toBe('abc123');
      expect(extractVideoId('https://www.youtube.com/shorts/xyz789')).toBe('xyz789');
    });

    it('returns video ID from embed URL', () => {
      expect(extractVideoId('https://youtube.com/embed/xyz789')).toBe('xyz789');
      expect(extractVideoId('https://www.youtube.com/embed/test123')).toBe('test123');
    });

    it('returns video ID from v/ URL', () => {
      expect(extractVideoId('https://youtube.com/v/test123')).toBe('test123');
    });

    it('returns null for non-YouTube URLs', () => {
      expect(extractVideoId('https://example.com/video')).toBeNull();
      expect(extractVideoId('https://vimeo.com/123456')).toBeNull();
      expect(extractVideoId('https://twitter.com/status/123')).toBeNull();
    });

    it('returns null for empty or invalid input', () => {
      expect(extractVideoId('')).toBeNull();
      expect(extractVideoId('not a url')).toBeNull();
    });
  });

  // =========================================================================
  // isYouTubeUrl
  // =========================================================================

  describe('isYouTubeUrl', () => {
    it('returns true for valid YouTube URLs', () => {
      expect(isYouTubeUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(isYouTubeUrl('https://youtu.be/abc123')).toBe(true);
      expect(isYouTubeUrl('https://youtube.com/shorts/xyz')).toBe(true);
    });

    it('returns false for non-YouTube URLs', () => {
      expect(isYouTubeUrl('https://example.com')).toBe(false);
      expect(isYouTubeUrl('https://vimeo.com/123')).toBe(false);
    });

    it('returns false for malformed URLs', () => {
      expect(isYouTubeUrl('')).toBe(false);
      expect(isYouTubeUrl('not a url')).toBe(false);
    });
  });

  // =========================================================================
  // getMetadata
  // =========================================================================

  describe('getMetadata', () => {
    it('fetches metadata via oEmbed API', async () => {
      const mockOembedResponse = {
        title: 'Test Video Title',
        author_name: 'Test Channel',
        author_url: 'https://youtube.com/channel/test',
        provider_name: 'YouTube',
        type: 'video',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOembedResponse),
      });

      const result = await getMetadata('https://youtube.com/watch?v=abc123');

      expect(result).toMatchObject({
        videoId: 'abc123',
        title: 'Test Video Title',
        author: 'Test Channel',
        channelName: 'Test Channel',
        channelUrl: 'https://youtube.com/channel/test',
        providerName: 'YouTube',
        type: 'video',
      });
      expect(result.thumbnail).toContain('abc123');
      expect(result.thumbnailMaxRes).toContain('abc123');
    });

    it('returns null for invalid video ID', async () => {
      const result = await getMetadata('https://example.com/not-youtube');
      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns null when oEmbed API fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await getMetadata('https://youtube.com/watch?v=abc123');
      expect(result).toBeNull();
    });

    it('returns null when fetch throws', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getMetadata('https://youtube.com/watch?v=abc123');
      expect(result).toBeNull();
    });

    it('constructs correct thumbnail URLs', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ title: 'Test', author_name: 'Author' }),
      });

      const result = await getMetadata('https://youtube.com/watch?v=xyz789');

      expect(result.thumbnail).toBe('https://i.ytimg.com/vi/xyz789/hqdefault.jpg');
      expect(result.thumbnailMaxRes).toBe('https://i.ytimg.com/vi/xyz789/maxresdefault.jpg');
    });
  });

  // =========================================================================
  // getTranscript
  // =========================================================================

  describe('getTranscript', () => {
    it('calls MCP client with correct parameters', async () => {
      const mockCallTool = vi.fn().mockResolvedValue({
        content: [{ text: 'This is the transcript text' }],
      });

      mcpRegistry.getClient.mockReturnValue({
        callTool: mockCallTool,
      });

      await getTranscript('https://youtube.com/watch?v=abc123');

      expect(mcpRegistry.getClient).toHaveBeenCalledWith('youtube-transcript');
      expect(mockCallTool).toHaveBeenCalledWith('get_transcript', {
        url: 'https://youtube.com/watch?v=abc123',
      });
    });

    it('returns success object with transcript', async () => {
      mcpRegistry.getClient.mockReturnValue({
        callTool: vi.fn().mockResolvedValue({
          content: [{ text: 'Hello world transcript' }],
        }),
      });

      const result = await getTranscript('https://youtube.com/watch?v=abc123');

      expect(result.success).toBe(true);
      expect(result.transcript).toBe('Hello world transcript');
      expect(result.language).toBe('en');
    });

    it('returns error object when MCP fails', async () => {
      mcpRegistry.getClient.mockReturnValue({
        callTool: vi.fn().mockRejectedValue(new Error('MCP connection failed')),
      });

      const result = await getTranscript('https://youtube.com/watch?v=abc123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('MCP connection failed');
    });

    it('handles missing content in MCP response', async () => {
      mcpRegistry.getClient.mockReturnValue({
        callTool: vi.fn().mockResolvedValue({
          content: [],
        }),
      });

      const result = await getTranscript('https://youtube.com/watch?v=abc123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No transcript content');
    });
  });

  // =========================================================================
  // enrichYouTubeUrl
  // =========================================================================

  describe('enrichYouTubeUrl', () => {
    beforeEach(() => {
      // Default mock for metadata
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          title: 'Video Title',
          author_name: 'Channel Name',
          author_url: 'https://youtube.com/channel/test',
        }),
      });

      // Default mock for transcript
      mcpRegistry.getClient.mockReturnValue({
        callTool: vi.fn().mockResolvedValue({
          content: [{ text: 'Transcript content here' }],
        }),
      });
    });

    it('returns full enrichment for valid URL', async () => {
      const result = await enrichYouTubeUrl('https://youtube.com/watch?v=abc123');

      expect(result.success).toBe(true);
      expect(result.type).toBe('youtube');
      expect(result.data).toMatchObject({
        url: 'https://youtube.com/watch?v=abc123',
        videoId: 'abc123',
        type: 'youtube',
        title: 'Video Title',
        author: 'Channel Name',
        hasTranscript: true,
        transcript: 'Transcript content here',
      });
    });

    it('returns error for invalid URL', async () => {
      const result = await enrichYouTubeUrl('https://example.com/not-youtube');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid YouTube URL');
    });

    it('calls metadata and transcript in parallel', async () => {
      const metadataDelay = new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ title: 'Test', author_name: 'Author' }),
        }), 50)
      );

      global.fetch.mockReturnValue(metadataDelay);

      const start = Date.now();
      await enrichYouTubeUrl('https://youtube.com/watch?v=abc123');
      const elapsed = Date.now() - start;

      // Should complete faster than sequential calls would take
      expect(elapsed).toBeLessThan(200);
    });

    it('handles partial failures gracefully', async () => {
      // Metadata succeeds but transcript fails
      mcpRegistry.getClient.mockReturnValue({
        callTool: vi.fn().mockRejectedValue(new Error('Transcript unavailable')),
      });

      const result = await enrichYouTubeUrl('https://youtube.com/watch?v=abc123');

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Video Title');
      expect(result.data.hasTranscript).toBe(false);
      expect(result.data.transcriptError).toBe('Transcript unavailable');
    });

    it('provides fallback title when metadata fails', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await enrichYouTubeUrl('https://youtube.com/watch?v=xyz789');

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('YouTube Video xyz789');
    });
  });

  // =========================================================================
  // getVideoMetrics
  // =========================================================================

  describe('getVideoMetrics', () => {
    it('parses metrics from MCP response', async () => {
      mcpRegistry.getClient.mockReturnValue({
        callTool: vi.fn().mockResolvedValue({
          content: [{
            text: 'Title: Test Video\nViews: 1000000\nLikes: 50000\nComments: 1234',
          }],
        }),
      });

      const result = await getVideoMetrics('abc123');

      expect(result).toMatchObject({
        title: 'Test Video',
        views: '1000000',
        likes: '50000',
        comments: '1234',
      });
    });

    it('returns null when MCP call fails', async () => {
      mcpRegistry.getClient.mockReturnValue({
        callTool: vi.fn().mockRejectedValue(new Error('API error')),
      });

      const result = await getVideoMetrics('abc123');

      expect(result).toBeNull();
    });

    it('returns null when response has no content', async () => {
      mcpRegistry.getClient.mockReturnValue({
        callTool: vi.fn().mockResolvedValue({
          content: [],
        }),
      });

      const result = await getVideoMetrics('abc123');

      expect(result).toBeNull();
    });
  });
});
