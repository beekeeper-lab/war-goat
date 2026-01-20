/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { PreferencesProvider } from '../../contexts/PreferencesContext';
import { useLearningGoals } from '../useLearningGoals';
import { resetDBConnection } from '../../services/storage';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <PreferencesProvider>{children}</PreferencesProvider>
);

describe('useLearningGoals', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('indexedDB', new IDBFactory());
    resetDBConnection();
  });

  test('loads goals from IndexedDB on mount', async () => {
    const { result } = renderHook(() => useLearningGoals(), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.goals).toEqual([]);
  });

  test('addGoal creates goal with generated ID', async () => {
    const { result } = renderHook(() => useLearningGoals(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addGoal({
        title: 'Learn React',
        timeframe: 'weekly',
        targetType: 'items',
        targetValue: 5,
        currentValue: 0,
        startDate: '2026-01-15',
        status: 'active',
      });
    });

    expect(result.current.goals).toHaveLength(1);
    expect(result.current.goals[0].title).toBe('Learn React');
    expect(result.current.goals[0].id).toBeDefined();
    expect(result.current.goals[0].createdAt).toBeDefined();
  });

  test('updateGoal modifies existing goal', async () => {
    const { result } = renderHook(() => useLearningGoals(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addGoal({
        title: 'Learn React',
        timeframe: 'weekly',
        targetType: 'items',
        targetValue: 5,
        currentValue: 2,
        startDate: '2026-01-15',
        status: 'active',
      });
    });

    const goalId = result.current.goals[0].id;

    await act(async () => {
      await result.current.updateGoal(goalId, { currentValue: 4 });
    });

    expect(result.current.goals[0].currentValue).toBe(4);
  });

  test('deleteGoal removes goal', async () => {
    const { result } = renderHook(() => useLearningGoals(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addGoal({
        title: 'Learn React',
        timeframe: 'weekly',
        targetType: 'items',
        targetValue: 5,
        currentValue: 0,
        startDate: '2026-01-15',
        status: 'active',
      });
    });

    const goalId = result.current.goals[0].id;

    await act(async () => {
      await result.current.deleteGoal(goalId);
    });

    expect(result.current.goals).toHaveLength(0);
  });

  test('getGoalProgress calculates correctly', async () => {
    const { result } = renderHook(() => useLearningGoals(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addGoal({
        title: 'Learn React',
        timeframe: 'weekly',
        targetType: 'items',
        targetValue: 10,
        currentValue: 5,
        startDate: '2026-01-15',
        status: 'active',
      });
    });

    const progress = result.current.getGoalProgress(result.current.goals[0]);
    expect(progress).toBe(50);
  });

  test('incrementGoalProgress increases current value', async () => {
    const { result } = renderHook(() => useLearningGoals(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addGoal({
        title: 'Learn React',
        timeframe: 'weekly',
        targetType: 'items',
        targetValue: 5,
        currentValue: 2,
        startDate: '2026-01-15',
        status: 'active',
      });
    });

    const goalId = result.current.goals[0].id;

    await act(async () => {
      await result.current.incrementGoalProgress(goalId);
    });

    expect(result.current.goals[0].currentValue).toBe(3);
  });

  test('auto-completes goal when target reached', async () => {
    const { result } = renderHook(() => useLearningGoals(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addGoal({
        title: 'Learn React',
        timeframe: 'weekly',
        targetType: 'items',
        targetValue: 3,
        currentValue: 2,
        startDate: '2026-01-15',
        status: 'active',
      });
    });

    const goalId = result.current.goals[0].id;

    await act(async () => {
      await result.current.incrementGoalProgress(goalId);
    });

    expect(result.current.goals[0].status).toBe('completed');
    expect(result.current.goals[0].endDate).toBeDefined();
  });

  test('activeGoals filters correctly', async () => {
    const { result } = renderHook(() => useLearningGoals(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addGoal({
        title: 'Active Goal',
        timeframe: 'weekly',
        targetType: 'items',
        targetValue: 5,
        currentValue: 0,
        startDate: '2026-01-15',
        status: 'active',
      });
      await result.current.addGoal({
        title: 'Completed Goal',
        timeframe: 'weekly',
        targetType: 'items',
        targetValue: 5,
        currentValue: 5,
        startDate: '2026-01-15',
        status: 'completed',
      });
    });

    expect(result.current.activeGoals).toHaveLength(1);
    expect(result.current.activeGoals[0].title).toBe('Active Goal');
    expect(result.current.completedGoals).toHaveLength(1);
    expect(result.current.completedGoals[0].title).toBe('Completed Goal');
  });
});
