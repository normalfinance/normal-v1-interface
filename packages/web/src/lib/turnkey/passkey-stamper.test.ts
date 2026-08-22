/**
 * @jest-environment jsdom
 */
// The error mapper is what stands between a user and a raw Turnkey dump
// ("Turnkey error 16: credential ID could not be found in organization or its
// parent organization organizationId=… credentialId=…"), so its mappings are
// pinned here.

import { friendlyTurnkeyError } from './passkey-stamper';

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
