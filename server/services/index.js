/**
 * Server Services
 *
 * Central export for all server-side services.
 *
 * MCP Clients:
 * - mcp-client.js: Manual implementation (educational, shows the protocol)
 * - mcp-sdk-client.js: Official SDK (production-ready)
 */

// Manual MCP client (educational)
export { MCPClient, MCPRegistry, mcpRegistry } from './mcp-client.js';

// Official SDK client (production)
export {
  createMCPClient,
  callTool,
  listTools,
  callYouTubeTranscript,
  listYouTubeTranscriptTools,
} from './mcp-sdk-client.js';

// YouTube service (uses manual client by default)
export {
  extractVideoId,
  isYouTubeUrl,
  getMetadata,
  getTranscript,
  enrichYouTubeUrl,
  getVideoMetrics,
} from './youtube.js';

// Obsidian service
export {
  sanitizeFilename,
  buildNoteContent,
  checkConnection as checkObsidianConnection,
  findExistingNote,
  exportInterest,
  updateNoteFrontmatter,
  syncAll as syncAllToObsidian,
  generateStudyNotes,
} from './obsidian.js';

// Brave Search service
export {
  isAvailable as isBraveSearchAvailable,
  webSearch,
  newsSearch,
  videoSearch,
  relatedSearch,
  buildRelatedQuery,
  clearCache as clearBraveSearchCache,
  getCacheSize as getBraveSearchCacheSize,
} from './brave-search.js';
