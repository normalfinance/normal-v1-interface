import { Keypair, Networks, Transaction } from '@stellar/stellar-sdk';
import {
  mnemonicToSeedSync as scureMnemonicToSeedSync,
  validateMnemonic as validateMnemonicScure,
  generateMnemonic as generateMnemonicScure,
} from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { hmac } from '@noble/hashes/hmac';
import { sha512 } from '@noble/hashes/sha2';
import { utf8ToBytes } from '@noble/hashes/utils';

export interface MnemonicVerificationWord {
  index: number;
  word: string;
}

export type MnemonicStrength = 128 | 160 | 192 | 224 | 256;

export const DEFAULT_MNEMONIC_STRENGTH: MnemonicStrength = 128;

const ED25519_CURVE = 'ed25519 seed';
const HARDENED_OFFSET = 0x80000000;
const STELLAR_BASE_PATH = [44, 148];

/**
 * Generate a secure random mnemonic phrase
 */
export const generateMnemonic = (
  strength: MnemonicStrength = DEFAULT_MNEMONIC_STRENGTH
): string => {
  return generateMnemonicScure(wordlist, strength);
};

/**
 * Validate a mnemonic phrase
 */
export const validateMnemonic = (mnemonic: string): boolean => {
  return validateMnemonicScure(mnemonic.trim(), wordlist);
};

/**
 * Convert mnemonic to seed synchronously
 */
export const mnemonicToSeedSync = (mnemonic: string, passphrase: string = ''): Uint8Array => {
  const seed = scureMnemonicToSeedSync(mnemonic.trim(), passphrase);
  return seed instanceof Uint8Array ? seed : new Uint8Array(seed);
};

/**
 * Get master key from seed
 */
const getMasterKeyFromSeed = (seed: Uint8Array) => {
  const digest = hmac(sha512, utf8ToBytes(ED25519_CURVE), seed);
  return {
    key: digest.slice(0, 32),
    chainCode: digest.slice(32),
  };
};

/**
 * Derive hardened child key
 */
const deriveHardenedChild = (key: Uint8Array, chainCode: Uint8Array, index: number) => {
  const indexBuffer = new Uint8Array(4);
  new DataView(indexBuffer.buffer).setUint32(0, index + HARDENED_OFFSET);

  const data = new Uint8Array(1 + key.length + indexBuffer.length);
  data.set([0]);
  data.set(key, 1);
  data.set(indexBuffer, 1 + key.length);

  const digest = hmac(sha512, chainCode, data);
  return {
    key: digest.slice(0, 32),
    chainCode: digest.slice(32),
  };
};

/**
 * Derive Stellar account raw seed from mnemonic seed
 */
const deriveStellarAccountRawSeed = (seed: Uint8Array, accountIndex: number = 0): Uint8Array => {
  if (!Number.isInteger(accountIndex) || accountIndex < 0) {
    throw new Error('Account index must be a non-negative integer');
  }

  let { key, chainCode } = getMasterKeyFromSeed(seed);

  for (const segment of [...STELLAR_BASE_PATH, accountIndex]) {
    ({ key, chainCode } = deriveHardenedChild(key, chainCode, segment));
  }

  return key;
};

/**
 * Normalize mnemonic phrase (trim, lowercase, normalize spaces)
 */
export const normalizeMnemonic = (input: string): string => {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
};

/**
 * Split mnemonic into words
 */
export const splitMnemonicToWords = (mnemonic: string): string[] => {
  return mnemonic.trim().split(/\s+/);
};

/**
 * Format mnemonic for display with indices
 */
export const formatMnemonicForDisplay = (mnemonic: string): { word: string; index: number }[] => {
  const words = splitMnemonicToWords(mnemonic);
  return words.map((word, index) => ({
    word,
    index: index + 1,
  }));
};

/**
 * Check if mnemonic is complete (12 or 24 words)
 */
export const isMnemonicComplete = (input: string): boolean => {
  const words = splitMnemonicToWords(input);
  return (words.length === 12 || words.length === 24) && words.every((word) => word.length > 0);
};

/**
 * Create Stellar keypair from mnemonic phrase
 */
