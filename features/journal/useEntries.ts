// features/journal/useEntries.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { JournalEntry } from '@/models/entry';
import { storage } from '@/services/storage';
import { secureStorage } from '@/services/secureStorage';
import { searchService } from '@/services/search';

export function useEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEncrypted, setIsEncrypted] = useState(false);

  // Check if encryption is enabled
  useEffect(() => {
    const checkEncryption = async () => {
      const settings = await secureStorage.getSettings();
      setIsEncrypted(settings.lockEnabled);
    };
    checkEncryption();
  }, []);

  // Get the appropriate storage service
  const getStorage = useCallback(() => {
    return isEncrypted ? secureStorage : storage;
  }, [isEncrypted]);

  const saveBlob = useCallback(async (blob: Blob) => {
    const storageService = getStorage();
    if ('saveBlob' in storageService && typeof storageService.saveBlob === 'function') {
      return storageService.saveBlob(blob);
    }
    throw new Error('当前存储层不支持保存附件');
  }, [getStorage]);

  const getBlob = useCallback(async (blobKey: string) => {
    const storageService = getStorage();
    if ('getBlob' in storageService && typeof storageService.getBlob === 'function') {
      return storageService.getBlob(blobKey);
    }
    return null;
  }, [getStorage]);

  // Load entries from storage
  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const storageService = getStorage();
      const loaded = await storageService.listEntries();
      setEntries(loaded);

      // Only build search index for decrypted entries
      const entriesWithContent = loaded.filter(e => e.html && e.html.length > 0);
      searchService.buildIndex(entriesWithContent);
      setError(null);
    } catch (err) {
      setError('Failed to load entries');
      console.error('Load entries error:', err);
    } finally {
      setLoading(false);
    }
  }, [getStorage]);

  // Load a single entry on demand (for lazy decryption)
  const loadEntry = useCallback(async (id: string): Promise<JournalEntry | null> => {
    try {
      const storageService = getStorage();
      const entry = await storageService.getEntry(id);
      if (entry) {
        // Update the entry in the list
        setEntries(prev => prev.map(e => e.id === id ? entry : e));
        // Update search index if content is available
        if (entry.html && entry.html.length > 0) {
          searchService.addToIndex(entry);
        }
      }
      return entry;
    } catch (err) {
      console.error(`Failed to load entry ${id}:`, err);
      return null;
    }
  }, [getStorage]);

  // Create new entry
  const createEntry = useCallback(async (partial?: Partial<JournalEntry>) => {
    try {
      const storageService = getStorage();
      const entry = await storageService.createEntry(partial || {});
      const updated = [entry, ...entries];
      setEntries(updated);
      if (entry.html) {
        searchService.addToIndex(entry);
      }
      return entry;
    } catch (err) {
      console.error('Create entry error:', err);
      throw err;
    }
  }, [entries, getStorage]);

  // Update existing entry
  const updateEntry = useCallback(async (entry: JournalEntry) => {
    try {
      const storageService = getStorage();
      const updated = await storageService.updateEntry(entry);
      const newEntries = entries.map(e => e.id === updated.id ? updated : e);
      setEntries(newEntries);
      if (updated.html) {
        searchService.updateInIndex(updated);
      }
      return updated;
    } catch (err) {
      console.error('Update entry error:', err);
      throw err;
    }
  }, [entries, getStorage]);

  // Delete entry
  const deleteEntry = useCallback(async (id: string) => {
    try {
      const storageService = getStorage();
      await storageService.removeEntry(id);
      const filtered = entries.filter(e => e.id !== id);
      setEntries(filtered);
      searchService.removeFromIndex(id);
    } catch (err) {
      console.error('Delete entry error:', err);
      throw err;
    }
  }, [entries, getStorage]);

  // Search entries
  const searchEntries = useCallback((query: string, mood?: string) => {
    // For encrypted storage, only search entries that are already decrypted
    const searchableEntries = entries.filter(e => e.html && e.html.length > 0);
    return searchService.search(searchableEntries, query, mood);
  }, [entries]);

  // Load on mount and when encryption status changes
  useEffect(() => {
    // Only load if not locked (handled by SecurityGate)
    const shouldLoad = !isEncrypted || secureStorage.isUnlocked();
    if (shouldLoad) {
      loadEntries();
    }
  }, [loadEntries, isEncrypted]);

  // Clean up temporary blobs periodically
  useEffect(() => {
    if (isEncrypted) {
      const cleanup = setInterval(() => {
        secureStorage.cleanupTempBlobs();
      }, 60 * 1000); // Every minute

      return () => clearInterval(cleanup);
    }
  }, [isEncrypted]);

  return {
    entries,
    loading,
    error,
    isEncrypted,
    createEntry,
    updateEntry,
    deleteEntry,
    searchEntries,
    loadEntry,
    saveBlob,
    getBlob,
    reload: loadEntries
  };
}
