import type { BigNumber } from 'bignumber.js';

// #32 chunk 4f: which wallet a hybrid Stellar↔Stellar swap starts from when
// the user hasn't picked yet. Pure so the rule is testable: the pills should
// open on the wallet that can actually pay — a user with an empty external
// wallet and a funded Normal wallet must never be greeted by "0.00".

export type StellarSwapSource = 'normal' | 'external';

/**
 * Default to whichever wallet holds more SPENDABLE from-asset; ties (both
 * empty, or genuinely equal) go to the Normal wallet — it is the wallet the
 * account's savings and cross-chain flows already run through.
 */
export function defaultStellarSource(
  companionSpendable: BigNumber,
  externalSpendable: BigNumber
): StellarSwapSource {
  return externalSpendable.gt(companionSpendable) ? 'external' : 'normal';
}
