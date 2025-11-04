'use client';

import { Tag, TagID } from '@/models/entry';
import { tagService } from '@/services/tagService';
import { SearchQuery } from '@/services/searchService';
import { useCallback, useEffect, useState } from 'react';

interface SearchBarProps {
  onSearch: (query: SearchQuery) => void;
  className?: string;
}

const MOOD_OPTIONS = ['😊', '😢', '😡', '😌', '😴', '🤔', '😎', '🥳'];

export default function SearchBar({ onSearch, className = '' }: SearchBarProps) {
  const [text, setText] = useState('');
  const [selectedTags, setSelectedTags] = useState<TagID[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  useEffect(() => {
    loadTags();
  }, []);

  const performSearch = useCallback(() => {
    const query: SearchQuery = {};

    if (text.trim()) {
      query.text = text.trim();
    }

    if (selectedTags.length > 0) {
      query.tags = selectedTags;
    }

    if (selectedMoods.length > 0) {
      query.moods = selectedMoods;
    }

    if (dateRange.start && dateRange.end) {
      query.dateRange = {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      };
    }

    onSearch(query);
  }, [dateRange.end, dateRange.start, onSearch, selectedMoods, selectedTags, text]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [performSearch]);

  const loadTags = async () => {
    const tags = await tagService.loadTags();
    setAllTags(tags);
  };

  const handleToggleMood = (mood: string) => {
    setSelectedMoods(prev =>
      prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]
    );
  };

  const handleToggleTag = (tagId: TagID) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setText('');
    setSelectedTags([]);
    setSelectedMoods([]);
    setDateRange({ start: '', end: '' });
  };

  const hasActiveFilters = text || selectedTags.length > 0 || selectedMoods.length > 0 || dateRange.start || dateRange.end;

  return (
    <div className={`${className}`}>
      {/* Main search input */}
      <div className="relative">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="搜索日记内容..."
          className="w-full px-4 py-2 pl-10 pr-20 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
        />
        <svg
          className="absolute left-3 top-3 h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute right-2 top-2 px-3 py-1 text-sm rounded ${
            showFilters ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          筛选
        </button>
      </div>

      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="mt-2 flex flex-wrap gap-2 items-center">
          {selectedTags.map(tagId => {
            const tag = allTags.find(t => t.id === tagId);
            if (!tag) return null;
            return (
              <span
                key={tagId}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.icon && <span className="mr-1">{tag.icon}</span>}
                {tag.name}
                <button
                  onClick={() => handleToggleTag(tagId)}
                  className="ml-1 hover:text-gray-200"
                >
                  ×
                </button>
              </span>
            );
          })}

          {selectedMoods.map(mood => (
            <span
              key={mood}
              className="inline-flex items-center px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-xs"
            >
              {mood}
              <button
                onClick={() => handleToggleMood(mood)}
                className="ml-1 hover:text-purple-600"
              >
                ×
              </button>
            </span>
          ))}

          {(dateRange.start || dateRange.end) && (
            <span className="inline-flex items-center px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs">
              {dateRange.start} ~ {dateRange.end}
              <button
                onClick={() => setDateRange({ start: '', end: '' })}
                className="ml-1 hover:text-green-600"
              >
                ×
              </button>
            </span>
          )}

          <button
            onClick={clearFilters}
            className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            清除所有
          </button>
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
          {/* Tags filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">标签</label>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleToggleTag(tag.id)}
                  className={`px-3 py-1 rounded-full text-sm transition-opacity ${
                    selectedTags.includes(tag.id) ? 'opacity-100 text-white' : 'opacity-50'
                  }`}
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.icon && <span className="mr-1">{tag.icon}</span>}
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          {/* Mood filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">心情</label>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map(mood => (
                <button
                  key={mood}
                  onClick={() => handleToggleMood(mood)}
                  className={`text-2xl p-2 rounded-lg transition-all ${
                    selectedMoods.includes(mood)
                      ? 'bg-purple-100 dark:bg-purple-900 scale-110'
                      : 'bg-gray-100 dark:bg-gray-700 opacity-50 hover:opacity-100'
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>

          {/* Date range filter */}
          <div>
            <label className="block text-sm font-medium mb-2">日期范围</label>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
              />
              <span>至</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
