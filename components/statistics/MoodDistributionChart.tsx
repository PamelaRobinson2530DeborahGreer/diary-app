// components/statistics/MoodDistributionChart.tsx
'use client';

import { MoodStat } from '@/models/statistics';

interface MoodDistributionChartProps {
  data: MoodStat[];
  className?: string;
}

export default function MoodDistributionChart({
  data,
  className = ''
}: MoodDistributionChartProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        心情分布
      </h3>

      {data.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          还没有记录心情数据
        </p>
      ) : (
        <div className="space-y-3">
          {data.map(({ mood, count, percentage }) => (
            <div key={mood}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{mood}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {count} 次
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {percentage.toFixed(1)}%
                </span>
              </div>

              {/* 进度条 */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
