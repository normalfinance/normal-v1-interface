import { paths } from '@/routes/paths';

// ---------------------------------------------------------------------------
// Where sign-in lives and where it sends people afterwards. Pure helpers plus
// two small storage slots, so the open-redirect rules are unit tested rather
// than trusted (`next` arrives from the URL, which anyone can craft).
// ---------------------------------------------------------------------------

export type AuthMode = 'login' | 'signup';

export const DEFAULT_POST_AUTH_PATH = paths.portfolio;

const POST_AUTH_NEXT_KEY = 'nf:post-auth-next';
const MARKETING_OPT_IN_KEY = 'nf:pending-marketing-opt-in';

/** The sign-in pages render without the app navbar and footer. */
export function isAuthPage(pathname: string): boolean {
  return pathname === paths.auth.login || pathname === paths.auth.signup;
}

/**
 * The same-site path to return to, or null when `next` can't be trusted.
 * Browsers read `\` as `/` and strip tabs and newlines, so `/\evil.com` and
 * `/<tab>/evil.com` both mean `//evil.com`: a different site.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f]/.test(next)) return null;
  // Returning to a sign-in page after signing in would bounce straight out.
  if (isAuthPage(next.split(/[?#]/)[0])) return null;
  return next;
}

export function authHref(mode: AuthMode, next?: string | null): string {
  const base = mode === 'login' ? paths.auth.login : paths.auth.signup;
  const safe = safeNextPath(next);
  return safe ? `${base}?next=${encodeURIComponent(safe)}` : base;
}

/** The login link from the page someone is on. The landing page has nothing
 *  to come back to, so it falls through to the default destination. */
export function loginHrefFrom(pathname: string, search = ''): string {
  return authHref('login', pathname === paths.root ? null : `${pathname}${search}`);
}

// Google sign-in leaves the site and comes back through /auth/callback. Supabase
// only accepts redirect URLs on its allow-list, so `next` can't ride in that URL
// without allow-listing every variant; it waits here for the trip instead.
export function rememberPostAuthNext(next: string | null): void {
  try {
    if (next) sessionStorage.setItem(POST_AUTH_NEXT_KEY, next);
    else sessionStorage.removeItem(POST_AUTH_NEXT_KEY);
  } catch {
    /* storage unavailable: the default destination still works */
  }
}

export function consumePostAuthNext(): string | null {
  try {
    const next = sessionStorage.getItem(POST_AUTH_NEXT_KEY);
    sessionStorage.removeItem(POST_AUTH_NEXT_KEY);
    return safeNextPath(next);
  } catch {
    return null;
  }
}

// The sign-in page is gone by the time a session exists, so the optional
// "send me product updates" choice is handed to the post-login step here.
export function rememberMarketingOptIn(): void {
  try {
    localStorage.setItem(MARKETING_OPT_IN_KEY, 'true');
  } catch {
    /* best-effort, same as the opt-in itself */
  }
}

export function consumeMarketingOptIn(): boolean {
  try {
    const optedIn = localStorage.getItem(MARKETING_OPT_IN_KEY) === 'true';
    localStorage.removeItem(MARKETING_OPT_IN_KEY);
    return optedIn;
  } catch {
    return false;
  }
}
