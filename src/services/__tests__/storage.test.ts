/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import {
  loadPreferences,
  savePreferences,
  loadPatterns,
  savePatterns,
  loadGoals,
  saveGoal,
  deleteGoal,
  loadInsight,
  saveInsight,
  loadAllInsights,
  exportAllData,
  importAllData,
  clearAllData,
  isStorageAvailable,
  resetDBConnection,
  PREFERENCES_KEY,
  PATTERNS_KEY,
  OLD_OBSIDIAN_KEY,
} from '../storage';
import {
  DEFAULT_USER_PREFERENCES,
  DEFAULT_USER_PATTERNS,
  type UserPreferences,
  type UserPatterns,
  type LearningGoal,
  type AIInsight,
  type UserDataExport,
} from '../../types';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
    // Create a fresh IndexedDB instance for each test
    vi.stubGlobal('indexedDB', new IDBFactory());
    // Reset the DB connection singleton to force reconnection
    resetDBConnection();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // Reset connection after each test
    resetDBConnection();
  });

  describe('loadPreferences', () => {
    test('returns default preferences when nothing stored', () => {
      const prefs = loadPreferences();
      expect(prefs).toEqual(DEFAULT_USER_PREFERENCES);
    });

    test('loads stored preferences', () => {
      const customPrefs: UserPreferences = {
        ...DEFAULT_USER_PREFERENCES,
        theme: 'dark',
        defaultView: 'list',
      };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(customPrefs));

      const prefs = loadPreferences();
      expect(prefs.theme).toBe('dark');
      expect(prefs.defaultView).toBe('list');
    });

    test('migrates old obsidian settings', () => {
      const oldSettings = {
        enabled: true,
        defaultFolder: 'Custom Folder',
        includeTranscript: false,
        generateStudyNotes: true,
        autoSyncOnCreate: true,
      };
      localStorage.setItem(OLD_OBSIDIAN_KEY, JSON.stringify(oldSettings));

      const prefs = loadPreferences();
      expect(prefs.obsidian.defaultFolder).toBe('Custom Folder');
      expect(prefs.obsidian.includeTranscript).toBe(false);
      expect(prefs.obsidian.generateStudyNotes).toBe(true);
    });

    test('handles corrupted data gracefully', () => {
      localStorage.setItem(PREFERENCES_KEY, 'not valid json{{{');

      const prefs = loadPreferences();
      expect(prefs).toEqual(DEFAULT_USER_PREFERENCES);
    });

    test('merges partial preferences with defaults', () => {
      const partial = { theme: 'light' };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(partial));

      const prefs = loadPreferences();
      expect(prefs.theme).toBe('light');
      expect(prefs.defaultView).toBe('grid'); // default
      expect(prefs.obsidian.enabled).toBe(true); // default
    });
  });

  describe('savePreferences', () => {
    test('saves to localStorage', () => {
      const prefs: UserPreferences = {
        ...DEFAULT_USER_PREFERENCES,
        theme: 'dark',
      };

      savePreferences(prefs);

      const stored = localStorage.getItem(PREFERENCES_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.theme).toBe('dark');
    });

    test('also saves obsidian settings to old key for backwards compat', () => {
      const prefs: UserPreferences = {
        ...DEFAULT_USER_PREFERENCES,
        obsidian: {
          ...DEFAULT_USER_PREFERENCES.obsidian,
          defaultFolder: 'My Notes',
        },
      };

      savePreferences(prefs);

      const oldStored = localStorage.getItem(OLD_OBSIDIAN_KEY);
      expect(oldStored).toBeTruthy();
      const parsed = JSON.parse(oldStored!);
      expect(parsed.defaultFolder).toBe('My Notes');
    });
  });

  describe('loadPatterns', () => {
    test('returns default patterns when nothing stored', () => {
      const patterns = loadPatterns();
      expect(patterns.tagFrequency).toEqual({});
      expect(patterns.recentTags).toEqual([]);
    });

    test('loads stored patterns', () => {
      const customPatterns: UserPatterns = {
        ...DEFAULT_USER_PATTERNS,
        tagFrequency: { react: 5, typescript: 3 },
        recentTags: ['react', 'typescript'],
      };
      localStorage.setItem(PATTERNS_KEY, JSON.stringify(customPatterns));

      const patterns = loadPatterns();
      expect(patterns.tagFrequency).toEqual({ react: 5, typescript: 3 });
      expect(patterns.recentTags).toEqual(['react', 'typescript']);
    });

    test('handles corrupted data gracefully', () => {
      localStorage.setItem(PATTERNS_KEY, '{{invalid');

      const patterns = loadPatterns();
      expect(patterns).toEqual(DEFAULT_USER_PATTERNS);
    });
  });

  describe('savePatterns', () => {
    test('saves to localStorage', () => {
      const patterns: UserPatterns = {
        ...DEFAULT_USER_PATTERNS,
        tagFrequency: { vue: 2 },
      };

      savePatterns(patterns);

      const stored = localStorage.getItem(PATTERNS_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.tagFrequency).toEqual({ vue: 2 });
    });

    test('updates lastUpdated timestamp', () => {
      const patterns: UserPatterns = {
        ...DEFAULT_USER_PATTERNS,
        lastUpdated: '2020-01-01T00:00:00Z',
      };

      savePatterns(patterns);

      const stored = localStorage.getItem(PATTERNS_KEY);
      const parsed = JSON.parse(stored!);
      expect(parsed.lastUpdated).not.toBe('2020-01-01T00:00:00Z');
      expect(new Date(parsed.lastUpdated).getTime()).toBeGreaterThan(
        new Date('2020-01-01').getTime()
      );
    });
  });

  describe('IndexedDB operations', () => {
    test('loadGoals returns empty array initially', async () => {
      const goals = await loadGoals();
      expect(goals).toEqual([]);
    });

    test('saveGoal persists goal', async () => {
      const goal: LearningGoal = {
        id: 'goal-1',
        title: 'Learn React',
        timeframe: 'weekly',
        targetType: 'items',
        targetValue: 5,
        currentValue: 2,
        startDate: '2026-01-15',
        status: 'active',
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
      };

      await saveGoal(goal);
      const goals = await loadGoals();

      expect(goals).toHaveLength(1);
      expect(goals[0].id).toBe('goal-1');
      expect(goals[0].title).toBe('Learn React');
    });

    test('saveGoal updates existing goal', async () => {
      const goal: LearningGoal = {
        id: 'goal-1',
        title: 'Learn React',
        timeframe: 'weekly',
        targetType: 'items',
        targetValue: 5,
        currentValue: 2,
        startDate: '2026-01-15',
        status: 'active',
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
      };

      await saveGoal(goal);
      await saveGoal({ ...goal, currentValue: 4 });

      const goals = await loadGoals();
      expect(goals).toHaveLength(1);
      expect(goals[0].currentValue).toBe(4);
    });

    test('deleteGoal removes goal', async () => {
      const goal: LearningGoal = {
        id: 'goal-1',
        title: 'Learn React',
        timeframe: 'weekly',
        targetType: 'items',
        targetValue: 5,
        currentValue: 0,
        startDate: '2026-01-15',
        status: 'active',
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
      };

      await saveGoal(goal);
      await deleteGoal('goal-1');

      const goals = await loadGoals();
      expect(goals).toHaveLength(0);
    });

    test('loadInsight returns null for unknown ID', async () => {
      const insight = await loadInsight('non-existent');
      expect(insight).toBeNull();
    });

    test('saveInsight persists insight', async () => {
      const insight: AIInsight = {
        id: 'insight-1',
        interestId: 'interest-1',
        summary: 'A test summary',
        keyTopics: ['react', 'hooks'],
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
      };

      await saveInsight(insight);
      const loaded = await loadInsight('interest-1');

      expect(loaded).toBeTruthy();
      expect(loaded!.summary).toBe('A test summary');
      expect(loaded!.keyTopics).toEqual(['react', 'hooks']);
    });

    test('loadAllInsights returns all insights', async () => {
      const insight1: AIInsight = {
        id: 'insight-1',
        interestId: 'interest-1',
        summary: 'Summary 1',
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
      };
      const insight2: AIInsight = {
        id: 'insight-2',
        interestId: 'interest-2',
        summary: 'Summary 2',
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
      };

      await saveInsight(insight1);
      await saveInsight(insight2);

      const insights = await loadAllInsights();
      expect(insights).toHaveLength(2);
    });
  });

  describe('exportAllData', () => {
    test('exports preferences, patterns, goals, insights', async () => {
      // Set up some data
      savePreferences({ ...DEFAULT_USER_PREFERENCES, theme: 'dark' });
      savePatterns({ ...DEFAULT_USER_PATTERNS, tagFrequency: { test: 1 } });
      await saveGoal({
        id: 'goal-1',
        title: 'Test Goal',
        timeframe: 'weekly',
        targetType: 'items',
        targetValue: 5,
        currentValue: 0,
        startDate: '2026-01-15',
        status: 'active',
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
      });
      await saveInsight({
        id: 'insight-1',
        interestId: 'interest-1',
        summary: 'Test',
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
      });

      const exported = await exportAllData();

      expect(exported.version).toBe(1);
      expect(exported.exportedAt).toBeTruthy();
      expect(exported.preferences.theme).toBe('dark');
      expect(exported.patterns.tagFrequency).toEqual({ test: 1 });
      expect(exported.goals).toHaveLength(1);
      expect(exported.insights).toHaveLength(1);
    });
  });

  describe('importAllData', () => {
    test('imports all data from export', async () => {
      const data: UserDataExport = {
        exportedAt: new Date().toISOString(),
        version: 1,
        preferences: { ...DEFAULT_USER_PREFERENCES, theme: 'light' },
        patterns: { ...DEFAULT_USER_PATTERNS, recentTags: ['imported'] },
        goals: [
          {
            id: 'imported-goal',
            title: 'Imported Goal',
            timeframe: 'monthly',
            targetType: 'hours',
            targetValue: 10,
            currentValue: 5,
            startDate: '2026-01-01',
            status: 'active',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          },
        ],
        insights: [
          {
            id: 'imported-insight',
            interestId: 'imported-interest',
            summary: 'Imported summary',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          },
        ],
      };

      await importAllData(data);

      const prefs = loadPreferences();
      expect(prefs.theme).toBe('light');

      const patterns = loadPatterns();
      expect(patterns.recentTags).toContain('imported');

      const goals = await loadGoals();
      expect(goals).toHaveLength(1);
      expect(goals[0].id).toBe('imported-goal');

      const insights = await loadAllInsights();
      expect(insights).toHaveLength(1);
      expect(insights[0].summary).toBe('Imported summary');
    });

    test('throws on version mismatch', async () => {
      const data = {
        exportedAt: new Date().toISOString(),
        version: 999,
        preferences: DEFAULT_USER_PREFERENCES,
        patterns: DEFAULT_USER_PATTERNS,
        goals: [],
        insights: [],
      } as UserDataExport;

      await expect(importAllData(data)).rejects.toThrow('Unsupported export version');
    });
  });

  describe('clearAllData', () => {
    test('removes all localStorage keys', async () => {
      savePreferences({ ...DEFAULT_USER_PREFERENCES, theme: 'dark' });
      savePatterns({ ...DEFAULT_USER_PATTERNS, tagFrequency: { test: 1 } });

      await clearAllData();

      expect(localStorage.getItem(PREFERENCES_KEY)).toBeNull();
      expect(localStorage.getItem(PATTERNS_KEY)).toBeNull();
      expect(localStorage.getItem(OLD_OBSIDIAN_KEY)).toBeNull();
    });

    test('clears IndexedDB stores', async () => {
      await saveGoal({
        id: 'goal-1',
        title: 'Test Goal',
        timeframe: 'weekly',
        targetType: 'items',
        targetValue: 5,
        currentValue: 0,
        startDate: '2026-01-15',
        status: 'active',
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
      });
      await saveInsight({
        id: 'insight-1',
        interestId: 'interest-1',
        summary: 'Test',
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
      });

      await clearAllData();

      const goals = await loadGoals();
      const insights = await loadAllInsights();
      expect(goals).toHaveLength(0);
      expect(insights).toHaveLength(0);
    });
  });

  describe('isStorageAvailable', () => {
    test('returns true when localStorage works', () => {
      expect(isStorageAvailable()).toBe(true);
    });

    test('returns false when localStorage throws', () => {
      vi.stubGlobal('localStorage', {
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
        removeItem: () => {},
      });

      expect(isStorageAvailable()).toBe(false);
    });
  });
});
