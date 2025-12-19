'use client';

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT_LENGTH = 32;
const RSA_KEY_SIZE = 2048;

export interface RSAKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface AESEncryptedData {
  ciphertext: string;
  iv: string;
}

export async function generateRSAKeyPair(): Promise<RSAKeyPair> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: RSA_KEY_SIZE,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  const publicKeyPem = await exportPublicKey(keyPair.publicKey);
  const privateKeyPem = await exportPrivateKey(keyPair.privateKey);

  return {
    publicKey: publicKeyPem,
    privateKey: privateKeyPem,
  };
}

async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('spki', key);
  const exportedAsBase64 = arrayBufferToBase64(exported);
  return `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
}

async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('pkcs8', key);
  const exportedAsBase64 = arrayBufferToBase64(exported);
  return `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .match(/.{1,64}/g)!
    .join('\n');
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function importPublicKey(pem: string): Promise<CryptoKey> {
  const pemHeader = '-----BEGIN PUBLIC KEY-----';
  const pemFooter = '-----END PUBLIC KEY-----';
  const pemContents = pem.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
  const binaryDer = base64ToArrayBuffer(pemContents);

  return window.crypto.subtle.importKey(
    'spki',
    binaryDer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['encrypt']
  );
}

export async function encryptWithRSAPublicKey(data: string, publicKeyPem: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  const publicKey = await importPublicKey(publicKeyPem);
  const dataBuffer = new TextEncoder().encode(data);

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
    },
    publicKey,
    new Uint8Array(dataBuffer)
  );

  return arrayBufferToBase64(encrypted);
}

export async function generateAESKey(): Promise<CryptoKey> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  return window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function encryptWithAES(plaintext: string, key: CryptoKey): Promise<AESEncryptedData> {
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

  const ivBase64 = arrayBufferToBase64(iv.buffer);
  const encryptedBase64 = arrayBufferToBase64(encrypted);

  return {
    ciphertext: encryptedBase64,
    iv: ivBase64,
  };
}

export async function decryptWithAES(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
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

export async function encryptPrivateKeyForStorage(
  privateKey: string,
  userId: string,
  clientSecret: string
): Promise<{ encryptedPrivateKey: string; iv: string; salt: string }> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const derivedKey = await deriveKeyFromPassword(`${clientSecret}:${userId}`, salt);

  const encrypted = await encryptWithAES(privateKey, derivedKey);

  return {
    encryptedPrivateKey: encrypted.ciphertext,
    iv: encrypted.iv,
    salt: arrayBufferToBase64(salt.buffer),
  };
}

export async function exportAESKeyAsBase64(key: CryptoKey): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  const exported = await window.crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

export async function importAESKeyFromBase64(keyBase64: string): Promise<CryptoKey> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  const keyBuffer = base64ToArrayBuffer(keyBase64);

  return window.crypto.subtle.importKey(
    'raw',
    keyBuffer,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}
