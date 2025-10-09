// components/statistics/TrendChart.tsx
'use client';

import { TrendData } from '@/models/statistics';
import { useMemo } from 'react';

interface TrendChartProps {
  title: string;
  data: TrendData[];
  color?: string;
  unit?: string;
  className?: string;
}

export default function TrendChart({
  title,
  data,
  color = '#3B82F6',
  unit = '',
  className = ''
}: TrendChartProps) {
  const { maxValue, points, labels } = useMemo(() => {
    if (data.length === 0) {
      return { maxValue: 0, points: [], labels: [] };
    }

    const max = Math.max(...data.map(d => d.value), 1);

    // 计算SVG路径点
    const width = 100;
    const height = 60;
    const stepX = width / (data.length - 1 || 1);

    const svgPoints = data.map((d, index) => {
      const x = index * stepX;
      const y = height - (d.value / max) * height;
      return { x, y, value: d.value };
    });

    // 格式化标签
    const formattedLabels = data.map(d => {
      const date = new Date(d.date);
      if (d.date.length === 7) {
        // YYYY-MM 格式，显示月份
        return date.toLocaleDateString('zh-CN', { month: 'short' });
      } else {
        // YYYY-MM-DD 格式，显示日期
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }
    });

    return {
      maxValue: max,
      points: svgPoints,
      labels: formattedLabels
    };
  }, [data]);

  // 生成SVG路径
  const linePath = useMemo(() => {
    if (points.length === 0) return '';

    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');
  }, [points]);

  // 生成区域填充路径
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';

    const line = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];

    return `${line} L ${lastPoint.x} 60 L ${firstPoint.x} 60 Z`;
  }, [points]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        {title}
      </h3>

      {data.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          暂无数据
        </p>
      ) : (
        <div>
          {/* SVG图表 */}
          <div className="relative h-32 mb-4">
            <svg
              viewBox="0 0 100 60"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              {/* 区域填充 */}
              <path
                d={areaPath}
                fill={color}
                opacity="0.1"
              />

              {/* 线条 */}
              <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth="0.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* 数据点 */}
              {points.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r="1"
                  fill={color}
                  className="hover:r-2 transition-all cursor-pointer"
                >
                  <title>{`${labels[index]}: ${point.value}${unit}`}</title>
                </circle>
              ))}
            </svg>
          </div>

          {/* X轴标签 */}
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            {labels.map((label, index) => {
              // 只显示部分标签，避免拥挤
              const showLabel = data.length <= 7 || index % Math.ceil(data.length / 7) === 0;
              return showLabel ? (
                <span key={index}>{label}</span>
              ) : (
                <span key={index} />
              );
            })}
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">最大值</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {maxValue}{unit}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">平均值</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length)}{unit}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">总计</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {data.reduce((sum, d) => sum + d.value, 0)}{unit}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
