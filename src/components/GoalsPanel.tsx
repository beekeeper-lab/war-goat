import { useState } from 'react';
import { X, Plus, Target, Trash2, Check, Clock } from 'lucide-react';
import { useLearningGoals } from '../hooks/useLearningGoals';
import type { GoalTimeframe, GoalTargetType, LearningGoal } from '../types';

interface GoalsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GoalsPanel({ isOpen, onClose }: GoalsPanelProps) {
  const {
    goals,
    activeGoals,
    completedGoals,
    addGoal,
    updateGoal,
    deleteGoal,
    getGoalProgress,
    isLoading,
  } = useLearningGoals();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    timeframe: 'weekly' as GoalTimeframe,
    targetType: 'items' as GoalTargetType,
    targetValue: 5,
  });

  if (!isOpen) return null;

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.title.trim()) return;

    await addGoal({
      title: newGoal.title.trim(),
      description: newGoal.description.trim() || undefined,
      timeframe: newGoal.timeframe,
      targetType: newGoal.targetType,
      targetValue: newGoal.targetValue,
      currentValue: 0,
      startDate: new Date().toISOString(),
      status: 'active',
    });

    setNewGoal({
      title: '',
      description: '',
      timeframe: 'weekly',
      targetType: 'items',
      targetValue: 5,
    });
    setShowAddForm(false);
  };

  const handleMarkComplete = async (goal: LearningGoal) => {
    await updateGoal(goal.id, {
      status: 'completed',
      currentValue: goal.targetValue,
      endDate: new Date().toISOString(),
    });
  };

  const handleAbandon = async (goal: LearningGoal) => {
    await updateGoal(goal.id, {
      status: 'abandoned',
      endDate: new Date().toISOString(),
    });
  };

  const renderGoalCard = (goal: LearningGoal) => {
    const progress = getGoalProgress(goal);
    const isActive = goal.status === 'active';

    return (
      <div
        key={goal.id}
        className={`p-4 border rounded-lg ${
          isActive ? 'border-olive-200 bg-white' : 'border-gray-200 bg-gray-50'
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className={`w-4 h-4 ${isActive ? 'text-olive-600' : 'text-gray-400'}`} />
            <h4 className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
              {goal.title}
            </h4>
          </div>
          {isActive && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleMarkComplete(goal)}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
                title="Mark complete"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleAbandon(goal)}
                className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                title="Abandon goal"
              >
                <Clock className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteGoal(goal.id)}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                title="Delete goal"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {goal.description && (
          <p className="text-sm text-gray-500 mb-2">{goal.description}</p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 capitalize">
              {goal.timeframe} - {goal.targetType}
            </span>
            <span className={`font-medium ${isActive ? 'text-olive-700' : 'text-gray-500'}`}>
              {goal.currentValue} / {goal.targetValue}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                goal.status === 'completed'
                  ? 'bg-green-500'
                  : goal.status === 'abandoned'
                  ? 'bg-gray-400'
                  : 'bg-olive-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {goal.status !== 'active' && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {goal.status === 'completed' ? (
              <span className="text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> Completed
              </span>
            ) : (
              <span className="text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Abandoned
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Learning Goals</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="p-2 text-olive-600 hover:bg-olive-50 rounded-lg"
              title="Add goal"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading goals...</div>
          ) : (
            <>
              {/* Add Goal Form */}
              {showAddForm && (
                <form onSubmit={handleAddGoal} className="p-4 bg-olive-50 border border-olive-200 rounded-lg space-y-3">
                  <input
                    type="text"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    placeholder="Goal title"
                    className="w-full px-3 py-2 border border-olive-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500"
                    autoFocus
                  />
                  <textarea
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                    placeholder="Description (optional)"
                    rows={2}
                    className="w-full px-3 py-2 border border-olive-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={newGoal.timeframe}
                      onChange={(e) => setNewGoal({ ...newGoal, timeframe: e.target.value as GoalTimeframe })}
                      className="px-2 py-2 border border-olive-300 rounded-lg text-sm"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom</option>
                    </select>
                    <select
                      value={newGoal.targetType}
                      onChange={(e) => setNewGoal({ ...newGoal, targetType: e.target.value as GoalTargetType })}
                      className="px-2 py-2 border border-olive-300 rounded-lg text-sm"
                    >
                      <option value="items">Items</option>
                      <option value="hours">Hours</option>
                      <option value="topics">Topics</option>
                    </select>
                    <input
                      type="number"
                      value={newGoal.targetValue}
                      onChange={(e) => setNewGoal({ ...newGoal, targetValue: parseInt(e.target.value) || 1 })}
                      min={1}
                      className="px-2 py-2 border border-olive-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newGoal.title.trim()}
                      className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-500 transition-colors disabled:opacity-50"
                    >
                      Add Goal
                    </button>
                  </div>
                </form>
              )}

              {/* Active Goals */}
              {activeGoals.length > 0 && (
                <section>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Active Goals</h3>
                  <div className="space-y-3">
                    {activeGoals.map(renderGoalCard)}
                  </div>
                </section>
              )}

              {/* Completed Goals */}
              {completedGoals.length > 0 && (
                <section>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Completed</h3>
                  <div className="space-y-3">
                    {completedGoals.slice(0, 5).map(renderGoalCard)}
                  </div>
                </section>
              )}

              {/* Empty State */}
              {goals.length === 0 && !showAddForm && (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No learning goals yet</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-500 transition-colors"
                  >
                    Create Your First Goal
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
