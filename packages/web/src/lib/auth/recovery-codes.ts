import { createHash, randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// Recovery codes for someone who lost their authenticator.
//
// 16 characters from a 32-letter alphabet is 80 random bits, far beyond guessing
// even without the rate limit, which is why a plain SHA-256 is enough to store
// them: a slow password hash protects low-entropy secrets, and these aren't.
// The alphabet skips 0, O, 1 and I so a code copied onto paper survives.
// ---------------------------------------------------------------------------

export const RECOVERY_CODE_COUNT = 10;

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 16;
const GROUP = 4;

function generateCode(): string {
  // 32 divides 256 exactly, so every letter stays equally likely.
  const chars = [...randomBytes(CODE_LENGTH)].map((byte) => ALPHABET[byte % ALPHABET.length]);
  return chars.join('').replace(new RegExp(`(.{${GROUP}})(?=.)`, 'g'), '$1-');
}

export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: count }, generateCode);
}

/** Dashes, spaces and case are how a person types it, not part of the code. */
export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

export function isRecoveryCode(normalized: string): boolean {
  return (
    normalized.length === CODE_LENGTH && [...normalized].every((char) => ALPHABET.includes(char))
  );
}

export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(normalizeRecoveryCode(code)).digest('hex');
}
