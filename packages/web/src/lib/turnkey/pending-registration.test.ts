/**
 * @jest-environment jsdom
 */
// These rules decide whether a failed signup costs the user an ORPHANED
// passkey — one their device will offer forever and no account can use.

import {
  readPendingRegistration,
  writePendingRegistration,
  clearPendingRegistration,
  shouldKeepPendingRegistration,
} from './pending-registration';

const UID = 'user-1';
const reg = { supabaseUserId: UID, challenge: 'c', attestation: { credentialId: 'abc' } };

describe('pending passkey registration', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('hands the same attestation back so a retry reuses the passkey', () => {
    writePendingRegistration(reg);
    expect(readPendingRegistration(UID)?.attestation).toEqual(reg.attestation);
  });

  it('never hands one user another user’s passkey on a shared browser', () => {
    writePendingRegistration(reg);
    expect(readPendingRegistration('someone-else')).toBeNull();
  });

  it('drops a stale registration rather than pinning the user to it', () => {
    window.sessionStorage.setItem(
      'nf:pending-passkey-registration:v1',
      JSON.stringify({ ...reg, at: Date.now() - 25 * 60 * 60 * 1000 })
    );
    expect(readPendingRegistration(UID)).toBeNull();
  });

  it('forgets it once the wallet exists', () => {
    writePendingRegistration(reg);
    clearPendingRegistration();
    expect(readPendingRegistration(UID)).toBeNull();
  });

  it('keeps it for transient failures, discards it for a rejected attestation', () => {
    // A 500 or a dropped connection says nothing about the credential…
    expect(shouldKeepPendingRegistration(500)).toBe(true);
    expect(shouldKeepPendingRegistration(429)).toBe(true);
    expect(shouldKeepPendingRegistration(401)).toBe(true);
    // …but a rejected attestation never becomes valid, and reusing it would
    // trap the user in a loop no retry can leave.
    expect(shouldKeepPendingRegistration(400)).toBe(false);
    expect(shouldKeepPendingRegistration(422)).toBe(false);
  });

  it('survives storage being unavailable (private mode)', () => {
    const orig = window.sessionStorage.getItem;
    window.sessionStorage.getItem = () => {
      throw new Error('denied');
    };
    expect(readPendingRegistration(UID)).toBeNull();
    window.sessionStorage.getItem = orig;
  });
});
