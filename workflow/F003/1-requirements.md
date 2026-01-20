---
id: F003
stage: requirements
title: "GitHub Repository Enrichment"
started_at: 2026-01-20T13:01:52Z
completed_at: 2026-01-20T13:25:00Z
status: complete
handoff_ready: true
checkpoints:
  - name: requirements_identified
    status: pass
    message: "8 functional requirements defined"
  - name: impact_analyzed
    status: pass
    message: "7 components analyzed with impact levels"
  - name: acceptance_criteria_defined
    status: pass
    message: "14 measurable acceptance criteria defined"
  - name: no_open_blockers
    status: pass
    message: "All questions resolved with reasonable defaults"
retry_count: 0
last_failure: null
---

# Requirements: GitHub Repository Enrichment

## Work Item
- **ID**: F003
- **Type**: Feature
- **Source**: [.beans/Hackshop_Agentic_Dev_Tools-0c8b--f003-github-repository-enrichment](../../.beans/Hackshop_Agentic_Dev_Tools-0c8b--f003-github-repository-enrichment-auto-enrich-gith.md)

## Executive Summary

This feature enables War Goat to automatically enrich GitHub repository URLs with comprehensive metadata including repository description, star count, primary language, topics, license, README content, and recent activity. When users paste a GitHub repository URL, the system fetches and displays this information, similar to the existing YouTube enrichment flow, allowing users to track repositories as learning resources.

## Detailed Requirements

### Functional Requirements

- **FR-1**: Auto-Detect GitHub URLs - The system detects when a pasted URL matches GitHub repository patterns (e.g., `github.com/owner/repo`) and triggers enrichment automatically.

- **FR-2**: Fetch Repository Metadata - The enrichment service fetches core metadata via the GitHub REST API including:
  - Repository name and full name (owner/repo)
  - Description
  - Star count (stargazers_count)
  - Fork count
  - Primary programming language
  - Topics/tags
  - License information
  - Open issues count
  - Last updated date
  - Default branch

- **FR-3**: Fetch README Content - The system fetches the repository's README file content (preferring README.md) and stores it as the GitHub equivalent of a "transcript" for later viewing and AI-based analysis.

- **FR-4**: Display Repository Preview - During the add flow, show a preview card with:
  - Repository avatar/owner avatar
  - Repository name and description
  - Star count with icon
  - Primary language with color indicator
  - Topics as tags

- **FR-5**: Store GitHub-Specific Data - Extend the Interest item data model to persist GitHub-specific fields:
  - `stars`: Star count at time of capture
  - `forks`: Fork count
  - `language`: Primary programming language
  - `topics`: Array of repository topics
  - `license`: License name
  - `lastCommitDate`: Date of last commit/update
  - `hasReadme`: Boolean flag for README availability
  - `ownerAvatar`: GitHub user/org avatar URL

- **FR-6**: Display GitHub Items Distinctly - Interest cards for GitHub repositories display:
  - GitHub icon in appropriate styling
  - Star count badge
  - Language indicator
  - Topics as category tags

- **FR-7**: View README in Detail View - The InterestDetail component shows the README content (rendered as markdown) in a collapsible section, similar to transcripts for YouTube videos.

- **FR-8**: Explore Repository Contents - Provide a link/button to browse key repository files and directories (future: via GitHub API tree endpoint).

### Non-Functional Requirements

- **NFR-1**: Performance - Repository metadata enrichment completes within 3 seconds. README fetch (separate call) completes within 5 seconds. Failed README fetch does not block metadata display.

- **NFR-2**: Rate Limiting - The system respects GitHub API rate limits (60 requests/hour unauthenticated, 5000/hour authenticated). Display appropriate messaging when rate limited.

- **NFR-3**: Reliability - Enrichment gracefully handles private repositories (returns partial data), non-existent repositories (clear error), and network failures (retry option).

- **NFR-4**: Security - No sensitive tokens stored in frontend code. GitHub API calls route through backend. User's personal access tokens (if used) stored securely.

### Constraints

- **CON-1**: Unauthenticated API Limit - Without authentication, GitHub API is limited to 60 requests/hour. MVP uses unauthenticated calls; authenticated calls are optional enhancement.

- **CON-2**: Private Repository Access - Private repositories require authentication. MVP supports public repositories only; private repo support requires user-provided token.

- **CON-3**: README Size Limit - README files larger than 1MB may be truncated or unavailable via the API. System handles this gracefully.

