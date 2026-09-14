import { it, expect, describe } from '@jest/globals';

import {
  isOtpId,
  normalizeEmail,
  isClientSignature,
  enrollmentVerdict,
  MAX_AUTHENTICATORS,
  isCompressedP256PublicKey,
} from './enroll-policy';

const root = (over: Partial<Parameters<typeof enrollmentVerdict>[1]> = {}) => ({
  userId: 'user-1',
  userEmail: 'Niko@Example.com',
  authenticatorCount: 1,
  ...over,
});

describe('enrollmentVerdict', () => {
  it('allows when the Supabase email matches the Turnkey email (case/space-insensitive)', () => {
    expect(enrollmentVerdict('  niko@example.com ', root())).toEqual({
      ok: true,
      userId: 'user-1',
      email: 'niko@example.com',
    });
  });

  it('refuses when either side has no email', () => {
    expect(enrollmentVerdict(null, root())).toEqual({ ok: false, error: 'no_email' });
    expect(enrollmentVerdict('a@b.c', root({ userEmail: undefined }))).toEqual({
      ok: false,
      error: 'no_email',
    });
  });

  it('refuses a changed login email — the code must go to the wallet email', () => {
    expect(enrollmentVerdict('other@example.com', root())).toEqual({
      ok: false,
      error: 'email_mismatch',
    });
  });

  it('caps the number of passkeys per wallet', () => {
    expect(
      enrollmentVerdict('niko@example.com', root({ authenticatorCount: MAX_AUTHENTICATORS }))
    ).toEqual({ ok: false, error: 'too_many_authenticators' });
    expect(
      enrollmentVerdict('niko@example.com', root({ authenticatorCount: MAX_AUTHENTICATORS - 1 })).ok
    ).toBe(true);
  });
});

describe('input shapes', () => {
  it('normalizeEmail trims and lowercases', () => {
    expect(normalizeEmail('  A@B.CO ')).toBe('a@b.co');
    expect(normalizeEmail(undefined)).toBe('');
  });

  it('isOtpId accepts a UUID only', () => {
    expect(isOtpId('3f2b1c0e-9a8d-4c7b-b6a5-1e2d3c4b5a69')).toBe(true);
    expect(isOtpId('not-an-id')).toBe(false);
    expect(isOtpId(42)).toBe(false);
  });

  it('isCompressedP256PublicKey wants 33 bytes hex with a 02/03 prefix', () => {
    const body = 'ab'.repeat(32);
    expect(isCompressedP256PublicKey(`02${body}`)).toBe(true);
    expect(isCompressedP256PublicKey(`03${body}`)).toBe(true);
    expect(isCompressedP256PublicKey(`04${body}`)).toBe(false);
    expect(isCompressedP256PublicKey(`02${body}00`)).toBe(false);
  });

  it('isClientSignature requires all four fields', () => {
    const ok = {
      publicKey: '02aa',
      scheme: 'CLIENT_SIGNATURE_SCHEME_API_P256',
      message: 'm',
      signature: 's',
    };
    expect(isClientSignature(ok)).toBe(true);
    expect(isClientSignature({ ...ok, signature: '' })).toBe(false);
    expect(isClientSignature({ ...ok, scheme: 'SOMETHING_ELSE' })).toBe(false);
    expect(isClientSignature(null)).toBe(false);
  });
});
