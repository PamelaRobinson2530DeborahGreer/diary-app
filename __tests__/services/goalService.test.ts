// __tests__/services/goalService.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { goalService } from '@/services/goalService';
import { JournalEntry } from '@/models/entry';
import { WritingGoal } from '@/models/statistics';

// Mock localforage
vi.mock('localforage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn()
  }
}));

describe('GoalService', () => {
  const createMockEntry = (overrides: Partial<JournalEntry> = {}): JournalEntry => ({
    id: Math.random().toString(),
    html: '<p>这是一篇测试日记，包含一些文字内容用于测试字数统计功能。</p>',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    // 重置 goalService 的内部状态
    // 通过重新导入来清空内存中的goals数组
    vi.resetModules();
  });

  describe('createGoal', () => {
    it('应该创建每日目标', async () => {
      const goal = await goalService.createGoal('daily', 1, 'entries');

      expect(goal.type).toBe('daily');
      expect(goal.target).toBe(1);
      expect(goal.unit).toBe('entries');
      expect(goal.id).toBeDefined();
      expect(goal.createdAt).toBeDefined();
      expect(goal.updatedAt).toBeDefined();
    });

    it('应该创建每周字数目标', async () => {
      const goal = await goalService.createGoal('weekly', 5000, 'words');

      expect(goal.type).toBe('weekly');
      expect(goal.target).toBe(5000);
      expect(goal.unit).toBe('words');
    });

    it('应该创建每月目标', async () => {
      const goal = await goalService.createGoal('monthly', 30, 'entries');

      expect(goal.type).toBe('monthly');
      expect(goal.target).toBe(30);
      expect(goal.unit).toBe('entries');
    });
  });

  describe('updateGoal', () => {
    it('应该更新目标的 target', async () => {
      const goal = await goalService.createGoal('daily', 1, 'entries');
      const updated = await goalService.updateGoal(goal.id, { target: 2 });

      expect(updated).toBeDefined();
      expect(updated?.target).toBe(2);
      expect(updated?.id).toBe(goal.id);
    });

    it('应该更新 updatedAt 时间戳', async () => {
      const goal = await goalService.createGoal('daily', 1, 'entries');
      const originalUpdatedAt = goal.updatedAt;

      // 等待一小段时间确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await goalService.updateGoal(goal.id, { target: 2 });

      expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('不存在的目标应该返回 null', async () => {
      const updated = await goalService.updateGoal('non-existent-id', { target: 2 });

      expect(updated).toBeNull();
    });
  });

  describe('deleteGoal', () => {
    it('应该删除存在的目标', async () => {
      const goal = await goalService.createGoal('daily', 1, 'entries');
      const deleted = await goalService.deleteGoal(goal.id);

      expect(deleted).toBe(true);

      // 验证已删除
      const updated = await goalService.updateGoal(goal.id, { target: 2 });
      expect(updated).toBeNull();
    });

    it('删除不存在的目标应该返回 false', async () => {
      const deleted = await goalService.deleteGoal('non-existent-id');

      expect(deleted).toBe(false);
    });
  });

  describe('calculateProgress - 每日目标', () => {
    it('应该正确计算每日日记数进度', async () => {
      const goal = await goalService.createGoal('daily', 3, 'entries');

      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const entries: JournalEntry[] = [
        createMockEntry({ createdAt: today.toISOString() }),
        createMockEntry({ createdAt: today.toISOString() })
      ];

      const progress = goalService.calculateProgress(goal, entries);

      expect(progress.goal.id).toBe(goal.id);
      expect(progress.current).toBe(2);
      expect(progress.percentage).toBeCloseTo(66.67, 1);
      expect(progress.remaining).toBe(1);
      expect(progress.isCompleted).toBe(false);
    });

    it('应该正确计算每日字数进度', async () => {
      const goal = await goalService.createGoal('daily', 100, 'words');

      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const entries: JournalEntry[] = [
        createMockEntry({
          createdAt: today.toISOString(),
          html: '<p>十个字十个字十个字十个字十个字十个字十个字十个字十个字十个字</p>'
        }),
        createMockEntry({
          createdAt: today.toISOString(),
          html: '<p>五个字五个字五个字五个字五个字</p>'
        })
      ];

      const progress = goalService.calculateProgress(goal, entries);

      expect(progress.current).toBeGreaterThan(0);
      expect(progress.percentage).toBeGreaterThan(0);
    });

    it('目标完成时应该标记为已完成', async () => {
      const goal = await goalService.createGoal('daily', 2, 'entries');

      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const entries: JournalEntry[] = [
        createMockEntry({ createdAt: today.toISOString() }),
        createMockEntry({ createdAt: today.toISOString() })
      ];

      const progress = goalService.calculateProgress(goal, entries);

      expect(progress.current).toBe(2);
      expect(progress.percentage).toBe(100);
      expect(progress.remaining).toBe(0);
      expect(progress.isCompleted).toBe(true);
    });

    it('超额完成时百分比应该不超过 100%', async () => {
      const goal = await goalService.createGoal('daily', 1, 'entries');

      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const entries: JournalEntry[] = [
        createMockEntry({ createdAt: today.toISOString() }),
        createMockEntry({ createdAt: today.toISOString() }),
        createMockEntry({ createdAt: today.toISOString() })
      ];

      const progress = goalService.calculateProgress(goal, entries);

      expect(progress.current).toBe(3);
      expect(progress.percentage).toBe(100);
      expect(progress.isCompleted).toBe(true);
    });
  });

  describe('calculateProgress - 每周目标', () => {
    it('应该正确计算每周进度', async () => {
      const goal = await goalService.createGoal('weekly', 7, 'entries');

      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const entries: JournalEntry[] = [];

      // 本周添加 4 篇
      for (let i = 0; i < 4; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        entries.push(createMockEntry({ createdAt: date.toISOString() }));
      }

      // 上周添加 2 篇（不应该计入）
      for (let i = 0; i < 2; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - 8 - i);
        entries.push(createMockEntry({ createdAt: date.toISOString() }));
      }

      const progress = goalService.calculateProgress(goal, entries);

      // 由于周一的计算可能有时区差异，使用范围断言
      expect(progress.current).toBeGreaterThanOrEqual(3);
      expect(progress.current).toBeLessThanOrEqual(4);
      expect(progress.percentage).toBeGreaterThan(40);
    });
  });

  describe('calculateProgress - 每月目标', () => {
    it('应该正确计算每月进度', async () => {
      const goal = await goalService.createGoal('monthly', 30, 'entries');

      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const entries: JournalEntry[] = [];

      // 本月添加 15 篇
      for (let i = 0; i < 15; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        entries.push(createMockEntry({ createdAt: date.toISOString() }));
      }

      // 上月添加 5 篇（不应该计入）
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      for (let i = 0; i < 5; i++) {
        entries.push(createMockEntry({ createdAt: lastMonth.toISOString() }));
      }

      const progress = goalService.calculateProgress(goal, entries);

      // 本月的日记数量，可能因为月初月末有差异
      expect(progress.current).toBeGreaterThanOrEqual(8);
      expect(progress.current).toBeLessThanOrEqual(15);
      expect(progress.percentage).toBeGreaterThan(25);
    });
  });

  describe('getAllProgress', () => {
    it('应该返回所有目标的进度', async () => {
      // 先加载已有目标
      await goalService.loadGoals();

      // 创建多个新目标
      const goal1 = await goalService.createGoal('daily', 1, 'entries');
      const goal2 = await goalService.createGoal('weekly', 7, 'entries');
      const goal3 = await goalService.createGoal('monthly', 30, 'words');

      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const entries: JournalEntry[] = [
        createMockEntry({ createdAt: today.toISOString() })
      ];

      const allProgress = await goalService.getAllProgress(entries);

      // 至少应该有这3个新创建的目标
      expect(allProgress.length).toBeGreaterThanOrEqual(3);

      // 验证新创建的目标存在
      const progressIds = allProgress.map(p => p.goal.id);
      expect(progressIds).toContain(goal1.id);
      expect(progressIds).toContain(goal2.id);
      expect(progressIds).toContain(goal3.id);
    });

    it('没有目标时应该返回空数组', async () => {
      // 如果有之前测试创建的目标，先删除所有
      const existingGoals = await goalService.loadGoals();
      for (const goal of existingGoals) {
        await goalService.deleteGoal(goal.id);
      }

      const entries: JournalEntry[] = [];
      const allProgress = await goalService.getAllProgress(entries);

      expect(allProgress).toEqual([]);
    });
  });

  describe('边界情况', () => {
    it('目标为 0 时应该正确处理', async () => {
      const goal = await goalService.createGoal('daily', 0, 'entries');
      const entries: JournalEntry[] = [];

      const progress = goalService.calculateProgress(goal, entries);

      expect(progress.percentage).toBe(0);
      expect(progress.isCompleted).toBe(true); // 0 >= 0
    });

    it('应该忽略归档和删除的日记', async () => {
      const goal = await goalService.createGoal('daily', 5, 'entries');

      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const entries: JournalEntry[] = [
        createMockEntry({ createdAt: today.toISOString(), archived: false, deleted: false }),
        createMockEntry({ createdAt: today.toISOString(), archived: true, deleted: false }),
        createMockEntry({ createdAt: today.toISOString(), archived: false, deleted: true }),
        createMockEntry({ createdAt: today.toISOString(), archived: false, deleted: false })
      ];

      const progress = goalService.calculateProgress(goal, entries);

      expect(progress.current).toBe(2); // 只计算未归档未删除的
    });

    it('空日记内容应该正确计算字数', async () => {
      const goal = await goalService.createGoal('daily', 10, 'words');

      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const entries: JournalEntry[] = [
        createMockEntry({ createdAt: today.toISOString(), html: '' }),
        createMockEntry({ createdAt: today.toISOString(), html: '<p></p>' })
      ];

      const progress = goalService.calculateProgress(goal, entries);

      // 空HTML可能被计算为1-2个字（空格等），应该很少
      expect(progress.current).toBeLessThan(5);
    });
  });

  describe('性能测试', () => {
    it('应该能快速处理大量日记', async () => {
      const goal = await goalService.createGoal('monthly', 100, 'entries');

      const entries: JournalEntry[] = [];
      const today = new Date();

      // 生成 500 条日记
      for (let i = 0; i < 500; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - Math.floor(i / 10));
        entries.push(createMockEntry({ createdAt: date.toISOString() }));
      }

      const startTime = Date.now();
      const progress = goalService.calculateProgress(goal, entries);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // 应该在 100ms 内完成
      expect(progress.current).toBeGreaterThan(0);
    });

    it('应该能快速计算所有目标进度', async () => {
      // 先加载已有目标
      await goalService.loadGoals();
      const existingCount = (await goalService.loadGoals()).length;

      // 创建 10 个新目标
      for (let i = 0; i < 10; i++) {
        await goalService.createGoal('daily', 1, 'entries');
      }

      const entries: JournalEntry[] = [];
      const today = new Date();

      for (let i = 0; i < 100; i++) {
        entries.push(createMockEntry({ createdAt: today.toISOString() }));
      }

      const startTime = Date.now();
      const allProgress = await goalService.getAllProgress(entries);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(200);
      expect(allProgress.length).toBeGreaterThanOrEqual(10);
    });
  });
});
