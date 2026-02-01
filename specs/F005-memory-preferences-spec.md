# F005: Memory & User Preferences - Implementation Spec

> **Source**: workflow/F005/2-architecture.md
> **Status**: Ready for Implementation
> **Last Updated**: 2026-01-20

## Quick Reference

### New Files to Create
1. `src/services/storage.ts` - LocalStorage/IndexedDB abstraction layer
2. `src/contexts/PreferencesContext.tsx` - React context for preferences
3. `src/hooks/useUserPreferences.ts` - User preferences hook
4. `src/hooks/useLearningGoals.ts` - Learning goals management hook
5. `src/hooks/usePatterns.ts` - User behavior patterns hook
6. `src/hooks/useSmartSuggestions.ts` - Tag/category suggestion hook
7. `src/components/SettingsPanel.tsx` - Settings UI panel
8. `src/components/GoalsPanel.tsx` - Learning goals UI panel
9. `src/components/SuggestionChips.tsx` - Inline tag/category suggestions
10. `src/components/PrivacyConsentModal.tsx` - Opt-in consent modal
11. `src/services/__tests__/storage.test.ts` - Storage layer tests
12. `src/hooks/__tests__/useUserPreferences.test.ts` - Preferences hook tests
13. `src/hooks/__tests__/useLearningGoals.test.ts` - Goals hook tests
14. `src/hooks/__tests__/usePatterns.test.ts` - Patterns hook tests
15. `src/hooks/__tests__/useSmartSuggestions.test.ts` - Suggestions hook tests

### Files to Modify
1. `src/types/index.ts` - Add UserPreferences, LearningGoal, UserPatterns, etc.
2. `src/hooks/useObsidianSettings.ts` - Integrate with unified preferences system
3. `src/App.tsx` - Add PreferencesProvider, theme application, settings access
4. `src/components/AddInterestModal.tsx` - Add smart suggestions for tags
5. `src/components/FilterBar.tsx` - Apply default filters from preferences
6. `src/components/Header.tsx` - Add settings button

### Storage Keys
- `war-goat-user-preferences` (localStorage) - Theme, view mode, sort, filters
- `war-goat-user-patterns` (localStorage) - Tag/type/category frequencies
- `war-goat-obsidian-settings` (localStorage) - Backwards compatible
- IndexedDB database: `war-goat-db`
  - Store: `learning-goals` - Goal objects
  - Store: `ai-insights` - Persisted AI content

---

## Architecture Decisions

### ADR-1: PreferencesContext for Global State
**Context**: Need to provide preferences throughout the app without prop drilling.
**Decision**: Use React Context with a PreferencesProvider at the app root. Individual hooks like `useUserPreferences()` consume this context.
**Alternatives**: Redux, Zustand, individual hooks with localStorage directly.
**Consequences**: Consistent access pattern, single source of truth, easy to test with mock providers.

### ADR-2: Hybrid localStorage + IndexedDB Storage
**Context**: Need to balance fast initial load with support for larger data.
**Decision**:
- localStorage for quick-load preferences (<1KB) - loads synchronously on app init
- IndexedDB for goals and AI insights (potentially larger, async loading acceptable)
**Alternatives**: All localStorage (size limits), all IndexedDB (slower initial load), server-side storage (out of scope for MVP).
**Consequences**: Fast initial theme/view rendering, larger data supported, more complex storage layer.

### ADR-3: Backwards Compatible Migration
**Context**: Existing users have Obsidian settings in `war-goat-obsidian-settings`.
**Decision**:
1. On app load, check if old key exists
2. If yes and new key doesn't exist, migrate data to new structure
3. Keep old key for 30 days (rollback safety)
4. After migration, write to both keys for compatibility
**Alternatives**: Breaking migration, parallel storage indefinitely.
**Consequences**: Smooth upgrade path, no data loss, slightly more complex write logic initially.

### ADR-4: Opt-in Pattern Tracking
**Context**: Privacy requirement - pattern tracking must be user-consented.
**Decision**:
1. Show PrivacyConsentModal on first app load
2. Store `privacy.consentGiven` and `privacy.trackPatterns` flags
3. Pattern tracking only runs if `trackPatterns: true`
4. Clear explanation of what data is collected
**Alternatives**: Opt-out model, no tracking, server-side anonymized tracking.
**Consequences**: User trust, GDPR-friendly, some users won't enable tracking.

### ADR-5: Debounced Pattern Updates
**Context**: Need to track user behavior without performance impact.
**Decision**:
1. Queue pattern updates on interest add/update/delete
2. Debounce writes to storage (500ms delay)
3. Daily aggregation cleanup for patterns older than 90 days
**Alternatives**: Immediate writes, batch at session end, server-side aggregation.
**Consequences**: Good performance, patterns reflect recent behavior, storage stays manageable.

---

## Technical Design

### Data Models

