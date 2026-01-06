export interface EncryptedMnemonicData {
  encryptedMnemonic: string;
  iv: string;
  salt: string;
}

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT_LENGTH = 32;

async function deriveKey(userIdentifier: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(userIdentifier);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoded.buffer as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function generateRandomBytes(length: number): ArrayBuffer {
  const array = crypto.getRandomValues(new Uint8Array(length));
  return array.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptMnemonic(
  mnemonic: string,
  userIdentifier: string
): Promise<EncryptedMnemonicData> {
  const encoder = new TextEncoder();
  const data = encoder.encode(mnemonic);

  const saltBuffer = generateRandomBytes(SALT_LENGTH);
  const ivBuffer = generateRandomBytes(IV_LENGTH);
  const iv = new Uint8Array(ivBuffer);

  const key = await deriveKey(userIdentifier, saltBuffer);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    data.buffer as ArrayBuffer
  );

  return {
    encryptedMnemonic: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(ivBuffer),
    salt: arrayBufferToBase64(saltBuffer),
  };
}

export async function decryptMnemonic(
  data: EncryptedMnemonicData,
  userIdentifier: string
): Promise<string> {
  const encryptedBuffer = base64ToArrayBuffer(data.encryptedMnemonic);
  const ivBuffer = base64ToArrayBuffer(data.iv);
  const iv = new Uint8Array(ivBuffer);
  const saltBuffer = base64ToArrayBuffer(data.salt);

  const key = await deriveKey(userIdentifier, saltBuffer);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encryptedBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
