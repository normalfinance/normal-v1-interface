import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { constants } from '@normalfinance/utils';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = constants.getNetworkConfig(
  process.env.NEXT_PUBLIC_TESTNET_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_MAINNET_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL! || ''
);

const supabaseAnonKey = constants.getNetworkConfig(
  process.env.NEXT_PUBLIC_TESTNET_SUPABASE_ANON_KEY!,
  process.env.NEXT_PUBLIC_MAINNET_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Create a Supabase client for server-side use in API routes.
 * This client reads the session from cookies to authenticate requests.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Session verification: cached, bounded, and de-duplicated.
//
// `supabase.auth.getUser()` is a LIVE network call to Supabase Auth. Every one
// of our ~36 authenticated routes made it before doing any work, with no
// timeout — 464ms warm and 7.7s cold in dev logs. Two consequences:
//
//   - user-facing latency on every authenticated request (visible once the
//     transaction-log routes moved behind auth: a swap row took seconds to
//     appear);
//   - an app-wide hang risk, since a slow Supabase would stall every route at
//     once with nothing to stop it (audit finding #19).
//
// THE TRADE-OFF, STATED PLAINLY: caching a verification means a session
// revoked server-side stays accepted until the entry expires. That is why the
// TTL is short. We keep revocation awareness within seconds rather than
// dropping it — which is what verifying the JWT signature locally would do,
// since a self-verified token stays "valid" until it expires (~1h).
// ---------------------------------------------------------------------------

type VerifiedUser = Awaited<ReturnType<typeof getUserFromSupabase>>;

/** Short on purpose — see the revocation note above. */
const AUTH_CACHE_TTL_MS = 30_000;
/** A failed verification is cached far more briefly: just long enough to blunt
 *  a burst of invalid tokens, not long enough to lock anyone out. */
const AUTH_NEGATIVE_TTL_MS = 5_000;
/** Bounds the wait so a slow Supabase can't stall the route indefinitely. */
const AUTH_TIMEOUT_MS = 5_000;
/** Keeps the in-process map from growing without limit on a long-lived server. */
const AUTH_CACHE_MAX_ENTRIES = 5_000;

const authCache = new Map<string, { user: VerifiedUser; expiresAt: number }>();
// Concurrent requests carrying the same token share one verification instead of
// each making its own round trip — the same single-flight pattern used for the
// Turnkey wallet lookup.
const authInFlight = new Map<string, Promise<VerifiedUser>>();

/** Tokens are secrets; key the cache by a digest so the raw value is never held
 *  as a map key or surfaced in a heap dump. */
function tokenKey(accessToken: string): string {
  return createHash('sha256').update(accessToken).digest('hex');
}

function pruneExpired(now: number) {
  for (const [key, entry] of authCache) {
    if (entry.expiresAt <= now) authCache.delete(key);
  }
  // If it's still oversized after pruning, drop oldest-inserted entries.
  while (authCache.size > AUTH_CACHE_MAX_ENTRIES) {
    const oldest = authCache.keys().next().value;
    if (oldest === undefined) break;
    authCache.delete(oldest);
  }
}

async function getUserFromSupabase(accessToken: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) return null;
  return user;
}

/**
 * Get the authenticated user from a request.
 * Returns null if not authenticated.
 */
export async function getAuthenticatedUser(accessToken?: string) {
  if (!accessToken) {
    return null;
  }

  const key = tokenKey(accessToken);
  const now = Date.now();

  const cached = authCache.get(key);
  if (cached && cached.expiresAt > now) return cached.user;

  const existing = authInFlight.get(key);
  if (existing) return existing;

  const verification = (async () => {
    try {
      // Losing the race means we treat the request as unauthenticated rather
      // than hanging. A route returning 401 is recoverable; a route that never
      // responds is not.
      const user = await Promise.race([
        getUserFromSupabase(accessToken),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), AUTH_TIMEOUT_MS)),
      ]);

      pruneExpired(now);
      authCache.set(key, {
        user,
        expiresAt: Date.now() + (user ? AUTH_CACHE_TTL_MS : AUTH_NEGATIVE_TTL_MS),
      });
      return user;
    } catch {
      return null;
    } finally {
      authInFlight.delete(key);
    }
  })();

  authInFlight.set(key, verification);
  return verification;
}

/** Drop a cached verification — call after sign-out or session invalidation so
 *  the change takes effect immediately rather than at the end of the TTL. */
export function invalidateAuthCache(accessToken: string): void {
  authCache.delete(tokenKey(accessToken));
}
