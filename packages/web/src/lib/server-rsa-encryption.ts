import crypto from 'crypto';

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT_LENGTH = 32;

const SERVER_SECRET = process.env.MNEMONIC_ENCRYPTION_SECRET || process.env.RSA_PRIVATE_KEY_SECRET;

if (!SERVER_SECRET || SERVER_SECRET.length < 32) {
  throw new Error(
    'MNEMONIC_ENCRYPTION_SECRET or RSA_PRIVATE_KEY_SECRET environment variable is required and must be at least 32 characters. ' +
      'Set it in your environment or .env file.'
  );
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

export interface EncryptedRSAPrivateKeyData {
  encryptedPrivateKey: string;
  iv: string;
  salt: string;
}

export async function encryptRSAPrivateKey(
  privateKey: string,
  userIdentifier: string
): Promise<EncryptedRSAPrivateKeyData> {
  try {
    const data = Buffer.from(privateKey, 'utf-8');
    const salt = generateRandomBytes(SALT_LENGTH);
    const iv = generateRandomBytes(IV_LENGTH);

    const key = await deriveKey(userIdentifier, salt, SERVER_SECRET!);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const encryptedWithTag = Buffer.concat([encrypted, authTag]);

    return {
      encryptedPrivateKey: encryptedWithTag.toString('base64'),
      iv: iv.toString('base64'),
      salt: salt.toString('base64'),
    };
  } catch (error) {
    throw new Error(
      `RSA private key encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function decryptRSAPrivateKey(
  encryptedPrivateKey: string,
  iv: string,
  salt: string,
  userIdentifier: string
): Promise<string> {
  try {
    const encryptedBuffer = Buffer.from(encryptedPrivateKey, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    const saltBuffer = Buffer.from(salt, 'base64');

    const authTagLength = 16;
    const encryptedData = encryptedBuffer.subarray(0, encryptedBuffer.length - authTagLength);
    const authTag = encryptedBuffer.subarray(encryptedBuffer.length - authTagLength);

    const key = await deriveKey(userIdentifier, saltBuffer, SERVER_SECRET!);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

    return decrypted.toString('utf-8');
  } catch (error) {
    throw new Error(
      `RSA private key decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function decryptWithRSAPrivateKey(
  encryptedData: string,
  privateKeyPem: string
): Promise<string> {
  try {
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');

    const decrypted = crypto.privateDecrypt(
      {
        key: privateKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      encryptedBuffer
    );

    return decrypted.toString('utf-8');
  } catch (error) {
    throw new Error(
      `RSA decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function decryptClientEncryptedRSAPrivateKey(
  encryptedPrivateKey: string,
  iv: string,
  salt: string,
  clientSecret: string,
  userId: string
): Promise<string> {
  try {
    const encryptedBuffer = Buffer.from(encryptedPrivateKey, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    const saltBuffer = Buffer.from(salt, 'base64');

    const authTagLength = 16;
    const encryptedData = encryptedBuffer.subarray(0, encryptedBuffer.length - authTagLength);
    const authTag = encryptedBuffer.subarray(encryptedBuffer.length - authTagLength);

    const combinedInput = `${clientSecret}:${userId}`;
    const keyMaterial = Buffer.from(combinedInput, 'utf-8');

    const key = await new Promise<Buffer>((resolve, reject) => {
      crypto.pbkdf2(
        keyMaterial,
        saltBuffer,
        PBKDF2_ITERATIONS,
        KEY_LENGTH,
        'sha256',
        (err, derivedKey) => {
          if (err) {
            reject(new Error(`Key derivation failed: ${err.message}`));
          } else {
            resolve(derivedKey);
          }
        }
      );
    });

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

    return decrypted.toString('utf-8');
  } catch (error) {
    throw new Error(
      `Client RSA private key decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
