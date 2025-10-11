// components/DataManagement.tsx
'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileJson, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { exportService } from '@/services/exportService';
import { importService, type ConflictStrategy, type ImportResult } from '@/services/importService';
import { secureStorage } from '@/services/secureStorage';

export function DataManagement() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportResult | null>(null);
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('skip');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 导出为 JSON
  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const entries = await secureStorage.listEntries();
      await exportService.export(entries, 'json');
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  // 导出为 Markdown
  const handleExportMarkdown = async () => {
    setIsExporting(true);
    try {
      const entries = await secureStorage.listEntries();
      await exportService.export(entries, 'markdown');
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  // 文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // 预览导入数据
    try {
      const preview = await importService.previewImport(file);
      setPreviewData(preview);
      setShowImportDialog(true);
    } catch {
      alert('读取文件失败，请确保文件格式正确');
      setSelectedFile(null);
    }
  };

  // 执行导入
  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    try {
      const result = await importService.import(selectedFile, {
        conflictStrategy,
        validateData: true,
      });
      setImportResult(result);

      if (result.success) {
        // 延迟关闭对话框，让用户看到结果
        setTimeout(() => {
          setShowImportDialog(false);
          setSelectedFile(null);
          setPreviewData(null);
          setImportResult(null);
          // 刷新页面以显示导入的数据
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

  // 取消导入
  const handleCancelImport = () => {
    setShowImportDialog(false);
    setSelectedFile(null);
    setPreviewData(null);
    setImportResult(null);
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
          导出或导入你的日记数据
        </p>

        {/* Export Buttons */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">导出数据</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportJSON}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 p-3 border-2 border-border rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileJson className="w-4 h-4" />
              )}
              <span className="text-sm">JSON 格式</span>
            </button>

            <button
              onClick={handleExportMarkdown}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 p-3 border-2 border-border rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span className="text-sm">Markdown</span>
            </button>
          </div>
        </div>

        {/* Import Button */}
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
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 p-3 border-2 border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm">选择 JSON 文件</span>
          </button>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-600 dark:text-blue-400">
            导出的文件包含所有日记数据（已加密内容除外）。导入时会自动检测重复数据。
          </p>
        </div>
      </section>

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">导入数据</h3>

            {!importResult ? (
              <>
                {/* Preview */}
                {previewData && (
                  <div className="space-y-3">
                    {previewData.success ? (
                      <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-green-600 dark:text-green-400">
                          <p className="font-medium">文件验证通过</p>
                          <p>将导入 {previewData.entryCount} 条日记</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-red-600 dark:text-red-400">
                          <p className="font-medium">文件验证失败</p>
                          <ul className="mt-1 list-disc list-inside">
                            {previewData.errors.map((error: string, i: number) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Conflict Strategy */}
                    {previewData.success && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">重复数据处理</label>
                        <select
                          value={conflictStrategy}
                          onChange={(e) => setConflictStrategy(e.target.value as ConflictStrategy)}
                          className="w-full p-2 border border-border rounded-lg bg-background"
                        >
                          <option value="skip">跳过重复项</option>
                          <option value="overwrite">覆盖已有数据</option>
                          <option value="keep-both">保留两者</option>
                        </select>
                        <p className="text-xs text-muted-foreground">
                          {conflictStrategy === 'skip' && '重复的日记将被跳过，不会导入'}
                          {conflictStrategy === 'overwrite' && '重复的日记将被新数据覆盖'}
                          {conflictStrategy === 'keep-both' && '重复的日记将以新 ID 保存'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelImport}
                    disabled={isImporting}
                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={isImporting || !previewData?.success}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>导入中...</span>
                      </>
                    ) : (
                      <span>确认导入</span>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Import Result */}
                <div className="space-y-3">
                  {importResult.success ? (
                    <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-green-600 dark:text-green-400">
                        <p className="font-medium">导入成功！</p>
                        <ul className="mt-1 space-y-1">
                          <li>已导入: {importResult.imported} 条</li>
                          {importResult.skipped > 0 && <li>已跳过: {importResult.skipped} 条</li>}
                          {importResult.conflicts > 0 && <li>冲突: {importResult.conflicts} 条</li>}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-red-600 dark:text-red-400">
                        <p className="font-medium">导入失败</p>
                        <ul className="mt-1 list-disc list-inside">
                          {importResult.errors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {importResult.success && (
                  <p className="text-sm text-muted-foreground text-center">
                    页面将自动刷新...
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
