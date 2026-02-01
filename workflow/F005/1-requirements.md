---
id: F005
stage: requirements
title: "Memory & User Preferences"
started_at: 2026-01-20T13:01:53-05:00
completed_at: 2026-01-20T13:20:00-05:00
status: complete
handoff_ready: true
checkpoints:
  - name: requirements_identified
    status: pass
    message: "6 functional requirements defined (FR-1 through FR-6)"
  - name: impact_analyzed
    status: pass
    message: "9 components identified with impact levels, dependencies and risks documented"
  - name: test_impact_analyzed
    status: pass
    message: "Baseline 47 tests passing, no breaks predicted, 12 new test areas identified"
  - name: acceptance_criteria_defined
    status: pass
    message: "14 specific, measurable acceptance criteria with clear pass/fail conditions"
  - name: no_open_blockers
    status: pass
    message: "All 4 questions resolved with reasonable defaults"
retry_count: 0
last_failure: null
---

# Requirements: Memory & User Preferences

## Work Item
- **ID**: F005
- **Type**: Feature
- **Source**: beans show Hackshop_Agentic_Dev_Tools-vdaa

## Executive Summary
This feature adds persistent memory and preference learning capabilities to War Goat for personalized learning experiences. Users will store preferences across sessions, have patterns recognized, persist AI insights, track learning goals, and receive smart content suggestions.

## Detailed Requirements

### Functional Requirements

- **FR-1**: User Preferences Persistence - Store and retrieve user preferences including theme settings, default view mode, sort order, notification preferences, auto-enrichment settings, and existing Obsidian settings.

- **FR-2**: Pattern Recognition - Track and analyze user behavior to identify patterns including tag frequency, preferred content types, favorite categories, status workflows, and time-of-day usage.

- **FR-3**: AI Insights Storage - Persist AI-generated content including study notes, content summaries, topic connections, and extracted key concepts.

- **FR-4**: Learning Goals Management - Enable goal setting with titles, descriptions, timeframes, measurable targets, automatic progress tracking, and visual indicators.

- **FR-5**: Smart Suggestions - Provide intelligent defaults including auto-suggested tags, pre-selected categories, related item recommendations, and next-item suggestions based on goals.

- **FR-6**: Data Export/Import - Allow users to export all preferences to JSON, import from backup, clear history on demand, and control data collection via privacy settings.

### Non-Functional Requirements

- **NFR-1**: Performance - Preference loading completes within 100ms on app startup. Pattern analysis runs asynchronously without blocking UI.

- **NFR-2**: Privacy - All data stored locally (localStorage/IndexedDB). No external server transmission. Clear data retention policies enforced.

- **NFR-3**: Reliability - Graceful degradation if storage unavailable. App functions with sensible defaults when preferences missing.

- **NFR-4**: Usability - Preferences accessible via settings panel. Clear goal management UI. Non-intrusive, dismissible suggestions.

- **NFR-5**: Data Integrity - Preferences validated on load. Schema migrations handled for stored data. Concurrent write protection.

### Constraints

- **CON-1**: Browser localStorage limit of ~5-10MB respected. IndexedDB used for larger data (goals, AI insights).

- **CON-2**: Must work offline - no server-side storage for MVP.

- **CON-3**: Backwards compatible with existing `war-goat-obsidian-settings` localStorage key.

- **CON-4**: Pattern tracking is opt-in with clear privacy disclosure.

## System Impact Analysis

### Components Affected
| Component | Impact Level | Description |
|-----------|--------------|-------------|
| `src/types/index.ts` | High | Add UserPreferences, LearningGoal, UserPatterns, AIInsights interfaces |
| `src/hooks/` | High | New hooks: useUserPreferences, useLearningGoals, usePatterns, useSmartSuggestions |
| `src/hooks/useObsidianSettings.ts` | Medium | Refactor to use unified preferences system with backwards compatibility |
| `src/App.tsx` | Medium | Integrate PreferencesProvider, apply theme, manage goals state |
| `src/components/` | Medium | New SettingsPanel, GoalsPanel, SuggestionChip components |
| `src/components/AddInterestModal.tsx` | Medium | Add smart suggestions for tags and categories |
| `src/components/FilterBar.tsx` | Low | Apply user's default filters on load |
| `src/services/api.ts` | Low | Add functions for local storage operations |
| `db.json` | None | No changes - preferences stored in browser |

