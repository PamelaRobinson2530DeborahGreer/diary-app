import { useEffect } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { SecurityProvider, useSecurityContext } from '@/contexts/SecurityContext';
import { cryptoService } from '@/services/crypto';
import type { Settings } from '@/models/entry';

vi.mock('@/services/secureStorage', () => {
  const secureStorageMock = {
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
    setEncryptionKey: vi.fn(),
    clearEncryptionKey: vi.fn(),
    isUnlocked: vi.fn().mockReturnValue(false),
    cleanupTempBlobs: vi.fn(),
    migratePlainEntries: vi.fn().mockResolvedValue(0),
  };

  return {
    secureStorage: secureStorageMock,
  };
});

const { secureStorage } = await import('@/services/secureStorage');

vi.mock('@/services/webauthn', () => {
  const webAuthnMock = {
    isSupported: vi.fn().mockReturnValue(true),
    isPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(false),
    supportsLargeBlob: vi.fn().mockReturnValue(false),
    hasCredential: vi.fn().mockReturnValue(false),
    register: vi.fn(),
    authenticate: vi.fn(),
    removeCredential: vi.fn(),
  };

  return {
    webAuthnService: webAuthnMock,
  };
});

const { webAuthnService } = await import('@/services/webauthn');

function SecurityConsumer({ onReady }: { onReady: (context: ReturnType<typeof useSecurityContext>) => void }) {
  const context = useSecurityContext();

  useEffect(() => {
    onReady(context);
  }, [context, onReady]);

  return null;
}

