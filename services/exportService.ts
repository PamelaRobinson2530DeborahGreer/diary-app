// services/exportService.ts
import { PDFDocument, rgb, PDFFont } from 'pdf-lib';
import { JournalEntry, Tag } from '@/models/entry';

export interface ExportOptions {
  includePhotos?: boolean;
  dateRange?: {
    start?: Date | string;
    end?: Date | string;
  };
  tags?: string[];
  moods?: string[];
}

export interface ExportMetadata {
  version: string;
  exportDate: string;
  entryCount: number;
  tagCount: number;
  appVersion: string;
}

export interface ExportData {
  metadata: ExportMetadata;
  entries: JournalEntry[];
  tags: Tag[];
}

class ExportService {
  private readonly APP_VERSION = '1.0.0';
  private readonly EXPORT_VERSION = '1.1';
  private readonly FONT_URL = '/fonts/NotoSansSC-Regular.otf';
  private readonly PDF_PAGE_SIZE: [number, number] = [595.28, 841.89]; // A4 portrait
  private readonly PDF_MARGIN = 48;
  private fontBytesCache: Uint8Array | null = null;

  private buildExportData(
    entries: JournalEntry[],
    tags: Tag[],
    options: Partial<ExportOptions> = {}
  ): ExportData {
    const filteredEntries = this.filterEntries(entries, options);
    const preparedEntries = filteredEntries.map(entry =>
      this.prepareEntryForExport(entry, options)
    );

    const tagIndex = new Map(tags.map(tag => [tag.id, tag]));
    const tagIds = new Set<string>();
    preparedEntries.forEach(entry => {
      entry.tags?.forEach(tagId => {
        if (tagIndex.has(tagId)) {
          tagIds.add(tagId);
        }
      });
    });

    const exportTags = Array.from(tagIds)
      .map(id => tagIndex.get(id))
      .filter((tag): tag is Tag => Boolean(tag))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

    const metadata: ExportMetadata = {
      version: this.EXPORT_VERSION,
      exportDate: new Date().toISOString(),
      entryCount: preparedEntries.length,
      tagCount: exportTags.length,
      appVersion: this.APP_VERSION
    };

    return {
      metadata,
      entries: preparedEntries.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      tags: exportTags
    };
  }

