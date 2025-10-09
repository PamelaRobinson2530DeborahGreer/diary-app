// components/statistics/HeatmapCalendar.tsx
'use client';

import { HeatmapData } from '@/models/statistics';
import { useMemo, useState } from 'react';

interface HeatmapCalendarProps {
  data: HeatmapData[];
  className?: string;
}

export default function HeatmapCalendar({
  data,
  className = ''
}: HeatmapCalendarProps) {
  const [hoveredDate, setHoveredDate] = useState<HeatmapData | null>(null);

  // 按周分组数据
  const weeks = useMemo(() => {
    const result: HeatmapData[][] = [];
    let currentWeek: HeatmapData[] = [];

    data.forEach((day, index) => {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();

      // 第一天，填充前面的空白
      if (index === 0 && dayOfWeek !== 0) {
        for (let i = 0; i < dayOfWeek; i++) {
          currentWeek.push({ date: '', level: 0, count: 0 });
        }
      }

      currentWeek.push(day);

      // 周六或最后一天，开始新的一周
      if (dayOfWeek === 6 || index === data.length - 1) {
        // 填充后面的空白
        while (currentWeek.length < 7) {
          currentWeek.push({ date: '', level: 0, count: 0 });
        }
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    return result;
  }, [data]);

  // 获取月份标签
  const monthLabels = useMemo(() => {
    const labels: { month: string; col: number }[] = [];
    let lastMonth = '';

    data.forEach((day, index) => {
      if (!day.date) return;

      const date = new Date(day.date);
      const month = date.toLocaleDateString('zh-CN', { month: 'short' });

      if (month !== lastMonth) {
        labels.push({
          month,
          col: Math.floor(index / 7)
        });
        lastMonth = month;
      }
    });

    return labels;
  }, [data]);

  const getLevelColor = (level: number): string => {
    const colors = {
      0: 'bg-gray-100 dark:bg-gray-800',
      1: 'bg-green-200 dark:bg-green-900',
      2: 'bg-green-400 dark:bg-green-700',
      3: 'bg-green-600 dark:bg-green-500',
      4: 'bg-green-800 dark:bg-green-400'
    };
    return colors[level as keyof typeof colors] || colors[0];
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        写作热力图
      </h3>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* 月份标签 */}
          <div className="flex gap-1 mb-2 ml-6">
            {monthLabels.map((label, index) => (
              <div
                key={index}
                className="text-xs text-gray-600 dark:text-gray-400"
                style={{
                  marginLeft: index === 0 ? 0 : `${(label.col - (monthLabels[index - 1]?.col || 0)) * 12}px`
                }}
              >
                {label.month}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            {/* 星期标签 */}
            <div className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400 mr-1">
              {weekDays.map((day, index) => (
                <div
                  key={day}
                  className="h-2.5 flex items-center"
                  style={{ visibility: index % 2 === 0 ? 'visible' : 'hidden' }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 热力图网格 */}
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`w-2.5 h-2.5 rounded-sm cursor-pointer transition-all hover:scale-125 ${
                        day.date ? getLevelColor(day.level) : 'bg-transparent'
                      }`}
                      onMouseEnter={() => day.date && setHoveredDate(day)}
                      onMouseLeave={() => setHoveredDate(null)}
                      title={day.date ? `${day.date}: ${day.count} entries` : ''}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Tooltip */}
          {hoveredDate && (
            <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm">
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date(hoveredDate.date).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                {hoveredDate.count} 篇日记
              </p>
            </div>
          )}

          {/* 图例 */}
          <div className="flex items-center gap-2 mt-4 text-xs text-gray-600 dark:text-gray-400">
            <span>少</span>
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className={`w-2.5 h-2.5 rounded-sm ${getLevelColor(level)}`}
              />
            ))}
            <span>多</span>
          </div>
        </div>
      </div>
    </div>
  );
}
