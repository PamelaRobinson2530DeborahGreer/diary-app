// services/syncService.ts
// Cloud sync service for managing synchronization with server

import { cryptoService } from './crypto';
import { secureStorage } from './secureStorage';
import { logger } from '@/utils/logger';
import { JournalEntry } from '@/models/entry';

interface SyncSettings {
  userId: string | null;
  deviceId: string | null;
  deviceName: string;
  lastSyncTime: string | null;
  autoSyncEnabled: boolean;
  syncInterval: number; // minutes
}

interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  conflicts: number;
  error?: string;
}

interface VectorClock {
  [deviceId: string]: number;
}

class SyncService {
  private settings: SyncSettings;
  private syncInProgress = false;
  private autoSyncTimer: NodeJS.Timeout | null = null;
  private readonly API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

  // Emit sync events for UI components
  private emitSyncEvent(event: 'start' | 'complete' | 'error', data?: any) {
    if (typeof window !== 'undefined') {
      const customEvent = new CustomEvent(`sync:${event}`, { detail: data });
      window.dispatchEvent(customEvent);
    }
  }

  constructor() {
    // Load settings from localStorage
    const saved = localStorage.getItem('syncSettings');
    this.settings = saved ? JSON.parse(saved) : {
      userId: null,
      deviceId: null,
      deviceName: this.getDeviceName(),
      lastSyncTime: null,
      autoSyncEnabled: false,
      syncInterval: 5 // 5 minutes
    };
  }

  // Get device name
  private getDeviceName(): string {
    const ua = navigator.userAgent;
    let deviceName = 'Unknown Device';

    if (/iPhone/.test(ua)) deviceName = 'iPhone';
    else if (/iPad/.test(ua)) deviceName = 'iPad';
    else if (/Android/.test(ua)) deviceName = 'Android';
    else if (/Mac/.test(ua)) deviceName = 'Mac';
    else if (/Windows/.test(ua)) deviceName = 'Windows';
    else if (/Linux/.test(ua)) deviceName = 'Linux';

    return `${deviceName} (${new Date().toLocaleDateString()})`;
  }

  // Get device info
  private getDeviceInfo() {
    return {
      browser: navigator.userAgent,
      os: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language
    };
  }

  // Save settings
  private saveSettings(): void {
    localStorage.setItem('syncSettings', JSON.stringify(this.settings));
  }

  // Check if sync is set up
  isSyncEnabled(): boolean {
    return !!(this.settings.userId && this.settings.deviceId);
  }

  // Get sync status
  getSyncStatus(): SyncSettings {
    return { ...this.settings };
  }

