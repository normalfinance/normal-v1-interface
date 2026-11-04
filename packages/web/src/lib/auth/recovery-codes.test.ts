import { it, expect, describe } from '@jest/globals';

import {
  isRecoveryCode,
  hashRecoveryCode,
  RECOVERY_CODE_COUNT,
  generateRecoveryCodes,
  normalizeRecoveryCode,
} from './recovery-codes';

describe('generateRecoveryCodes', () => {
  it('makes the promised number of readable codes', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(RECOVERY_CODE_COUNT);
    codes.forEach((code) => expect(code).toMatch(/^[2-9A-HJ-NP-Z]{4}(-[2-9A-HJ-NP-Z]{4}){3}$/));
  });

  it('never repeats a code', () => {
    const codes = generateRecoveryCodes(500);
    expect(new Set(codes).size).toBe(500);
  });

  it('never uses the characters people misread', () => {
    const joined = generateRecoveryCodes(200).join('');
    expect(joined).not.toMatch(/[01IO]/);
  });
});

describe('normalizeRecoveryCode', () => {
  it('forgives how people type a code', () => {
    expect(normalizeRecoveryCode(' abcd-efgh 2345 6789 ')).toBe('ABCDEFGH23456789');
  });
});

describe('isRecoveryCode', () => {
  it('accepts a real code once normalized', () => {
    const [code] = generateRecoveryCodes(1);
    expect(isRecoveryCode(normalizeRecoveryCode(code))).toBe(true);
  });

  it('turns away anything else before it reaches the database', () => {
    expect(isRecoveryCode('')).toBe(false);
    expect(isRecoveryCode('SHORT')).toBe(false);
    expect(isRecoveryCode('ABCDEFGH234567890')).toBe(false);
    // Right length, but 0 and O can't appear in a real code.
    expect(isRecoveryCode('ABCDEFGH2345670O')).toBe(false);
  });
});

describe('hashRecoveryCode', () => {
  it('matches however the code was typed', () => {
    const [code] = generateRecoveryCodes(1);
    expect(hashRecoveryCode(code.toLowerCase().replace(/-/g, ' '))).toBe(hashRecoveryCode(code));
  });

  it('never stores the code itself', () => {
    const [code] = generateRecoveryCodes(1);
    const hash = hashRecoveryCode(code);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(normalizeRecoveryCode(code).toLowerCase());
  });

  it('gives different codes different hashes', () => {
    const [a, b] = generateRecoveryCodes(2);
    expect(hashRecoveryCode(a)).not.toBe(hashRecoveryCode(b));
  });
});
