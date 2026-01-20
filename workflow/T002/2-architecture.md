---
id: T002
stage: architecture
title: "Component Tests for React UI"
started_at: 2026-01-20T18:10:00Z
completed_at: 2026-01-20T18:35:00Z
status: complete
handoff_ready: true
checkpoints:
  - name: requirements_addressed
    status: pass
    message: "All 6 FRs and 5 ACs have design solutions mapped"
  - name: design_complete
    status: pass
    message: "Test infrastructure, utilities, and all component test specifications complete"
  - name: test_architecture_defined
    status: pass
    message: "Tooling decisions, test structure, and data strategy documented"
  - name: tasks_defined
    status: pass
    message: "12 tasks defined with files, descriptions, and verification steps"
  - name: tests_planned
    status: pass
    message: "~125 test cases specified across 6 test files"
retry_count: 0
last_failure: null
previous_stage: 1-requirements.md
---

# Architecture & Implementation Spec: Component Tests for React UI

## Work Item
- **ID**: T002
- **Requirements Doc**: workflow/T002/1-requirements.md
- **Persistent Spec**: specs/T002-component-tests-spec.md
- **Type**: Task (Testing)

## Requirements Summary

Add comprehensive component tests for 6 primary React UI components using React Testing Library. Target >80% coverage using accessible queries (getByRole, getByLabelText, getByText). Tests should complete in <30 seconds and be deterministic (no flaky tests).

## Requirements Traceability

| Requirement | Addressed By | Section |
|-------------|--------------|---------|
| FR-1: Test files for 6 components | Tasks 6-11 create test files | Implementation Plan |
| FR-2: Vitest jsdom config | Task 2: Vitest configuration | Test Infrastructure |
| FR-3: Accessible queries | All test specs use getByRole/getByText | Component Test Specs |
| FR-4: Test all states | Loading/error/empty in InterestList tests | InterestList Tests |
| FR-5: Test interactions | Click/input handlers in all component tests | Component Test Specs |
| FR-6: Mock factories | Task 5 creates factory functions | Test Utilities |
| AC-1: 6 test files exist | Tasks 6-11 create each file | Implementation Plan |
| AC-2: >80% coverage | Task 12 runs coverage verification | Final Verification |
| AC-3: Accessible queries only | Spec prohibits getByTestId | Critical Notes |
| AC-4: <30s runtime | Mocking strategy, no network calls | Test Data Strategy |
| AC-5: No flaky tests | Deterministic mocks, no timing | Watch Out For |

## Architectural Analysis

### Current State

- **Test Framework**: Vitest 2.1.4 installed, no frontend test configuration
- **Backend Tests**: 47 tests in `server/__tests__/` using `describe/it/expect/vi.mock`
- **Frontend**: 6 primary React components in `src/components/`, TypeScript with well-defined props
- **No frontend tests exist currently**

### Proposed Changes

1. **Add test dependencies**: @testing-library/react, jest-dom, user-event, @vitest/coverage-v8
2. **Update vite.config.ts**: Add Vitest test block with jsdom environment
3. **Create test infrastructure**: `src/test/setup.ts`, `src/test/utils.tsx`, `src/test/factories/interest.ts`
4. **Create 6 test files**: One for each primary component in `src/components/__tests__/`

### Architecture Decision Records (ADRs)

#### ADR-1: Test File Co-location
- **Context**: Need to decide where test files live
- **Decision**: Use `src/components/__tests__/` directory
- **Alternatives**: `src/__tests__/components/`, colocated `*.test.tsx` next to each component
- **Consequences**: Clear organization, follows React Testing Library conventions

#### ADR-2: V8 Coverage Provider
- **Context**: Need coverage reporting for >80% requirement (AC-2)
- **Decision**: Use `@vitest/coverage-v8` (native to Vitest)
- **Alternatives**: Istanbul coverage provider
- **Consequences**: Fast coverage, no additional config needed

#### ADR-3: Centralized Test Utilities
- **Context**: Multiple test files need same render helpers and mock factories
- **Decision**: Create `src/test/` directory with shared utilities
- **Alternatives**: Duplicate setup in each test file
- **Consequences**: DRY, consistent patterns, easier maintenance

#### ADR-4: Module-Level Mocking
- **Context**: Components call API services that need mocking
- **Decision**: Use `vi.mock()` at top of test files (like backend tests)
- **Alternatives**: Per-test mocking, MSW
- **Consequences**: Consistent with existing patterns, simpler setup

