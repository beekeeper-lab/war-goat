# War Goat

> "Always Remember What's Next!"

A full-stack learning interest tracker with AI-powered enrichment via MCP (Model Context Protocol) servers. Manage YouTube videos, books, articles, and other learning resources with automatic metadata fetching, transcripts, and smart categorization.

## Features

- **Interest Tracking** - Manage learning resources (YouTube, books, articles, podcasts)
- **AI Enrichment** - Automatic metadata, transcripts, and categorization
- **MCP Integration** - Connect AI tools to real-world data sources
- **Multi-Agent Workflow** - Parallel feature development with 5 specialized agents
- **TDD Planning** - Test-driven development approach for features

## Quick Start

```bash
# Install dependencies
npm install

# Start development servers
npm run dev:full

# Open the app
open http://localhost:3000
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Express.js, JSON Server |
| MCP | youtube-transcript (Docker), youtube-search (Python) |
| Testing | Vitest, React Testing Library |

## Project Structure

```
war-goat/
├── src/                   # React frontend
├── server/                # Express backend
├── mcp-servers/           # MCP server implementations
├── scripts/               # Workflow and utility scripts
├── .claude/commands/      # Claude Code slash commands
├── docs/                  # Documentation
└── workflow/              # Workflow artifacts
```

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/GETTING-STARTED.md) | Setup and running guide |
| [Architecture](docs/ARCHITECTURE.md) | System overview and design |
| [Development](docs/DEVELOPMENT.md) | Development workflows |
| [API Reference](docs/API-REFERENCE.md) | REST API documentation |
| [MCP Integration](docs/MCP-INTEGRATION.md) | MCP server details |
| [Multi-Agent Workflow](docs/MULTI-AGENT-WORKFLOW.md) | Parallel development system |

## Claude Code Commands

This project includes custom Claude Code commands:

```bash
# Development
/start              # Start dev servers
/test               # Run tests
/commit             # Test, commit, push, PR

# Planning (TDD)
/feature "..."      # Plan a new feature
/bug "..."          # Plan a bug fix
/implement <spec>   # Execute a plan

# Multi-Agent Workflow
/start-workflow     # Start parallel workflow
/merge-prs          # Merge completed PRs
```

See [Claude Commands README](.claude/commands/README.md) for complete documentation.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start frontend only |
| `npm run dev:api` | Start backend only |
| `npm run dev:full` | Start full stack |
| `npm run build` | Production build |
| `npm run test` | Run tests |
| `npm run lint` | Run linter |

## Issue Tracking

This project uses [Beans](https://github.com/hmans/beans) for issue tracking:

```bash
beans list              # List issues
beans show <id>         # Show details
beans create "Title"    # Create issue
beans prime             # Get AI context
```

## Contributing

1. Check existing issues or create a new one
2. Use `/feature`, `/bug`, or `/chore` to plan your change
3. Implement using TDD approach
4. Run `/commit` to create a PR
5. For complex features, use `/start-workflow`

## License

MIT

---

*Built as a learning project for MCP integration and multi-agent development workflows.*
