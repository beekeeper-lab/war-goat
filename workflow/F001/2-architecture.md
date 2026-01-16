---
id: F001
stage: architecture
title: "Obsidian Integration"
started_at: 2026-01-16T15:50:00Z
completed_at: 2026-01-16T16:30:00Z
status: complete
handoff_ready: true
checkpoints:
  - name: requirements_addressed
    status: pass
    message: "All 7 FRs and 12 ACs mapped to design elements"
  - name: design_complete
    status: pass
    message: "Data models, APIs, components, and services fully specified"
  - name: tasks_defined
    status: pass
    message: "12 implementation tasks with verification steps"
  - name: tests_planned
    status: pass
    message: "Unit and E2E tests specified for all acceptance criteria"
retry_count: 0
last_failure: null
previous_stage: 1-requirements.md
---

# Architecture & Implementation Spec: Obsidian Integration

## Work Item
- **ID**: F001
- **Requirements Doc**: workflow/F001/1-requirements.md
- **Type**: Feature

## Requirements Summary

Enable War Goat users to export interests to Obsidian with:
- Single item export with metadata and optional AI study notes (FR-1, FR-2)
- Duplicate detection and update capability (FR-3)
- Bulk sync with progress tracking (FR-4)
- Status synchronization (FR-5)
- Connection health monitoring (FR-6)
- Configurable settings (FR-7)

## Requirements Traceability

| Requirement | Addressed By | Section |
|-------------|--------------|---------|
| FR-1 Export Single | `ObsidianService.exportInterest()` | Service Layer |
| FR-2 AI Study Notes | `ObsidianService.generateStudyNotes()` | Service Layer |
| FR-3 Duplicate Detection | `ObsidianService.findExistingNote()` | Service Layer |
| FR-4 Bulk Sync | `POST /api/sync-obsidian` + progress SSE | API Changes |
| FR-5 Status Sync | Status change hook in `updateInterest()` | API Changes |
| FR-6 Connection Check | `GET /api/obsidian/status` | API Changes |
| FR-7 Settings | `ObsidianSettings` interface + localStorage | Data Model |
| AC-1 Export creates note | E2E test + `exportInterest()` | Test Plan |
| AC-2 Frontmatter fields | `buildNoteContent()` template | Service Layer |
| AC-3 Study notes sections | `generateStudyNotes()` | Service Layer |
| AC-4 Duplicate warning | `ObsidianExportModal` logic | Component Design |
| AC-5 Bulk sync progress | SSE endpoint + `SyncProgress` component | Component Design |
| AC-6 Status sync timing | Immediate update on PATCH | API Changes |
| AC-7 Connection indicator | `ObsidianStatus` component | Component Design |
| AC-8 Graceful failure | try/catch + error UI | Service Layer |
| AC-9 Transcript in details | Note template `<details>` section | Service Layer |
| AC-10 Settings persistence | localStorage + `useObsidianSettings` hook | Data Model |
| AC-11 Filename sanitization | `sanitizeFilename()` utility | Service Layer |
| AC-12 Disabled button | Conditional render based on status | Component Design |

## Architectural Analysis

