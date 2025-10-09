// components/statistics/TopTagsChart.tsx
'use client';

import { TagStat } from '@/models/statistics';

interface TopTagsChartProps {
  data: TagStat[];
  className?: string;
}

export default function TopTagsChart({
  data,
  className = ''
}: TopTagsChartProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        常用标签
      </h3>

      {data.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          还没有使用标签
        </p>
      ) : (
        <div className="space-y-3">
          {data.slice(0, 5).map((tag, index) => (
            <div key={tag.tagId}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    #{index + 1}
                  </span>
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.icon && <span className="mr-1">{tag.icon}</span>}
                    {tag.tagName}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {tag.count} 次
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {tag.percentage.toFixed(1)}%
                </span>
              </div>

              {/* 进度条 */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: tag.color,
                    width: `${tag.percentage}%`
                  }}
                />
              </div>
            </div>
          ))}

          {data.length > 5 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
              还有 {data.length - 5} 个标签
            </p>
          )}
        </div>
      )}
    </div>
  );
}