```typescript
// src/types/index.ts - Add these interfaces

// ============================================================================
// User Preferences Types (F005)
// ============================================================================

/**
 * Theme setting for the application
 */
export type ThemeSetting = 'light' | 'dark' | 'system';

/**
 * View mode for the interest list
 */
export type ViewMode = 'grid' | 'list';

/**
 * Sort order for the interest list
 */
export type SortOrder = 'date' | 'title' | 'status';

/**
 * Privacy settings for user data collection
 */
export interface PrivacySettings {
  trackPatterns: boolean;
  consentGiven: boolean;
  consentDate?: string;
}

/**
 * Default filter state to apply on app load
 */
export interface DefaultFilters {
  type: SourceType | 'all';
  status: ItemStatus | 'all';
  category: string | 'all';
}

/**
 * User preferences - stored in localStorage
 * Schema version enables future migrations
 */
export interface UserPreferences {
  version: number;
  theme: ThemeSetting;
  defaultView: ViewMode;
  defaultSort: SortOrder;
  defaultFilters: DefaultFilters;
  autoEnrich: boolean;
  obsidian: ObsidianSettings;
  privacy: PrivacySettings;
}

/**
 * Default preferences for new users
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  version: 1,
  theme: 'system',
  defaultView: 'grid',
  defaultSort: 'date',
  defaultFilters: {
    type: 'all',
    status: 'all',
    category: 'all',
  },
  autoEnrich: true,
  obsidian: {
    enabled: true,
    defaultFolder: 'War Goat',
    includeTranscript: true,
    generateStudyNotes: false,
    autoSyncOnCreate: false,
  },
  privacy: {
    trackPatterns: false,
    consentGiven: false,
  },
};

// ============================================================================
// Learning Goals Types
// ============================================================================

/**
 * Timeframe for a learning goal
 */
export type GoalTimeframe = 'daily' | 'weekly' | 'monthly' | 'custom';

/**
 * Type of target metric for a goal
 */
export type GoalTargetType = 'items' | 'hours' | 'topics';

/**
 * Status of a learning goal
 */
export type GoalStatus = 'active' | 'completed' | 'abandoned';

/**
 * A learning goal - stored in IndexedDB
 */
export interface LearningGoal {
  id: string;
  title: string;
  description?: string;
  timeframe: GoalTimeframe;
  targetType: GoalTargetType;
  targetValue: number;
  currentValue: number;
  startDate: string;
  endDate?: string;
  tags?: string[];       // Filter matching items by tags
  categories?: string[]; // Filter matching items by categories
  contentTypes?: SourceType[]; // Filter matching items by type
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// User Patterns Types
// ============================================================================

/**
 * User behavior patterns - stored in localStorage
 * Tracks frequency of user interactions
 */
export interface UserPatterns {
  version: number;
  tagFrequency: Record<string, number>;
  typeFrequency: Record<SourceType, number>;
  categoryFrequency: Record<string, number>;
  statusTransitions: Record<string, Record<string, number>>;
  recentTags: string[]; // Last 20 unique tags used
  lastUpdated: string;
}

/**
 * Default patterns for new users
 */
export const DEFAULT_USER_PATTERNS: UserPatterns = {
  version: 1,
  tagFrequency: {},
  typeFrequency: {
    youtube: 0,
    book: 0,
    audiobook: 0,
    article: 0,
    podcast: 0,
    github: 0,
    other: 0,
  },
  categoryFrequency: {},
  statusTransitions: {},
  recentTags: [],
  lastUpdated: new Date().toISOString(),
};

// ============================================================================
// AI Insights Types
// ============================================================================

/**
 * AI-generated insights for an item - stored in IndexedDB
 */
export interface AIInsight {
  id: string;
  interestId: string;
  studyNotes?: StudyNotes;
  summary?: string;
  keyTopics?: string[];
  relatedItemIds?: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Export Data Types
// ============================================================================

/**
 * Complete export of all user data
 */
export interface UserDataExport {
  exportedAt: string;
  version: number;
  preferences: UserPreferences;
  patterns: UserPatterns;
  goals: LearningGoal[];
  insights: AIInsight[];
}
```

### Storage Layer Design

