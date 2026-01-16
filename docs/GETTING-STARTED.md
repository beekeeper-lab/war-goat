# Getting Started with War Goat

This guide will help you set up and run War Goat locally.

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18 or later) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Docker** (for MCP transcript server) - [Download](https://www.docker.com/)

### Optional (for full MCP features)

- **Python 3.10+** (for YouTube Search MCP server)
- **YouTube API Key** (for search/metrics features)

---

## Quick Start

### 1. Install Dependencies

```bash
cd /path/to/war-goat
npm install
```

### 2. Start the Development Servers

```bash
npm run dev:full
```

This starts:
- **Frontend** (Vite): http://localhost:3000
- **Backend** (Express): http://localhost:3001

### 3. Open the App

Navigate to http://localhost:3000 in your browser.

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `vite` | Start frontend only |
| `npm run dev:api` | `node server/index.js` | Start backend only |
| `npm run dev:full` | Both concurrently | Start full stack |
| `npm run build` | `tsc && vite build` | Production build |
| `npm run lint` | `eslint .` | Run linter |
| `npm run test` | `vitest` | Run tests |

---

## Project Structure

```
war-goat/
├── src/                    # Frontend React app
├── server/                 # Backend Express server
├── mcp-servers/            # MCP server implementations
├── data/transcripts/       # Transcript storage
├── public/                 # Static assets (logo)
├── docs/                   # Documentation
├── db.json                 # Database (JSON Server)
└── .mcp.json               # MCP configuration
```

---

## Using the App

### Adding an Interest

1. Click the **"Add Item"** button in the header
2. Paste a URL (YouTube works best for auto-enrichment)
3. For YouTube URLs:
   - Title, author, and thumbnail auto-fill
   - Transcript is fetched automatically (if available)
   - Categories are auto-assigned based on content
4. Optionally edit the fields or add tags
5. Click **"Add Interest"**

### Managing Interests

- **Change Status**: Click the status badge to cycle: Backlog → In Progress → Completed
- **View Details**: Click an item card to open the detail modal
- **Edit**: In detail view, update notes, tags, or status
- **Delete**: Click the trash icon on a card
- **View Transcript**: In detail view, expand the Transcript section

### Filtering & Searching

Use the filter bar to:
- **Search**: Type to filter by title/description
- **Type Filter**: Show only YouTube, books, etc.
- **Status Filter**: Show backlog, in-progress, or completed
- **Category Filter**: Filter by auto-assigned categories

---

## MCP Server Setup

### YouTube Transcript MCP (Docker)

This server fetches video transcripts. It should work out of the box if Docker is installed.

**Verify Docker is running**:
```bash
docker info
```

**Pull the MCP image** (optional, happens automatically):
```bash
docker pull mcp/youtube-transcript
```

**Test the MCP server**:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  docker run -i --rm mcp/youtube-transcript
```

### YouTube Search MCP (Python) - Optional

This server provides search and metrics. It requires a YouTube API key.

**Setup**:
```bash
cd mcp-servers/youtube-content-management-mcp

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Set API key
export YOUTUBE_API_KEY="your-api-key-here"

# Run server
python main.py
```

**Get a YouTube API Key**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project
3. Enable YouTube Data API v3
4. Create credentials (API Key)
5. Copy the key

---

## Configuration Files

### .mcp.json

Configures MCP servers:

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

### vite.config.ts

Frontend build configuration with API proxy:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
```

### tailwind.config.js

Custom color theme:

```javascript
export default {
  theme: {
    extend: {
      colors: {
        olive: { /* military green palette */ },
        tactical: {
          tan: '#d4b896',
          khaki: '#c3b091',
          sand: '#e6d5b8'
        }
      }
    }
  }
};
```

---

## Data Storage

### db.json

The main database. Example structure:

```json
{
  "interests": [
    {
      "id": "abc123",
      "url": "https://youtube.com/...",
      "title": "Video Title",
      "type": "youtube",
      "status": "backlog",
      "tags": [],
      "categories": ["Programming"],
      "hasTranscript": true,
      "createdAt": "2026-01-16T10:00:00Z"
    }
  ]
}
```

### /data/transcripts/

Transcript files stored separately:

```
data/transcripts/
├── abc123.txt    # Transcript for item abc123
├── def456.txt    # Transcript for item def456
└── ...
```

---

## Troubleshooting

### Port Already in Use

```bash
# Kill processes on ports 3000 and 3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Restart
npm run dev:full
```

### Docker Not Running

```bash
# Start Docker daemon
sudo systemctl start docker  # Linux
# Or start Docker Desktop on Mac/Windows

# Verify
docker info
```

### Transcript Fetch Fails

Check if Docker MCP is working:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_transcript","arguments":{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}}}' | docker run -i --rm mcp/youtube-transcript
```

Common issues:
- Video has no captions/subtitles
- Video is age-restricted or private
- Docker container failed to start

### Database Reset

If you need to start fresh:

```bash
# Backup existing data
cp db.json db.json.backup

# Reset to empty
echo '{"interests":[]}' > db.json

# Clear transcripts
rm -rf data/transcripts/*
```

---

## Development Tips

### Hot Reloading

Both frontend and backend support hot reloading:
- **Frontend**: Vite HMR - instant updates
- **Backend**: Restart server for changes (or use nodemon)

### Adding New Source Types

1. Add type to `src/types/index.ts`:
   ```typescript
   type SourceType = '...' | 'newtype';
   ```

2. Add URL pattern detection in `detectSourceType()`

3. Add icon mapping in `InterestCard.tsx`

4. Optionally add enrichment logic in `server/index.js`

### Adding New Categories

Edit `src/services/categorize.ts`:

```typescript
const CATEGORIES = [
  // ...existing
  {
    name: 'New Category',
    keywords: ['keyword1', 'keyword2', 'keyword3']
  }
];
```

---

## Learning Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [React Documentation](https://react.dev/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [JSON Server](https://github.com/typicode/json-server)

---

## What's Next?

Now that you're up and running:

1. **Add some interests** - Try adding YouTube videos to see enrichment in action
2. **Read the architecture docs** - Understand how the pieces fit together
3. **Explore MCP integration** - See how we connect to external services
4. **Customize** - Add new categories, change colors, extend functionality

Happy learning!
