// ---------------------------------------------------------------------------
// Retiring a Stellar burn that provably never moved money (2026-11-09).
//
// A row in BURN_SUBMITTED had no way out when its burn never landed: an
// unclear send (lib/cctp/stellar-submit.ts) keeps the hash on purpose, and
// before that fix a timed-out approve was saved as the burn. Circle never
// attests either, so the cron asked about them on every tick, forever, and
// the swap read "completing automatically" for money that never left.
//
// A row is retired only on proof, never on silence from Circle alone:
// - FAILED from Stellar: the network ran it and refused it; nothing moved;
// - NOT_FOUND, with all of: the row is at least an hour old (the burn is
//   built with a two-minute time limit, after the row is written, so it can
//   no longer land); the RPC's history reaches back before the row was
//   written (so a landing would be inside what it searched); and Horizon,
//   which keeps the full history, has no such transaction either.
// Anything else (landed, unreachable, history too short) keeps the row.
// ---------------------------------------------------------------------------

export const NEVER_LANDS_AFTER_MS = 60 * 60_000;

export interface StellarTxFacts {
  status: 'SUCCESS' | 'FAILED' | 'NOT_FOUND';
  /** Unix seconds, from the RPC's own answer. */
  latestLedgerCloseTime: number;
  oldestLedgerCloseTime: number;
  /** Horizon's answer: true found, false a clean 404, null unreachable. */
  horizonFound: boolean | null;
}

export type StellarBurnVerdict = 'failed' | 'never-landed' | 'keep';

export function stellarBurnVerdict(
  facts: StellarTxFacts,
  rowCreatedAtMs: number
): StellarBurnVerdict {
  if (facts.status === 'FAILED') return 'failed';
  if (facts.status !== 'NOT_FOUND') return 'keep';

  const latestMs = facts.latestLedgerCloseTime * 1000;
  const oldestMs = facts.oldestLedgerCloseTime * 1000;
  const pastItsWindow = latestMs >= rowCreatedAtMs + NEVER_LANDS_AFTER_MS;
  const searchedItsLife = oldestMs > 0 && oldestMs <= rowCreatedAtMs;
  if (pastItsWindow && searchedItsLife && facts.horizonFound === false) return 'never-landed';
  return 'keep';
}

/** The words the row keeps (shown in the swap's details). */
export const STELLAR_BURN_RETIRED: Record<Exclude<StellarBurnVerdict, 'keep'>, string> = {
  failed: 'Stellar refused the transfer, so your USDC never left your wallet.',
  'never-landed': 'The transfer never reached Stellar, so your USDC never left your wallet.',
};
