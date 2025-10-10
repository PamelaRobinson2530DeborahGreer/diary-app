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
    const headingMatch = html.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
    if (headingMatch) {
      const heading = normalize(headingMatch[1].replace(/<[^>]*>/g, ' '));
      if (heading) {
        return heading;
      }
    }

    const plain = extractPlainText(html);
    if (!plain) return '';

    const firstSentence = plain.split(/[\.\!\?\n]/).find(part => normalize(part).length > 0);
    return firstSentence ? normalize(firstSentence) : plain;
  };

  const rawTitle = resolveTitleText(entry.html || '');
  const displayTitle = rawTitle
    ? rawTitle.length > 30 ? `${rawTitle.slice(0, 30)}…` : rawTitle
    : '未命名日记';

  const getSnippet = (html: string): string => {
    const plain = extractPlainText(html);
    if (!plain) return '';

    let remaining = plain;
    if (rawTitle && plain.startsWith(rawTitle)) {
      remaining = plain.slice(rawTitle.length).trim();
    }

    if (!remaining) return '';
    return remaining.length > 80 ? `${remaining.slice(0, 80)}…` : remaining;
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
