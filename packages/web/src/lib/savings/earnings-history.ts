// ---------------------------------------------------------------------------
// #53 — the REAL earnings curve. No APY assumption anywhere: the wallet's
// ACTUAL total earnings (currentValue − netDeposited, known exactly) are
// distributed over time in proportion to the balance the user ACTUALLY held
// (piecewise-constant from real deposit/withdraw events). Exact at both
// ends: $0 at the first deposit, the true earnings figure now. The only
// approximation is the in-between attribution — proportional to
// balance × time, the fair split absent per-day share prices.
// ---------------------------------------------------------------------------

import type { SavingsHistoryEvent } from '@/server/defindex-events';

export interface ChartPoint {
  t: number;
  v: number;
}

/** Integral of balance dt from the first event to T (piecewise constant). */
function balanceTimeWeight(events: SavingsHistoryEvent[], T: number): number {
  let weight = 0;
  let balance = 0;
  let prevT = events.length ? events[0].timestamp : T;
  for (const e of events) {
    if (e.timestamp > T) break;
    weight += balance * (e.timestamp - prevT);
    balance = e.type === 'deposit' ? balance + e.amount : Math.max(0, balance - e.amount);
    prevT = e.timestamp;
  }
  weight += balance * (Math.max(T, prevT) - prevT);
  return weight;
}

export function buildRealEarningsHistory(
  events: SavingsHistoryEvent[],
  anchorEarnings: number,
  now: number,
  numPoints = 80
): ChartPoint[] {
  if (events.length === 0) return [];
  const firstT = events[0].timestamp;
  if (now <= firstT) return [];

  const totalWeight = balanceTimeWeight(events, now);
  const step = (now - firstT) / (numPoints - 1);
  return Array.from({ length: numPoints }, (_, i) => {
    const T = firstT + i * step;
    const share = totalWeight > 0 ? balanceTimeWeight(events, T) / totalWeight : 0;
    return { t: T, v: Math.max(0, anchorEarnings * share) };
  });
}
