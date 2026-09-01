// ---------------------------------------------------------------------------
// Savings volume truth-merge (doc 122). The app DB (vault_deposits) misses
// actions that never reached it — external wallets 403 on log-transaction,
// direct on-chain interactions — while the chain (DeFindex events API) misses
// nothing but carries no fee and no tx hash. So neither source can simply
// replace the other:
//   - a DB row is kept as-is (it holds the fee we actually charged), and
//   - a chain event with no matching DB row becomes a fee-0 row (real volume,
//     but we never charged revenue on it — inventing a fee would lie to the
//     revenue queries).
// Matching is one-to-one per wallet+type: amount within max($0.02, 1%) and
// time within 24h, nearest-in-time first, so two identical deposits on
// different days each consume their own event.
// ---------------------------------------------------------------------------

import type { VaultDepositInput } from './activity-v2';

export interface ChainSavingsEvent {
  wallet: string;
  type: 'deposit' | 'withdraw';
  /** Human USDC units. */
  amount: number;
  /** ms epoch. */
  timestamp: number;
}

export const MATCH_WINDOW_MS = 24 * 60 * 60 * 1000;
const AMOUNT_TOLERANCE_ABS = 0.02;
const AMOUNT_TOLERANCE_REL = 0.01;

export function amountsMatch(a: number, b: number): boolean {
  const tolerance = Math.max(AMOUNT_TOLERANCE_ABS, Math.max(a, b) * AMOUNT_TOLERANCE_REL);
  return Math.abs(a - b) <= tolerance;
}

export function mergeSavingsSources(
  db: VaultDepositInput[],
  chain: ChainSavingsEvent[],
  network: string
): VaultDepositInput[] {
  // Pool DB rows per wallet+type; each may absorb at most one chain event.
  const pools = new Map<string, { row: VaultDepositInput; time: number; taken: boolean }[]>();
  for (const row of db) {
    const key = `${row.walletAddress}|${row.type === 'deposit' ? 'deposit' : 'withdraw'}`;
    const pool = pools.get(key) ?? [];
    pool.push({ row, time: row.createdAt.getTime(), taken: false });
    pools.set(key, pool);
  }

  const synthetic: VaultDepositInput[] = [];
  // Oldest events first so a same-amount rematch resolves in time order.
  const ordered = [...chain].sort((a, b) => a.timestamp - b.timestamp);

  for (const ev of ordered) {
    const pool = pools.get(`${ev.wallet}|${ev.type}`) ?? [];
    let best: { row: VaultDepositInput; time: number; taken: boolean } | null = null;
    for (const candidate of pool) {
      if (candidate.taken) continue;
      if (Math.abs(candidate.time - ev.timestamp) > MATCH_WINDOW_MS) continue;
      if (!amountsMatch(Number(candidate.row.amount ?? 0), ev.amount)) continue;
      if (!best || Math.abs(candidate.time - ev.timestamp) < Math.abs(best.time - ev.timestamp)) {
        best = candidate;
      }
    }
    if (best) {
      best.taken = true; // the DB row already represents this event
      continue;
    }
    synthetic.push({
      createdAt: new Date(ev.timestamp),
      walletAddress: ev.wallet,
      type: ev.type,
      amount: String(ev.amount),
      feeAmount: null, // no fee was charged through the app — never invent one
      txHash: null,
      network,
    });
  }

  // Every DB row survives — app-recorded truth is never dropped, even when the
  // events API failed to report it (its fee still belongs in revenue).
  return [...db, ...synthetic];
}
