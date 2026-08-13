'use client';

import type { ChainId } from '@/lib/chains/registry';

import { BigNumber } from 'bignumber.js';
import { useMemo, useCallback, useSyncExternalStore } from 'react';
import { getPendingSends, subscribePendingSends } from '@/lib/pending-sends';

// ---------------------------------------------------------------------------
// Spendable balance = displayed balance − pending outflows (#62, Niko's
// scenario: send SOL → balance display lags a few seconds → MAX-swap would
// offer money that already left; the chain would reject it, but the user
// sees a confusing failure).
//
// Deliberately NOT an optimistic write into any balance store — that pattern
// (a stored value fighting refreshes) caused the stuck-balance findings
// #52/#55. This is a pure, derived adjustment recomputed on every render
// from ledgers that already exist:
//   - pending-send rows (lib/pending-sends.ts — localStorage, cross-tab),
//   - in-flight LI.FI swap source amounts (registered by lifi-tracker on
//     start, cleared on terminal).
// When a pending row clears (activity reconcile / expiry) or a swap
// settles, the adjustment vanishes by itself — nothing stored, nothing to
// clobber, nothing to reconcile.
//
// Displays may lag a few seconds behind the chain; what can never happen
// again is the app OFFERING committed money (send MAX, swap MAX).
// ---------------------------------------------------------------------------

interface SwapOutflow {
  chain: ChainId;
  symbol: string;
  /** Display units, e.g. "0.05" ETH. */
  amount: string;
}

const swapOutflows = new Map<string, SwapOutflow>();
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((l) => l());
}

/** Called by lifi-tracker when a swap's source tx starts being tracked. */
export function registerSwapOutflow(key: string, outflow: SwapOutflow): void {
  swapOutflows.set(key, outflow);
  notify();
}

/** Called on terminal/cancel. Safe to call twice. */
export function clearSwapOutflow(key: string): void {
  if (swapOutflows.delete(key)) notify();
}

/** Sum of in-flight outflows for a chain+symbol, as a string (stable
 *  primitive for useSyncExternalStore snapshots). Exported for tests. */
// Once the chain confirms a send, the on-chain balance already reflects it —
// keeping the subtraction would DOUBLE-count (observed risk 2026-08-13:
// Etherscan indexing lags minutes behind confirmation, and the row only
// clears on feed reconcile). The short grace covers the moment between
// confirmation and the bypassed balance refresh landing.
const CONFIRMED_GRACE_MS = 2_500;

export function pendingOutflowAmount(
  chain: ChainId | undefined,
  symbol: string | undefined
): string {
  if (!chain || !symbol) return '0';
  const now = Date.now();
  let sum = new BigNumber(0);

  for (const send of getPendingSends()) {
    if (send.confirmedAt && now - send.confirmedAt > CONFIRMED_GRACE_MS) continue;
    if (send.chain === chain && send.symbol === symbol) {
      const n = new BigNumber(send.amount);
      if (n.isFinite() && n.gt(0)) sum = sum.plus(n);
    }
  }
  for (const flow of swapOutflows.values()) {
    if (flow.chain === chain && flow.symbol === symbol) {
      const n = new BigNumber(flow.amount);
      if (n.isFinite() && n.gt(0)) sum = sum.plus(n);
    }
  }
  return sum.toFixed();
}

/**
 * Reactive pending-outflow total for a chain+symbol. Subscribes to both
 * ledgers, so MAX buttons and validations recompute the moment a send is
 * broadcast or settles.
 */
export function usePendingOutflow(
  chain: ChainId | undefined,
  symbol: string | undefined
): BigNumber {
  const subscribe = useCallback((onChange: () => void) => {
    const unsubSends = subscribePendingSends(onChange);
    listeners.add(onChange);
    return () => {
      unsubSends();
      listeners.delete(onChange);
    };
  }, []);

  const getSnapshot = useCallback(() => pendingOutflowAmount(chain, symbol), [chain, symbol]);

  const amount = useSyncExternalStore(subscribe, getSnapshot, () => '0');
  return useMemo(() => new BigNumber(amount), [amount]);
}
