// components/statistics/StatsCard.tsx
'use client';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export default function StatsCard({
  title,
  value,
  icon,
  subtitle,
  trend,
  className = ''
}: StatsCardProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <div className="mt-2 flex items-baseline">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
            {subtitle && (
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </span>
            )}
          </div>

          {trend && (
            <div className="mt-2 flex items-center text-sm">
              <span className={`flex items-center ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="ml-2 text-gray-500 dark:text-gray-400">
                vs last period
              </span>
            </div>
          )}
        </div>

        {icon && (
          <div className="ml-4 text-4xl">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
