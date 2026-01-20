/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { PreferencesProvider } from '../../contexts/PreferencesContext';
import { usePatterns } from '../usePatterns';
import { resetDBConnection } from '../../services/storage';
import { DEFAULT_USER_PREFERENCES } from '../../types';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <PreferencesProvider>{children}</PreferencesProvider>
);

describe('usePatterns', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('indexedDB', new IDBFactory());
    resetDBConnection();
  });

  test('does not track when trackPatterns is false', () => {
    const { result } = renderHook(() => usePatterns(), { wrapper });

    expect(result.current.isTrackingEnabled).toBe(false);

    act(() => {
      result.current.recordTagUsage(['react', 'typescript']);
    });

    // Patterns should not be updated
    expect(result.current.patterns.tagFrequency).toEqual({});
  });

  test('recordTagUsage increments frequency when enabled', async () => {
    // Enable tracking first
    localStorage.setItem('war-goat-user-preferences', JSON.stringify({
      ...DEFAULT_USER_PREFERENCES,
      privacy: { trackPatterns: true, consentGiven: true },
    }));

    const { result } = renderHook(() => usePatterns(), { wrapper });

    expect(result.current.isTrackingEnabled).toBe(true);

    act(() => {
      result.current.recordTagUsage(['react', 'typescript']);
    });

    expect(result.current.patterns.tagFrequency['react']).toBe(1);
    expect(result.current.patterns.tagFrequency['typescript']).toBe(1);

    // Record again
    act(() => {
      result.current.recordTagUsage(['react']);
    });

    expect(result.current.patterns.tagFrequency['react']).toBe(2);
  });

  test('recordTagUsage updates recentTags', async () => {
    localStorage.setItem('war-goat-user-preferences', JSON.stringify({
      ...DEFAULT_USER_PREFERENCES,
      privacy: { trackPatterns: true, consentGiven: true },
    }));

    const { result } = renderHook(() => usePatterns(), { wrapper });

    act(() => {
      result.current.recordTagUsage(['react', 'typescript']);
    });

    expect(result.current.recentTags).toContain('react');
    expect(result.current.recentTags).toContain('typescript');
    // Most recent first
    expect(result.current.recentTags[0]).toBe('typescript');
    expect(result.current.recentTags[1]).toBe('react');
  });

  test('recordTypeUsage increments type frequency', async () => {
    localStorage.setItem('war-goat-user-preferences', JSON.stringify({
      ...DEFAULT_USER_PREFERENCES,
      privacy: { trackPatterns: true, consentGiven: true },
    }));

    const { result } = renderHook(() => usePatterns(), { wrapper });

    act(() => {
      result.current.recordTypeUsage('youtube');
    });

    expect(result.current.patterns.typeFrequency.youtube).toBe(1);

    act(() => {
      result.current.recordTypeUsage('youtube');
    });

    expect(result.current.patterns.typeFrequency.youtube).toBe(2);
  });

  test('recordCategoryUsage increments category frequency', async () => {
    localStorage.setItem('war-goat-user-preferences', JSON.stringify({
      ...DEFAULT_USER_PREFERENCES,
      privacy: { trackPatterns: true, consentGiven: true },
    }));

    const { result } = renderHook(() => usePatterns(), { wrapper });

    act(() => {
      result.current.recordCategoryUsage(['Programming', 'Web Development']);
    });

    expect(result.current.patterns.categoryFrequency['Programming']).toBe(1);
    expect(result.current.patterns.categoryFrequency['Web Development']).toBe(1);
  });

  test('getTopTags returns tags sorted by frequency', async () => {
    localStorage.setItem('war-goat-user-preferences', JSON.stringify({
      ...DEFAULT_USER_PREFERENCES,
      privacy: { trackPatterns: true, consentGiven: true },
    }));

    const { result } = renderHook(() => usePatterns(), { wrapper });

    act(() => {
      result.current.recordTagUsage(['react']);
      result.current.recordTagUsage(['react']);
      result.current.recordTagUsage(['react']);
      result.current.recordTagUsage(['typescript']);
      result.current.recordTagUsage(['typescript']);
      result.current.recordTagUsage(['vue']);
    });

    const topTags = result.current.getTopTags(3);
    expect(topTags[0]).toBe('react');
    expect(topTags[1]).toBe('typescript');
    expect(topTags[2]).toBe('vue');
  });

  test('debounces saves to avoid excessive writes', async () => {
    vi.useFakeTimers();

    localStorage.setItem('war-goat-user-preferences', JSON.stringify({
      ...DEFAULT_USER_PREFERENCES,
      privacy: { trackPatterns: true, consentGiven: true },
    }));

    const { result } = renderHook(() => usePatterns(), { wrapper });

    act(() => {
      result.current.recordTagUsage(['react']);
      result.current.recordTagUsage(['typescript']);
      result.current.recordTagUsage(['vue']);
    });

    // Before debounce, localStorage should not have patterns yet
    // (it may have initial empty patterns)

    // Advance timers past debounce time
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // After debounce, localStorage should be updated
    const afterDebounce = JSON.parse(localStorage.getItem('war-goat-user-patterns')!);
    expect(afterDebounce.tagFrequency['react']).toBe(1);
    expect(afterDebounce.tagFrequency['typescript']).toBe(1);
    expect(afterDebounce.tagFrequency['vue']).toBe(1);

    vi.useRealTimers();
  });
});
