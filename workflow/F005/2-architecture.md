---
id: F005
stage: architecture
title: "Memory & User Preferences"
started_at: 2026-01-20T13:25:00-05:00
completed_at: 2026-01-20T14:10:00-05:00
status: complete
handoff_ready: true
checkpoints:
  - name: requirements_addressed
    status: pass
    message: "All 6 FRs and 14 ACs mapped to design elements in Requirements Traceability table"
  - name: design_complete
    status: pass
    message: "Data models, storage layer, context, hooks, and components fully specified"
  - name: test_architecture_defined
    status: pass
    message: "vitest + @testing-library/react + fake-indexeddb; test structure and data strategy documented"
  - name: tasks_defined
    status: pass
    message: "18 step-by-step tasks with Files, Description, Test First, and Verification"
  - name: tests_planned
    status: pass
    message: "25+ test cases specified across 5 test files with fixtures and mocking strategy"
retry_count: 0
last_failure: null
previous_stage: 1-requirements.md
---

# Architecture & Implementation Spec: Memory & User Preferences

## Work Item
- **ID**: F005
- **Requirements Doc**: workflow/F005/1-requirements.md
- **Persistent Spec**: specs/F005-memory-preferences-spec.md
- **Type**: Feature

## Requirements Summary

This feature adds persistent memory and preference learning to War Goat:
- **FR-1**: User preferences (theme, view mode, sort, filters, Obsidian settings)
- **FR-2**: Pattern recognition (tag, type, category frequencies)
- **FR-3**: AI insights storage (study notes, summaries)
- **FR-4**: Learning goals management (CRUD, progress tracking)
- **FR-5**: Smart suggestions (tag auto-complete based on history)
- **FR-6**: Data export/import (JSON backup, clear all)

See `docs/requirements/F005-requirements.md` for complete requirements.

## Requirements Traceability

| Requirement | Addressed By | Section |
|-------------|--------------|---------|
| FR-1 | UserPreferences type, useUserPreferences hook, SettingsPanel | Technical Design > Data Models |
| FR-2 | UserPatterns type, usePatterns hook, debounced tracking | Technical Design > Data Models |
| FR-3 | AIInsight type, IndexedDB store, loadInsight/saveInsight | Storage Layer Design |
| FR-4 | LearningGoal type, useLearningGoals hook, GoalsPanel | Technical Design > Data Models |
| FR-5 | useSmartSuggestions hook, SuggestionChips component | Smart Suggestions Hook |
| FR-6 | exportAllData/importAllData, clearAllData, SettingsPanel | Storage Layer Design |
| AC-1 | theme in preferences, applied via CSS class on mount | App.tsx integration |
| AC-2 | defaultView, defaultSort, defaultFilters in preferences | PreferencesContext |
| AC-3 | useSmartSuggestions, SuggestionChips | AddInterestModal modification |
| AC-4 | patterns.typeFrequency, SettingsPanel "Your Patterns" | SettingsPanel component |
| AC-5 | GoalsPanel with add form | GoalsPanel component |
| AC-6 | Goal progress updates on interest completion | PreferencesContext wiring |
| AC-7 | AIInsight in IndexedDB, loadInsight API | Storage Layer Design |
| AC-8 | exportAllData downloads JSON | SettingsPanel export button |
| AC-9 | clearAllData removes all storage | SettingsPanel clear button |
| AC-10 | isStorageAvailable check, fallback to defaults | Storage Layer Design |
| AC-11 | PrivacyConsentModal on first load | PrivacyConsentModal component |
| AC-12 | Migration in loadPreferences, dual-write | Storage Layer Design |
| AC-13 | localStorage sync load (<100ms) | loadPreferences implementation |
| AC-14 | useMemo in useSmartSuggestions (<200ms) | Smart Suggestions Hook |

## Architectural Analysis

### Current State
- React hooks pattern with useState/useEffect for state management
- Existing `useObsidianSettings` hook uses localStorage with key `war-goat-obsidian-settings`
- No global state management library (no Redux/Zustand)
- Backend is Express + json-server, but preferences are client-side only

### Proposed Changes
1. **New Storage Layer**: Abstraction for localStorage + IndexedDB
2. **PreferencesContext**: React context for app-wide preference access
3. **New Hooks**: useUserPreferences, useLearningGoals, usePatterns, useSmartSuggestions
4. **New Components**: SettingsPanel, GoalsPanel, SuggestionChips, PrivacyConsentModal
5. **Modified Components**: AddInterestModal, FilterBar, Header, App.tsx
6. **Backwards Compatibility**: Migrate old Obsidian settings, preserve for 30 days

### Architecture Decision Records (ADRs)