  /**
   * 导出为 JSON 格式
   */
  async exportToJSON(
    entries: JournalEntry[],
    tags: Tag[],
    options: Partial<ExportOptions> = {}
  ): Promise<string> {
    const exportData = this.buildExportData(entries, tags, options);
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 导出为 Markdown 格式
   */
  async exportToMarkdown(
    entries: JournalEntry[],
    tags: Tag[],
    options: Partial<ExportOptions> = {}
  ): Promise<string> {
    const exportData = this.buildExportData(entries, tags, options);
    const tagLookup = new Map(exportData.tags.map(tag => [tag.id, tag]));
    let markdown = '# 日记导出\n\n';
    markdown += `导出时间: ${new Date(exportData.metadata.exportDate).toLocaleString('zh-CN')}\n`;
    markdown += `日记数量: ${exportData.metadata.entryCount}\n`;
    markdown += `标签数量: ${exportData.metadata.tagCount}\n\n`;
    markdown += '---\n\n';

    for (const entry of exportData.entries) {
      markdown += this.entryToMarkdown(entry, tagLookup);
      markdown += '\n---\n\n';
    }

    return markdown.trimEnd();
  }

  async exportToPDF(
    entries: JournalEntry[],
    tags: Tag[],
    options: Partial<ExportOptions> = {}
  ): Promise<Uint8Array> {
    const exportData = this.buildExportData(entries, tags, options);
    const pdfDoc = await PDFDocument.create();
    const fontBytes = await this.loadFont();
    const font = await pdfDoc.embedFont(fontBytes, { subset: true });

    const createPage = () => pdfDoc.addPage(this.PDF_PAGE_SIZE);
    let page = createPage();
    let cursorY = page.getHeight() - this.PDF_MARGIN;

    const writeLine = (
      text: string,
      fontSize = 12,
      color = rgb(0.1, 0.1, 0.1),
      lineHeight = fontSize + 4
    ) => {
      if (!text) {
        cursorY -= lineHeight;
        return;
      }

      if (cursorY - lineHeight < this.PDF_MARGIN) {
        page = createPage();
        cursorY = page.getHeight() - this.PDF_MARGIN;
      }

      page.drawText(text, {
        x: this.PDF_MARGIN,
        y: cursorY,
        size: fontSize,
        font,
        color
      });

      cursorY -= lineHeight;
    };

    const writeParagraph = (
      text: string,
      fontSize = 12,
      color = rgb(0.1, 0.1, 0.1),
      lineHeight = fontSize + 4
    ) => {
      const lines = this.wrapText(text, font, fontSize, page.getWidth() - this.PDF_MARGIN * 2);
      lines.forEach(line => writeLine(line, fontSize, color, lineHeight));
      if (lines.length === 0) {
        cursorY -= lineHeight;
      }
    };

    // Summary page
    writeLine('日记导出', 22, rgb(0.05, 0.05, 0.05), 28);
    writeLine(
      `导出时间：${new Date(exportData.metadata.exportDate).toLocaleString('zh-CN')}`,
      12
    );
    writeLine(`日记数量：${exportData.metadata.entryCount}`, 12);
    writeLine(`标签数量：${exportData.metadata.tagCount}`, 12);
    writeLine(`应用版本：${this.APP_VERSION}`, 12);
    writeLine('', 12);
    writeLine('本文件由 Journal App 自动生成。', 10, rgb(0.4, 0.4, 0.4), 14);

    const tagLookup = new Map(exportData.tags.map(tag => [tag.id, tag]));

    exportData.entries.forEach((entry, index) => {
      page = createPage();
      cursorY = page.getHeight() - this.PDF_MARGIN;

      const entryDate = new Date(entry.createdAt);
      const heading = `${index + 1}. ${entryDate.getFullYear()}年${entryDate.getMonth() + 1}月${entryDate.getDate()}日`;
      writeLine(heading, 18, rgb(0.05, 0.05, 0.2), 26);

      if (entry.title?.trim()) {
        writeLine(entry.title.trim(), 14, rgb(0.1, 0.1, 0.1), 20);
      }

      if (entry.mood) {
        writeLine(`心情：${this.getMoodEmoji(entry.mood)} ${entry.mood}`, 12);
      }

      if (entry.tags && entry.tags.length > 0) {
        const labels = entry.tags
          .map(tagId => {
            const tag = tagLookup.get(tagId);
            if (!tag) return tagId;
            return `${tag.icon ? `${tag.icon} ` : ''}${tag.name}`;
          })
          .join('、');
        writeLine(`标签：${labels}`, 12);
      }

      if (entry.archived) {
        writeLine('状态：已归档', 12);
      }

      const plainText = this.convertHtmlToPlainText(entry.html);
      if (plainText) {
        writeLine('', 8);
        writeParagraph(plainText, 12, rgb(0.05, 0.05, 0.05), 18);
      }

      if (entry.photo) {
        writeLine('', 8);
        writeLine('📷 此日记包含照片（导出文件不包含图片数据）', 11, rgb(0.3, 0.3, 0.3));
      }

      writeLine('', 8);
      writeLine(`创建于：${new Date(entry.createdAt).toLocaleString('zh-CN')}`, 11);
      if (entry.updatedAt && entry.updatedAt !== entry.createdAt) {
        writeLine(`更新于：${new Date(entry.updatedAt).toLocaleString('zh-CN')}`, 11);
      }

      if (options.includePhotos && entry.photo) {
        writeLine(
          '提示：为保护隐私，导出的 JSON 文件保留照片引用，PDF 暂不嵌入原图。',
          10,
          rgb(0.35, 0.35, 0.35),
          14
        );
      }
    });

    return pdfDoc.save();
  }

  /**
   * 单条日记转 Markdown
   */
  private entryToMarkdown(entry: JournalEntry, tagLookup: Map<string, Tag>): string {
    const lines: string[] = [];
    const date = new Date(entry.createdAt);
    lines.push(
      `## ${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    );

    if (entry.title?.trim()) {
      lines.push(`### ${entry.title.trim()}`);
    }

    if (entry.mood) {
      lines.push(`**心情**: ${this.getMoodEmoji(entry.mood)} ${entry.mood}`);
    }

    if (entry.tags && entry.tags.length > 0) {
      const tagLabels = entry.tags.map(tagId => {
        const tag = tagLookup.get(tagId);
        if (!tag) return `\`${tagId}\``;
        const label = `${tag.icon ? `${tag.icon} ` : ''}${tag.name}`;
        return `\`${label}\``;
      });
      lines.push(`**标签**: ${tagLabels.join(', ')}`);
    }

    const content = this.convertHtmlToMarkdown(entry.html);
    if (content.trim().length > 0) {
      lines.push(content.trim());
    }

    if (entry.photo) {
      lines.push('📷 *此日记包含照片*');
    }

    lines.push(`*创建于: ${new Date(entry.createdAt).toLocaleString('zh-CN')}*`);
    if (entry.updatedAt && entry.updatedAt !== entry.createdAt) {
      lines.push(`*更新于: ${new Date(entry.updatedAt).toLocaleString('zh-CN')}*`);
    }

    if (entry.archived) {
      lines.push('*已归档*');
    }

    return lines.filter(Boolean).join('\n\n');
  }

  private convertHtmlToMarkdown(html: string): string {
    return this.normalizeHtml(html)
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
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .trim();
  }

  private convertHtmlToPlainText(html: string): string {
    return this.normalizeHtml(html)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\r\n/g, '\n')
      .trim();
  }

  private normalizeHtml(html: string | undefined): string {
    return html ?? '';
  }

