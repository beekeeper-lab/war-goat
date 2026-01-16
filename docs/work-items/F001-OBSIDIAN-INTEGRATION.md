# Feature: Obsidian Integration

> **ID**: F001
> **Type**: Feature
> **Status**: Planned
> **Priority**: High
> **Effort**: M
> **Created**: 2026-01-16
> **MCP Required**: Obsidian (MCP_DOCKER) - Already configured!

## Overview

Sync War Goat interests to an Obsidian vault, creating interconnected notes from learning content.

---

## User Stories

### US-1: Export Interest to Obsidian Note

> As a user, I want to export a War Goat interest to my Obsidian vault so that I can take notes and connect it to my knowledge base.

**Acceptance Criteria**:
- [ ] User can click "Export to Obsidian" button on any interest card
- [ ] Creates a new note in a configurable folder (default: `War Goat/`)
- [ ] Note includes: title, URL, author, tags, categories, transcript (if available)
- [ ] Note is formatted with proper Obsidian markdown (frontmatter, links)
- [ ] Success/failure feedback shown to user
- [ ] Duplicate detection: warn if note already exists

### US-2: Auto-Generate Study Notes from Transcript

> As a user, I want AI to generate structured study notes from a video transcript so that I can review key concepts quickly.

**Acceptance Criteria**:
- [ ] "Generate Study Notes" option when exporting to Obsidian
- [ ] AI analyzes transcript and creates:
  - Summary (2-3 paragraphs)
  - Key Concepts (bullet list with brief explanations)
  - Notable Quotes (with timestamps if available)
  - Action Items / Things to Try
  - Related Topics (as `[[wiki links]]` for Obsidian)
- [ ] User can edit before saving
- [ ] Original transcript preserved in collapsible section

### US-3: Sync All Interests to Obsidian

> As a user, I want to bulk sync all my interests to Obsidian so that my entire learning list is in my vault.

**Acceptance Criteria**:
- [ ] "Sync All to Obsidian" button in settings or header
- [ ] Progress indicator during sync
- [ ] Skip already-synced items (based on URL match in frontmatter)
- [ ] Summary report: X created, Y skipped, Z failed
- [ ] Option to force re-sync (overwrite existing)

### US-4: Bi-directional Status Sync

> As a user, I want my interest status to sync with Obsidian note status so that I can update in either place.

**Acceptance Criteria**:
- [ ] Obsidian note frontmatter includes `status: backlog|in-progress|completed`
- [ ] When status changes in War Goat, update Obsidian note
- [ ] Optional: When Obsidian note status changes, update War Goat (requires polling or webhook)
- [ ] Conflict resolution: most recent wins (based on `updatedAt`)

---

## Technical Design

### Obsidian Note Template

```markdown
---
title: "{{title}}"
url: "{{url}}"
type: {{type}}
author: "{{author}}"
status: {{status}}
tags: [{{tags}}]
categories: [{{categories}}]
created: {{createdAt}}
updated: {{updatedAt}}
war_goat_id: {{id}}
---

# {{title}}

**Author**: {{author}}
**Type**: {{type}}
**URL**: [Original Link]({{url}})
**Status**: {{status}}

## Tags
{{#tags}}
- #{{.}}
{{/tags}}

## Categories
{{#categories}}
- [[{{.}}]]
{{/categories}}

## Notes

_Add your notes here..._

## AI Summary

{{aiSummary}}

## Key Concepts

{{#keyConcepts}}
- **{{name}}**: {{description}}
{{/keyConcepts}}

---

## Transcript

<details>
<summary>Full Transcript (click to expand)</summary>

{{transcript}}

</details>
```

### MCP Tools to Use

From the available Obsidian MCP tools:

| Tool | Purpose |
|------|---------|
| `obsidian_get_file_contents` | Check if note exists |
| `obsidian_append_content` | Add to existing note |
| `obsidian_patch_content` | Update specific sections |
| `obsidian_simple_search` | Find existing notes by URL |
| `obsidian_list_files_in_dir` | List War Goat folder contents |
| `obsidian_complex_search` | Query by frontmatter fields |

### API Endpoints to Add

```
POST /api/interests/:id/export-obsidian
  - Export single interest to Obsidian
  - Body: { generateStudyNotes: boolean, folder: string }

POST /api/sync-obsidian
  - Bulk sync all interests
  - Body: { forceOverwrite: boolean, folder: string }

GET /api/obsidian/status
  - Check Obsidian connection status
```

### Frontend Components

1. **ExportToObsidianButton** - Icon button on InterestCard
2. **ObsidianExportModal** - Options dialog (folder, study notes toggle)
3. **ObsidianSyncProgress** - Progress bar for bulk sync
4. **ObsidianSettings** - Configuration panel (default folder, auto-sync)

### Configuration

Add to app settings:
```typescript
interface ObsidianSettings {
  enabled: boolean;
  defaultFolder: string;  // "War Goat/"
  autoSync: boolean;      // Sync on interest create
  includeTranscript: boolean;
  generateStudyNotes: boolean;
}
```

---

## Questions to Resolve

1. **Folder structure**: Flat (`War Goat/note.md`) or nested (`War Goat/YouTube/note.md`)?
2. **Note naming**: Use title or ID? Handle special characters?
3. **Link format**: Full URLs or Obsidian `[[wiki links]]`?
4. **Conflict handling**: What if user edits note in Obsidian AND War Goat?
5. **Vault selection**: Support multiple vaults?

---

## Dependencies

- Obsidian MCP server running (already configured via Docker)
- Obsidian REST API plugin installed in Obsidian
- Network access to Obsidian (localhost or remote)

---

## Testing Scenarios

1. Export single YouTube video with transcript
2. Export item without transcript
3. Export with AI study notes generation
4. Bulk sync 10+ items
5. Re-export existing item (update vs duplicate)
6. Export with special characters in title
7. Obsidian server unavailable (error handling)
8. Large transcript (>100KB) handling

---

## Future Enhancements

- **Daily note integration**: Add learning items to daily note
- **Spaced repetition**: Create Anki-style flashcards from key concepts
- **Graph view tags**: Optimize for Obsidian graph visualization
- **Template customization**: User-defined note templates
- **Backlink creation**: Auto-link to related notes in vault
