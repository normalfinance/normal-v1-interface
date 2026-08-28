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
  if (tr.srcSwapTxHash) return 'halt-receive'; // USDC on Base, needs the burn
  return 'hidden'; // pre-LI.FI delivery — nothing to recover yet
}
