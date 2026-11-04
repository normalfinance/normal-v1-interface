// ---------------------------------------------------------------------------
// Turns Supabase's auth errors into plain words, plus what to offer next. A
// wrong password from someone who never signed up is the classic dead end:
// `nudge` is what lets the form point them at the right page instead.
// ---------------------------------------------------------------------------

export type AuthErrorNudge = 'signup' | 'login' | 'verify-email';

export interface FriendlyAuthError {
  message: string;
  nudge?: AuthErrorNudge;
}

const RULES: { match: RegExp; error: FriendlyAuthError }[] = [
  {
    match: /invalid login credentials/i,
    error: { message: "That email and password don't match.", nudge: 'signup' },
  },
  {
    match: /email not confirmed/i,
    error: { message: 'Confirm your email to finish signing up.', nudge: 'verify-email' },
  },
  {
    match: /already registered|already been registered|already exists/i,
    error: { message: 'This email already has an account.', nudge: 'login' },
  },
  {
    match: /rate limit|too many/i,
    error: { message: 'Too many attempts. Wait a minute and try again.' },
  },
  {
    match: /captcha/i,
    error: { message: "We couldn't verify your browser. Please try again." },
  },
];

export function friendlyAuthError(raw: string | undefined, fallback: string): FriendlyAuthError {
  if (!raw) return { message: fallback };
  return RULES.find((rule) => rule.match.test(raw))?.error ?? { message: raw };
}

/**
 * With email confirmation on, Supabase answers a sign-up for an email that
 * already has an account with a normal-looking user and no identities, so it
 * doesn't reveal which emails exist. No code is sent in that case, so waiting
 * on the "enter your code" screen would never end.
 */
export function isExistingAccountSignUp(data: {
  user?: { identities?: unknown[] | null } | null;
}): boolean {
  return data.user?.identities?.length === 0;
}
