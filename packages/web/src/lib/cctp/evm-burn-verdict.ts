// ---------------------------------------------------------------------------
// A recorded burn on Base or Ethereum that reverted (2026-11-09).
//
// The server's auto-finish saves a burn's hash the moment it is sent (doc 95
// Wave 3: a lost hash strands money), and an unclear send is saved too. When
// that burn then reverted on-chain, the row sat in BURN_SUBMITTED for good:
// Circle never attests a revert, and the gas top-up refuses a row that has a
// burn, so neither app could send it again. The USDC was safe at the person's
// own address, with no way to move it on.
//
// A revert moves no money (only the gas), so once it is final the row goes
// back to "nothing burned yet" and can be finished again. Final means: the
// receipt says reverted AND it sits at least the chain's depth deep
// (EVM_REVERT_FINAL_DEPTH), so no reorg can turn it into a success that
// nobody would then follow. Pure.
// ---------------------------------------------------------------------------

/** How long a BURN_SUBMITTED row sits idle before the cron asks the chain. */
export const EVM_REVERT_CHECK_AFTER_MS = 10 * 60_000;

export interface EvmReceiptFacts {
  /** null: no receipt (not mined, dropped, or unknown to this node). */
  receipt: { status: 'success' | 'reverted'; blockNumber: bigint } | null;
  latestBlock: bigint;
}

export function evmBurnRevertedForGood(facts: EvmReceiptFacts, finalDepth: number): boolean {
  if (!facts.receipt || facts.receipt.status !== 'reverted') return false;
  return facts.latestBlock - facts.receipt.blockNumber >= BigInt(finalDepth);
}

/** What the row keeps once the revert has handed it back. */
export const evmBurnRevertedDetail = (hash: string) =>
  `Burn reverted on-chain (${hash}). Nothing moved; it can be sent again.`;
