// app/statistics/page.tsx
'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { secureStorage } from '@/services/secureStorage';
import { statisticsService } from '@/services/statisticsService';
import { goalService } from '@/services/goalService';
import { JournalEntry } from '@/models/entry';
import { WritingStats, GoalProgress } from '@/models/statistics';

import StatsCard from '@/components/statistics/StatsCard';
import MoodDistributionChart from '@/components/statistics/MoodDistributionChart';
import TopTagsChart from '@/components/statistics/TopTagsChart';
import StreakDisplay from '@/components/statistics/StreakDisplay';
import HeatmapCalendar from '@/components/statistics/HeatmapCalendar';
import GoalTracker from '@/components/statistics/GoalTracker';
import TrendChart from '@/components/statistics/TrendChart';

export default function StatisticsPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<WritingStats | null>(null);
  const [goalProgress, setGoalProgress] = useState<GoalProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      // 检查是否已解锁
      const isUnlocked = await secureStorage.isUnlocked();
      if (!isUnlocked) {
        router.push('/');
        return;
      }

      // 加载日记数据
      const allEntries = await secureStorage.listEntries();
      setEntries(allEntries);

      // 计算统计数据
      const statistics = statisticsService.calculateStats(allEntries);

      // 加载标签数据并填充到统计结果中
      const { tagService } = await import('@/services/tagService');
      const allTags = await tagService.loadTags();

      // 更新标签统计信息
      statistics.topTags = statistics.topTags.map(tagStat => {
        const tag = allTags.find(t => t.id === tagStat.tagId);
        return {
          ...tagStat,
          tagName: tag?.name || tagStat.tagId,
          color: tag?.color || '#999',
          icon: tag?.icon
        };
      });

      setStats(statistics);

      // 加载目标进度
      const progress = await goalService.getAllProgress(allEntries);
      setGoalProgress(progress);

    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // 生成热力图数据
  const heatmapData = useMemo(() => {
    if (entries.length === 0) return [];
    return statisticsService.generateHeatmapData(entries, 6); // 最近6个月
  }, [entries]);

  // 计算趋势数据
  const trendData = useMemo(() => {
    if (entries.length === 0) return null;
    return statisticsService.calculateWritingTrend(entries, 12); // 最近12周
  }, [entries]);

  const handleCreateGoal = async () => {
    // 简单实现：创建一个默认的每日目标
    await goalService.createGoal('daily', 1, 'entries');
    await loadData(); // 重新加载数据
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">
          加载统计数据...
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">
          无法加载统计数据
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页头 */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← 返回
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            📊 数据统计
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            了解你的写作习惯和成就
          </p>
        </div>

        {/* 基础统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatsCard
            title="总日记数"
            value={stats.totalEntries}
            icon="📝"
            subtitle="篇"
          />
          <StatsCard
            title="总字数"
            value={stats.totalWords.toLocaleString()}
            icon="✍️"
            subtitle="字"
          />
          <StatsCard
            title="写作天数"
            value={stats.writingDays}
            icon="📅"
            subtitle="天"
          />
          <StatsCard
            title="平均字数"
            value={stats.averageWordsPerEntry}
            icon="📊"
            subtitle="字/篇"
          />
        </div>

        {/* 连续写作 */}
        <StreakDisplay
          currentStreak={stats.currentStreak}
          longestStreak={stats.longestStreak}
          className="mb-6"
        />

        {/* 写作目标 */}
        <GoalTracker
          progress={goalProgress}
          onCreateGoal={handleCreateGoal}
          className="mb-6"
        />

        {/* 热力图 */}
        <HeatmapCalendar
          data={heatmapData}
          className="mb-6"
        />

        {/* 趋势图表 */}
        {trendData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <TrendChart
              title="每周日记数"
              data={trendData.weeklyEntries}
              color="#3B82F6"
              unit="篇"
            />
            <TrendChart
              title="每周字数"
              data={trendData.weeklyWords}
              color="#8B5CF6"
              unit="字"
            />
          </div>
        )}

        {/* 心情和标签分布 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MoodDistributionChart data={stats.moodDistribution} />
          <TopTagsChart data={stats.topTags} />
        </div>

        {/* 时间段统计 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <StatsCard
            title="本周"
            value={stats.entriesThisWeek}
            subtitle="篇日记"
          />
          <StatsCard
            title="本月"
            value={stats.entriesThisMonth}
            subtitle="篇日记"
          />
          <StatsCard
            title="今年"
            value={stats.entriesThisYear}
            subtitle="篇日记"
          />
        </div>
      </div>
    </div>
  );
}
