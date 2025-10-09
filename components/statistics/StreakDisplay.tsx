// components/statistics/StreakDisplay.tsx
'use client';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
}

export default function StreakDisplay({
  currentStreak,
  longestStreak,
  className = ''
}: StreakDisplayProps) {
  return (
    <div className={`bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-sm p-6 text-white ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>🔥</span>
        <span>连续写作</span>
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
          <p className="text-sm opacity-90 mb-1">当前连续</p>
          <p className="text-4xl font-bold">{currentStreak}</p>
          <p className="text-sm opacity-90 mt-1">天</p>
        </div>

        <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
          <p className="text-sm opacity-90 mb-1">最长记录</p>
          <p className="text-4xl font-bold">{longestStreak}</p>
          <p className="text-sm opacity-90 mt-1">天</p>
        </div>
      </div>

      {currentStreak === 0 && (
        <p className="text-sm opacity-90 mt-4 text-center">
          今天还没有写日记哦，快来记录吧！
        </p>
      )}

      {currentStreak > 0 && currentStreak === longestStreak && (
        <p className="text-sm opacity-90 mt-4 text-center">
          🎉 正在创造新纪录！保持下去！
        </p>
      )}
    </div>
  );
}
