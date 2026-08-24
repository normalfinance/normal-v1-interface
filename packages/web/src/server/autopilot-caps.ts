// How much value the autopilot delegation may sign, if anything bounds it.
//
// The Turnkey policy decides WHAT can be signed (chain, allowlisted contracts)
// and it is enforced inside Turnkey, where our code cannot reach. It cannot,
// however, read inside LI.FI calldata, so it cannot pin WHERE funds land —
// our own route does that by resolving the destination from the user's wallet
// row. These caps are therefore the only VALUE bound that survives our server
// being bypassed with a stolen autopilot key.
//
// Product decision 2026-08-24 (Niko): no caps. A user who wants to move
// $100k/day must not be asked for extra signatures. So the limits are now
// opt-in — 0, unset, or any non-positive/NaN value means UNLIMITED — and the
// kill switch (AUTOPILOT_DISABLED=1) remains the emergency brake.

export interface CapInput {
  /** USD value of this leg. */
  amountUsd: number;
  /** USD already signed by this user in the rolling window (0 when uncapped). */
  dailySoFar: number;
  /** Per-transaction ceiling; <= 0 or NaN = no ceiling. */
  maxTxUsd: number;
  /** Rolling 24h ceiling; <= 0 or NaN = no ceiling. */
  maxDailyUsd: number;
}

export type CapVerdict = { allowed: true } | { allowed: false; reason: string };

/** True when a configured limit is a real limit (not "off"). */
export function capEnabled(limit: number): boolean {
  return Number.isFinite(limit) && limit > 0;
}

export function evaluateAutopilotCaps(input: CapInput): CapVerdict {
  const { amountUsd, dailySoFar, maxTxUsd, maxDailyUsd } = input;

  // A leg with no known value cannot be measured against a ceiling; the
  // Turnkey policy still bounds what it may be.
  if (!Number.isFinite(amountUsd)) return { allowed: true };

  if (capEnabled(maxTxUsd) && amountUsd > maxTxUsd) {
    return { allowed: false, reason: `Autopilot per-transaction cap ($${maxTxUsd}) exceeded` };
  }
  if (capEnabled(maxDailyUsd) && dailySoFar + amountUsd > maxDailyUsd) {
    return { allowed: false, reason: `Autopilot daily cap ($${maxDailyUsd}) exceeded` };
  }
  return { allowed: true };
}
