// services/secureStorage.ts
import localforage from 'localforage';
import { JournalEntry, Settings, Photo } from '@/models/entry';
import { cryptoService, EncryptedData } from './crypto';
import { logger } from '@/utils/logger';

// Configure localforage
localforage.config({
  name: 'JournalApp',
  version: 1.0,
  storeName: 'journal_store',
  description: 'Personal Journal Storage'
});

// Separate store for encrypted blobs (photos)
const blobStore = localforage.createInstance({
  name: 'JournalApp',
  storeName: 'blob_store'
});

// Settings store (not encrypted - contains only non-sensitive config)
const settingsStore = localforage.createInstance({
  name: 'JournalApp',
  storeName: 'settings_store'
});

// Encrypted entry structure stored in IndexedDB
interface EncryptedEntry {
  id: string;
  createdAt: string;
  updatedAt: string;
  encryptedData: EncryptedData;  // Contains encrypted HTML content
  mood?: string;  // Keep unencrypted for timeline display
  hasPhoto?: boolean;  // Indicator only
}

// Cache for decrypted entries (cleared on lock)
interface DecryptedCache {
  [key: string]: {
    entry: JournalEntry;
    timestamp: number;
  };
}

class SecureStorageService {
  private decryptedCache: DecryptedCache = {};
  private encryptionKey: CryptoKey | null = null;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Set the encryption key for the session
   */
  setEncryptionKey(key: CryptoKey): void {
    this.encryptionKey = key;
    this.clearCache();
  }

  /**
   * Clear the encryption key and cache (on lock)
   */
  clearEncryptionKey(): void {
    this.encryptionKey = null;
    this.clearCache();
  }

  /**
   * Check if storage is unlocked
   */
  isUnlocked(): boolean {
    return this.encryptionKey !== null;
  }

  /**
   * Clear decrypted cache
   */
  private clearCache(): void {
    this.decryptedCache = {};
  }

  /**
   * Check cache validity
   */
  private getCachedEntry(id: string): JournalEntry | null {
    const cached = this.decryptedCache[id];
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      delete this.decryptedCache[id];
      return null;
    }

