// ---------------------------------------------------------------------------
// #74: one shared answer to "is this Stellar wallet ready to hold USDC?".
// Every notice surface (swap page, receive modal, drawer badges, post-connect
// toast) maps the same probe through this ONE function — no surface does its
// own probe math, so they can never disagree.
// ---------------------------------------------------------------------------

export type WalletReadiness =
  | 'checking' // probe still running → render NOTHING (no warning flash)
  | 'unknown' // probe FAILED → render NOTHING; failure is never "missing"
  | 'not-activated' // account not on the network yet (needs ≥1 XLM)
  | 'no-trustline' // active, but incoming USDC would bounce (op_no_trust)
  | 'ready';

export interface ReadinessProbe {
  isLoading: boolean;
  error: unknown;
  accountExists: boolean | null; // null = the check could not run (doc 90 W3)
  hasUsdcTrustline: boolean;
}

/**
 * Order matters: `checking` and `unknown` outrank the boolean fields, because
 * `useAccountStatus` resets both booleans to `false` while loading and on
 * failure — reading them first would show "not activated" for a wallet we
 * simply couldn't reach (the failure≠empty rule, register 2026-08-17).
 */
export function deriveWalletReadiness(probe: ReadinessProbe): WalletReadiness {
  if (probe.isLoading) return 'checking';
  if (probe.error != null) return 'unknown';
  // Doc 90 W3 tri-state: null means the Horizon check never answered — that
  // is 'unknown', never 'not-activated' (the failure≠empty rule).
  if (probe.accountExists == null) return 'unknown';
  if (!probe.accountExists) return 'not-activated';
  if (!probe.hasUsdcTrustline) return 'no-trustline';
  return 'ready';
}
