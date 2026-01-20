/**
 * Brave Search Service
 *
 * Provides search functionality using Brave Search MCP server.
 * Includes caching for performance optimization (15-minute TTL).
 *
 * Features:
 * - Web search
 * - News search
 * - Video search
 * - Related content discovery
 * - Result caching
 */

import { callTool } from './mcp-sdk-client.js';

// ============================================================================
// Configuration
// ============================================================================

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds
const cache = new Map();

// Brave Search MCP server configuration
const BRAVE_SEARCH_CONFIG = {
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-brave-search'],
  env: {
    BRAVE_API_KEY: process.env.BRAVE_API_KEY,
  },
};

// ============================================================================
// Availability Check
// ============================================================================

/**
 * Check if Brave Search is available (API key configured)
 * @returns {boolean}
 */
export function isAvailable() {
  return !!process.env.BRAVE_API_KEY;
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Get cached result or null if not found/expired
 * @param {string} key - Cache key
 * @returns {object|null}
 */
function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;

  // Check if expired
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Set cache entry
 * @param {string} key - Cache key
 * @param {object} data - Data to cache
 */
function setCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Build cache key from search parameters
 * @param {string} type - Search type (web/news/video)
 * @param {string} query - Search query
 * @param {string} freshness - Freshness filter
 * @returns {string}
 */
function buildCacheKey(type, query, freshness) {
  return `${type}:${query}:${freshness || 'any'}`;
}

/**
 * Clear all cached entries
 */
export function clearCache() {
  cache.clear();
}

/**
 * Get current cache size
 * @returns {number}
 */
export function getCacheSize() {
  return cache.size;
}

// ============================================================================
// Query Building
// ============================================================================

/**
 * Build a search query from an interest item
 * Extracts key terms from title and adds primary category
 * @param {object} item - Interest item
 * @returns {string} Generated search query
 */
export function buildRelatedQuery(item) {
  const parts = [];

  // Extract key terms from title (words > 3 chars)
  if (item.title) {
    const titleTerms = item.title
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .slice(0, 4) // Take first 4 significant words
      .join(' ');

    if (titleTerms) {
      parts.push(titleTerms);
    }
  }

  // Add primary category if available
  if (item.categories && item.categories.length > 0 && item.categories[0]) {
    parts.push(item.categories[0]);
  }

  // Combine and limit to 400 characters
  return parts.join(' ').slice(0, 400);
}

// ============================================================================
// Result Parsing
// ============================================================================

/**
 * Parse web search results from MCP response
 * @param {object} result - Raw MCP result
 * @returns {object} Parsed response
 */
function parseWebResults(result) {
  try {
    const content = result?.content?.[0]?.text;
    if (!content) {
      return { success: true, results: [], query: '' };
    }

    const data = JSON.parse(content);
    const webResults = data?.web?.results || [];

    const results = webResults.map((item) => ({
      title: item.title || '',
      url: item.url || '',
      description: item.description || '',
      source: item.meta_url?.hostname || extractDomain(item.url),
      type: 'web',
      publishedDate: item.page_age || item.age,
      age: item.age,
    }));

    return {
      success: true,
      results,
      summary: data?.summary?.text,
    };
  } catch (err) {
    console.error('[Brave Search] Failed to parse web results:', err);
    return { success: true, results: [] };
  }
}

/**
 * Parse news search results from MCP response
 * @param {object} result - Raw MCP result
 * @returns {object} Parsed response
 */
function parseNewsResults(result) {
  try {
    const content = result?.content?.[0]?.text;
    if (!content) {
      return { success: true, results: [], query: '' };
    }

    const data = JSON.parse(content);
    const newsResults = data?.news?.results || [];

    const results = newsResults.map((item) => ({
      title: item.title || '',
      url: item.url || '',
      description: item.description || '',
      source: item.meta_url?.hostname || extractDomain(item.url),
      type: 'news',
      publishedDate: item.page_age || item.age,
      age: item.age,
      thumbnail: item.thumbnail?.src,
    }));

    return {
      success: true,
      results,
    };
  } catch (err) {
    console.error('[Brave Search] Failed to parse news results:', err);
    return { success: true, results: [] };
  }
}

/**
 * Parse video search results from MCP response
 * @param {object} result - Raw MCP result
 * @returns {object} Parsed response
 */
function parseVideoResults(result) {
  try {
    const content = result?.content?.[0]?.text;
    if (!content) {
      return { success: true, results: [], query: '' };
    }

    const data = JSON.parse(content);
    const videoResults = data?.videos?.results || [];

    const results = videoResults.map((item) => ({
      title: item.title || '',
      url: item.url || '',
      description: item.description || '',
      source: item.meta_url?.hostname || extractDomain(item.url),
      type: 'video',
      publishedDate: item.page_age || item.age,
      age: item.age,
      thumbnail: item.thumbnail?.src,
      duration: item.duration,
    }));

    return {
      success: true,
      results,
    };
  } catch (err) {
    console.error('[Brave Search] Failed to parse video results:', err);
    return { success: true, results: [] };
  }
}

/**
 * Extract domain from URL
 * @param {string} url
 * @returns {string}
 */
function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Perform web search using Brave Search
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<object>} Search response
 */
