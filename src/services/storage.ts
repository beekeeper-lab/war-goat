/**
 * Storage abstraction layer
 *
 * Provides unified interface for localStorage and IndexedDB operations
 * with error handling, validation, and migration support.
 */

import {
  DEFAULT_USER_PREFERENCES,
  DEFAULT_USER_PATTERNS,
  type UserPreferences,
  type UserPatterns,
  type LearningGoal,
  type AIInsight,
  type UserDataExport,
} from '../types';

// ============================================================================
// Storage Keys
// ============================================================================

export const PREFERENCES_KEY = 'war-goat-user-preferences';
export const PATTERNS_KEY = 'war-goat-user-patterns';
export const OLD_OBSIDIAN_KEY = 'war-goat-obsidian-settings'; // Backwards compat

// ============================================================================
// localStorage Operations
// ============================================================================

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
 * Reset the database connection (useful for testing)
 */
export function resetDBConnection(): void {
  dbPromise = null;
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
    return new Promise((resolve, reject) => {
      const tx = db.transaction([GOALS_STORE, INSIGHTS_STORE], 'readwrite');
      tx.objectStore(GOALS_STORE).clear();
      tx.objectStore(INSIGHTS_STORE).clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
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
 * Clear all stored data
 */
export async function clearAllData(): Promise<void> {
  localStorage.removeItem(PREFERENCES_KEY);
  localStorage.removeItem(PATTERNS_KEY);
  localStorage.removeItem(OLD_OBSIDIAN_KEY);
  // Also clear IndexedDB
  await clearIndexedDB();
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
