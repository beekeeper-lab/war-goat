# F005: Memory & User Preferences - Requirements

> **Version**: 1.0
> **Status**: Approved
> **Last Updated**: 2026-01-20

## Executive Summary

This feature adds persistent memory and preference learning capabilities to War Goat for personalized learning experiences. Users will be able to save preferences (themes, defaults, display options), have the system remember their patterns across sessions, maintain AI-generated insights about their learning journey, track learning goals, and receive smart defaults based on context.

## Work Item

- **ID**: F005
- **Type**: Feature
- **Title**: Memory & User Preferences - Personalized Experience

## User Stories

### US-1: Remember User Preferences
As a War Goat user, I want my settings and preferences to persist across browser sessions so that I don't have to reconfigure the app each time I use it.

### US-2: Learn From My Patterns
As a user, I want the system to recognize my content consumption patterns (favorite categories, common tags, preferred content types) so that I can get better recommendations and defaults.

### US-3: AI Memory Across Sessions
As a user, I want AI-generated insights (study notes, summaries, connections between topics) to be saved and accessible later so that I can build on previous learning.

### US-4: Learning Goals Tracking
As a user, I want to set and track learning goals (e.g., "Learn React this month", "Watch 5 videos on AI weekly") so that I can measure my progress and stay motivated.

### US-5: Smart Defaults Based on Context
As a user, I want the app to suggest sensible defaults when adding new content based on my history (e.g., auto-suggest tags, pre-select likely categories) so that data entry is faster and more accurate.

## Detailed Requirements

### Functional Requirements

- **FR-1**: User Preferences Persistence - Store and retrieve user preferences including:
  - Theme settings (light/dark/system)
  - Default view mode (grid/list)
  - Default sort order (date added/title/status)
  - Notification preferences
  - Auto-enrichment settings
  - All existing Obsidian settings

- **FR-2**: Pattern Recognition - Track and analyze user behavior to identify patterns:
  - Most used tags (with frequency counts)
  - Preferred content types (YouTube, articles, books, etc.)
  - Favorite categories
  - Common status workflows (how often users move items through statuses)
  - Time-of-day usage patterns

- **FR-3**: AI Insights Storage - Persist AI-generated content:
  - Study notes from Obsidian integration
  - Content summaries
  - Topic connections and related content links
  - Key concepts extracted from content

- **FR-4**: Learning Goals Management - Enable goal setting and tracking:
  - Create learning goals with titles and descriptions
  - Set goal timeframes (daily, weekly, monthly, custom)
  - Define measurable targets (items completed, hours spent, topics covered)
  - Track progress toward goals automatically
  - Visual progress indicators

- **FR-5**: Smart Suggestions - Provide intelligent defaults and suggestions:
  - Auto-suggest tags based on title/URL analysis and user history
  - Pre-select likely category based on content type and past choices
  - Suggest related items when viewing or adding content
  - Recommend next items to study based on incomplete goals

- **FR-6**: Data Export/Import - Allow users to manage their data:
  - Export all preferences and history to JSON
  - Import preferences from backup
  - Clear history/patterns on demand
  - Privacy controls for what data is collected

### Non-Functional Requirements

- **NFR-1**: Performance - Preference loading must complete within 100ms on app startup. Pattern analysis must not block UI (run asynchronously).

- **NFR-2**: Privacy - All memory and preferences stored locally (localStorage/IndexedDB). No data sent to external servers. Clear data retention policies.

- **NFR-3**: Reliability - Graceful degradation if storage is unavailable. App must remain functional without preferences (use sensible defaults).

- **NFR-4**: Usability - Preferences accessible via settings panel. Clear UI for goal management. Non-intrusive suggestions that can be dismissed.

- **NFR-5**: Data Integrity - Validate preferences on load. Handle schema migrations for stored data. Prevent data corruption from concurrent writes.

### Constraints

- **CON-1**: Browser localStorage limit of ~5-10MB must be respected. Use IndexedDB for larger data (goals, AI insights).

