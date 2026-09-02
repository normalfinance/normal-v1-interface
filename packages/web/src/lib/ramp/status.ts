// The ramp-transfer status machine — doc 89 F2, the pure core.
//
// One record tracks each handoff to a ramp provider, from the moment the user
// leaves our app until the money is REAL. The rules below are the honesty of
// the feature:
//
//   1. Transitions only move forward — nothing can un-arrive.
//   2. Nothing pends forever — a committed row with no provider signal is
//      ABANDONED after 45 minutes, because a ghost banner that never clears
//      teaches users to ignore the banner.
//   3. "Arrived" requires the CHAIN. The provider's word is a forecast: it
//      triggers the balance check, but only a real balance change (or a found
//      on-chain tx) marks arrival. When that happens the message disappears —
//      the chain's own Received row becomes the permanent record (Niko:
//      "make sure when assets appear the message go away").
//
// Pure on purpose: routes, hooks and the cron all call these; none of them
// re-implement a rule.

export const RAMP_STATUSES = [
  'committed', // row written, user handed to the provider
  'provider_processing', // provider has seen the user / payment in progress
  'provider_complete', // provider says done — expect the chain any moment
  'arrived', // the CHAIN confirmed it (terminal, onramp)
  'paid_out', // the bank payout landed (terminal, offramp)
  'failed', // provider reported failure (terminal)
  'abandoned', // no signal within the window (terminal)
] as const;

export type RampStatus = (typeof RAMP_STATUSES)[number];

export const TERMINAL_STATUSES: ReadonlySet<RampStatus> = new Set([
  'arrived',
  'paid_out',
  'failed',
  'abandoned',
]);

/** Forward-only edges. A PATCH proposing anything else is rejected. */
const EDGES: Record<RampStatus, readonly RampStatus[]> = {
  committed: ['provider_processing', 'provider_complete', 'arrived', 'failed', 'abandoned'],
  provider_processing: ['provider_complete', 'arrived', 'paid_out', 'failed'],
  provider_complete: ['arrived', 'paid_out', 'failed'],
  arrived: [],
  paid_out: [],
  failed: [],
  abandoned: [],
};

export function isTerminal(status: RampStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function canTransition(from: RampStatus, to: RampStatus): boolean {
  return (EDGES[from] ?? []).includes(to);
}

/** Rule 2: committed with no provider signal for this long → abandoned.
 *  45 minutes comfortably outlives a real checkout; a user who closed the
 *  provider tab should not haunt their own banner for a day. */
export const ABANDON_AFTER_MS = 45 * 60 * 1000;

export function shouldAbandon(status: RampStatus, createdAtMs: number, nowMs: number): boolean {
  return status === 'committed' && nowMs - createdAtMs >= ABANDON_AFTER_MS;
}

/** Rule 3: has the money actually landed? Compares the destination's CURRENT
 *  balance against the baseline captured at commit. Any measurable increase
 *  counts — the amount may be unknown (picked on the provider's page), so we
 *  never demand a specific delta we could not know. Unknown inputs never
 *  claim arrival: a failed balance read must not clear a banner. */
export function balanceShowsArrival(
  baseline: string | null | undefined,
  current: number | null | undefined
): boolean {
  if (baseline == null || current == null || !Number.isFinite(current)) return false;
  const base = Number(baseline);
  if (!Number.isFinite(base)) return false;
  // Strictly greater: equal means nothing new landed. A tiny epsilon guards
  // float noise from string round-trips.
  return current > base + 1e-9;
}

// ---------------------------------------------------------------------------
// View-model — what the banner and the activity rows render.
// ---------------------------------------------------------------------------

export interface RampTransferRow {
  id: string;
  direction: 'onramp' | 'offramp';
  provider: string;
  asset: string;
  chain: string;
  walletAddress: string;
  amountExpected: string | null;
  status: RampStatus;
  createdAt: string | Date;
}

export interface InFlightRamp {
  id: string;
  direction: 'onramp' | 'offramp';
  provider: string;
  providerLabel: string;
  asset: string;
  chain: string;
  walletAddress: string;
  /** Banner headline, honest about what we know. */
  message: string;
  /** Secondary line: expectation management, never a countdown. */
  detail: string;
  status: RampStatus;
  failed: boolean;
  createdAt: string | Date;
}

const PROVIDER_LABELS: Record<string, string> = {
  coinbase: 'Coinbase',
  moonpay: 'MoonPay',
  moneygram: 'MoneyGram',
  stripe: 'Stripe',
};

export function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

/** The banner shows ONLY rows still in flight (plus failures, so the user
 *  learns what happened) — an arrived row leaves the banner the moment the
 *  chain confirms, per Niko's requirement. */
export function isBannerVisible(status: RampStatus): boolean {
  return !isTerminal(status) || status === 'failed';
}

export function toInFlightRamp(row: RampTransferRow): InFlightRamp {
  const label = providerLabel(row.provider);
  const amount = row.amountExpected ? `${Number(row.amountExpected)} ${row.asset}` : row.asset;

  let message: string;
  let detail: string;
  if (row.status === 'failed') {
    message =
      row.direction === 'onramp'
        ? `Your ${label} purchase did not complete`
        : `Your ${label} sale did not complete`;
    detail = 'No funds moved. You can try again, or contact support if you were charged.';
  } else if (row.direction === 'onramp') {
    message =
      row.status === 'provider_complete'
        ? `${amount} on the way from ${label}`
        : `Buying ${row.asset} on ${label}`;
    detail =
      row.status === 'provider_complete'
        ? 'Usually arrives within a minute.'
        : 'Waiting for the purchase to complete.';
  } else {
    message =
      row.status === 'provider_complete'
        ? `Sold ${amount} — payout on the way`
        : `Selling ${row.asset} via ${label}`;
    detail =
      row.status === 'provider_complete'
        ? 'Bank payouts typically take minutes to a few business days, depending on your bank.'
        : 'Waiting for the sale to complete.';
  }

  return {
    id: row.id,
    direction: row.direction,
    provider: row.provider,
    providerLabel: label,
    asset: row.asset,
    chain: row.chain,
    walletAddress: row.walletAddress,
    message,
    detail,
    status: row.status,
    failed: row.status === 'failed',
    createdAt: row.createdAt,
  };
}
