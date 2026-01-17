/**
 * War Goat API Server
 *
 * Express backend that provides:
 * - URL enrichment via MCP servers
 * - CRUD operations via JSON Server
 * - Transcript file storage
 */

import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

// Import our service layer
import { enrichYouTubeUrl, isYouTubeUrl, extractVideoId } from './services/index.js';
import {
  checkObsidianConnection,
  exportInterest,
  updateNoteFrontmatter,
  syncAllToObsidian,
} from './services/index.js';
import {
  isBraveSearchAvailable,
  webSearch,
  newsSearch,
  videoSearch,
  relatedSearch,
  isArticleUrl,
  enrichArticleUrl,
  generateArticleSummary,
} from './services/index.js';

const require = createRequire(import.meta.url);
const jsonServer = require('json-server');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRANSCRIPTS_DIR = path.join(__dirname, '..', 'data', 'transcripts');
const ARTICLES_DIR = path.join(__dirname, '..', 'data', 'articles');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ============================================================================
// Transcript File Storage
// ============================================================================

async function ensureTranscriptsDir() {
  if (!existsSync(TRANSCRIPTS_DIR)) {
    await mkdir(TRANSCRIPTS_DIR, { recursive: true });
  }
}

function getTranscriptPath(itemId) {
  return path.join(TRANSCRIPTS_DIR, `${itemId}.txt`);
}

async function readTranscript(itemId) {
  const filePath = getTranscriptPath(itemId);
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    return await readFile(filePath, 'utf-8');
  } catch (err) {
    console.error(`Failed to read transcript for ${itemId}:`, err);
    return null;
  }
}

async function writeTranscript(itemId, content) {
  await ensureTranscriptsDir();
  const filePath = getTranscriptPath(itemId);
  await writeFile(filePath, content, 'utf-8');
  console.log(`Transcript saved: ${filePath}`);
}

// ============================================================================
// Article File Storage
// ============================================================================

async function ensureArticlesDir() {
  if (!existsSync(ARTICLES_DIR)) {
    await mkdir(ARTICLES_DIR, { recursive: true });
  }
}

function getArticlePath(itemId) {
  return path.join(ARTICLES_DIR, `${itemId}.txt`);
}

async function readArticleContent(itemId) {
  const filePath = getArticlePath(itemId);
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    return await readFile(filePath, 'utf-8');
  } catch (err) {
    console.error(`Failed to read article for ${itemId}:`, err);
    return null;
  }
}

async function writeArticleContent(itemId, content) {
  await ensureArticlesDir();
  const filePath = getArticlePath(itemId);
  await writeFile(filePath, content, 'utf-8');
  console.log(`Article content saved: ${filePath}`);
}

// ============================================================================
// API Routes
// ============================================================================

/**
 * POST /api/enrich
 * Enrich a URL with metadata and content (for YouTube and articles)
 */
app.post('/api/enrich', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  console.log(`[Enrich] Processing: ${url}`);

  try {
    // Check if it's a YouTube URL
    if (isYouTubeUrl(url)) {
      const result = await enrichYouTubeUrl(url);
      console.log(`[Enrich] YouTube enrichment complete:`, {
        title: result.data?.title,
        hasTranscript: result.data?.hasTranscript,
      });
      return res.json(result);
    }

    // Check if it's an article URL
    if (isArticleUrl(url)) {
      const result = await enrichArticleUrl(url);
      console.log(`[Enrich] Article enrichment complete:`, {
        title: result.data?.title,
        hasArticleContent: result.data?.hasArticleContent,
        wordCount: result.data?.wordCount,
      });
      return res.json(result);
    }

    // For other URLs, return basic info
    return res.json({
      success: true,
      type: 'other',
      data: {
        url,
        type: detectSourceType(url),
      },
    });
  } catch (err) {
    console.error('[Enrich] Failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * Detect source type from URL
 */
function detectSourceType(url) {
  const patterns = {
    youtube: [/youtube\.com/, /youtu\.be/],
    github: [/github\.com/],
    article: [/medium\.com/, /dev\.to/, /\.blog/, /news\./],
    podcast: [/spotify\.com/, /podcasts\.apple\.com/, /overcast\.fm/],
  };

  for (const [type, typePatterns] of Object.entries(patterns)) {
    for (const pattern of typePatterns) {
      if (pattern.test(url)) {
        return type;
      }
    }
  }

  return 'other';
}

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      mcp: 'available',
      database: 'available',
    },
  });
});

/**
 * GET /api/transcripts/:id
 * Retrieve transcript for an item
 */
app.get('/api/transcripts/:id', async (req, res) => {
  const { id } = req.params;
  const transcript = await readTranscript(id);

  if (transcript === null) {
    return res.status(404).json({
      id,
      error: 'Transcript not found',
      transcript: null,
    });
  }

  res.json({ id, transcript });
});