  /**
   * Setup sync - First time setup
   */
  async setupSync(syncPassword: string): Promise<void> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    try {
      this.syncInProgress = true;
      logger.log('[SyncService] Setting up cloud sync');

      // 1. Generate sync salt and hash
      const syncSalt = cryptoService.generateSalt();
      const syncPasswordHash = await cryptoService.hashPIN(syncPassword, syncSalt);

      // 2. Get current master key
      const masterKeyBytes = cryptoService.getCurrentMasterKeyBytes();
      if (!masterKeyBytes) {
        throw new Error('No master key available');
      }

      // 3. Derive sync key from sync password
      const syncKey = await cryptoService.deriveKey(syncPassword, syncSalt as BufferSource);

      // 4. Encrypt master key with sync key
      const encryptedMasterKey = await cryptoService.encryptMasterKey(
        masterKeyBytes,
        syncKey
      );

      // 5. Call API to setup sync
      const response = await fetch(`${this.API_BASE}/api/sync/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encryptedMasterKey: JSON.stringify(encryptedMasterKey),
          syncSalt: Array.from(syncSalt).join(','),
          syncPasswordHash: syncPasswordHash,
          deviceName: this.settings.deviceName,
          deviceInfo: this.getDeviceInfo()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Setup failed');
      }

      const data = await response.json();

      // 6. Save sync credentials
      this.settings.userId = data.userId;
      this.settings.deviceId = data.deviceId;
      this.settings.lastSyncTime = new Date().toISOString();
      this.saveSettings();

      logger.log('[SyncService] Sync setup complete');

      // 7. Upload existing entries
      await this.uploadLocalEntries();

    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Login to sync from new device
   */
  async loginSync(syncPassword: string): Promise<void> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    try {
      this.syncInProgress = true;
      logger.log('[SyncService] Logging into cloud sync');

      // 1. Hash sync password
      const syncSalt = cryptoService.generateSalt();
      const syncPasswordHash = await cryptoService.hashPIN(syncPassword, syncSalt);

      // 2. Call API to login
      const response = await fetch(`${this.API_BASE}/api/sync/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncPasswordHash,
          deviceName: this.settings.deviceName,
          deviceInfo: this.getDeviceInfo()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();

      // 3. Decrypt master key
      const storedSalt = new Uint8Array(data.syncSalt.split(',').map(Number));
      const syncKey = await cryptoService.deriveKey(syncPassword, storedSalt);

      const encryptedMasterKey = JSON.parse(data.encryptedMasterKey);
      const masterKeyBytes = await cryptoService.decryptMasterKey(
        encryptedMasterKey,
        syncKey
      );

      // 4. Set master key
      const masterKey = await cryptoService.importMasterKey(masterKeyBytes);
      cryptoService.setCurrentKey(masterKey, new Uint8Array(masterKeyBytes));
      secureStorage.setEncryptionKey(masterKey);

      // 5. Save sync credentials
      this.settings.userId = data.userId;
      this.settings.deviceId = data.deviceId;
      this.settings.lastSyncTime = null; // Will be set after first sync
      this.saveSettings();

      logger.log('[SyncService] Login complete');

      // 6. Download entries from cloud
      await this.downloadCloudEntries();

    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Upload local entries to cloud
   */
  private async uploadLocalEntries(): Promise<number> {
    if (!this.settings.userId || !this.settings.deviceId) {
      throw new Error('Sync not set up');
    }

    logger.log('[SyncService] Uploading local entries');

    // Get all local entries
    const localEntries = await secureStorage.listEntries();

    // Transform to sync format
    const syncEntries = await Promise.all(
      localEntries.map(async (entry) => ({
        id: entry.id,
        version: 1,
        encryptedData: JSON.stringify(entry),
        encryptedTitle: entry.title,
        mood: entry.mood,
        hasPhoto: !!entry.photo,
        deleted: entry.deleted || false,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        vectorClock: { [this.settings.deviceId!]: 1 } as VectorClock
      }))
    );

    // Upload to server
    const response = await fetch(`${this.API_BASE}/api/sync/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: this.settings.userId,
        deviceId: this.settings.deviceId,
        entries: syncEntries
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    const result = await response.json();
    logger.log(`[SyncService] Uploaded ${result.entriesUploaded} entries`);

    return result.entriesUploaded;
  }

  /**
   * Download entries from cloud
   */
  private async downloadCloudEntries(): Promise<number> {
    if (!this.settings.userId) {
      throw new Error('Sync not set up');
    }

    logger.log('[SyncService] Downloading cloud entries');

    // Download from server
    const response = await fetch(
      `${this.API_BASE}/api/sync/download?userId=${this.settings.userId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Download failed');
    }

    const data = await response.json();
    const entries = data.entries;

    logger.log(`[SyncService] Downloaded ${entries.length} entries`);

    // Save to local storage
    for (const syncEntry of entries) {
      const entry: JournalEntry = JSON.parse(syncEntry.encryptedData);
      await secureStorage.createEntry(entry);
    }

    // Update last sync time
    this.settings.lastSyncTime = new Date().toISOString();
    this.saveSettings();

    return entries.length;
  }

  /**
   * Perform full sync (upload + download)
   */
  async syncNow(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        error: 'Sync already in progress'
      };
    }

    if (!this.isSyncEnabled()) {
      return {
        success: false,
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        error: 'Sync not enabled'
      };
    }

    try {
      this.syncInProgress = true;
      this.emitSyncEvent('start');
      logger.log('[SyncService] Starting sync');

      const uploaded = await this.uploadLocalEntries();
      const downloaded = await this.downloadCloudEntries();

      // Update last sync time
      this.settings.lastSyncTime = new Date().toISOString();
      this.saveSettings();

      logger.log('[SyncService] Sync complete');

      const result = {
        success: true,
        uploaded,
        downloaded,
        conflicts: 0 // TODO: Implement conflict detection
      };

      this.emitSyncEvent('complete', result);
      return result;

    } catch (error) {
      logger.error('[SyncService] Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.emitSyncEvent('error', { message: errorMessage });

      return {
        success: false,
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        error: errorMessage
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Enable auto sync
   */
  enableAutoSync(intervalMinutes: number = 5): void {
    this.settings.autoSyncEnabled = true;
    this.settings.syncInterval = intervalMinutes;
    this.saveSettings();

    // Clear existing timer
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
    }

    // Start new timer
    this.autoSyncTimer = setInterval(() => {
      this.syncNow();
    }, intervalMinutes * 60 * 1000);

    logger.log(`[SyncService] Auto sync enabled (${intervalMinutes}min)`);
  }

  /**
   * Disable auto sync
   */
  disableAutoSync(): void {
    this.settings.autoSyncEnabled = false;
    this.saveSettings();

    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }

    logger.log('[SyncService] Auto sync disabled');
  }

  /**
   * Disable sync completely
   */
  async disableSync(): Promise<void> {
    this.disableAutoSync();

    this.settings.userId = null;
    this.settings.deviceId = null;
    this.settings.lastSyncTime = null;
    this.saveSettings();

    logger.log('[SyncService] Sync disabled');
  }

  /**
   * Enable sync (for UI toggle)
   */
  async enableSync(): Promise<void> {
    // Just a marker for enabling sync state
    // Actual setup is done via setupSync or loginSync
    logger.log('[SyncService] Sync enabled');
  }

  /**
   * Get sync settings for UI
   */
  getSettings() {
    return {
      enabled: this.isSyncEnabled(),
      isSetup: !!(this.settings.userId && this.settings.deviceId),
      lastSyncTime: this.settings.lastSyncTime,
      autoSyncEnabled: this.settings.autoSyncEnabled,
      syncInterval: this.settings.syncInterval,
      deviceName: this.settings.deviceName,
      userId: this.settings.userId,
      deviceId: this.settings.deviceId
    };
  }

  /**
   * Set auto sync (for UI)
   */
  setAutoSync(enabled: boolean, interval: number): void {
    if (enabled) {
      this.enableAutoSync(interval);
    } else {
      this.disableAutoSync();
    }
  }
}

export const syncService = new SyncService();