    return cached.entry;
  }

  /**
   * Add to cache
   */
  private cacheEntry(id: string, entry: JournalEntry): void {
    this.decryptedCache[id] = {
      entry,
      timestamp: Date.now()
    };
  }

  // Entry operations with encryption
  async listEntries(): Promise<JournalEntry[]> {
    logger.log('[SecureStorage] listEntries called');
    logger.log('[SecureStorage] Encryption key available:', !!this.encryptionKey);
    const entries: JournalEntry[] = [];
    const encryptedEntries: EncryptedEntry[] = [];

    // First, get all encrypted entries
    logger.log('[SecureStorage] Iterating through storage...');
    await localforage.iterate((value, key) => {
      if (key.startsWith('entry_')) {
        // Validate entry structure before adding
        if (value && typeof value === 'object') {
          encryptedEntries.push(value as EncryptedEntry);
        }
      }
    });

    logger.log('[SecureStorage] Found', encryptedEntries.length, 'entries in storage');

    // Sort by createdAt before decryption (for performance)
    encryptedEntries.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // If no encryption key, return minimal data for locked view
    if (!this.encryptionKey) {
      logger.log('[SecureStorage] No encryption key - returning locked view');
      return encryptedEntries.map(e => ({
        id: e.id,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        html: '',  // No content when locked
        mood: e.mood,
        // Photo data not available when locked
      }));
    }

    // Decrypt entries (with lazy loading strategy)
    // Only decrypt first 10 for performance
    const decryptLimit = 10;
    logger.log('[SecureStorage] Starting decryption for first', Math.min(encryptedEntries.length, decryptLimit), 'entries');
    for (let i = 0; i < Math.min(encryptedEntries.length, decryptLimit); i++) {
      const encrypted = encryptedEntries[i];
      logger.log(`[SecureStorage] Processing entry ${i + 1}/${Math.min(encryptedEntries.length, decryptLimit)} - ID:`, encrypted.id);

      // Check cache first
      const cached = this.getCachedEntry(encrypted.id);
      if (cached) {
        logger.log('[SecureStorage] Using cached entry:', encrypted.id);
        entries.push(cached);
        continue;
      }

      try {
        // Validate encrypted data structure before attempting decrypt
        if (!encrypted.encryptedData ||
            !encrypted.encryptedData.ciphertext ||
            !encrypted.encryptedData.iv) {
          logger.error('[SecureStorage] Invalid encrypted data structure:', encrypted.id);
          throw new Error('Invalid encrypted data structure');
        }

        // Validate encryption key is available
        if (!this.encryptionKey) {
          logger.error('[SecureStorage] No encryption key available for decryption');
          throw new Error('No encryption key available');
        }

        logger.log('[SecureStorage] Decrypting entry:', encrypted.id);
        const decryptedHtml = await cryptoService.decrypt(
          encrypted.encryptedData,
          this.encryptionKey
        );
        logger.log('[SecureStorage] Successfully decrypted entry:', encrypted.id);

        const entry: JournalEntry = {
          id: encrypted.id,
          createdAt: encrypted.createdAt,
          updatedAt: encrypted.updatedAt,
          html: decryptedHtml,
          mood: encrypted.mood
        };

        // Handle photo if exists
        if (encrypted.hasPhoto) {
          logger.log('[SecureStorage] Loading photo for entry:', encrypted.id);
          const photo = await this.getPhotoForEntry(encrypted.id);
          if (photo) {
            entry.photo = photo;
          }
        }

        this.cacheEntry(encrypted.id, entry);
        entries.push(entry);
      } catch (error) {
        logger.error(`[SecureStorage] Failed to decrypt entry ${encrypted.id}:`, error);
        // Return placeholder for failed decryption
        entries.push({
          id: encrypted.id,
          createdAt: encrypted.createdAt,
          updatedAt: encrypted.updatedAt,
          html: '<p>解密失败</p>',
          mood: encrypted.mood
        });
      }
    }

    // For remaining entries, return placeholder that will be decrypted on demand
    if (encryptedEntries.length > decryptLimit) {
      logger.log('[SecureStorage] Returning placeholders for', encryptedEntries.length - decryptLimit, 'remaining entries');
    }
    for (let i = decryptLimit; i < encryptedEntries.length; i++) {
      entries.push({
        id: encryptedEntries[i].id,
        createdAt: encryptedEntries[i].createdAt,
        updatedAt: encryptedEntries[i].updatedAt,
        html: '',  // Will be loaded on demand
        mood: encryptedEntries[i].mood
      });
    }

    logger.log('[SecureStorage] listEntries completed - returning', entries.length, 'total entries');
    return entries;
  }

  async getEntry(id: string): Promise<JournalEntry | null> {
    // Check cache first
    const cached = this.getCachedEntry(id);
    if (cached) return cached;

    const encrypted = await localforage.getItem<EncryptedEntry>(`entry_${id}`);
    if (!encrypted) return null;

    // If locked, return minimal data
    if (!this.encryptionKey) {
      return {
        id: encrypted.id,
        createdAt: encrypted.createdAt,
        updatedAt: encrypted.updatedAt,
        html: '',
        mood: encrypted.mood
      };
    }

    try {
      // Decrypt content
      const decryptedHtml = await cryptoService.decrypt(
        encrypted.encryptedData,
        this.encryptionKey
      );

      const entry: JournalEntry = {
        id: encrypted.id,
        createdAt: encrypted.createdAt,
        updatedAt: encrypted.updatedAt,
        html: decryptedHtml,
        mood: encrypted.mood
      };

      // Handle photo if exists
      if (encrypted.hasPhoto) {
        const photo = await this.getPhotoForEntry(encrypted.id);
        if (photo) {
          entry.photo = photo;
        }
      }

      this.cacheEntry(id, entry);
      return entry;
    } catch (error) {
      console.error(`Failed to decrypt entry ${id}:`, error);
      return null;
    }
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

    // If encryption is enabled, encrypt before saving
    if (this.encryptionKey) {
      const encryptedData = await cryptoService.encrypt(entry.html, this.encryptionKey);

      const encrypted: EncryptedEntry = {
        id: entry.id,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        encryptedData,
        mood: entry.mood,
        hasPhoto: !!entry.photo
      };

      await localforage.setItem(`entry_${id}`, encrypted);

      // Save photo separately if exists
      if (entry.photo) {
        await this.savePhotoForEntry(id, entry.photo);
      }

      this.cacheEntry(id, entry);
    } else {
      // Save unencrypted (for non-secure mode)
      await localforage.setItem(`entry_${id}`, entry);
    }

    return entry;
  }

  async updateEntry(
    entry: JournalEntry,
    options: { preserveUpdatedAt?: boolean } = {}
  ): Promise<JournalEntry> {
    const updatedAt = options.preserveUpdatedAt ? entry.updatedAt : new Date().toISOString();

    const updated = {
      ...entry,
      updatedAt
    };

    if (this.encryptionKey) {
      const encryptedData = await cryptoService.encrypt(updated.html, this.encryptionKey);

      const encrypted: EncryptedEntry = {
        id: updated.id,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        encryptedData,
        mood: updated.mood,
        hasPhoto: !!updated.photo
      };

      await localforage.setItem(`entry_${updated.id}`, encrypted);

      // Update photo if changed
      if (updated.photo) {
        await this.savePhotoForEntry(updated.id, updated.photo);
      }

      this.cacheEntry(updated.id, updated);
    } else {
      await localforage.setItem(`entry_${updated.id}`, updated);
    }

    return updated;
  }

  async removeEntry(id: string): Promise<void> {
    // Remove photo if exists
    await this.removePhotoForEntry(id);

    // Remove entry
    await localforage.removeItem(`entry_${id}`);

    // Clear from cache
    delete this.decryptedCache[id];
  }

  // Photo operations with encryption
  private async savePhotoForEntry(entryId: string, photo: Photo): Promise<void> {
    if (!this.encryptionKey) {
      // Save unencrypted in non-secure mode
      await blobStore.setItem(`photo_${entryId}`, photo);
      return;
    }

    // Get the blob from temporary storage and encrypt it
    const blob = await this.getBlob(photo.blobKey);
    if (!blob) return;

    const encryptedBlob = await cryptoService.encryptBlob(blob, this.encryptionKey);

    // Save encrypted photo metadata
    const encryptedPhoto = {
      id: photo.id,
      encryptedBlob,
      caption: photo.caption,
      mimeType: blob.type || 'image/jpeg'  // Store MIME type for decryption
    };

    await blobStore.setItem(`photo_${entryId}`, encryptedPhoto);

    // Clean up temporary blob after encryption
    await this.removeBlob(photo.blobKey);
  }

  private async getPhotoForEntry(entryId: string): Promise<Photo | null> {
    const data = await blobStore.getItem<any>(`photo_${entryId}`);
    if (!data) return null;

    if (!this.encryptionKey) {
      // Return unencrypted photo
      return data as Photo;
    }

    try {
      // Decrypt photo using stored MIME type
      const mimeType = data.mimeType || 'image/jpeg';
      const blob = await cryptoService.decryptToBlob(
        data.encryptedBlob,
        mimeType,
        this.encryptionKey
      );

      // Store decrypted blob temporarily for rendering
      const blobKey = await this.saveBlob(blob);

      return {
        id: data.id,
        blobKey,
        caption: data.caption
      };
    } catch (error) {
      console.error(`Failed to decrypt photo for entry ${entryId}:`, error);
      return null;
    }
  }

  private async removePhotoForEntry(entryId: string): Promise<void> {
    await blobStore.removeItem(`photo_${entryId}`);
  }

  async migratePlainEntries(): Promise<number> {
    if (!this.encryptionKey) {
      throw new Error('Storage is locked, cannot migrate');
    }

    const plainEntries: Array<{ key: string; entry: JournalEntry }> = [];
    await localforage.iterate((value, key) => {
      if (!key.startsWith('entry_')) return;
      const record: any = value;
      if (record && !record.encryptedData && typeof record.html === 'string') {
        plainEntries.push({ key, entry: record as JournalEntry });
      }
    });

    let migrated = 0;
    for (const { key, entry } of plainEntries) {
      try {
        const encryptedData = await cryptoService.encrypt(entry.html || '', this.encryptionKey);
        const encrypted: EncryptedEntry = {
          id: entry.id,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          encryptedData,
          mood: entry.mood,
          hasPhoto: !!entry.photo
        };

        await localforage.setItem(key, encrypted);

        if (entry.photo) {
          await this.migratePlainPhoto(entry);
        }

        migrated++;
      } catch (error) {
        console.error('Failed to migrate legacy entry', entry.id, error);
      }
    }

    return migrated;
  }

  private async migratePlainPhoto(entry: JournalEntry): Promise<void> {
    if (!entry.photo || !this.encryptionKey) return;

    const legacyKey = entry.photo.blobKey;
    let blob = await blobStore.getItem<Blob>(legacyKey);
    if (!blob) {
      blob = await blobStore.getItem<Blob>(`blob_${legacyKey}`);
    }

    if (!blob) {
      console.warn('Legacy photo blob not found for entry', entry.id);
      return;
    }

    try {
      const encryptedBlob = await cryptoService.encryptBlob(blob, this.encryptionKey);
      const encryptedPhoto = {
        id: entry.photo.id,
        encryptedBlob,
        caption: entry.photo.caption,
        mimeType: blob.type || 'image/jpeg'
      };

      await blobStore.setItem(`photo_${entry.id}`, encryptedPhoto);
      await blobStore.removeItem(legacyKey);
      await blobStore.removeItem(`blob_${legacyKey}`);
    } catch (error) {
      console.error('Failed to migrate legacy photo for entry', entry.id, error);
    }
  }

  // Blob operations (temporary storage for decrypted photos)
  async saveBlob(blob: Blob): Promise<string> {
    const blobKey = crypto.randomUUID();
    await blobStore.setItem(`blob_${blobKey}`, blob);
    return blobKey;
  }

  async getBlob(blobKey: string): Promise<Blob | null> {
    return await blobStore.getItem<Blob>(`blob_${blobKey}`);
  }

  async removeBlob(blobKey: string): Promise<void> {
    await blobStore.removeItem(`blob_${blobKey}`);
  }

  // Settings operations (not encrypted - only contains non-sensitive data)
  async getSettings(): Promise<Settings> {
    try {
      const settings = await settingsStore.getItem<Settings>('settings');
      return settings || {
        theme: 'system',
        lockEnabled: false
      };
    } catch {
      // Fallback to localStorage
      const stored = localStorage.getItem('security_settings');
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
      localStorage.setItem('security_settings', JSON.stringify(settings));
    }
  }

  // Security check - verify if encryption is needed
  async requiresUnlock(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.lockEnabled && !this.isUnlocked();
  }

  // Clear all data (for testing/reset)
  async clearAll(): Promise<void> {
    await Promise.all([
      localforage.clear(),
      blobStore.clear(),
      settingsStore.clear()
    ]);
    localStorage.removeItem('security_settings');
    this.clearCache();
  }

  // Clean up temporary blobs (should be called periodically)
  async cleanupTempBlobs(): Promise<void> {
    const keysToRemove: string[] = [];
    await blobStore.iterate((value, key) => {
      if (key.startsWith('blob_')) {
        keysToRemove.push(key);
      }
    });

    for (const key of keysToRemove) {
      await blobStore.removeItem(key);
    }
  }

  // Archive/unarchive entry
  async archiveEntry(id: string, archived: boolean): Promise<JournalEntry | null> {
    const entry = await this.getEntry(id);
    if (!entry) return null;

    const updated = {
      ...entry,
      archived,
      updatedAt: new Date().toISOString()
    };

    return await this.updateEntry(updated);
  }

  // Soft delete entry (move to trash)
  async deleteEntry(id: string): Promise<JournalEntry | null> {
    const entry = await this.getEntry(id);
    if (!entry) return null;

    const updated = {
      ...entry,
      deleted: true,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return await this.updateEntry(updated);
  }

  // Restore from trash
  async restoreEntry(id: string): Promise<JournalEntry | null> {
    const entry = await this.getEntry(id);
    if (!entry) return null;

    const updated = {
      ...entry,
      deleted: false,
      deletedAt: undefined,
      updatedAt: new Date().toISOString()
    };

    return await this.updateEntry(updated);
  }

  // Permanently delete entry (cannot be undone)
  async permanentlyDeleteEntry(id: string): Promise<boolean> {
    try {
      // Delete entry
      await localforage.removeItem(`entry_${id}`);

      // Delete photo if exists
      await blobStore.removeItem(`photo_${id}`);

      // Clear from cache
      delete this.decryptedCache[id];

      return true;
    } catch (error) {
      console.error('Failed to permanently delete entry:', error);
      return false;
    }
  }

  // Clean up trash (delete entries older than specified days)
  async cleanupTrash(daysOld = 30): Promise<number> {
    const entries = await this.listEntries();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let deletedCount = 0;

    for (const entry of entries) {
      if (entry.deleted && entry.deletedAt) {
        const deletedDate = new Date(entry.deletedAt);
        if (deletedDate < cutoffDate) {
          await this.permanentlyDeleteEntry(entry.id);
          deletedCount++;
        }
      }
    }

    return deletedCount;
  }
}

export const secureStorage = new SecureStorageService();