### Data Changes
- Database schema changes: No - preferences stored client-side
- API changes: No new server endpoints for MVP
- Configuration changes: No - all settings in browser storage
- New storage keys:
  - `war-goat-user-preferences` - General preferences
  - `war-goat-user-patterns` - Behavioral patterns
  - `war-goat-learning-goals` - Goal data (IndexedDB)
  - `war-goat-ai-insights` - Persisted AI content (IndexedDB)

### Dependencies
- Internal:
  - Existing useObsidianSettings hook (will be unified)
  - InterestItem type for pattern analysis
  - Existing categorization logic for smart suggestions

- External:
  - None for MVP (all local storage)

### Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Storage quota exceeded | Medium | Medium | Monitor usage, warn users, provide cleanup tools |
| Data loss on storage clear | Medium | High | Export feature, periodic backup prompts |
| Performance degradation with large datasets | Low | Medium | Efficient indexing, lazy loading, cleanup old patterns |
| Schema migration failures | Low | High | Versioned schemas, migration functions, fallback to defaults |
| Privacy concerns | Medium | Medium | Clear opt-in, transparent data collection, easy deletion |

## Test Impact Analysis

### Existing Test Baseline
```bash
# Test run command and summary
npx vitest run
# Total: 47 tests, 47 passing, 0 failing
```

### Related Test Files
| Test File | Type | Tests | Relevance | Predicted Impact |
|-----------|------|-------|-----------|------------------|
| `server/__tests__/article.test.js` | Unit | 29 | Low | Keep (backend, unrelated) |
| `server/__tests__/brave-search.test.js` | Unit | 18 | Low | Keep (backend, unrelated) |

### Tests Predicted to Break/Change
| Test | File | Reason | Action Needed |
|------|------|--------|---------------|
| *None* | - | No existing preference/hook tests | - |

### New Test Coverage Needed
| Area | Type | Priority | Reason |
|------|------|----------|--------|
| useUserPreferences hook | Unit | High | Core functionality - preference loading/saving |
| useLearningGoals hook | Unit | High | Goal CRUD operations |
| usePatterns hook | Unit | Medium | Pattern tracking and analysis |
| useSmartSuggestions hook | Unit | Medium | Suggestion generation logic |
| localStorage utilities | Unit | High | Storage read/write/migrate functions |
| IndexedDB utilities | Unit | High | Goals and insights persistence |
| PreferencesProvider | Unit | High | Context provider behavior |
| SettingsPanel component | Unit | Medium | UI for preference management |
| GoalsPanel component | Unit | Medium | UI for goal display/creation |
| Migration from old settings | Unit | High | Backwards compatibility |
| Privacy consent flow | E2E | Low | Opt-in flow |
| Theme application | E2E | Low | Theme persistence |

### Test Impact Report
See: `workflow/F005/test-impact-report.md`

## User Stories

### Primary User Story
As a War Goat user
I want my preferences and learning patterns to be remembered across sessions
So that I have a personalized experience without reconfiguring each time

### Additional User Stories
- US-1: Remember User Preferences - Settings persist across browser sessions
- US-2: Learn From My Patterns - System recognizes content preferences
- US-3: AI Memory Across Sessions - AI insights saved and accessible
- US-4: Learning Goals Tracking - Set and track measurable learning goals
- US-5: Smart Defaults Based on Context - Auto-suggest tags and categories

## Acceptance Criteria

- [x] **AC-1**: Verify that selecting a theme (light/dark/system) persists after browser refresh and is applied immediately on app load.

- [x] **AC-2**: Verify that default view mode, sort order, and filter settings are remembered and applied on subsequent visits.