- **CON-4**: No GitHub MCP Server - Unlike YouTube, there is no existing MCP server for GitHub. Enrichment uses direct HTTP calls to GitHub REST API.

## System Impact Analysis

### Components Affected

| Component | Impact Level | Description |
|-----------|--------------|-------------|
| `server/index.js` | High | Add GitHub enrichment endpoint and README fetching logic |
| `server/services/` | High | New `github.js` service for GitHub API interactions |
| `src/services/enrich.ts` | Medium | Add GitHub URL detection function `isGitHubUrl()` |
| `src/types/index.ts` | Medium | Extend InterestItem with GitHub-specific fields |
| `AddInterestModal.tsx` | Medium | Add GitHub preview card similar to YouTube thumbnail |
| `InterestCard.tsx` | Low | Ensure GitHub items render with stars/language |
| `InterestDetail.tsx` | Medium | Add README display section (similar to transcript) |

### Data Changes

- **Database schema changes**: Yes - Add optional fields to InterestItem:
  - `stars: number`
  - `forks: number`
  - `language: string`
  - `topics: string[]`
  - `license: string`
  - `lastCommitDate: string`
  - `hasReadme: boolean`
  - `ownerAvatar: string`
  - `openIssues: number`
  - `defaultBranch: string`

- **API changes**: Yes - Extend `POST /api/enrich` to handle GitHub URLs:
  - Returns `type: "github"` for GitHub URLs
  - Returns GitHub-specific metadata in `data` object
  - Optionally fetches README content

- **Configuration changes**: Optional - Add `GITHUB_TOKEN` environment variable for authenticated requests (higher rate limits)

### Dependencies

- **Internal**:
  - Existing enrichment flow (`/api/enrich` endpoint)
  - Interest CRUD operations
  - URL pattern detection in `types/index.ts`
  - Transcript storage pattern (reused for README)

