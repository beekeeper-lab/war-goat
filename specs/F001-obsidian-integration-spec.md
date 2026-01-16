# F001: Obsidian Integration - Implementation Spec

> **Source**: workflow/F001/2-architecture.md
> **Status**: Ready for Implementation

## Quick Reference

### New Files to Create
1. `server/services/obsidian.js` - MCP service layer
2. `src/components/ObsidianStatus.tsx` - Connection indicator
3. `src/components/ExportToObsidianButton.tsx` - Quick export
4. `src/components/ObsidianExportModal.tsx` - Export dialog
5. `src/components/SyncProgress.tsx` - Bulk sync progress
6. `src/hooks/useObsidianSettings.ts` - Settings persistence
7. `src/hooks/useObsidianStatus.ts` - Status polling

### Files to Modify
1. `server/index.js` - Add 3 API endpoints
2. `server/services/mcp-client.js` - Register obsidian MCP
3. `src/types/index.ts` - Add interfaces
4. `src/services/api.ts` - Add API functions
5. `src/components/InterestCard.tsx` - Add export button
6. `src/components/InterestDetail.tsx` - Add export section
7. `src/components/Header.tsx` - Add status + sync button
8. `src/App.tsx` - Add sync progress overlay

### API Endpoints
- `POST /api/interests/:id/export-obsidian`
- `POST /api/sync-obsidian` (SSE for progress)
- `GET /api/obsidian/status`

### Key Functions
- `sanitizeFilename(title)` - Make safe filename
- `buildNoteContent(item, options, studyNotes)` - Generate markdown
- `exportInterest(item, options)` - Export single item
- `generateStudyNotes(transcript, title)` - AI summary

---

See [full architecture doc](../workflow/F001/2-architecture.md) for complete details.
