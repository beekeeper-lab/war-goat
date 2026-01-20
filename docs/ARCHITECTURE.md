# War Goat Architecture Overview

> "Always Remember What's Next!"

War Goat is a full-stack web application for managing learning interests (YouTube videos, books, articles, podcasts, etc.) with AI-powered enrichment via MCP (Model Context Protocol) servers.

## What This Project Demonstrates

This project is a **learning exercise** that showcases:

1. **Full-stack React + Express integration** - Modern TypeScript frontend with Node.js backend
2. **MCP (Model Context Protocol)** - Connecting AI tools to real-world data sources
3. **Automatic content enrichment** - Fetching metadata and transcripts from YouTube
4. **Smart categorization** - Auto-categorizing content based on keywords
5. **Lazy-loaded data** - Efficient transcript storage and retrieval

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              React Frontend (Vite + TypeScript)          │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐   │    │
│  │  │ Header  │ │FilterBar│ │CardList │ │ AddModal     │   │    │
│  │  └─────────┘ └─────────┘ └─────────┘ │ (Enrichment) │   │    │
│  │                                       └──────────────┘   │    │
│  └─────────────────────────┬───────────────────────────────┘    │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTP (port 3000 → proxied to 3001)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS BACKEND (port 3001)                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  /api/enrich    │  │  /api/interests │  │ /api/transcripts│  │
│  │  (Enrichment)   │  │  (JSON Server)  │  │ (File Storage)  │  │
│  └────────┬────────┘  └─────────────────┘  └─────────────────┘  │
└───────────┼─────────────────────────────────────────────────────┘
            │ Spawns Docker process
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MCP SERVERS                                   │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐   │
│  │  YouTube Transcript MCP │  │  YouTube Search MCP         │   │
│  │  (Docker container)     │  │  (Python + YouTube API)     │   │
│  │  - get_transcript       │  │  - search_videos            │   │
│  │                         │  │  - fetch_transcripts        │   │
│  │                         │  │  - get_video_metrics        │   │
│  └─────────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA STORAGE                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐   │
│  │  db.json                │  │  /data/transcripts/         │   │
│  │  (Interest items)       │  │  (Transcript text files)    │   │
│  └─────────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI component library |
| **TypeScript** | Type safety and better DX |
| **Vite** | Fast build tool and dev server |
| **Tailwind CSS** | Utility-first styling |
| **Lucide React** | Icon library |

### Backend
| Technology | Purpose |
|------------|---------|
| **Express.js** | HTTP server and routing |
| **JSON Server** | Simple REST API from JSON file |
| **Node.js** | JavaScript runtime |
| **@modelcontextprotocol/sdk** | Official MCP client SDK |
| **child_process** | Spawning MCP Docker containers |

### MCP Servers
| Server | Technology | Purpose |
|--------|------------|---------|
| **youtube-transcript** | Docker + Python | Fetch video transcripts |
| **youtube-search** | Python + FastMCP | Search and metrics |

---

## Directory Structure

