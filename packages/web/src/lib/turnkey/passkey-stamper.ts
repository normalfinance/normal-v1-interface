'use client';

// One place that builds a passkey stamper, and one place that turns Turnkey's
// raw errors into something a person can act on.
//
// The problem this solves (live 2026-08-22): a passkey prompt with no
// `allowCredentials` offers EVERY passkey on the device. Choosing one that
// belongs to a different account fails *after* the biometric with
//   "Turnkey error 16: credential ID could not be found in organization or
//    its parent organization organizationId=… credentialId=…"
// — unreadable, and blamed on the user's finger rather than on the picker.
// Restricting the prompt to this account's credentials makes the mistake
// impossible; the mapper below covers what is left.

// The rpId a passkey is REGISTERED under must be byte-identical to the rpId it
// is later ASKED for — the browser will not return a credential registered
// under a different one. So creation (passkey.ts) and signing both resolve it
// HERE. `||` not `??`: an env var defined-but-blank is the common deploy
// mistake, and `??` would hand WebAuthn an empty rpId instead of falling back.
// The fallback is the current hostname, which is already 'localhost' in dev.
export function resolveRpId(): string {
  const configured = process.env.NEXT_PUBLIC_TURNKEY_RP_ID;
  if (configured) return configured;
  return typeof window !== 'undefined' ? window.location.hostname : 'localhost';
}

const CACHE_TTL_MS = 60_000;

/** A registered passkey: its id, and WHERE it lives (phone, this device, …). */
interface PasskeyCredential {
  id: string;
  /** WebAuthn transports as reported at registration; may be empty. */
  transports: string[];
}

let cached: { creds: PasskeyCredential[]; at: number } | null = null;

/** base64url → the ArrayBuffer WebAuthn wants for allowCredentials. */
function toBuffer(base64url: string): ArrayBuffer {
  const b64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
  const raw = atob(b64 + pad);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

async function fetchCredentials(): Promise<PasskeyCredential[]> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.creds;
  try {
    const { buildAuthHeaders } = await import('@/utils/http');
    const res = await fetch('/api/turnkey/credentials', {
      headers: await buildAuthHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    // Prefer the shape carrying transports; fall back to bare ids so a server
    // that predates the transport field still restricts the prompt.
    const creds: PasskeyCredential[] = Array.isArray(data?.credentials)
      ? data.credentials
          .filter((c: PasskeyCredential) => c?.id)
          .map((c: PasskeyCredential) => ({ id: c.id, transports: c.transports ?? [] }))
      : Array.isArray(data?.credentialIds)
        ? data.credentialIds.map((id: string) => ({ id, transports: [] }))
        : [];
    if (!creds.length) {
      console.warn('[passkey] no credentials returned — prompt NOT restricted to this account');
    }
    cached = { creds, at: Date.now() };
    return creds;
  } catch (e) {
    // Fail-open by design (a lookup must never block signing) — but SAY so.
    // Without this, a 500ing or not-yet-deployed route is indistinguishable
    // from the original bug: same unrestricted prompt, same failure.
    console.warn('[passkey] credential lookup failed — prompt NOT restricted to this account', e);
    return [];
  }
}

// Whether the LAST stamper we built could restrict the prompt. It changes
// what a "not allowed" failure means: unrestricted ⇒ the user dismissed it;
// restricted ⇒ this DEVICE does not hold the account's passkey at all.
let lastPromptWasRestricted = false;
/** Transports of the credentials the last prompt was pinned to. */
let lastTransports: string[] = [];

/** Invalidate after adding/removing a passkey. */
export function invalidatePasskeyCredentials(): void {
  cached = null;
}

/**
 * A WebauthnStamper scoped to THIS account's passkeys where possible.
 * Falls back to an unrestricted stamper when the list can't be fetched, so a
 * lookup failure can never block signing.
 */
export async function createPasskeyStamper() {
  const rpId = resolveRpId();
  const { WebauthnStamper } = await import('@turnkey/webauthn-stamper');
  const creds = await fetchCredentials();
  lastPromptWasRestricted = creds.length > 0;
  lastTransports = creds.flatMap((c) => c.transports);
  return new WebauthnStamper({
    rpId,
    ...(creds.length
      ? {
          // Transports are NOT cosmetic: pinning an id without them makes
          // Chrome guess where the credential lives, and it offers "insert a
          // USB security key" — unusable for a passkey synced in Google
          // Password Manager on the user's phone. With 'hybrid' present the
          // browser offers the phone/QR flow that can actually satisfy it.
          allowCredentials: creds.map((c) => ({
            id: toBuffer(c.id),
            type: 'public-key' as const,
            ...(c.transports.length
              ? { transports: c.transports as AuthenticatorTransport[] }
              : {}),
          })),
        }
      : {}),
  });
}

/**
 * Turnkey's errors are machine text with org/credential ids in them. Map the
 * ones a user can actually do something about; anything unknown keeps its
 * original message so nothing is hidden from support.
 */
export function friendlyTurnkeyError(e: unknown): string {
  const raw = String((e as { message?: string })?.message ?? e ?? '');

  if (/CREDENTIAL_NOT_FOUND|credential ID could not be found/i.test(raw)) {
    return 'That passkey belongs to a different account. Choose the passkey you created for this account — if your device offered several, look for the one named after this app and email.';
  }
  if (/NotAllowedError|operation (was )?not allowed|timed out/i.test(raw)) {
    // With the prompt restricted to this account's credentials, "not allowed"
    // usually means the device simply has none of them — a different message
    // entirely from "you dismissed it" (verified 2026-08-22: a device can
    // hold an ORPHAN passkey from an earlier attempt while the account's real
    // one lives elsewhere).
    if (lastPromptWasRestricted) {
      // A hybrid credential is SAVED ON A PHONE (e.g. Google Password
      // Manager), not in this laptop's fingerprint reader — telling the user
      // to "use the device you set it up on" would send them nowhere.
      return lastTransports.includes('hybrid')
        ? 'Your passkey for this account is saved on your phone. Choose "Use a phone or tablet" in the prompt and scan the QR code with that phone — keep Bluetooth on.'
        : 'This device does not have the passkey for this account — use the device you set the wallet up on, or dismiss and try again if you cancelled the prompt.';
    }
    return 'The passkey prompt was dismissed or timed out. Try again and confirm with your fingerprint, face or device PIN.';
  }
  if (/InvalidStateError|already registered/i.test(raw)) {
    return 'This device already has a passkey for this account — use it to continue instead of creating a new one.';
  }
  if (/NotSupportedError|not supported/i.test(raw)) {
    return 'This browser or device cannot use passkeys. Try another browser, or a device with fingerprint/face unlock.';
  }
  if (/SecurityError|rpId|relying party/i.test(raw)) {
    return 'This site cannot use your passkey here (domain mismatch). If you are on a preview or test URL, use the main app address.';
  }
  if (/rate ?limit|429/i.test(raw)) {
    return 'Too many attempts in a row — wait a moment and try again.';
  }
  return raw;
}
