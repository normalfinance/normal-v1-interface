import { verify, generateKeyPairSync } from 'node:crypto';
import { it, expect, describe, afterEach } from '@jest/globals';

import { buildApnsJwt } from './apns';
import { buildGoogleAssertion } from './fcm';
import { pushActive, shouldUnclaim, pushConfigured } from './policy';

// The two provider JWTs are the parts of push delivery that can be wrong in
// a way no runtime error reveals (Apple/Google just answer 403). Prove the
// encoding here with throwaway keys: header/claims shape, base64url, and a
// signature that verifies under the matching scheme.

const b64urlToBuf = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const decode = (part: string) =>
  JSON.parse(b64urlToBuf(part).toString('utf8')) as Record<string, unknown>;

describe('APNs provider token (ES256)', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

  it('has the kid/alg header, iss/iat claims, and a raw r||s signature that verifies', () => {
    const jwt = buildApnsJwt('ABC123DEFG', 'FA938A596N', pem, 1_700_000_000);
    const [h, c, sig] = jwt.split('.');
    expect(decode(h)).toEqual({ alg: 'ES256', kid: 'ABC123DEFG' });
    expect(decode(c)).toEqual({ iss: 'FA938A596N', iat: 1_700_000_000 });
    const rawSig = b64urlToBuf(sig);
    expect(rawSig.length).toBe(64); // r||s, not DER — Apple rejects DER
    const ok = verify(
      'sha256',
      Buffer.from(`${h}.${c}`),
      { key: publicKey, dsaEncoding: 'ieee-p1363' },
      rawSig
    );
    expect(ok).toBe(true);
  });
});

describe('Google service-account assertion (RS256)', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

  it('targets the token endpoint with the messaging scope and a one-hour expiry', () => {
    const jwt = buildGoogleAssertion(
      { client_email: 'svc@proj.iam.gserviceaccount.com', private_key: pem, token_uri: undefined },
      1_700_000_000
    );
    const [h, c, sig] = jwt.split('.');
    expect(decode(h)).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(decode(c)).toEqual({
      iss: 'svc@proj.iam.gserviceaccount.com',
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    });
    expect(verify('sha256', Buffer.from(`${h}.${c}`), publicKey, b64urlToBuf(sig))).toBe(true);
  });
});

describe('sweep guards (send.ts)', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('pushConfigured is false with no provider credentials — shared-DB environments must not claim rows', () => {
    delete process.env.APNS_KEY;
    delete process.env.APNS_KEY_ID;
    delete process.env.APNS_TEAM_ID;
    delete process.env.APNS_BUNDLE_ID_PROD;
    delete process.env.APNS_BUNDLE_ID_DEV;
    delete process.env.FIREBASE_SERVICE_ACCOUNT;
    expect(pushConfigured()).toBe(false);
    process.env.FIREBASE_SERVICE_ACCOUNT = 'e30=';
    expect(pushConfigured()).toBe(true);
    delete process.env.FIREBASE_SERVICE_ACCOUNT;
    process.env.APNS_KEY = 'k';
    process.env.APNS_KEY_ID = 'id';
    process.env.APNS_TEAM_ID = 'team';
    expect(pushConfigured()).toBe(false); // bundle id still missing
    process.env.APNS_BUNDLE_ID_DEV = 'io.normalfinance.app.dev';
    expect(pushConfigured()).toBe(true);
    process.env.PUSH_DISABLED = '1';
    expect(pushActive()).toBe(false);
  });

  it('shouldUnclaim retries transient failures, keeps dead-token and no-device outcomes claimed', () => {
    const base = { attempted: 0, delivered: 0, disabledTokens: 0, skipped: null };
    expect(shouldUnclaim({ ...base, attempted: 2 })).toBe(true); // both transient
    expect(shouldUnclaim({ ...base, attempted: 2, disabledTokens: 1 })).toBe(true); // one dead, one transient
    expect(shouldUnclaim({ ...base, attempted: 2, disabledTokens: 2 })).toBe(false); // all dead
    expect(shouldUnclaim({ ...base, attempted: 2, delivered: 1 })).toBe(false);
    expect(shouldUnclaim({ ...base, skipped: 'no_devices' })).toBe(false);
    expect(shouldUnclaim({ ...base, skipped: 'kill_switch' })).toBe(false);
  });
});