/**
 * PUT /api/transcripts/:id
 * Save transcript for an item
 */
app.put('/api/transcripts/:id', async (req, res) => {
  const { id } = req.params;
  const { transcript } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: 'Transcript content is required' });
  }

  try {
    await writeTranscript(id, transcript);
    res.json({ id, success: true });
  } catch (err) {
    console.error('Failed to save transcript:', err);
    res.status(500).json({ error: 'Failed to save transcript' });
  }
});

/**
 * POST /api/transcripts/:id
 * Alternative save endpoint (same as PUT)
 */
app.post('/api/transcripts/:id', async (req, res) => {
  const { id } = req.params;
  const { transcript } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: 'Transcript content is required' });
  }

  try {
    await writeTranscript(id, transcript);
    res.json({ id, success: true });
  } catch (err) {
    console.error('Failed to save transcript:', err);
    res.status(500).json({ error: 'Failed to save transcript' });
  }
});

// ============================================================================
// Article Content Routes
// ============================================================================

/**
 * GET /api/articles/:id
 * Retrieve article content for an item
 */
app.get('/api/articles/:id', async (req, res) => {
  const { id } = req.params;
  const content = await readArticleContent(id);

  if (content === null) {
    return res.status(404).json({
      id,
      error: 'Article content not found',
      content: null,
    });
  }

  res.json({ id, content });
});

/**
 * PUT /api/articles/:id
 * Save article content for an item
 */
app.put('/api/articles/:id', async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Article content is required' });
  }

  try {
    await writeArticleContent(id, content);
    res.json({ id, success: true });
  } catch (err) {
    console.error('Failed to save article content:', err);
    res.status(500).json({ error: 'Failed to save article content' });
  }
});

/**
 * POST /api/articles/:id/summary
 * Generate AI summary for an article
 */