export async function webSearch(query, options = {}) {
  const { freshness, count = 10, summary = false } = options;
  const cacheKey = buildCacheKey('web', query, freshness);

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('[Brave Search] Cache hit for web search:', query);
    return { ...cached, cached: true };
  }

  try {
    console.log('[Brave Search] Performing web search:', query);

    const result = await callTool(BRAVE_SEARCH_CONFIG, 'brave_web_search', {
      query,
      count,
      freshness,
      summary,
    });

    const parsed = parseWebResults(result);
    const response = {
      ...parsed,
      query,
      cached: false,
    };

    // Cache successful results
    if (parsed.success) {
      setCache(cacheKey, response);
    }

    return response;
  } catch (err) {
    console.error('[Brave Search] Web search failed:', err.message);
    return {
      success: false,
      results: [],
      query,
      cached: false,
      error: err.message,
    };
  }
}

/**
 * Perform news search using Brave Search
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<object>} Search response
 */
export async function newsSearch(query, options = {}) {
  const { freshness = 'pw', count = 10 } = options;
  const cacheKey = buildCacheKey('news', query, freshness);

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('[Brave Search] Cache hit for news search:', query);
    return { ...cached, cached: true };
  }

  try {
    console.log('[Brave Search] Performing news search:', query);

    const result = await callTool(BRAVE_SEARCH_CONFIG, 'brave_news_search', {
      query,
      count,
      freshness,
    });

    const parsed = parseNewsResults(result);
    const response = {
      ...parsed,
      query,
      cached: false,
    };

    // Cache successful results
    if (parsed.success) {
      setCache(cacheKey, response);
    }

    return response;
  } catch (err) {
    console.error('[Brave Search] News search failed:', err.message);
    return {
      success: false,
      results: [],
      query,
      cached: false,
      error: err.message,
    };
  }
}

/**
 * Perform video search using Brave Search
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<object>} Search response
 */
export async function videoSearch(query, options = {}) {
  const { freshness, count = 10 } = options;
  const cacheKey = buildCacheKey('video', query, freshness);

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('[Brave Search] Cache hit for video search:', query);
    return { ...cached, cached: true };
  }

  try {
    console.log('[Brave Search] Performing video search:', query);

    const result = await callTool(BRAVE_SEARCH_CONFIG, 'brave_video_search', {
      query,
      count,
      freshness,
    });

    const parsed = parseVideoResults(result);
    const response = {
      ...parsed,
      query,
      cached: false,
    };

    // Cache successful results
    if (parsed.success) {
      setCache(cacheKey, response);
    }

    return response;
  } catch (err) {
    console.error('[Brave Search] Video search failed:', err.message);
    return {
      success: false,
      results: [],
      query,
      cached: false,
      error: err.message,
    };
  }
}

/**
 * Search for content related to an interest item
 * @param {object} item - Interest item
 * @param {object} options - Search options
 * @returns {Promise<object>} Search response with generated query
 */
export async function relatedSearch(item, options = {}) {
  const generatedQuery = buildRelatedQuery(item);

  if (!generatedQuery) {
    return {
      success: false,
      results: [],
      query: '',
      generatedQuery: '',
      cached: false,
      error: 'Could not generate search query from item',
    };
  }

  const result = await webSearch(generatedQuery, options);

  return {
    ...result,
    generatedQuery,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  isAvailable,
  webSearch,
  newsSearch,
  videoSearch,
  relatedSearch,
  buildRelatedQuery,
  clearCache,
  getCacheSize,
};
