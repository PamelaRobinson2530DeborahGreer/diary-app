// components/SearchSuggestions.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Clock, TrendingUp } from 'lucide-react';

interface SearchSuggestionsProps {
  isVisible: boolean;
  searchQuery: string;
  onSelectSuggestion: (suggestion: string) => void;
  recentEntries: Array<{ text: string; mood?: string }>;
}

const SEARCH_HISTORY_KEY = 'journal_search_history';
const MAX_HISTORY_ITEMS = 5;

export function SearchSuggestions({
  isVisible,
  searchQuery,
  onSelectSuggestion,
  recentEntries
}: SearchSuggestionsProps) {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Load search history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (stored) {
      try {
        setSearchHistory(JSON.parse(stored));
      } catch {
        setSearchHistory([]);
      }
    }
  }, []);

  // Save search to history
  const saveToHistory = (query: string) => {
    if (!query.trim()) return;

    const updated = [
      query,
      ...searchHistory.filter(item => item !== query)
    ].slice(0, MAX_HISTORY_ITEMS);

    setSearchHistory(updated);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  };

  // Generate suggestions based on query
  useEffect(() => {
    if (!searchQuery) {
      setSuggestions([]);
      return;
    }

    // Extract keywords from recent entries
    const keywords = new Set<string>();
    recentEntries.forEach(entry => {
      // Extract words from text
      const words = entry.text
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3 && word.startsWith(searchQuery.toLowerCase()));

      words.forEach(word => keywords.add(word));

      // Add moods if they match
      if (entry.mood && entry.mood.includes(searchQuery)) {
        keywords.add(entry.mood);
      }
    });

    setSuggestions(Array.from(keywords).slice(0, 5));
  }, [searchQuery, recentEntries]);

  // Clear search history
  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  if (!isVisible) return null;

  const hasHistory = searchHistory.length > 0;
  const hasSuggestions = suggestions.length > 0;

  if (!hasHistory && !hasSuggestions) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/50 z-10">
      {/* Search suggestions */}
      {hasSuggestions && searchQuery && (
        <div className="p-2">
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            <span>建议</span>
          </div>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => {
                onSelectSuggestion(suggestion);
                saveToHistory(suggestion);
              }}
              className="w-full text-left px-3 py-2 hover:bg-accent rounded text-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Search history */}
      {hasHistory && !searchQuery && (
        <div className="p-2">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>最近搜索</span>
            </div>
            <button
              onClick={clearHistory}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              清除
            </button>
          </div>
          {searchHistory.map((item, index) => (
            <button
              key={index}
              onClick={() => onSelectSuggestion(item)}
              className="w-full text-left px-3 py-2 hover:bg-accent rounded text-sm"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}