// features/journal/TimelineView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { JournalEntry } from '@/models/entry';
import { EntryCard } from '@/components/EntryCard';
import SearchBar from '@/components/SearchBar';
import { Plus, Loader2, Settings, Archive, Trash2, Home, BarChart3 } from 'lucide-react';
import { useEntries } from './useEntries';
import { useRouter } from 'next/navigation';
import { searchService, SearchQuery } from '@/services/searchService';

type ViewMode = 'active' | 'archived' | 'trash';

export function TimelineView() {
  const router = useRouter();
  const { entries, loading, error } = useEntries();
  const [searchQuery, setSearchQuery] = useState<SearchQuery>({});
  const [viewMode, setViewMode] = useState<ViewMode>('active');

  // Filter and search entries
  const filteredEntries = useMemo(() => {
    // First filter by view mode
    let baseEntries = entries;

    if (viewMode === 'active') {
      baseEntries = entries.filter((e: JournalEntry) => !e.archived && !e.deleted);
    } else if (viewMode === 'archived') {
      baseEntries = entries.filter((e: JournalEntry) => e.archived && !e.deleted);
    } else if (viewMode === 'trash') {
      baseEntries = entries.filter((e: JournalEntry) => e.deleted);
    }

    // searchService.search is synchronous
    const result = searchService.search(baseEntries, {
      ...searchQuery,
      includeArchived: viewMode === 'archived',
      includeDeleted: viewMode === 'trash'
    });

    return result.entries;
  }, [entries, searchQuery, viewMode]);

  const handleEntryClick = (entry: JournalEntry) => {
    router.push(`/entry/${entry.id}`);
  };

  const handleNewEntry = () => {
    router.push('/new');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-destructive">加载失败: {error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">
            {viewMode === 'active' && '我的日记'}
            {viewMode === 'archived' && '归档日记'}
            {viewMode === 'trash' && '回收站'}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/statistics')}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              aria-label="统计"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              aria-label="设置"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View mode tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewMode('active')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'active'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>活动</span>
          </button>
          <button
            onClick={() => setViewMode('archived')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'archived'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>归档</span>
          </button>
          <button
            onClick={() => setViewMode('trash')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'trash'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>回收站</span>
          </button>
        </div>

        {/* Search bar */}
        <SearchBar onSearch={setSearchQuery} className="mb-4" />
      </div>

      {/* Entry list */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {Object.keys(searchQuery).length > 0
              ? '没有找到匹配的日记'
              : viewMode === 'archived'
                ? '没有归档的日记'
                : viewMode === 'trash'
                  ? '回收站为空'
                  : '还没有日记'
            }
          </p>
          {viewMode === 'active' && Object.keys(searchQuery).length === 0 && (
            <button
              onClick={handleNewEntry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              写第一篇日记
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map(entry => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onClick={handleEntryClick}
              searchQuery={searchQuery.text || ''}
            />
          ))}
        </div>
      )}

      {/* Floating action button */}
      <button
        onClick={handleNewEntry}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 flex items-center justify-center"
        aria-label="New entry"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}