// contexts/SecurityContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { cryptoService, EncryptedData } from '@/services/crypto';
import { secureStorage } from '@/services/secureStorage';
import { webAuthnService } from '@/services/webauthn';
import { Settings } from '@/models/entry';
import { logger } from '@/utils/logger';

interface SecurityContextType {
  isLocked: boolean;
  isEncryptionEnabled: boolean;
  isLoading: boolean;
  requiresSetup: boolean;
  hasBiometric: boolean;
  canUseBiometric: boolean;
  unlock: (pin: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
  lock: () => void;
  setupPIN: (pin: string) => Promise<void>;
  setupBiometric: () => Promise<boolean>;
  disableEncryption: (pin: string) => Promise<boolean>;
  checkAutoLock: () => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

function safeParseEncryptedData(raw?: string): EncryptedData | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EncryptedData;
  } catch (error) {
    console.error('Failed to parse encrypted master key payload:', error);
    return null;
  }
}

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresSetup, setRequiresSetup] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [canUseBiometric, setCanUseBiometric] = useState(false);

  const lastActivityRef = useRef(Date.now());
  const autoLockTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const masterKeyBytesRef = useRef<Uint8Array | null>(null); // Cache master key bytes for biometric setup

  // Get auto-lock timeout from settings (in milliseconds)
  const getAutoLockTimeout = () => {
    if (!settings?.autoLockEnabled) return null;
    const timeoutMinutes = settings?.autoLockTimeout || 5; // Default 5 minutes
    return timeoutMinutes * 60 * 1000;
  };

  // Initialize security state
  useEffect(() => {
    initializeSecurity();
  }, []);

  // Auto-lock timer
  useEffect(() => {
    if (!isEncryptionEnabled || isLocked) return;

    const autoLockTimeout = getAutoLockTimeout();
    if (!autoLockTimeout) return; // Auto-lock disabled

    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityRef.current;

      if (timeSinceActivity >= autoLockTimeout) {
        logger.log('[SecurityContext] Auto-locking due to inactivity');
        lock();
      } else {
        // Check again after remaining time
        const remainingTime = autoLockTimeout - timeSinceActivity;
        autoLockTimerRef.current = setTimeout(checkInactivity, remainingTime);
      }
    };

    autoLockTimerRef.current = setTimeout(checkInactivity, autoLockTimeout);

    return () => {
      if (autoLockTimerRef.current) {
        clearTimeout(autoLockTimerRef.current);
      }
    };
  }, [isEncryptionEnabled, isLocked, settings?.autoLockEnabled, settings?.autoLockTimeout]);

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Track various user activities
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  const initializeSecurity = async () => {
    try {
      const savedSettings = await secureStorage.getSettings();
      setSettings(savedSettings);
      setIsEncryptionEnabled(savedSettings.lockEnabled);

      let biometricAvailable = false;
      let biometricEnabled = false;

      if (webAuthnService.isSupported()) {
        try {
          const platformAvailable = await webAuthnService.isPlatformAuthenticatorAvailable();
          const largeBlobSupported = webAuthnService.supportsLargeBlob();
          biometricAvailable = platformAvailable && largeBlobSupported;

          if (biometricAvailable && savedSettings.biometricStorage === 'largeBlob' && webAuthnService.hasCredential()) {
            biometricEnabled = true;
          }
        } catch (error) {
          console.error('Failed to determine biometric availability:', error);
        }
      }

      setCanUseBiometric(biometricAvailable);
      setHasBiometric(biometricEnabled);

      if (savedSettings.lockEnabled) {
        // Check if PIN is set up
        if (!savedSettings.pinHash || !savedSettings.salt) {
          setRequiresSetup(true);
          setIsLocked(true);
        } else {
          // Lock by default if encryption is enabled
          setIsLocked(true);
        }
      } else {
        setIsLocked(false);
      }
    } catch (error) {
      console.error('Failed to initialize security:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const unlock = useCallback(async (pin: string): Promise<boolean> => {
    if (!settings?.salt || !settings?.pinHash) {
      console.error('[SecurityContext] PIN 未配置');
      return false;
    }

    try {
      const salt = new Uint8Array(settings.salt.split(',').map(Number));

      const isValid = await cryptoService.verifyPIN(pin, salt, settings.pinHash);
      if (!isValid) {
        console.error('[SecurityContext] PIN 验证失败');
        return false;
      }

      console.log('[SecurityContext] PIN 验证成功,开始派生密钥...');
      const pinKey = await cryptoService.deriveKey(pin, salt as BufferSource);

      let masterKeyBytes: Uint8Array;
      const encryptedString = settings.encryptedMasterKey?.byPIN;

      if (encryptedString) {
        console.log('[SecurityContext] 检测到已存储的主密钥,开始解密...');
        const encryptedData = safeParseEncryptedData(encryptedString);
        if (!encryptedData) {
          console.error('[SecurityContext] 存储的主密钥格式无效');
          throw new Error('存储的主密钥无效');
        }
        try {
          masterKeyBytes = await cryptoService.decryptMasterKey(encryptedData, pinKey);
          console.log('[SecurityContext] 主密钥解密成功');
        } catch (decryptError) {
          console.error('[SecurityContext] 主密钥解密失败:', decryptError);
          throw new Error('主密钥解密失败,请检查 PIN 是否正确');
        }
      } else {
        console.log('[SecurityContext] 未找到存储的主密钥,生成新的主密钥...');
        masterKeyBytes = cryptoService.generateMasterKey();
        const encrypted = await cryptoService.encryptMasterKey(masterKeyBytes, pinKey);
        const updatedSettings: Settings = {
          ...settings,
          encryptedMasterKey: {
            ...settings.encryptedMasterKey,
            byPIN: JSON.stringify(encrypted)
          }
        };
        await secureStorage.saveSettings(updatedSettings);
        setSettings(updatedSettings);
        console.log('[SecurityContext] 新主密钥已保存');
      }

      const masterCryptoKey = await cryptoService.importMasterKey(masterKeyBytes);
      const masterKeyBuffer = new Uint8Array(masterKeyBytes);
      cryptoService.setCurrentKey(masterCryptoKey, masterKeyBuffer);
      secureStorage.setEncryptionKey(masterCryptoKey);
      masterKeyBytesRef.current = masterKeyBuffer;

      console.log('[SecurityContext] 主密钥已导入,开始迁移旧数据...');
      if (settings?.lockEnabled) {
        try {
          const migrated = await secureStorage.migratePlainEntries();
          if (migrated > 0) {
            console.info(`[SecurityContext] 迁移了 ${migrated} 条旧日记到加密存储`);
          }
        } catch (error) {
          console.error('[SecurityContext] 迁移旧数据失败:', error);
        }
      }

      setIsLocked(false);
      lastActivityRef.current = Date.now();
      console.log('[SecurityContext] 解锁成功');
      return true;
    } catch (error) {
      console.error('[SecurityContext] 解锁失败:', error);
      return false;
    }
  }, [settings]);

  const lock = useCallback(() => {
    // Clear encryption keys from memory
    cryptoService.clearKey();
    secureStorage.clearEncryptionKey();
    masterKeyBytesRef.current = null; // Clear cached master key
    setIsLocked(true);

    // Clear any auto-lock timer
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
    }
  }, []);

  const setupPIN = useCallback(async (pin: string) => {
    logger.log('[SecurityContext] Starting PIN setup...');
    try {
      // 1. Generate salt and derive PIN key
      logger.log('[SecurityContext] Step 1: Generating salt and deriving PIN key');
      const salt = cryptoService.generateSalt();
      const pinKey = await cryptoService.deriveKey(pin, salt as BufferSource);
      const hash = await cryptoService.hashPIN(pin, salt);

      let masterKey = masterKeyBytesRef.current;

      if (!masterKey && settings?.encryptedMasterKey?.byPIN) {
        logger.log('[SecurityContext] Step 2: Decrypting existing master key');
        const legacyEncrypted = safeParseEncryptedData(settings.encryptedMasterKey.byPIN);
        if (legacyEncrypted) {
          try {
            masterKey = await cryptoService.decryptMasterKey(legacyEncrypted, pinKey);
          } catch (decryptError) {
            logger.error('[SecurityContext] Failed to decrypt existing master key:', decryptError);
          }
        }
      }

      if (!masterKey) {
        logger.log('[SecurityContext] Step 3: Generating new master key');
        masterKey = cryptoService.generateMasterKey();
      }

      logger.log('[SecurityContext] Step 4: Encrypting master key with PIN');
      const encryptedByPIN = await cryptoService.encryptMasterKey(masterKey, pinKey);

      // 4. Save to settings
      logger.log('[SecurityContext] Step 5: Saving settings');
      const newSettings: Settings = {
        ...settings,
        theme: settings?.theme || 'system',
        lockEnabled: true,
        pinHash: hash,
        salt: Array.from(salt).join(','),
        encryptedMasterKey: {
          byPIN: JSON.stringify(encryptedByPIN)
        }
      };

      await secureStorage.saveSettings(newSettings);
      setSettings(newSettings);

      // 5. Import master key and set in services
      logger.log('[SecurityContext] Step 6: Importing master key');
      const masterCryptoKey = await cryptoService.importMasterKey(masterKey);
      const masterKeyBuffer = new Uint8Array(masterKey);
      cryptoService.setCurrentKey(masterCryptoKey, masterKeyBuffer);
      secureStorage.setEncryptionKey(masterCryptoKey);

      // 6. Cache master key bytes
      masterKeyBytesRef.current = masterKeyBuffer;
      logger.log('[SecurityContext] Master key cached successfully');

      // 7. Migrate plain entries
      logger.log('[SecurityContext] Step 7: Migrating plain entries');
      try {
        const migrated = await secureStorage.migratePlainEntries();
        if (migrated > 0) {
          logger.info(`[SecurityContext] Migrated ${migrated} legacy entries to encrypted storage`);
        } else {
          logger.log('[SecurityContext] No plain entries to migrate');
        }
      } catch (migrateError) {
        logger.error('[SecurityContext] Failed to migrate legacy entries:', migrateError);
        // Don't throw - migration failure shouldn't stop setup
      }

      // 8. Update state
      logger.log('[SecurityContext] Step 8: Updating security state');
      setIsEncryptionEnabled(true);
      setRequiresSetup(false);
      setIsLocked(false);
      lastActivityRef.current = Date.now();

      logger.log('[SecurityContext] PIN setup completed successfully');
    } catch (error) {
      logger.error('[SecurityContext] PIN setup failed:', error);
      throw new Error('设置 PIN 失败');
    }
  }, [settings]);

  const disableEncryption = useCallback(async (pin: string): Promise<boolean> => {
    if (!settings?.salt || !settings?.pinHash) {
      return false;
    }

    try {
      // Verify PIN first
      const salt = new Uint8Array(settings.salt.split(',').map(Number));
      const isValid = await cryptoService.verifyPIN(pin, salt, settings.pinHash);

      if (!isValid) {
        return false;
      }

      // Disable encryption
      const newSettings: Settings = {
        ...settings,
        lockEnabled: false,
        pinHash: undefined,
        salt: undefined,
        encryptedMasterKey: undefined,
        webAuthn: null,
        biometricStorage: undefined
      };

      await secureStorage.saveSettings(newSettings);
      setSettings(newSettings);

      // Clear keys
      cryptoService.clearKey();
      secureStorage.clearEncryptionKey();
      setHasBiometric(false);
      try {
        webAuthnService.removeCredential();
      } catch (error) {
        console.error('Failed to remove biometric credential:', error);
      }

      setIsEncryptionEnabled(false);
      setIsLocked(false);

      return true;
    } catch (error) {
      console.error('Failed to disable encryption:', error);
      return false;
    }
  }, [settings]);

  const unlockWithBiometric = useCallback(async (): Promise<boolean> => {
    if (!canUseBiometric || !hasBiometric || settings?.biometricStorage !== 'largeBlob') {
      return false;
    }

    try {
      const result = await webAuthnService.authenticate({ largeBlobRead: true });
      if (!result.success || !result.largeBlob || result.largeBlob.length === 0) {
        return false;
      }

      const masterKeyBytes = new Uint8Array(result.largeBlob);
      const masterCryptoKey = await cryptoService.importMasterKey(masterKeyBytes);
      cryptoService.setCurrentKey(masterCryptoKey, masterKeyBytes);
      secureStorage.setEncryptionKey(masterCryptoKey);
      masterKeyBytesRef.current = masterKeyBytes;

      setIsLocked(false);
      lastActivityRef.current = Date.now();
      return true;
    } catch (error) {
      console.error('Biometric unlock error:', error);
      return false;
    }
  }, [canUseBiometric, hasBiometric, settings]);

  const setupBiometric = useCallback(async (): Promise<boolean> => {
    if (!canUseBiometric || !isEncryptionEnabled) {
      return false;
    }

    if (!webAuthnService.supportsLargeBlob()) {
      throw new Error('此设备不支持生物识别解锁（缺少 largeBlob 扩展）');
    }

    // Must be unlocked to setup biometric (need master key in memory)
    if (isLocked || !cryptoService.hasKey()) {
      throw new Error('请先用 PIN 解锁再设置生物识别');
    }

    if (!settings?.salt || !settings?.encryptedMasterKey?.byPIN) {
      throw new Error('PIN 未配置');
    }

    const masterKey = masterKeyBytesRef.current || cryptoService.getCurrentMasterKeyBytes();
    if (!masterKey) {
      throw new Error('主密钥未在内存中，请重新解锁');
    }

    try {
      const userId = 'user-' + Date.now();
      const credentialId = await webAuthnService.register(userId, 'Journal User', { requireLargeBlob: true });
      if (!credentialId) {
        return false;
      }

      const writeResult = await webAuthnService.authenticate({ largeBlobWrite: masterKey });
      if (!writeResult.success || !writeResult.wroteLargeBlob) {
        webAuthnService.removeCredential();
        throw new Error('生物识别存储主密钥失败');
      }

      const newSettings: Settings = {
        ...settings,
        webAuthn: { credId: credentialId },
        biometricStorage: 'largeBlob',
      };

      await secureStorage.saveSettings(newSettings);
      setSettings(newSettings);
      setHasBiometric(true);
      return true;
    } catch (error) {
      console.error('Biometric setup error:', error);
      throw error;
    }
  }, [canUseBiometric, isEncryptionEnabled, isLocked, settings]);

  const checkAutoLock = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const value: SecurityContextType = {
    isLocked,
    isEncryptionEnabled,
    isLoading,
    requiresSetup,
    hasBiometric,
    canUseBiometric,
    unlock,
    unlockWithBiometric,
    lock,
    setupPIN,
    setupBiometric,
    disableEncryption,
    checkAutoLock
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurityContext() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurityContext must be used within a SecurityProvider');
  }
  return context;
}
