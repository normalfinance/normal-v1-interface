// ---------------------------------------------------------------------------
// Phone-side passkey enrolment via email OTP — the PURE decisions.
//
// Context (2026-09-14): a wallet used to have exactly one passkey and no way to
// add another, so a passkey created in Chrome on Windows could never reach the
// user's phone. Justin approved Turnkey's email-OTP flow to enrol a new
// device. That is a custody change — "inbox + Normal login" can now add a
// passkey — so the guardrails live here, free of I/O, where they are unit
// tested rather than trusted.
//
// Flow the routes implement (api/turnkey/enroll/*):
//   init    — server asks Turnkey to email a code to the ACCOUNT email
//   verify  — phone returns the code, encrypted to Turnkey's enclave key
//   login   — phone gets a 15-minute session key on its OWN sub-org
//   (phone stamps CREATE_AUTHENTICATORS_V2 directly against Turnkey)
//   complete— server confirms the new authenticator exists and records it
// ---------------------------------------------------------------------------

/** Session the phone gets from OTP_LOGIN; long enough for one passkey ceremony. */
export const ENROLL_SESSION_SECONDS = 900;

/**
 * Ceiling on passkeys per wallet. Bounds the blast radius of a compromised
 * inbox: an attacker can enrol at most this many devices before the wallet
 * refuses, and every one of them is visible in GET /api/turnkey/credentials.
 */
export const MAX_AUTHENTICATORS = 5;

export type EnrollRefusal = 'no_email' | 'email_mismatch' | 'too_many_authenticators';

/** The slice of Turnkey's root user the decision needs. */
export interface RootUserView {
  userId: string;
  userEmail?: string | null;
  authenticatorCount: number;
}

export type EnrollVerdict =
  | { ok: true; userId: string; email: string }
  | { ok: false; error: EnrollRefusal };

/** Case- and whitespace-insensitive; an email is not a byte string to a user. */
export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

/**
 * May this Supabase user enrol a new device on this Turnkey root user?
 *
 * The email the code goes to is the TURNKEY user's email (set from Supabase at
 * wallet creation, lib/turnkey/server.ts). Requiring it to equal the current
 * Supabase email means a changed login email cannot be used to pull a code to
 * an address the wallet never knew about.
 */
export function enrollmentVerdict(
  supabaseEmail: string | null | undefined,
  root: RootUserView
): EnrollVerdict {
  const sup = normalizeEmail(supabaseEmail);
  const tk = normalizeEmail(root.userEmail);
  if (!sup || !tk) return { ok: false, error: 'no_email' };
  if (sup !== tk) return { ok: false, error: 'email_mismatch' };
  if (root.authenticatorCount >= MAX_AUTHENTICATORS) {
    return { ok: false, error: 'too_many_authenticators' };
  }
  return { ok: true, userId: root.userId, email: tk };
}

/** Turnkey OTP ids are UUIDs. */
export function isOtpId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

/**
 * The phone's session public key: compressed P-256, 33 bytes, hex — the form
 * @turnkey/crypto's generateP256KeyPair returns and OTP_LOGIN expects.
 */
export function isCompressedP256PublicKey(value: unknown): value is string {
  return typeof value === 'string' && /^0[23][0-9a-f]{64}$/i.test(value);
}

export function isNonEmptyString(value: unknown, max = 8192): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

/** The only scheme OTP_LOGIN_V2 accepts (Turnkey's v1ClientSignatureScheme). */
export const CLIENT_SIGNATURE_SCHEME = 'CLIENT_SIGNATURE_SCHEME_API_P256' as const;

/** Shape OTP_LOGIN_V2 requires; the server passes it through, never builds it. */
export interface ClientSignatureInput {
  publicKey: string;
  scheme: typeof CLIENT_SIGNATURE_SCHEME;
  message: string;
  signature: string;
}

export function isClientSignature(value: unknown): value is ClientSignatureInput {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    isNonEmptyString(v.publicKey, 200) &&
    v.scheme === CLIENT_SIGNATURE_SCHEME &&
    isNonEmptyString(v.message, 4096) &&
    isNonEmptyString(v.signature, 1024)
  );
}
