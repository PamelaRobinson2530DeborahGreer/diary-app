import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cryptoService } from '@/services/crypto';

describe('cryptoService master key management', () => {
  beforeAll(() => {
    if (typeof globalThis.crypto === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { webcrypto } = require('node:crypto');
      globalThis.crypto = webcrypto as unknown as Crypto;
    }
  });

  beforeEach(() => {
    cryptoService.clearKey();
  });

  it('encrypts and decrypts master key using a derived PIN key', async () => {
    const salt = cryptoService.generateSalt();
    const pinKey = await cryptoService.deriveKey('123456', salt as BufferSource);
    const masterKey = cryptoService.generateMasterKey();

    const encrypted = await cryptoService.encryptMasterKey(masterKey, pinKey);
    const decrypted = await cryptoService.decryptMasterKey(encrypted, pinKey);

    expect(Array.from(decrypted)).toEqual(Array.from(masterKey));
  });

  it('stores and clears master key bytes when managing session state', async () => {
    const masterKey = cryptoService.generateMasterKey();
    const masterCryptoKey = await cryptoService.importMasterKey(masterKey);

    cryptoService.setCurrentKey(masterCryptoKey, masterKey);

    const cached = cryptoService.getCurrentMasterKeyBytes();
    expect(cached).not.toBeNull();
    expect(Array.from(cached!)).toEqual(Array.from(masterKey));

    cryptoService.clearKey();
    expect(cryptoService.getCurrentMasterKeyBytes()).toBeNull();
  });
});
