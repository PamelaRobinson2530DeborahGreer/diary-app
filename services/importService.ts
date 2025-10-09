// services/importService.ts
import { JournalEntry } from '@/models/entry';
import { ExportData } from './exportService';
import { secureStorage } from './secureStorage';

export type ConflictStrategy = 'skip' | 'overwrite' | 'keep-both';

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  conflicts: number;
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

      // 获取现有日记
      const existingEntries = await secureStorage.listEntries();
      const existingIds = new Set(existingEntries.map(e => e.id));

      // 导入日记
      for (const entry of data.entries) {
        try {
          const hasConflict = existingIds.has(entry.id);

          if (hasConflict) {
            result.conflicts++;
            const strategy = options.conflictStrategy || 'skip';

            if (strategy === 'skip') {
              result.skipped++;
              continue;
            } else if (strategy === 'overwrite') {
              await secureStorage.updateEntry(entry);
              result.imported++;
            } else if (strategy === 'keep-both') {
              // 创建新的 ID
              const newEntry = {
                ...entry,
                id: `${entry.id}-imported-${Date.now()}`,
                createdAt: new Date().toISOString(),
              };
              await secureStorage.createEntry(newEntry);
              result.imported++;
            }
          } else {
            // 没有冲突，直接导入
            await secureStorage.createEntry(entry);
            result.imported++;
          }
        } catch (error) {
          result.errors.push(
            `导入日记失败 (ID: ${entry.id}): ${error instanceof Error ? error.message : '未知错误'}`
          );
        }
      }

      result.success = result.errors.length === 0 || result.imported > 0;
      return result;
    } catch (error) {
      result.errors.push(
        `解析 JSON 失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
      return result;
    }
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

    if (!entry.content) {
      errors.push(`${prefix}: 缺少 content 字段`);
    }

    if (!entry.createdAt) {
      errors.push(`${prefix}: 缺少 createdAt 字段`);
    } else if (isNaN(Date.parse(entry.createdAt))) {
      errors.push(`${prefix}: createdAt 格式不正确`);
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
        metadata: data.metadata,
        errors: validationErrors,
      };
    } catch (error) {
      return {
        success: false,
        entryCount: 0,
        errors: [
          `预览失败: ${error instanceof Error ? error.message : '未知错误'}`,
        ],
      };
    }
  }
}

export const importService = new ImportService();