### Current State

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  InterestCard.tsx  InterestDetail.tsx  Header.tsx           │
│         │                  │                                 │
│         └──────────┬───────┘                                │
│                    ▼                                         │
│            src/services/api.ts                              │
└─────────────────────────────────────────────────────────────┘
                         │ HTTP
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express Server                            │
│  /api/interests  /api/enrich  /api/transcripts              │
│         │                                                    │
│         └──► server/services/youtube.js                     │
│                      │                                       │
│                      └──► mcpRegistry (MCP Client)          │
└─────────────────────────────────────────────────────────────┘
                         │ JSON-RPC
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Servers                               │
│  youtube-transcript (Docker)  youtube-search (Python)       │
└─────────────────────────────────────────────────────────────┘
```

### Proposed Changes

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  InterestCard.tsx (+export btn)  InterestDetail.tsx (+export)│
│  NEW: ObsidianExportModal  ObsidianStatus  SyncProgress     │
│         │                                                    │
│         └──► src/services/api.ts (+obsidian functions)      │
│         └──► src/hooks/useObsidianSettings.ts (NEW)         │
└─────────────────────────────────────────────────────────────┘
                         │ HTTP
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express Server                            │
│  /api/interests/:id/export-obsidian (NEW)                   │
│  /api/sync-obsidian (NEW)                                   │
│  /api/obsidian/status (NEW)                                 │
│         │                                                    │
│         └──► server/services/obsidian.js (NEW)              │
│                      │                                       │
│                      └──► mcpRegistry + Obsidian MCP        │
└─────────────────────────────────────────────────────────────┘
                         │ JSON-RPC / HTTP
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Servers                               │
│  youtube-transcript  youtube-search  obsidian-mcp (NEW reg) │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Decision Records (ADRs)

#### ADR-F001-1: Obsidian MCP Integration via HTTP Proxy

- **Context**: The Obsidian MCP server is available via Docker (MCP_DOCKER). The Express server needs to communicate with it.
- **Decision**: Register Obsidian MCP in `mcpRegistry` and use the existing `MCPClient` pattern, falling back to direct Obsidian REST API if MCP unavailable.
- **Alternatives Considered**:
  - Direct REST API only (simpler but loses MCP consistency)
  - WebSocket proxy through frontend (complex, security concerns)
- **Consequences**: Consistent with existing YouTube MCP pattern; requires Obsidian MCP server running.

#### ADR-F001-2: AI Study Notes via Claude API

- **Context**: FR-2 requires AI-generated study notes from transcripts.
- **Decision**: Use Anthropic Claude API directly from the server for study notes generation. The prompt extracts summary, key concepts, quotes, and related topics.
- **Alternatives Considered**:
  - Local LLM (complex setup, inconsistent quality)
  - OpenAI API (works but less integrated with Anthropic ecosystem)
- **Consequences**: Requires ANTHROPIC_API_KEY env var; adds external API dependency; high-quality output.

#### ADR-F001-3: Settings in localStorage Only

- **Context**: FR-7 requires configurable export settings.
- **Decision**: Store `ObsidianSettings` in localStorage only (not db.json). Settings are UI preferences, not critical data.
- **Alternatives Considered**:
  - db.json (requires API calls for settings)
  - Both localStorage and db.json (sync complexity)
- **Consequences**: Simpler implementation; settings don't sync across browsers (acceptable for MVP).

#### ADR-F001-4: Immediate Status Sync

- **Context**: FR-5 requires status synchronization with Obsidian.
- **Decision**: Update Obsidian note immediately when status changes in War Goat (on PATCH /api/interests/:id if item has `obsidianPath`).
- **Alternatives Considered**:
  - Batched updates every N minutes (delays user feedback)
  - Manual sync button (extra user effort)
- **Consequences**: Real-time sync; slight latency on status updates (acceptable).

## Technical Design

### Data Model Changes

```typescript
// src/types/index.ts - ADD to InterestItem
export interface InterestItem {
  // ... existing fields ...

  // NEW: Obsidian integration
  obsidianPath?: string;  // Path in vault, e.g., "War Goat/My Video.md"
  obsidianSyncedAt?: string;  // ISO timestamp of last sync
}

// src/types/index.ts - NEW interface
export interface ObsidianSettings {
  enabled: boolean;
  defaultFolder: string;  // Default: "War Goat"
  includeTranscript: boolean;  // Default: true
  generateStudyNotes: boolean;  // Default: false
  autoSyncOnCreate: boolean;  // Default: false
}

// src/types/index.ts - NEW interface
export interface ObsidianExportOptions {
  folder?: string;
  generateStudyNotes?: boolean;
  includeTranscript?: boolean;
  forceOverwrite?: boolean;
}