- **External**:
  - [GitHub REST API - Repositories](https://docs.github.com/en/rest/repos/repos) - Core metadata
  - [GitHub REST API - Contents](https://docs.github.com/en/rest/repos/contents) - README fetch
  - No MCP dependency for this feature

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| GitHub API rate limiting | High | Medium | Cache enrichment results; show rate limit status; support authenticated requests |
| Private repository handling | Medium | Low | Clear error message; document public-only limitation |
| Large README files | Low | Low | Truncate with "read more" link to GitHub |
| GitHub API changes | Low | High | Version pin API endpoints; monitor for deprecations |
| Network timeouts | Medium | Low | Timeout after 10s; allow retry; show partial data |

## User Stories

### Primary User Story

As a **learner tracking programming resources**,
I want to **add GitHub repositories to my learning list with auto-enriched metadata**
So that **I can track interesting open-source projects and review their READMEs alongside my other learning content**.

### Additional User Stories

1. As a user, I want to see the star count and language when I add a repository so that I can quickly assess its popularity and relevance.

2. As a user, I want to read the README within War Goat so that I don't need to context-switch to GitHub for basic information.

3. As a user, I want repository topics to become categories so that my GitHub items are auto-organized alongside other content.

4. As a user, I want to see when a repository was last updated so that I can prioritize active projects.

5. As a user, I want to track multiple repositories from the same organization so that I can group related learning resources.

## Acceptance Criteria

- [ ] **AC-1**: Verify that pasting `https://github.com/anthropics/claude-code` in the URL field auto-detects type as "github" and triggers enrichment.

- [ ] **AC-2**: Verify that enrichment returns title (repo name), description, stars, forks, and primary language within 3 seconds.

- [ ] **AC-3**: Verify that the AddInterestModal shows a preview card with repository name, description, star count badge (e.g., "★ 1.2k"), and language indicator during enrichment.

- [ ] **AC-4**: Verify that the enriched Interest item has `type: "github"`, `stars`, `language`, and `topics` fields populated in db.json after creation.

- [ ] **AC-5**: Verify that repository topics are automatically mapped to the `categories` array on the Interest item.

- [ ] **AC-6**: Verify that GitHub Interest cards display the GitHub icon, star count, and primary language in the card UI.

- [ ] **AC-7**: Verify that the InterestDetail view shows README content in a collapsible "README" section when expanded (similar to transcript section).

- [ ] **AC-8**: Verify that README content is stored in `/data/transcripts/{id}.txt` (reusing existing transcript storage) and loaded on-demand.

- [ ] **AC-9**: Verify that enrichment handles a non-existent repository (`github.com/nonexistent/repo123`) by returning `success: false` with clear error message.

- [ ] **AC-10**: Verify that enrichment handles a private repository by returning partial success with available public data and noting "Private repository - limited data".

- [ ] **AC-11**: Verify that when GitHub API returns 403 (rate limited), the UI shows "GitHub API rate limit reached. Try again in X minutes."

- [ ] **AC-12**: Verify that repositories without a README still enrich successfully with `hasReadme: false` and no README section in detail view.

- [ ] **AC-13**: Verify that the `ownerAvatar` URL is fetched and used as the thumbnail for the Interest card.

- [ ] **AC-14**: Verify that clicking a GitHub Interest card's external link icon opens the repository URL in a new tab.

## Out of Scope

- **GitHub authentication flow** - No OAuth integration; only optional personal access token support
- **Repository watching/notifications** - No webhook integration for updates
- **Issues/PR tracking** - Only repository-level metadata, not issue/PR details
- **Code search within repositories** - No in-app code browsing
- **Fork/star actions from War Goat** - Read-only integration
- **Organization-level browsing** - Only individual repository support
- **Commit history analysis** - Only last commit date, no full history
- **Contributor analysis** - No contributor list or statistics

## Open Questions

All questions resolved with reasonable defaults for MVP:

- Q1: Authentication method? **Resolved**: Unauthenticated by default (60 req/hr); optional `GITHUB_TOKEN` env var for higher limits. [Blocker: no]
- Q2: README rendering? **Resolved**: Store raw markdown; render with existing markdown renderer in frontend. [Blocker: no]
- Q3: Cache duration? **Resolved**: No cache for MVP; each enrichment is fresh call. Future: Add 1-hour cache. [Blocker: no]
- Q4: Topics to categories mapping? **Resolved**: Direct 1:1 mapping; GitHub topics become War Goat categories. [Blocker: no]
- Q5: Handle monorepo sub-paths? **Resolved**: MVP only supports root repo URLs (`github.com/owner/repo`), not sub-paths. [Blocker: no]

## Documentation Impact

- [ ] Update `docs/API-REFERENCE.md` with GitHub enrichment response format
- [ ] Update `docs/DATA-FLOW.md` with GitHub enrichment flow diagram
- [ ] Add GitHub section to `docs/ARCHITECTURE.md` under supported source types
- [ ] Update README.md features list to include GitHub enrichment

## Handoff to Architecture Agent

### Key Decisions Needed

1. **Service Layer Structure**: Should GitHub enrichment be a separate service (`github.js`) or integrated into the existing enrichment endpoint?

2. **README Storage**: Reuse `/data/transcripts/` for README storage or create `/data/readmes/` for cleaner separation?

3. **API Response Format**: Match YouTube enrichment response structure exactly or create GitHub-specific format?

4. **Error Handling Pattern**: How to handle partial enrichment (metadata succeeds, README fails)?

5. **Rate Limit Strategy**: Cache results, queue requests, or simple fail-fast with retry?

### Suggested Approach

1. Create `server/services/github.js` service layer mirroring the YouTube service pattern:
   - `extractRepoInfo(url)` - Parse owner/repo from URL
   - `isGitHubUrl(url)` - URL validation
   - `getMetadata(owner, repo)` - Fetch via `/repos/{owner}/{repo}`
   - `getReadme(owner, repo)` - Fetch via `/repos/{owner}/{repo}/readme`
   - `enrichGitHubUrl(url)` - Combined enrichment function

2. Add GitHub URL handling in `POST /api/enrich`:
   ```javascript
   if (isGitHubUrl(url)) {
     return await enrichGitHubUrl(url);
   }
   ```

3. Reuse transcript storage for README:
   - Same `/api/transcripts/:id` endpoints
   - Same lazy-loading pattern in InterestDetail
   - Just different label: "README" instead of "Transcript"

4. Extend `EnrichResult` to include GitHub-specific fields:
   ```typescript
   interface GitHubEnrichData {
     stars: number;
     forks: number;
     language: string;
     topics: string[];
     license: string;
     ownerAvatar: string;
     lastCommitDate: string;
     hasReadme: boolean;
   }
   ```

5. Update AddInterestModal to show GitHub-specific preview when `type === 'github'`:
   - Owner avatar as thumbnail
   - Star badge
   - Language indicator with color
   - Topics as pills

---
*Generated by Requirements Agent*
*Timestamp: 2026-01-20T13:25:00Z*
