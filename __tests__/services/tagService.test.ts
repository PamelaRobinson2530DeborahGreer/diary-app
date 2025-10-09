// __tests__/services/tagService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { tagService } from '@/services/tagService';

describe('TagService', () => {
  beforeEach(() => {
    // 清空缓存
    tagService.clearCache();
  });

  describe('createTag', () => {
    it('should create a tag with valid data', async () => {
      const tag = await tagService.createTag('工作', '#3B82F6', '💼');

      expect(tag).toBeDefined();
      expect(tag.name).toBe('工作');
      expect(tag.color).toBe('#3B82F6');
      expect(tag.icon).toBe('💼');
      expect(tag.id).toBeDefined();
      expect(tag.createdAt).toBeDefined();
      expect(tag.updatedAt).toBeDefined();
    });

    it('should trim tag name', async () => {
      const tag = await tagService.createTag('  工作  ', '#3B82F6');

      expect(tag.name).toBe('工作');
    });

    it('should create tag without icon', async () => {
      const tag = await tagService.createTag('学习', '#10B981');

      expect(tag.icon).toBeUndefined();
    });
  });

  describe('updateTag', () => {
    it('should update tag name', async () => {
      const tag = await tagService.createTag('工作', '#3B82F6', '💼');
      const updated = await tagService.updateTag(tag.id, { name: '学习' });

      expect(updated).toBeDefined();
      expect(updated!.name).toBe('学习');
      expect(updated!.color).toBe('#3B82F6');
      expect(updated!.updatedAt).not.toBe(tag.updatedAt);
    });

    it('should return null for non-existent tag', async () => {
      const updated = await tagService.updateTag('non-existent', { name: '测试' });

      expect(updated).toBeNull();
    });
  });

  describe('deleteTag', () => {
    it('should delete existing tag', async () => {
      const tag = await tagService.createTag('临时标签', '#FF0000');
      const deleted = await tagService.deleteTag(tag.id);

      expect(deleted).toBe(true);

      const retrieved = await tagService.getTag(tag.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent tag', async () => {
      const deleted = await tagService.deleteTag('non-existent');

      expect(deleted).toBe(false);
    });
  });

  describe('searchTags', () => {
    beforeEach(async () => {
      await tagService.createTag('工作', '#3B82F6', '💼');
      await tagService.createTag('学习', '#10B981', '📚');
      await tagService.createTag('运动', '#F59E0B', '🏃');
    });

    it('should find tags by name', async () => {
      const results = await tagService.searchTags('工作');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('工作');
    });

    it('should return all tags for empty query', async () => {
      const results = await tagService.searchTags('');

      expect(results.length).toBeGreaterThanOrEqual(3);
    });

    it('should be case insensitive', async () => {
      const results = await tagService.searchTags('学');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getTagsByIds', () => {
    it('should return tags by IDs', async () => {
      const tag1 = await tagService.createTag('标签1', '#000000');
      const tag2 = await tagService.createTag('标签2', '#FFFFFF');

      const results = await tagService.getTagsByIds([tag1.id, tag2.id]);

      expect(results.length).toBe(2);
      expect(results.map(t => t.name)).toContain('标签1');
      expect(results.map(t => t.name)).toContain('标签2');
    });

    it('should filter out non-existent IDs', async () => {
      const tag = await tagService.createTag('存在的标签', '#000000');

      const results = await tagService.getTagsByIds([tag.id, 'non-existent']);

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('存在的标签');
    });
  });
});
