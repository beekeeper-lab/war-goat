# T002: Component Tests for React UI - Implementation Spec

## Overview

Add comprehensive component tests for 6 primary React UI components using React Testing Library, achieving >80% coverage with accessible query patterns.

## Architecture Decisions

### ADR-1: Test File Co-location
- **Decision**: Place test files in `src/components/__tests__/` directory
- **Rationale**: Co-locates tests with components, follows React Testing Library conventions
- **Consequence**: Easy to find tests for each component, clear relationship

### ADR-2: Use V8 Coverage Provider
- **Decision**: Use Vitest's built-in V8 coverage provider
- **Rationale**: Native to Vitest, no additional dependencies, fast
- **Consequence**: Coverage reports available via `npx vitest --coverage`

### ADR-3: Centralized Test Utilities
- **Decision**: Create `src/test/` directory for shared utilities
- **Rationale**: Avoid duplication of mock factories and render helpers
- **Consequence**: Consistent test patterns across all component tests

### ADR-4: Mock Strategy - Module-Level Mocking
- **Decision**: Mock API modules at module level using `vi.mock()`
- **Rationale**: Consistent with existing backend test patterns, simpler setup
- **Consequence**: All tests in a file share same mock setup, override per-test as needed

## Test Infrastructure

### Files to Create

```
src/
├── test/
│   ├── setup.ts              # Test setup with jest-dom
│   ├── utils.tsx             # Custom render, test helpers
│   └── factories/
│       └── interest.ts       # InterestItem factory functions
└── components/
    └── __tests__/
        ├── InterestCard.test.tsx
        ├── InterestDetail.test.tsx
        ├── InterestList.test.tsx
        ├── AddInterestModal.test.tsx
        ├── FilterBar.test.tsx
        └── Header.test.tsx
```

### Dependencies to Install

```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/coverage-v8
```

### Vitest Configuration

Update `vite.config.ts`:

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/components/**/*.tsx'],
      exclude: ['src/components/__tests__/**'],
    },
  },
})
```

### Test Setup File

Create `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

### Test Utilities

Create `src/test/utils.tsx`:

```typescript
import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Custom render that includes userEvent setup
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return {
    user: userEvent.setup(),
    ...render(ui, options),
  }
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }
export { userEvent }
```

### Factory Functions

Create `src/test/factories/interest.ts`:

```typescript
import type { InterestItem, SourceType, ItemStatus } from '../../types'

let idCounter = 0

export function createInterestItem(
  overrides: Partial<InterestItem> = {}
): InterestItem {
  const id = `test-${++idCounter}`
  const now = new Date().toISOString()

  return {
    id,
    url: `https://example.com/${id}`,
    type: 'article' as SourceType,
    title: `Test Item ${id}`,
    description: 'A test item description',
    status: 'backlog' as ItemStatus,
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createYouTubeItem(
  overrides: Partial<InterestItem> = {}
): InterestItem {
  return createInterestItem({
    type: 'youtube',
    url: 'https://youtube.com/watch?v=abc123',
    thumbnail: 'https://img.youtube.com/vi/abc123/maxresdefault.jpg',
    hasTranscript: true,
    channelName: 'Test Channel',
    ...overrides,
  })
}

export function createArticleItem(
  overrides: Partial<InterestItem> = {}
): InterestItem {
  return createInterestItem({
    type: 'article',
    url: 'https://blog.example.com/article',
    hasArticleContent: true,
    siteName: 'Example Blog',
    readingTime: 5,
    wordCount: 1000,
    excerpt: 'This is the article excerpt...',
    ...overrides,
  })
}

export function createBookItem(
  overrides: Partial<InterestItem> = {}
): InterestItem {
  return createInterestItem({
    type: 'book',
    url: 'https://amazon.com/dp/1234567890',
    author: 'Test Author',
    ...overrides,
  })
}

