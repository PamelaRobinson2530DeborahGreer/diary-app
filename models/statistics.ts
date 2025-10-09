// models/statistics.ts

export interface WritingStats {
  // 基础统计
  totalEntries: number;        // 总日记数
  totalWords: number;          // 总字数
  writingDays: number;         // 写作天数（有日记的不同日期数）
  currentStreak: number;       // 当前连续写作天数
  longestStreak: number;       // 最长连续写作天数

  // 心情统计
  moodDistribution: MoodStat[];

  // 标签统计
  topTags: TagStat[];

  // 时间统计
  averageWordsPerEntry: number;
  entriesThisWeek: number;
  entriesThisMonth: number;
  entriesThisYear: number;
}

export interface MoodStat {
  mood: string;      // emoji
  count: number;     // 出现次数
  percentage: number; // 百分比
}

export interface TagStat {
  tagId: string;
  tagName: string;
  color: string;
  icon?: string;
  count: number;     // 使用次数
  percentage: number; // 百分比
}

export interface DailyActivity {
  date: string;      // YYYY-MM-DD
  count: number;     // 当天日记数
  words: number;     // 当天总字数
}

export interface HeatmapData {
  date: string;      // YYYY-MM-DD
  level: number;     // 0-4, 类似 GitHub (0=无, 1=少, 2=中, 3=多, 4=很多)
  count: number;     // 实际日记数
}

export interface WritingGoal {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  target: number;    // 目标数量（日记数或字数）
  unit: 'entries' | 'words';
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgress {
  goal: WritingGoal;
  current: number;   // 当前进度
  percentage: number; // 完成百分比
  remaining: number;  // 剩余量
  isCompleted: boolean;
}

export interface TrendData {
  date: string;      // YYYY-MM-DD or YYYY-MM or YYYY-WW
  value: number;     // 数值（日记数、字数等）
}

export interface MoodTrend {
  mood: string;
  data: TrendData[];
}

export interface WritingTrend {
  // 按周统计
  weeklyEntries: TrendData[];
  weeklyWords: TrendData[];

  // 按月统计
  monthlyEntries: TrendData[];
  monthlyWords: TrendData[];
}
