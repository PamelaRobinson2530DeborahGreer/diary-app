// services/importService.ts
import { JournalEntry, Tag } from '@/models/entry';
import { ExportData } from './exportService';
import { secureStorage } from './secureStorage';
import { tagService } from './tagService';

export type ConflictStrategy = 'skip' | 'overwrite' | 'keep-both';

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  conflicts: number;
  tagsImported: number;
  tagsSkipped: number;
  tagConflicts: number;
  notes: string[];
  errors: string[];
}

export interface ImportOptions {
  conflictStrategy?: ConflictStrategy;
  validateData?: boolean;
}

class ImportService {
  /**
   * 从 JSON 导入数据
   */
  async importFromJSON(
    jsonContent: string,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: 0,
      skipped: 0,
      conflicts: 0,
      tagsImported: 0,
      tagsSkipped: 0,
      tagConflicts: 0,
      notes: [],
      errors: [],
    };

    try {
      // 解析 JSON
      const data: ExportData = JSON.parse(jsonContent);

      // 验证数据格式
      if (options.validateData !== false) {
        const validationErrors = this.validateExportData(data);
        if (validationErrors.length > 0) {
          result.errors = validationErrors;
          return result;
        }
      }

      const strategy: ConflictStrategy = options.conflictStrategy || 'skip';
      const tagIdMap = await this.importTags(data.tags || [], strategy, result);

      // 获取现有日记
      const existingEntries = await secureStorage.listEntries();
      const existingIds = new Set(existingEntries.map(e => e.id));

      // 导入日记
      for (const entry of data.entries) {
        try {
          const normalizedEntry = this.prepareEntryForImport(entry, tagIdMap, result);
          const hasConflict = existingIds.has(entry.id);

          if (hasConflict) {
            result.conflicts++;
            if (strategy === 'skip') {
              result.skipped++;
              continue;
            } else if (strategy === 'overwrite') {
              await secureStorage.updateEntry(normalizedEntry, { preserveUpdatedAt: true });
              result.imported++;
              existingIds.add(entry.id);
            } else if (strategy === 'keep-both') {
              // 创建新的 ID
              const timestamp = Date.now();
              const newEntry = {
                ...normalizedEntry,
                id: `${entry.id}-imported-${timestamp}`,
                createdAt: new Date(timestamp).toISOString(),
                updatedAt: new Date().toISOString(),
              };
              await secureStorage.createEntry(newEntry);
              result.imported++;
              existingIds.add(newEntry.id);
            }
          } else {
            // 没有冲突，直接导入
            await secureStorage.createEntry(normalizedEntry);
            result.imported++;
            existingIds.add(entry.id);
          }
        } catch (error) {
          result.errors.push(
            `导入日记失败 (ID: ${entry.id}): ${error instanceof Error ? error.message : '未知错误'}`
          );
        }
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(
        `解析 JSON 失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
      return result;
    }
  }

  private async importTags(
    tags: Tag[],
    strategy: ConflictStrategy,
    result: ImportResult
  ): Promise<Map<string, string>> {
    const mapping = new Map<string, string>();
    if (!tags || tags.length === 0) {
      return mapping;
    }

    const existingTags = await tagService.loadTags();
    const existingMap = new Map(existingTags.map(tag => [tag.id, tag]));
    const now = new Date().toISOString();

    for (const tag of tags) {
      if (!tag?.id || !tag.name) {
        result.errors.push('标签数据缺失 id 或 name 字段');
        continue;
      }

      const sanitizedTag: Tag = {
        ...tag,
        name: tag.name.trim(),
        createdAt: tag.createdAt ?? now,
        updatedAt: tag.updatedAt ?? tag.createdAt ?? now
      };

      const existing = existingMap.get(sanitizedTag.id);
      if (existing) {
        result.tagConflicts++;
        if (strategy === 'skip') {
          result.tagsSkipped++;
          mapping.set(sanitizedTag.id, existing.id);
          continue;
        }

        if (strategy === 'overwrite') {
          await tagService.importTag(sanitizedTag);
          mapping.set(sanitizedTag.id, sanitizedTag.id);
          result.tagsImported++;
          continue;
        }

        const newId = this.generateImportedId(sanitizedTag.id);
        const duplicatedTag: Tag = {
          ...sanitizedTag,
          id: newId,
          createdAt: now,
          updatedAt: now
        };
        await tagService.importTag(duplicatedTag);
        mapping.set(sanitizedTag.id, duplicatedTag.id);
        result.tagsImported++;
        result.notes.push(`标签 "${sanitizedTag.name}" 已复制为新标签 (ID: ${duplicatedTag.id})`);
        continue;
      }

      await tagService.importTag(sanitizedTag);
      mapping.set(sanitizedTag.id, sanitizedTag.id);
      result.tagsImported++;
      existingMap.set(sanitizedTag.id, sanitizedTag);
    }

    return mapping;
  }

  private prepareEntryForImport(
    entry: JournalEntry,
    tagIdMap: Map<string, string>,
    result: ImportResult
  ): JournalEntry {
    const mappedTags: string[] | undefined = entry.tags
      ? entry.tags.map(tagId => tagIdMap.get(tagId) ?? tagId)
      : undefined;

    const missingTags = entry.tags?.filter(tagId => !tagIdMap.has(tagId)) ?? [];
    if (missingTags.length > 0) {
      result.notes.push(
        `日记 ${entry.id} 引用了 ${missingTags.length} 个未导入的标签: ${missingTags.join(', ')}`
      );
    }

    const normalized: JournalEntry = {
      ...entry,
      html: entry.html ?? '',
      tags: mappedTags,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt ?? entry.createdAt,
      deleted: entry.deleted ?? false,
    };

    if (entry.photo) {
      normalized.photo = undefined;
      result.notes.push(`日记 ${entry.id} 包含照片，导入时未包含原图。`);
    }

    return normalized;
  }

  private generateImportedId(base: string): string {
    const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return `${base}-imported-${suffix}`;
  }

  /**
   * 验证导出数据格式
   */
  private validateExportData(data: any): string[] {
    const errors: string[] = [];

    // 检查必需字段
    if (!data.metadata) {
      errors.push('缺少 metadata 字段');
    }

    if (!data.entries || !Array.isArray(data.entries)) {
      errors.push('缺少 entries 字段或格式不正确');
    }

    // 检查版本兼容性
    if (data.metadata?.version && !this.isVersionCompatible(data.metadata.version)) {
      errors.push(`不兼容的导出版本: ${data.metadata.version}`);
    }

    // 验证每条日记的格式
    if (data.entries) {
      data.entries.forEach((entry: any, index: number) => {
        const entryErrors = this.validateEntry(entry, index);
        errors.push(...entryErrors);
      });
    }

    if (data.tags !== undefined) {
      if (!Array.isArray(data.tags)) {
        errors.push('tags 字段格式不正确');
      } else {
        data.tags.forEach((tag: any, index: number) => {
          const tagErrors = this.validateTag(tag, index);
          errors.push(...tagErrors);
        });
      }
    }

    return errors;
  }

  /**
   * 验证单条日记格式
   */
  private validateEntry(entry: any, index: number): string[] {
    const errors: string[] = [];
    const prefix = `日记 #${index + 1}`;

    if (!entry.id) {
      errors.push(`${prefix}: 缺少 id 字段`);
    }

    if (!entry.html) {
      errors.push(`${prefix}: 缺少 html 字段`);
    } else if (typeof entry.html !== 'string') {
      errors.push(`${prefix}: html 字段格式不正确`);
    }

    if (entry.tags && !Array.isArray(entry.tags)) {
      errors.push(`${prefix}: tags 字段格式不正确`);
    }

    if (!entry.createdAt) {
      errors.push(`${prefix}: 缺少 createdAt 字段`);
    } else if (isNaN(Date.parse(entry.createdAt))) {
      errors.push(`${prefix}: createdAt 格式不正确`);
    }

    return errors;
  }

  private validateTag(tag: any, index: number): string[] {
    const errors: string[] = [];
    const prefix = `标签 #${index + 1}`;

    if (!tag) {
      errors.push(`${prefix}: 数据为空`);
      return errors;
    }

    if (!tag.id) {
      errors.push(`${prefix}: 缺少 id 字段`);
    }

    if (!tag.name) {
      errors.push(`${prefix}: 缺少 name 字段`);
    }

    if (!tag.color) {
      errors.push(`${prefix}: 缺少 color 字段`);
    }

    return errors;
  }

  /**
   * 检查版本兼容性
   */
  private isVersionCompatible(version: string): boolean {
    // 目前只支持 1.x 版本
    return version.startsWith('1.');
  }

  /**
   * 读取文件内容
   */
  async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('读取文件失败'));
        }
      };
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsText(file);
    });
  }

  /**
   * 执行导入
   */
  async import(
    file: File,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    try {
      // 检查文件类型
      if (!file.name.endsWith('.json')) {
        return {
          success: false,
          imported: 0,
          skipped: 0,
          conflicts: 0,
          tagsImported: 0,
          tagsSkipped: 0,
          tagConflicts: 0,
          notes: [],
          errors: ['只支持 .json 格式的文件'],
        };
      }

      // 读取文件
      const content = await this.readFile(file);

      // 导入数据
      return await this.importFromJSON(content, options);
    } catch (error) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        conflicts: 0,
        tagsImported: 0,
        tagsSkipped: 0,
        tagConflicts: 0,
        notes: [],
        errors: [
          `导入失败: ${error instanceof Error ? error.message : '未知错误'}`,
        ],
      };
    }
  }

  /**
   * 预览导入数据（不实际导入）
   */
  async previewImport(file: File): Promise<{
    success: boolean;
    entryCount: number;
    tagCount: number;
    metadata?: any;
    errors: string[];
  }> {
    try {
      const content = await this.readFile(file);
      const data: ExportData = JSON.parse(content);

      const validationErrors = this.validateExportData(data);

      return {
        success: validationErrors.length === 0,
        entryCount: data.entries?.length || 0,
        tagCount: Array.isArray(data.tags) ? data.tags.length : 0,
        metadata: data.metadata,
        errors: validationErrors,
      };
    } catch (error) {
      return {
        success: false,
        entryCount: 0,
        tagCount: 0,
        errors: [
          `预览失败: ${error instanceof Error ? error.message : '未知错误'}`,
        ],
      };
    }
  }
}

export const importService = new ImportService();