export function resetIdCounter(): void {
  idCounter = 0
}
```

---

## Component Test Specifications

### 1. FilterBar Tests

**File**: `src/components/__tests__/FilterBar.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../test/utils'
import { FilterBar } from '../FilterBar'

describe('FilterBar', () => {
  const defaultProps = {
    searchQuery: '',
    onSearchChange: vi.fn(),
    typeFilter: 'all' as const,
    onTypeFilterChange: vi.fn(),
    statusFilter: 'all' as const,
    onStatusFilterChange: vi.fn(),
    categoryFilter: 'all' as const,
    onCategoryFilterChange: vi.fn(),
    availableCategories: [],
  }

  describe('rendering', () => {
    it('renders search input with placeholder')
    it('renders type filter dropdown with all options')
    it('renders status filter dropdown with all options')
    it('renders category filter only when categories available')
    it('does not render category filter when no categories')
  })

  describe('search input', () => {
    it('displays current search query value')
    it('calls onSearchChange when typing')
  })

  describe('type filter', () => {
    it('displays current type filter value')
    it('calls onTypeFilterChange when selecting option')
  })

  describe('status filter', () => {
    it('displays current status filter value')
    it('calls onStatusFilterChange when selecting option')
  })

  describe('category filter', () => {
    it('shows all provided categories as options')
    it('calls onCategoryFilterChange when selecting option')
  })
})
```

**Test Cases**: ~15 tests

---

### 2. Header Tests

**File**: `src/components/__tests__/Header.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../test/utils'
import { Header } from '../Header'

// Mock ObsidianStatus to isolate Header tests
vi.mock('../ObsidianStatus', () => ({
  ObsidianStatus: () => <div data-testid="obsidian-status">Obsidian Status</div>,
}))

describe('Header', () => {
  const defaultProps = {
    onAddClick: vi.fn(),
  }

  describe('rendering', () => {
    it('renders app logo')
    it('renders app title "War Goat"')
    it('renders tagline')
    it('renders Add Item button')
  })

  describe('Add Item button', () => {
    it('calls onAddClick when clicked')
  })

  describe('Search button', () => {
    it('renders when onSearchClick provided and searchAvailable true')
    it('does not render when searchAvailable false')
    it('calls onSearchClick when clicked')
  })

  describe('Sync button', () => {
    it('renders when onSyncClick provided and obsidianConnected true')
    it('does not render when obsidianConnected false')
    it('calls onSyncClick when clicked')
    it('shows spinning icon when syncing')
    it('is disabled when syncing')
  })
})
```

**Test Cases**: ~12 tests

---

### 3. InterestList Tests

**File**: `src/components/__tests__/InterestList.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../test/utils'
import { InterestList } from '../InterestList'
import { createInterestItem, resetIdCounter } from '../../test/factories/interest'

describe('InterestList', () => {
  beforeEach(() => {
    resetIdCounter()
  })

  const defaultProps = {
    items: [],
    loading: false,
    error: null,
    onStatusChange: vi.fn(),
    onDelete: vi.fn(),
    onItemClick: vi.fn(),
  }

  describe('loading state', () => {
    it('shows loading spinner when loading is true')
    it('does not show items when loading')
  })

  describe('error state', () => {
    it('shows error message when error is provided')
    it('displays the error text in red')
  })

  describe('empty state', () => {
    it('shows empty state when items array is empty')
    it('displays "No interests found" message')
    it('shows helpful instruction text')
  })

  describe('with items', () => {
    it('renders InterestCard for each item')
    it('passes correct props to each InterestCard')
    it('uses item.id as key')
  })

  describe('callbacks', () => {
    it('passes onStatusChange to InterestCard')
    it('passes onDelete to InterestCard')
    it('calls onItemClick with item when card clicked')
  })

  describe('optional features', () => {
    it('passes obsidianConnected to cards')
    it('passes searchAvailable to cards')
    it('passes onExportToObsidian when provided')
    it('passes onFindRelated when provided')
  })
})
```

**Test Cases**: ~18 tests

---

### 4. InterestCard Tests

**File**: `src/components/__tests__/InterestCard.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import { InterestCard } from '../InterestCard'
import { createInterestItem, createYouTubeItem, resetIdCounter } from '../../test/factories/interest'

