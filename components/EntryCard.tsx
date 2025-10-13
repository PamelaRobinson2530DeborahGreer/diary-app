// components/EntryCard.tsx
'use client';

import React from 'react';
import { JournalEntry } from '@/models/entry';
import { Calendar, Image as ImageIcon } from 'lucide-react';
import { HighlightedText } from './HighlightedText';

interface EntryCardProps {
  entry: JournalEntry;
  onClick: (entry: JournalEntry) => void;
  searchQuery?: string;
}

export function EntryCard({ entry, onClick, searchQuery = '' }: EntryCardProps) {
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();

  const extractPlainText = (html: string): string => 
    normalize(html.replace(/<[^>]*>/g, ' '));

  const resolveTitleText = (html: string): string => {
    // 1. 优先提取标题标签
    const headingMatch = html.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
    if (headingMatch) {
      const heading = normalize(headingMatch[1].replace(/<[^>]*>/g, ' '));
      if (heading) {
        return heading;
      }
    }

    // 2. 提取纯文本
    const plain = extractPlainText(html);
    if (!plain) return '';

    // 3. 尝试提取第一句话 (以句号、问号、感叹号或换行符分隔)
    const sentences = plain.split(/[。\.!\?\n]/).filter(s => normalize(s).length > 0);
    if (sentences.length > 0 && sentences[0].length <= 50) {
      return normalize(sentences[0]);
    }

    // 4. 如果第一句话太长,提取前 30 个字符作为标题
    return plain.slice(0, 30);
  };

  // 优先使用 title 字段,否则从内容中提取
  const rawTitle = entry.title || resolveTitleText(entry.html || '');
  const displayTitle = rawTitle
    ? rawTitle.length > 40 ? `${rawTitle.slice(0, 40)}…` : rawTitle
    : '未命名日记';

  const getSnippet = (html: string): string => {
    const plain = extractPlainText(html);
    if (!plain) return '';

    // 移除标题部分,避免重复显示
    let remaining = plain;
    if (rawTitle) {
      // 尝试从开头移除标题文本
      if (plain.startsWith(rawTitle)) {
        remaining = plain.slice(rawTitle.length).trim();
      } else {
        // 标题可能被截断了,尝试移除开头相似的部分
        const titleWords = rawTitle.split(/\s+/);
        if (titleWords.length > 0) {
          const firstWord = titleWords[0];
          const firstWordIndex = plain.indexOf(firstWord);
          if (firstWordIndex === 0) {
            // 找到第一个句子结束符后的内容
            const afterFirstSentence = plain.match(/[。\.!\?\n](.+)/);
            if (afterFirstSentence) {
              remaining = afterFirstSentence[1].trim();
            }
          }
        }
      }
    }

    if (!remaining) return '';
    // 显示摘要,限制在 100 个字符以内
    return remaining.length > 100 ? `${remaining.slice(0, 100)}…` : remaining;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const title = displayTitle;
  const snippet = getSnippet(entry.html);

  return (
    <div
      onClick={() => onClick(entry)}
      className="p-4 border rounded-lg bg-card hover:bg-accent dark:hover:bg-accent/50 transition-colors cursor-pointer shadow-sm dark:shadow-none"
    >
      {/* Time and mood */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 mr-1" />
          <time>{formatDate(entry.createdAt)}</time>
        </div>
        {entry.mood && (
          <span className="text-lg" role="img" aria-label="mood">
            {entry.mood}
          </span>
        )}
      </div>

      {/* Title (prominent) - 只显示标题，不显示内容预览 */}
      <h3 className="font-semibold text-lg mb-1 line-clamp-2">
        <HighlightedText
          text={title}
          highlight={searchQuery}
        />
      </h3>

      {/* Photo indicator */}
      {entry.photo && (
        <div className="flex items-center text-sm text-muted-foreground mt-2">
          <ImageIcon className="w-4 h-4 mr-1" />
          <span>含照片</span>
        </div>
      )}
    </div>
  );
}
