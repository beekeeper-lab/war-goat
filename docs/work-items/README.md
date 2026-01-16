# War Goat Work Items

This folder contains all tracked work items for the War Goat project. Work items are organized by type and tracked from inception through completion.

---

## Work Item Types

| Type | Description | Template |
|------|-------------|----------|
| **Feature** | New functionality or capability | [FEATURE.md](./_templates/FEATURE.md) |
| **Bug** | Defect or unexpected behavior | [BUG.md](./_templates/BUG.md) |
| **Test** | Test coverage improvements | [TEST.md](./_templates/TEST.md) |
| **Chore** | Refactoring, deps, docs, cleanup | [CHORE.md](./_templates/CHORE.md) |

---

## Current Work Items

### Features

| ID | Name | Priority | Effort | Status |
|----|------|----------|--------|--------|
| F001 | [Obsidian Integration](./F001-OBSIDIAN-INTEGRATION.md) | High | M | Planned |
| F002 | [Brave Search Integration](./F002-BRAVE-SEARCH-INTEGRATION.md) | Medium | M | Planned |
| F003 | [GitHub Enrichment](./F003-GITHUB-ENRICHMENT.md) | Medium-High | M | Planned |
| F004 | [Article Enrichment](./F004-ARTICLE-ENRICHMENT.md) | High | M-L | Planned |
| F005 | [Memory & Preferences](./F005-MEMORY-PREFERENCES.md) | Medium | M | Planned |

### Bugs

_No bugs tracked yet._

### Tests

| ID | Name | Priority | Effort | Status |
|----|------|----------|--------|--------|
| T001 | [Unit Tests - Backend Services](./T001-UNIT-TESTS.md) | High | M | Planned |
| T002 | [Component Tests - React UI](./T002-COMPONENT-TESTS.md) | High | M | Planned |
| T003 | [E2E UI Tests - Playwright MCP](./T003-UI-TESTS.md) | High | L | Planned |

### Chores

_No chores tracked yet._

---

## Status Definitions

| Status | Description |
|--------|-------------|
| **Draft** | Work item being written, not ready for work |
| **Planned** | Ready for implementation, in backlog |
| **Ready** | Refined, all questions answered, can start |
| **In Progress** | Actively being worked on |
| **Review** | Implementation complete, under review |
| **Complete** | Done and verified |
| **Blocked** | Cannot proceed, waiting on dependency |
| **Cancelled** | Will not be implemented |

---

## Priority Definitions

| Priority | Description |
|----------|-------------|
| **Critical** | Blocking issue, needs immediate attention |
| **High** | Important for next release/milestone |
| **Medium** | Should be done, but not urgent |
| **Low** | Nice to have, do when time permits |

---

## Effort Estimates

| Size | Description | Rough Time |
|------|-------------|------------|
| **S** | Small, straightforward | Few hours |
| **M** | Medium, some complexity | 1-2 days |
| **L** | Large, significant work | 3-5 days |
| **XL** | Extra large, major effort | 1+ weeks |

---

## Creating New Work Items

### 1. Choose the Right Template

```bash
# Copy the appropriate template
cp docs/work-items/_templates/FEATURE.md docs/work-items/F00X-NAME.md
cp docs/work-items/_templates/BUG.md docs/work-items/B00X-NAME.md
cp docs/work-items/_templates/TEST.md docs/work-items/T00X-NAME.md
cp docs/work-items/_templates/CHORE.md docs/work-items/C00X-NAME.md
```

### 2. Naming Convention

```
{TYPE}{NUMBER}-{KEBAB-CASE-NAME}.md

Examples:
- F001-OBSIDIAN-INTEGRATION.md
- B001-TRANSCRIPT-FETCH-TIMEOUT.md
- T001-MCP-CLIENT-UNIT-TESTS.md
- C001-UPGRADE-REACT-19.md
```

### 3. Fill Out the Template

- Complete all required sections
- Mark status as "Draft" until ready
- Add to the table in this README

### 4. Refine Before Starting

- Answer all "Questions to Resolve"
- Verify dependencies are available
- Get any needed clarification
- Update status to "Ready"

---

## Workflow

```
Draft → Planned → Ready → In Progress → Review → Complete
                    ↓
                 Blocked → (unblocked) → In Progress
```

---

## Quick Reference: MCP Servers

| MCP Server | Config Status | API Key Required |
|------------|---------------|------------------|
| youtube-transcript | Configured | No |
| youtube-search | Configured | Yes (YOUTUBE_API_KEY) |
| Obsidian (MCP_DOCKER) | Configured | No |
| **Playwright** | **Configured** | No |
| Brave Search | Not configured | Yes (BRAVE_API_KEY) |
| GitHub | Not configured | Optional (GITHUB_TOKEN) |
| Memory | Not configured | No |
| Fetch/Puppeteer | Not configured | No |
| Browserbase/Stagehand | Not configured | Yes (BROWSERBASE_API_KEY) |

---

## Implementation Order (Recommended)

### Phase 1: Content Enrichment
1. **F004** - Article Enrichment (high value, common use case)
2. **F003** - GitHub Enrichment (completes source types)

### Phase 2: Knowledge Management
3. **F001** - Obsidian Integration (MCP already configured!)
4. **F005** - Memory & Preferences

### Phase 3: Discovery
5. **F002** - Brave Search Integration

---

## Archive

Completed or cancelled work items are moved to `_archive/` with a completion date prefix:

```
_archive/
├── 2026-01-20-F001-OBSIDIAN-INTEGRATION.md
└── 2026-01-15-B001-SOME-BUG.md
```

---

## Notes for Future Sessions

When picking up work items:

1. **Read the full document** - Context is captured there
2. **Check status** - Make sure it's "Ready"
3. **Review dependencies** - Ensure they're satisfied
4. **Check existing services** - `server/services/` may have reusable code
5. **Follow patterns** - Look at YouTube enrichment as reference
6. **Update as you go** - Mark criteria complete, add notes

The user prefers:
- Detailed explanations (this is a learning project)
- Clean code with good comments
- Both manual and SDK approaches shown where relevant
- Python for MCP servers, JavaScript for web app