// Mock window.confirm
const confirmSpy = vi.spyOn(window, 'confirm')

// Mock window.open
const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

describe('InterestCard', () => {
  beforeEach(() => {
    resetIdCounter()
    vi.clearAllMocks()
  })

  const defaultProps = {
    item: createInterestItem(),
    onStatusChange: vi.fn(),
    onDelete: vi.fn(),
    onClick: vi.fn(),
  }

  describe('rendering', () => {
    it('renders item title')
    it('renders item description when provided')
    it('renders author when provided')
    it('renders thumbnail image when provided')
    it('renders type icon when no thumbnail')
    it('renders correct icon for each type (youtube, book, article, etc.)')
    it('renders status button with correct label')
    it('renders tags when provided')
    it('truncates tags to first 3 with count indicator')
    it('renders categories when provided')
    it('truncates categories to first 2 with count indicator')
  })

  describe('status cycling', () => {
    it('cycles from backlog to in-progress')
    it('cycles from in-progress to completed')
    it('cycles from completed to backlog')
    it('calls onStatusChange with correct id and status')
    it('stops event propagation (does not trigger onClick)')
  })

  describe('delete action', () => {
    it('shows confirmation dialog when delete clicked')
    it('calls onDelete when confirmed')
    it('does not call onDelete when cancelled')
    it('stops event propagation')
  })

  describe('external link', () => {
    it('opens URL in new tab when external link clicked')
    it('stops event propagation')
  })

  describe('card click', () => {
    it('calls onClick when card is clicked')
  })

  describe('optional buttons', () => {
    it('renders Find Related button when onFindRelated and searchAvailable')
    it('does not render Find Related when searchAvailable false')
    it('renders Export button when onExportToObsidian provided')
    it('disables Export button when obsidianConnected false')
  })
})
```

**Test Cases**: ~25 tests

---

### 5. InterestDetail Tests

**File**: `src/components/__tests__/InterestDetail.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import { InterestDetail } from '../InterestDetail'
import { createYouTubeItem, createArticleItem, resetIdCounter } from '../../test/factories/interest'

// Mock API services
vi.mock('../../services/api', () => ({
  fetchTranscript: vi.fn(),
  fetchArticleContent: vi.fn(),
  generateArticleSummary: vi.fn(),
}))

import { fetchTranscript, fetchArticleContent, generateArticleSummary } from '../../services/api'

describe('InterestDetail', () => {
  beforeEach(() => {
    resetIdCounter()
    vi.clearAllMocks()
  })

  const defaultProps = {
    item: createYouTubeItem({ hasTranscript: true }),
    isOpen: true,
    onClose: vi.fn(),
    onUpdate: vi.fn().mockResolvedValue({}),
  }

  describe('rendering', () => {
    it('returns null when isOpen is false')
    it('renders modal when isOpen is true')
    it('renders item title')
    it('renders item type icon')
    it('renders thumbnail when provided')
    it('renders description when provided')
    it('renders author when provided')
    it('renders external link to original')
  })

  describe('form fields', () => {
    it('renders status dropdown with current value')
    it('renders tags input with current tags')
    it('renders notes textarea with current notes')
  })

  describe('transcript section (YouTube)', () => {
    it('shows transcript toggle when hasTranscript')
    it('does not show transcript toggle when no transcript')
    it('fetches transcript when expanded')
    it('shows loading state while fetching')
    it('displays transcript when loaded')
    it('handles fetch error gracefully')
  })

  describe('article content section', () => {
    it('shows article toggle when hasArticleContent')
    it('fetches content when expanded')
    it('shows truncation warning when truncated')
  })

  describe('AI summary', () => {
    it('shows Generate Summary button for articles')
    it('calls generateArticleSummary when clicked')
    it('shows loading state while generating')
    it('displays summary when generated')
    it('shows key points when available')
    it('shows suggested tags when available')
    it('handles generation error')
  })

  describe('save action', () => {
    it('calls onUpdate with form data when Save clicked')
    it('shows saving state')
    it('calls onClose after successful save')
    it('handles tags as comma-separated string')
  })

  describe('cancel action', () => {
    it('calls onClose when Cancel clicked')
    it('calls onClose when X button clicked')
  })

  describe('export to Obsidian', () => {
    it('renders export button when onExportToObsidian provided')
    it('disables export when obsidianConnected false')
    it('calls onExportToObsidian when clicked')
  })
})
```

**Test Cases**: ~30 tests

---

### 6. AddInterestModal Tests

**File**: `src/components/__tests__/AddInterestModal.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import { AddInterestModal } from '../AddInterestModal'

