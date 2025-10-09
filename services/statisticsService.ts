// services/statisticsService.ts

import { JournalEntry } from '@/models/entry';
import { tagService } from './tagService';
import {
  WritingStats,
  MoodStat,
  TagStat,
  DailyActivity,
  HeatmapData,
  WritingGoal,
  GoalProgress,
  TrendData,
  MoodTrend,
  WritingTrend
} from '@/models/statistics';

class StatisticsService {
  /**
   * 计算综合统计数据
   */
  calculateStats(entries: JournalEntry[]): WritingStats {
    // 只统计活跃的日记（非归档、非删除）
    const activeEntries = entries.filter(e => !e.archived && !e.deleted);

    return {
      totalEntries: activeEntries.length,
      totalWords: this.calculateTotalWords(activeEntries),
      writingDays: this.calculateWritingDays(activeEntries),
      currentStreak: this.calculateCurrentStreak(activeEntries),
      longestStreak: this.calculateLongestStreak(activeEntries),
      moodDistribution: this.calculateMoodDistribution(activeEntries),
      topTags: this.calculateTopTags(activeEntries),
      averageWordsPerEntry: this.calculateAverageWords(activeEntries),
      entriesThisWeek: this.countEntriesInPeriod(activeEntries, 'week'),
      entriesThisMonth: this.countEntriesInPeriod(activeEntries, 'month'),
      entriesThisYear: this.countEntriesInPeriod(activeEntries, 'year')
    };
  }

  /**
   * 计算总字数（从 HTML 提取纯文本）
   */
  private calculateTotalWords(entries: JournalEntry[]): number {
    return entries.reduce((total, entry) => {
      const text = this.htmlToText(entry.html || '');
      const words = text.trim().split(/\s+/).length;
      return total + words;
    }, 0);
  }

  /**
   * HTML 转纯文本
   */
  private htmlToText(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  /**
   * 计算写作天数
   */
  private calculateWritingDays(entries: JournalEntry[]): number {
    const uniqueDates = new Set(
      entries.map(e => new Date(e.createdAt).toISOString().split('T')[0])
    );
    return uniqueDates.size;
  }

  /**
   * 计算当前连续写作天数
   */
  private calculateCurrentStreak(entries: JournalEntry[]): number {
    if (entries.length === 0) return 0;

    // 按日期分组
    const dateMap = this.groupByDate(entries);
    const dates = Array.from(dateMap.keys()).sort();

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 从今天开始往前查
    let checkDate = new Date(today);

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dateMap.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * 计算最长连续写作天数
   */
  private calculateLongestStreak(entries: JournalEntry[]): number {
    if (entries.length === 0) return 0;

    const dateMap = this.groupByDate(entries);
    const dates = Array.from(dateMap.keys()).sort();

    let maxStreak = 0;
    let currentStreak = 1;

    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);

      // 计算日期差（天数）
      const diffTime = currDate.getTime() - prevDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
    }

    return Math.max(maxStreak, currentStreak);
  }

  /**
   * 按日期分组
   */
  private groupByDate(entries: JournalEntry[]): Map<string, JournalEntry[]> {
    const map = new Map<string, JournalEntry[]>();

    entries.forEach(entry => {
      const date = new Date(entry.createdAt).toISOString().split('T')[0];
      if (!map.has(date)) {
        map.set(date, []);
      }
      map.get(date)!.push(entry);
    });

    return map;
  }