- **CON-2**: Must work offline - no server-side storage for MVP.

- **CON-3**: Must be backwards compatible with existing Obsidian settings storage (`war-goat-obsidian-settings`).

- **CON-4**: Pattern tracking must be opt-in with clear privacy disclosure.

## System Impact Analysis

### Components Affected

| Component | Impact Level | Description |
|-----------|--------------|-------------|
| `src/types/index.ts` | High | Add interfaces for UserPreferences, LearningGoal, UserPatterns, AIInsights |
| `src/hooks/` | High | New hooks: useUserPreferences, useLearningGoals, usePatterns, useSmartSuggestions |
| `src/hooks/useObsidianSettings.ts` | Medium | Refactor to use unified preferences system while maintaining compatibility |
| `src/App.tsx` | Medium | Integrate preferences provider, apply theme, manage goals state |
| `src/components/` | Medium | New SettingsPanel, GoalsPanel, SuggestionChip components |
| `src/components/AddInterestModal.tsx` | Medium | Add smart suggestions for tags and categories |
| `src/components/FilterBar.tsx` | Low | Apply user's default filters on load |
| `src/services/api.ts` | Low | Add functions for local storage operations |
| `db.json` | None | No changes - preferences stored in browser, not server |

### Data Changes

- **Database schema changes**: No - preferences stored client-side
- **API changes**: No new server endpoints for MVP
- **Configuration changes**: No - all settings in browser storage
- **New storage keys**:
  - `war-goat-user-preferences` - General preferences
  - `war-goat-user-patterns` - Behavioral patterns
  - `war-goat-learning-goals` - Goal data (IndexedDB)
  - `war-goat-ai-insights` - Persisted AI content (IndexedDB)

### Dependencies

- **Internal**:
  - Existing useObsidianSettings hook (will be unified)
  - InterestItem type for pattern analysis
  - Existing categorization logic for smart suggestions

- **External**:
  - None for MVP (all local storage)
  - Future: Could integrate with external backup services

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Storage quota exceeded | Medium | Medium | Monitor usage, warn users, provide cleanup tools |
| Data loss on storage clear | Medium | High | Export feature, periodic backup prompts |
| Performance degradation with large datasets | Low | Medium | Efficient indexing, lazy loading, cleanup old patterns |
| Schema migration failures | Low | High | Versioned schemas, migration functions, fallback to defaults |
| Privacy concerns | Medium | Medium | Clear opt-in, transparent data collection, easy deletion |

## Acceptance Criteria

- [ ] **AC-1**: Verify that selecting a theme (light/dark/system) persists after browser refresh and is applied immediately on app load.

- [ ] **AC-2**: Verify that default view mode, sort order, and filter settings are remembered and applied on subsequent visits.

- [ ] **AC-3**: Verify that when adding a new interest, the system suggests up to 5 relevant tags based on the URL/title and the user's tag history, with most-used tags appearing first.

- [ ] **AC-4**: Verify that the system tracks which content types the user adds most frequently, visible in a "Your Patterns" section in settings.

- [ ] **AC-5**: Verify that users can create a learning goal with title, description, timeframe, and target metric, and see it in a Goals panel.

- [ ] **AC-6**: Verify that goal progress updates automatically when interests matching the goal criteria are completed.

- [ ] **AC-7**: Verify that AI-generated study notes (from Obsidian integration) are saved and can be viewed later even if Obsidian is disconnected.

- [ ] **AC-8**: Verify that all preferences can be exported to a JSON file and imported to restore settings.

- [ ] **AC-9**: Verify that clearing all data removes preferences, patterns, goals, and AI insights, returning to default state.

- [ ] **AC-10**: Verify that the app loads and functions correctly if localStorage/IndexedDB is unavailable, using sensible defaults.

- [ ] **AC-11**: Verify that pattern tracking is opt-in with a clear explanation of what data is collected, displayed on first use.

- [ ] **AC-12**: Verify that existing Obsidian settings (`war-goat-obsidian-settings`) continue to work and are migrated to the unified system.

