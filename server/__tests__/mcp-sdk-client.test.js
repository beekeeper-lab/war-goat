/**
 * MCP SDK Client Unit Tests
 *
 * Tests for server/services/mcp-sdk-client.js covering:
 * - createMCPClient: Client creation and connection
 * - callTool: Tool invocation with cleanup
 * - listTools: Tool listing
 * - callYouTubeTranscript: Pre-configured YouTube helper
 * - listYouTubeTranscriptTools: Pre-configured tool listing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock client instance that persists
const mockClientInstance = {
  connect: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  callTool: vi.fn(),
  listTools: vi.fn(),
};

// Mock the MCP SDK before imports
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(() => mockClientInstance),
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn(),
}));

import {
  createMCPClient,
  callTool,
  listTools,
  callYouTubeTranscript,
  listYouTubeTranscriptTools,
} from '../services/mcp-sdk-client.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

describe('MCP SDK Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockClientInstance.connect.mockResolvedValue(undefined);
    mockClientInstance.close.mockResolvedValue(undefined);
    mockClientInstance.callTool.mockResolvedValue({ content: [] });
    mockClientInstance.listTools.mockResolvedValue({ tools: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // createMCPClient
  // =========================================================================

  describe('createMCPClient', () => {
    it('creates transport with correct config', async () => {
      const config = {
        command: 'docker',
        args: ['run', '-i', '--rm', 'mcp/test'],
        cwd: '/test/dir',
        env: { TEST_VAR: 'value' },
      };

      await createMCPClient(config);

      expect(StdioClientTransport).toHaveBeenCalledWith({
        command: 'docker',
        args: ['run', '-i', '--rm', 'mcp/test'],
        cwd: '/test/dir',
        env: expect.objectContaining({ TEST_VAR: 'value' }),
      });
    });

    it('creates client and connects', async () => {
      const config = {
        command: 'npx',
        args: ['test-server'],
      };

      await createMCPClient(config);

      expect(Client).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'war-goat',
          version: '1.0.0',
        }),
        expect.any(Object)
      );
      expect(mockClientInstance.connect).toHaveBeenCalled();
    });

    it('returns connected client', async () => {
      const config = { command: 'test', args: [] };

      const client = await createMCPClient(config);

      expect(client).toBe(mockClientInstance);
    });
  });

  // =========================================================================
  // callTool
  // =========================================================================

  describe('callTool', () => {
    const serverConfig = {
      command: 'docker',
      args: ['run', '-i', 'mcp/test'],
    };

    it('creates client, calls tool, closes client', async () => {
      mockClientInstance.callTool.mockResolvedValue({
        content: [{ text: 'result' }],
      });

      await callTool(serverConfig, 'test_tool', { arg: 'value' });

      expect(Client).toHaveBeenCalled();
      expect(mockClientInstance.connect).toHaveBeenCalled();
      expect(mockClientInstance.callTool).toHaveBeenCalledWith({
        name: 'test_tool',
        arguments: { arg: 'value' },
      });
      expect(mockClientInstance.close).toHaveBeenCalled();
    });

    it('returns tool result', async () => {
      const expectedResult = {
        content: [{ text: 'tool output' }],
      };
      mockClientInstance.callTool.mockResolvedValue(expectedResult);

      const result = await callTool(serverConfig, 'my_tool', {});

      expect(result).toEqual(expectedResult);
    });

    it('closes client even on error', async () => {
      mockClientInstance.callTool.mockRejectedValue(new Error('Tool failed'));

      await expect(callTool(serverConfig, 'failing_tool', {})).rejects.toThrow('Tool failed');

      expect(mockClientInstance.close).toHaveBeenCalled();
    });

    it('propagates errors from callTool', async () => {
      const error = new Error('MCP tool error');
      mockClientInstance.callTool.mockRejectedValue(error);

      await expect(callTool(serverConfig, 'test', {})).rejects.toThrow('MCP tool error');
    });
  });

  // =========================================================================
  // listTools
  // =========================================================================

  describe('listTools', () => {
    const serverConfig = {
      command: 'npx',
      args: ['mcp-server'],
    };

    it('creates client, lists tools, closes client', async () => {
      mockClientInstance.listTools.mockResolvedValue({
        tools: [{ name: 'tool1' }, { name: 'tool2' }],
      });

      await listTools(serverConfig);

      expect(mockClientInstance.connect).toHaveBeenCalled();
      expect(mockClientInstance.listTools).toHaveBeenCalled();
      expect(mockClientInstance.close).toHaveBeenCalled();
    });

    it('returns tools array', async () => {
      const tools = [
        { name: 'get_transcript', description: 'Get video transcript' },
        { name: 'search', description: 'Search videos' },
      ];
      mockClientInstance.listTools.mockResolvedValue({ tools });

      const result = await listTools(serverConfig);

      expect(result).toEqual(tools);
    });

    it('returns empty array when no tools', async () => {
      mockClientInstance.listTools.mockResolvedValue({});

      const result = await listTools(serverConfig);

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // callYouTubeTranscript
  // =========================================================================

  describe('callYouTubeTranscript', () => {
    it('calls get_transcript tool with URL', async () => {
      mockClientInstance.callTool.mockResolvedValue({
        content: [{ text: 'Transcript text here' }],
      });

      await callYouTubeTranscript('https://youtube.com/watch?v=abc123');

      expect(mockClientInstance.callTool).toHaveBeenCalledWith({
        name: 'get_transcript',
        arguments: { url: 'https://youtube.com/watch?v=abc123' },
      });
    });

    it('extracts text from response', async () => {
      mockClientInstance.callTool.mockResolvedValue({
        content: [{ text: 'Hello world transcript content' }],
      });

      const result = await callYouTubeTranscript('https://youtube.com/watch?v=test');

      expect(result).toBe('Hello world transcript content');
    });

    it('returns null when no text in response', async () => {
      mockClientInstance.callTool.mockResolvedValue({
        content: [],
      });

      const result = await callYouTubeTranscript('https://youtube.com/watch?v=test');

      expect(result).toBeNull();
    });

    it('throws on API errors', async () => {
      mockClientInstance.callTool.mockRejectedValue(new Error('API error'));

      await expect(
        callYouTubeTranscript('https://youtube.com/watch?v=test')
      ).rejects.toThrow('API error');
    });

    it('uses correct docker config for youtube-transcript', async () => {
      mockClientInstance.callTool.mockResolvedValue({
        content: [{ text: 'test' }],
      });

      await callYouTubeTranscript('https://youtube.com/watch?v=test');

      expect(StdioClientTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'docker',
          args: ['run', '-i', '--rm', 'mcp/youtube-transcript'],
        })
      );
    });
  });

  // =========================================================================
  // listYouTubeTranscriptTools
  // =========================================================================

  describe('listYouTubeTranscriptTools', () => {
    it('uses correct config for youtube-transcript', async () => {
      mockClientInstance.listTools.mockResolvedValue({
        tools: [{ name: 'get_transcript' }],
      });

      await listYouTubeTranscriptTools();

      expect(StdioClientTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'docker',
          args: ['run', '-i', '--rm', 'mcp/youtube-transcript'],
        })
      );
    });

    it('returns tools list', async () => {
      const tools = [
        { name: 'get_transcript', description: 'Fetch transcript' },
      ];
      mockClientInstance.listTools.mockResolvedValue({ tools });

      const result = await listYouTubeTranscriptTools();

      expect(result).toEqual(tools);
    });
  });
});
