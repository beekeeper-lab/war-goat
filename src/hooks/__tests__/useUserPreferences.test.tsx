/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { PreferencesProvider } from '../../contexts/PreferencesContext';
import { useUserPreferences } from '../useUserPreferences';
import { resetDBConnection } from '../../services/storage';
import { DEFAULT_USER_PREFERENCES } from '../../types';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <PreferencesProvider>{children}</PreferencesProvider>
);

describe('useUserPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('indexedDB', new IDBFactory());
    resetDBConnection();
  });

  test('loads preferences on mount', () => {
    const { result } = renderHook(() => useUserPreferences(), { wrapper });

    expect(result.current.preferences).toBeDefined();
    expect(result.current.theme).toBe('system');
    expect(result.current.defaultView).toBe('grid');
  });

  test('loads stored preferences', () => {
    localStorage.setItem('war-goat-user-preferences', JSON.stringify({
      ...DEFAULT_USER_PREFERENCES,
      theme: 'dark',
      defaultView: 'list',
    }));

    const { result } = renderHook(() => useUserPreferences(), { wrapper });

    expect(result.current.theme).toBe('dark');
    expect(result.current.defaultView).toBe('list');
  });

  test('updatePreferences saves changes', async () => {
    const { result } = renderHook(() => useUserPreferences(), { wrapper });

    act(() => {
      result.current.updatePreferences({ theme: 'dark' });
    });

    expect(result.current.theme).toBe('dark');

    // Check localStorage was updated
    const stored = JSON.parse(localStorage.getItem('war-goat-user-preferences')!);
    expect(stored.theme).toBe('dark');
  });

  test('resetPreferences restores defaults', async () => {
    localStorage.setItem('war-goat-user-preferences', JSON.stringify({
      ...DEFAULT_USER_PREFERENCES,
      theme: 'dark',
    }));

    const { result } = renderHook(() => useUserPreferences(), { wrapper });

    expect(result.current.theme).toBe('dark');

    act(() => {
      result.current.resetPreferences();
    });

    expect(result.current.theme).toBe('system');
  });

  test('provides convenience accessors', () => {
    const { result } = renderHook(() => useUserPreferences(), { wrapper });

    expect(result.current.theme).toBeDefined();
    expect(result.current.defaultView).toBeDefined();
    expect(result.current.defaultSort).toBeDefined();
    expect(result.current.defaultFilters).toBeDefined();
    expect(result.current.autoEnrich).toBeDefined();
    expect(result.current.obsidian).toBeDefined();
    expect(result.current.privacy).toBeDefined();
  });
});
