import { constants } from '@normalfinance/utils';

// ---------------------------------------------------------------------------
// The Supabase project this build talks to, and where supabase-js keeps its
// session in this browser. Plain values, no client: the marketing site reads
// the session key to draw its header without loading supabase-js.
// ---------------------------------------------------------------------------

export const SUPABASE_URL = constants.getNetworkConfig(
  process.env.NEXT_PUBLIC_TESTNET_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_MAINNET_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL! || ''
);

export const SUPABASE_ANON_KEY = constants.getNetworkConfig(
  process.env.NEXT_PUBLIC_TESTNET_SUPABASE_ANON_KEY!,
  process.env.NEXT_PUBLIC_MAINNET_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * supabase-js's own key for this project: `sb-<project ref>-auth-token`
 * (SupabaseClient's defaultStorageKey). Only this one counts: testnet and
 * mainnet are two projects, so a browser can hold a second, unrelated session.
 */
export function supabaseStorageKey(url: string = SUPABASE_URL): string | null {
  try {
    return `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
  } catch {
    return null;
  }
}

/**
 * Drops this project's stored session from this browser: the session and its
 * companions (`-code-verifier`, `-user`). Logging out has to log this browser
 * out even when Supabase's logout request fails (offline, a server error),
 * which is when supabase-js keeps the session.
 */
export function clearStoredSession(): void {
  const key = supabaseStorageKey();
  if (!key) return;
  try {
    Object.keys(window.localStorage)
      .filter((k) => k === key || k.startsWith(`${key}-`))
      .forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // Storage blocked: nothing was stored there either.
  }
}
