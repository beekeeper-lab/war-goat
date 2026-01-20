/**
 * MCP Client Unit Tests
 *
 * Tests for server/services/mcp-client.js covering:
 * - MCPClient class: nextRequestId, connect, disconnect, request, parseResponse, listTools, callTool
 * - MCPRegistry class: register, getClient, loadFromConfig
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Mock child_process before imports
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import { MCPClient, MCPRegistry } from '../services/mcp-client.js';
import { spawn } from 'child_process';

/**
 * Create a mock process with EventEmitter pattern
 */
function createMockProcess(options = {}) {
  const proc = new EventEmitter();
  proc.stdin = {
    write: vi.fn(),
    end: vi.fn(),
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.kill = vi.fn();

  // Simulate stdout data after a delay
  if (options.stdout) {
    setTimeout(() => {
      proc.stdout.emit('data', Buffer.from(options.stdout));
    }, options.stdoutDelay || 5);
  }

  // Simulate stderr
  if (options.stderr) {
    setTimeout(() => {
      proc.stderr.emit('data', Buffer.from(options.stderr));
    }, options.stderrDelay || 5);
  }

  // Simulate process close
  if (options.exitCode !== undefined) {
    setTimeout(() => {
      proc.emit('close', options.exitCode);
    }, options.closeDelay || 15);
  }

  // Simulate error
  if (options.error) {
    setTimeout(() => {
      proc.emit('error', options.error);
    }, options.errorDelay || 5);
  }

  return proc;
}

describe('MCP Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // MCPClient
  // =========================================================================

  describe('MCPClient', () => {
    describe('constructor', () => {
      it('initializes with config', () => {
        const config = { command: 'test', args: ['arg1'] };
        const client = new MCPClient(config);

        expect(client.config).toEqual(config);
        expect(client.requestId).toBe(0);
        expect(client.process).toBeNull();
        expect(client.connected).toBe(false);
      });
    });

    describe('nextRequestId', () => {
      it('increments request ID on each call', () => {
        const client = new MCPClient({ command: 'test', args: [] });

        expect(client.nextRequestId()).toBe(1);
        expect(client.nextRequestId()).toBe(2);
        expect(client.nextRequestId()).toBe(3);
      });

      it('starts from 1', () => {
        const client = new MCPClient({ command: 'test', args: [] });

        expect(client.nextRequestId()).toBe(1);
      });
    });

    describe('connect', () => {
      it('spawns process with correct config', async () => {
        const mockProc = createMockProcess({ exitCode: 0 });
        spawn.mockReturnValue(mockProc);

        const config = {
          command: 'docker',
          args: ['run', '-i', 'test'],
          cwd: '/test',
          env: { TEST: 'value' },
        };
        const client = new MCPClient(config);

        const connectPromise = client.connect();
        await vi.advanceTimersByTimeAsync(200);
        await connectPromise;

        expect(spawn).toHaveBeenCalledWith('docker', ['run', '-i', 'test'], {
          cwd: '/test',
          env: expect.objectContaining({ TEST: 'value' }),
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      });

      it('sets connected to true', async () => {
        const mockProc = createMockProcess({ exitCode: 0 });
        spawn.mockReturnValue(mockProc);

        const client = new MCPClient({ command: 'test', args: [] });

        expect(client.connected).toBe(false);

        const connectPromise = client.connect();
        await vi.advanceTimersByTimeAsync(200);
        await connectPromise;

        expect(client.connected).toBe(true);
      });

      it('handles spawn errors', async () => {
        vi.useRealTimers(); // Use real timers for this test

        const error = new Error('Spawn failed');
        const proc = new EventEmitter();
        proc.stdin = { write: vi.fn(), end: vi.fn() };
        proc.stdout = new EventEmitter();
        proc.stderr = new EventEmitter();
        proc.kill = vi.fn();
        spawn.mockReturnValue(proc);

        const client = new MCPClient({ command: 'invalid', args: [] });

        // MCPClient extends EventEmitter and emits 'error' - add listener to prevent throw
        const errorListener = vi.fn();
        client.on('error', errorListener);

        const connectPromise = client.connect();

        // Emit error on the process
        proc.emit('error', error);

        await expect(connectPromise).rejects.toThrow('Spawn failed');
        expect(client.connected).toBe(false);
        expect(errorListener).toHaveBeenCalledWith(error);

        vi.useFakeTimers({ shouldAdvanceTime: true }); // Restore fake timers
      });

      it('is idempotent when already connected', async () => {
        const mockProc = createMockProcess({ exitCode: 0 });
        spawn.mockReturnValue(mockProc);

        const client = new MCPClient({ command: 'test', args: [] });

        const firstConnect = client.connect();
        await vi.advanceTimersByTimeAsync(200);
        await firstConnect;

        // Clear spawn mock to track subsequent calls
        spawn.mockClear();

        // Second connect should not spawn again
        await client.connect();
        expect(spawn).not.toHaveBeenCalled();
      });
    });

    describe('disconnect', () => {
      it('kills the process', async () => {
        const mockProc = createMockProcess({ exitCode: 0 });
        spawn.mockReturnValue(mockProc);

        const client = new MCPClient({ command: 'test', args: [] });
        const connectPromise = client.connect();
        await vi.advanceTimersByTimeAsync(200);
        await connectPromise;

        await client.disconnect();

        expect(mockProc.kill).toHaveBeenCalled();
      });

      it('sets connected to false', async () => {
        const mockProc = createMockProcess({ exitCode: 0 });
        spawn.mockReturnValue(mockProc);

        const client = new MCPClient({ command: 'test', args: [] });
        const connectPromise = client.connect();
        await vi.advanceTimersByTimeAsync(200);
        await connectPromise;

        expect(client.connected).toBe(true);

        await client.disconnect();

        expect(client.connected).toBe(false);
      });

      it('handles already disconnected state', async () => {
        const client = new MCPClient({ command: 'test', args: [] });

        // Should not throw when already disconnected
        await expect(client.disconnect()).resolves.not.toThrow();
      });
    });

    describe('parseResponse', () => {
      it('extracts result from valid JSON-RPC response', () => {
        const client = new MCPClient({ command: 'test', args: [] });
        const stdout = '{"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"test"}]}}';

        const response = client.parseResponse(stdout);

        expect(response.result).toEqual({ tools: [{ name: 'test' }] });
      });

      it('handles multi-line output', () => {
        const client = new MCPClient({ command: 'test', args: [] });
        const stdout = `Some debug output
{"jsonrpc":"2.0","id":1,"result":{"data":"value"}}
More output`;

        const response = client.parseResponse(stdout);

        expect(response.result).toEqual({ data: 'value' });
      });

      it('throws on missing JSON-RPC response', () => {
        const client = new MCPClient({ command: 'test', args: [] });
        const stdout = 'Just some text without JSON-RPC';

        expect(() => client.parseResponse(stdout)).toThrow('No valid JSON-RPC response');
      });

      it('returns error property when present', () => {
        const client = new MCPClient({ command: 'test', args: [] });
        const stdout = '{"jsonrpc":"2.0","id":1,"error":{"code":-32600,"message":"Invalid request"}}';

        const response = client.parseResponse(stdout);

        expect(response.error).toEqual({ code: -32600, message: 'Invalid request' });
      });

      it('ignores invalid JSON lines', () => {
        const client = new MCPClient({ command: 'test', args: [] });
        const stdout = `{invalid json}
{"jsonrpc":"2.0","id":1,"result":"success"}`;

        const response = client.parseResponse(stdout);

        expect(response.result).toBe('success');
      });
    });

    describe('request', () => {
      it('sends JSON-RPC request via stdin', async () => {
        const jsonResponse = '{"jsonrpc":"2.0","id":1,"result":{"status":"ok"}}';
        const mockProc = createMockProcess({
          stdout: jsonResponse,
          stdoutDelay: 5,
          exitCode: 0,
          closeDelay: 10,
        });
        spawn.mockReturnValue(mockProc);

        const client = new MCPClient({ command: 'test', args: [] });
        const requestPromise = client.request('test/method', { param: 'value' });

        await vi.advanceTimersByTimeAsync(100);
        await requestPromise;

        expect(mockProc.stdin.write).toHaveBeenCalledWith(
          expect.stringContaining('"method":"test/method"')
        );
        expect(mockProc.stdin.write).toHaveBeenCalledWith(
          expect.stringContaining('"params":{"param":"value"}')
        );
        expect(mockProc.stdin.end).toHaveBeenCalled();
      });

      it('parses JSON-RPC response from stdout', async () => {
        const jsonResponse = '{"jsonrpc":"2.0","id":1,"result":{"data":"test"}}';
        const mockProc = createMockProcess({
          stdout: jsonResponse,
          exitCode: 0,
          closeDelay: 10,
        });
        spawn.mockReturnValue(mockProc);

        const client = new MCPClient({ command: 'test', args: [] });
        const requestPromise = client.request('test/method');

        await vi.advanceTimersByTimeAsync(100);
        const result = await requestPromise;

        expect(result).toEqual({ data: 'test' });
      });

      it('rejects on non-zero exit code without result', async () => {
        vi.useRealTimers();

        const proc = new EventEmitter();
        proc.stdin = { write: vi.fn(), end: vi.fn() };
        proc.stdout = new EventEmitter();
        proc.stderr = new EventEmitter();
        proc.kill = vi.fn();
        spawn.mockReturnValue(proc);

        const client = new MCPClient({ command: 'test', args: [] });
        const requestPromise = client.request('test/method');

        // Emit stderr then close with error code
        proc.stderr.emit('data', Buffer.from('Error occurred'));
        proc.emit('close', 1);

        await expect(requestPromise).rejects.toThrow('exited with code 1');

        vi.useFakeTimers({ shouldAdvanceTime: true });
      });

      it('rejects on spawn error', async () => {
        vi.useRealTimers();

        const proc = new EventEmitter();
        proc.stdin = { write: vi.fn(), end: vi.fn() };
        proc.stdout = new EventEmitter();
        proc.stderr = new EventEmitter();
        proc.kill = vi.fn();
        spawn.mockReturnValue(proc);

        const client = new MCPClient({ command: 'invalid', args: [] });
        const requestPromise = client.request('test/method');

        // Emit error
        proc.emit('error', new Error('Failed to spawn'));

        await expect(requestPromise).rejects.toThrow('Failed to spawn');

        vi.useFakeTimers({ shouldAdvanceTime: true });
      });

      it('rejects on JSON-RPC error response', async () => {
        vi.useRealTimers();

        const jsonResponse = '{"jsonrpc":"2.0","id":1,"error":{"message":"Method not found"}}';
        const proc = new EventEmitter();
        proc.stdin = { write: vi.fn(), end: vi.fn() };
        proc.stdout = new EventEmitter();
        proc.stderr = new EventEmitter();
        proc.kill = vi.fn();
        spawn.mockReturnValue(proc);

        const client = new MCPClient({ command: 'test', args: [] });
        const requestPromise = client.request('invalid/method');

        // Emit stdout with error response then close
        proc.stdout.emit('data', Buffer.from(jsonResponse));
        proc.emit('close', 0);

        await expect(requestPromise).rejects.toThrow('Method not found');

        vi.useFakeTimers({ shouldAdvanceTime: true });
      });
    });

    describe('listTools', () => {
      it('calls tools/list method', async () => {
        const jsonResponse = '{"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"tool1"}]}}';
        const mockProc = createMockProcess({
          stdout: jsonResponse,
          exitCode: 0,
        });
        spawn.mockReturnValue(mockProc);

        const client = new MCPClient({ command: 'test', args: [] });
        const listPromise = client.listTools();

        await vi.advanceTimersByTimeAsync(100);
        await listPromise;

        expect(mockProc.stdin.write).toHaveBeenCalledWith(
          expect.stringContaining('"method":"tools/list"')
        );
      });

      it('returns tools array', async () => {
        const tools = [{ name: 'tool1' }, { name: 'tool2' }];
        const jsonResponse = `{"jsonrpc":"2.0","id":1,"result":{"tools":${JSON.stringify(tools)}}}`;
        const mockProc = createMockProcess({
          stdout: jsonResponse,
          exitCode: 0,
        });
        spawn.mockReturnValue(mockProc);

        const client = new MCPClient({ command: 'test', args: [] });
        const listPromise = client.listTools();

        await vi.advanceTimersByTimeAsync(100);
        const result = await listPromise;

        expect(result).toEqual(tools);
      });
    });

    describe('callTool', () => {
      it('calls tools/call with name and arguments', async () => {
        const jsonResponse = '{"jsonrpc":"2.0","id":1,"result":{"content":[{"text":"output"}]}}';
        const mockProc = createMockProcess({
          stdout: jsonResponse,
          exitCode: 0,
        });
        spawn.mockReturnValue(mockProc);

        const client = new MCPClient({ command: 'test', args: [] });
        const callPromise = client.callTool('my_tool', { input: 'data' });

        await vi.advanceTimersByTimeAsync(100);
        await callPromise;

        const writeCall = mockProc.stdin.write.mock.calls[0][0];
        expect(writeCall).toContain('"method":"tools/call"');
        expect(writeCall).toContain('"name":"my_tool"');
        expect(writeCall).toContain('"arguments":{"input":"data"}');
      });

      it('returns tool result', async () => {
        const result = { content: [{ text: 'tool output' }] };
        const jsonResponse = `{"jsonrpc":"2.0","id":1,"result":${JSON.stringify(result)}}`;
        const mockProc = createMockProcess({
          stdout: jsonResponse,
          exitCode: 0,
        });
        spawn.mockReturnValue(mockProc);

        const client = new MCPClient({ command: 'test', args: [] });
        const callPromise = client.callTool('test_tool', {});

        await vi.advanceTimersByTimeAsync(100);
        const callResult = await callPromise;

        expect(callResult).toEqual(result);
      });
    });
  });

  // =========================================================================
  // MCPRegistry
  // =========================================================================

  describe('MCPRegistry', () => {
    describe('register', () => {
      it('stores server config by name', () => {
        const registry = new MCPRegistry();
        const config = { command: 'docker', args: ['run', 'test'] };

        registry.register('test-server', config);

        expect(registry.servers.get('test-server')).toEqual(config);
      });
    });

    describe('getClient', () => {
      it('returns MCPClient for registered server', () => {
        const registry = new MCPRegistry();
        const config = { command: 'npx', args: ['server'] };
        registry.register('my-server', config);

        const client = registry.getClient('my-server');

        expect(client).toBeInstanceOf(MCPClient);
        expect(client.config).toEqual(config);
      });

      it('throws for unregistered server', () => {
        const registry = new MCPRegistry();

        expect(() => registry.getClient('unknown')).toThrow("MCP server 'unknown' not registered");
      });
    });

    describe('loadFromConfig', () => {
      it('loads multiple servers from config object', () => {
        const registry = new MCPRegistry();
        const mcpConfig = {
          mcpServers: {
            'server1': { command: 'cmd1', args: ['a'] },
            'server2': { command: 'cmd2', args: ['b'] },
          },
        };

        registry.loadFromConfig(mcpConfig);

        expect(registry.servers.get('server1')).toEqual({ command: 'cmd1', args: ['a'] });
        expect(registry.servers.get('server2')).toEqual({ command: 'cmd2', args: ['b'] });
      });

      it('handles empty config', () => {
        const registry = new MCPRegistry();

        expect(() => registry.loadFromConfig({})).not.toThrow();
        expect(registry.servers.size).toBe(0);
      });
    });
  });
});