#### ADR-1: PreferencesContext for Global State
- **Context**: Need preferences throughout app without prop drilling
- **Decision**: React Context with PreferencesProvider at app root
- **Alternatives**: Redux, Zustand, individual hooks directly
- **Consequences**: Consistent access, single source of truth, easy testing

#### ADR-2: Hybrid localStorage + IndexedDB Storage
- **Context**: Balance fast load with larger data support
- **Decision**: localStorage for prefs (<1KB), IndexedDB for goals/insights
- **Alternatives**: All localStorage, all IndexedDB, server-side
- **Consequences**: Fast theme rendering, supports larger data, more complex layer

#### ADR-3: Backwards Compatible Migration
- **Context**: Existing users have `war-goat-obsidian-settings`
- **Decision**: Auto-migrate on load, write to both keys, preserve old 30 days
- **Alternatives**: Breaking change, parallel storage forever
- **Consequences**: Smooth upgrade, no data loss

#### ADR-4: Opt-in Pattern Tracking
- **Context**: Privacy requirement for pattern data
- **Decision**: PrivacyConsentModal on first load, explicit opt-in
- **Alternatives**: Opt-out, no tracking, server-side anonymous
- **Consequences**: User trust, GDPR-friendly

#### ADR-5: Debounced Pattern Updates
- **Context**: Track behavior without performance impact
- **Decision**: Queue updates, debounce writes (500ms), 90-day retention
- **Alternatives**: Immediate writes, batch at session end
- **Consequences**: Good performance, patterns stay manageable

## Technical Design

### Data Model Changes

See `specs/F005-memory-preferences-spec.md` for complete TypeScript interfaces.

Key types:
- `UserPreferences` - theme, view, sort, filters, obsidian, privacy
- `LearningGoal` - id, title, timeframe, target, progress, status
- `UserPatterns` - tagFrequency, typeFrequency, recentTags
- `AIInsight` - studyNotes, summary, keyTopics per interest
- `PrivacySettings` - trackPatterns, consentGiven, consentDate

### Storage Keys
```
localStorage:
- war-goat-user-preferences (new)
- war-goat-user-patterns (new)
- war-goat-obsidian-settings (existing, backwards compat)

IndexedDB (war-goat-db):
- learning-goals store
- ai-insights store
```

### Component Design
```
App.tsx (wrap with PreferencesProvider)
├── PrivacyConsentModal (NEW)
├── Header (add Settings, Goals buttons)
├── SettingsPanel (NEW slide-out)
│   ├── ThemeSelector
│   ├── ViewPreferences
│   ├── PatternsDisplay
│   └── ExportImportButtons
├── GoalsPanel (NEW)
├── AddInterestModal (add SuggestionChips)
│   └── SuggestionChips (NEW)
└── FilterBar (apply default filters)
```

## Test Architecture

### Test Tooling Decisions
| Need | Tool | Status | Notes |
|------|------|--------|-------|
| Unit testing | vitest | Existing | Already configured |
| React hooks | vitest + @testing-library/react | Add | Standard approach |
| localStorage mock | vitest vi.stubGlobal | Existing | Built-in |
| IndexedDB mock | fake-indexeddb | Add | New dependency |

### New Test Infrastructure Needed
- `fake-indexeddb` package
- `@testing-library/react` package
- Test fixtures for UserPreferences, LearningGoal, UserPatterns
- Storage reset helper for between-test cleanup

### Test Structure
```
src/
├── services/
│   └── __tests__/
│       └── storage.test.ts (NEW)
└── hooks/
    └── __tests__/
        ├── useUserPreferences.test.ts (NEW)
        ├── useLearningGoals.test.ts (NEW)
        ├── usePatterns.test.ts (NEW)
        └── useSmartSuggestions.test.ts (NEW)
```

### Test Data Strategy
- Mock fixtures for each data type
- localStorage cleared in beforeEach
- fake-indexeddb stubbed for IndexedDB tests
- PreferencesProvider wrapper for component tests

### Test Impact Report Update
See: `workflow/F005/test-impact-report.md` Section 2 (complete)

## File Changes

### Files to Create
| File | Purpose |
|------|---------|
| `src/services/storage.ts` | localStorage/IndexedDB abstraction |
| `src/contexts/PreferencesContext.tsx` | React context provider |
| `src/hooks/useUserPreferences.ts` | Preferences hook |
| `src/hooks/useLearningGoals.ts` | Goals hook |
| `src/hooks/usePatterns.ts` | Patterns hook |
| `src/hooks/useSmartSuggestions.ts` | Suggestions hook |
| `src/components/SettingsPanel.tsx` | Settings UI |
| `src/components/GoalsPanel.tsx` | Goals UI |
| `src/components/SuggestionChips.tsx` | Tag suggestions |
| `src/components/PrivacyConsentModal.tsx` | Consent modal |

