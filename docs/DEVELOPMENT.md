# Development Guide

## MCP Server Configuration

| MCP Server | Config Status | API Key Required |
|------------|---------------|------------------|
| youtube-transcript | Configured | No |
| youtube-search | Configured | Yes (YOUTUBE_API_KEY) |
| Obsidian (MCP_DOCKER) | Configured | No |
| Playwright | Configured | No |
| Brave Search | Not configured | Yes (BRAVE_API_KEY) |
| GitHub | Not configured | Optional (GITHUB_TOKEN) |
| Memory | Not configured | No |
| Fetch/Puppeteer | Not configured | No |
| Browserbase/Stagehand | Not configured | Yes (BROWSERBASE_API_KEY) |

## Issue Tracking

This project uses [Beans](https://github.com/hmans/beans) for issue tracking.

```bash
# List all issues
beans list

# Show issue details
beans show <id>

# Create new issue
beans create "Title" -t feature -p high -d "Description"

# Update status
beans update <id> -s in-progress

# Get AI agent context
beans prime
```

## Project Preferences

When working on this codebase:

- **Detailed explanations** - This is a learning project
- **Clean code with good comments**
- **Both manual and SDK approaches** shown where relevant
- **Python for MCP servers**, JavaScript for web app
- **Follow existing patterns** - Look at YouTube enrichment as reference
