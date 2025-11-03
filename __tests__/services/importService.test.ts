import { beforeEach, describe, expect, it, vi } from 'vitest';

import { importService } from '@/services/importService';

const mocks = vi.hoisted(() => {
  return {
    listEntries: vi.fn(),
    createEntry: vi.fn(),
    updateEntry: vi.fn(),
    loadTags: vi.fn(),
    importTag: vi.fn()
  };
});

vi.mock('@/services/secureStorage', () => ({
  secureStorage: {
    listEntries: mocks.listEntries,
    createEntry: mocks.createEntry,
    updateEntry: mocks.updateEntry
  }
}));

vi.mock('@/services/tagService', () => ({
  tagService: {
    loadTags: mocks.loadTags,
    importTag: mocks.importTag
  }
}));

const makeExportPayload = (overrides: Partial<Record<string, unknown>> = {}) => {
  const now = new Date('2024-01-01T08:00:00.000Z').toISOString();
  return {
    metadata: {
      version: '1.1',
      exportDate: now,
      entryCount: 1,
      tagCount: 1,
      appVersion: '1.0.0'
    },
    entries: [
      {
        id: 'entry-1',
        createdAt: now,
        updatedAt: now,
        html: '<p>导入测试</p>',
        tags: ['tag-1']
      }
    ],
    tags: [
      {
        id: 'tag-1',
        name: '学习',
        color: '#3B82F6',
        createdAt: now,
        updatedAt: now
      }
    ],
    ...overrides
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listEntries.mockResolvedValue([]);
  mocks.createEntry.mockResolvedValue(undefined);
  mocks.updateEntry.mockResolvedValue(undefined);
  mocks.importTag.mockImplementation(async (tag) => tag);
  mocks.loadTags.mockResolvedValue([]);
});

describe('importService.importFromJSON', () => {
  it('imports entries and tags when no conflicts exist', async () => {
    const payload = makeExportPayload();
    const json = JSON.stringify(payload);

    const result = await importService.importFromJSON(json, {
      conflictStrategy: 'skip'
    });

    expect(result.success).toBe(true);
    expect(result.imported).toBe(1);
    expect(result.tagsImported).toBe(1);
    expect(mocks.createEntry).toHaveBeenCalledTimes(1);
    expect(mocks.createEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'entry-1',
        tags: ['tag-1'],
        html: '<p>导入测试</p>'
      })
    );
    expect(mocks.importTag).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tag-1', name: '学习' })
    );
  });

  it('duplicates conflicting entries when strategy is keep-both', async () => {
    const now = new Date('2024-01-01T08:00:00.000Z').toISOString();
    const payload = makeExportPayload();
    const json = JSON.stringify(payload);

    mocks.listEntries.mockResolvedValue([{ id: 'entry-1' }]);
    mocks.loadTags.mockResolvedValue([
      { id: 'tag-1', name: '学习', color: '#3B82F6', createdAt: now, updatedAt: now }
    ]);

    const result = await importService.importFromJSON(json, {
      conflictStrategy: 'keep-both'
    });

    expect(result.success).toBe(true);
    expect(result.conflicts).toBe(1);
    expect(result.imported).toBe(1);
    expect(mocks.createEntry).toHaveBeenCalledTimes(1);

    const newEntry = mocks.createEntry.mock.calls[0][0];
    expect(newEntry.id).toMatch(/^entry-1-imported-/);
    expect(newEntry.tags?.[0]).toMatch(/^tag-1-imported-/);
    expect(result.notes.some(note => note.includes('标签'))).toBe(true);

    const duplicatedTag = mocks.importTag.mock.calls.at(-1)?.[0];
    expect(duplicatedTag?.id).toMatch(/^tag-1-imported-/);
  });
});
