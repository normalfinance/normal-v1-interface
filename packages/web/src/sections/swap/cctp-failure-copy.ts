// ---------------------------------------------------------------------------
// Doc 95 Wave 7 — stop re-writing messages that were already written for
// people.
//
// The engine ALWAYS classifies before it sets an error: `friendlyAppError(e)`,
// or an explicit sentence like "Not enough ETH left to pay the network fee".
// The progress modal then ran its own second classifier over that result, and
// one of its patterns was a bare /network/:
//
//   "Not enough ETH left to pay the network fee — try a slightly smaller
//    amount."                                   ← accurate, actionable
//        ↓ matched /timeout|timed out|network|fetch/i
//   "The network did not answer in time. Nothing is lost — try again in a
//    moment."                                   ← wrong, and tells the user to
//                                                 retry something that cannot
//                                                 succeed until they add ETH
//
// The shared classifier in utils/errors/error-classifier.ts already gets this
// right (its connectivity pattern requires real failure words, not the word
// "network"). So the modal must not re-classify at all. It keeps exactly ONE
// rule the shared classifier cannot have, because it is specific to a CCTP
// swap: an on-chain rejection means the money is sitting safely at the user's
// own Base address, and the way out is retry-or-bring-back.
// ---------------------------------------------------------------------------

export type CctpFailureKind =
  /** The route was rejected on-chain; the user's USDC is safe on Base. */
  | 'route-failed'
  /** Already written for a human upstream — show it unchanged. */
  | 'passthrough';

const ROUTE_FAILED = /reverted|WrappedError|rejected on-chain/i;

export function classifyCctpFailure(raw: string | null | undefined): CctpFailureKind {
  if (!raw) return 'passthrough';
  return ROUTE_FAILED.test(raw) ? 'route-failed' : 'passthrough';
}