## Technical Design

### Test File Structure

```
src/
├── test/
│   ├── setup.ts              # @testing-library/jest-dom import
│   ├── utils.tsx             # Custom render with userEvent
│   └── factories/
│       └── interest.ts       # InterestItem factory functions
└── components/
    └── __tests__/
        ├── FilterBar.test.tsx        (~15 tests)
        ├── Header.test.tsx           (~12 tests)
        ├── InterestList.test.tsx     (~18 tests)
        ├── InterestCard.test.tsx     (~25 tests)
        ├── InterestDetail.test.tsx   (~30 tests)
        └── AddInterestModal.test.tsx (~25 tests)
```

### Configuration Changes

**vite.config.ts** additions:
```typescript
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
}
```

### Mocking Strategy

| Component | Mocks Required |
|-----------|----------------|
| FilterBar | None (presentational) |
| Header | `ObsidianStatus` component |
| InterestList | None (presentational) |
| InterestCard | `window.confirm`, `window.open` |
| InterestDetail | `services/api`: fetchTranscript, fetchArticleContent, generateArticleSummary |
| AddInterestModal | `services/enrich`: enrichUrl, isYouTubeUrl, isArticleUrl |

## Test Architecture

### Test Tooling Decisions
| Need | Tool | Status | Notes |
|------|------|--------|-------|
| Component rendering | @testing-library/react ^14.x | New | Industry standard |
| DOM matchers | @testing-library/jest-dom ^6.x | New | Better assertions |
| User interactions | @testing-library/user-event ^14.x | New | Realistic events |
| Test environment | jsdom | Existing | Configure in Vitest |
| Coverage | @vitest/coverage-v8 | New | V8 native coverage |

### Test Data Strategy

**Factory Functions** (`src/test/factories/interest.ts`):
- `createInterestItem(overrides)` - Base factory for any InterestItem
- `createYouTubeItem(overrides)` - YouTube-specific with thumbnail, transcript
- `createArticleItem(overrides)` - Article with excerpt, wordCount, readingTime
- `createBookItem(overrides)` - Book with author
- `resetIdCounter()` - Call in beforeEach for deterministic IDs

### Test Impact Report Update
See: `workflow/T002/test-impact-report.md` Section 2

## File Changes

### Files to Create
| File | Purpose |
|------|---------|
| `src/test/setup.ts` | Jest-dom setup |
| `src/test/utils.tsx` | Custom render helper |
| `src/test/factories/interest.ts` | Test data factories |
| `src/components/__tests__/FilterBar.test.tsx` | FilterBar tests |
| `src/components/__tests__/Header.test.tsx` | Header tests |
| `src/components/__tests__/InterestList.test.tsx` | InterestList tests |
| `src/components/__tests__/InterestCard.test.tsx` | InterestCard tests |
| `src/components/__tests__/InterestDetail.test.tsx` | InterestDetail tests |
| `src/components/__tests__/AddInterestModal.test.tsx` | AddInterestModal tests |

### Files to Modify
| File | Changes |
|------|---------|
| `vite.config.ts` | Add test configuration block |
| `package.json` | Add testing-library devDependencies |

### Test Files (TDD)
| File | Type | Tests to Write |
|------|------|----------------|
| FilterBar.test.tsx | Unit | Search input, dropdowns, callbacks (~15) |
| Header.test.tsx | Unit | Button clicks, conditional rendering (~12) |
| InterestList.test.tsx | Unit | Loading/error/empty states, list render (~18) |
| InterestCard.test.tsx | Unit | Status cycling, delete, external link (~25) |
| InterestDetail.test.tsx | Unit | Form editing, async loading, summary (~30) |
| AddInterestModal.test.tsx | Unit | Form validation, enrichment flow (~25) |

## Implementation Plan (TDD)

### Phase 1: Setup Test Infrastructure

1. Install dependencies
2. Configure Vitest in vite.config.ts
3. Create setup.ts with jest-dom
4. Create utils.tsx with custom render
5. Create factory functions

### Phase 2: Write Component Tests (Simplest to Complex)

6. FilterBar tests (presentational, no mocks)
7. Header tests (one component mock)
8. InterestList tests (state variations)
9. InterestCard tests (window mocks)
10. InterestDetail tests (API mocks)
11. AddInterestModal tests (enrich mocks)

