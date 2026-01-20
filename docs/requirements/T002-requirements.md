# T002: Component Tests for React UI

## Overview

Add comprehensive component tests for all React UI components using React Testing Library. This task establishes frontend test coverage to complement the existing backend unit tests.

## Scope

### Components to Test

The following 6 primary components are explicitly in scope:

1. **InterestCard** (`src/components/InterestCard.tsx`)
   - Displays individual interest items with type icon, thumbnail, status, tags
   - Handles status cycling, delete confirmation, external link opening
   - Integrates ExportToObsidianButton and Find Related buttons

2. **InterestDetail** (`src/components/InterestDetail.tsx`)
   - Modal for viewing/editing interest details
   - Status/tags/notes editing with save functionality
   - Expandable transcript section with lazy loading
   - Expandable article content with AI summary generation

3. **InterestList** (`src/components/InterestList.tsx`)
   - Grid container for InterestCard components
   - Loading, error, and empty states
   - Passes callbacks to child cards

4. **AddInterestModal** (`src/components/AddInterestModal.tsx`)
   - Form for adding new interests via URL
   - Auto-enrichment for YouTube and article URLs
   - Type detection, thumbnail preview, transcript preview

5. **FilterBar** (`src/components/FilterBar.tsx`)
   - Search input with icon
   - Type filter dropdown (YouTube, Book, Article, etc.)
   - Status filter dropdown (Backlog, In Progress, Completed)
   - Category filter dropdown (dynamic based on data)

6. **Header** (`src/components/Header.tsx`)
   - App branding with logo
   - ObsidianStatus indicator
   - Search button (with Cmd+K hint)
   - Sync button (when Obsidian connected)
   - Add Item button

### Additional Components (Secondary Priority)

These components should also be tested but are secondary to the 6 primary components:

- **ExportToObsidianButton** - Button with loading/success/error states
- **ObsidianExportModal** - Modal with export options and duplicate handling
- **SearchModal** - Web search with type/freshness filters
- **SearchResultCard** - Search result display with add action
- **ObsidianStatus** - Connection status indicator
- **SyncProgress** - Bulk sync progress display

## Acceptance Criteria

1. All 6 primary components have corresponding `.test.tsx` files
2. Test coverage > 80% for all primary components
3. Tests use React Testing Library best practices
4. Accessible queries preferred (`getByRole`, `getByLabelText`, `getByText`)
5. Tests cover:
   - Component rendering
   - User interactions (clicks, inputs)
   - State changes
   - Callback invocations
   - Loading/error/empty states

## Technical Context

### Current Test Setup

- **Test Framework**: Vitest 2.1.4 (already installed)
- **Test Command**: `npm run test` / `npx vitest`
- **Existing Tests**: 47 backend tests passing (server/__tests__)
- **No frontend tests exist currently**

### Required Dependencies

The following dependencies will need to be added:

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.x",
    "@testing-library/jest-dom": "^6.x",
    "@testing-library/user-event": "^14.x",
    "jsdom": "^24.x"
  }
}
```

Note: `jsdom` is already a production dependency (^27.4.0) but may need to be in devDependencies for testing.

### Test Configuration Needed

A `vitest.config.ts` or update to `vite.config.ts` will be needed:

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
```

A setup file (`src/test/setup.ts`) will be needed:

```typescript
import '@testing-library/jest-dom'
```

### Component Dependencies to Mock

Components have the following external dependencies that will need mocking:

| Component | Dependencies to Mock |
|-----------|---------------------|
| InterestCard | None (presentational) |
| InterestDetail | `fetchTranscript`, `fetchArticleContent`, `generateArticleSummary` |
| InterestList | None (presentational) |
| AddInterestModal | `enrichUrl`, `isYouTubeUrl`, `isArticleUrl` |
| FilterBar | None (presentational) |
| Header | None (presentational) |

### Type Definitions

Tests should use the existing types from `src/types/index.ts`:
- `InterestItem`
- `ItemStatus`
- `SourceType`
- `EnrichedCreateInput`
- `UpdateInterestInput`

## Out of Scope

- E2E tests (covered by T003)
- Backend unit tests (covered by T001)
- API service tests
- Hook tests (useObsidianSettings, etc.)
- Performance testing
- Visual regression testing

## Related Work Items

- **T001**: Unit Tests for Backend Services (prerequisite pattern established)
- **T003**: E2E UI Tests (follows this work)

## References

- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro)
- [Vitest with React](https://vitest.dev/guide/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
