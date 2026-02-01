import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  UserPreferences,
  UserPatterns,
  LearningGoal,
  SourceType,
} from '../types';
import {
  DEFAULT_USER_PREFERENCES,
  DEFAULT_USER_PATTERNS,
} from '../types';
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
  clearAllData: () => Promise<void>;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setPreferences(DEFAULT_USER_PREFERENCES);
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

  const recordTypeUsage = useCallback((type: SourceType) => {
    if (!preferences.privacy.trackPatterns) return;

    setPatterns(prev => ({
      ...prev,
      typeFrequency: {
        ...prev.typeFrequency,
        [type]: (prev.typeFrequency[type] || 0) + 1,
      },
    }));
  }, [preferences.privacy.trackPatterns]);

  const recordCategoryUsage = useCallback((categories: string[]) => {
    if (!preferences.privacy.trackPatterns) return;

    setPatterns(prev => {
      const newFreq = { ...prev.categoryFrequency };
      for (const category of categories) {
        newFreq[category] = (newFreq[category] || 0) + 1;
      }
      return {
        ...prev,
        categoryFrequency: newFreq,
      };
    });
  }, [preferences.privacy.trackPatterns]);

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
      createdAt: now,
      updatedAt: now,
    };
    await storage.saveGoal(newGoal);
    setGoals(prev => [...prev, newGoal]);
  }, []);

  const updateGoal = useCallback(async (id: string, updates: Partial<LearningGoal>) => {
    const updatedGoals = goals.map(g => {
      if (g.id !== id) return g;
      const updated = { ...g, ...updates, updatedAt: new Date().toISOString() };
      storage.saveGoal(updated);
      return updated;
    });
    setGoals(updatedGoals);
  }, [goals]);

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

  const clearAllDataFn = useCallback(async () => {
    await storage.clearAllData();
    setPreferences(DEFAULT_USER_PREFERENCES);
    setPatterns(DEFAULT_USER_PATTERNS);
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
      recordTypeUsage,
      recordCategoryUsage,
      goals,
      addGoal,
      updateGoal,
      deleteGoal,
      showConsentModal,
      setConsentGiven,
      exportData,
      importData,
      clearAllData: clearAllDataFn,
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