### Files to Modify
| File | Changes |
|------|---------|
| `src/types/index.ts` | Add all new types |
| `src/hooks/useObsidianSettings.ts` | Integrate with PreferencesContext |
| `src/App.tsx` | Add PreferencesProvider, theme, panels |
| `src/components/AddInterestModal.tsx` | Add SuggestionChips |
| `src/components/FilterBar.tsx` | Apply default filters |
| `src/components/Header.tsx` | Add Settings/Goals buttons |
| `package.json` | Add test dependencies |

### Test Files (TDD)
| File | Type | Tests to Write |
|------|------|----------------|
| `src/services/__tests__/storage.test.ts` | Unit | CRUD, migration, export/import |
| `src/hooks/__tests__/useUserPreferences.test.ts` | Unit | load, save, reset |
| `src/hooks/__tests__/useLearningGoals.test.ts` | Unit | CRUD, progress |
| `src/hooks/__tests__/usePatterns.test.ts` | Unit | tracking, opt-in |
| `src/hooks/__tests__/useSmartSuggestions.test.ts` | Unit | suggestions |

## Implementation Plan (TDD)

### Phase 1: Write Failing Tests (RED)
- Storage layer tests
- Hook tests

### Phase 2: Implement Storage Layer (GREEN)
- Add types to src/types/index.ts
- Implement src/services/storage.ts
- Run storage tests

### Phase 3: Implement Context and Hooks (GREEN)
- Create PreferencesContext
- Create individual hooks
- Run hook tests

### Phase 4: Implement Components (GREEN)
- PrivacyConsentModal
- SettingsPanel
- GoalsPanel
- SuggestionChips
- Modify existing components

### Phase 5: Integration (GREEN)
- Wire up goal progress tracking
- Wire up AI insights persistence
- Run all tests

### Phase 6: Refactor
- Clean up styles
- Add loading states
- Performance optimize

## Step-by-Step Tasks for Implementor

**See `specs/F005-memory-preferences-spec.md` for complete task breakdown.**

Summary (18 tasks):
1. Add TypeScript types
2. Write storage layer tests
3. Implement storage layer
4. Write hook tests
5. Create PreferencesContext
6. Create individual hooks
7. Update useObsidianSettings
8. Create PrivacyConsentModal
9. Create SettingsPanel
10. Create GoalsPanel
11. Create SuggestionChips
12. Update AddInterestModal
13. Update FilterBar
14. Update Header
15. Update App.tsx
16. Wire up goal progress
17. Wire up AI insights
18. Final verification

## Acceptance Criteria Mapping

| AC | How Implemented | How Tested |
|----|-----------------|------------|
| AC-1 | theme in preferences, CSS class | Manual + unit |
| AC-2 | defaultView/Sort/Filters | Unit test |
| AC-3 | useSmartSuggestions | Unit test |
| AC-4 | patterns.typeFrequency | Unit test |
| AC-5 | GoalsPanel | Manual test |
| AC-6 | Progress tracking | Unit test |
| AC-7 | AIInsight IndexedDB | Unit test |
| AC-8 | exportAllData | Unit test |
| AC-9 | clearAllData | Unit test |
| AC-10 | isStorageAvailable | Unit test |
| AC-11 | PrivacyConsentModal | Manual test |
| AC-12 | Migration logic | Unit test |
| AC-13 | Sync localStorage | Manual DevTools |
| AC-14 | useMemo suggestions | Manual test |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Storage quota exceeded | Track usage, warn at 4MB, cleanup tools |
| Data loss on clear | Export feature, confirmation dialog |
| Schema migration fails | Versioned schemas, fallback to defaults |
| IndexedDB unavailable | Fall back to in-memory for session |

## Open Questions Resolved

| Question | Answer |
|----------|--------|
| localStorage vs IndexedDB | Hybrid approach |
| Pattern retention | 90 days default |
| Obsidian migration | Auto-migrate, keep old key |
| Pattern tracking opt-in | PrivacyConsentModal |

## Handoff to Implementor Agent

### Critical Notes
1. **PRIMARY DELIVERABLE**: Follow `specs/F005-memory-preferences-spec.md`
2. **Test First**: Write failing tests before implementing
3. **Storage First**: Storage layer must work before hooks
4. **Backwards Compatibility**: useObsidianSettings API must not change
5. **Theme Application**: Apply theme class to document.documentElement

### Recommended Order
1. Types (foundation)
2. Storage layer + tests
3. PreferencesContext + tests
4. Individual hooks + tests
5. Components (bottom-up)
6. App.tsx integration
7. Final E2E testing

### Watch Out For
- IndexedDB is async - don't block render
- localStorage is sync - safe for initial state
- Theme needs to apply before first paint
- Privacy modal must not be dismissible without choice
- Clear data needs confirmation dialog

---
*Generated by Architecture Agent*
*Timestamp: 2026-01-20T14:10:00-05:00*