export const createKeypairFromMnemonic = (
  mnemonic: string,
  passphrase: string = '',
  accountIndex: number = 0
): Keypair => {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }

  const normalized = normalizeMnemonic(mnemonic);
  const seedBuffer = mnemonicToSeedSync(normalized, passphrase);
  const seedBytes = seedBuffer instanceof Uint8Array ? seedBuffer : new Uint8Array(seedBuffer);
  const rawSeed = deriveStellarAccountRawSeed(seedBytes, accountIndex);

  return Keypair.fromRawEd25519Seed(Buffer.from(rawSeed));
};

/**
 * Create keypair from private key (secret seed)
 */
export const createKeypairFromSecret = (privateKey: string): Keypair => {
  return Keypair.fromSecret(privateKey);
};

/**
 * Validate Stellar private key format
 */
export const validatePrivateKey = (privateKey: string): boolean => {
  try {
    Keypair.fromSecret(privateKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate Stellar public key format
 */
export const validatePublicKey = (publicKey: string): boolean => {
  try {
    Keypair.fromPublicKey(publicKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * Generate secure random bytes using Web Crypto API
 */
export const generateSecureRandomBytes = (size: number = 32): Uint8Array => {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.getRandomValues) {
    throw new Error('Secure random number generation not available');
  }
  return window.crypto.getRandomValues(new Uint8Array(size));
};

/**
 * Create keypair from random seed
 */
export const createKeypairFromSeed = (): Keypair => {
  const randomBytes = generateSecureRandomBytes(32);
  return Keypair.fromRawEd25519Seed(Buffer.from(randomBytes));
};

/**
 * Create wallet from mnemonic phrase
 */
export const createWalletFromMnemonic = (
  mnemonic: string,
  passphrase: string = ''
): {
  keypair: Keypair;
  publicKey: string;
  address: string;
  mnemonic: string;
} => {
  try {
    const keypair = createKeypairFromMnemonic(mnemonic, passphrase);

    return {
      keypair,
      publicKey: keypair.publicKey(),
      address: keypair.publicKey(),
      mnemonic,
    };
  } catch (error) {
    throw new Error(`Failed to create wallet from mnemonic: ${error}`);
  }
};

/**
 * Generate wallet with mnemonic phrase
 */
export const generateWalletWithMnemonic = (options?: {
  strength?: MnemonicStrength;
  passphrase?: string;
}): {
  keypair: Keypair;
  publicKey: string;
  address: string;
  mnemonic: string;
} => {
  try {
    const mnemonic = generateMnemonic(options?.strength || DEFAULT_MNEMONIC_STRENGTH);
    return createWalletFromMnemonic(mnemonic, options?.passphrase);
  } catch (error) {
    throw new Error(`Failed to generate wallet with mnemonic: ${error}`);
  }
};

/**
 * Get random verification words from mnemonic
 */
export const getRandomVerificationWords = (
  mnemonic: string,
  count: number = 2
): MnemonicVerificationWord[] => {
  const words = splitMnemonicToWords(mnemonic);
  const indices = new Set<number>();

  // Generate unique random indices
  while (indices.size < count) {
    const randomIndex = Math.floor(Math.random() * words.length);
    indices.add(randomIndex);
  }

  return Array.from(indices)
    .sort((a, b) => a - b)
    .map((index) => ({
      index: index + 1, // 1-indexed for user display
      word: words[index],
    }));
};

/**
 * Verify mnemonic words match
 */
export const verifyMnemonicWords = (
  originalMnemonic: string,
  verificationWords: { index: number; userInput: string }[]
): boolean => {
  const words = splitMnemonicToWords(originalMnemonic);

  return verificationWords.every(({ index, userInput }) => {
    const actualWord = words[index - 1]; // Convert back to 0-indexed
    return actualWord.toLowerCase() === userInput.toLowerCase().trim();
  });
};

/**
 * Sign a Stellar transaction XDR with a keypair
 */
export const signTransactionWithKeypair = (
  transactionXDR: string,
  keypair: Keypair,
  networkPassphrase: string = Networks.TESTNET
): string => {
  const transaction = new Transaction(transactionXDR, networkPassphrase);
  transaction.sign(keypair);
  return transaction.toXDR();
};
