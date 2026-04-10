import crypto from 'crypto';

const TRANSIT_RSA_PRIVATE_KEY_B64 = process.env.TRANSIT_RSA_PRIVATE_KEY;

if (!TRANSIT_RSA_PRIVATE_KEY_B64) {
  throw new Error(
    'TRANSIT_RSA_PRIVATE_KEY environment variable is required. ' +
      'Set it to a base64-encoded PEM private key in your environment or .env file.'
  );
}

const transitPrivateKeyPem = Buffer.from(TRANSIT_RSA_PRIVATE_KEY_B64, 'base64').toString('utf-8');

/**
 * Derive the public key from the transit RSA private key.
 * Returns the public key in PEM format.
 */
export function getTransitPublicKey(): string {
  const privateKey = crypto.createPrivateKey(transitPrivateKeyPem);
  const publicKey = crypto.createPublicKey(privateKey);
  return publicKey.export({ type: 'spki', format: 'pem' }) as string;
}

/**
 * Decrypt a payload that was encrypted with the transit hybrid encryption scheme:
 * 1. RSA-OAEP decrypt the AES key using the transit private key
 * 2. AES-256-GCM decrypt the data using the decrypted AES key
 *
 * All inputs are base64-encoded strings.
 */
export function decryptTransitPayload(
  encryptedTransitKey: string,
  encryptedData: string,
  iv: string
): string {
  // Step 1: RSA-OAEP decrypt the AES key
  const encryptedKeyBuffer = Buffer.from(encryptedTransitKey.replace(/\s/g, ''), 'base64');
  const aesKeyBuffer = crypto.privateDecrypt(
    {
      key: transitPrivateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    encryptedKeyBuffer
  );

  // Step 2: AES-256-GCM decrypt the data
  const ivBuffer = Buffer.from(iv.replace(/\s/g, ''), 'base64');
  const encryptedBuffer = Buffer.from(encryptedData.replace(/\s/g, ''), 'base64');

  // AES-GCM auth tag is the last 16 bytes of the ciphertext (Web Crypto API appends it)
  const authTagLength = 16;
  const ciphertext = encryptedBuffer.subarray(0, encryptedBuffer.length - authTagLength);
  const authTag = encryptedBuffer.subarray(encryptedBuffer.length - authTagLength);

  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKeyBuffer, ivBuffer);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf-8');
}