```typescript
// src/services/storage.ts

/**
 * Storage abstraction layer
 *
 * Provides unified interface for localStorage and IndexedDB operations
 * with error handling, validation, and migration support.
 */

// ============================================================================
// localStorage Operations
// ============================================================================

const PREFERENCES_KEY = 'war-goat-user-preferences';
const PATTERNS_KEY = 'war-goat-user-patterns';
const OLD_OBSIDIAN_KEY = 'war-goat-obsidian-settings'; // Backwards compat

/**
 * Load preferences from localStorage
 * Handles migration from old obsidian settings
 */
export function loadPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return migratePreferences(parsed);
    }

    // Check for old obsidian settings to migrate
    const oldObsidian = localStorage.getItem(OLD_OBSIDIAN_KEY);
    if (oldObsidian) {
      const obsidianSettings = JSON.parse(oldObsidian);
      const migrated = {
        ...DEFAULT_USER_PREFERENCES,
        obsidian: { ...DEFAULT_USER_PREFERENCES.obsidian, ...obsidianSettings },
      };
      savePreferences(migrated);
      return migrated;
    }
  } catch (err) {
    console.error('Failed to load preferences:', err);
  }
  return DEFAULT_USER_PREFERENCES;
}

/**
 * Save preferences to localStorage
 * Also writes to old obsidian key for backwards compatibility
 */
export function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    // Backwards compatibility
    localStorage.setItem(OLD_OBSIDIAN_KEY, JSON.stringify(prefs.obsidian));
  } catch (err) {
    console.error('Failed to save preferences:', err);
  }
}

/**
 * Migrate preferences schema if needed
 */
function migratePreferences(prefs: Partial<UserPreferences>): UserPreferences {
  // Version 1 is current, no migration needed yet
  // Future migrations will check prefs.version and transform
  return { ...DEFAULT_USER_PREFERENCES, ...prefs };
}

/**
 * Load patterns from localStorage
 */
export function loadPatterns(): UserPatterns {
  try {
    const stored = localStorage.getItem(PATTERNS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return migratePatterns(parsed);
    }
  } catch (err) {
    console.error('Failed to load patterns:', err);
  }
  return DEFAULT_USER_PATTERNS;
}

/**
 * Save patterns to localStorage
 */
export function savePatterns(patterns: UserPatterns): void {
  try {
    localStorage.setItem(PATTERNS_KEY, JSON.stringify({
      ...patterns,
      lastUpdated: new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Failed to save patterns:', err);
  }
}

/**
 * Migrate patterns schema if needed
 */
function migratePatterns(patterns: Partial<UserPatterns>): UserPatterns {
  return { ...DEFAULT_USER_PATTERNS, ...patterns };
}

/**
 * Clear all stored data
 */
export function clearAllData(): void {
  localStorage.removeItem(PREFERENCES_KEY);
  localStorage.removeItem(PATTERNS_KEY);
  localStorage.removeItem(OLD_OBSIDIAN_KEY);
  // Also clear IndexedDB
  clearIndexedDB();
}

// ============================================================================
// IndexedDB Operations
// ============================================================================

const DB_NAME = 'war-goat-db';
const DB_VERSION = 1;
const GOALS_STORE = 'learning-goals';
const INSIGHTS_STORE = 'ai-insights';

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open IndexedDB database (lazy singleton)
 */
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(GOALS_STORE)) {
        db.createObjectStore(GOALS_STORE, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(INSIGHTS_STORE)) {
        const store = db.createObjectStore(INSIGHTS_STORE, { keyPath: 'id' });
        store.createIndex('interestId', 'interestId', { unique: false });
      }
    };
  });

  return dbPromise;
}

/**
 * Load all learning goals from IndexedDB
 */
export async function loadGoals(): Promise<LearningGoal[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GOALS_STORE, 'readonly');
      const store = tx.objectStore(GOALS_STORE);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  } catch (err) {
    console.error('Failed to load goals:', err);
    return [];
  }
}

/**
 * Save a learning goal to IndexedDB
 */
export async function saveGoal(goal: LearningGoal): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GOALS_STORE, 'readwrite');
      const store = tx.objectStore(GOALS_STORE);
      const request = store.put(goal);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (err) {
    console.error('Failed to save goal:', err);
  }
}

/**
 * Delete a learning goal from IndexedDB
 */
export async function deleteGoal(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GOALS_STORE, 'readwrite');
      const store = tx.objectStore(GOALS_STORE);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (err) {
    console.error('Failed to delete goal:', err);
  }
}

/**
 * Load AI insights for an interest from IndexedDB
 */
export async function loadInsight(interestId: string): Promise<AIInsight | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(INSIGHTS_STORE, 'readonly');
      const store = tx.objectStore(INSIGHTS_STORE);
      const index = store.index('interestId');
      const request = index.get(interestId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (err) {
    console.error('Failed to load insight:', err);
    return null;
  }
}

/**
 * Save AI insight to IndexedDB
 */
export async function saveInsight(insight: AIInsight): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(INSIGHTS_STORE, 'readwrite');
      const store = tx.objectStore(INSIGHTS_STORE);
      const request = store.put(insight);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (err) {
    console.error('Failed to save insight:', err);
  }
}

/**
 * Load all AI insights from IndexedDB
 */
export async function loadAllInsights(): Promise<AIInsight[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(INSIGHTS_STORE, 'readonly');
      const store = tx.objectStore(INSIGHTS_STORE);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  } catch (err) {
    console.error('Failed to load insights:', err);
    return [];
  }
}

/**
 * Clear all IndexedDB data
 */
async function clearIndexedDB(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([GOALS_STORE, INSIGHTS_STORE], 'readwrite');
    tx.objectStore(GOALS_STORE).clear();
    tx.objectStore(INSIGHTS_STORE).clear();
  } catch (err) {
    console.error('Failed to clear IndexedDB:', err);
  }
}

// ============================================================================
// Export/Import Operations
// ============================================================================

/**
 * Export all user data to JSON
 */
export async function exportAllData(): Promise<UserDataExport> {
  const [goals, insights] = await Promise.all([
    loadGoals(),
    loadAllInsights(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    preferences: loadPreferences(),
    patterns: loadPatterns(),
    goals,
    insights,
  };
}

/**
 * Import user data from JSON export
 */
export async function importAllData(data: UserDataExport): Promise<void> {
  // Validate version
  if (data.version !== 1) {
    throw new Error(`Unsupported export version: ${data.version}`);
  }

  // Import preferences
  if (data.preferences) {
    savePreferences(migratePreferences(data.preferences));
  }

  // Import patterns
  if (data.patterns) {
    savePatterns(migratePatterns(data.patterns));
  }

  // Import goals
  if (data.goals) {
    for (const goal of data.goals) {
      await saveGoal(goal);
    }
  }

  // Import insights
  if (data.insights) {
    for (const insight of data.insights) {
      await saveInsight(insight);
    }
  }
}

/**
 * Check if storage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}
```

