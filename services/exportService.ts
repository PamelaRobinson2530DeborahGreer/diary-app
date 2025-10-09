// services/exportService.ts
import { JournalEntry } from '@/models/entry';

export interface ExportOptions {
  format: 'json' | 'markdown';
  includePhotos?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  moods?: string[];
}

export interface ExportMetadata {
  version: string;
  exportDate: string;
  entryCount: number;
  appVersion: string;
}

export interface ExportData {
  metadata: ExportMetadata;
  entries: JournalEntry[];
}

class ExportService {
  private readonly APP_VERSION = '1.0.0';
  private readonly EXPORT_VERSION = '1.0';

  /**
   * 导出为 JSON 格式
   */
  async exportToJSON(
    entries: JournalEntry[],
    options: Partial<ExportOptions> = {}
  ): Promise<string> {
    const filteredEntries = this.filterEntries(entries, options);

    const exportData: ExportData = {
      metadata: {
        version: this.EXPORT_VERSION,
        exportDate: new Date().toISOString(),
        entryCount: filteredEntries.length,
        appVersion: this.APP_VERSION,
      },
      entries: filteredEntries,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 导出为 Markdown 格式
   */
  async exportToMarkdown(
    entries: JournalEntry[],
    options: Partial<ExportOptions> = {}
  ): Promise<string> {
    const filteredEntries = this.filterEntries(entries, options);

    let markdown = '# 日记导出\n\n';
    markdown += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
    markdown += `日记数量: ${filteredEntries.length}\n\n`;
    markdown += '---\n\n';

    // 按日期排序
    const sortedEntries = [...filteredEntries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    for (const entry of sortedEntries) {
      markdown += this.entryToMarkdown(entry);
      markdown += '\n---\n\n';
    }

    return markdown;
  }

  /**
   * 单条日记转 Markdown
   */
  private entryToMarkdown(entry: JournalEntry): string {
    let md = '';

    // 日期标题
    const date = new Date(entry.createdAt);
    md += `## ${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日\n\n`;

    // 元信息
    if (entry.mood) {
      md += `**心情**: ${this.getMoodEmoji(entry.mood)} ${entry.mood}\n\n`;
    }

    if (entry.tags && entry.tags.length > 0) {
      md += `**标签**: ${entry.tags.map(tag => `\`${tag}\``).join(', ')}\n\n`;
    }

    // 将 HTML 内容转换为 Markdown
    // 简单的 HTML -> Markdown 转换
    let content = entry.html;

    // 移除 HTML 标签，保留文本
    content = content
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<u[^>]*>(.*?)<\/u>/gi, '$1')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<ul[^>]*>(.*?)<\/ul>/gi, '$1')
      .replace(/<ol[^>]*>(.*?)<\/ol>/gi, '$1')
      .replace(/<[^>]+>/g, ''); // 移除其他所有 HTML 标签

    md += content;

    // 照片提示
    if (entry.photo) {
      md += '\n\n📷 *此日记包含照片*\n';
    }

    // 时间戳
    md += `\n\n*创建于: ${new Date(entry.createdAt).toLocaleString('zh-CN')}*\n`;
    if (entry.updatedAt && entry.updatedAt !== entry.createdAt) {
      md += `*更新于: ${new Date(entry.updatedAt).toLocaleString('zh-CN')}*\n`;
    }

    return md;
  }

  /**
   * 根据选项筛选日记
   */
  private filterEntries(
    entries: JournalEntry[],
    options: Partial<ExportOptions>
  ): JournalEntry[] {
    let filtered = [...entries];

    // 日期范围筛选
    if (options.dateRange) {
      const { start, end } = options.dateRange;
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.createdAt);
        return entryDate >= start && entryDate <= end;
      });
    }

    // 标签筛选
    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter(entry =>
        entry.tags?.some(tag => options.tags!.includes(tag))
      );
    }

    // 心情筛选
    if (options.moods && options.moods.length > 0) {
      filtered = filtered.filter(entry =>
        entry.mood && options.moods!.includes(entry.mood)
      );
    }

    return filtered;
  }

  /**
   * 获取心情表情
   */
  private getMoodEmoji(mood: string): string {
    const moodEmojis: { [key: string]: string } = {
      '开心': '😊',
      '平静': '😌',
      '悲伤': '😢',
      '焦虑': '😰',
      '愤怒': '😠',
      '兴奋': '🤩',
      '疲惫': '😴',
      '感恩': '🙏',
    };
    return moodEmojis[mood] || '📝';
  }

  /**
   * 下载文件
   */
  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 生成导出文件名
   */
  generateFilename(format: 'json' | 'markdown'): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const extension = format === 'json' ? 'json' : 'md';
    return `journal-export-${dateStr}.${extension}`;
  }

  /**
   * 执行导出
   */
  async export(
    entries: JournalEntry[],
    format: 'json' | 'markdown',
    options: Partial<ExportOptions> = {}
  ): Promise<void> {
    let content: string;
    let mimeType: string;

    if (format === 'json') {
      content = await this.exportToJSON(entries, options);
      mimeType = 'application/json';
    } else {
      content = await this.exportToMarkdown(entries, options);
      mimeType = 'text/markdown';
    }

    const filename = this.generateFilename(format);
    this.downloadFile(content, filename, mimeType);
  }
}

export const exportService = new ExportService();
