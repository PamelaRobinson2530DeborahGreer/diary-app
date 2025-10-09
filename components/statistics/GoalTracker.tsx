// components/statistics/GoalTracker.tsx
'use client';

import { GoalProgress } from '@/models/statistics';

interface GoalTrackerProps {
  progress: GoalProgress[];
  onCreateGoal?: () => void;
  className?: string;
}

export default function GoalTracker({
  progress,
  onCreateGoal,
  className = ''
}: GoalTrackerProps) {
  const getGoalTypeLabel = (type: string): string => {
    const labels = {
      daily: '每日',
      weekly: '每周',
      monthly: '每月'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getUnitLabel = (unit: string): string => {
    const labels = {
      entries: '篇',
      words: '字'
    };
    return labels[unit as keyof typeof labels] || unit;
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return 'from-green-500 to-green-600';
    if (percentage >= 75) return 'from-blue-500 to-blue-600';
    if (percentage >= 50) return 'from-yellow-500 to-yellow-600';
    return 'from-gray-400 to-gray-500';
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          写作目标
        </h3>
        {onCreateGoal && (
          <button
            onClick={onCreateGoal}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            + 添加目标
          </button>
        )}
      </div>

      {progress.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            还没有设置写作目标
          </p>
          {onCreateGoal && (
            <button
              onClick={onCreateGoal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              创建第一个目标
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {progress.map(({ goal, current, percentage, remaining, isCompleted }) => (
            <div
              key={goal.id}
              className={`p-4 rounded-lg border-2 transition ${
                isCompleted
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {getGoalTypeLabel(goal.type)}目标
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {goal.target} {getUnitLabel(goal.unit)}
                  </p>
                </div>
                {isCompleted && (
                  <span className="text-2xl">🎉</span>
                )}
              </div>

              {/* 进度条 */}
              <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getProgressColor(percentage)} transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* 进度信息 */}
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {current} / {goal.target} {getUnitLabel(goal.unit)}
                </span>
                <span className={`font-medium ${
                  isCompleted
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {percentage.toFixed(0)}%
                </span>
              </div>

              {/* 剩余提示 */}
              {!isCompleted && remaining > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  还需 {remaining} {getUnitLabel(goal.unit)}
                </p>
              )}

              {isCompleted && (
                <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-2">
                  ✓ 目标已完成！
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
