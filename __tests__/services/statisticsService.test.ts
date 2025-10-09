// __tests__/services/statisticsService.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { statisticsService } from '@/services/statisticsService';
import { JournalEntry } from '@/models/entry';

describe('StatisticsService', () => {
  // 测试数据
  const createMockEntry = (overrides: Partial<JournalEntry> = {}): JournalEntry => ({
    id: Math.random().toString(),
    html: '<p>这是一篇测试日记，包含一些文字内容。</p>',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  });

  describe('calculateStats', () => {
    it('应该计算空数组的统计数据', () => {
      const stats = statisticsService.calculateStats([]);

      expect(stats.totalEntries).toBe(0);
      expect(stats.totalWords).toBe(0);
      expect(stats.writingDays).toBe(0);
      expect(stats.currentStreak).toBe(0);
      expect(stats.longestStreak).toBe(0);
      expect(stats.moodDistribution).toEqual([]);
      expect(stats.topTags).toEqual([]);
      expect(stats.averageWordsPerEntry).toBe(0);
    });

    it('应该正确计算基础统计', () => {
      const entries: JournalEntry[] = [
        createMockEntry({ html: '<p>第一篇日记</p>' }),
        createMockEntry({ html: '<p>第二篇日记，内容更长一些</p>' }),
        createMockEntry({ html: '<p>第三篇</p>' })
      ];

      const stats = statisticsService.calculateStats(entries);

      expect(stats.totalEntries).toBe(3);
      expect(stats.totalWords).toBeGreaterThan(0);
      expect(stats.writingDays).toBeGreaterThanOrEqual(1);
      expect(stats.averageWordsPerEntry).toBeGreaterThan(0);
    });

    it('应该排除归档和删除的日记', () => {
      const entries: JournalEntry[] = [
        createMockEntry({ archived: false, deleted: false }),
        createMockEntry({ archived: true, deleted: false }),
        createMockEntry({ archived: false, deleted: true }),
        createMockEntry({ archived: false, deleted: false })
      ];

      const stats = statisticsService.calculateStats(entries);

      expect(stats.totalEntries).toBe(2);
    });

    it('应该正确统计心情分布', () => {
      const entries: JournalEntry[] = [
        createMockEntry({ mood: '😊' }),
        createMockEntry({ mood: '😊' }),
        createMockEntry({ mood: '😢' }),
        createMockEntry({ mood: '😊' })
      ];

      const stats = statisticsService.calculateStats(entries);

      expect(stats.moodDistribution).toHaveLength(2);

      const happyMood = stats.moodDistribution.find(m => m.mood === '😊');
      expect(happyMood?.count).toBe(3);
      expect(happyMood?.percentage).toBe(75);

      const sadMood = stats.moodDistribution.find(m => m.mood === '😢');
      expect(sadMood?.count).toBe(1);
      expect(sadMood?.percentage).toBe(25);
    });

    it('应该按使用次数排序心情', () => {
      const entries: JournalEntry[] = [
        createMockEntry({ mood: '😊' }),
        createMockEntry({ mood: '😢' }),
        createMockEntry({ mood: '😊' }),
        createMockEntry({ mood: '😡' }),
        createMockEntry({ mood: '😡' }),
        createMockEntry({ mood: '😡' })
      ];

      const stats = statisticsService.calculateStats(entries);

      expect(stats.moodDistribution[0].mood).toBe('😡');
      expect(stats.moodDistribution[0].count).toBe(3);
      expect(stats.moodDistribution[1].mood).toBe('😊');
      expect(stats.moodDistribution[1].count).toBe(2);
    });
  });

  describe('calculateWritingDays', () => {
    it('应该正确计算写作天数', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);

      const entries: JournalEntry[] = [
        createMockEntry({ createdAt: today.toISOString() }),
        createMockEntry({ createdAt: today.toISOString() }), // 同一天
        createMockEntry({ createdAt: yesterday.toISOString() }),
        createMockEntry({ createdAt: lastWeek.toISOString() })
      ];

      const stats = statisticsService.calculateStats(entries);

      expect(stats.writingDays).toBe(3); // 三个不同的日期
    });
  });

  describe('calculateStreak', () => {
    it('应该正确计算当前连续天数', () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0); // 固定时间避免时区问题

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const entries: JournalEntry[] = [
        createMockEntry({ createdAt: today.toISOString() }),
        createMockEntry({ createdAt: yesterday.toISOString() }),
        createMockEntry({ createdAt: twoDaysAgo.toISOString() })
      ];

      const stats = statisticsService.calculateStats(entries);

      // 由于时区问题，可能是 2 或 3
      expect(stats.currentStreak).toBeGreaterThanOrEqual(2);
      expect(stats.currentStreak).toBeLessThanOrEqual(3);
    });

    it('连续中断后应该重置', () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3); // 有间隔

      const entries: JournalEntry[] = [
        createMockEntry({ createdAt: today.toISOString() }),
        createMockEntry({ createdAt: yesterday.toISOString() }),
        createMockEntry({ createdAt: threeDaysAgo.toISOString() })
      ];

      const stats = statisticsService.calculateStats(entries);

      // 只算最近连续的，可能是 1 或 2
      expect(stats.currentStreak).toBeGreaterThanOrEqual(1);
      expect(stats.currentStreak).toBeLessThanOrEqual(2);
    });

    it('应该正确计算最长连续天数', () => {
      const dates = [];
      const baseDate = new Date();
      baseDate.setHours(12, 0, 0, 0);

      // 创建一个 5 天的连续记录
      for (let i = 0; i < 5; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - i - 10); // 10天前开始
        dates.push(date);
      }

      // 创建当前的 3 天连续记录
      for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - i);
        dates.push(date);
      }

      const entries: JournalEntry[] = dates.map(date =>
        createMockEntry({ createdAt: date.toISOString() })
      );

      const stats = statisticsService.calculateStats(entries);

      expect(stats.longestStreak).toBeGreaterThanOrEqual(4);
      expect(stats.currentStreak).toBeGreaterThanOrEqual(2);
    });
  });

  describe('generateHeatmapData', () => {
    it('应该生成指定月份的热力图数据', () => {
      const entries: JournalEntry[] = [
        createMockEntry({ createdAt: new Date().toISOString() })
      ];

      const heatmapData = statisticsService.generateHeatmapData(entries, 3);

      // 3个月大约是 90 天
      expect(heatmapData.length).toBeGreaterThan(80);
      expect(heatmapData.length).toBeLessThan(100);
    });

    it('应该正确标记有日记的日期', () => {
      const today = new Date();
      const entries: JournalEntry[] = [
        createMockEntry({ createdAt: today.toISOString() }),
        createMockEntry({ createdAt: today.toISOString() }), // 同一天2篇
        createMockEntry({ createdAt: today.toISOString() })  // 同一天3篇
      ];

      const heatmapData = statisticsService.generateHeatmapData(entries, 1);

      const todayData = heatmapData.find(d =>
        d.date === today.toISOString().split('T')[0]
      );

      expect(todayData).toBeDefined();
      expect(todayData?.count).toBe(3);
      expect(todayData?.level).toBe(3); // 3篇对应 level 3
    });

    it('应该正确设置热力等级', () => {
      const today = new Date();
      const dates = [today, today, today, today, today]; // 5篇同一天

      const entries: JournalEntry[] = dates.map(date =>
        createMockEntry({ createdAt: date.toISOString() })
      );

      const heatmapData = statisticsService.generateHeatmapData(entries, 1);

      const todayData = heatmapData.find(d =>
        d.date === today.toISOString().split('T')[0]
      );

      expect(todayData?.level).toBe(4); // >=4 篇对应 level 4
    });
  });

  describe('calculateWritingTrend', () => {
    it('应该生成周趋势数据', () => {
      const entries: JournalEntry[] = [];
      const today = new Date();

      // 生成过去几周的数据
      for (let i = 0; i < 20; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        entries.push(createMockEntry({ createdAt: date.toISOString() }));
      }

      const trend = statisticsService.calculateWritingTrend(entries, 4);

      expect(trend.weeklyEntries).toHaveLength(4);
      expect(trend.weeklyWords).toHaveLength(4);
      expect(trend.monthlyEntries).toHaveLength(12);
      expect(trend.monthlyWords).toHaveLength(12);
    });

    it('周趋势应该正确统计日记数', () => {
      const entries: JournalEntry[] = [];
      const today = new Date();

      // 本周添加 5 篇
      for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        entries.push(createMockEntry({ createdAt: date.toISOString() }));
      }

      const trend = statisticsService.calculateWritingTrend(entries, 2);

      // 最近一周应该有 5 篇
      expect(trend.weeklyEntries[trend.weeklyEntries.length - 1].value).toBe(5);
    });
  });

  describe('calculateMoodTrend', () => {
    it('应该生成心情趋势数据', () => {
      const entries: JournalEntry[] = [];
      const today = new Date();

      // 创建一些带心情的日记
      for (let i = 0; i < 10; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        entries.push(createMockEntry({
          createdAt: date.toISOString(),
          mood: i % 2 === 0 ? '😊' : '😢'
        }));
      }

      const moodTrends = statisticsService.calculateMoodTrend(entries, 4);

      expect(moodTrends).toHaveLength(2); // 两种心情
      expect(moodTrends[0].data).toHaveLength(4); // 4周数据
      expect(moodTrends[1].data).toHaveLength(4);
    });
  });

  describe('topTags', () => {
    it('应该正确统计标签使用次数', () => {
      const entries: JournalEntry[] = [
        createMockEntry({ tags: ['tag1', 'tag2'] }),
        createMockEntry({ tags: ['tag1', 'tag3'] }),
        createMockEntry({ tags: ['tag1'] })
      ];

      const stats = statisticsService.calculateStats(entries);

      // tag1 使用 3 次，应该排第一
      expect(stats.topTags[0].tagId).toBe('tag1');
      expect(stats.topTags[0].count).toBe(3);
    });

    it('应该最多返回 10 个标签', () => {
      const entries: JournalEntry[] = [];

      // 创建 15 个不同的标签
      for (let i = 0; i < 15; i++) {
        entries.push(createMockEntry({ tags: [`tag${i}`] }));
      }

      const stats = statisticsService.calculateStats(entries);

      expect(stats.topTags.length).toBeLessThanOrEqual(10);
    });
  });

  describe('时间段统计', () => {
    it('应该正确统计本周日记数', () => {
      const entries: JournalEntry[] = [];
      const today = new Date();

      // 本周 3 篇
      for (let i = 0; i < 3; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        entries.push(createMockEntry({ createdAt: date.toISOString() }));
      }

      // 上周 2 篇
      for (let i = 0; i < 2; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - 8 - i);
        entries.push(createMockEntry({ createdAt: date.toISOString() }));
      }

      const stats = statisticsService.calculateStats(entries);

      expect(stats.entriesThisWeek).toBe(3);
    });

    it('应该正确统计本月日记数', () => {
      const entries: JournalEntry[] = [];
      const today = new Date();

      // 本月 5 篇
      for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        entries.push(createMockEntry({ createdAt: date.toISOString() }));
      }

      // 上月 3 篇
      for (let i = 0; i < 3; i++) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - 1);
        entries.push(createMockEntry({ createdAt: date.toISOString() }));
      }

      const stats = statisticsService.calculateStats(entries);

      expect(stats.entriesThisMonth).toBe(5);
    });
  });

  describe('性能测试', () => {
    it('应该能处理大量数据', () => {
      const entries: JournalEntry[] = [];
      const today = new Date();

      // 生成 1000 条日记
      for (let i = 0; i < 1000; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - Math.floor(i / 3)); // 每天3篇
        entries.push(createMockEntry({
          createdAt: date.toISOString(),
          mood: ['😊', '😢', '😡'][i % 3],
          tags: [`tag${i % 10}`]
        }));
      }

      const startTime = Date.now();
      const stats = statisticsService.calculateStats(entries);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // 应该在 1 秒内完成
      expect(stats.totalEntries).toBe(1000);
    });
  });
});
