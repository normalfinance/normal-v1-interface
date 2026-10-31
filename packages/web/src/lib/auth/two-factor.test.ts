import { it, expect, describe } from '@jest/globals';

import {
  assuranceLevel,
  hasVerifiedFactor,
  needsSecondFactor,
  twoFactorErrorMessage,
} from './two-factor';

const token = (claims: object) => {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode(claims)}.signature`;
};

const verified = { factors: [{ status: 'verified' }] };
const unverified = { factors: [{ status: 'unverified' }] };

describe('assuranceLevel', () => {
  it('reads the level from the token', () => {
    expect(assuranceLevel(token({ aal: 'aal1' }))).toBe('aal1');
    expect(assuranceLevel(token({ aal: 'aal2' }))).toBe('aal2');
  });

  it('survives names outside ASCII in the token', () => {
    const claims = { aal: 'aal2', user_metadata: { full_name: 'Žiga Šuštar 李' } };
    expect(assuranceLevel(token(claims))).toBe('aal2');
  });

  it('treats a missing claim or a malformed token as no level', () => {
    expect(assuranceLevel(token({}))).toBeNull();
    expect(assuranceLevel(token({ aal: 2 }))).toBeNull();
    expect(assuranceLevel('not-a-token')).toBeNull();
    expect(assuranceLevel('a.%%%.c')).toBeNull();
    expect(assuranceLevel(undefined)).toBeNull();
  });
});

describe('hasVerifiedFactor', () => {
  it('counts only finished setups', () => {
    expect(hasVerifiedFactor(verified)).toBe(true);
    // Someone who scanned the QR code and closed the tab doesn't have 2FA yet.
    expect(hasVerifiedFactor(unverified)).toBe(false);
    expect(hasVerifiedFactor({ factors: [] })).toBe(false);
    expect(hasVerifiedFactor({})).toBe(false);
    expect(hasVerifiedFactor(null)).toBe(false);
  });
});

describe('needsSecondFactor', () => {
  it('asks for the code when the account has 2FA and the login has not proved it', () => {
    expect(needsSecondFactor(verified, token({ aal: 'aal1' }))).toBe(true);
  });

  it('fails closed: an unreadable level is not a finished login', () => {
    expect(needsSecondFactor(verified, token({}))).toBe(true);
    expect(needsSecondFactor(verified, 'garbage')).toBe(true);
    expect(needsSecondFactor(verified, undefined)).toBe(true);
  });

  it('lets a finished login through', () => {
    expect(needsSecondFactor(verified, token({ aal: 'aal2' }))).toBe(false);
  });

  it('never asks accounts without 2FA, so existing users are unaffected', () => {
    expect(needsSecondFactor({}, token({ aal: 'aal1' }))).toBe(false);
    expect(needsSecondFactor(unverified, token({ aal: 'aal1' }))).toBe(false);
  });
});

describe('twoFactorErrorMessage', () => {
  it('tells people what to do next', () => {
    expect(twoFactorErrorMessage({ code: 'mfa_verification_failed' })).toMatch(/isn't right/);
    expect(twoFactorErrorMessage({ code: 'mfa_challenge_expired' })).toMatch(/expired/);
    expect(twoFactorErrorMessage({ status: 429 })).toMatch(/Too many/);
  });

  it('has a safe fallback', () => {
    expect(twoFactorErrorMessage(new Error('boom'))).toBe(
      'Something went wrong. Please try again.'
    );
    expect(twoFactorErrorMessage(null)).toBe('Something went wrong. Please try again.');
  });
});
