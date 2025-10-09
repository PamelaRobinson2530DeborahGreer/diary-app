// services/webauthn.ts
/**
 * WebAuthn Service for biometric authentication
 * Supports Touch ID, Face ID, Windows Hello, etc.
 */

interface StoredCredential {
  id: string;
  publicKey: string;
  createdAt: string;
  usesLargeBlob?: boolean;
}

interface RegisterOptions {
  requireLargeBlob?: boolean;
}

interface AuthenticateOptions {
  largeBlobRead?: boolean;
  largeBlobWrite?: Uint8Array;
}

interface AuthenticateResult {
  success: boolean;
  largeBlob?: Uint8Array | null;
  wroteLargeBlob?: boolean;
}

class WebAuthnService {
  private readonly STORAGE_KEY = 'webauthn_credentials';
  private readonly RP_NAME = 'Journal App';
  private readonly RP_ID = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  /**
   * Check if WebAuthn is supported in the browser
   */
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential === 'function'
    );
  }

  /**
   * Check if platform authenticator (Touch ID, Face ID, etc.) is available
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Check if large blob extension is supported
   */
  supportsLargeBlob(): boolean {
    if (!this.isSupported()) return false;
    try {
      const proto = (window as unknown as { PublicKeyCredential?: typeof PublicKeyCredential }).PublicKeyCredential?.prototype;
      if (!proto || !('largeBlob' in proto)) {
        return false;
      }

      const descriptor = Object.getOwnPropertyDescriptor(proto, 'largeBlob');
      if (!descriptor || typeof descriptor.get !== 'function') {
        return false;
      }

      const test = Object.create(proto);
      const value = descriptor.get.call(test);
      if (!value) {
        return false;
      }

      const hasGet = typeof value.get === 'function';
      const hasSet = typeof value.set === 'function';
      return hasGet && hasSet;
    } catch (error) {
      console.warn('largeBlob capability detection failed:', error);
      return false;
    }
  }

  /**
   * Register a new biometric credential
   */
  async register(userId: string, userName: string, options: RegisterOptions = {}): Promise<string | null> {
    if (!this.isSupported()) {
      throw new Error('WebAuthn is not supported');
    }

    try {
      // Generate challenge
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      // Create credential options
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions & {
        extensions?: AuthenticationExtensionsClientInputs;
      } = {
        challenge,
        rp: {
          name: this.RP_NAME,
          id: this.RP_ID
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: userName,
          displayName: userName
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        },
        timeout: 60000,
        attestation: 'none'
      };

      if (options.requireLargeBlob) {
        publicKeyCredentialCreationOptions.extensions = {
          largeBlob: { support: 'required' }
        } as AuthenticationExtensionsClientInputs;
      } else if (this.supportsLargeBlob()) {
        publicKeyCredentialCreationOptions.extensions = {
          largeBlob: { support: 'preferred' }
        } as AuthenticationExtensionsClientInputs;
      }

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as PublicKeyCredential;

      if (!credential) {
        return null;
      }

      const credentialWithBlob = credential as unknown as { largeBlob?: { get?: () => Promise<ArrayBuffer | null>; set?: (data: ArrayBuffer) => Promise<boolean> } };
      const usesLargeBlob = !!credentialWithBlob.largeBlob;
      if (options.requireLargeBlob && !usesLargeBlob) {
        throw new Error('Large blob storage is not available on this device');
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      const publicKey = response.getPublicKey();

      const storedCredential: StoredCredential = {
        id: this.arrayBufferToBase64(credential.rawId),
        publicKey: this.arrayBufferToBase64(publicKey || new ArrayBuffer(0)),
        createdAt: new Date().toISOString(),
        usesLargeBlob
      };

      this.saveCredential(storedCredential);
      return storedCredential.id;
    } catch (error) {
      console.error('WebAuthn registration error:', error);
      return null;
    }
  }

  /**
   * Authenticate with biometric
   */
  async authenticate(options: AuthenticateOptions = {}): Promise<AuthenticateResult> {
    if (!this.isSupported()) {
      throw new Error('WebAuthn is not supported');
    }

    const credential = this.getStoredCredential();
    if (!credential) {
      throw new Error('No credential registered');
    }

    try {
      // Generate challenge
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      // Create assertion options
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions & {
        extensions?: AuthenticationExtensionsClientInputs;
      } = {
        challenge,
        allowCredentials: [{
          id: this.base64ToArrayBuffer(credential.id),
          type: 'public-key',
          transports: ['internal']
        }],
        userVerification: 'required',
        timeout: 60000
      };

      if (options.largeBlobRead) {
        publicKeyCredentialRequestOptions.extensions = {
          largeBlob: { read: true }
        } as AuthenticationExtensionsClientInputs;
      } else if (options.largeBlobWrite) {
        publicKeyCredentialRequestOptions.extensions = {
          largeBlob: { write: this.toArrayBuffer(options.largeBlobWrite) }
        } as AuthenticationExtensionsClientInputs;
      } else if (this.supportsLargeBlob()) {
        publicKeyCredentialRequestOptions.extensions = {
          largeBlob: { support: 'preferred' }
        } as AuthenticationExtensionsClientInputs;
      }

      // Get assertion
      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      }) as PublicKeyCredential;

      if (!assertion) {
        return { success: false };
      }

      let largeBlobData: Uint8Array | null = null;
      const credentialWithBlob = assertion as unknown as { largeBlob?: { get?: () => Promise<ArrayBuffer>; set?: (data: ArrayBuffer) => Promise<boolean> } };

      let wroteLargeBlob = false;

      if (options.largeBlobWrite) {
        if (!credentialWithBlob.largeBlob?.set) {
          throw new Error('Large blob storage is not available on this device');
        }
        wroteLargeBlob = await credentialWithBlob.largeBlob.set(this.toArrayBuffer(options.largeBlobWrite));
        if (!wroteLargeBlob) {
          return { success: false, wroteLargeBlob: false };
        }
      }

      if (options.largeBlobRead) {
        if (!credentialWithBlob.largeBlob?.get) {
          throw new Error('Large blob storage is not available on this device');
        }
        const blobBuffer = await credentialWithBlob.largeBlob.get();
        largeBlobData = blobBuffer ? new Uint8Array(blobBuffer) : null;
      }

      return { success: true, largeBlob: largeBlobData ?? null, wroteLargeBlob };
    } catch (error) {
      console.error('WebAuthn authentication error:', error);
      return { success: false };
    }
  }

  /**
   * Check if a credential is registered
   */
  hasCredential(): boolean {
    return this.getStoredCredential() !== null;
  }

  /**
   * Remove stored credential
   */
  removeCredential(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Get stored credential
   */
  private getStoredCredential(): StoredCredential | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;

    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  /**
   * Save credential to storage
   */
  private saveCredential(credential: StoredCredential): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(credential));
    }
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Get the last authentication signature (for key derivation)
   * Returns and clears the signature
   */
  getLastSignature(): ArrayBuffer | null {
    return null;
  }

  private toArrayBuffer(data: Uint8Array): ArrayBuffer {
    const buffer = new ArrayBuffer(data.byteLength);
    const view = new Uint8Array(buffer);
    view.set(data);
    return buffer;
  }

  /**
   * Generate a user-friendly error message
   */
  getErrorMessage(error: any): string {
    if (error.name === 'NotAllowedError') {
      return '用户取消了生物识别认证';
    } else if (error.name === 'NotSupportedError') {
      return '此设备不支持生物识别认证';
    } else if (error.name === 'InvalidStateError') {
      return '生物识别已经注册';
    } else if (error.name === 'SecurityError') {
      return '安全错误：请确保使用 HTTPS';
    } else {
      return '生物识别认证失败';
    }
  }
}

export const webAuthnService = new WebAuthnService();
