# MCP Integration Guide

This document explains how War Goat uses MCP (Model Context Protocol) to fetch YouTube data. This is a key learning component of this project.

---

## What is MCP?

**MCP (Model Context Protocol)** is an open protocol developed by Anthropic that standardizes how AI applications connect to external data sources and tools. Think of it as a "USB port for AI" - a standard way to plug in capabilities.

### Why MCP Matters

Before MCP, every AI app had to build custom integrations for each data source. MCP provides:

1. **Standardization** - One protocol for all tools
2. **Security** - Tools run in isolated processes
3. **Flexibility** - Mix Docker, Python, or any runtime
4. **Reusability** - Same MCP server works with Claude, other AI apps, or custom apps like this one

### How MCP Works

```
┌─────────────────┐     JSON-RPC      ┌─────────────────┐
│   Your App      │ ◄──────────────► │   MCP Server    │
│   (MCP Client)  │   over stdio     │   (Tool Host)   │
└─────────────────┘                   └─────────────────┘
                                              │
                                              ▼
                                      ┌─────────────────┐
                                      │  External APIs  │
                                      │  (YouTube, etc) │
                                      └─────────────────┘
```

Key concepts:
- **MCP Server**: A process that exposes "tools" (functions) via JSON-RPC
- **MCP Client**: Your app that calls those tools
- **Transport**: Communication channel (usually stdin/stdout)
- **Tools**: Functions the server exposes (like `get_transcript`)

---

## Our MCP Configuration

War Goat uses two MCP servers, configured in `.mcp.json`:

```json
{
  "mcpServers": {
    "youtube-transcript": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "mcp/youtube-transcript"]
    },
    "youtube-search": {
      "command": "python",
      "args": ["main.py"],
      "cwd": "mcp-servers/youtube-content-management-mcp"
    }
  }
}
```

### Server 1: YouTube Transcript (Docker)

**Purpose**: Fetch video transcripts/captions

