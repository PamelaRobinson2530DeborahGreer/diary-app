// models/entry.ts
export type EntryID = string; // uuid
export type TagID = string; // uuid

export interface Photo {
  id: string;
  blobKey: string; // key in IndexedDB for Blob
  caption?: string;
}

export interface Tag {
  id: TagID;
  name: string;
  color: string;  // hex color (e.g., '#3B82F6')
  icon?: string;  // emoji (e.g., '📌')
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface JournalEntry {
  id: EntryID;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  title?: string;    // optional title (new field)
  html: string;      // sanitized HTML content (encrypted at rest)
  mood?: string;     // emoji or label
  photo?: Photo;     // optional
  tags?: TagID[];    // array of tag IDs
  archived?: boolean; // default false
  deleted?: boolean;  // soft delete, default false
  deletedAt?: string; // ISO, when deleted
}

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  lockEnabled: boolean;
  pinHash?: string; // scrypt/pbkdf2
  salt?: string;

  // Master key encrypted by different methods
  encryptedMasterKey?: {
    byPIN?: string;      // Base64 encoded EncryptedData (JSON stringified)
    byBiometric?: string; // Base64 encoded EncryptedData (JSON stringified)
  };

  webAuthn?: { credId: string } | null;
  biometricStorage?: 'largeBlob';

  // Auto-lock settings
  autoLockEnabled?: boolean;      // Enable auto-lock feature
  autoLockTimeout?: number;       // Timeout in minutes (5, 10, 15, 30)

  // Cloud sync settings
  cloudSyncEnabled?: boolean;
  syncUserId?: string;
  syncDeviceId?: string;
  lastSyncTime?: string;
  autoSyncEnabled?: boolean;
  syncInterval?: number;
}

export interface VectorClock {
  [deviceId: string]: number;
}

export interface SyncEntry {
  id: string;
  version: number;
  encryptedData: string;
  encryptedTitle?: string;
  mood?: string;
  hasPhoto: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  vectorClock: VectorClock;
  deviceId?: string;
}

export interface SyncDevice {
  id: string;
  deviceName: string;
  lastSyncAt: Date | string | null;
  deviceInfo?: {
    browser?: string;
    os?: string;
    userAgent?: string;
  };
  createdAt: Date | string;
}

export interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  conflicts: number;
  error?: string;
}

export interface Conflict {
  entryId: string;
  localVersion: JournalEntry;
  remoteVersion: SyncEntry;
  type: 'content' | 'delete' | 'both';
}
