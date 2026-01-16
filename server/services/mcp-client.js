/**
 * MCP Client Service
 *
 * A clean abstraction for calling MCP (Model Context Protocol) servers.
 * This module handles:
 * - Spawning MCP server processes
 * - JSON-RPC 2.0 communication
 * - Response parsing and error handling
 *
 * @example
 * const client = new MCPClient({
 *   command: 'docker',
 *   args: ['run', '-i', '--rm', 'mcp/youtube-transcript']
 * });
 *
 * const result = await client.callTool('get_transcript', { url: '...' });
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

/**
 * Configuration for an MCP server
 * @typedef {Object} MCPServerConfig
 * @property {string} command - The command to run (e.g., 'docker', 'python')
 * @property {string[]} args - Arguments for the command
 * @property {string} [cwd] - Working directory
 * @property {Object} [env] - Environment variables
 */

/**
 * MCP Client for communicating with MCP servers
 */
export class MCPClient extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.requestId = 0;
    this.process = null;
    this.connected = false;
  }

  /**
   * Generate a unique request ID
   */
  nextRequestId() {
    return ++this.requestId;
  }

  /**
   * Spawn the MCP server process
   */
  async connect() {
    if (this.connected) {
      return;
    }

    return new Promise((resolve, reject) => {
      const { command, args, cwd, env } = this.config;

      this.process = spawn(command, args, {
        cwd,
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.process.on('error', (err) => {
        this.connected = false;
        this.emit('error', err);
        reject(err);
      });

      this.process.on('close', (code) => {
        this.connected = false;
        this.emit('close', code);
      });

      // Give the process a moment to start
      setTimeout(() => {
        this.connected = true;
        resolve();
      }, 100);
    });
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect() {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.connected = false;
    }
  }

  /**
   * Send a JSON-RPC request and get the response
   * @param {string} method - The JSON-RPC method
   * @param {Object} params - The method parameters
   * @returns {Promise<Object>} The result from the MCP server
   */
  async request(method, params = {}) {
    const request = {
      jsonrpc: '2.0',
      id: this.nextRequestId(),
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const { command, args, cwd, env } = this.config;

      // For stateless calls, spawn a new process each time
      // This is simpler and works well with Docker containers
      const proc = spawn(command, args, {
        cwd,
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      const timeout = setTimeout(() => {
        proc.kill();
        reject(new Error('MCP request timed out after 30 seconds'));
      }, 30000);

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn MCP server: ${err.message}`));
      });

      proc.on('close', (code) => {
        clearTimeout(timeout);

        if (code !== 0 && !stdout.includes('"result"')) {
          console.error('MCP stderr:', stderr);
          reject(new Error(`MCP server exited with code ${code}`));
          return;
        }

        try {
          const response = this.parseResponse(stdout);
          if (response.error) {
            reject(new Error(response.error.message || 'MCP error'));
          } else {
            resolve(response.result);
          }
        } catch (err) {
          reject(err);
        }
      });

      // Send the request
      proc.stdin.write(JSON.stringify(request) + '\n');
      proc.stdin.end();
    });
  }

  /**
   * Parse JSON-RPC response from stdout
   * MCP servers may output multiple lines; we need to find the JSON response
   */
  parseResponse(stdout) {
    const lines = stdout.trim().split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.jsonrpc === '2.0' && (parsed.result !== undefined || parsed.error)) {
            return parsed;
          }
        } catch {
          // Not valid JSON, continue to next line
        }
      }
    }

    throw new Error('No valid JSON-RPC response found in MCP output');
  }

  /**
   * List available tools from the MCP server
   * @returns {Promise<Array>} List of available tools
   */
  async listTools() {
    const result = await this.request('tools/list');
    return result.tools || [];
  }

  /**
   * Call a tool on the MCP server
   * @param {string} name - Tool name
   * @param {Object} args - Tool arguments
   * @returns {Promise<Object>} Tool result
   */
  async callTool(name, args = {}) {
    return this.request('tools/call', {
      name,
      arguments: args
    });
  }
}

/**
 * MCP Server Registry
 * Manages multiple MCP server configurations
 */
export class MCPRegistry {
  constructor() {
    this.servers = new Map();
  }

  /**
   * Register an MCP server configuration
   * @param {string} name - Server name
   * @param {MCPServerConfig} config - Server configuration
   */
  register(name, config) {
    this.servers.set(name, config);
  }

  /**
   * Get a client for a registered server
   * @param {string} name - Server name
   * @returns {MCPClient} MCP client instance
   */
  getClient(name) {
    const config = this.servers.get(name);
    if (!config) {
      throw new Error(`MCP server '${name}' not registered`);
    }
    return new MCPClient(config);
  }

  /**
   * Load servers from .mcp.json configuration
   * @param {Object} mcpConfig - Parsed .mcp.json content
   */
  loadFromConfig(mcpConfig) {
    if (mcpConfig.mcpServers) {
      for (const [name, config] of Object.entries(mcpConfig.mcpServers)) {
        this.register(name, config);
      }
    }
  }
}

// Default registry instance
export const mcpRegistry = new MCPRegistry();

// Register known MCP servers
mcpRegistry.register('youtube-transcript', {
  command: 'docker',
  args: ['run', '-i', '--rm', 'mcp/youtube-transcript']
});

// Obsidian MCP - uses the obsidian-mcp Docker container
// Note: Requires OBSIDIAN_API_KEY and OBSIDIAN_REST_URL env vars
mcpRegistry.register('obsidian', {
  command: 'docker',
  args: [
    'run', '-i', '--rm',
    '--network', 'host',
    '-e', `OBSIDIAN_API_KEY=${process.env.OBSIDIAN_API_KEY || ''}`,
    '-e', `OBSIDIAN_REST_URL=${process.env.OBSIDIAN_REST_URL || 'http://localhost:27123'}`,
    'mcp/obsidian'
  ]
});

export default MCPClient;
