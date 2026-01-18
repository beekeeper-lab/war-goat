# F001: Obsidian Integration Requirements

**Status**: Implemented
**Type**: Feature
**Created**: 2026-01-16
**Last Updated**: 2026-01-17

## Executive Summary

This feature enables War Goat users to export their learning interests to Obsidian, creating interconnected notes in their personal knowledge base. Users can export individual items with optional AI-generated study notes, bulk sync all interests, and maintain status synchronization between both systems.

## Functional Requirements

### FR-1: Export Single Interest
Users can export any interest item to Obsidian as a markdown note with frontmatter metadata, including title, URL, author, tags, categories, and transcript (if available).

### FR-2: AI Study Notes Generation
When exporting, users can optionally generate AI-structured study notes that include a summary, key concepts, notable quotes with timestamps, action items, and related wiki-linked topics.

### FR-3: Duplicate Detection
Before creating a note, the system checks if a note with the same `war_goat_id` exists in the target folder and warns the user, offering to update instead.

### FR-4: Bulk Sync
Users can sync all interests to Obsidian at once, with progress indication, skip-already-synced logic, and a summary report of created/skipped/failed items.

### FR-5: Status Synchronization
When an interest's status changes in War Goat, the corresponding Obsidian note's frontmatter `status` field is updated.

### FR-6: Connection Status Check
The system provides a health check endpoint and UI indicator to verify Obsidian MCP connectivity before export operations.

### FR-7: Configurable Export Settings
Users can configure default folder, auto-sync on create, transcript inclusion, and study notes generation preferences.

## Non-Functional Requirements

### NFR-1: Performance
Single export completes within 5 seconds; bulk sync processes at least 10 items per minute with progress feedback.

### NFR-2: Reliability
Export operations are idempotent; re-exporting the same item produces the same note content (excluding timestamps). Failed exports are logged and reported without crashing the application.

### NFR-3: Usability
Export actions are accessible from both the interest card (quick action) and detail view (full options). Visual feedback confirms success or explains failure.

## Constraints

### CON-1: MCP Server Availability
Obsidian MCP server must be running and accessible. The feature gracefully degrades when unavailable.

### CON-2: Filename Sanitization
Note filenames are derived from titles with special characters sanitized (alphanumeric, spaces, hyphens allowed).

### CON-3: Single Vault Support
Single vault support for MVP - the MCP-connected vault is the target.

## System Impact Analysis

### Components Affected

| Component | Impact Level | Description |
|-----------|--------------|-------------|
| `InterestCard.tsx` | Medium | Add "Export to Obsidian" button with icon |
| `InterestDetail.tsx` | Medium | Add export section with full options |
| `server/index.js` | High | Add 3 new API endpoints for Obsidian operations |
| `src/services/api.ts` | Medium | Add client functions for new endpoints |
| `src/types/index.ts` | Low | Add ObsidianSettings interface |
| New: `ObsidianExportModal.tsx` | High | New component for export options dialog |

### Data Changes

- **Database schema changes**: Yes - Add optional `obsidianPath` field to InterestItem to track exported note location
- **API changes**: Yes - Add 3 new endpoints:
  - `POST /api/interests/:id/export-obsidian`
  - `POST /api/sync-obsidian`
  - `GET /api/obsidian/status`
- **Configuration changes**: Yes - Add ObsidianSettings to app configuration (localStorage or db.json)

### Dependencies

**Internal**:
- Existing Interest CRUD operations
- Transcript storage system
- MCP client infrastructure (if exists) or direct MCP tool calls

**External**:
- Obsidian MCP server (MCP_DOCKER) - already configured
- MCP tools: `obsidian_append_content`, `obsidian_get_file_contents`, `obsidian_simple_search`, `obsidian_patch_content`, `obsidian_list_files_in_dir`

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Obsidian MCP unavailable | Medium | High | Health check before operations; graceful error handling; clear user messaging |
| Note filename collisions | Low | Medium | Use `war_goat_id` in frontmatter for deduplication; append ID suffix if title collision |
| Large transcript handling | Medium | Medium | Stream or chunk large transcripts; set reasonable size limits |
| Rate limiting on bulk sync | Low | Medium | Sequential processing with delays; progress feedback |