// Mock enrich service
vi.mock('../../services/enrich', () => ({
  enrichUrl: vi.fn(),
  isYouTubeUrl: vi.fn(),
  isArticleUrl: vi.fn(),
}))

import { enrichUrl, isYouTubeUrl, isArticleUrl } from '../../services/enrich'

describe('AddInterestModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(isYouTubeUrl as any).mockReturnValue(false)
    ;(isArticleUrl as any).mockReturnValue(false)
  })

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onAdd: vi.fn().mockResolvedValue(undefined),
  }

  describe('rendering', () => {
    it('returns null when isOpen is false')
    it('renders modal when isOpen is true')
    it('renders URL input as required')
    it('renders type dropdown')
    it('renders status dropdown')
    it('renders title input')
    it('renders description textarea')
    it('renders tags input')
    it('renders Cancel and Add Interest buttons')
  })

  describe('URL input', () => {
    it('shows error when submitting without URL')
    it('auto-detects type from URL')
  })

  describe('YouTube URL enrichment', () => {
    it('triggers enrichment for YouTube URLs')
    it('shows loading state during enrichment')
    it('populates title from enriched data')
    it('populates author from enriched data')
    it('shows thumbnail preview')
    it('shows transcript preview')
    it('handles enrichment error')
  })

  describe('article URL enrichment', () => {
    it('triggers enrichment for article URLs')
    it('shows reading time and word count')
    it('shows article excerpt')
    it('shows truncation warning when applicable')
  })

  describe('form submission', () => {
    it('calls onAdd with form data')
    it('includes enriched data in submission')
    it('shows loading state during submission')
    it('calls onClose after successful add')
    it('resets form after successful add')
    it('shows error message on failure')
  })

  describe('cancel action', () => {
    it('calls onClose when Cancel clicked')
    it('calls onClose when X button clicked')
    it('resets form when closed')
  })
})
```

**Test Cases**: ~25 tests

---

## Implementation Tasks

Execute these tasks in order. Each task is independently verifiable.

### Task 1: Install Dependencies

**Files**: `package.json`

```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/coverage-v8
```

**Verification**:
```bash
npm ls @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

---

### Task 2: Configure Vitest

**Files**: `vite.config.ts`

Add test configuration to existing vite config (see Test Infrastructure section above).

**Verification**:
```bash
npx vitest run --reporter=verbose
# Should show existing backend tests passing
```

---

### Task 3: Create Test Setup

**Files**: `src/test/setup.ts`

Create the setup file with jest-dom import.

**Verification**:
```bash
npx vitest run
# No errors about missing setup
```

---

### Task 4: Create Test Utilities

**Files**: `src/test/utils.tsx`

Create custom render with userEvent setup.

**Verification**: TypeScript compiles without errors

---

### Task 5: Create Factory Functions

**Files**: `src/test/factories/interest.ts`

