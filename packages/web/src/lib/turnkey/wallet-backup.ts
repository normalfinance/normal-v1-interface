// Recovery-phrase backup state (doc 79 D2 — mandatory at creation).
//
// The marker is DEVICE-LOCAL by design: backup status is a UX nudge, never a
// server gate on the user's own funds (a user must never be locked out of
// their money because a flag didn't sync). Set the moment a NEW Turnkey
// wallet (new seed) is created; cleared when the user confirms they saved
// the phrase. A legacy wallet created before this feature never gets the
// "needs" marker, so existing users are guided via Settings, not force-gated.

const NEEDS_KEY = 'nf:wallet-needs-backup:v1';
const DONE_PREFIX = 'nf:wallet-backed-up:v1:';

/** Call right after a NEW wallet (new seed) is created — NOT when a chain is
 *  added to an existing seed (that seed is already backed up). Stores the
 *  sub-org id so the gate can key the "done" marker to this exact wallet. */
export const BACKUP_REQUIRED_EVENT = 'nf:wallet-backup-required';

export function markWalletNeedsBackup(subOrgId: string): void {
  try {
    // Only if this wallet hasn't already been confirmed backed up somewhere.
    if (localStorage.getItem(DONE_PREFIX + subOrgId)) return;
    localStorage.setItem(NEEDS_KEY, subOrgId);
    // Wake the global gate NOW — creation happens mid-flow (mid-swap), so the
    // backup step must appear without waiting for a navigation/remount.
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(BACKUP_REQUIRED_EVENT));
  } catch {
    /* storage unavailable → the Settings door still covers backup */
  }
}

/** The sub-org id awaiting a mandatory backup on THIS device, or null. */
export function pendingBackupSubOrg(): string | null {
  try {
    return localStorage.getItem(NEEDS_KEY);
  } catch {
    return null;
  }
}

/** The user confirmed they saved the phrase — clear the prompt for good. */
export function markWalletBackedUp(subOrgId: string): void {
  try {
    localStorage.setItem(DONE_PREFIX + subOrgId, String(Date.now()));
    if (localStorage.getItem(NEEDS_KEY) === subOrgId) localStorage.removeItem(NEEDS_KEY);
  } catch {
    /* nothing to do */
  }
}
