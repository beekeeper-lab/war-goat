import { useCallback } from 'react';
import type { ObsidianSettings } from '../types';
import { DEFAULT_OBSIDIAN_SETTINGS } from '../types';
import { usePreferences } from '../contexts/PreferencesContext';

/**
 * Hook for managing Obsidian settings
 *
 * This hook is now integrated with PreferencesContext for unified
 * preference management, while maintaining backwards compatibility
 * with the existing API.
 */
export function useObsidianSettings() {
  const { preferences, updatePreferences } = usePreferences();

  // Get obsidian settings from unified preferences
  const settings = preferences.obsidian;

  const setSettings = useCallback((updates: Partial<ObsidianSettings>) => {
    updatePreferences({
      obsidian: { ...preferences.obsidian, ...updates },
    });
  }, [preferences.obsidian, updatePreferences]);

  const resetSettings = useCallback(() => {
    updatePreferences({
      obsidian: DEFAULT_OBSIDIAN_SETTINGS,
    });
  }, [updatePreferences]);

  return {
    settings,
    setSettings,
    resetSettings,
  };
}

export default useObsidianSettings;