```
war-goat/
├── docs/                          # Documentation
│   ├── ARCHITECTURE.md           # This file - system overview
│   ├── DEVELOPMENT.md            # Development guide
│   ├── GETTING-STARTED.md        # Setup guide
│   ├── API-REFERENCE.md          # REST API documentation
│   ├── DATA-FLOW.md              # Data flow diagrams
│   ├── MCP-INTEGRATION.md        # MCP protocol details
│   ├── MCP-BEST-PRACTICES.md     # Implementation approaches
│   ├── MULTI-AGENT-WORKFLOW.md   # Multi-agent workflow system
│   ├── github-merge-guards.md    # GitHub branch protection settings
│   ├── merge-session.md          # PR merge session guide
│   ├── architecture/             # Architecture documents
│   │   └── decisions/            # ADRs (Architecture Decision Records)
│   ├── requirements/             # Requirements documents
│   └── templates/                # Document templates
│
├── src/                           # Frontend source code
│   ├── components/                # React UI components
│   │   ├── Header.tsx            # App header with logo
│   │   ├── FilterBar.tsx         # Search and filters
│   │   ├── InterestList.tsx      # Grid of items
│   │   ├── InterestCard.tsx      # Individual item card
│   │   ├── InterestDetail.tsx    # Expanded item view
│   │   └── AddInterestModal.tsx  # Add new item form
│   ├── services/                  # API and business logic
│   │   ├── api.ts                # REST API client
│   │   ├── enrich.ts             # URL enrichment service
│   │   └── categorize.ts         # Auto-categorization logic
│   ├── hooks/                     # Custom React hooks
│   │   └── useInterests.ts       # Interest CRUD operations
│   ├── types/                     # TypeScript definitions
│   │   └── index.ts              # All type definitions
│   ├── App.tsx                    # Main React component
│   └── main.tsx                   # Entry point
│
├── server/                        # Backend source code
│   ├── index.js                   # Express server
│   └── services/                  # Backend services
│       ├── index.js              # Service exports
│       ├── mcp-client.js         # Manual MCP client (educational)
│       ├── mcp-sdk-client.js     # Official SDK client (production)
│       └── youtube.js            # YouTube service layer
│
├── scripts/                       # Utility and workflow scripts
│   ├── agent-runner.sh           # Multi-agent workflow orchestrator
│   ├── start-workflow.sh         # Start a new workflow session
│   ├── workflow.sh               # Workflow utilities
│   ├── workflow-monitor.sh       # Tmux-based workflow monitor
│   ├── workflow-summary.py       # Generate workflow status summary
│   ├── capture-evidence.py       # Capture test evidence
│   ├── detect-overlap.py         # Detect file conflicts between workflows
│   ├── batch_import.py           # Python batch import tool
│   └── workflow/                  # Workflow-specific scripts
│       └── merge_all_prs.py      # Safe PR merge script
│
├── .claude/                       # Claude Code configuration
│   ├── commands/                  # Custom slash commands
│   │   ├── README.md             # Command documentation
│   │   ├── feature.md            # Feature planning (TDD)
│   │   ├── bug.md                # Bug planning (TDD)
│   │   ├── chore.md              # Chore planning (TDD)
│   │   ├── implement.md          # Execute a plan
│   │   ├── commit.md             # Commit workflow
│   │   ├── review.md             # Code review
│   │   ├── test.md               # Run tests
│   │   ├── test-gen.md           # Generate tests
│   │   ├── start-workflow.md     # Start multi-agent workflow
│   │   ├── merge-prs.md          # Merge workflow PRs
│   │   ├── workflow-*.md         # Workflow stage commands
│   │   └── ...                   # Other commands
│   └── settings.json             # Claude Code settings
│
├── .github/                       # GitHub configuration
│   ├── CODEOWNERS                # Code ownership rules
│   └── pull_request_template.md  # PR template
│
├── mcp-servers/                   # MCP server implementations
│   └── youtube-content-management-mcp/
│       ├── main.py               # Entry point
│       ├── server.py             # FastMCP server
│       └── tools/                # MCP tool implementations
│
├── workflow/                      # Workflow artifacts (gitignored)
│   ├── {WORK_ITEM_ID}/           # Per-work-item artifacts
│   │   ├── 1-requirements.md
│   │   ├── 2-architecture.md
│   │   ├── 3-implementation.md
│   │   ├── 4-qa-report.md
│   │   └── 5-integration-gate.md
│   └── _reports/                  # Merge session reports
│
├── specs/                         # Plan files from /feature, /bug, /chore
│
├── data/                          # Runtime data
│   └── transcripts/              # Stored transcript files
│
├── public/                        # Static assets
│   └── war-goat-logo.png         # App logo
│
├── db.json                        # JSON Server database
├── .mcp.json                      # MCP server configuration
├── vite.config.ts                 # Vite configuration
├── tailwind.config.js             # Tailwind configuration
└── package.json                   # Dependencies and scripts
```