**Why Docker?**
- Pre-packaged with all dependencies
- Runs in isolation (can't affect your system)
- Works the same on any machine

**How it's spawned**:
```bash
docker run -i --rm mcp/youtube-transcript
```

- `-i`: Interactive mode (keeps stdin open for JSON-RPC)
- `--rm`: Remove container after exit
- `mcp/youtube-transcript`: Pre-built Docker image

### Server 2: YouTube Search (Python)

**Purpose**: Search videos, get metrics, fetch transcripts

**Location**: `mcp-servers/youtube-content-management-mcp/`

**Requires**: `YOUTUBE_API_KEY` environment variable

---

## How We Call MCP from Express

The backend (`server/index.js`) spawns MCP servers on-demand. Here's the flow:

### Step 1: Spawn Docker Process

```javascript
const { spawn } = require('child_process');

function getYouTubeTranscript(url) {
  return new Promise((resolve, reject) => {
    // Spawn the MCP Docker container
    const mcp = spawn('docker', [
      'run', '-i', '--rm',
      'mcp/youtube-transcript'
    ]);

    // ... handle communication
  });
}
```

### Step 2: Send JSON-RPC Request

MCP uses JSON-RPC 2.0 protocol. We send a request via stdin:

```javascript
const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'get_transcript',
    arguments: {
      url: 'https://youtube.com/watch?v=VIDEO_ID'
    }
  }
};

// Send to MCP server's stdin
mcp.stdin.write(JSON.stringify(request) + '\n');
mcp.stdin.end();
```

### Step 3: Parse JSON-RPC Response

```javascript
let output = '';

mcp.stdout.on('data', (data) => {
  output += data.toString();
});

mcp.on('close', (code) => {
  // Parse lines looking for JSON response
  const lines = output.split('\n');

  for (const line of lines) {
    if (line.startsWith('{')) {
      try {
        const response = JSON.parse(line);

        // Extract transcript from response
        if (response.result?.content?.[0]?.text) {
          resolve(response.result.content[0].text);
        }
      } catch (e) {
        // Not valid JSON, skip
      }
    }
  }
});
```

### Step 4: Handle Errors

```javascript
mcp.on('close', (code) => {
  if (code !== 0) {
    reject(new Error(`MCP server exited with code ${code}`));
  }
});

mcp.stderr.on('data', (data) => {
  console.error('MCP stderr:', data.toString());
});
```

---

## Complete Example: Enrichment Flow

When a user adds a YouTube URL, here's the complete MCP interaction:

```
1. User enters: https://youtube.com/watch?v=J5B9UGTuNoM
                            │
                            ▼
2. Frontend calls: POST /api/enrich { url }
                            │
                            ▼
3. Backend extracts video ID: J5B9UGTuNoM
                            │
                            ▼
4. Backend fetches metadata via oEmbed (no MCP needed)
   GET https://www.youtube.com/oembed?url=...&format=json
   Returns: { title, author_name, thumbnail_url }
                            │
                            ▼
5. Backend spawns MCP Docker:
   docker run -i --rm mcp/youtube-transcript
                            │
                            ▼
6. Backend sends JSON-RPC request:
   {
     "jsonrpc": "2.0",
     "id": 1,
     "method": "tools/call",
     "params": {
       "name": "get_transcript",
       "arguments": { "url": "https://youtube.com/watch?v=J5B9UGTuNoM" }
     }
   }
                            │
                            ▼
7. MCP server fetches transcript from YouTube
   (uses youtube-transcript-api internally)
                            │
                            ▼
8. MCP returns JSON-RPC response:
   {
     "jsonrpc": "2.0",
     "id": 1,
     "result": {
       "content": [{
         "type": "text",
         "text": "Full transcript text here..."
       }]
     }
   }
                            │
                            ▼
9. Backend parses response, returns to frontend:
   {
     "success": true,
     "type": "youtube",
     "data": {
       "title": "Video Title",
       "author": "Channel Name",
       "thumbnail": "https://i.ytimg.com/...",
       "transcript": "Full transcript text..."
     }
   }
```

---

## The Python MCP Server

The `youtube-content-management-mcp` server is built with FastMCP, a Python framework for building MCP servers.

### Directory Structure

```
mcp-servers/youtube-content-management-mcp/
├── main.py                    # Entry point
├── server.py                  # FastMCP server instance
├── utils/
│   ├── tool_utils.py         # YouTube API client setup
│   └── models.py             # Pydantic input validation
└── tools/
    ├── fetch_transcripts.py   # get_transcript tool
    ├── search_videos.py       # search_videos tool
    ├── search_channels.py     # search_channels tool
    ├── search_playlists.py    # search_playlists tool
    ├── get_video_metrics.py   # get_video_metrics tool
    ├── get_channel_metrics.py # get_channel_metrics tool
    └── get_playlist_metrics.py # get_playlist_metrics tool
```

### How Tools Are Defined

```python
# server.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("youtube-search")

# tools/fetch_transcripts.py
from youtube_transcript_api import YouTubeTranscriptApi
from server import mcp

@mcp.tool()
def fetch_transcripts(video_id: str, language_code: str = "en"):
    """Fetch transcript for a YouTube video."""

    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(
            video_id,
            languages=[language_code]
        )

        # Combine all transcript segments
        full_text = " ".join([t["text"] for t in transcript_list])

        return f"Transcript for {video_id}:\n\n{full_text}"

    except Exception as e:
        return f"Error fetching transcript: {str(e)}"
```

### Input Validation with Pydantic

```python
# utils/models.py
from pydantic import BaseModel, Field

class SearchVideosInput(BaseModel):
    query: str = Field(..., description="Search query")
    max_results: int = Field(25, ge=1, le=50)
    order: str = Field("relevance", pattern="^(relevance|date|rating|viewCount)$")
    duration: str = Field("medium", pattern="^(medium|long)$")
    published_after: str | None = Field(None, description="RFC 3339 timestamp")
```

---

## Available MCP Tools

### YouTube Transcript MCP (Docker)

| Tool | Input | Output |
|------|-------|--------|
| `get_transcript` | `{ url: string }` | Transcript text |

### YouTube Search MCP (Python)

| Tool | Input | Output |
|------|-------|--------|
| `search_videos` | query, max_results, order, duration, published_after | Video list with metrics |
| `search_channels` | query, max_results, published_after | Channel list with metrics |
| `search_playlists` | query, max_results, published_after | Playlist list |
| `get_video_metrics` | video_id | Views, likes, comments |
| `get_channel_metrics` | channel_id | Subscribers, views, video count |
| `get_playlist_metrics` | playlist_id | Item count, total views |
| `fetch_transcripts` | video_id or video_url, language_code | Transcript text |

---

## Why Two MCP Servers?

You might wonder why we have two servers that both fetch transcripts:

1. **Docker Server** (`youtube-transcript`)
   - No API key required
   - Uses `youtube-transcript-api` (scrapes YouTube)
   - Simpler, just transcripts
   - Used by our Express backend

2. **Python Server** (`youtube-search`)
   - Requires YouTube API key
   - Full YouTube Data API v3 access
   - Search, metrics, and transcripts
   - Used by Claude Code directly (via MCP)

This demonstrates the flexibility of MCP - you can mix different implementations based on your needs.

---

## Key Takeaways

1. **MCP is a protocol, not a library** - Any language can implement it
2. **JSON-RPC is the communication format** - Simple request/response pattern
3. **stdin/stdout is the transport** - Process-based isolation
4. **Tools are just functions** - Exposed via the MCP protocol
5. **Docker makes deployment easy** - Pre-built MCP servers work anywhere
6. **FastMCP simplifies Python servers** - Decorator-based tool definition

---

## Learn More

- [MCP Specification](https://modelcontextprotocol.io/)
- [FastMCP Documentation](https://github.com/jlowin/fastmcp)
- [YouTube Transcript API](https://github.com/jdepoix/youtube-transcript-api)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
