/**
 * Obsidian Service
 *
 * High-level service for Obsidian vault operations.
 * Uses MCP servers or direct HTTP to Obsidian REST API.
 *
 * @example
 * import { exportInterest, checkConnection } from './services/obsidian.js';
 *
 * const status = await checkConnection();
 * if (status.connected) {
 *   await exportInterest(item, { folder: 'War Goat' });
 * }
 */

import { mcpRegistry } from './mcp-client.js';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// Configuration
// ============================================================================

const OBSIDIAN_REST_URL = process.env.OBSIDIAN_REST_URL || 'http://localhost:27123';
const OBSIDIAN_API_KEY = process.env.OBSIDIAN_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// ============================================================================
// Core Utility Functions
// ============================================================================

/**
 * Sanitize title for use as filename
 * Removes illegal characters and limits length
 * @param {string} title - Original title
 * @returns {string} - Safe filename (no extension)
 */
export function sanitizeFilename(title) {
  if (!title) return 'untitled';

  return title
    .replace(/[<>:"/\\|?*]/g, '')  // Remove illegal chars for filesystems
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '') // Remove control chars
    .replace(/\s+/g, ' ')          // Normalize whitespace
    .trim()
    .substring(0, 100)             // Limit length
    || 'untitled';
}

/**
 * Build note content from interest data
 * @param {Object} item - The interest item
 * @param {Object} options - Export options
 * @param {Object} [studyNotes] - AI-generated study notes
 * @returns {string} - Markdown content with frontmatter
 */
export function buildNoteContent(item, options = {}, studyNotes = null) {
  const now = new Date().toISOString();

  // Build frontmatter
  const frontmatter = {
    title: item.title,
    url: item.url,
    type: item.type,
    author: item.author || '',
    status: item.status,
    tags: item.tags || [],
    categories: item.categories || [],
    created: item.createdAt,
    updated: now,
    war_goat_id: item.id,
  };

  // Convert frontmatter to YAML
  const yamlLines = ['---'];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      yamlLines.push(`${key}: [${value.map(v => `"${v}"`).join(', ')}]`);
    } else if (typeof value === 'string' && (value.includes(':') || value.includes('"'))) {
      yamlLines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
    } else {
      yamlLines.push(`${key}: ${value}`);
    }
  }
  yamlLines.push('---');

  // Build markdown body
  const lines = [
    yamlLines.join('\n'),
    '',
    `# ${item.title}`,
    '',
    `**Author**: ${item.author || 'Unknown'}`,
    `**Type**: ${item.type}`,
    `**URL**: [Original Link](${item.url})`,
    `**Status**: ${item.status}`,
    '',
  ];

  // Tags section
  if (item.tags && item.tags.length > 0) {
    lines.push('## Tags');
    item.tags.forEach(tag => lines.push(`- #${tag.replace(/\s+/g, '-')}`));
    lines.push('');
  }

  // Categories section (as wiki links)
  if (item.categories && item.categories.length > 0) {
    lines.push('## Categories');
    item.categories.forEach(cat => lines.push(`- [[${cat}]]`));
    lines.push('');
  }

  // Notes section
  lines.push('## Notes');
  lines.push('');
  lines.push(item.notes || '_Add your notes here..._');
  lines.push('');

  // AI Study Notes section (if provided)
  if (studyNotes) {
    lines.push('## AI Summary');
    lines.push('');
    lines.push(studyNotes.summary || '_No summary available_');
    lines.push('');

    if (studyNotes.keyConcepts && studyNotes.keyConcepts.length > 0) {
      lines.push('## Key Concepts');
      lines.push('');
      studyNotes.keyConcepts.forEach(concept => {
        lines.push(`- **${concept.name}**: ${concept.description}`);
      });
      lines.push('');
    }

    if (studyNotes.quotes && studyNotes.quotes.length > 0) {
      lines.push('## Notable Quotes');
      lines.push('');
      studyNotes.quotes.forEach(quote => {
        const timestamp = quote.timestamp ? ` (${quote.timestamp})` : '';
        lines.push(`> "${quote.text}"${timestamp}`);
        lines.push('');
      });
    }

    if (studyNotes.actionItems && studyNotes.actionItems.length > 0) {
      lines.push('## Action Items');
      lines.push('');
      studyNotes.actionItems.forEach(item => {
        lines.push(`- [ ] ${item}`);
      });
      lines.push('');
    }

    if (studyNotes.relatedTopics && studyNotes.relatedTopics.length > 0) {
      lines.push('## Related Topics');
      lines.push('');
      studyNotes.relatedTopics.forEach(topic => {
        lines.push(`- [[${topic}]]`);
      });
      lines.push('');
    }
  }

  // Transcript section (collapsible)
  if (options.includeTranscript !== false && item.transcript) {
    lines.push('---');
    lines.push('');
    lines.push('## Transcript');
    lines.push('');
    lines.push('<details>');
    lines.push('<summary>Full Transcript (click to expand)</summary>');
    lines.push('');
    lines.push(item.transcript);
    lines.push('');
    lines.push('</details>');
  }

  return lines.join('\n');
}