### Phase 3: Verify

12. Run all tests, verify coverage >80%

## Step-by-Step Tasks for Implementor

**IMPORTANT**: See `specs/T002-component-tests-spec.md` for full implementation details.

### Task 1: Install Dependencies
**Files**: `package.json`
**Description**: `npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/coverage-v8`
**Verification**: `npm ls @testing-library/react`

### Task 2: Configure Vitest
**Files**: `vite.config.ts`
**Description**: Add test block with jsdom, globals, setupFiles, coverage
**Verification**: `npx vitest run` shows existing backend tests passing

### Task 3: Create Test Setup
**Files**: `src/test/setup.ts`
**Description**: Import `@testing-library/jest-dom`
**Verification**: No errors when running tests

### Task 4: Create Test Utilities
**Files**: `src/test/utils.tsx`
**Description**: Custom render with userEvent.setup()
**Verification**: TypeScript compiles

### Task 5: Create Factory Functions
**Files**: `src/test/factories/interest.ts`
**Description**: InterestItem factories with resetIdCounter
**Verification**: TypeScript compiles

### Task 6: Test FilterBar
**Files**: `src/components/__tests__/FilterBar.test.tsx`
**Description**: ~15 tests for search, dropdowns, callbacks
**Verification**: `npx vitest run FilterBar`

### Task 7: Test Header
**Files**: `src/components/__tests__/Header.test.tsx`
**Description**: ~12 tests with ObsidianStatus mock
**Verification**: `npx vitest run Header`

### Task 8: Test InterestList
**Files**: `src/components/__tests__/InterestList.test.tsx`
**Description**: ~18 tests for loading/error/empty/list states
**Verification**: `npx vitest run InterestList`

### Task 9: Test InterestCard
**Files**: `src/components/__tests__/InterestCard.test.tsx`
**Description**: ~25 tests with window.confirm/open mocks
**Verification**: `npx vitest run InterestCard`

### Task 10: Test InterestDetail
**Files**: `src/components/__tests__/InterestDetail.test.tsx`
**Description**: ~30 tests with API service mocks
**Verification**: `npx vitest run InterestDetail`

### Task 11: Test AddInterestModal
**Files**: `src/components/__tests__/AddInterestModal.test.tsx`
**Description**: ~25 tests with enrich service mocks
**Verification**: `npx vitest run AddInterestModal`

### Task 12: Final Verification
**Run all tests and coverage**:
```bash
npx vitest run
npx vitest run --coverage
```
**Verify**: All tests pass, >80% coverage on components

## Acceptance Criteria Mapping

| AC | How Implemented | How Tested |
|----|-----------------|------------|
| AC-1: 6 test files | Tasks 6-11 | `ls src/components/__tests__/*.test.tsx` |
| AC-2: >80% coverage | Coverage config | `npx vitest --coverage` |
| AC-3: Accessible queries | Spec mandates getByRole/getByText | Code review |
| AC-4: <30s runtime | Mocks, no network | `npx vitest run --reporter=verbose` |
| AC-5: No flaky tests | Deterministic mocks | Run 10x consecutively |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Tests become flaky | Use deterministic mocks, avoid timing assertions |
| Coverage gaps | Focus on user-centric scenarios per RTL best practices |
| Complex async testing | Use waitFor, proper mock setup |

## Handoff to Implementor Agent

### Critical Notes
1. **ALWAYS use accessible queries**: getByRole, getByLabelText, getByText. NEVER getByTestId.
2. **Follow the spec**: Full details in `specs/T002-component-tests-spec.md`
3. **Use factories**: Never create InterestItem inline, always use factory functions
4. **Mock window methods**: Use vi.spyOn for confirm/open

### Recommended Order
1. Tasks 1-5 (infrastructure)
2. Task 6 (FilterBar - simplest)
3. Task 7 (Header)
4. Task 8 (InterestList)
5. Task 9 (InterestCard)
6. Task 10 (InterestDetail)
7. Task 11 (AddInterestModal - most complex)
8. Task 12 (verification)

### Watch Out For
- `window.confirm` returns boolean - mock with mockReturnValue(true/false)
- `window.open` should be mocked to prevent actual navigation
- `ObsidianStatus` in Header needs to be mocked to isolate tests
- Async operations need `waitFor` from testing-library

---
*Generated by Architecture Agent*
*Timestamp: 2026-01-20T18:35:00Z*