- [x] **AC-3**: Verify that when adding a new interest, the system suggests up to 5 relevant tags based on URL/title and user's tag history, with most-used tags first.

- [x] **AC-4**: Verify that the system tracks which content types the user adds most frequently, visible in a "Your Patterns" section in settings.

- [x] **AC-5**: Verify that users can create a learning goal with title, description, timeframe, and target metric, and see it in a Goals panel.

- [x] **AC-6**: Verify that goal progress updates automatically when interests matching the goal criteria are completed.

- [x] **AC-7**: Verify that AI-generated study notes (from Obsidian integration) are saved and viewable later even if Obsidian is disconnected.

- [x] **AC-8**: Verify that all preferences can be exported to a JSON file and imported to restore settings.

- [x] **AC-9**: Verify that clearing all data removes preferences, patterns, goals, and AI insights, returning to default state.

- [x] **AC-10**: Verify that the app loads and functions correctly if localStorage/IndexedDB is unavailable, using sensible defaults.

- [x] **AC-11**: Verify that pattern tracking is opt-in with a clear explanation of what data is collected, displayed on first use.

- [x] **AC-12**: Verify that existing Obsidian settings (`war-goat-obsidian-settings`) continue to work and are migrated to the unified system.

- [x] **AC-13**: Verify that preference loading completes within 100ms (measurable in browser DevTools).

- [x] **AC-14**: Verify that smart suggestions appear within 200ms of entering text in the tag/category fields.

## Out of Scope

- Server-side storage - All data stored locally in browser for MVP
- Cross-device sync - No sync between browsers/devices
- Social features - No sharing of goals or achievements
- AI-powered goal suggestions - Goals must be manually created
- Spaced repetition system - No automated review scheduling
- Analytics dashboard - Basic patterns display only

## Open Questions

- Q1: localStorage vs IndexedDB? **Resolved**: localStorage for preferences (<1KB), IndexedDB for goals and insights. [Blocker: no]
- Q2: How long to retain pattern data? **Resolved**: Keep last 90 days, user option to extend. [Blocker: no]
- Q3: How to handle existing Obsidian settings? **Resolved**: Migrate to unified system, keep backwards compatibility. [Blocker: no]
- Q4: Should patterns be opt-in or opt-out? **Resolved**: Opt-in with clear disclosure. [Blocker: no]

## Documentation Impact

- [ ] Update `docs/ARCHITECTURE.md` with preferences storage architecture
- [ ] Create `docs/USER-PREFERENCES.md` user guide for preferences and goals
- [ ] Update `src/types/index.ts` inline documentation
- [ ] Add migration notes for existing users

## Handoff to Architecture Agent

### Key Decisions Needed

1. **State Management Pattern**: PreferencesProvider context vs individual hooks
   - Recommendation: PreferencesProvider context to avoid prop drilling

2. **Storage Strategy**: Partitioning data between localStorage and IndexedDB
   - Recommendation: localStorage for quick-load prefs, IndexedDB for goals/insights

3. **Migration Strategy**: Migrating existing Obsidian settings
   - Recommendation: Read old key on startup, migrate, preserve for rollback

4. **Pattern Analysis Approach**: When/how to analyze user patterns
   - Recommendation: Debounced updates on item changes, daily aggregation

5. **Suggestions UI Pattern**: How to present smart suggestions
   - Recommendation: Inline chips in form fields, dismissible, learn from dismissals

### Suggested Approach

1. Define TypeScript interfaces for UserPreferences, LearningGoal, UserPatterns, PrivacySettings
2. Create PreferencesContext and useUserPreferences hook
3. Implement storage layer with localStorage/IndexedDB abstraction
4. Add SettingsPanel component for preference management
5. Create useLearningGoals hook and GoalsPanel component
6. Implement usePatterns hook for behavioral tracking
7. Add useSmartSuggestions hook for tag/category suggestions
8. Update AddInterestModal with suggestion chips
9. Add data export/import functionality
10. Implement privacy consent flow

---
*Generated by Requirements Agent*
*Timestamp: 2026-01-20T13:20:00-05:00*