// ============================================================================
// Connection & Status Functions
// ============================================================================

/**
 * Check if Obsidian connection is available
 * Tries MCP first, falls back to direct REST API
 * @returns {Promise<Object>} - { connected: boolean, vaultName?: string, error?: string }
 */
export async function checkConnection() {
  // Try direct REST API first (more reliable)
  try {
    const response = await fetch(`${OBSIDIAN_REST_URL}/`, {
      method: 'GET',
      headers: OBSIDIAN_API_KEY ? { 'Authorization': `Bearer ${OBSIDIAN_API_KEY}` } : {},
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        connected: true,
        vaultName: data.name || 'Obsidian Vault',
      };
    }
  } catch (err) {
    // REST API not available, try MCP
  }

  // Try MCP
  try {
    const client = mcpRegistry.getClient('obsidian');
    const tools = await client.listTools();

    if (tools && tools.length > 0) {
      return {
        connected: true,
        vaultName: 'Obsidian Vault (MCP)',
      };
    }
  } catch (err) {
    // MCP not available either
  }

  return {
    connected: false,
    error: 'Obsidian is not reachable. Ensure Obsidian is running with Local REST API plugin enabled.',
  };
}

// ============================================================================
// MCP/REST Operations
// ============================================================================

/**
 * Find existing note by war_goat_id in frontmatter
 * @param {string} warGoatId - The interest ID
 * @param {string} folder - Folder to search in
 * @returns {Promise<string|null>} - Note path or null
 */
export async function findExistingNote(warGoatId, folder = 'War Goat') {
  try {
    // Try REST API search
    const response = await fetch(`${OBSIDIAN_REST_URL}/search/simple/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(OBSIDIAN_API_KEY ? { 'Authorization': `Bearer ${OBSIDIAN_API_KEY}` } : {}),
      },
      body: JSON.stringify({ query: `war_goat_id: ${warGoatId}` }),
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const results = await response.json();
      if (results && results.length > 0) {
        return results[0].filename || results[0].path;
      }
    }
  } catch (err) {
    console.error('[Obsidian] Search failed:', err.message);
  }

  // Try MCP search as fallback
  try {
    const client = mcpRegistry.getClient('obsidian');
    const result = await client.callTool('obsidian_simple_search', {
      query: `war_goat_id: ${warGoatId}`,
    });

    if (result?.content?.[0]?.text) {
      const text = result.content[0].text;
      // Parse search results to find matching file
      const match = text.match(/(?:^|\n)([^\n]+\.md)/);
      if (match) {
        return match[1];
      }
    }
  } catch (err) {
    console.error('[Obsidian] MCP search failed:', err.message);
  }

  return null;
}

/**
 * Create or update a note in Obsidian
 * @param {string} path - Note path (e.g., "War Goat/My Note.md")
 * @param {string} content - Note content
 * @returns {Promise<boolean>} - Success status
 */
async function writeNote(path, content) {
  // Ensure path ends with .md
  const notePath = path.endsWith('.md') ? path : `${path}.md`;

  // Try REST API first
  try {
    const response = await fetch(`${OBSIDIAN_REST_URL}/vault/${encodeURIComponent(notePath)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/markdown',
        ...(OBSIDIAN_API_KEY ? { 'Authorization': `Bearer ${OBSIDIAN_API_KEY}` } : {}),
      },
      body: content,
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      return true;
    }
  } catch (err) {
    console.error('[Obsidian] REST write failed:', err.message);
  }

  // Try MCP as fallback
  try {
    const client = mcpRegistry.getClient('obsidian');
    await client.callTool('obsidian_append_content', {
      filepath: notePath,
      content: content,
    });
    return true;
  } catch (err) {
    console.error('[Obsidian] MCP write failed:', err.message);
    throw new Error(`Failed to write note: ${err.message}`);
  }
}

/**
 * Export single interest to Obsidian
 * @param {Object} item - The interest to export
 * @param {Object} options - Export options
 * @param {string} [transcript] - Optional transcript content
 * @returns {Promise<Object>} - { success, notePath, existed, error }
 */
