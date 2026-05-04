'use client';

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT_LENGTH = 32;

export interface AESEncryptedData {
  ciphertext: string;
  iv: string;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .match(/.{1,64}/g)!
    .join('\n');
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function encryptWithAES(plaintext: string, key: CryptoKey): Promise<AESEncryptedData> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const dataBuffer = new TextEncoder().encode(plaintext);

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv),
    },
    key,
    new Uint8Array(dataBuffer)
  );

  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

async function decryptWithAES(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  const ivBuffer = base64ToArrayBuffer(iv);
  const encryptedBuffer = base64ToArrayBuffer(ciphertext);

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer,
    },
    key,
    encryptedBuffer
  );

  return new TextDecoder().decode(decrypted);
}

export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  const passwordBuffer = new TextEncoder().encode(password);
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    new Uint8Array(passwordBuffer),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: KEY_LENGTH * 8,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

// ---------------------------------------------------------------------------
// IndexedDB-backed non-extractable AES key for legacy v1 localStorage decryption
// ---------------------------------------------------------------------------

const IDB_DB_NAME = 'normal-wallet-keys';
const IDB_STORE_NAME = 'keys';
const IDB_KEY_ID = 'local-storage-encryption-key';

function openKeyStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(IDB_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<CryptoKey | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, 'readonly');
    const req = tx.objectStore(IDB_STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result as CryptoKey | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: CryptoKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
    const req = tx.objectStore(IDB_STORE_NAME).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get or create a non-extractable AES-GCM key stored in IndexedDB.
 * Because the key is non-extractable, JS cannot read the raw key material —
 * it can only be used via subtle.encrypt / subtle.decrypt.
 */
async function getOrCreateLocalEncryptionKey(): Promise<CryptoKey> {
  const db = await openKeyStore();
  try {
    const existing = await idbGet(db, IDB_KEY_ID);
    if (existing) return existing;

    const key = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // non-extractable
      ['encrypt', 'decrypt']
    );
    await idbPut(db, IDB_KEY_ID, key);
    return key;
  } finally {
    db.close();
  }
}

export interface LocalEncryptedData {
  ct: string; // base64 ciphertext
  iv: string; // base64 IV
}

/**
 * @deprecated Use encryptPrivateKeyWithPassword instead. Kept for v1 migration only.
 */
export async function encryptForLocalStorage(plaintext: string): Promise<string> {
  const key = await getOrCreateLocalEncryptionKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    new Uint8Array(encoded)
  );

  const data: LocalEncryptedData = {
    ct: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer),
  };
  return JSON.stringify(data);
}

/**
 * @deprecated Use decryptPrivateKeyWithPassword instead. Kept for v1 migration only.
 */
export async function decryptFromLocalStorage(stored: string): Promise<string> {
  const key = await getOrCreateLocalEncryptionKey();
  const data: LocalEncryptedData = JSON.parse(stored);
  const iv = base64ToArrayBuffer(data.iv);
  const ciphertext = base64ToArrayBuffer(data.ct);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Check whether a stored value is legacy base64 (not encrypted).
 */
export function isLegacyBase64(stored: string): boolean {
  try {
    const parsed = JSON.parse(stored);
    return !(parsed && typeof parsed.ct === 'string' && typeof parsed.iv === 'string');
  } catch {
    // Not JSON → legacy base64
    return true;
  }
}

// ---------------------------------------------------------------------------
// v2: Password-derived key encryption (current standard)
// ---------------------------------------------------------------------------

export interface PasswordEncryptedData {
  version: 2;
  ct: string; // base64 ciphertext
  iv: string; // base64 IV
  salt: string; // base64 salt
}

/**
 * Check whether a stored value is v2 password-encrypted format.
 */
export function isPasswordEncrypted(stored: string): boolean {
  try {
    const parsed = JSON.parse(stored);
    return (
      parsed &&
      parsed.version === 2 &&
      typeof parsed.ct === 'string' &&
      typeof parsed.iv === 'string' &&
      typeof parsed.salt === 'string'
    );
  } catch {
    return false;
  }
}

/**
 * Check whether a stored value is v1 IndexedDB-encrypted format (ct/iv but no version).
 */
export function isIndexedDBEncrypted(stored: string): boolean {
  try {
    const parsed = JSON.parse(stored);
    return (
      parsed &&
      typeof parsed.ct === 'string' &&
      typeof parsed.iv === 'string' &&
      !('version' in parsed)
    );
  } catch {
    return false;
  }
}

/**
 * Encrypt a private key using a password-derived key (PBKDF2 + AES-GCM).
 * Returns a JSON string in v2 format: { version: 2, ct, iv, salt }
 */
export async function encryptPrivateKeyWithPassword(
  privateKey: string,
  password: string
): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const derivedKey = await deriveKeyFromPassword(password, salt);
  const encrypted = await encryptWithAES(privateKey, derivedKey);

  const data: PasswordEncryptedData = {
    version: 2,
    ct: encrypted.ciphertext,
    iv: encrypted.iv,
    salt: arrayBufferToBase64(salt.buffer),
  };

  return JSON.stringify(data);
}

/**
 * Decrypt a v2 password-encrypted private key.
 * Throws 'Incorrect password' if decryption fails due to wrong password.
 */
export async function decryptPrivateKeyWithPassword(
  stored: string,
  password: string
): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  const data: PasswordEncryptedData = JSON.parse(stored);
  const salt = new Uint8Array(base64ToArrayBuffer(data.salt));
  const derivedKey = await deriveKeyFromPassword(password, salt);

  try {
    return await decryptWithAES(data.ct, data.iv, derivedKey);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'OperationError') {
      throw new Error('Incorrect password');
    }
    throw error;
  }
}
