// services/crypto.ts
/**
 * Web Crypto API 加密服务
 * 实现 AES-GCM-256 加密和 PBKDF2 密钥派生
 */

export interface EncryptedData {
  ciphertext: string;  // Base64 encoded
  iv: string;          // Base64 encoded
  salt: string;        // Base64 encoded
}

export interface CryptoConfig {
  iterations: number;
  keyLength: number;
  saltLength: number;
  ivLength: number;
}

class CryptoService {
  private readonly config: CryptoConfig = {
    iterations: 150000,  // PBKDF2 iterations
    keyLength: 256,      // bits
    saltLength: 32,      // bytes
    ivLength: 12         // bytes (96 bits for GCM)
  };

  private currentKey: CryptoKey | null = null;
  private currentMasterKeyBytes: Uint8Array | null = null;

  /**
   * 生成随机盐值
   */
  generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.config.saltLength));
  }

  /**
   * 生成随机 IV
   */
  private generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.config.ivLength));
  }

  /**
   * 将 ArrayBuffer 或 Uint8Array 转换为 Base64
   */
  private bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * 将 Base64 转换为 ArrayBuffer
   */
  private base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * 使用 PBKDF2 从 PIN 派生密钥
   */
  async deriveKey(pin: string, salt: BufferSource): Promise<CryptoKey> {
    // 将 PIN 转换为密钥材料
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(pin),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // 派生 AES-GCM 密钥
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.config.iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: this.config.keyLength
      },
      false, // 不可导出
      ['encrypt', 'decrypt']
    );

    return key;
  }

  /**
   * 哈希 PIN 用于验证
   */
  async hashPIN(pin: string, salt: Uint8Array): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + this.bufferToBase64(salt));
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.bufferToBase64(hash);
  }

  /**
   * 验证 PIN
   */
  async verifyPIN(pin: string, salt: Uint8Array, hash: string): Promise<boolean> {
    const computedHash = await this.hashPIN(pin, salt);
    return computedHash === hash;
  }

  /**
   * 加密数据
   */
  async encrypt(data: string, key?: CryptoKey): Promise<EncryptedData> {
    const cryptoKey = key || this.currentKey;
    if (!cryptoKey) {
      throw new Error('No encryption key available');
    }

    const encoder = new TextEncoder();
    const iv = this.generateIV();
    const salt = this.generateSalt();

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource
      },
      cryptoKey,
      encoder.encode(data)
    );

    return {
      ciphertext: this.bufferToBase64(ciphertext),
      iv: this.bufferToBase64(iv),
      salt: this.bufferToBase64(salt)
    };
  }

  /**
   * 解密数据
   */
  async decrypt(encrypted: EncryptedData, key?: CryptoKey): Promise<string> {
    const cryptoKey = key || this.currentKey;
    if (!cryptoKey) {
      throw new Error('No decryption key available');
    }

    const decoder = new TextDecoder();
    const ciphertext = this.base64ToBuffer(encrypted.ciphertext);
    const iv = this.base64ToBuffer(encrypted.iv);

    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv) as BufferSource
      },
      cryptoKey,
      ciphertext
    );

    return decoder.decode(plaintext);
  }

  /**
   * 加密 Blob (用于照片)
   */
  async encryptBlob(blob: Blob, key?: CryptoKey): Promise<EncryptedData> {
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = this.bufferToBase64(arrayBuffer);
    return this.encrypt(base64, key);
  }

  /**
   * 解密为 Blob
   */
  async decryptToBlob(encrypted: EncryptedData, mimeType: string, key?: CryptoKey): Promise<Blob> {
    const base64 = await this.decrypt(encrypted, key);
    const arrayBuffer = this.base64ToBuffer(base64);
    return new Blob([arrayBuffer], { type: mimeType });
  }

  /**
   * 清除当前密钥
   */
  clearKey(): void {
    this.currentKey = null;
    this.currentMasterKeyBytes = null;
  }

  /**
   * 检查是否有密钥
   */
  hasKey(): boolean {
    return this.currentKey !== null;
  }

  /**
   * 设置当前密钥（用于会话管理）
   */
  setCurrentKey(key: CryptoKey, rawBytes?: Uint8Array): void {
    this.currentKey = key;
    if (rawBytes) {
      this.currentMasterKeyBytes = rawBytes;
    }
  }

  getCurrentMasterKeyBytes(): Uint8Array | null {
    return this.currentMasterKeyBytes ? new Uint8Array(this.currentMasterKeyBytes) : null;
  }

  async exportKey(key: CryptoKey): Promise<Uint8Array> {
    const raw = await crypto.subtle.exportKey('raw', key);
    return new Uint8Array(raw);
  }

  /**
   * 生成密钥指纹（用于验证）
   */
  async getKeyFingerprint(key: CryptoKey): Promise<string> {
    // 由于 CryptoKey 不可导出，我们使用一个测试字符串来生成指纹
    const testData = 'fingerprint-test';
    const encrypted = await this.encrypt(testData, key);
    const hash = await crypto.subtle.digest('SHA-256',
      new TextEncoder().encode(encrypted.ciphertext.substring(0, 32))
    );
    return this.bufferToBase64(hash).substring(0, 8);
  }

  /**
   * 生成主密钥 (256-bit random)
   */
  generateMasterKey(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32)); // 256-bit AES key
  }

  /**
   * 从 Uint8Array 导入主密钥为 CryptoKey
   */
  async importMasterKey(masterKey: Uint8Array): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
      'raw',
      masterKey.buffer as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * 加密主密钥 (用包装密钥加密)
   */
  async encryptMasterKey(masterKey: Uint8Array, wrapKey: CryptoKey): Promise<EncryptedData> {
    const base64 = this.bufferToBase64(masterKey);
    return await this.encrypt(base64, wrapKey);
  }

  /**
   * 解密主密钥 (用包装密钥解密)
   */
  async decryptMasterKey(encrypted: EncryptedData, wrapKey: CryptoKey): Promise<Uint8Array> {
    const base64 = await this.decrypt(encrypted, wrapKey);
    const buffer = this.base64ToBuffer(base64);
    return new Uint8Array(buffer);
  }

}

export const cryptoService = new CryptoService();
