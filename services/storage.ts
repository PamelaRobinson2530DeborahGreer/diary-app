// services/storage.ts
import localforage from 'localforage';
import { JournalEntry, Settings, Photo } from '@/models/entry';

// Configure localforage
localforage.config({
  name: 'JournalApp',
  version: 1.0,
  storeName: 'journal_store',
  description: 'Personal Journal Storage'
});

// Separate store for blobs (photos)
const blobStore = localforage.createInstance({
  name: 'JournalApp',
  storeName: 'blob_store'
});

// Settings store (fallback to localStorage for small data)
const settingsStore = localforage.createInstance({
  name: 'JournalApp',
  storeName: 'settings_store'
});

class StorageService {
  // Entry operations
  async listEntries(): Promise<JournalEntry[]> {
    const entries: JournalEntry[] = [];
    await localforage.iterate((value, key) => {
      if (key.startsWith('entry_')) {
        entries.push(value as JournalEntry);
      }
    });
    // Sort by createdAt descending (newest first)
    return entries.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getEntry(id: string): Promise<JournalEntry | null> {
    return await localforage.getItem<JournalEntry>(`entry_${id}`);
  }

  async createEntry(partial: Partial<JournalEntry>): Promise<JournalEntry> {
    const now = new Date().toISOString();
    const id = partial.id ?? crypto.randomUUID();
    const createdAt = partial.createdAt ?? now;
    const updatedAt = partial.updatedAt ?? partial.createdAt ?? now;
    const entry: JournalEntry = {
      ...partial,
      id,
      createdAt,
      updatedAt,
      html: partial?.html ?? ''
    };
    await localforage.setItem(`entry_${id}`, entry);
    return entry;
  }

  async updateEntry(
    entry: JournalEntry,
    options: { preserveUpdatedAt?: boolean } = {}
  ): Promise<JournalEntry> {
    const updated = {
      ...entry,
      updatedAt: options.preserveUpdatedAt ? entry.updatedAt : new Date().toISOString()
    };
    await localforage.setItem(`entry_${entry.id}`, updated);
    return updated;
  }

  async removeEntry(id: string): Promise<void> {
    const entry = await this.getEntry(id);
    if (entry?.photo) {
      await this.removeBlob(entry.photo.blobKey);
    }
    await localforage.removeItem(`entry_${id}`);
  }

  // Blob operations for photos
  async saveBlob(blob: Blob): Promise<string> {
    const blobKey = crypto.randomUUID();
    await blobStore.setItem(blobKey, blob);
    return blobKey;
  }

  async getBlob(blobKey: string): Promise<Blob | null> {
    return await blobStore.getItem<Blob>(blobKey);
  }

  async removeBlob(blobKey: string): Promise<void> {
    await blobStore.removeItem(blobKey);
  }

  // Settings operations
  async getSettings(): Promise<Settings> {
    try {
      const settings = await settingsStore.getItem<Settings>('settings');
      return settings || {
        theme: 'system',
        lockEnabled: false
      };
    } catch {
      // Fallback to localStorage
      const stored = localStorage.getItem('settings');
      if (stored) {
        return JSON.parse(stored);
      }
      return {
        theme: 'system',
        lockEnabled: false
      };
    }
  }

  async saveSettings(settings: Settings): Promise<void> {
    try {
      await settingsStore.setItem('settings', settings);
    } catch {
      // Fallback to localStorage
      localStorage.setItem('settings', JSON.stringify(settings));
    }
  }

  // Clear all data (for testing/reset)
  async clearAll(): Promise<void> {
    await Promise.all([
      localforage.clear(),
      blobStore.clear(),
      settingsStore.clear()
    ]);
    localStorage.removeItem('settings');
  }
}

export const storage = new StorageService();