### Context and Hook Design

```typescript
// src/contexts/PreferencesContext.tsx

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { UserPreferences, UserPatterns, LearningGoal } from '../types';
import * as storage from '../services/storage';

interface PreferencesContextValue {
  // Preferences
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;

  // Patterns
  patterns: UserPatterns;
  recordTagUsage: (tags: string[]) => void;
  recordTypeUsage: (type: SourceType) => void;
  recordCategoryUsage: (categories: string[]) => void;

  // Goals
  goals: LearningGoal[];
  addGoal: (goal: Omit<LearningGoal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<LearningGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  // Privacy consent
  showConsentModal: boolean;
  setConsentGiven: (trackPatterns: boolean) => void;

  // Export/Import
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<void>;
  clearAllData: () => void;

  // Loading state
  isLoading: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    storage.loadPreferences()
  );
  const [patterns, setPatterns] = useState<UserPatterns>(() =>
    storage.loadPatterns()
  );
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Load async data (goals)
  useEffect(() => {
    async function loadAsyncData() {
      const loadedGoals = await storage.loadGoals();
      setGoals(loadedGoals);
      setIsLoading(false);

      // Show consent modal if not yet given
      if (!preferences.privacy.consentGiven) {
        setShowConsentModal(true);
      }
    }
    loadAsyncData();
  }, []);

  // Save preferences on change
  useEffect(() => {
    storage.savePreferences(preferences);
  }, [preferences]);

  // Debounced pattern save
  useEffect(() => {
    const timer = setTimeout(() => {
      storage.savePatterns(patterns);
    }, 500);
    return () => clearTimeout(timer);
  }, [patterns]);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(storage.DEFAULT_USER_PREFERENCES);
  }, []);

  const recordTagUsage = useCallback((tags: string[]) => {
    if (!preferences.privacy.trackPatterns) return;

    setPatterns(prev => {
      const newFreq = { ...prev.tagFrequency };
      const newRecent = [...prev.recentTags];

      for (const tag of tags) {
        newFreq[tag] = (newFreq[tag] || 0) + 1;
        // Add to recent, keeping last 20 unique
        const idx = newRecent.indexOf(tag);
        if (idx > -1) newRecent.splice(idx, 1);
        newRecent.unshift(tag);
      }

      return {
        ...prev,
        tagFrequency: newFreq,
        recentTags: newRecent.slice(0, 20),
      };
    });
  }, [preferences.privacy.trackPatterns]);

  // ... similar implementations for recordTypeUsage, recordCategoryUsage

  const setConsentGiven = useCallback((trackPatterns: boolean) => {
    setPreferences(prev => ({
      ...prev,
      privacy: {
        trackPatterns,
        consentGiven: true,
        consentDate: new Date().toISOString(),
      },
    }));
    setShowConsentModal(false);
  }, []);

  const addGoal = useCallback(async (goal: Omit<LearningGoal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newGoal: LearningGoal = {
      ...goal,
      id: crypto.randomUUID(),
      currentValue: 0,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    await storage.saveGoal(newGoal);
    setGoals(prev => [...prev, newGoal]);
  }, []);

  const updateGoal = useCallback(async (id: string, updates: Partial<LearningGoal>) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== id) return g;
      const updated = { ...g, ...updates, updatedAt: new Date().toISOString() };
      storage.saveGoal(updated);
      return updated;
    }));
  }, []);

  const deleteGoal = useCallback(async (id: string) => {
    await storage.deleteGoal(id);
    setGoals(prev => prev.filter(g => g.id !== id));
  }, []);

  const exportData = useCallback(async () => {
    const data = await storage.exportAllData();
    return JSON.stringify(data, null, 2);
  }, []);

  const importData = useCallback(async (json: string) => {
    const data = JSON.parse(json);
    await storage.importAllData(data);
    // Reload state
    setPreferences(storage.loadPreferences());
    setPatterns(storage.loadPatterns());
    setGoals(await storage.loadGoals());
  }, []);

  const clearAllData = useCallback(() => {
    storage.clearAllData();
    setPreferences(storage.DEFAULT_USER_PREFERENCES);
    setPatterns(storage.DEFAULT_USER_PATTERNS);
    setGoals([]);
    setShowConsentModal(true);
  }, []);

  return (
    <PreferencesContext.Provider value={{
      preferences,
      updatePreferences,
      resetPreferences,
      patterns,
      recordTagUsage,
      recordTypeUsage: () => {}, // implement similarly
      recordCategoryUsage: () => {}, // implement similarly
      goals,
      addGoal,
      updateGoal,
      deleteGoal,
      showConsentModal,
      setConsentGiven,
      exportData,
      importData,
      clearAllData,
      isLoading,
    }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
}
```

