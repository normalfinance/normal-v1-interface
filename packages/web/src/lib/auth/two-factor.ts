// ---------------------------------------------------------------------------
// Two-factor sign-in: the pure rules, shared by the API gate and the browser.
//
// Supabase stamps each access token with how far the login got: `aal1` after
// the first step (password, Google, email code) and `aal2` after the 6-digit
// code. Whether someone uses 2FA at all comes from their verified factors.
// ---------------------------------------------------------------------------

/** What the API answers when a login still owes its 6-digit code. */
export const MFA_REQUIRED_ERROR = 'mfa_required';

/** The API's machine-readable answer when a money route needs a fresh code. */
export const ACTION_CODE_REQUIRED_ERROR = 'action_code_required';

/** Flows show a route's `error` as-is, and every refused route has sent nothing. */
export const ACTION_CODE_EXPIRED_MESSAGE =
  'Your 6-digit confirmation expired, so nothing was sent. Please try again.';

/**
 * How long the server accepts a code for. The app asks on every press, so this
 * only has to outlast the passkey prompts between the code and the broadcast.
 */
export const ACTION_CODE_MAX_AGE_SECONDS = 5 * 60;

/**
 * A code this fresh also covers the rest of the same press, such as the transfer
 * a swap makes from a connected wallet first. The app wouldn't have a new one yet.
 */
export const ACTION_CODE_REUSE_SECONDS = 30;

/**
 * Hides the way to turn 2FA ON. People who already have it are always asked for
 * their code, so switching this off can never weaken an account.
 */
export const TWO_FACTOR_ENABLED = process.env.NEXT_PUBLIC_TWO_FACTOR_ENABLED === 'true';

type FactorHolder = { factors?: { status: string }[] | null } | null | undefined;

export function hasVerifiedFactor(user: FactorHolder): boolean {
  return (user?.factors ?? []).some((factor) => factor.status === 'verified');
}

/**
 * Read without checking the signature: this must only be used on a token already
 * verified (server) or issued to this browser (client).
 */
function readClaims(accessToken: string | null | undefined): Record<string, unknown> | null {
  const payload = accessToken?.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function assuranceLevel(accessToken: string | null | undefined): string | null {
  const aal = readClaims(accessToken)?.aal;
  return typeof aal === 'string' ? aal : null;
}

/**
 * Seconds since this login last entered its 6-digit code, or null if it never
 * has. Supabase moves the time in the `amr` claim forward on every verify, and
 * refreshing the token keeps it, so an hour-old code can't pass as a new one.
 */
export function secondsSinceCode(
  accessToken: string | null | undefined,
  now = Date.now()
): number | null {
  const amr = readClaims(accessToken)?.amr;
  if (!Array.isArray(amr)) return null;
  const entered = (amr as { method?: unknown; timestamp?: unknown }[])
    .filter(({ method }) => method === 'totp' || method === 'mfa/totp')
    .map(({ timestamp }) => timestamp)
    .filter((timestamp): timestamp is number => typeof timestamp === 'number');
  return entered.length > 0 ? now / 1000 - Math.max(...entered) : null;
}

/** True when this login has 2FA on the account but hasn't entered the code yet. */
export function needsSecondFactor(
  user: FactorHolder,
  accessToken: string | null | undefined
): boolean {
  return hasVerifiedFactor(user) && assuranceLevel(accessToken) !== 'aal2';
}

/** True when this account uses 2FA and a money route should refuse this token. */
export function needsActionCode(
  user: FactorHolder,
  accessToken: string | null | undefined
): boolean {
  if (!hasVerifiedFactor(user)) return false;
  const age = secondsSinceCode(accessToken);
  return age === null || age > ACTION_CODE_MAX_AGE_SECONDS;
}

/** Supabase's error for a failed code, as something a person can act on. */
export function twoFactorErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: string; status?: number };
  if (status === 429 || code === 'over_request_rate_limit') {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (code === 'mfa_verification_failed') {
    return "That code isn't right. Check your authenticator app and try again.";
  }
  if (code === 'mfa_challenge_expired') return 'That code expired. Try the newest one.';
  return 'Something went wrong. Please try again.';
}
