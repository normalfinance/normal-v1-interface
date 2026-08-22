'use client';

// A passkey exists on the device the instant navigator.credentials.create()
// resolves — BEFORE our server has heard about it. If the call that creates
// the Turnkey sub-org then fails (500, dropped connection, expired session),
// that passkey belongs to nothing and can never be used. Worse, the obvious
// retry runs the ceremony again and strands a SECOND one; the device ends up
// offering several identical-looking passkeys, none of which work. That is
// exactly how credential IkCCdl9… came to exist (docs/audit/20-findings.md).
//
// So the attestation is parked here the moment it is minted, and a retry
// REUSES it instead of creating another passkey. It holds no secret: the
// private key never leaves the authenticator, and the server re-validates
// everything. Kept per-user, short-lived, and cleared the moment the wallet
// is created.

const KEY = 'nf:pending-passkey-registration:v1';
const TTL_MS = 24 * 60 * 60 * 1000;

export interface PendingRegistration {
  supabaseUserId: string;
  challenge: string;
  attestation: unknown;
  at: number;
}

export function readPendingRegistration(supabaseUserId: string): PendingRegistration | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingRegistration;
    // Another user on the same browser must never adopt this passkey, and a
    // stale one is worse than none — the ceremony can always be re-run.
    if (p.supabaseUserId !== supabaseUserId || Date.now() - p.at > TTL_MS) return null;
    return p.challenge && p.attestation ? p : null;
  } catch {
    return null;
  }
}

export function writePendingRegistration(p: Omit<PendingRegistration, 'at'>): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...p, at: Date.now() }));
  } catch {
    /* storage full / private mode — the retry just costs another passkey */
  }
}

export function clearPendingRegistration(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}

/** Is this failure worth retrying with the SAME passkey?
 *  A rejected attestation never becomes valid, so keeping it would pin the
 *  user to a passkey the server refuses. Everything else (5xx, network,
 *  rate limit, auth) is transient from the credential's point of view. */
export function shouldKeepPendingRegistration(status: number): boolean {
  if (status === 400 || status === 422) return false;
  return true;
}
