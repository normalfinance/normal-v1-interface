// ---------------------------------------------------------------------------
// One reading of LI.FI's status for a SOURCE leg, shared by every consumer.
//
// Live 2026-08-28: an ETH→USDC source transaction reverted on-chain. Three
// surfaces each interpreted the situation with their own logic and told the
// user three different stories (modal: "nothing moved" — true; banner:
// "finish once it arrives" — false; snackbar: "may already be bridging" —
// false). The verdict rule now lives here once, tested, so the surfaces
// cannot disagree about WHAT happened — only about how to say it.
// ---------------------------------------------------------------------------

export type SourceLegVerdict =
  /** LI.FI reports the funds were returned to the sender. */
  | 'REFUNDED'
  /** The source transaction failed/reverted — nothing was ever moved onward. */
  | 'FAILED'
  /** No terminal answer yet (pending, not indexed, unknown) — keep waiting. */
  | null;

export function lifiSourceVerdict(
  status: string | undefined | null,
  substatus: string | undefined | null
): SourceLegVerdict {
  const st = String(status ?? '').toUpperCase();
  const sub = String(substatus ?? '').toUpperCase();
  if (st === 'DONE' && (sub === 'REFUNDED' || sub === 'PARTIAL')) return 'REFUNDED';
  if (st === 'FAILED' || st === 'INVALID') return 'FAILED';
  // DONE (delivered), PENDING, NOT_FOUND, '' — all mean "no terminal failure".
  return null;
}
