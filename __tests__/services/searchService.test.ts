// __tests__/services/searchService.test.ts
import { describe, it, expect } from 'vitest';
import { searchService } from '@/services/searchService';
import { JournalEntry } from '@/models/entry';

const createMockEntry = (partial: Partial<JournalEntry>): JournalEntry => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  html: '<p>测试内容</p>',
  ...partial
});

describe('SearchService', () => {
  describe('search - text query', () => {
    it('should find entries by text content', () => {
      const entries = [
        createMockEntry({ html: '<p>今天完成了重要工作</p>' }),
        createMockEntry({ html: '<p>去公园散步</p>' }),
        createMockEntry({ html: '<p>工作进展顺利</p>' })
      ];

      const result = searchService.search(entries, { text: '工作' });

      expect(result.entries.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should be case insensitive', () => {
      const entries = [
        createMockEntry({ html: '<p>Work in progress</p>' }),
        createMockEntry({ html: '<p>WORK COMPLETE</p>' })
      ];

      const result = searchService.search(entries, { text: 'work' });

      expect(result.entries.length).toBe(2);
    });

    it('should convert HTML to plain text', () => {
      const entries = [
        createMockEntry({ html: '<p><strong>重要</strong>通知</p>' })
      ];

      const result = searchService.search(entries, { text: '重要通知' });

      expect(result.entries.length).toBe(1);
    });
  });

  describe('search - tags filter', () => {
    it('should filter by single tag', () => {
      const entries = [
        createMockEntry({ tags: ['tag1', 'tag2'] }),
        createMockEntry({ tags: ['tag2', 'tag3'] }),
        createMockEntry({ tags: ['tag3'] })
      ];

      const result = searchService.search(entries, { tags: ['tag2'] });

      expect(result.entries.length).toBe(2);
    });

    it('should filter by multiple tags (AND logic)', () => {
      const entries = [
        createMockEntry({ tags: ['tag1', 'tag2', 'tag3'] }),
        createMockEntry({ tags: ['tag1', 'tag2'] }),
        createMockEntry({ tags: ['tag2', 'tag3'] })
      ];

      const result = searchService.search(entries, { tags: ['tag1', 'tag2'] });

      expect(result.entries.length).toBe(2);
    });

    it('should exclude entries without tags', () => {
      const entries = [
        createMockEntry({ tags: ['tag1'] }),
        createMockEntry({ tags: undefined }),
        createMockEntry({ tags: [] })
      ];

      const result = searchService.search(entries, { tags: ['tag1'] });

      expect(result.entries.length).toBe(1);
    });
  });

  describe('search - moods filter', () => {
    it('should filter by mood', () => {
      const entries = [
        createMockEntry({ mood: '😊' }),
        createMockEntry({ mood: '😢' }),
        createMockEntry({ mood: '😊' })
      ];

      const result = searchService.search(entries, { moods: ['😊'] });

      expect(result.entries.length).toBe(2);
    });

    it('should filter by multiple moods (OR logic)', () => {
      const entries = [
        createMockEntry({ mood: '😊' }),
        createMockEntry({ mood: '😢' }),
        createMockEntry({ mood: '😡' })
      ];

      const result = searchService.search(entries, { moods: ['😊', '😢'] });

      expect(result.entries.length).toBe(2);
    });
  });

  describe('search - date range filter', () => {
    it('should filter by date range', () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const entries = [
        createMockEntry({ createdAt: now.toISOString() }),
        createMockEntry({ createdAt: yesterday.toISOString() }),
        createMockEntry({ createdAt: twoDaysAgo.toISOString() })
      ];

      const result = searchService.search(entries, {
        dateRange: { start: yesterday, end: now }
      });

      expect(result.entries.length).toBe(2);
    });
  });

  describe('search - archived/deleted filter', () => {
    it('should exclude deleted by default', () => {
      const entries = [
        createMockEntry({ deleted: false }),
        createMockEntry({ deleted: true }),
        createMockEntry({ deleted: false })
      ];

      const result = searchService.search(entries, {});

      expect(result.entries.length).toBe(2);
    });

    it('should include deleted when specified', () => {
      const entries = [
        createMockEntry({ deleted: false }),
        createMockEntry({ deleted: true }),
        createMockEntry({ deleted: false })
      ];

      const result = searchService.search(entries, { includeDeleted: true });

      expect(result.entries.length).toBe(3);
    });

    it('should exclude archived by default', () => {
      const entries = [
        createMockEntry({ archived: false }),
        createMockEntry({ archived: true }),
        createMockEntry({ archived: false })
      ];

      const result = searchService.search(entries, {});

      expect(result.entries.length).toBe(2);
    });
  });

  describe('search - combined filters', () => {
    it('should apply all filters', () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const entries = [
        createMockEntry({
          html: '<p>工作日志</p>',
          tags: ['tag1'],
          mood: '😊',
          createdAt: now.toISOString()
        }),
        createMockEntry({
          html: '<p>工作总结</p>',
          tags: ['tag1'],
          mood: '😊',
          createdAt: yesterday.toISOString()
        }),
        createMockEntry({
          html: '<p>工作计划</p>',
          tags: ['tag2'],
          mood: '😊',
          createdAt: now.toISOString()
        })
      ];

      const result = searchService.search(entries, {
        text: '工作',
        tags: ['tag1'],
        moods: ['😊'],
        dateRange: { start: yesterday, end: now }
      });

      expect(result.entries.length).toBe(2);
    });
  });

  describe('search - performance', () => {
    it('should return duration', () => {
      const entries = [createMockEntry({})];

      const result = searchService.search(entries, {});

      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('highlightText', () => {
    it('should highlight matching text', () => {
      const result = searchService.highlightText('这是重要通知', '重要');

      expect(result).toContain('<mark>重要</mark>');
    });

    it('should be case insensitive', () => {
      const result = searchService.highlightText('Work in progress', 'work');

      expect(result).toContain('<mark>Work</mark>');
    });
  });

  describe('getSuggestions', () => {
    it('should return high frequency words', () => {
      const entries = [
        createMockEntry({ html: '<p>工作 工作 工作</p>' }),
        createMockEntry({ html: '<p>学习 学习</p>' }),
        createMockEntry({ html: '<p>运动</p>' })
      ];

      const suggestions = searchService.getSuggestions(entries, 2);

      expect(suggestions.length).toBeLessThanOrEqual(2);
      expect(suggestions[0]).toBe('工作'); // 最高频
    });

    it('should filter short words', () => {
      const entries = [
        createMockEntry({ html: '<p>我 你 他 工作</p>' })
      ];

      const suggestions = searchService.getSuggestions(entries);

      expect(suggestions).toContain('工作');
      expect(suggestions).not.toContain('我');
    });
  });
});