export async function exportInterest(item, options = {}, transcript = null) {
  const folder = options.folder || 'War Goat';
  const filename = sanitizeFilename(item.title);
  const notePath = `${folder}/${filename}.md`;

  try {
    // Check for existing note
    const existingPath = await findExistingNote(item.id, folder);
    const existed = !!existingPath;

    if (existed && !options.forceOverwrite) {
      return {
        success: false,
        notePath: existingPath,
        existed: true,
        error: 'Note already exists. Use forceOverwrite to update.',
      };
    }

    // Generate study notes if requested
    let studyNotes = null;
    if (options.generateStudyNotes && (transcript || item.transcript)) {
      studyNotes = await generateStudyNotes(transcript || item.transcript, item.title);
    }

    // Build note content
    const itemWithTranscript = { ...item, transcript: transcript || item.transcript };
    const content = buildNoteContent(itemWithTranscript, options, studyNotes);

    // Write the note
    const targetPath = existed ? existingPath : notePath;
    await writeNote(targetPath, content);

    return {
      success: true,
      notePath: targetPath,
      existed,
    };
  } catch (err) {
    console.error('[Obsidian] Export failed:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Update note frontmatter (for status sync)
 * @param {string} notePath - Path to note in vault
 * @param {Object} updates - Frontmatter fields to update
 * @returns {Promise<boolean>}
 */
export async function updateNoteFrontmatter(notePath, updates) {
  try {
    // Read existing note
    const response = await fetch(`${OBSIDIAN_REST_URL}/vault/${encodeURIComponent(notePath)}`, {
      method: 'GET',
      headers: OBSIDIAN_API_KEY ? { 'Authorization': `Bearer ${OBSIDIAN_API_KEY}` } : {},
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error('Failed to read note');
    }

    let content = await response.text();

    // Parse and update frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      let frontmatter = frontmatterMatch[1];

      for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`^${key}:.*$`, 'm');
        const newLine = `${key}: ${value}`;

        if (regex.test(frontmatter)) {
          frontmatter = frontmatter.replace(regex, newLine);
        } else {
          frontmatter += `\n${newLine}`;
        }
      }

      content = content.replace(/^---\n[\s\S]*?\n---/, `---\n${frontmatter}\n---`);
    }

    // Write updated content
    await writeNote(notePath, content);
    return true;
  } catch (err) {
    console.error('[Obsidian] Frontmatter update failed:', err);
    return false;
  }
}

/**
 * Sync all interests to Obsidian
 * @param {Array} items - All interests
 * @param {Object} options - Sync options
 * @param {Function} onProgress - Progress callback (current, total, itemTitle)
 * @returns {Promise<Object>} - { created, skipped, failed, errors }
 */
export async function syncAll(items, options = {}, onProgress = null) {
  const result = {
    created: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const total = items.length;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (onProgress) {
      onProgress(i + 1, total, item.title);
    }

    try {
      // Check if already synced (has obsidianPath)
      if (item.obsidianPath && !options.forceOverwrite) {
        result.skipped++;
        continue;
      }

      const exportResult = await exportInterest(item, {
        ...options,
        forceOverwrite: options.forceOverwrite || false,
      });

      if (exportResult.success) {
        if (exportResult.existed) {
          result.skipped++;
        } else {
          result.created++;
        }
      } else if (exportResult.existed && !options.forceOverwrite) {
        result.skipped++;
      } else {
        result.failed++;
        result.errors.push({ id: item.id, error: exportResult.error });
      }
    } catch (err) {
      result.failed++;
      result.errors.push({ id: item.id, error: err.message });
    }

    // Small delay to avoid overwhelming Obsidian
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return result;
}

// ============================================================================
// AI Study Notes Generation
// ============================================================================

/**
 * Generate AI study notes from transcript
 * @param {string} transcript - Full transcript text
 * @param {string} title - Video/content title
 * @returns {Promise<Object>} - { summary, keyConcepts, quotes, relatedTopics, actionItems }
 */
export async function generateStudyNotes(transcript, title) {
  if (!ANTHROPIC_API_KEY) {
    console.warn('[Obsidian] ANTHROPIC_API_KEY not set, skipping study notes generation');
    return null;
  }

  if (!transcript || transcript.length < 100) {
    return null;
  }

  try {
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    // Truncate transcript if too long
    const maxLength = 50000;
    const truncatedTranscript = transcript.length > maxLength
      ? transcript.substring(0, maxLength) + '\n\n[Transcript truncated...]'
      : transcript;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Analyze the following transcript from "${title}" and create structured study notes.

Return a JSON object with this exact structure:
{
  "summary": "2-3 paragraph summary of the main content",
  "keyConcepts": [
    { "name": "Concept Name", "description": "Brief explanation" }
  ],
  "quotes": [
    { "text": "Notable quote from the content", "timestamp": "optional timestamp" }
  ],
  "relatedTopics": ["Topic 1", "Topic 2"],
  "actionItems": ["Thing to try or do"]
}

Include 3-5 key concepts, 2-3 notable quotes, 3-5 related topics, and 2-3 action items.

TRANSCRIPT:
${truncatedTranscript}

Respond with ONLY the JSON object, no other text.`
      }]
    });

    const text = response.content[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const studyNotes = JSON.parse(jsonMatch[0]);
      return {
        summary: studyNotes.summary || '',
        keyConcepts: studyNotes.keyConcepts || [],
        quotes: studyNotes.quotes || [],
        relatedTopics: studyNotes.relatedTopics || [],
        actionItems: studyNotes.actionItems || [],
      };
    }

    return null;
  } catch (err) {
    console.error('[Obsidian] Study notes generation failed:', err);
    return null;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  sanitizeFilename,
  buildNoteContent,
  checkConnection,
  findExistingNote,
  exportInterest,
  updateNoteFrontmatter,
  syncAll,
  generateStudyNotes,
};
