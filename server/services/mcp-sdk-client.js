/**
 * MCP SDK Client
 *
 * Alternative MCP client implementation using the official
 * @modelcontextprotocol/sdk package.
 *
 * This provides a more robust, production-ready approach compared
 * to our manual JSON-RPC implementation in mcp-client.js.
 *
 * Benefits of the official SDK:
 * - Proper protocol handling
 * - Built-in error handling
 * - Connection lifecycle management
 * - Type definitions (if using TypeScript)
 *
 * @example
 * import { createMCPClient, callYouTubeTranscript } from './mcp-sdk-client.js';
 *
 * const transcript = await callYouTubeTranscript('https://youtube.com/...');
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Create an MCP client using the official SDK
 * @param {Object} config - Server configuration
 * @param {string} config.command - Command to run
 * @param {string[]} config.args - Command arguments
 * @param {string} [config.cwd] - Working directory
 * @param {Object} [config.env] - Environment variables
 * @returns {Promise<Client>} Connected MCP client
 */
export async function createMCPClient(config) {
  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args,
    cwd: config.cwd,
    env: config.env ? { ...process.env, ...config.env } : undefined,
  });

  const client = new Client(
    {
      name: 'war-goat',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  await client.connect(transport);
  return client;
}

/**
 * Call a tool on an MCP server using the official SDK
 * @param {Object} serverConfig - Server configuration
 * @param {string} toolName - Name of the tool to call
 * @param {Object} args - Tool arguments
 * @returns {Promise<Object>} Tool result
 */
export async function callTool(serverConfig, toolName, args) {
  let client;

  try {
    client = await createMCPClient(serverConfig);

    const result = await client.callTool({
      name: toolName,
      arguments: args,
    });

    return result;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * List available tools from an MCP server
 * @param {Object} serverConfig - Server configuration
 * @returns {Promise<Array>} List of tools
 */
export async function listTools(serverConfig) {
  let client;

  try {
    client = await createMCPClient(serverConfig);
    const result = await client.listTools();
    return result.tools || [];
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// ============================================================================
// Pre-configured server helpers
// ============================================================================

const YOUTUBE_TRANSCRIPT_CONFIG = {
  command: 'docker',
  args: ['run', '-i', '--rm', 'mcp/youtube-transcript'],
};

/**
 * Call YouTube Transcript MCP using the official SDK
 * @param {string} url - YouTube video URL
 * @returns {Promise<string|null>} Transcript text or null
 */
export async function callYouTubeTranscript(url) {
  try {
    console.log('[MCP-SDK] Calling youtube-transcript for:', url);

    const result = await callTool(
      YOUTUBE_TRANSCRIPT_CONFIG,
      'get_transcript',
      { url }
    );

    // Extract text from result
    if (result?.content?.[0]?.text) {
      return result.content[0].text;
    }

    console.warn('[MCP-SDK] No transcript in response');
    return null;
  } catch (err) {
    console.error('[MCP-SDK] YouTube transcript failed:', err.message);
    throw err;
  }
}

/**
 * List available tools from YouTube Transcript MCP
 * @returns {Promise<Array>} List of tools
 */
export async function listYouTubeTranscriptTools() {
  return listTools(YOUTUBE_TRANSCRIPT_CONFIG);
}

// ============================================================================
// Comparison: SDK vs Manual Implementation
// ============================================================================

/**
 * This module demonstrates the official MCP SDK approach.
 *
 * COMPARISON:
 *
 * Manual (mcp-client.js):
 * - spawn() + stdin/stdout handling
 * - Manual JSON-RPC request building
 * - Manual response parsing
 * - More educational (see the protocol)
 * - More control over the process
 *
 * SDK (this file):
 * - StdioClientTransport handles process
 * - Client handles JSON-RPC
 * - Automatic protocol handling
 * - Better error messages
 * - Production-ready
 *
 * RECOMMENDATION:
 * - Use manual approach for learning
 * - Use SDK for production
 * - Both are valid choices
 */

export default {
  createMCPClient,
  callTool,
  listTools,
  callYouTubeTranscript,
  listYouTubeTranscriptTools,
};