### Component Design

```
ComponentTree:
├── App.tsx (wrap with PreferencesProvider)
│   ├── PrivacyConsentModal.tsx (NEW - shown on first load)
│   ├── Header.tsx (modified - add Settings button)
│   │   └── settings icon button
│   ├── SettingsPanel.tsx (NEW - slide-out panel)
│   │   ├── ThemeSelector
│   │   ├── ViewPreferences
│   │   ├── PatternsDisplay (Your Patterns section)
│   │   ├── PrivacyControls
│   │   └── ExportImportButtons
│   ├── GoalsPanel.tsx (NEW - accessible from header)
│   │   ├── GoalCard (repeated)
│   │   └── AddGoalForm
│   ├── AddInterestModal.tsx (modified)
│   │   └── SuggestionChips.tsx (NEW - tag suggestions)
│   └── FilterBar.tsx (modified - apply default filters)
```

#### SuggestionChips Component
```typescript
// src/components/SuggestionChips.tsx

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  selectedTags: string[];
}

/**
 * Displays inline clickable chips for tag/category suggestions
 *
 * - Shows up to 5 suggestions
 * - Most frequent first
 * - Excludes already-selected tags
 * - Click to add
 */
export function SuggestionChips({ suggestions, onSelect, selectedTags }: SuggestionChipsProps) {
  const availableSuggestions = suggestions
    .filter(s => !selectedTags.includes(s))
    .slice(0, 5);

  if (availableSuggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      <span className="text-xs text-gray-500">Suggestions:</span>
      {availableSuggestions.map(suggestion => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onSelect(suggestion)}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-olive-100 rounded-full transition-colors"
        >
          + {suggestion}
        </button>
      ))}
    </div>
  );
}
```

### Smart Suggestions Hook

```typescript
// src/hooks/useSmartSuggestions.ts

import { useMemo } from 'react';
import { usePreferences } from '../contexts/PreferencesContext';

interface SmartSuggestionOptions {
  title?: string;
  url?: string;
  currentTags?: string[];
}

/**
 * Hook that provides smart tag suggestions based on:
 * 1. User's most-used tags (from patterns)
 * 2. Recent tags (last 20 used)
 * 3. Title/URL analysis (basic keyword extraction)
 */
export function useSmartSuggestions({ title, url, currentTags = [] }: SmartSuggestionOptions) {
  const { patterns, preferences } = usePreferences();

  const suggestions = useMemo(() => {
    if (!preferences.privacy.trackPatterns) {
      // Without tracking, just do basic keyword extraction
      return extractKeywords(title, url).slice(0, 5);
    }

    // Combine frequency-based and recent tags
    const frequencySorted = Object.entries(patterns.tagFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);

    // Extract keywords from title/URL
    const keywords = extractKeywords(title, url);

    // Merge: prioritize matching keywords, then frequency
    const merged = new Set<string>();

    // First add keywords that match user's tags
    for (const kw of keywords) {
      if (patterns.tagFrequency[kw]) {
        merged.add(kw);
      }
    }

    // Then add recent tags
    for (const tag of patterns.recentTags) {
      if (merged.size >= 10) break;
      merged.add(tag);
    }

    // Then add frequent tags
    for (const tag of frequencySorted) {
      if (merged.size >= 10) break;
      merged.add(tag);
    }

    // Filter out already selected
    return Array.from(merged).filter(t => !currentTags.includes(t));
  }, [patterns, preferences.privacy.trackPatterns, title, url, currentTags]);

  return suggestions;
}

/**
 * Extract potential tags from title and URL
 */
function extractKeywords(title?: string, url?: string): string[] {
  const keywords = new Set<string>();

  if (title) {
    // Common programming/tech terms
    const techTerms = [
      'react', 'typescript', 'javascript', 'python', 'rust', 'go',
      'api', 'database', 'testing', 'performance', 'security',
      'tutorial', 'guide', 'introduction', 'advanced',
    ];

    const titleLower = title.toLowerCase();
    for (const term of techTerms) {
      if (titleLower.includes(term)) {
        keywords.add(term);
      }
    }
  }

  if (url) {
    // Extract domain hints
    if (url.includes('github.com')) keywords.add('github');
    if (url.includes('youtube.com')) keywords.add('video');
    if (url.includes('medium.com')) keywords.add('article');
  }

  return Array.from(keywords);
}
```

---

