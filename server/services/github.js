/**
 * GitHub Service
 *
 * High-level service for GitHub repository enrichment.
 * Uses GitHub REST API directly (no MCP).
 *
 * @example
 * import { enrichGitHubUrl, isGitHubUrl } from './services/github.js';
 *
 * if (isGitHubUrl(url)) {
 *   const data = await enrichGitHubUrl(url);
 *   // { success, type: 'github', data: { title, stars, ... } }
 * }
 */

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * GitHub URL patterns for owner/repo extraction
 */
const GITHUB_PATTERNS = [
  /github\.com\/([^\/]+)\/([^\/\?#]+)/,
];

/**
 * Extract owner and repo from a GitHub URL
 * @param {string} url - GitHub URL
 * @returns {{owner: string, repo: string} | null}
 */
export function extractRepoInfo(url) {
  if (!url) return null;

  for (const pattern of GITHUB_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      const owner = match[1];
      // Remove trailing slash if present
      const repo = match[2].replace(/\/$/, '');
      return { owner, repo };
    }
  }
  return null;
}

/**
 * Check if a URL is a GitHub repository URL
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isGitHubUrl(url) {
  return extractRepoInfo(url) !== null;
}

/**
 * Format star count for display (e.g., 1234 → "1.2k")
 * @param {number} count - Star count
 * @returns {string}
 */
export function formatStarCount(count) {
  if (count >= 1000000) {
    const millions = count / 1000000;
    // If it's a whole million, show without decimal
    if (count % 1000000 === 0) {
      return `${Math.floor(millions)}M`;
    }
    return `${millions.toFixed(1)}M`;
  }
  if (count >= 1000) {
    const thousands = count / 1000;
    // If it's a whole thousand, show without decimal
    if (count % 1000 === 0) {
      return `${Math.floor(thousands)}k`;
    }
    return `${thousands.toFixed(1)}k`;
  }
  return String(count);
}

/**
 * Map GitHub topics to War Goat categories
 * @param {string[]} topics - GitHub topics
 * @returns {string[]} Categories (capitalized)
 */
export function mapTopicsToCategories(topics) {
  if (!topics || !Array.isArray(topics)) return [];
  return topics.map(topic => {
    // Capitalize first letter
    return topic.charAt(0).toUpperCase() + topic.slice(1);
  });
}

/**
 * Build request headers for GitHub API
 * @returns {Object} Headers object
 */
function buildHeaders() {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'WarGoat/1.0',
  };

  // Add auth if GITHUB_TOKEN is set
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

/**
 * Parse rate limit info from response headers
 * @param {Response} response - Fetch response
 * @returns {{remaining: number, reset: number} | null}
 */
function parseRateLimitHeaders(response) {
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const reset = response.headers.get('X-RateLimit-Reset');

  if (remaining !== null && reset !== null) {
    return {
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10),
    };
  }
  return null;
}

/**
 * Fetch repository metadata from GitHub API
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Repository data with success flag
 */
export async function getMetadata(owner, repo) {
  try {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
    const response = await fetch(url, {
      headers: buildHeaders(),
    });

    const rateLimit = parseRateLimitHeaders(response);

    if (response.status === 404) {
      return {
        success: false,
        error: `Repository not found: ${owner}/${repo}`,
      };
    }

    if (response.status === 403) {
      // Check if it's rate limiting
      if (rateLimit && rateLimit.remaining === 0) {
        const resetDate = new Date(rateLimit.reset * 1000);
        const minutes = Math.ceil((resetDate - Date.now()) / 60000);
        return {
          success: false,
          error: `GitHub API rate limit exceeded. Try again in ${minutes} minutes.`,
          rateLimitReset: rateLimit.reset,
        };
      }
      return {
        success: false,
        error: 'Access denied. This may be a private repository.',
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `GitHub API error: ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        name: data.name,
        fullName: data.full_name,
        description: data.description || '',
        owner: data.owner.login,
        ownerAvatar: data.owner.avatar_url,
        stars: data.stargazers_count,
        forks: data.forks_count,
        language: data.language,
        topics: data.topics || [],
        license: data.license?.name || null,
        openIssues: data.open_issues_count,
        lastCommitDate: data.pushed_at,
        defaultBranch: data.default_branch,
        htmlUrl: data.html_url,
      },
      rateLimit,
    };
  } catch (err) {
    console.error('[GitHub] Metadata fetch failed:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Fetch README content from GitHub API
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<{success: boolean, content?: string, error?: string}>}
 */
export async function getReadme(owner, repo) {
  try {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`;
    const response = await fetch(url, {
      headers: buildHeaders(),
    });

    if (response.status === 404) {
      return {
        success: false,
        error: 'README not found',
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch README: ${response.status}`,
      };
    }

    const data = await response.json();

    // Decode base64 content
    if (data.content && data.encoding === 'base64') {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return {
        success: true,
        content,
      };
    }

    return {
      success: false,
      error: 'Unexpected README format',
    };
  } catch (err) {
    console.error('[GitHub] README fetch failed:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Fully enrich a GitHub URL with metadata and README
 * @param {string} url - GitHub repository URL
 * @returns {Promise<Object>} Enriched data
 */
export async function enrichGitHubUrl(url) {
  const repoInfo = extractRepoInfo(url);

  if (!repoInfo) {
    return {
      success: false,
      type: 'github',
      error: 'Invalid GitHub URL',
    };
  }

  const { owner, repo } = repoInfo;

  console.log(`[GitHub] Enriching: ${owner}/${repo}`);

  // Fetch metadata and README in parallel
  const [metadataResult, readmeResult] = await Promise.all([
    getMetadata(owner, repo),
    getReadme(owner, repo),
  ]);

  // If metadata fetch failed, return the error
  if (!metadataResult.success) {
    return {
      success: false,
      type: 'github',
      error: metadataResult.error,
      rateLimitReset: metadataResult.rateLimitReset,
    };
  }

  const metadata = metadataResult.data;

  return {
    success: true,
    type: 'github',
    data: {
      url,
      type: 'github',
      title: metadata.name,
      description: metadata.description,
      author: metadata.owner,
      thumbnail: metadata.ownerAvatar,
      fullName: metadata.fullName,
      stars: metadata.stars,
      forks: metadata.forks,
      language: metadata.language,
      topics: metadata.topics,
      categories: mapTopicsToCategories(metadata.topics),
      license: metadata.license,
      openIssues: metadata.openIssues,
      lastCommitDate: metadata.lastCommitDate,
      defaultBranch: metadata.defaultBranch,
      ownerAvatar: metadata.ownerAvatar,
      hasReadme: readmeResult.success,
      readme: readmeResult.success ? readmeResult.content : null,
      readmeError: readmeResult.success ? null : readmeResult.error,
    },
  };
}

export default {
  extractRepoInfo,
  isGitHubUrl,
  formatStarCount,
  mapTopicsToCategories,
  getMetadata,
  getReadme,
  enrichGitHubUrl,
};
