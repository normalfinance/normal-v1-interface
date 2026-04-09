import crypto from 'crypto';

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT_LENGTH = 32;

/** Read at call time so `next build` can import this module without the secret in the build environment. */
function getServerSecret(): string {
  const secret = process.env.MNEMONIC_ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'MNEMONIC_ENCRYPTION_SECRET environment variable is required and must be at least 32 characters. ' +
        'Set it in your environment or .env file.'
    );
  }
  return secret;
}

async function deriveKey(
  userIdentifier: string,
  salt: Buffer,
  serverSecret: string
): Promise<Buffer> {
  const combinedInput = `${serverSecret}:${userIdentifier}`;
  const keyMaterial = Buffer.from(combinedInput, 'utf-8');

  return new Promise((resolve, reject) => {
    crypto.pbkdf2(keyMaterial, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256', (err, derivedKey) => {
      if (err) {
        reject(new Error(`Key derivation failed: ${err.message}`));
      } else {
        resolve(derivedKey);
      }
    });
  });
}

function generateRandomBytes(length: number): Buffer {
  return crypto.randomBytes(length);
}

export interface EncryptedMnemonicData {
  encryptedMnemonic: string;
  iv: string;
  salt: string;
}

export type MnemonicDecryptStrategy = 'v2_supabaseUid' | 'v1_currentEmail' | 'v1_consentEmail';

function getV2Identifier(supabaseUid: string): string {
  return `v2:${supabaseUid}`;
}

export async function encryptMnemonicServer(
  mnemonic: string,
  userIdentifier: string
): Promise<EncryptedMnemonicData> {
  try {
    const data = Buffer.from(mnemonic, 'utf-8');
    const salt = generateRandomBytes(SALT_LENGTH);
    const iv = generateRandomBytes(IV_LENGTH);

    const key = await deriveKey(userIdentifier, salt, getServerSecret());

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const encryptedWithTag = Buffer.concat([encrypted, authTag]);

    return {
      encryptedMnemonic: encryptedWithTag.toString('base64'),
      iv: iv.toString('base64'),
      salt: salt.toString('base64'),
    };
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function encryptMnemonicServerV2(
  mnemonic: string,
  supabaseUid: string
): Promise<EncryptedMnemonicData> {
  return encryptMnemonicServer(mnemonic, getV2Identifier(supabaseUid));
}

export async function decryptMnemonicServer(
  encryptedMnemonic: string,
  iv: string,
  salt: string,
  userIdentifier: string
): Promise<string> {
  try {
    const encryptedBuffer = Buffer.from(encryptedMnemonic, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    const saltBuffer = Buffer.from(salt, 'base64');

    const authTagLength = 16;
    const encryptedData = encryptedBuffer.subarray(0, encryptedBuffer.length - authTagLength);
    const authTag = encryptedBuffer.subarray(encryptedBuffer.length - authTagLength);

    const key = await deriveKey(userIdentifier, saltBuffer, getServerSecret());

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

    return decrypted.toString('utf-8');
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function decryptMnemonicServerV2(
  encryptedMnemonic: string,
  iv: string,
  salt: string,
  supabaseUid: string
): Promise<string> {
  return decryptMnemonicServer(encryptedMnemonic, iv, salt, getV2Identifier(supabaseUid));
}

export async function decryptMnemonicWithFallback(
  encrypted: EncryptedMnemonicData,
  params: {
    supabaseUid: string;
    currentEmail?: string | null;
    consentEmail?: string | null;
  }
): Promise<{ mnemonic: string; strategy: MnemonicDecryptStrategy }> {
  const errors: string[] = [];

  try {
    const mnemonic = await decryptMnemonicServerV2(
      encrypted.encryptedMnemonic,
      encrypted.iv,
      encrypted.salt,
      params.supabaseUid
    );
    return { mnemonic, strategy: 'v2_supabaseUid' };
  } catch (e) {
    errors.push(e instanceof Error ? e.message : 'v2 decrypt failed');
  }

  if (params.currentEmail) {
    try {
      const mnemonic = await decryptMnemonicServer(
        encrypted.encryptedMnemonic,
        encrypted.iv,
        encrypted.salt,
        `${params.supabaseUid}:${params.currentEmail}`
      );
      return { mnemonic, strategy: 'v1_currentEmail' };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'v1 currentEmail decrypt failed');
    }
  }

  if (params.consentEmail) {
    try {
      const mnemonic = await decryptMnemonicServer(
        encrypted.encryptedMnemonic,
        encrypted.iv,
        encrypted.salt,
        `${params.supabaseUid}:${params.consentEmail}`
      );
      return { mnemonic, strategy: 'v1_consentEmail' };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'v1 consentEmail decrypt failed');
    }
  }

  throw new Error(`Decryption failed (${errors.length} attempts): ${errors.join(' | ')}`);
}