describe('SecurityContext master key management', () => {
  beforeAll(() => {
    if (typeof globalThis.crypto === 'undefined' || !('subtle' in globalThis.crypto)) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { webcrypto } = require('node:crypto');
      globalThis.crypto = webcrypto as unknown as Crypto;
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    cryptoService.clearKey();
    (webAuthnService.isSupported as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (webAuthnService.isPlatformAuthenticatorAvailable as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (webAuthnService.supportsLargeBlob as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (webAuthnService.hasCredential as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (webAuthnService.register as ReturnType<typeof vi.fn>).mockReset();
    (webAuthnService.authenticate as ReturnType<typeof vi.fn>).mockReset();
    (webAuthnService.removeCredential as ReturnType<typeof vi.fn>).mockReset();
    (secureStorage.migratePlainEntries as ReturnType<typeof vi.fn>).mockResolvedValue(0);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('migrates legacy settings without encrypted master key on unlock', async () => {
    const pin = '123456';
    const saltBytes = cryptoService.generateSalt();
    const pinHash = await cryptoService.hashPIN(pin, saltBytes);

    const legacySettings: Settings = {
      theme: 'system',
      lockEnabled: true,
      pinHash,
      salt: Array.from(saltBytes).join(','),
    };

    (secureStorage.getSettings as ReturnType<typeof vi.fn>).mockResolvedValue(legacySettings);
    (secureStorage.saveSettings as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    let contextValue: ReturnType<typeof useSecurityContext> | null = null;

    render(
      <SecurityProvider>
        <SecurityConsumer onReady={(ctx) => { contextValue = ctx; }} />
      </SecurityProvider>
    );

    await waitFor(() => {
      expect(contextValue).not.toBeNull();
      expect(contextValue?.isLoading).toBe(false);
    });

    let unlockResult: boolean | null = null;
    await act(async () => {
      unlockResult = await contextValue!.unlock(pin);
    });
    expect(unlockResult).toBe(true);

    expect(secureStorage.saveSettings).toHaveBeenCalled();
    const savedSettings = (secureStorage.saveSettings as ReturnType<typeof vi.fn>).mock.calls[0][0] as Settings;
    expect(savedSettings.encryptedMasterKey?.byPIN).toBeTruthy();

    expect(secureStorage.setEncryptionKey).toHaveBeenCalledTimes(1);
    expect(secureStorage.migratePlainEntries).toHaveBeenCalled();
  });

  it('clears master key when disabling encryption', async () => {
    const pin = '654321';
    const saltBytes = cryptoService.generateSalt();
    const pinHash = await cryptoService.hashPIN(pin, saltBytes);
    const masterKey = cryptoService.generateMasterKey();
    const pinKey = await cryptoService.deriveKey(pin, saltBytes as BufferSource);
    const encryptedByPIN = await cryptoService.encryptMasterKey(masterKey, pinKey);

    const initialSettings: Settings = {
      theme: 'light',
      lockEnabled: true,
      pinHash,
      salt: Array.from(saltBytes).join(','),
      encryptedMasterKey: {
        byPIN: JSON.stringify(encryptedByPIN),
      },
    };

    (secureStorage.getSettings as ReturnType<typeof vi.fn>).mockResolvedValue(initialSettings);
    (secureStorage.saveSettings as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    let contextValue: ReturnType<typeof useSecurityContext> | null = null;

    render(
      <SecurityProvider>
        <SecurityConsumer onReady={(ctx) => { contextValue = ctx; }} />
      </SecurityProvider>
    );

    await waitFor(() => {
      expect(contextValue).not.toBeNull();
      expect(contextValue?.isLoading).toBe(false);
    });

    await act(async () => {
      await contextValue!.unlock(pin);
    });

    let disableResult: boolean | null = null;
    await act(async () => {
      disableResult = await contextValue!.disableEncryption(pin);
    });

    expect(disableResult).toBe(true);
    expect(secureStorage.clearEncryptionKey).toHaveBeenCalled();
    expect(secureStorage.migratePlainEntries).toHaveBeenCalled();
    expect(webAuthnService.removeCredential).toHaveBeenCalled();

    const savedSettingsCalls = (secureStorage.saveSettings as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = savedSettingsCalls[savedSettingsCalls.length - 1][0] as Settings;
    expect(lastCall.lockEnabled).toBe(false);
    expect(lastCall.encryptedMasterKey).toBeUndefined();
    expect(lastCall.pinHash).toBeUndefined();
  });

  it('rejects invalid PIN attempts', async () => {
    const validPin = '135790';
    const saltBytes = cryptoService.generateSalt();
    const pinHash = await cryptoService.hashPIN(validPin, saltBytes);
    const masterKey = cryptoService.generateMasterKey();
    const pinKey = await cryptoService.deriveKey(validPin, saltBytes as BufferSource);
    const encryptedByPIN = await cryptoService.encryptMasterKey(masterKey, pinKey);

    const initialSettings: Settings = {
      theme: 'dark',
      lockEnabled: true,
      pinHash,
      salt: Array.from(saltBytes).join(','),
      encryptedMasterKey: {
        byPIN: JSON.stringify(encryptedByPIN),
      },
    };

    (secureStorage.getSettings as ReturnType<typeof vi.fn>).mockResolvedValue(initialSettings);
    (secureStorage.saveSettings as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    let contextValue: ReturnType<typeof useSecurityContext> | null = null;

    render(
      <SecurityProvider>
        <SecurityConsumer onReady={(ctx) => { contextValue = ctx; }} />
      </SecurityProvider>
    );

    await waitFor(() => {
      expect(contextValue).not.toBeNull();
      expect(contextValue?.isLoading).toBe(false);
    });

    const result = await contextValue!.unlock('000000');
    expect(result).toBe(false);
    expect(secureStorage.setEncryptionKey).not.toHaveBeenCalled();
    expect(secureStorage.migratePlainEntries).not.toHaveBeenCalled();
  });

  it('supports biometric setup and unlock via large blob storage', async () => {
    const pin = '246810';
    const saltBytes = cryptoService.generateSalt();
    const pinHash = await cryptoService.hashPIN(pin, saltBytes);
    const masterKey = cryptoService.generateMasterKey();
    const pinKey = await cryptoService.deriveKey(pin, saltBytes as BufferSource);
    const encryptedByPIN = await cryptoService.encryptMasterKey(masterKey, pinKey);

    const initialSettings: Settings = {
      theme: 'dark',
      lockEnabled: true,
      pinHash,
      salt: Array.from(saltBytes).join(','),
      encryptedMasterKey: {
        byPIN: JSON.stringify(encryptedByPIN),
      },
    };

    (secureStorage.getSettings as ReturnType<typeof vi.fn>).mockResolvedValue(initialSettings);
    (secureStorage.saveSettings as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    (webAuthnService.isPlatformAuthenticatorAvailable as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (webAuthnService.supportsLargeBlob as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (webAuthnService.hasCredential as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (webAuthnService.register as ReturnType<typeof vi.fn>).mockResolvedValue('cred-123');

    const authenticateMock = webAuthnService.authenticate as ReturnType<typeof vi.fn>;
    authenticateMock.mockResolvedValueOnce({ success: true, wroteLargeBlob: true }); // write during setup
    authenticateMock.mockResolvedValueOnce({ success: true, largeBlob: new Uint8Array(masterKey) }); // read during unlock

    let contextValue: ReturnType<typeof useSecurityContext> | null = null;

    render(
      <SecurityProvider>
        <SecurityConsumer onReady={(ctx) => { contextValue = ctx; }} />
      </SecurityProvider>
    );

    await waitFor(() => {
      expect(contextValue).not.toBeNull();
      expect(contextValue?.isLoading).toBe(false);
    });

    await act(async () => {
      const unlocked = await contextValue!.unlock(pin);
      expect(unlocked).toBe(true);
    });
    expect(secureStorage.migratePlainEntries).toHaveBeenCalled();

    let setupResult = false;
    await act(async () => {
      setupResult = await contextValue!.setupBiometric();
    });
    expect(setupResult).toBe(true);
    expect(webAuthnService.register).toHaveBeenCalledWith(expect.any(String), 'Journal User', { requireLargeBlob: true });
    expect(secureStorage.saveSettings).toHaveBeenCalled();

    act(() => {
      contextValue!.lock();
    });

    let biometricUnlock = false;
    await act(async () => {
      biometricUnlock = await contextValue!.unlockWithBiometric();
    });
    expect(biometricUnlock).toBe(true);
    expect(authenticateMock).toHaveBeenCalledTimes(2);
    expect(secureStorage.setEncryptionKey).toHaveBeenCalledTimes(2);
  });
});
