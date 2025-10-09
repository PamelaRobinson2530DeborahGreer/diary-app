// services/searchService.ts
import { JournalEntry, TagID } from '@/models/entry';

export interface SearchQuery {
  text?: string;           // 全文搜索
  tags?: TagID[];          // 标签筛选
  moods?: string[];        // 心情筛选
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeArchived?: boolean; // 包含归档
  includeDeleted?: boolean;  // 包含已删除（回收站）
}

export interface SearchResult {
  entries: JournalEntry[];
  total: number;
  duration: number; // ms
}

class SearchService {
  /**
   * 搜索日记
   * @param entries 所有日记
   * @param query 搜索条件
   * @returns 搜索结果
   */
  search(entries: JournalEntry[], query: SearchQuery): SearchResult {
    const startTime = performance.now();

    let results = [...entries];

    // 1. 过滤已删除
    if (!query.includeDeleted) {
      results = results.filter(e => !e.deleted);
    }

    // 2. 过滤归档
    if (!query.includeArchived) {
      results = results.filter(e => !e.archived);
    }

    // 3. 标签筛选（AND 逻辑：必须包含所有选中的标签）
    if (query.tags && query.tags.length > 0) {
      results = results.filter(entry => {
        if (!entry.tags || entry.tags.length === 0) return false;
        return query.tags!.every(tagId => entry.tags!.includes(tagId));
      });
    }

    // 4. 心情筛选
    if (query.moods && query.moods.length > 0) {
      results = results.filter(entry =>
        entry.mood && query.moods!.includes(entry.mood)
      );
    }

    // 5. 日期范围筛选
    if (query.dateRange) {
      const { start, end } = query.dateRange;
      results = results.filter(entry => {
        const createdAt = new Date(entry.createdAt);
        return createdAt >= start && createdAt <= end;
      });
    }

    // 6. 全文搜索（标题 + 内容）
    if (query.text && query.text.trim()) {
      const searchText = query.text.toLowerCase().trim();
      results = results.filter(entry => {
        // HTML 转纯文本
        const plainText = this.htmlToPlainText(entry.html).toLowerCase();
        return plainText.includes(searchText);
      });
    }

    // 7. 按相关性排序（最新优先）
    results.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const duration = performance.now() - startTime;

    return {
      entries: results,
      total: results.length,
      duration
    };
  }

  /**
   * HTML 转纯文本
   */
  private htmlToPlainText(html: string): string {
    // 创建临时 DOM 元素
    if (typeof document !== 'undefined') {
      const temp = document.createElement('div');
      temp.innerHTML = html;
      return temp.textContent || temp.innerText || '';
    }

    // 服务端降级：简单正则移除标签
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * 高亮搜索关键词（用于 UI 展示）
   */
  highlightText(text: string, query: string): string {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 获取搜索建议（高频词）
   */
  getSuggestions(entries: JournalEntry[], limit = 10): string[] {
    const wordFreq = new Map<string, number>();

    entries.forEach(entry => {
      const text = this.htmlToPlainText(entry.html);
      const words = text.split(/\s+/).filter(w => w.length > 2);

      words.forEach(word => {
        const lower = word.toLowerCase();
        wordFreq.set(lower, (wordFreq.get(lower) || 0) + 1);
      });
    });

    // 按频率排序
    const sorted = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word]) => word);

    return sorted;
  }
}

export const searchService = new SearchService();
