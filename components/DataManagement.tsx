// components/DataManagement.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  FileJson,
  FileText,
  FileOutput,
  AlertCircle,
  CheckCircle2,
  Loader2,
  SlidersHorizontal
} from 'lucide-react';
import { exportService, type ExportOptions } from '@/services/exportService';
import { importService, type ConflictStrategy, type ImportResult } from '@/services/importService';
import { secureStorage } from '@/services/secureStorage';
import { tagService } from '@/services/tagService';
import type { Tag } from '@/models/entry';

const MOOD_OPTIONS = ['😊', '😢', '😡', '😌', '😴', '🤔', '😎', '🥳'];

type DateRange = {
  start: string;
  end: string;
};

const DEFAULT_DATE_RANGE: DateRange = { start: '', end: '' };

interface ImportPreview {
  success: boolean;
  entryCount: number;
  tagCount: number;
  metadata?: {
    version?: string;
    exportDate?: string;
    entryCount?: number;
    tagCount?: number;
    appVersion?: string;
  };
  errors: string[];
}

type ExportFormat = 'json' | 'markdown' | 'pdf';

export function DataManagement() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreview | null>(null);
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('skip');
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({ ...DEFAULT_DATE_RANGE });
  const [includePhotos, setIncludePhotos] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    tagService
      .loadTags()
      .then(tags => {
        if (active) {
          setAllTags(tags);
        }
      })
      .catch(error => {
        console.error('[DataManagement] 加载标签失败:', error);
      });

    return () => {
      active = false;
    };
  }, []);

  const exportOptions = useMemo<Partial<ExportOptions>>(() => {
    const options: Partial<ExportOptions> = {};

    if (dateRange.start || dateRange.end) {
      options.dateRange = {
        start: dateRange.start || undefined,
        end: dateRange.end || undefined
      };
    }

    if (selectedTags.length > 0) {
      options.tags = selectedTags;
    }

    if (selectedMoods.length > 0) {
      options.moods = selectedMoods;
    }

    if (includePhotos) {
      options.includePhotos = true;
    }

    return options;
  }, [dateRange, includePhotos, selectedMoods, selectedTags]);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        selectedTags.length ||
          selectedMoods.length ||
          dateRange.start ||
          dateRange.end ||
          includePhotos
      ),
    [dateRange.end, dateRange.start, includePhotos, selectedMoods.length, selectedTags.length]
  );

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const toggleMood = (mood: string) => {
    setSelectedMoods(prev =>
      prev.includes(mood) ? prev.filter(value => value !== mood) : [...prev, mood]
    );
  };

  const resetFilters = () => {
    setSelectedTags([]);
    setSelectedMoods([]);
    setDateRange({ ...DEFAULT_DATE_RANGE });
    setIncludePhotos(false);
  };

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      const [entries, tags] = await Promise.all([
        secureStorage.listEntries(),
        allTags.length ? Promise.resolve(allTags) : tagService.loadTags()
      ]);

      if (!allTags.length) {
        setAllTags(tags);
      }

      await exportService.export(entries, tags, format, exportOptions);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    try {
      const preview = await importService.previewImport(file);
      setPreviewData(preview);
      setShowImportDialog(true);
    } catch (error) {
      console.error('Preview failed:', error);
      alert('读取文件失败，请确保文件格式正确');
      setSelectedFile(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    try {
      const result = await importService.import(selectedFile, {
        conflictStrategy,
        validateData: true
      });
      setImportResult(result);

      if (result.success) {
        setTimeout(() => {
          setShowImportDialog(false);
          setSelectedFile(null);
          setPreviewData(null);
          setImportResult(null);
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('导入失败，请重试');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCancelImport = () => {
    setShowImportDialog(false);
    setSelectedFile(null);
    setPreviewData(null);
    setImportResult(null);
    setConflictStrategy('skip');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <section className="bg-card rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <FileJson className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">数据管理</h2>
        </div>

        <p className="text-sm text-muted-foreground">
          导出或导入你的日记、标签与设置元数据
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">导出数据</h3>
            <button
              type="button"
              onClick={() => setShowFilters(prev => !prev)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>{showFilters ? '隐藏筛选' : '筛选选项'}</span>
              {hasActiveFilters && (
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                  已应用
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="space-y-4 rounded-lg border border-border bg-muted/40 p-4">
              <div>
                <label className="mb-2 block text-sm font-medium">日期范围</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(event) =>
                      setDateRange(prev => ({ ...prev, start: event.target.value }))
                    }
                    className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">至</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(event) =>
                      setDateRange(prev => ({ ...prev, end: event.target.value }))
                    }
                    className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">留空表示不限制</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">标签</label>
                <div className="flex flex-wrap gap-2">
                  {allTags.length === 0 && (
                    <span className="text-xs text-muted-foreground">暂无标签可筛选</span>
                  )}
                  {allTags.map(tag => {
                    const active = selectedTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`rounded-full px-3 py-1 text-xs transition-opacity ${
                          active ? 'opacity-100 text-white' : 'opacity-60'
                        }`}
                        style={{ backgroundColor: tag.color || '#6366f1' }}
                      >
                        {tag.icon && <span className="mr-1">{tag.icon}</span>}
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">心情</label>
                <div className="flex flex-wrap gap-2">
                  {MOOD_OPTIONS.map(mood => {
                    const active = selectedMoods.includes(mood);
                    return (
                      <button
                        key={mood}
                        type="button"
                        onClick={() => toggleMood(mood)}
                        className={`rounded-lg p-2 text-2xl transition-transform ${
                          active
                            ? 'scale-110 bg-purple-100 text-purple-600 dark:bg-purple-900/40'
                            : 'bg-gray-100 text-gray-500 opacity-60 hover:opacity-100 dark:bg-gray-700'
                        }`}
                      >
                        {mood}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={includePhotos}
                    onChange={(event) => setIncludePhotos(event.target.checked)}
                    className="h-4 w-4 rounded border border-border"
                  />
                  保留照片引用（仅 JSON）
                </label>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  重置筛选
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                提示：PDF 导出不会嵌入原图，如需完整备份，请保留 JSON 文件与图片原件。
              </p>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => handleExport('json')}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-border p-3 text-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
              JSON
            </button>

            <button
              type="button"
              onClick={() => handleExport('markdown')}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-border p-3 text-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Markdown
            </button>

            <button
              type="button"
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-border p-3 text-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileOutput className="h-4 w-4" />}
              PDF
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">导入数据</h3>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-primary p-3 text-sm text-primary transition-colors hover:bg-primary/10"
          >
            <Upload className="h-4 w-4" />
            选择 JSON 文件
          </button>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            JSON 导出包含日记内容、标签定义与导出元数据；PDF 适合打印或分享但不包含图片数据。
            建议保留 JSON 作为完整备份。
          </p>
        </div>
      </section>

      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg space-y-4 rounded-lg bg-background p-6">
            <h3 className="text-lg font-semibold">导入数据</h3>

            {!importResult ? (
              <>
                {previewData && (
                  <div className="space-y-3">
                    {previewData.success ? (
                      <div className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-950/30 dark:text-green-400">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <div>
                          <p className="font-medium">文件验证通过</p>
                          <p>日记：{previewData.entryCount} 条</p>
                          <p>标签：{previewData.tagCount} 个</p>
                          {previewData.metadata && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              导出时间：
                              {previewData.metadata.exportDate
                                ? new Date(previewData.metadata.exportDate).toLocaleString('zh-CN')
                                : '未知'}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <div>
                          <p className="font-medium">文件验证失败</p>
                          <ul className="mt-1 list-disc list-inside text-xs">
                            {previewData.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {previewData.success && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">重复数据处理</label>
                        <select
                          value={conflictStrategy}
                          onChange={event => setConflictStrategy(event.target.value as ConflictStrategy)}
                          className="w-full rounded-lg border border-border bg-background p-2 text-sm"
                        >
                          <option value="skip">跳过重复项（保留本地数据）</option>
                          <option value="overwrite">覆盖本地数据</option>
                          <option value="keep-both">保留两者（新建副本）</option>
                        </select>
                        <p className="text-xs text-muted-foreground">
                          {conflictStrategy === 'skip' && '遇到相同 ID 的日记和标签将跳过导入。'}
                          {conflictStrategy === 'overwrite' && '遇到相同 ID 的记录将被导入文件覆盖。'}
                          {conflictStrategy === 'keep-both' && '遇到相同 ID 的记录会创建带有新 ID 的副本。'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCancelImport}
                    disabled={isImporting}
                    className="flex-1 rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={isImporting || !previewData?.success}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>导入中...</span>
                      </>
                    ) : (
                      <span>确认导入</span>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {importResult.success ? (
                  <div className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-950/30 dark:text-green-400">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-medium">导入成功</p>
                      <ul className="space-y-1 text-xs text-foreground dark:text-green-200">
                        <li>日记导入：{importResult.imported} 条</li>
                        {importResult.skipped > 0 && <li>日记跳过：{importResult.skipped} 条</li>}
                        {importResult.conflicts > 0 && <li>日记冲突：{importResult.conflicts} 条</li>}
                        <li>标签导入：{importResult.tagsImported} 个</li>
                        {importResult.tagsSkipped > 0 && <li>标签跳过：{importResult.tagsSkipped} 个</li>}
                        {importResult.tagConflicts > 0 && <li>标签冲突：{importResult.tagConflicts} 个</li>}
                      </ul>
                      {importResult.notes.length > 0 && (
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {importResult.notes.map((note, index) => (
                            <p key={index}>• {note}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div>
                      <p className="font-medium">导入失败</p>
                      <ul className="mt-1 list-disc list-inside text-xs">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {importResult.success && (
                  <p className="text-center text-sm text-muted-foreground">页面即将自动刷新...</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