## File Changes Detail

### Files to Create

| File | Purpose |
|------|---------|
| `src/services/storage.ts` | localStorage/IndexedDB abstraction with migration support |
| `src/contexts/PreferencesContext.tsx` | React context for app-wide preferences |
| `src/hooks/useUserPreferences.ts` | Thin wrapper around context (for backwards compat pattern) |
| `src/hooks/useLearningGoals.ts` | Goals-specific operations hook |
| `src/hooks/usePatterns.ts` | Pattern tracking hook |
| `src/hooks/useSmartSuggestions.ts` | Tag/category suggestion generation |
| `src/components/SettingsPanel.tsx` | Settings UI panel component |
| `src/components/GoalsPanel.tsx` | Learning goals UI panel |
| `src/components/SuggestionChips.tsx` | Inline tag suggestion chips |
| `src/components/PrivacyConsentModal.tsx` | First-run consent modal |
| `src/services/__tests__/storage.test.ts` | Storage layer unit tests |
| `src/hooks/__tests__/useUserPreferences.test.ts` | Preferences hook tests |
| `src/hooks/__tests__/useLearningGoals.test.ts` | Goals hook tests |
| `src/hooks/__tests__/usePatterns.test.ts` | Patterns hook tests |
| `src/hooks/__tests__/useSmartSuggestions.test.ts` | Suggestions hook tests |

### Files to Modify

| File | Changes |
|------|---------|
| `src/types/index.ts` | Add all new type definitions (UserPreferences, LearningGoal, etc.) |
| `src/hooks/useObsidianSettings.ts` | Refactor to use PreferencesContext internally |
| `src/App.tsx` | Wrap with PreferencesProvider, apply theme, add settings/goals access |
| `src/components/AddInterestModal.tsx` | Add SuggestionChips, record tag usage on submit |
| `src/components/FilterBar.tsx` | Apply default filters from preferences on mount |
| `src/components/Header.tsx` | Add Settings and Goals buttons |

### Test Files (TDD)

| File | Type | Tests to Write |
|------|------|----------------|
| `src/services/__tests__/storage.test.ts` | Unit | localStorage CRUD, IndexedDB CRUD, migration, export/import |
| `src/hooks/__tests__/useUserPreferences.test.ts` | Unit | load, save, reset, theme changes |
| `src/hooks/__tests__/useLearningGoals.test.ts` | Unit | CRUD operations, progress tracking |
| `src/hooks/__tests__/usePatterns.test.ts` | Unit | frequency tracking, opt-in behavior |
| `src/hooks/__tests__/useSmartSuggestions.test.ts` | Unit | suggestion generation, keyword extraction |

---

## Implementation Plan (TDD)

### Phase 1: Write Failing Tests (RED)

#### Unit Tests - Storage Layer
```typescript
// src/services/__tests__/storage.test.ts

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
    // Clear IndexedDB
  });

  describe('loadPreferences', () => {
    test('returns default preferences when nothing stored');
    test('loads stored preferences');
    test('migrates old obsidian settings');
    test('handles corrupted data gracefully');
  });

  describe('savePreferences', () => {
    test('saves to localStorage');
    test('also saves obsidian settings to old key for backwards compat');
  });

  describe('loadPatterns', () => {
    test('returns default patterns when nothing stored');
    test('loads stored patterns');
  });

  describe('savePatterns', () => {
    test('saves to localStorage');
    test('updates lastUpdated timestamp');
  });

  describe('IndexedDB operations', () => {
    test('loadGoals returns empty array initially');
    test('saveGoal persists goal');
    test('deleteGoal removes goal');
    test('loadInsight returns null for unknown ID');
    test('saveInsight persists insight');
  });

  describe('exportAllData', () => {
    test('exports preferences, patterns, goals, insights');
  });

  describe('importAllData', () => {
    test('imports all data from export');
    test('throws on version mismatch');
  });

  describe('clearAllData', () => {
    test('removes all localStorage keys');
    test('clears IndexedDB stores');
  });

  describe('isStorageAvailable', () => {
    test('returns true when localStorage works');
    test('returns false when localStorage throws');
  });
});
```

#### Unit Tests - Hooks
```typescript
// src/hooks/__tests__/useUserPreferences.test.ts

describe('useUserPreferences', () => {
  test('loads preferences on mount');
  test('updatePreferences saves changes');
  test('resetPreferences restores defaults');
  test('theme change triggers save');
});

// src/hooks/__tests__/useLearningGoals.test.ts

describe('useLearningGoals', () => {
  test('loads goals from IndexedDB on mount');
  test('addGoal creates goal with generated ID');
  test('updateGoal modifies existing goal');
  test('deleteGoal removes goal');
  test('goal progress updates when matching items completed');
});

// src/hooks/__tests__/usePatterns.test.ts

describe('usePatterns', () => {
  test('does not track when trackPatterns is false');
  test('recordTagUsage increments frequency');
  test('recordTagUsage updates recentTags');
  test('recordTypeUsage increments type frequency');
  test('debounces saves to avoid excessive writes');
});

// src/hooks/__tests__/useSmartSuggestions.test.ts

describe('useSmartSuggestions', () => {
  test('returns empty array when no patterns and no title');
  test('suggests frequent tags when patterns enabled');
  test('extracts keywords from title');
  test('excludes already-selected tags');
  test('limits to 5 suggestions');
  test('prioritizes matching keywords over frequency');
});
```

