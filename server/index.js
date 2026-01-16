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

const require = createRequire(import.meta.url);
const jsonServer = require('json-server');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRANSCRIPTS_DIR = path.join(__dirname, '..', 'data', 'transcripts');

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
// API Routes
// ============================================================================

/**
 * POST /api/enrich
 * Enrich a URL with metadata and transcript (for YouTube)
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

    // For non-YouTube URLs, return basic info
    // Future: Add enrichment for other source types
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
// JSON Server for CRUD operations
// ============================================================================

const router = jsonServer.router(path.join(__dirname, '..', 'db.json'));
const middlewares = jsonServer.defaults();

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
