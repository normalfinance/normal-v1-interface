/**
 * @jest-environment jsdom
 */
// The error mapper is what stands between a user and a raw Turnkey dump
// ("Turnkey error 16: credential ID could not be found in organization or its
// parent organization organizationId=… credentialId=…"), so its mappings are
// pinned here.

import { friendlyTurnkeyError } from './passkey-stamper';

// A stamper built from the LIVE record of Niko's sub-org (2026-08-22): one
// credential, transports hybrid+internal, AAGUID ea9b8d66… = Google Password
// Manager — i.e. a passkey synced to a phone, not held by this laptop.
jest.mock('@turnkey/webauthn-stamper', () => ({
  WebauthnStamper: jest.fn().mockImplementation((cfg) => cfg),
}));
jest.mock('@/utils/http', () => ({ buildAuthHeaders: async () => ({}) }));

function mockCredentials(credentials: unknown) {
  (global as unknown as { fetch: unknown }).fetch = jest.fn().mockResolvedValue({
    json: async () => ({ success: true, credentials }),
  });
}

// "Where do this account's passkeys live" is module state that outlives one
// ceremony by design — so each test gets its OWN module instance instead of
// inheriting whatever the previous test's prompt left behind. (The mapper
// tests below deliberately keep the pristine top-level import.)
type StamperModule = {
  createPasskeyStamper: () => Promise<unknown>;
  friendlyTurnkeyError: (e: unknown) => string;
};

function freshModule(): StamperModule {
  let mod: StamperModule | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('./passkey-stamper') as StamperModule;
  });
  return mod!;
}

describe('createPasskeyStamper', () => {
  it('passes transports through so Chrome offers the phone, not a USB key', async () => {
    mockCredentials([{ id: 'ggx1N8a7euQG4RvBGTFm1g', transports: ['hybrid', 'internal'] }]);
    const cfg = (await freshModule().createPasskeyStamper()) as unknown as {
      allowCredentials: { transports?: string[] }[];
    };
    // Without this the browser guesses, and it guesses "insert a USB security
    // key" — a dead end for a passkey that lives in Google Password Manager.
    expect(cfg.allowCredentials[0].transports).toEqual(['hybrid', 'internal']);
  });

  it('names the phone when a hybrid-only credential cannot be satisfied here', async () => {
    mockCredentials([{ id: 'ggx1N8a7euQG4RvBGTFm1g', transports: ['hybrid'] }]);
    const mod = freshModule();
    await mod.createPasskeyStamper();
    expect(mod.friendlyTurnkeyError(new Error('NotAllowedError'))).toMatch(
      /open this page on that phone/i
    );
  });

  // THE regression guard for this whole feature: restricting the prompt is an
  // enhancement, and if the lookup ever fails or returns nothing the ceremony
  // must fall back to exactly the pre-existing behaviour. Getting this wrong
  // would break signing app-wide, not just for one user.
  it('sends NO allowCredentials when the lookup comes back empty', async () => {
    mockCredentials([]);
    const cfg = (await freshModule().createPasskeyStamper()) as unknown as {
      allowCredentials?: unknown;
      rpId: string;
    };
    expect(cfg.allowCredentials).toBeUndefined();
    expect(cfg.rpId).toBeTruthy();
  });

  it('falls back to unrestricted when the credentials request throws', async () => {
    (global as unknown as { fetch: unknown }).fetch = jest.fn().mockRejectedValue(new Error('500'));
    const cfg = (await freshModule().createPasskeyStamper()) as unknown as {
      allowCredentials?: unknown;
    };
    expect(cfg.allowCredentials).toBeUndefined();
  });

  it('omits transports when none were recorded, rather than inventing them', async () => {
    mockCredentials([{ id: 'abc', transports: [] }]);
    const mod = freshModule();
    const cfg = (await mod.createPasskeyStamper()) as unknown as {
      allowCredentials: { transports?: string[] }[];
    };
    expect(cfg.allowCredentials[0].transports).toBeUndefined();
    // …and a device-bound credential must NOT be described as being on a phone.
    expect(mod.friendlyTurnkeyError(new Error('NotAllowedError'))).toMatch(
      /does not have the passkey/i
    );
  });
});

describe('friendlyTurnkeyError', () => {
  it('explains the wrong-passkey case in the words a user can act on', () => {
    const raw =
      'Turnkey error 16: credential ID could not be found in organization or its parent organization organizationId=2277cefa credentialId=IkCCdl9 (Details: [{"turnkeyErrorCode":"CREDENTIAL_NOT_FOUND"}])';
    const msg = friendlyTurnkeyError(new Error(raw));
    expect(msg).toMatch(/different account/i);
    expect(msg).not.toMatch(/organizationId|credentialId|Turnkey error/);
  });

  it('covers a dismissed or timed-out prompt', () => {
    expect(friendlyTurnkeyError(new Error('NotAllowedError: operation not allowed'))).toMatch(
      /dismissed or timed out/i
    );
  });

  it('covers an unsupported device and a domain mismatch', () => {
    expect(friendlyTurnkeyError(new Error('NotSupportedError'))).toMatch(/cannot use passkeys/i);
    expect(friendlyTurnkeyError(new Error('SecurityError: bad rpId'))).toMatch(/domain mismatch/i);
  });

  it('passes an unknown error through unchanged — never hide it from support', () => {
    expect(friendlyTurnkeyError(new Error('something entirely new'))).toBe(
      'something entirely new'
    );
  });
});
