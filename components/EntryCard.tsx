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
  // Extract title from HTML (first heading or first line)
  const getTitle = (html: string): string => {
    // Try to extract H1-H6 tag content
    const headingMatch = html.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
    if (headingMatch) {
      const title = headingMatch[1].replace(/<[^>]*>/g, '').trim();
      if (title) return title;
    }

    // Otherwise use first line
    const text = html.replace(/<[^>]*>/g, '').trim();
    if (!text) return '无标题';

    const firstLine = text.split('\n')[0].trim();
    return firstLine.slice(0, 50) + (firstLine.length > 50 ? '...' : '');
  };

  // Extract snippet (excluding title)
  const getSnippet = (html: string): string => {
    const text = html
      .replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi, '') // Remove headings
      .replace(/<[^>]*>/g, '')                     // Remove all tags
      .trim();

    if (!text) return '';

    return text.slice(0, 80) + (text.length > 80 ? '...' : '');
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

  const title = getTitle(entry.html);
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

      {/* Title (prominent) */}
      <h3 className="font-semibold text-lg mb-1 line-clamp-1">
        <HighlightedText
          text={title}
          highlight={searchQuery}
        />
      </h3>

      {/* Snippet (secondary) */}
      {snippet && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          <HighlightedText
            text={snippet}
            highlight={searchQuery}
          />
        </p>
      )}

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