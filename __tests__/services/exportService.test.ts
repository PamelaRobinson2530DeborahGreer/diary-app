import { describe, expect, it } from 'vitest';
import { exportService } from '@/services/exportService';
import type { JournalEntry, Tag } from '@/models/entry';

const baseDate = new Date('2024-01-01T08:00:00.000Z');

const entries: JournalEntry[] = [
  {
    id: 'entry-1',
    createdAt: baseDate.toISOString(),
    updatedAt: baseDate.toISOString(),
    html: '<p>第一条日记</p>',
    title: '早晨记录',
    mood: '😊',
    tags: ['tag-1']
  },
  {
    id: 'entry-2',
    createdAt: new Date('2023-12-25T10:00:00.000Z').toISOString(),
    updatedAt: new Date('2023-12-25T10:00:00.000Z').toISOString(),
    html: '<h2>总结</h2><p>年度复盘</p>',
    tags: ['tag-2']
  }
];

const tags: Tag[] = [
  {
    id: 'tag-1',
    name: '学习',
    color: '#3B82F6',
    icon: '📘',
    createdAt: baseDate.toISOString(),
    updatedAt: baseDate.toISOString()
  },
  {
    id: 'tag-2',
    name: '复盘',
    color: '#10B981',
    createdAt: baseDate.toISOString(),
    updatedAt: baseDate.toISOString()
  }
];

describe('exportService', () => {
  it('should produce JSON export with filtered entries and tags', async () => {
    const json = await exportService.exportToJSON(entries, tags, {
      tags: ['tag-1']
    });

    const data = JSON.parse(json);
    expect(data.metadata.entryCount).toBe(1);
    expect(data.metadata.tagCount).toBe(1);
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0].id).toBe('entry-1');
    expect(data.tags).toHaveLength(1);
    expect(data.tags[0].name).toBe('学习');
  });

  it('should convert HTML content to human-readable markdown', async () => {
    const markdown = await exportService.exportToMarkdown(entries, tags, {});

    expect(markdown).toContain('## 2024年1月1日');
    expect(markdown).toContain('### 早晨记录');
    expect(markdown).toContain('**心情**');
    expect(markdown).toContain('📘 学习');
    expect(markdown).toContain('# 日记导出');
    expect(markdown).toContain('年度复盘');
  });
});
