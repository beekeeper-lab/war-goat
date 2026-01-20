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
    // If pattern tracking is disabled, just do basic keyword extraction
    if (!preferences.privacy.trackPatterns) {
      return extractKeywords(title, url)
        .filter(kw => !currentTags.includes(kw))
        .slice(0, 5);
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

    // Filter out already selected and limit to 5
    return Array.from(merged)
      .filter(t => !currentTags.includes(t))
      .slice(0, 5);
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
      'node', 'css', 'html', 'docker', 'kubernetes', 'aws',
      'machine learning', 'ai', 'data', 'web', 'mobile',
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
    if (url.includes('dev.to')) keywords.add('article');
    if (url.includes('stackoverflow.com')) keywords.add('programming');
  }

  return Array.from(keywords);
}
