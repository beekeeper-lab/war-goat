/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { PreferencesProvider } from '../../contexts/PreferencesContext';
import { useSmartSuggestions } from '../useSmartSuggestions';
import { resetDBConnection } from '../../services/storage';
import { DEFAULT_USER_PREFERENCES, DEFAULT_USER_PATTERNS } from '../../types';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <PreferencesProvider>{children}</PreferencesProvider>
);

describe('useSmartSuggestions', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('indexedDB', new IDBFactory());
    resetDBConnection();
  });

  test('returns empty array when no patterns and no title', () => {
    const { result } = renderHook(
      () => useSmartSuggestions({ title: '', url: '' }),
      { wrapper }
    );

    expect(result.current).toEqual([]);
  });

  test('extracts keywords from title', () => {
    const { result } = renderHook(
      () => useSmartSuggestions({ title: 'Introduction to React Hooks', url: '' }),
      { wrapper }
    );

    expect(result.current).toContain('react');
  });

  test('extracts keywords from URL', () => {
    const { result } = renderHook(
      () => useSmartSuggestions({ title: '', url: 'https://github.com/facebook/react' }),
      { wrapper }
    );

    expect(result.current).toContain('github');
  });

  test('suggests frequent tags when patterns enabled', () => {
    // Set up preferences with tracking enabled and existing patterns
    localStorage.setItem('war-goat-user-preferences', JSON.stringify({
      ...DEFAULT_USER_PREFERENCES,
      privacy: { trackPatterns: true, consentGiven: true },
    }));
    localStorage.setItem('war-goat-user-patterns', JSON.stringify({
      ...DEFAULT_USER_PATTERNS,
      tagFrequency: { 'react': 10, 'typescript': 8, 'testing': 5, 'css': 3 },
      recentTags: ['react', 'typescript'],
    }));

    const { result } = renderHook(
      () => useSmartSuggestions({ title: '', url: '' }),
      { wrapper }
    );

    // Should include frequent tags
    expect(result.current).toContain('react');
    expect(result.current).toContain('typescript');
  });

  test('excludes already-selected tags', () => {
    localStorage.setItem('war-goat-user-preferences', JSON.stringify({
      ...DEFAULT_USER_PREFERENCES,
      privacy: { trackPatterns: true, consentGiven: true },
    }));
    localStorage.setItem('war-goat-user-patterns', JSON.stringify({
      ...DEFAULT_USER_PATTERNS,
      tagFrequency: { 'react': 10, 'typescript': 8, 'testing': 5 },
      recentTags: ['react', 'typescript', 'testing'],
    }));

    const { result } = renderHook(
      () => useSmartSuggestions({
        title: '',
        url: '',
        currentTags: ['react', 'typescript'],
      }),
      { wrapper }
    );

    expect(result.current).not.toContain('react');
    expect(result.current).not.toContain('typescript');
    expect(result.current).toContain('testing');
  });

  test('limits to 5 suggestions', () => {
    localStorage.setItem('war-goat-user-preferences', JSON.stringify({
      ...DEFAULT_USER_PREFERENCES,
      privacy: { trackPatterns: true, consentGiven: true },
    }));
    localStorage.setItem('war-goat-user-patterns', JSON.stringify({
      ...DEFAULT_USER_PATTERNS,
      tagFrequency: {
        'react': 10, 'typescript': 9, 'testing': 8,
        'css': 7, 'html': 6, 'node': 5, 'express': 4,
      },
      recentTags: ['react', 'typescript', 'testing', 'css', 'html', 'node', 'express'],
    }));

    const { result } = renderHook(
      () => useSmartSuggestions({ title: '', url: '' }),
      { wrapper }
    );

    expect(result.current.length).toBeLessThanOrEqual(5);
  });

  test('prioritizes matching keywords over frequency', () => {
    localStorage.setItem('war-goat-user-preferences', JSON.stringify({
      ...DEFAULT_USER_PREFERENCES,
      privacy: { trackPatterns: true, consentGiven: true },
    }));
    localStorage.setItem('war-goat-user-patterns', JSON.stringify({
      ...DEFAULT_USER_PATTERNS,
      tagFrequency: {
        'css': 100, 'html': 90, 'react': 5, 'python': 80,
      },
      recentTags: ['css', 'html', 'python'],
    }));

    const { result } = renderHook(
      () => useSmartSuggestions({
        title: 'React Tutorial for Beginners',
        url: '',
      }),
      { wrapper }
    );

    // React should appear because it matches the title
    // even though css/html have higher frequency
    expect(result.current).toContain('react');
    // The keyword from title should be prioritized
    expect(result.current.indexOf('react')).toBeLessThanOrEqual(
      result.current.indexOf('css') === -1 ? 999 : result.current.indexOf('css')
    );
  });

  test('works without pattern tracking (basic keyword extraction)', () => {
    // No tracking consent
    const { result } = renderHook(
      () => useSmartSuggestions({
        title: 'Advanced TypeScript Tutorial',
        url: 'https://youtube.com/watch?v=123',
      }),
      { wrapper }
    );

    // Should still extract keywords from title/url
    expect(result.current).toContain('typescript');
    expect(result.current).toContain('video');
    expect(result.current.length).toBeLessThanOrEqual(5);
  });

  test('handles multiple tech terms in title', () => {
    const { result } = renderHook(
      () => useSmartSuggestions({
        title: 'Building a REST API with Python and Testing',
        url: '',
      }),
      { wrapper }
    );

    expect(result.current).toContain('api');
    expect(result.current).toContain('python');
    expect(result.current).toContain('testing');
  });
});