app.post('/api/articles/:id/summary', async (req, res) => {
  const { id } = req.params;

  try {
    // Get article content
    const content = await readArticleContent(id);

    if (!content) {
      return res.status(404).json({ error: 'Article content not found' });
    }

    // Get item title from database
    const dbPath = path.join(__dirname, '..', 'db.json');
    const db = JSON.parse(await readFile(dbPath, 'utf-8'));
    const item = db.interests?.find(i => i.id === id);
    const title = item?.title || 'Article';

    // Generate summary
    const summary = await generateArticleSummary(content, title);

    if (!summary) {
      return res.status(500).json({ error: 'Failed to generate summary. Check API key configuration.' });
    }

    res.json({ id, summary });
  } catch (err) {
    console.error('Failed to generate article summary:', err);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// ============================================================================
// Obsidian Integration Routes
// ============================================================================

/**
 * GET /api/obsidian/status
 * Check Obsidian connection status
 */
app.get('/api/obsidian/status', async (req, res) => {
  try {
    const status = await checkObsidianConnection();
    res.json(status);
  } catch (err) {
    console.error('[Obsidian] Status check failed:', err);
    res.json({
      connected: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/interests/:id/export-obsidian
 * Export a single interest to Obsidian
 */
app.post('/api/interests/:id/export-obsidian', async (req, res) => {
  const { id } = req.params;
  const options = req.body || {};

  try {
    // Get interest from database
    const dbPath = path.join(__dirname, '..', 'db.json');
    const db = JSON.parse(await readFile(dbPath, 'utf-8'));
    const item = db.interests?.find(i => i.id === id);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Interest not found' });
    }

    // Get transcript if available
    const transcript = await readTranscript(id);

    // Export to Obsidian
    const result = await exportInterest(item, options, transcript);

    // Update item with obsidianPath if successful
    if (result.success && result.notePath) {
      item.obsidianPath = result.notePath;
      item.obsidianSyncedAt = new Date().toISOString();
      await writeFile(dbPath, JSON.stringify(db, null, 2));
    }

    res.json(result);
  } catch (err) {
    console.error('[Obsidian] Export failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/sync-obsidian
 * Bulk sync all interests to Obsidian with SSE progress
 */
app.post('/api/sync-obsidian', async (req, res) => {
  const options = req.body || {};

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Get all interests from database
    const dbPath = path.join(__dirname, '..', 'db.json');
    const db = JSON.parse(await readFile(dbPath, 'utf-8'));
    const items = db.interests || [];

    if (items.length === 0) {
      res.write(`data: ${JSON.stringify({ type: 'complete', result: { created: 0, skipped: 0, failed: 0, errors: [] } })}\n\n`);
      res.end();
      return;
    }

    // Progress callback
    const onProgress = (current, total, itemTitle) => {
      res.write(`data: ${JSON.stringify({ type: 'progress', current, total, item: itemTitle })}\n\n`);
    };

    // Sync all items
    const result = await syncAllToObsidian(items, options, onProgress);

    // Update items with obsidianPath for successful exports
    let updated = false;
    for (const item of items) {
      if (!item.obsidianPath && !result.errors.find(e => e.id === item.id)) {
        // Item was successfully synced
        const folder = options.folder || 'War Goat';
        item.obsidianPath = `${folder}/${item.title.replace(/[<>:"/\\|?*]/g, '').substring(0, 100)}.md`;
        item.obsidianSyncedAt = new Date().toISOString();
        updated = true;
      }
    }

    if (updated) {
      await writeFile(dbPath, JSON.stringify(db, null, 2));
    }

    // Send final result
    res.write(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`);
    res.end();
  } catch (err) {
    console.error('[Obsidian] Sync failed:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
  }
});

// ============================================================================
// Brave Search Integration Routes
// ============================================================================

/**
 * GET /api/search/status
 * Check if Brave Search is available (API key configured)
 */
app.get('/api/search/status', (req, res) => {
  const available = isBraveSearchAvailable();
  res.json({
    available,
    error: available ? undefined : 'BRAVE_API_KEY not configured',
  });
});

/**
 * POST /api/search
 * Perform web, news, or video search
 */
app.post('/api/search', async (req, res) => {
  const { query, type = 'web', freshness, count = 10, summary = false } = req.body;

  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Query is required',
      results: [],
    });
  }

  // Truncate query to 400 characters
  const truncatedQuery = query.slice(0, 400);
  const wasTruncated = query.length > 400;

  if (!isBraveSearchAvailable()) {
    return res.status(503).json({
      success: false,
      error: 'Brave Search not available - BRAVE_API_KEY not configured',
      results: [],
    });
  }

  console.log(`[Search] ${type} search: "${truncatedQuery}"`);

  try {
    let result;

    switch (type) {
      case 'news':
        result = await newsSearch(truncatedQuery, { freshness, count });
        break;
      case 'video':
        result = await videoSearch(truncatedQuery, { freshness, count });
        break;
      case 'web':
      default:
        result = await webSearch(truncatedQuery, { freshness, count, summary });
        break;
    }

    // Add truncation warning if applicable
    if (wasTruncated) {
      result.warning = 'Query was truncated to 400 characters';
    }

    res.json(result);
  } catch (err) {
    console.error('[Search] Failed:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      results: [],
    });
  }
});

/**
 * POST /api/search/related/:id
 * Find content related to an existing interest
 */
app.post('/api/search/related/:id', async (req, res) => {
  const { id } = req.params;
  const { count = 10, freshness } = req.body || {};

  if (!isBraveSearchAvailable()) {
    return res.status(503).json({
      success: false,
      error: 'Brave Search not available - BRAVE_API_KEY not configured',
      results: [],
    });
  }

  try {
    // Get interest from database
    const dbPath = path.join(__dirname, '..', 'db.json');
    const db = JSON.parse(await readFile(dbPath, 'utf-8'));
    const item = db.interests?.find((i) => i.id === id);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Interest not found',
        results: [],
      });
    }

    console.log(`[Search] Related search for: "${item.title}"`);

    const result = await relatedSearch(item, { count, freshness });

    res.json(result);
  } catch (err) {
    console.error('[Search] Related search failed:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      results: [],
    });
  }
});

// ============================================================================
// JSON Server for CRUD operations
// ============================================================================

const router = jsonServer.router(path.join(__dirname, '..', 'db.json'));
const middlewares = jsonServer.defaults();

// Custom middleware to sync status changes to Obsidian
router.render = async (req, res) => {
  // Check if this was a PATCH to an interest with status change
  if (req.method === 'PATCH' && req.path.startsWith('/interests/')) {
    const item = res.locals.data;
    if (item && item.obsidianPath && req.body?.status) {
      // Async update to Obsidian (fire and forget)
      updateNoteFrontmatter(item.obsidianPath, {
        status: item.status,
        updated: new Date().toISOString(),
      }).catch(err => {
        console.error('[Obsidian] Failed to sync status:', err);
      });
    }
  }
  res.json(res.locals.data);
};

app.use('/api', middlewares);
app.use('/api', router);

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                    WAR GOAT API SERVER                     ║
║              "Always Remember What's Next!"                ║
╠════════════════════════════════════════════════════════════╣
║  Server:    http://localhost:${PORT}                          ║
║  API:       http://localhost:${PORT}/api                      ║
║  Enrich:    http://localhost:${PORT}/api/enrich               ║
║  Health:    http://localhost:${PORT}/api/health               ║
╚════════════════════════════════════════════════════════════╝
  `);
});