- [ ] **AC-13**: Verify that preference loading completes within 100ms (measurable in browser DevTools).

- [ ] **AC-14**: Verify that smart suggestions appear within 200ms of entering text in the tag/category fields.

## Out of Scope

- **Server-side storage** - All data stored locally in browser for MVP
- **Cross-device sync** - No sync between browsers/devices
- **Social features** - No sharing of goals or achievements
- **AI-powered goal suggestions** - Goals must be manually created
- **Spaced repetition system** - No automated review scheduling
- **Analytics dashboard** - Basic patterns display only, no detailed analytics

## Open Questions

All questions resolved with reasonable defaults for MVP:

- Q1: localStorage vs IndexedDB? **Resolved**: Use localStorage for preferences (<1KB), IndexedDB for goals and insights (potentially larger). [Blocker: no]
- Q2: How long to retain pattern data? **Resolved**: Keep last 90 days of patterns, with user option to extend. [Blocker: no]
- Q3: How to handle existing Obsidian settings? **Resolved**: Migrate to unified system, keep backwards compatibility. [Blocker: no]
- Q4: Should patterns be opt-in or opt-out? **Resolved**: Opt-in with clear disclosure on first use. [Blocker: no]

## Documentation Impact

- [ ] Update `docs/ARCHITECTURE.md` with preferences storage architecture
- [ ] Create `docs/USER-PREFERENCES.md` user guide for preferences and goals
- [ ] Update `src/types/index.ts` inline documentation
- [ ] Add migration notes for existing users

## Handoff Notes for Architecture

### Key Decisions Needed

1. **State Management Pattern**: Should preferences use React Context or individual hooks?
   - Recommendation: Create a PreferencesProvider context to avoid prop drilling

2. **Storage Strategy**: How to partition data between localStorage and IndexedDB?
   - Recommendation: localStorage for quick-load prefs, IndexedDB for goals/insights

3. **Migration Strategy**: How to migrate existing Obsidian settings?
   - Recommendation: Read old key on startup, migrate to new structure, preserve old key for rollback

4. **Pattern Analysis Approach**: When/how to analyze user patterns?
   - Recommendation: Debounced updates on item changes, daily aggregation for trends

5. **Suggestions UI Pattern**: How to present smart suggestions?
   - Recommendation: Inline chips in form fields, dismissible, learn from dismissals

### Suggested Approach

1. Define TypeScript interfaces for all new types (UserPreferences, LearningGoal, etc.)
2. Create PreferencesContext and useUserPreferences hook
3. Implement storage layer with localStorage/IndexedDB abstraction
4. Add SettingsPanel component for preference management
5. Create useLearningGoals hook and GoalsPanel component
6. Implement usePatterns hook for behavioral tracking
7. Add useSmartSuggestions hook for tag/category suggestions
8. Update AddInterestModal with suggestion chips
9. Add data export/import functionality
10. Implement privacy consent flow

### Type Definitions Sketch

```typescript
interface UserPreferences {
  version: number;
  theme: 'light' | 'dark' | 'system';
  defaultView: 'grid' | 'list';
  defaultSort: 'date' | 'title' | 'status';
  defaultFilters: FilterState;
  autoEnrich: boolean;
  obsidian: ObsidianSettings;
  privacy: PrivacySettings;
}

interface LearningGoal {
  id: string;
  title: string;
  description?: string;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'custom';
  targetType: 'items' | 'hours' | 'topics';
  targetValue: number;
  currentValue: number;
  startDate: string;
  endDate?: string;
  tags?: string[];
  categories?: string[];
  status: 'active' | 'completed' | 'abandoned';
}

interface UserPatterns {
  tagFrequency: Record<string, number>;
  typeFrequency: Record<SourceType, number>;
  categoryFrequency: Record<string, number>;
  statusTransitions: Record<string, Record<string, number>>;
  lastUpdated: string;
}

interface PrivacySettings {
  trackPatterns: boolean;
  consentGiven: boolean;
  consentDate?: string;
}
```