  /**
   * 计算心情分布
   */
  private calculateMoodDistribution(entries: JournalEntry[]): MoodStat[] {
    const moodCount = new Map<string, number>();

    entries.forEach(entry => {
      if (entry.mood) {
        moodCount.set(entry.mood, (moodCount.get(entry.mood) || 0) + 1);
      }
    });

    const total = entries.length;

    return Array.from(moodCount.entries())
      .map(([mood, count]) => ({
        mood,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 计算最常用标签
   * 注意：标签名称需要异步加载，这里只返回 tagId
   */
  private calculateTopTags(entries: JournalEntry[]): TagStat[] {
    const tagCount = new Map<string, number>();

    entries.forEach(entry => {
      entry.tags?.forEach(tagId => {
        tagCount.set(tagId, (tagCount.get(tagId) || 0) + 1);
      });
    });

    const total = Array.from(tagCount.values()).reduce((sum, count) => sum + count, 0);

    return Array.from(tagCount.entries())
      .map(([tagId, count]) => {
        return {
          tagId,
          tagName: tagId, // 临时使用 ID，UI 层会加载真实名称
          color: '#999',
          icon: undefined,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // 只返回前10个
  }

  /**
   * 计算平均字数
   */
  private calculateAverageWords(entries: JournalEntry[]): number {
    if (entries.length === 0) return 0;
    const totalWords = this.calculateTotalWords(entries);
    return Math.round(totalWords / entries.length);
  }

  /**
   * 统计特定时间段的日记数
   */
  private countEntriesInPeriod(entries: JournalEntry[], period: 'week' | 'month' | 'year'): number {
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return entries.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      return entryDate >= startDate;
    }).length;
  }

  /**
   * 生成日历热力图数据
   */
  generateHeatmapData(entries: JournalEntry[], months: number = 12): HeatmapData[] {
    const activeEntries = entries.filter(e => !e.archived && !e.deleted);
    const dateMap = this.groupByDate(activeEntries);

    const result: HeatmapData[] = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // 遍历日期范围
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayEntries = dateMap.get(dateStr) || [];
      const count = dayEntries.length;

      // 计算热力等级 (0-4)
      let level = 0;
      if (count === 1) level = 1;
      else if (count === 2) level = 2;
      else if (count === 3) level = 3;
      else if (count >= 4) level = 4;

      result.push({
        date: dateStr,
        level,
        count
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  /**
   * 计算写作趋势
   */
  calculateWritingTrend(entries: JournalEntry[], weeks: number = 12): WritingTrend {
    const activeEntries = entries.filter(e => !e.archived && !e.deleted);

    return {
      weeklyEntries: this.calculateWeeklyTrend(activeEntries, weeks, 'entries'),
      weeklyWords: this.calculateWeeklyTrend(activeEntries, weeks, 'words'),
      monthlyEntries: this.calculateMonthlyTrend(activeEntries, 12, 'entries'),
      monthlyWords: this.calculateMonthlyTrend(activeEntries, 12, 'words')
    };
  }

  /**
   * 计算按周趋势
   */
  private calculateWeeklyTrend(
    entries: JournalEntry[],
    weeks: number,
    metric: 'entries' | 'words'
  ): TrendData[] {
    const result: TrendData[] = [];
    const endDate = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
      const weekEnd = new Date(endDate);
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      const weekEntries = entries.filter(entry => {
        const entryDate = new Date(entry.createdAt);
        return entryDate >= weekStart && entryDate <= weekEnd;
      });

      const value = metric === 'entries'
        ? weekEntries.length
        : this.calculateTotalWords(weekEntries);

      result.push({
        date: weekStart.toISOString().split('T')[0],
        value
      });
    }

    return result;
  }

  /**
   * 计算按月趋势
   */
  private calculateMonthlyTrend(
    entries: JournalEntry[],
    months: number,
    metric: 'entries' | 'words'
  ): TrendData[] {
    const result: TrendData[] = [];
    const endDate = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(endDate);
      monthDate.setMonth(monthDate.getMonth() - i);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();

      const monthEntries = entries.filter(entry => {
        const entryDate = new Date(entry.createdAt);
        return entryDate.getFullYear() === year && entryDate.getMonth() === month;
      });

      const value = metric === 'entries'
        ? monthEntries.length
        : this.calculateTotalWords(monthEntries);

      result.push({
        date: `${year}-${String(month + 1).padStart(2, '0')}`,
        value
      });
    }

    return result;
  }

  /**
   * 计算心情趋势
   */
  calculateMoodTrend(entries: JournalEntry[], weeks: number = 12): MoodTrend[] {
    const activeEntries = entries.filter(e => !e.archived && !e.deleted);

    // 找出所有出现过的心情
    const moods = new Set<string>();
    activeEntries.forEach(entry => {
      if (entry.mood) moods.add(entry.mood);
    });

    return Array.from(moods).map(mood => ({
      mood,
      data: this.calculateMoodWeeklyTrend(activeEntries, mood, weeks)
    }));
  }

  /**
   * 计算单个心情的周趋势
   */
  private calculateMoodWeeklyTrend(
    entries: JournalEntry[],
    mood: string,
    weeks: number
  ): TrendData[] {
    const result: TrendData[] = [];
    const endDate = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
      const weekEnd = new Date(endDate);
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      const count = entries.filter(entry => {
        const entryDate = new Date(entry.createdAt);
        return entryDate >= weekStart &&
               entryDate <= weekEnd &&
               entry.mood === mood;
      }).length;

      result.push({
        date: weekStart.toISOString().split('T')[0],
        value: count
      });
    }

    return result;
  }
}

export const statisticsService = new StatisticsService();