### Phase 2: Implement Storage Layer (GREEN)

1. **Add TypeScript types**
   - Add all interfaces to `src/types/index.ts`
   - Run `npm run build` to verify types

2. **Create storage service**
   - Create `src/services/storage.ts`
   - Implement localStorage functions
   - Implement IndexedDB functions
   - Implement export/import
   - Run storage tests

### Phase 3: Implement Context and Hooks (GREEN)

1. **Create PreferencesContext**
   - Create `src/contexts/PreferencesContext.tsx`
   - Implement all context operations
   - Run hook tests

2. **Create individual hooks**
   - `useUserPreferences.ts` - wraps context
   - `useLearningGoals.ts` - goals operations
   - `usePatterns.ts` - pattern tracking
   - `useSmartSuggestions.ts` - suggestion logic

### Phase 4: Implement Components (GREEN)

1. **Create PrivacyConsentModal**
   - Clear explanation of data collection
   - Enable/disable tracking toggle
   - Continue button

2. **Create SettingsPanel**
   - Theme selector (light/dark/system)
   - View mode toggle (grid/list)
   - Sort order dropdown
   - Patterns display section
   - Export/Import buttons
   - Clear data button

3. **Create GoalsPanel**
   - Goal list with progress bars
   - Add goal form
   - Edit/delete goal actions

4. **Create SuggestionChips**
   - Clickable tag chips
   - Dismiss/add functionality

5. **Modify AddInterestModal**
   - Add SuggestionChips below tags input
   - Record tag usage on submit

6. **Modify FilterBar**
   - Apply default filters on mount

7. **Modify Header**
   - Add Settings button
   - Add Goals button

8. **Modify App.tsx**
   - Wrap with PreferencesProvider
   - Apply theme to document
   - Render PrivacyConsentModal
   - Render SettingsPanel
   - Render GoalsPanel

### Phase 5: Integration (GREEN)

1. **Wire up goal progress tracking**
   - Hook into interest status changes
   - Update goal progress when items complete

2. **Wire up AI insights persistence**
   - Save study notes from Obsidian export
   - Load saved insights when viewing item

3. **Run all tests**

### Phase 6: Refactor

1. Clean up component styles
2. Add loading states
3. Add error boundaries
4. Performance optimize (memoization)

---

## Step-by-Step Tasks for Implementor

IMPORTANT: Execute in order. Each step should be completable independently.

### Task 1: Add TypeScript Types
**Files**: `src/types/index.ts`
**Description**: Add all new type definitions for preferences, goals, patterns, and insights
**Test First**: `npm run build` should pass
**Verification**: Types compile without errors

### Task 2: Write Storage Layer Tests
**Files**: `src/services/__tests__/storage.test.ts`
**Description**: Write comprehensive tests for storage operations (RED phase)
**Verification**: Tests exist but fail (no implementation yet)

### Task 3: Implement Storage Layer
**Files**: `src/services/storage.ts`
**Description**: Implement localStorage and IndexedDB operations with migration
**Test First**: Run storage tests
**Verification**: `npm run test -- storage` passes

### Task 4: Write Hook Tests
**Files**:
- `src/hooks/__tests__/useUserPreferences.test.ts`
- `src/hooks/__tests__/useLearningGoals.test.ts`
- `src/hooks/__tests__/usePatterns.test.ts`
- `src/hooks/__tests__/useSmartSuggestions.test.ts`
**Description**: Write tests for all new hooks (RED phase)
**Verification**: Tests exist but fail

### Task 5: Create PreferencesContext
**Files**: `src/contexts/PreferencesContext.tsx`
**Description**: Implement React context with all preference operations
**Test First**: Hook tests
**Verification**: Context provides all expected values

### Task 6: Create Individual Hooks
**Files**:
- `src/hooks/useUserPreferences.ts`
- `src/hooks/useLearningGoals.ts`
- `src/hooks/usePatterns.ts`
- `src/hooks/useSmartSuggestions.ts`
**Description**: Create hooks that consume context
**Verification**: Hook tests pass

### Task 7: Update useObsidianSettings
**Files**: `src/hooks/useObsidianSettings.ts`
**Description**: Refactor to use PreferencesContext internally while maintaining same API
**Verification**: Existing Obsidian functionality unchanged

### Task 8: Create PrivacyConsentModal
**Files**: `src/components/PrivacyConsentModal.tsx`
**Description**: First-run modal for privacy consent
**Verification**: Modal renders, consent updates preferences

### Task 9: Create SettingsPanel
**Files**: `src/components/SettingsPanel.tsx`
**Description**: Settings UI with theme, view mode, patterns display, export/import
**Verification**: Settings changes persist after refresh

