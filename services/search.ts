// services/search.ts
import { JournalEntry } from '@/models/entry';

interface SearchResult {
  entry: JournalEntry;
  matches: string[];
}

class SearchService {
  private searchIndex: Map<string, Set<string>> = new Map();

  // Build search index from entries
  buildIndex(entries: JournalEntry[]): void {
    this.searchIndex.clear();

    entries.forEach(entry => {
      // Only index entries with content
      if (entry.html && entry.html.length > 0) {
        const tokens = this.tokenize(this.extractText(entry));
        tokens.forEach(token => {
          if (!this.searchIndex.has(token)) {
            this.searchIndex.set(token, new Set());
          }
          this.searchIndex.get(token)!.add(entry.id);
        });
      }
    });
  }

  // Add single entry to index
  addToIndex(entry: JournalEntry): void {
    if (!entry.html || entry.html.length === 0) return;

    // Remove existing entry if present
    this.removeFromIndex(entry.id);

    const tokens = this.tokenize(this.extractText(entry));
    tokens.forEach(token => {
      if (!this.searchIndex.has(token)) {
        this.searchIndex.set(token, new Set());
      }
      this.searchIndex.get(token)!.add(entry.id);
    });
  }

  // Update entry in index
  updateInIndex(entry: JournalEntry): void {
    this.addToIndex(entry);
  }

  // Remove entry from index
  removeFromIndex(entryId: string): void {
    // Remove entry ID from all token sets
    this.searchIndex.forEach(ids => {
      ids.delete(entryId);
    });
  }

  // Search entries by query and optional mood filter
  search(
    entries: JournalEntry[],
    query: string,
    mood?: string
  ): SearchResult[] {
    const queryTokens = this.tokenize(query.toLowerCase());
    const matchingIds = new Set<string>();

    // Find entries matching query tokens
    queryTokens.forEach(token => {
      const ids = this.searchIndex.get(token);
      if (ids) {
        ids.forEach(id => matchingIds.add(id));
      }
    });

    // Filter by matching IDs and mood if specified
    const results = entries
      .filter(entry => {
        const matchesQuery = matchingIds.has(entry.id) || query === '';
        const matchesMood = !mood || entry.mood === mood;
        return matchesQuery && matchesMood;
      })
      .map(entry => ({
        entry,
        matches: this.findMatches(entry, queryTokens)
      }));

    return results;
  }

  // Extract plain text from entry
  private extractText(entry: JournalEntry): string {
    // Remove HTML tags
    const textContent = entry.html.replace(/<[^>]*>/g, ' ');
    // Include mood in searchable text
    const mood = entry.mood || '';
    const photoCaption = entry.photo?.caption || '';
    return `${textContent} ${mood} ${photoCaption}`.toLowerCase();
  }

  // Tokenize text into searchable terms
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(token => token.length > 1)
      .map(token => token.replace(/[^\w]/g, ''))
      .filter(token => token.length > 0);
  }

  // Find matching text snippets for highlighting
  private findMatches(entry: JournalEntry, queryTokens: string[]): string[] {
    const text = this.extractText(entry);
    const matches: string[] = [];

    queryTokens.forEach(token => {
      const regex = new RegExp(`\\b${token}`, 'gi');
      const match = text.match(regex);
      if (match) {
        matches.push(...match);
      }
    });

    return [...new Set(matches)];
  }
}

export const searchService = new SearchService();