Create InterestItem factory and type-specific factories.

**Verification**: TypeScript compiles without errors

---

### Task 6: Test FilterBar (TDD)

**Files**: `src/components/__tests__/FilterBar.test.tsx`

Write tests first, then verify they pass (component already exists).

**Test First**:
- Write all FilterBar tests (RED phase - they should pass since component exists)

**Verification**:
```bash
npx vitest run FilterBar
# All tests should pass
```

---

### Task 7: Test Header (TDD)

**Files**: `src/components/__tests__/Header.test.tsx`

**Test First**: Write all Header tests with ObsidianStatus mock

**Verification**:
```bash
npx vitest run Header
```

---

### Task 8: Test InterestList (TDD)

**Files**: `src/components/__tests__/InterestList.test.tsx`

**Test First**: Write all InterestList tests

**Verification**:
```bash
npx vitest run InterestList
```

---

### Task 9: Test InterestCard (TDD)

**Files**: `src/components/__tests__/InterestCard.test.tsx`

**Test First**: Write all InterestCard tests with window mocks

**Verification**:
```bash
npx vitest run InterestCard
```

---

### Task 10: Test InterestDetail (TDD)

**Files**: `src/components/__tests__/InterestDetail.test.tsx`

**Test First**: Write tests with API mocks for async loading

**Verification**:
```bash
npx vitest run InterestDetail
```

---

### Task 11: Test AddInterestModal (TDD)

**Files**: `src/components/__tests__/AddInterestModal.test.tsx`

**Test First**: Write tests with enrich service mocks

**Verification**:
```bash
npx vitest run AddInterestModal
```

---

### Task 12: Final Verification

**Run all tests and coverage**:
```bash
# All tests
npx vitest run

# Coverage report
npx vitest run --coverage

# Verify >80% coverage on components
```

**Expected outcome**:
- ~125+ new frontend tests
- >80% coverage on all 6 primary components
- All tests pass consistently

---

## Acceptance Criteria Mapping

| AC | Implementation | Test |
|----|----------------|------|
| AC-1: 6 components have test files | Tasks 6-11 create test files | ls src/components/__tests__/*.test.tsx |
| AC-2: >80% coverage | Task 12 runs coverage | npx vitest --coverage |
| AC-3: Accessible queries | All tests use getByRole/getByText | Code review of test files |
| AC-4: <30s test runtime | Efficient setup, mocking | npx vitest run --reporter=verbose |
| AC-5: No flaky tests | Deterministic mocks, no timing | Run 10 consecutive times |

---

## Notes for Implementor

### Critical Points

1. **Always use accessible queries**: `getByRole`, `getByLabelText`, `getByText`, `getByPlaceholderText`. Never use `getByTestId` or direct DOM queries.

2. **Mock external services at module level**: Use `vi.mock()` at the top of test files for consistent behavior.

3. **Use factories for test data**: Never create InterestItem objects inline - always use the factory functions.

4. **Stop propagation tests**: When testing button clicks that call `e.stopPropagation()`, verify the parent onClick is NOT called.

5. **Async operations**: Use `waitFor` for any state that updates asynchronously (API calls, timeouts).

### Watch Out For

- **window.confirm**: Must be mocked with `vi.spyOn(window, 'confirm')`
- **window.open**: Must be mocked with `vi.spyOn(window, 'open')`
- **ObsidianStatus in Header**: Mock as a simple component to isolate Header tests
- **Debounced inputs**: In SearchModal/AddInterestModal, may need `vi.useFakeTimers()`

### Recommended Order

1. FilterBar (simplest, presentational)
2. Header (simple with one mock)
3. InterestList (container with states)
4. InterestCard (interactions, window mocks)
5. InterestDetail (complex, API mocks)
6. AddInterestModal (most complex, enrichment mocks)

---

*Spec Version: 1.0*
*Created: 2026-01-20*
*Author: Architecture Agent*
