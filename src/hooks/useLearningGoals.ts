import { usePreferences } from '../contexts/PreferencesContext';
import type { LearningGoal } from '../types';

/**
 * Hook to manage learning goals
 * Provides CRUD operations and goal progress tracking
 */
export function useLearningGoals() {
  const {
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    isLoading,
  } = usePreferences();

  // Get active goals only
  const activeGoals = goals.filter(g => g.status === 'active');

  // Get completed goals
  const completedGoals = goals.filter(g => g.status === 'completed');

  // Calculate progress percentage for a goal
  const getGoalProgress = (goal: LearningGoal): number => {
    if (goal.targetValue === 0) return 0;
    return Math.min(100, (goal.currentValue / goal.targetValue) * 100);
  };

  // Increment goal progress
  const incrementGoalProgress = async (id: string, amount: number = 1) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    const newValue = goal.currentValue + amount;
    const updates: Partial<LearningGoal> = {
      currentValue: newValue,
    };

    // Auto-complete if target reached
    if (newValue >= goal.targetValue && goal.status === 'active') {
      updates.status = 'completed';
      updates.endDate = new Date().toISOString();
    }

    await updateGoal(id, updates);
  };

  return {
    goals,
    activeGoals,
    completedGoals,
    addGoal,
    updateGoal,
    deleteGoal,
    getGoalProgress,
    incrementGoalProgress,
    isLoading,
  };
}
