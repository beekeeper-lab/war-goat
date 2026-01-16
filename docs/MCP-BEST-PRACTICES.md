# MCP Best Practices & Implementation Guide

This document covers the different approaches to implementing MCP clients and when to use each one.

---

## Overview: Three Approaches

War Goat demonstrates three different approaches to calling MCP servers:

| Approach | File | Best For |
|----------|------|----------|
| **Manual** | `server/services/mcp-client.js` | Learning, customization |
| **Official SDK** | `server/services/mcp-sdk-client.js` | Production apps |
| **Claude Skills** | `.claude/commands/*.md` | AI-assisted workflows |

---

## Approach 1: Manual Implementation

**File**: `server/services/mcp-client.js`

### What It Does

Manually spawns MCP server processes and handles JSON-RPC communication.

```javascript
import { spawn } from 'child_process';

const docker = spawn('docker', ['run', '-i', '--rm', 'mcp/youtube-transcript']);

// Send JSON-RPC request
const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: { name: 'get_transcript', arguments: { url } }
};
docker.stdin.write(JSON.stringify(request) + '\n');

// Parse response from stdout
docker.stdout.on('data', (data) => {
  const response = JSON.parse(data);
  // Handle response.result
});
```

### Pros
- **Educational**: See exactly how MCP protocol works
- **No dependencies**: Just Node.js built-ins
- **Full control**: Customize every aspect
- **Debuggable**: Easy to log and trace

### Cons
- **More code**: Handle edge cases yourself
- **Error-prone**: Easy to miss protocol details
- **Maintenance**: Update when MCP spec changes

### When to Use
- Learning how MCP works
- Custom protocol extensions
- Minimal dependency requirements
- Debugging MCP issues

---

## Approach 2: Official MCP SDK

**File**: `server/services/mcp-sdk-client.js`

### What It Does

Uses Anthropic's official `@modelcontextprotocol/sdk` package.

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'docker',
  args: ['run', '-i', '--rm', 'mcp/youtube-transcript']
});

const client = new Client({ name: 'war-goat', version: '1.0.0' });
await client.connect(transport);

const result = await client.callTool({
  name: 'get_transcript',
  arguments: { url }
});
```

### Pros
- **Official support**: Maintained by Anthropic
- **Protocol compliance**: Handles all edge cases
- **Type safety**: TypeScript definitions included
- **Connection management**: Automatic lifecycle handling
- **Future-proof**: Updated with protocol changes

### Cons
- **Dependency**: Adds ~50KB to bundle
- **Less educational**: Hides protocol details
- **Abstraction**: Less control over low-level behavior

### When to Use
- Production applications
- Team projects (consistent patterns)
- When you don't need to understand the protocol
- Long-running MCP connections

---

## Approach 3: Claude Code Skills

**Files**: `.claude/commands/add-video.md`, `.claude/commands/import-channel.md`

### What It Does

Defines workflows that Claude Code executes, using MCP tools directly.

```markdown
# /add-video skill

## Steps

1. Call mcp__youtube-search__fetch_transcripts with the video URL
2. Analyze the transcript to generate summary and tags
3. POST to /api/interests to save
```

### Pros
- **AI-powered**: Claude can interpret and enhance results
- **Flexible**: Natural language instructions
- **Interactive**: Can ask questions, make decisions
- **No code**: Just markdown files

### Cons
- **Requires Claude**: Can't run automatically
- **Non-deterministic**: AI may interpret differently
- **Slower**: Includes AI processing time

### When to Use
- Interactive workflows with AI assistance
- When you want AI to analyze/summarize content
- Complex decision-making processes
- Ad-hoc operations

---

## Python vs JavaScript: When to Use Each

### Use Python For:

| Task | Why Python |
|------|------------|
| **MCP Servers** | FastMCP framework, ML libraries |
| **Data Processing** | pandas, numpy, better data tools |
| **AI/ML Integration** | PyTorch, transformers, scikit-learn |
| **Batch Scripts** | Better CLI tools (argparse, rich) |
| **Complex Parsing** | Better text processing libraries |

**Example**: Our `scripts/batch_import.py` uses Python for:
- Rich CLI output (progress bars, tables)
- Direct youtube-transcript-api access
- Flexible argument parsing

### Use JavaScript/TypeScript For:

| Task | Why JS/TS |
|------|-----------|
| **Web Backend** | Express, Fastify, unified stack |
| **Frontend** | React, Vue, browser environment |
| **Real-time** | WebSockets, event-driven |
| **Type Safety** | TypeScript across full stack |
| **JSON APIs** | Native JSON handling |

**Example**: Our Express backend uses JavaScript for:
- REST API endpoints
- Vite integration
- Single language with frontend

### Hybrid Approach (Recommended)

```
┌─────────────────────────────────────────────────┐
│                   WAR GOAT                       │
├─────────────────────────────────────────────────┤
│                                                  │
│  Frontend (TypeScript/React)                    │
│      ↓                                          │
│  Backend (JavaScript/Express)                   │
│      ↓                                          │
│  MCP Client (JS: manual or SDK)                 │
│      ↓                                          │
│  MCP Servers (Python: FastMCP)                  │
│      ↓                                          │
│  Batch Scripts (Python: CLI tools)              │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Service Layer Architecture

