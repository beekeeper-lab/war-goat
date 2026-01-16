import { useState, useEffect, useCallback } from 'react';
import type { ObsidianSettings } from '../types';
import { DEFAULT_OBSIDIAN_SETTINGS } from '../types';

const STORAGE_KEY = 'war-goat-obsidian-settings';

/**
 * Hook for managing Obsidian settings with localStorage persistence
 */
export function useObsidianSettings() {
  const [settings, setSettingsState] = useState<ObsidianSettings>(() => {
    // Load from localStorage on initial render
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_OBSIDIAN_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (err) {
      console.error('Failed to load Obsidian settings:', err);
    }
    return DEFAULT_OBSIDIAN_SETTINGS;
  });

  // Persist to localStorage whenever settings change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error('Failed to save Obsidian settings:', err);
    }
  }, [settings]);

  const setSettings = useCallback((updates: Partial<ObsidianSettings>) => {
    setSettingsState(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULT_OBSIDIAN_SETTINGS);
  }, []);

  return {
    settings,
    setSettings,
    resetSettings,
  };
}

export default useObsidianSettings;