// src/types/index.ts - NEW interface
export interface ObsidianSyncResult {
  created: number;
  skipped: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

// src/types/index.ts - NEW interface
export interface ObsidianStatus {
  connected: boolean;
  vaultName?: string;
  error?: string;
}
```

### API Changes

```
POST /api/interests/:id/export-obsidian
  Request: {
    folder?: string,           // Override default folder
    generateStudyNotes?: boolean,
    includeTranscript?: boolean,
    forceOverwrite?: boolean   // If true, overwrite existing note
  }
  Response: {
    success: boolean,
    notePath?: string,         // e.g., "War Goat/My Video.md"
    existed?: boolean,         // True if note already existed
    error?: string
  }

POST /api/sync-obsidian
  Request: {
    folder?: string,
    forceOverwrite?: boolean,
    generateStudyNotes?: boolean
  }
  Response: (SSE stream for progress, final JSON result)
  Event: progress { current: number, total: number, item: string }
  Event: complete { created: number, skipped: number, failed: number }

GET /api/obsidian/status
  Response: {
    connected: boolean,
    vaultName?: string,
    error?: string
  }

PATCH /api/interests/:id (MODIFIED)
  Behavior: If item has obsidianPath and status changed,
            also update Obsidian note frontmatter
```

### Component Design

```
ComponentTree:
├── App.tsx
│   ├── Header.tsx
│   │   └── ObsidianStatus (NEW) - Connection indicator
│   │   └── SyncAllButton (NEW) - Bulk sync trigger
│   ├── InterestList.tsx
│   │   └── InterestCard.tsx
│   │       └── ExportToObsidianButton (NEW) - Quick export icon
│   └── InterestDetail.tsx
│       └── ObsidianExportSection (NEW) - Full export options
│           └── ObsidianExportModal (NEW) - Options dialog
├── SyncProgress (NEW) - Progress overlay for bulk sync
```

**New Components:**

1. **ObsidianStatus** (`src/components/ObsidianStatus.tsx`)
   - Props: none (uses hook internally)
   - Shows green dot + "Connected" or red dot + "Disconnected"
   - Polls `/api/obsidian/status` every 30 seconds

2. **ExportToObsidianButton** (`src/components/ExportToObsidianButton.tsx`)
   - Props: `{ item: InterestItem, onExport: () => void, disabled?: boolean }`
   - Icon button with Obsidian logo
   - Disabled state with tooltip when not connected

3. **ObsidianExportModal** (`src/components/ObsidianExportModal.tsx`)
   - Props: `{ item: InterestItem, isOpen: boolean, onClose: () => void, onExport: (options) => Promise<void> }`
   - Shows export options (folder, study notes toggle, transcript toggle)
   - Handles duplicate detection warning
   - Shows loading state during export

4. **SyncProgress** (`src/components/SyncProgress.tsx`)
   - Props: `{ isOpen: boolean, current: number, total: number, currentItem: string, onClose: () => void }`
   - Full-screen overlay with progress bar
   - Shows current item being processed
   - Final summary when complete

### Service Layer

```javascript
// server/services/obsidian.js

/**
 * Obsidian Service
 *
 * High-level service for Obsidian vault operations via MCP.
 */

import { mcpRegistry } from './mcp-client.js';

// MCP tool name mappings
const TOOLS = {
  GET_FILE: 'obsidian_get_file_contents',
  APPEND: 'obsidian_append_content',
  SEARCH: 'obsidian_simple_search',
  LIST_DIR: 'obsidian_list_files_in_dir',
  PATCH: 'obsidian_patch_content',
};

/**
 * Check if Obsidian MCP is available
 * @returns {Promise<ObsidianStatus>}
 */
export async function checkConnection() { /* ... */ }

/**
 * Find existing note by war_goat_id in frontmatter
 * @param {string} warGoatId - The interest ID
 * @param {string} folder - Folder to search in
 * @returns {Promise<string|null>} - Note path or null
 */
export async function findExistingNote(warGoatId, folder) { /* ... */ }

/**
 * Sanitize title for use as filename
 * @param {string} title - Original title
 * @returns {string} - Safe filename (no extension)
 */
export function sanitizeFilename(title) {
  return title
    .replace(/[<>:"/\\|?*]/g, '') // Remove illegal chars
    .replace(/\s+/g, ' ')          // Normalize whitespace
    .trim()
    .substring(0, 100);            // Limit length
}

/**
 * Build note content from interest data
 * @param {InterestItem} item - The interest
 * @param {Object} options - Export options
 * @param {string} [studyNotes] - AI-generated study notes
 * @returns {string} - Markdown content with frontmatter
 */
export function buildNoteContent(item, options, studyNotes = null) { /* ... */ }

/**
 * Generate AI study notes from transcript
 * @param {string} transcript - Full transcript text
 * @param {string} title - Video/content title
 * @returns {Promise<Object>} - { summary, keyConcepts, quotes, relatedTopics }
 */
export async function generateStudyNotes(transcript, title) { /* ... */ }

/**
 * Export single interest to Obsidian
 * @param {InterestItem} item - The interest to export
 * @param {ObsidianExportOptions} options - Export options
 * @returns {Promise<ExportResult>}
 */
export async function exportInterest(item, options) { /* ... */ }

/**
 * Update note frontmatter (for status sync)
 * @param {string} notePath - Path to note in vault
 * @param {Object} updates - Frontmatter fields to update
 * @returns {Promise<boolean>}
 */
export async function updateNoteFrontmatter(notePath, updates) { /* ... */ }

/**
 * Sync all interests to Obsidian
 * @param {InterestItem[]} items - All interests
 * @param {Object} options - Sync options
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<ObsidianSyncResult>}
 */
export async function syncAll(items, options, onProgress) { /* ... */ }
```

## File Changes

### Files to Create

| File | Purpose |
|------|---------|
| `server/services/obsidian.js` | Obsidian MCP service layer |
| `src/components/ObsidianStatus.tsx` | Connection status indicator |
| `src/components/ExportToObsidianButton.tsx` | Quick export button |
| `src/components/ObsidianExportModal.tsx` | Export options dialog |
| `src/components/SyncProgress.tsx` | Bulk sync progress overlay |
| `src/hooks/useObsidianSettings.ts` | Settings hook with localStorage |
| `src/hooks/useObsidianStatus.ts` | Connection status hook |
| `server/__tests__/obsidian.test.js` | Unit tests for obsidian service |
| `e2e/obsidian-export.spec.ts` | E2E tests for export flow |

### Files to Modify

| File | Changes |
|------|---------|
| `server/index.js` | Add 3 new API endpoints, modify PATCH handler |
| `server/services/index.js` | Export obsidian service |
| `server/services/mcp-client.js` | Register obsidian MCP server |
| `src/types/index.ts` | Add ObsidianSettings, ExportOptions interfaces |
| `src/services/api.ts` | Add exportToObsidian, syncObsidian, getObsidianStatus functions |
| `src/components/InterestCard.tsx` | Add ExportToObsidianButton |
| `src/components/InterestDetail.tsx` | Add Obsidian export section |
| `src/components/Header.tsx` | Add ObsidianStatus indicator and SyncAll button |
| `src/App.tsx` | Add SyncProgress overlay and state management |

### Test Files (TDD)

| File | Type | Tests to Write |
|------|------|----------------|
| `server/__tests__/obsidian.test.js` | Unit | sanitizeFilename, buildNoteContent, findExistingNote |
| `server/__tests__/obsidian-api.test.js` | Integration | POST export, POST sync, GET status |
| `src/__tests__/useObsidianSettings.test.ts` | Unit | localStorage read/write, defaults |
| `e2e/obsidian-export.spec.ts` | E2E | AC-1 through AC-12 scenarios |

## Implementation Plan (TDD)

### Phase 1: Write Failing Tests (RED)

#### Unit Tests
- [ ] `server/__tests__/obsidian.test.js`
  - Test: `sanitizeFilename` removes special chars
  - Test: `sanitizeFilename` handles unicode
  - Test: `buildNoteContent` includes all frontmatter fields
  - Test: `buildNoteContent` adds transcript in details section
  - Test: `findExistingNote` returns path when found
  - Test: `findExistingNote` returns null when not found

#### E2E Tests
- [ ] `e2e/obsidian-export.spec.ts`
  - Test: Export button visible on InterestCard
  - Test: Clicking export opens modal
  - Test: Export creates note with correct content
  - Test: Duplicate detection shows warning
  - Test: Bulk sync shows progress

### Phase 2: Implement Backend (GREEN)

1. Register Obsidian MCP in `mcp-client.js`
2. Create `server/services/obsidian.js` with all functions
3. Add API endpoints to `server/index.js`
4. Modify PATCH handler for status sync
5. Run unit tests - verify they pass

### Phase 3: Implement Frontend (GREEN)

1. Add types to `src/types/index.ts`
2. Add API functions to `src/services/api.ts`
3. Create hooks: `useObsidianSettings`, `useObsidianStatus`
4. Create components: ObsidianStatus, ExportToObsidianButton, ObsidianExportModal, SyncProgress
5. Integrate into InterestCard, InterestDetail, Header, App
6. Run component tests - verify they pass

### Phase 4: Integration (GREEN)

1. End-to-end testing with real Obsidian MCP
2. Test error scenarios (MCP unavailable)
3. Run E2E tests - verify they pass

### Phase 5: Refactor

1. Extract shared UI patterns if needed
2. Optimize re-renders with useMemo/useCallback
3. Add loading states and animations

## Step-by-Step Tasks for Implementor

IMPORTANT: Execute in order. Each step should be completable independently.

### Task 1: Add Type Definitions
**Files**: `src/types/index.ts`
**Description**: Add ObsidianSettings, ObsidianExportOptions, ObsidianSyncResult, ObsidianStatus interfaces. Add obsidianPath and obsidianSyncedAt to InterestItem.
**Test First**: N/A (type definitions)
**Verification**: TypeScript compiles without errors

### Task 2: Register Obsidian MCP Server
**Files**: `server/services/mcp-client.js`
**Description**: Add Obsidian MCP server registration to mcpRegistry. Use the MCP_DOCKER pattern.
**Test First**: N/A (configuration)
**Verification**: `mcpRegistry.getClient('obsidian')` returns a client

### Task 3: Create Obsidian Service - Core Functions
**Files**: `server/services/obsidian.js`, `server/__tests__/obsidian.test.js`
**Description**: Implement `sanitizeFilename()`, `buildNoteContent()`, `checkConnection()`. Write unit tests first.
**Test First**:
```javascript
test('sanitizeFilename removes special chars', () => {
  expect(sanitizeFilename('My Video: Part 1 (2024)')).toBe('My Video Part 1 2024');
});
```
**Verification**: `npm test server/__tests__/obsidian.test.js` passes

### Task 4: Create Obsidian Service - MCP Functions
**Files**: `server/services/obsidian.js`
**Description**: Implement `findExistingNote()`, `exportInterest()`, `updateNoteFrontmatter()`. These use MCP tools.
**Test First**: Integration test mocking MCP client
**Verification**: Manual test with real MCP: export creates note in vault

### Task 5: Create Obsidian Service - AI Study Notes
**Files**: `server/services/obsidian.js`
**Description**: Implement `generateStudyNotes()` using Claude API. Prompt extracts summary, concepts, quotes, related topics.
**Test First**: Mock Anthropic API response
**Verification**: Given transcript text, returns structured study notes object

### Task 6: Add API Endpoints
**Files**: `server/index.js`, `server/services/index.js`
**Description**: Add POST /api/interests/:id/export-obsidian, POST /api/sync-obsidian (with SSE), GET /api/obsidian/status. Export obsidian service from index.
**Test First**: Integration tests with supertest
**Verification**: `curl localhost:3001/api/obsidian/status` returns connection status

### Task 7: Modify PATCH for Status Sync
**Files**: `server/index.js`
**Description**: In PATCH /api/interests/:id handler, if item has obsidianPath and status changed, call updateNoteFrontmatter().
**Test First**: Integration test: PATCH with status change updates Obsidian
**Verification**: Change status in API, verify Obsidian note frontmatter updated

### Task 8: Create Frontend Hooks
**Files**: `src/hooks/useObsidianSettings.ts`, `src/hooks/useObsidianStatus.ts`
**Description**: useObsidianSettings reads/writes localStorage. useObsidianStatus polls /api/obsidian/status.
**Test First**: Unit tests for hook behavior
**Verification**: Settings persist across page reload; status updates every 30s

### Task 9: Create Frontend API Functions
**Files**: `src/services/api.ts`
**Description**: Add exportToObsidian(), syncObsidian(), getObsidianStatus() functions.
**Test First**: Mock fetch, verify request shape
**Verification**: Functions callable, return expected types

### Task 10: Create UI Components
**Files**: `src/components/ObsidianStatus.tsx`, `src/components/ExportToObsidianButton.tsx`, `src/components/ObsidianExportModal.tsx`, `src/components/SyncProgress.tsx`
**Description**: Create all four new components following existing patterns (InterestDetail modal style).
**Test First**: Component render tests
**Verification**: Components render without errors; match design specs

### Task 11: Integrate Components
**Files**: `src/components/InterestCard.tsx`, `src/components/InterestDetail.tsx`, `src/components/Header.tsx`, `src/App.tsx`
**Description**: Add ExportToObsidianButton to InterestCard. Add export section to InterestDetail. Add ObsidianStatus and SyncAll to Header. Add SyncProgress overlay to App.
**Test First**: E2E tests for user flows
**Verification**: Export button appears on cards; clicking triggers modal

### Task 12: Final Verification
**Run all tests**:
```bash
npm run test
npm run build
# Manual E2E with real Obsidian MCP
```
**Verification**: All tests pass, build succeeds, manual testing confirms AC-1 through AC-12

## Acceptance Criteria Mapping

| AC | How Implemented | How Tested |
|----|-----------------|------------|
| AC-1 | `exportInterest()` → MCP append | E2E: click export, verify note created |
| AC-2 | `buildNoteContent()` frontmatter template | Unit: verify output contains all fields |
| AC-3 | `generateStudyNotes()` + template | Unit: verify sections; E2E: enable toggle, verify output |
| AC-4 | `findExistingNote()` + modal warning state | E2E: export twice, verify warning shows |
| AC-5 | SSE endpoint + SyncProgress component | E2E: sync 3 items, verify progress updates |
| AC-6 | PATCH handler calls `updateNoteFrontmatter()` | Integration: change status, verify note updated |
| AC-7 | `ObsidianStatus` component + polling | E2E: verify indicator color matches connection |
| AC-8 | try/catch in service + error toast | E2E: disconnect MCP, verify error message |
| AC-9 | `buildNoteContent()` details section | Unit: verify transcript in `<details>` tag |
| AC-10 | `useObsidianSettings` localStorage | Unit: set value, reload, verify persisted |
| AC-11 | `sanitizeFilename()` function | Unit: test with special chars |
| AC-12 | ExportToObsidianButton disabled prop | E2E: disconnect MCP, verify button disabled |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Obsidian MCP unavailable | checkConnection() before operations; graceful error UI; status indicator |
| Note filename collisions | Use sanitizeFilename(); war_goat_id in frontmatter for dedup |
| Large transcript handling | Truncate to 100KB in note; full transcript in separate file if needed |
| Claude API rate limits | Catch errors; offer retry; study notes is optional feature |
| SSE connection drops | Frontend auto-reconnect; progress state in memory |

## Open Questions Resolved

| Question | Answer |
|----------|--------|
| MCP Integration Pattern | Use MCPClient with obsidian server registration (ADR-F001-1) |
| AI for Study Notes | Claude API with structured prompt (ADR-F001-2) |
| Settings Storage | localStorage only for MVP (ADR-F001-3) |
| Status Sync Timing | Immediate on PATCH (ADR-F001-4) |

## Handoff to Implementor Agent

### Critical Notes

1. **Obsidian MCP Registration**: The Obsidian MCP is available as `MCP_DOCKER`. Register it similar to youtube-transcript but check the exact command/args from the running environment.

2. **Claude API Key**: Study notes require `ANTHROPIC_API_KEY` environment variable. Make this optional - if not set, disable study notes feature.

3. **SSE for Bulk Sync**: Use Server-Sent Events for progress updates. Frontend should use EventSource API.

4. **Error Handling**: Always wrap MCP calls in try/catch. Return structured error objects, not thrown exceptions.

### Recommended Order

1. Types first (Task 1) - foundation for everything
2. Backend service (Tasks 2-5) - core logic
3. API endpoints (Tasks 6-7) - expose to frontend
4. Frontend hooks (Tasks 8-9) - state management
5. UI components (Tasks 10-11) - user interface
6. Final verification (Task 12)

### Watch Out For

- MCP server connection timing - may need retry logic
- localStorage quota limits - settings are small but be aware
- SSE connection handling - browsers have limits on concurrent SSE
- Obsidian note format - frontmatter must be valid YAML
- Filename edge cases - test with emoji, unicode, very long titles

---
*Generated by Architecture Agent*
*Timestamp: 2026-01-16T16:30:00Z*
