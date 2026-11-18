// ---------------------------------------------------------------------------
// Which recovery phase a CCTP transfer row is in — the banner's eyesight.
//
// Pure and tested, because this table has now bitten twice. Live 2026-08-28:
// run 15 taught the STATE MACHINE to retire a row whose source leg reverted
// on-chain (status FAILED) — but this classifier, which predates such rows,
// only hid REFUNDED and COMPLETED. A retired inbound row with a source hash
// fell through to 'halt-receive', so the banner kept saying "finish once it
// arrives" about a swap the Activity feed was simultaneously showing as
// Failed. Two surfaces, two stories, one missing line.
// ---------------------------------------------------------------------------

import { autofinishAhead } from '@/lib/cctp/autofinish';
import { CHAINS, chainForSymbol } from '@/lib/chains/registry';

export type Phase = 'hidden' | 'auto' | 'halt-receive' | 'halt-finish';

/** The row fields the classification needs — TransferRow satisfies this. */
export interface PhaseFields {
  status: string;
  direction: string;
  srcSwapTxHash: string | null;
  burnTxHash: string | null;
  mintTxHash: string | null;
  dstSwapTxHash: string | null;
}

export function bannerPhase(tr: PhaseFields): Phase {
  // Terminal is terminal: REFUNDED (funds sent back) and FAILED (retired —
  // nothing ever moved) both mean there is nothing here to recover. FAILED
  // was the missing line: hiding only REFUNDED made every retired row a
  // permanent "finish once it arrives" ghost.
  if (tr.status === 'REFUNDED' || tr.status === 'FAILED') return 'hidden';
  // A crypto index purchase is followed by its own page and finished by the
  // cron (server/index-legs.ts): it has no swap to resume here.
  if (tr.direction === 'stellar_to_index') return 'hidden';
  const outbound = tr.direction === 'stellar_to_crosschain';
  if (outbound) {
    if (tr.dstSwapTxHash) return 'hidden'; // pivot done → settled
    if (!tr.burnTxHash) return 'hidden'; // pre-burn, still in-session
    if (tr.mintTxHash || tr.status === 'COMPLETED') return 'halt-finish'; // USDC on Base → pivot needed
    // Bridging Stellar→Base: the pivot signature still follows, so this is NOT
    // "no action needed". The progress modal owns it in-session; an orphaned one
    // resurfaces as halt-finish (after grace) once the mint lands.
    return 'hidden';
  }
  // inbound
  if (tr.status === 'COMPLETED') return 'hidden'; // USDC delivered to Stellar
  if (tr.burnTxHash) return 'auto'; // bridging Base → Stellar
  // The coin went to the exchange, nothing burned yet: its digital dollars are
  // on their way to Base or already there. Which one, and who moves them next,
  // is waitsOn's question: this phase alone does NOT mean "needs you".
  if (tr.srcSwapTxHash) return 'halt-receive';
  return 'hidden'; // pre-LI.FI delivery — nothing to recover yet
}

// ---------------------------------------------------------------------------
// Who a swap under way waits on now: the words on its page (Niko 2026-11-10).
//
// A Bitcoin swap still confirming said "Your swap needs you", its "Bitcoin
// confirms the payment" step said "Waiting for you", and "Finish the swap"
// could only answer that the money had not arrived. The phase says where the
// money is; this says who moves it next:
//
//   'exchange'  a swap in whose digital dollars have not reached the person's
//               Base address: the exchange is still converting and sending
//               them. Nobody can do anything but wait: they arrive, or the
//               exchange returns the coin.
//   'normal'    it finishes on its own: Circle is carrying it ('auto'), or
//               auto-finish takes the next step (the server's gate still
//               tries this row, lib/cctp/autofinish.ts).
//   'person'    the next step needs the person's passkey: "Needs you".
// ---------------------------------------------------------------------------

export type WaitsOn = 'exchange' | 'normal' | 'person';

export interface WaitFacts {
  /** The digital dollars were seen at the person's own Base address. */
  onBase: boolean;
  /** Auto-finish is on and still takes this row's next step (autoFinishAhead). */
  autoFinish: boolean;
}

export function waitsOn(phase: Exclude<Phase, 'hidden'>, facts: WaitFacts): WaitsOn {
  if (phase === 'auto') return 'normal';
  if (phase === 'halt-receive' && !facts.onBase) return 'exchange';
  return facts.autoFinish ? 'normal' : 'person';
}

/** The row fields auto-finish's gate reads. */
export interface AutoFinishFields {
  direction: string;
  createdAt: string;
  updatedAt: string;
  retryCount?: number | null;
}

/**
 * With auto-finish on, does the server still take this row's next step? The
 * cron's own clocks (lib/cctp/autofinish.ts): a swap in counts from its
 * creation, a swap out from its last change.
 */
export function autoFinishAhead(tr: AutoFinishFields, now: number): boolean {
  const from = Date.parse(tr.direction === 'stellar_to_crosschain' ? tr.updatedAt : tr.createdAt);
  return autofinishAhead({ ageMs: now - from, retryCount: tr.retryCount ?? 0 });
}

/**
 * When a wait on the exchange is longer than usual: twice the coin's chain's
 * settlement window (the CHAINS registry, "Usually 10 to 60 minutes" for
 * Bitcoin), and never under 15 minutes, so a fast chain's slow minute is not
 * called late.
 */
export function exchangeSlowAfterMs(coin: string): number {
  const chain = chainForSymbol(coin);
  const maxMinutes = chain ? CHAINS[chain].settlement.maxMinutes : 60;
  return Math.max(maxMinutes * 2, 15) * 60_000;
}