## User Stories

### Primary User Story
As a **learner using War Goat**,
I want to **export my interests to Obsidian**
So that **I can integrate learning content with my personal knowledge management system and take connected notes**.

### Additional User Stories
1. As a user, I want to generate AI study notes from video transcripts so that I can quickly review key concepts without re-watching.
2. As a user, I want to bulk sync my entire backlog to Obsidian so that all my learning items are in one place.
3. As a user, I want status changes to sync automatically so that my progress is consistent across both tools.
4. As a user, I want to know if Obsidian is connected before I try to export so that I'm not surprised by failures.

## Acceptance Criteria

- [x] **AC-1**: Verify that clicking "Export to Obsidian" on an InterestCard creates a note in the Obsidian vault at `War Goat/{sanitized-title}.md` within 5 seconds.
- [x] **AC-2**: Verify that the created Obsidian note contains YAML frontmatter with fields: title, url, type, author, status, tags, categories, created, updated, war_goat_id.
- [x] **AC-3**: Verify that enabling "Generate Study Notes" produces a note with sections: AI Summary, Key Concepts (minimum 3 items), and Related Topics as `[[wiki links]]`.
- [x] **AC-4**: Verify that exporting an item that already exists in Obsidian (matched by `war_goat_id` search) shows a warning modal with "Update" and "Cancel" options.
- [x] **AC-5**: Verify that "Sync All to Obsidian" displays a progress bar updating after each item, completes within 1 minute for 10 items, and shows a summary: "X created, Y skipped, Z failed".
- [x] **AC-6**: Verify that changing status in War Goat (e.g., backlog -> in-progress) updates the corresponding Obsidian note's frontmatter `status` field within 3 seconds.
- [x] **AC-7**: Verify that the Obsidian connection status indicator shows green/connected when MCP is available and red/disconnected when unavailable.
- [x] **AC-8**: Verify that export fails gracefully with user-friendly error message when Obsidian MCP is unreachable.
- [x] **AC-9**: Verify that items with transcripts have the full transcript in a collapsible `<details>` section in the exported note.
- [x] **AC-10**: Verify that ObsidianSettings (defaultFolder, generateStudyNotes toggle) persists across browser sessions.
- [x] **AC-11**: Verify that note filenames handle special characters: `"My Video: Part 1 (2024)"` becomes `My Video Part 1 2024.md`.
- [x] **AC-12**: Verify that the export button is disabled with tooltip "Obsidian not connected" when MCP is unavailable.

## Out of Scope

- **Bi-directional sync from Obsidian to War Goat** - Status changes in Obsidian notes do not automatically update War Goat (requires polling/webhook complexity)
- **Multiple vault support** - Only the MCP-connected vault is supported
- **Custom note templates** - Users cannot define their own note format
- **Daily note integration** - No automatic addition to Obsidian daily notes
- **Spaced repetition/flashcard generation** - No Anki-style cards from key concepts

## Resolved Questions

| Question | Resolution |
|----------|------------|
| Folder structure? | Flat structure (`War Goat/`) for simplicity |
| Note naming? | Sanitized title with special chars removed |
| Link format? | Wiki links `[[...]]` for categories, URLs for external |
| Conflict handling? | Last write wins with `war_goat_id` matching |
| Vault selection? | Single vault (MCP-connected) for MVP |

## Documentation Requirements

- [x] Update `docs/MCP-INTEGRATION.md` with Obsidian MCP usage patterns
- [x] Add `docs/OBSIDIAN-EXPORT.md` user guide
- [x] Update `README.md` features section

---

## Implementation Reference

- **Workflow Documents**: `workflow/F001/`
- **Architecture**: `workflow/F001/2-architecture.md`
- **Implementation**: `workflow/F001/3-implementation.md`
- **QA Report**: `workflow/F001/4-qa-report.md`

---
*Source of Truth for F001 Requirements*
*Originally Generated: 2026-01-16T15:45:00Z*
*Persistent Version Created: 2026-01-17*
