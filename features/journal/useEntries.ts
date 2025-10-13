// features/journal/useEntries.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { JournalEntry } from '@/models/entry';
import { storage } from '@/services/storage';
import { secureStorage } from '@/services/secureStorage';

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
    console.log('[useEntries] Starting loadEntries...');
    console.log('[useEntries] isEncrypted:', isEncrypted);
    try {
      setLoading(true);
      const storageService = getStorage();
      console.log('[useEntries] Using storage service:', storageService.constructor.name);
      console.log('[useEntries] Calling listEntries...');
      const loaded = await storageService.listEntries();
      console.log('[useEntries] Loaded', loaded.length, 'entries');
      setEntries(loaded);
      setError(null);
      console.log('[useEntries] loadEntries completed successfully');
    } catch (err) {
      console.error('[useEntries] Load entries error:', err);
      setError('Failed to load entries');
    } finally {
      setLoading(false);
    }
  }, [getStorage, isEncrypted]);

  // Load a single entry on demand (for lazy decryption)
  const loadEntry = useCallback(async (id: string): Promise<JournalEntry | null> => {
    try {
      const storageService = getStorage();
      const entry = await storageService.getEntry(id);
      if (entry) {
        // Update the entry in the list
        setEntries(prev => prev.map(e => e.id === id ? entry : e));
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
    } catch (err) {
      console.error('Delete entry error:', err);
      throw err;
    }
  }, [entries, getStorage]);


  // Load on mount and when encryption status changes
  useEffect(() => {
    console.log('[useEntries] useEffect triggered - isEncrypted:', isEncrypted);
    // Only load if not locked (handled by SecurityGate)
    const shouldLoad = !isEncrypted || secureStorage.isUnlocked();
    console.log('[useEntries] shouldLoad:', shouldLoad, '(isUnlocked:', secureStorage.isUnlocked(), ')');
    if (shouldLoad) {
      console.log('[useEntries] Calling loadEntries from useEffect...');
      loadEntries();
    } else {
      console.log('[useEntries] Skipping loadEntries - locked state');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEncrypted]);

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
    loadEntry,
    saveBlob,
    getBlob,
    reload: loadEntries
  };
}
