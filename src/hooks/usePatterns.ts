import { usePreferences } from '../contexts/PreferencesContext';
import type { SourceType } from '../types';

/**
 * Hook to access and track user behavior patterns
 * Patterns are only tracked when user has consented
 */
export function usePatterns() {
  const {
    patterns,
    recordTagUsage,
    recordTypeUsage,
    recordCategoryUsage,
    preferences,
  } = usePreferences();

  // Check if pattern tracking is enabled
  const isTrackingEnabled = preferences.privacy.trackPatterns;

  // Get top N tags by frequency
  const getTopTags = (limit: number = 10): string[] => {
    return Object.entries(patterns.tagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag]) => tag);
  };

  // Get top N types by frequency
  const getTopTypes = (limit: number = 5): SourceType[] => {
    return Object.entries(patterns.typeFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([type]) => type as SourceType);
  };

  // Get top N categories by frequency
  const getTopCategories = (limit: number = 10): string[] => {
    return Object.entries(patterns.categoryFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([category]) => category);
  };

  // Get recent tags (last 20 used)
  const recentTags = patterns.recentTags;

  return {
    patterns,
    isTrackingEnabled,
    recordTagUsage,
    recordTypeUsage,
    recordCategoryUsage,
    getTopTags,
    getTopTypes,
    getTopCategories,
    recentTags,
  };
}
