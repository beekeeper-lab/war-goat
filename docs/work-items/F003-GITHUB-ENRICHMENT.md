# Feature: GitHub Repository Enrichment

> **ID**: F003
> **Type**: Feature
> **Status**: Planned
> **Priority**: Medium-High
> **Effort**: M
> **Created**: 2026-01-16
> **MCP Required**: GitHub MCP (optional, can use REST API directly)

## Overview

Automatically enrich GitHub repository URLs with metadata, README content, and repository insights to help track open-source learning resources.

---

## User Stories

### US-1: Auto-Enrich GitHub URLs

> As a user, I want GitHub repo URLs to be automatically enriched with repo information so that I can see key details without visiting GitHub.

**Acceptance Criteria**:
- [ ] When adding a GitHub URL, automatically fetch:
  - Repository name and description
  - Owner/organization
  - Primary language
  - Star count, fork count, open issues
  - Last commit date
  - License type
  - Topics/tags
- [ ] Display enriched data in the interest card
- [ ] Update stats on demand ("Refresh" button)
- [ ] Handle private repos gracefully (show what's available)

### US-2: README as Learning Content

> As a user, I want to view and save the README content so that I can study the documentation without leaving War Goat.

**Acceptance Criteria**:
- [ ] Fetch and store README.md content
- [ ] Render markdown properly in detail view
- [ ] Extract key sections: Installation, Usage, API, Examples
- [ ] AI-generated summary of what the repo does
- [ ] Store README like transcript (lazy-loaded)
- [ ] Detect README updates and offer to refresh

### US-3: Track Repository Activity

> As a user, I want to see if a repo I'm tracking is actively maintained so that I can prioritize learning current tools.

**Acceptance Criteria**:
- [ ] Show activity indicators:
  - Last commit: "2 days ago", "3 months ago"
  - Commit frequency: "Active", "Moderate", "Stale"
  - Recent releases (if any)
- [ ] Optional: Alert when tracked repo has new release
- [ ] Activity badge on interest card (green/yellow/red)

### US-4: Explore Repository Contents

> As a user, I want to browse the repository structure so that I can find specific files to study.

**Acceptance Criteria**:
- [ ] File tree view in detail panel
- [ ] Click to view file contents (code, docs)
- [ ] Syntax highlighting for code files
- [ ] Identify key files: README, CONTRIBUTING, examples/, docs/
- [ ] Bookmark specific files for later study

### US-5: Related Repositories

> As a user, I want to discover related repositories so that I can find alternative or complementary tools.

**Acceptance Criteria**:
- [ ] "Find Similar" button on GitHub interests
- [ ] Search based on: topics, language, description keywords
- [ ] Show comparison: stars, activity, last update
- [ ] One-click add to War Goat

---

## Technical Design

### GitHub MCP Setup

```json
// .mcp.json addition
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### Alternative: GitHub REST API (No MCP)

If MCP isn't available, use GitHub's REST API directly:

```javascript
// server/services/github.js
const GITHUB_API = 'https://api.github.com';

export async function getRepoInfo(owner, repo) {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${process.env.GITHUB_TOKEN}` // Optional
    }
  });
  return response.json();
}
```

### URL Parsing

```javascript
function parseGitHubUrl(url) {
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/]+)/,           // github.com/owner/repo
    /github\.com\/([^\/]+)\/([^\/]+)\/tree\//,   // with branch
    /github\.com\/([^\/]+)\/([^\/]+)\/blob\//,   // file link
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
    }
  }
  return null;
}
```

### Data Model Extension

```typescript
interface GitHubMetadata {
  owner: string;
  repo: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  openIssues: number;
  license: string | null;
  topics: string[];
  lastCommit: string;        // ISO date
  lastRelease: string | null; // Version string
  activityLevel: 'active' | 'moderate' | 'stale' | 'archived';
  readme: string | null;      // Stored separately like transcript
  hasReadme: boolean;
}

// Extend InterestItem
interface InterestItem {
  // ... existing fields
  github?: GitHubMetadata;
}
```

### API Endpoints to Add

```
POST /api/enrich (extend existing)
  - Detect GitHub URL → call GitHub enrichment

GET /api/interests/:id/readme
  - Fetch/return README content (lazy load)

POST /api/interests/:id/refresh-github
  - Re-fetch GitHub metadata (update stats)

GET /api/github/search?q=<query>&language=<lang>
  - Search GitHub repos

GET /api/github/similar/:id
  - Find similar repos to an interest
```

### Enrichment Flow

```
User adds: github.com/anthropics/claude-code
                    ↓
parseGitHubUrl() → { owner: 'anthropics', repo: 'claude-code' }
                    ↓
Parallel fetch:
  ├─ GET /repos/{owner}/{repo}        → metadata
  ├─ GET /repos/{owner}/{repo}/readme → README content
  └─ GET /repos/{owner}/{repo}/releases/latest → latest release
                    ↓
Calculate activity level:
  - lastCommit < 7 days → 'active'
  - lastCommit < 90 days → 'moderate'
  - lastCommit >= 90 days → 'stale'
  - archived === true → 'archived'
                    ↓
Return enriched data + store README
```

### Frontend Components

1. **GitHubCard** - Enhanced card design for repos
   - Stars/forks/issues badges
   - Language indicator with color
   - Activity status badge

2. **GitHubDetailPanel** - Extended detail view
   - Stats grid
   - README render area
   - File browser
   - Releases list

3. **RepoComparisonView** - Compare multiple repos
4. **GitHubSearchModal** - Search and add repos

### Activity Level Calculation

```javascript
function calculateActivityLevel(repo) {
  if (repo.archived) return 'archived';

  const lastCommit = new Date(repo.pushed_at);
  const daysSinceCommit = (Date.now() - lastCommit) / (1000 * 60 * 60 * 24);

  if (daysSinceCommit < 7) return 'active';
  if (daysSinceCommit < 90) return 'moderate';
  return 'stale';
}
```

---

## Questions to Resolve

1. **Authentication**: Use GitHub token for higher rate limits? How to configure?
2. **Private repos**: Support with user's token? Security implications?
3. **README size**: Some READMEs are huge. Truncate? Lazy sections?
4. **Code viewing**: Syntax highlighting library? Performance concerns?
5. **Webhooks**: Real-time updates via GitHub webhooks? Overkill?
6. **Organizations**: Handle org repos differently?

---

## Dependencies

- GitHub MCP or direct API access
- GitHub personal access token (optional, increases rate limit)
- Markdown renderer (already have for Obsidian?)
- Syntax highlighting library (e.g., highlight.js, Prism)

---

## Rate Limiting

GitHub API limits:
- **Unauthenticated**: 60 requests/hour
- **Authenticated**: 5,000 requests/hour

Strategy:
```javascript
// Cache repo data for 1 hour
const repoCache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

// Only refresh on user request, not automatically
// Show "Last updated: X hours ago" with refresh button
```

---

## Testing Scenarios

1. Add public repo → full enrichment works
2. Add repo with no README → handle gracefully
3. Add archived repo → show archived status
4. Add private repo (no token) → show limited info
5. Add private repo (with token) → full access
6. Refresh stale repo → update all stats
7. Compare two similar repos → side-by-side view
8. Large README (>100KB) → lazy load/truncate
9. Repo with many releases → show latest, link to all

---

## Future Enhancements

- **Dependency analysis**: What packages does repo use?
- **Code search**: Search within tracked repos
- **Issue tracking**: Surface interesting issues/discussions
- **Contribution opportunities**: "Good first issue" finder
- **Fork detection**: Note if repo is a fork, link to original
- **Trending integration**: Surface trending repos in your areas
- **Learning paths**: "To understand X, first learn Y" from dependencies