---

## Key Concepts

### 1. Interest Items
An "interest" is anything you want to learn from:
- YouTube videos
- Books / Audiobooks
- Articles
- Podcasts
- GitHub repositories

Each item tracks:
- URL and metadata (title, author, thumbnail)
- Status: `backlog` → `in-progress` → `completed`
- Tags and auto-generated categories
- Notes you add
- Transcript (for YouTube videos)

### 2. Enrichment
When you add a YouTube URL, the app automatically:
1. Fetches video metadata (title, author, thumbnail) via YouTube oEmbed
2. Fetches the transcript via MCP server
3. Auto-categorizes based on keywords in the content

### 3. MCP Integration
MCP (Model Context Protocol) is Anthropic's standard for connecting AI to external tools. This app uses MCP servers to fetch YouTube data without needing API keys in the frontend.

See [MCP-INTEGRATION.md](./MCP-INTEGRATION.md) for details.

### 4. Data Storage Strategy
- **db.json**: Stores interest metadata (fast to query)
- **/data/transcripts/**: Stores full transcripts separately (lazy-loaded)

This separation keeps the main database fast while allowing large transcripts.

---

## Data Flow Summary

```
User adds YouTube URL
        ↓
Frontend detects URL type → "youtube"
        ↓
Calls POST /api/enrich
        ↓
Backend fetches oEmbed metadata
        ↓
Backend spawns Docker MCP → gets transcript
        ↓
Returns enriched data to frontend
        ↓
User submits form
        ↓
Frontend auto-categorizes content
        ↓
Creates item in db.json
        ↓
Saves transcript to /data/transcripts/{id}.txt
        ↓
Item appears in list with "hasTranscript" flag
        ↓
User clicks to expand → transcript loaded on-demand
```

See [DATA-FLOW.md](./DATA-FLOW.md) for the complete flow diagrams.

---

## Running the Application

```bash
# Install dependencies
npm install

# Start both frontend and backend
npm run dev:full

# Access the app
open http://localhost:3000
```

See [GETTING-STARTED.md](./GETTING-STARTED.md) for detailed setup instructions.

---

## Related Documentation

### Core Documentation
- [GETTING-STARTED.md](./GETTING-STARTED.md) - Setup and running guide
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflows and practices
- [API-REFERENCE.md](./API-REFERENCE.md) - All API endpoints
- [DATA-FLOW.md](./DATA-FLOW.md) - Complete data flow diagrams

### MCP Integration
- [MCP-INTEGRATION.md](./MCP-INTEGRATION.md) - How MCP servers work
- [MCP-BEST-PRACTICES.md](./MCP-BEST-PRACTICES.md) - Implementation approaches & Python vs JS

### Multi-Agent Workflow System
- [MULTI-AGENT-WORKFLOW.md](./MULTI-AGENT-WORKFLOW.md) - Complete workflow documentation
- [github-merge-guards.md](./github-merge-guards.md) - Branch protection settings
- [merge-session.md](./merge-session.md) - Safe PR merging guide

### Architecture Decisions
- [ADR Index](./architecture/decisions/README.md) - Architecture Decision Records

## Claude Code Commands

The project includes custom slash commands for Claude Code. Key commands:

### Development
- `/feature <description>` - Plan a new feature (TDD approach)
- `/bug <description>` - Plan a bug fix
- `/implement specs/<plan>.md` - Execute a plan
- `/commit` - Test, commit, push, create PR

### Content Management
- `/add-video <url>` - Add a YouTube video with AI-enhanced summary and tagging
- `/import-channel <name>` - Batch import videos from a YouTube channel

### Multi-Agent Workflow
- `/start-workflow <ID> <type> "<title>"` - Start parallel workflow session
- `/merge-prs` - Safely merge completed workflow PRs

See [Claude Commands README](../.claude/commands/README.md) for complete documentation.
