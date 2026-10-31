// ---------------------------------------------------------------------------
// Two-factor sign-in: the pure rules, shared by the API gate and the browser.
//
// Supabase stamps each access token with how far the login got: `aal1` after
// the first step (password, Google, email code) and `aal2` after the 6-digit
// code. Whether someone uses 2FA at all comes from their verified factors.
// ---------------------------------------------------------------------------

/** What the API answers when a login still owes its 6-digit code. */
export const MFA_REQUIRED_ERROR = 'mfa_required';

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
 * The `aal` claim, read without checking the signature: this must only be used
 * on a token already verified (server) or issued to this browser (client).
 */
export function assuranceLevel(accessToken: string | null | undefined): string | null {
  const payload = accessToken?.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const { aal } = JSON.parse(atob(padded)) as { aal?: unknown };
    return typeof aal === 'string' ? aal : null;
  } catch {
    return null;
  }
}

/** True when this login has 2FA on the account but hasn't entered the code yet. */
export function needsSecondFactor(
  user: FactorHolder,
  accessToken: string | null | undefined
): boolean {
  return hasVerifiedFactor(user) && assuranceLevel(accessToken) !== 'aal2';
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