  /**
   * 根据选项筛选日记
   */
  private filterEntries(
    entries: JournalEntry[],
    options: Partial<ExportOptions>
  ): JournalEntry[] {
    const start = options.dateRange?.start
      ? this.parseDate(options.dateRange.start, false)
      : null;
    const end = options.dateRange?.end
      ? this.parseDate(options.dateRange.end, true)
      : null;

    return entries.filter(entry => {
      if (entry.deleted) {
        return false;
      }

      if (start || end) {
        const entryDate = new Date(entry.createdAt);
        if (start && entryDate < start) {
          return false;
        }
        if (end && entryDate > end) {
          return false;
        }
      }

      if (options.tags && options.tags.length > 0) {
        if (!entry.tags || !entry.tags.some(tag => options.tags!.includes(tag))) {
          return false;
        }
      }

      if (options.moods && options.moods.length > 0) {
        if (!entry.mood || !options.moods.includes(entry.mood)) {
          return false;
        }
      }

      return true;
    });
  }

  private prepareEntryForExport(
    entry: JournalEntry,
    options: Partial<ExportOptions>
  ): JournalEntry {
    const includePhotos = options.includePhotos === true;
    const prepared: JournalEntry = {
      ...entry,
      html: entry.html ?? '',
      tags: entry.tags ? [...entry.tags] : undefined
    };

    if (includePhotos && entry.photo) {
      prepared.photo = { ...entry.photo };
    } else {
      prepared.photo = undefined;
    }

    return prepared;
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

  private parseDate(input: Date | string, endOfDay: boolean): Date {
    if (input instanceof Date) {
      const cloned = new Date(input.getTime());
      if (endOfDay) {
        cloned.setHours(23, 59, 59, 999);
      } else {
        cloned.setHours(0, 0, 0, 0);
      }
      return cloned;
    }

    if (typeof input === 'string') {
      const parts = input.split('-').map(part => Number(part));
      if (parts.length === 3 && parts.every(part => !Number.isNaN(part))) {
        const [year, month, day] = parts;
        const date = new Date();
        date.setFullYear(year, month - 1, day);
        if (endOfDay) {
          date.setHours(23, 59, 59, 999);
        } else {
          date.setHours(0, 0, 0, 0);
        }
        return date;
      }
    }

    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }
    if (endOfDay) {
      parsed.setHours(23, 59, 59, 999);
    } else {
      parsed.setHours(0, 0, 0, 0);
    }
    return parsed;
  }

  private async loadFont(): Promise<Uint8Array> {
    if (this.fontBytesCache) {
      return this.fontBytesCache;
    }

    const response = await fetch(this.FONT_URL);
    if (!response.ok) {
      throw new Error('加载导出字体失败，请检查网络连接');
    }

    const arrayBuffer = await response.arrayBuffer();
    this.fontBytesCache = new Uint8Array(arrayBuffer);
    return this.fontBytesCache;
  }

  private wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
    const lines: string[] = [];
    const paragraphs = (text || '').split(/\r?\n/);

    paragraphs.forEach((paragraph, index) => {
      const content = paragraph.trim();
      if (!content) {
        if (index !== paragraphs.length - 1) {
          lines.push('');
        }
        return;
      }

      let currentLine = '';
      for (const char of content) {
        const tentative = currentLine + char;
        const width = font.widthOfTextAtSize(tentative, fontSize);
        if (width <= maxWidth) {
          currentLine = tentative;
        } else {
          if (currentLine.trim().length > 0) {
            lines.push(currentLine);
          }
          currentLine = char.trim().length > 0 ? char : '';
        }
      }

      if (currentLine.trim().length > 0) {
        lines.push(currentLine);
      }
    });

    return lines;
  }

  /**
   * 下载文件
   */
  downloadFile(content: BlobPart, filename: string, mimeType: string): void {
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
  generateFilename(format: 'json' | 'markdown' | 'pdf'): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const extension = format === 'json' ? 'json' : format === 'markdown' ? 'md' : 'pdf';
    return `journal-export-${dateStr}.${extension}`;
  }

  /**
   * 执行导出
   */
  async export(
    entries: JournalEntry[],
    tags: Tag[],
    format: 'json' | 'markdown' | 'pdf',
    options: Partial<ExportOptions> = {}
  ): Promise<void> {
    const filename = this.generateFilename(format);

    if (format === 'json') {
      const content = await this.exportToJSON(entries, tags, options);
      this.downloadFile(content, filename, 'application/json');
      return;
    }

    if (format === 'markdown') {
      const content = await this.exportToMarkdown(entries, tags, options);
      this.downloadFile(content, filename, 'text/markdown');
      return;
    }

    const binary = await this.exportToPDF(entries, tags, options);
    const buffer = binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength) as ArrayBuffer;
    this.downloadFile(buffer, filename, 'application/pdf');
  }
}

export const exportService = new ExportService();
