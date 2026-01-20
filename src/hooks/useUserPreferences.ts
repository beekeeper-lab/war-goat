import { usePreferences } from '../contexts/PreferencesContext';

/**
 * Hook to access and update user preferences
 * Thin wrapper around PreferencesContext for convenient access
 */
export function useUserPreferences() {
  const {
    preferences,
    updatePreferences,
    resetPreferences,
  } = usePreferences();

  return {
    preferences,
    updatePreferences,
    resetPreferences,
    // Convenience accessors
    theme: preferences.theme,
    defaultView: preferences.defaultView,
    defaultSort: preferences.defaultSort,
    defaultFilters: preferences.defaultFilters,
    autoEnrich: preferences.autoEnrich,
    obsidian: preferences.obsidian,
    privacy: preferences.privacy,
  };
}