### Task 10: Create GoalsPanel
**Files**: `src/components/GoalsPanel.tsx`
**Description**: Goals list with CRUD UI
**Verification**: Can add, edit, delete goals

### Task 11: Create SuggestionChips
**Files**: `src/components/SuggestionChips.tsx`
**Description**: Inline tag suggestion chips
**Verification**: Chips render and click handler works

### Task 12: Update AddInterestModal
**Files**: `src/components/AddInterestModal.tsx`
**Description**: Add SuggestionChips below tags input, record usage on submit
**Verification**: Suggestions appear, clicking adds tag

### Task 13: Update FilterBar
**Files**: `src/components/FilterBar.tsx`
**Description**: Apply default filters from preferences on mount
**Verification**: Default filters applied after refresh

### Task 14: Update Header
**Files**: `src/components/Header.tsx`
**Description**: Add Settings and Goals buttons
**Verification**: Buttons appear and open respective panels

### Task 15: Update App.tsx
**Files**: `src/App.tsx`
**Description**: Wrap with PreferencesProvider, apply theme, add panels
**Verification**: Theme applies, panels accessible

### Task 16: Wire Up Goal Progress
**Files**: Update hooks/context
**Description**: Track goal progress when interests are completed
**Verification**: Completing items updates matching goal progress

### Task 17: Wire Up AI Insights
**Files**: `src/services/storage.ts`, relevant components
**Description**: Save and load AI insights from IndexedDB
**Verification**: Study notes persist after disconnect

### Task 18: Final Verification
**Run all tests**:
```bash
npm run test
npm run build
```
**Manual testing**:
- Refresh app, verify settings persist
- Change theme, verify immediate application
- Add interest, verify tag suggestions appear
- Create goal, complete matching items, verify progress
- Export data, clear all, import data, verify restoration
- Test with localStorage disabled (fallback to defaults)

---

## Acceptance Criteria Mapping

| AC | How Implemented | How Tested |
|----|-----------------|------------|
| AC-1 | Theme in preferences, applied on App mount | Manual test + E2E |
| AC-2 | defaultView, defaultSort, defaultFilters in preferences | Manual test + unit test |
| AC-3 | useSmartSuggestions hook, SuggestionChips component | Unit test for hook |
| AC-4 | patterns.typeFrequency displayed in SettingsPanel | Unit test for patterns |
| AC-5 | GoalsPanel with addGoal form | Unit test for goals hook |
| AC-6 | Goal progress updates in context when items complete | Unit test + manual |
| AC-7 | AIInsight stored in IndexedDB, loaded when viewing | Storage unit test |
| AC-8 | exportAllData(), download as JSON | Storage unit test |
| AC-9 | clearAllData() removes all keys and IndexedDB | Storage unit test |
| AC-10 | isStorageAvailable() check, fallback to defaults | Storage unit test |
| AC-11 | PrivacyConsentModal on first load, trackPatterns flag | Manual test |
| AC-12 | Migration in loadPreferences(), write to both keys | Storage unit test |
| AC-13 | Preferences load from localStorage (sync) | Manual DevTools timing |
| AC-14 | useMemo in useSmartSuggestions | Manual test |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Storage quota exceeded | Track storage usage, warn at 4MB, provide cleanup |
| Data loss on clear | Export feature, confirmation dialog before clear |
| Schema migration fails | Versioned schemas, fallback to defaults, preserve raw data |
| Performance with large patterns | Limit history to 90 days, aggregate older data |
| IndexedDB not available | Fall back to in-memory for session, warn user |

---

## Open Questions Resolved

| Question | Answer |
|----------|--------|
| localStorage vs IndexedDB | Hybrid: localStorage for prefs, IndexedDB for goals/insights |
| Pattern retention | 90 days default, cleanup on load |
| Obsidian migration | Auto-migrate, keep old key for 30 days |
| Pattern tracking opt-in | First-run consent modal with clear explanation |

---

## Handoff to Implementor Agent

### Critical Notes
1. **Test First**: Write failing tests before implementing each function
2. **Storage First**: Storage layer must work before hooks
3. **Context Before Components**: Hooks depend on context
4. **Backwards Compatibility**: useObsidianSettings API must not change
5. **Theme Application**: Apply theme class to document.documentElement

### Recommended Order
1. Types (foundation)
2. Storage layer + tests
3. PreferencesContext + tests
4. Individual hooks + tests
5. Components (bottom-up: SuggestionChips before AddInterestModal)
6. App.tsx integration
7. Goal progress wiring
8. Final E2E testing

### Watch Out For
- IndexedDB is async - don't block render
- localStorage is sync - safe for initial state
- Theme needs to apply before first paint (use CSS variables or document class)
- SuggestionChips should debounce keyboard input
- Export file should have .json extension
- Clear data needs confirmation dialog
- Privacy modal should not be dismissible without choice

---

*Generated by Architecture Agent*
*Timestamp: 2026-01-20T14:00:00-05:00*
