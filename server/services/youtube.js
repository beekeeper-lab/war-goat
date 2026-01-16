/**
 * YouTube Service
 *
 * High-level service for YouTube-related operations.
 * Uses MCP servers for transcript fetching and the oEmbed API for metadata.
 *
 * @example
 * import { enrichYouTubeUrl, getTranscript } from './services/youtube.js';
 *
 * const data = await enrichYouTubeUrl('https://youtube.com/watch?v=...');
 * // { title, author, thumbnail, transcript, ... }
 */

import { mcpRegistry } from './mcp-client.js';

/**
 * YouTube URL patterns for video ID extraction
 */
const YOUTUBE_PATTERNS = [
  /youtube\.com\/watch\?v=([^&]+)/,
  /youtu\.be\/([^?]+)/,
  /youtube\.com\/shorts\/([^?]+)/,
  /youtube\.com\/embed\/([^?]+)/,
  /youtube\.com\/v\/([^?]+)/,
];

/**
 * Extract video ID from a YouTube URL
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID or null if not a valid YouTube URL
 */
export function extractVideoId(url) {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Check if a URL is a YouTube URL
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isYouTubeUrl(url) {
  return extractVideoId(url) !== null;
}

/**
 * Fetch YouTube video metadata via oEmbed API (no API key required)
 * @param {string} url - YouTube video URL
 * @returns {Promise<Object|null>} Video metadata or null on failure
 */
export async function getMetadata(url) {
  const videoId = extractVideoId(url);
  if (!videoId) return null;

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);

    if (!response.ok) {
      console.error(`oEmbed failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();

    return {
      videoId,
      title: data.title,
      author: data.author_name,
      channelName: data.author_name,
      channelUrl: data.author_url,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      thumbnailMaxRes: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      providerName: data.provider_name,
      type: data.type,
    };
  } catch (err) {
    console.error('Failed to fetch YouTube metadata:', err.message);
    return null;
  }
}

/**
 * Fetch transcript for a YouTube video via MCP
 * @param {string} url - YouTube video URL
 * @param {Object} options - Options
 * @param {string} [options.language='en'] - Preferred language code
 * @returns {Promise<Object>} Transcript result with text or error
 */
export async function getTranscript(url, options = {}) {
  const { language = 'en' } = options;

  try {
    const client = mcpRegistry.getClient('youtube-transcript');

    console.log(`[YouTube] Fetching transcript for: ${url}`);
    const result = await client.callTool('get_transcript', { url });

    // Extract text from MCP response
    if (result?.content?.[0]?.text) {
      return {
        success: true,
        transcript: result.content[0].text,
        language,
      };
    }

    return {
      success: false,
      error: 'No transcript content in MCP response',
    };
  } catch (err) {
    console.error('[YouTube] Transcript fetch failed:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Fully enrich a YouTube URL with metadata and transcript
 * @param {string} url - YouTube video URL
 * @returns {Promise<Object>} Enriched data
 */
export async function enrichYouTubeUrl(url) {
  const videoId = extractVideoId(url);

  if (!videoId) {
    return {
      success: false,
      error: 'Invalid YouTube URL',
    };
  }

  // Fetch metadata and transcript in parallel
  const [metadata, transcriptResult] = await Promise.all([
    getMetadata(url),
    getTranscript(url),
  ]);

  return {
    success: true,
    type: 'youtube',
    data: {
      url,
      videoId,
      type: 'youtube',
      title: metadata?.title || `YouTube Video ${videoId}`,
      author: metadata?.author,
      channelName: metadata?.channelName,
      channelUrl: metadata?.channelUrl,
      thumbnail: metadata?.thumbnail,
      thumbnailMaxRes: metadata?.thumbnailMaxRes,
      transcript: transcriptResult.success ? transcriptResult.transcript : null,
      transcriptError: transcriptResult.success ? null : transcriptResult.error,
      hasTranscript: transcriptResult.success,
    },
  };
}

/**
 * Get video duration (requires YouTube Data API via MCP)
 * Note: This uses the youtube-search MCP server which requires an API key
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object|null>} Video metrics or null
 */
export async function getVideoMetrics(videoId) {
  try {
    // This requires the youtube-search MCP server with API key
    const client = mcpRegistry.getClient('youtube-search');
    const result = await client.callTool('get_video_metrics', {
      video_id: videoId,
    });

    if (result?.content?.[0]?.text) {
      // Parse the text response (format: "Title: X\nViews: Y\n...")
      const text = result.content[0].text;
      const lines = text.split('\n');
      const metrics = {};

      for (const line of lines) {
        const [key, value] = line.split(': ');
        if (key && value) {
          metrics[key.toLowerCase().replace(/\s+/g, '_')] = value;
        }
      }

      return metrics;
    }

    return null;
  } catch (err) {
    console.error('[YouTube] Failed to get video metrics:', err.message);
    return null;
  }
}

export default {
  extractVideoId,
  isYouTubeUrl,
  getMetadata,
  getTranscript,
  enrichYouTubeUrl,
  getVideoMetrics,
};
