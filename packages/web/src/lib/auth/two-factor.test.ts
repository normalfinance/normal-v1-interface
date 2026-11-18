import { it, expect, describe } from '@jest/globals';
import { friendlyAppError } from '@/utils/errors/error-classifier';

import {
  assuranceLevel,
  needsActionCode,
  secondsSinceCode,
  hasVerifiedFactor,
  needsSecondFactor,
  twoFactorErrorMessage,
  ACTION_CODE_EXPIRED_MESSAGE,
  ACTION_CODE_MAX_AGE_SECONDS,
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

describe('secondsSinceCode', () => {
  const now = 1_800_000_000_000;
  const at = (secondsAgo: number) => now / 1000 - secondsAgo;

  it('measures from the most recent code', () => {
    const amr = [
      { method: 'password', timestamp: at(5) },
      { method: 'totp', timestamp: at(400) },
      { method: 'totp', timestamp: at(90) },
    ];
    expect(secondsSinceCode(token({ amr }), now)).toBe(90);
  });

  it('accepts both names Supabase uses for an authenticator code', () => {
    expect(secondsSinceCode(token({ amr: [{ method: 'totp', timestamp: at(10) }] }), now)).toBe(10);
    expect(secondsSinceCode(token({ amr: [{ method: 'mfa/totp', timestamp: at(10) }] }), now)).toBe(
      10
    );
  });

  it('never counts another sign-in method as a code', () => {
    const amr = [
      { method: 'password', timestamp: at(1) },
      { method: 'otp', timestamp: at(1) },
    ];
    expect(secondsSinceCode(token({ amr }), now)).toBeNull();
  });

  it('treats a missing or malformed claim as no code', () => {
    expect(secondsSinceCode(token({}), now)).toBeNull();
    expect(secondsSinceCode(token({ amr: ['totp'] }), now)).toBeNull();
    expect(secondsSinceCode(token({ amr: [{ method: 'totp' }] }), now)).toBeNull();
    expect(secondsSinceCode('not-a-token', now)).toBeNull();
    expect(secondsSinceCode(undefined, now)).toBeNull();
  });
});

describe('needsActionCode', () => {
  const seconds = (ago: number) => Math.floor(Date.now() / 1000) - ago;
  const withCode = (ago: number) => token({ amr: [{ method: 'totp', timestamp: seconds(ago) }] });

  it('never touches an account without 2FA', () => {
    expect(needsActionCode({}, token({}))).toBe(false);
    expect(needsActionCode(unverified, token({}))).toBe(false);
  });

  it('accepts a code inside the window', () => {
    expect(needsActionCode(verified, withCode(ACTION_CODE_MAX_AGE_SECONDS - 10))).toBe(false);
  });

  it('refuses a code outside the window', () => {
    expect(needsActionCode(verified, withCode(ACTION_CODE_MAX_AGE_SECONDS + 10))).toBe(true);
  });

  it('refuses when the token shows no code at all', () => {
    expect(needsActionCode(verified, token({ aal: 'aal2' }))).toBe(true);
    expect(needsActionCode(verified, undefined)).toBe(true);
  });
});

describe('the expired-code message', () => {
  it('reaches people intact through the shared error formatter', () => {
    expect(friendlyAppError(new Error(ACTION_CODE_EXPIRED_MESSAGE))).toBe(
      ACTION_CODE_EXPIRED_MESSAGE
    );
  });
});