### Current Structure

```
server/
├── index.js                    # Express routes
└── services/
    ├── index.js                # Central exports
    ├── mcp-client.js           # Manual MCP client
    ├── mcp-sdk-client.js       # Official SDK client
    └── youtube.js              # YouTube-specific service
```

### How Services Connect

```
index.js (routes)
    │
    ▼
youtube.js (high-level API)
    │
    ▼
mcp-client.js (protocol handling)
    │
    ▼
Docker/Process (MCP server)
```

### Adding a New MCP Service

1. **Register the server** in `mcp-client.js`:
```javascript
mcpRegistry.register('my-new-service', {
  command: 'python',
  args: ['path/to/server.py'],
});
```

2. **Create a service module** (e.g., `services/my-service.js`):
```javascript
import { mcpRegistry } from './mcp-client.js';

export async function callMyTool(args) {
  const client = mcpRegistry.getClient('my-new-service');
  return client.callTool('tool_name', args);
}
```

3. **Export from index.js**:
```javascript
export { callMyTool } from './my-service.js';
```

4. **Use in routes**:
```javascript
import { callMyTool } from './services/index.js';

app.post('/api/my-endpoint', async (req, res) => {
  const result = await callMyTool(req.body);
  res.json(result);
});
```

---

## Error Handling Patterns

### Manual Client

```javascript
try {
  const result = await client.callTool('get_transcript', { url });
  if (!result?.content?.[0]?.text) {
    throw new Error('No transcript in response');
  }
  return result.content[0].text;
} catch (err) {
  if (err.message.includes('exited with code')) {
    // MCP server crashed
    return { error: 'MCP server unavailable' };
  }
  throw err;
}
```

### SDK Client

```javascript
try {
  const result = await client.callTool({
    name: 'get_transcript',
    arguments: { url }
  });
  return result;
} catch (err) {
  // SDK provides structured errors
  if (err.code === 'TOOL_NOT_FOUND') {
    return { error: 'Tool not available' };
  }
  throw err;
}
```

### Graceful Degradation

```javascript
// Always return something useful, even on failure
async function enrichYouTubeUrl(url) {
  const metadata = await getMetadata(url);  // Always try

  let transcript = null;
  try {
    transcript = await getTranscript(url);  // May fail
  } catch (err) {
    console.warn('Transcript unavailable:', err.message);
  }

  return {
    success: true,  // Partial success is still success
    data: {
      ...metadata,
      transcript,
      transcriptError: transcript ? null : 'Not available'
    }
  };
}
```

---

## Performance Considerations

### Connection Pooling

For high-throughput scenarios, keep MCP connections alive:

```javascript
// Instead of spawning per-request
const client = new MCPClient(config);
await client.connect();

// Reuse for multiple calls
app.post('/api/enrich', async (req, res) => {
  const result = await client.callTool('get_transcript', req.body);
  res.json(result);
});
```

### Batch Operations

Group multiple operations to reduce overhead:

```javascript
// Bad: Spawn Docker for each URL
for (const url of urls) {
  await getTranscript(url);  // Spawns Docker each time
}

// Better: Use batch tool if available
const results = await client.callTool('batch_get_transcripts', {
  urls: urls
});
```

### Caching

Cache MCP results when appropriate:

```javascript
const cache = new Map();

async function getCachedTranscript(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }

  const result = await getTranscript(url);
  cache.set(url, result);
  return result;
}
```

---

## Summary: Which Approach to Use

| Scenario | Recommended Approach |
|----------|---------------------|
| Learning MCP | Manual implementation |
| Production API | Official SDK |
| AI-assisted workflows | Claude Skills |
| Batch processing | Python scripts |
| Quick prototyping | Manual or Skills |
| Team project | Official SDK |

**Our recommendation**: Start with the manual implementation to understand the protocol, then migrate to the SDK for production use. Use Skills when you want Claude's help with analysis or decision-making.
