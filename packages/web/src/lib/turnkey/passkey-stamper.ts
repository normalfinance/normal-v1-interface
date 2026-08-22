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

const CACHE_TTL_MS = 60_000;
let cached: { ids: string[]; at: number } | null = null;

/** base64url → the ArrayBuffer WebAuthn wants for allowCredentials. */
function toBuffer(base64url: string): ArrayBuffer {
  const b64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
  const raw = atob(b64 + pad);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

async function fetchCredentialIds(): Promise<string[]> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.ids;
  try {
    const { buildAuthHeaders } = await import('@/utils/http');
    const res = await fetch('/api/turnkey/credentials', {
      headers: await buildAuthHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    const ids: string[] = Array.isArray(data?.credentialIds) ? data.credentialIds : [];
    cached = { ids, at: Date.now() };
    return ids;
  } catch {
    // No restriction — the prompt behaves exactly as it did before.
    return [];
  }
}

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
  const rpId =
    typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_TURNKEY_RP_ID ?? window.location.hostname)
      : 'localhost';
  const { WebauthnStamper } = await import('@turnkey/webauthn-stamper');
  const ids = await fetchCredentialIds();
  return new WebauthnStamper({
    rpId,
    ...(ids.length
      ? {
          allowCredentials: ids.map((id) => ({
            id: toBuffer(id),
            type: 'public-key' as const,
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
