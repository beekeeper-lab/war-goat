# Development Guide

This guide covers development workflows, tooling, and practices for the War Goat project.

---

## Quick Reference

| Task | Command |
|------|---------|
| Start dev servers | `npm run dev:full` |
| Run tests | `npm run test` |
| Run linter | `npm run lint` |
| Build for production | `npm run build` |
| Start workflow | `/start-workflow <ID> <type> "<title>"` |

---

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

---

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

---

## Claude Commands

The project includes custom Claude Code commands for common tasks. Run `/tools` to see built-in tools, or use these project-specific commands:

### Planning & Execution
- `/feature <description>` - Plan a new feature (TDD approach)
- `/bug <description>` - Plan a bug fix
- `/chore <description>` - Plan maintenance work
- `/implement specs/<plan>.md` - Execute a plan

### Quality
- `/test` - Run all tests
- `/review` - Comprehensive code review
- `/commit` - Test, commit, push, create PR

### Multi-Agent Workflow
- `/start-workflow` - Start parallel workflow session
- `/merge-prs` - Safely merge completed workflow PRs

See [Claude Commands README](../.claude/commands/README.md) for complete documentation.

---

## Multi-Agent Workflow System

For complex features, use the multi-agent workflow system which runs 5 specialized agents in sequence:

1. **Requirements Agent** - Gathers and documents requirements
2. **Architecture Agent** - Designs technical solution
3. **Implementor Agent** - Writes the code (TDD)
4. **QA Agent** - Tests and validates
5. **Integration Gate** - Final validation before PR

```bash
# Start a workflow
/start-workflow F001 feature "Add user authentication"

# Monitor running workflows
./scripts/workflow-monitor.sh

# Merge completed PRs
/merge-prs
```

See [Multi-Agent Workflow Documentation](MULTI-AGENT-WORKFLOW.md) for complete details.

---

## Git Workflow

### Branch Naming
- `feature/F001-description` - Features
- `bugfix/B001-description` - Bug fixes
- `chore/C001-description` - Maintenance

### Commit Messages
Follow conventional commits:
```
feat: add user authentication
fix: resolve login timeout issue
chore: update dependencies
docs: improve API documentation
```

### Branch Protection
Main branch is protected. See [GitHub Merge Guards](github-merge-guards.md) for settings.

---

## Testing

### Running Tests
```bash
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

### Test Conventions
- Tests live next to source files: `Component.test.tsx`
- Use React Testing Library for components
- Use Vitest for test runner

---

## Project Preferences

When working on this codebase:

- **Detailed explanations** - This is a learning project
- **Clean code with good comments**
- **Both manual and SDK approaches** shown where relevant
- **Python for MCP servers**, JavaScript for web app
- **Follow existing patterns** - Look at YouTube enrichment as reference
- **TDD approach** - Write tests first when possible

---

## Related Documentation

- [Architecture Overview](ARCHITECTURE.md)
- [Getting Started](GETTING-STARTED.md)
- [API Reference](API-REFERENCE.md)
- [MCP Integration](MCP-INTEGRATION.md)
- [Multi-Agent Workflow](MULTI-AGENT-WORKFLOW.md)
- [GitHub Merge Guards](github-merge-guards.md)
