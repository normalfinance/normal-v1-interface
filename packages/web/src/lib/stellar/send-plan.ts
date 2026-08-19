import { BigNumber } from 'bignumber.js';

// ---------------------------------------------------------------------------
// #32 4e — planning a Stellar send against the DESTINATION's real state
// (Niko's scenario, 2026-08-15: "I have an empty Lobstr wallet — can I send
// XLM there from my Normal wallet? USDC too, or do I need a trustline?").
//
// Stellar's rules, which the send funnel used to ignore (every send was a
// plain `payment`, so these cases failed ON-CHAIN with raw codes after the
// user had already signed):
//   - an address that never received XLM does not EXIST yet; the first XLM
//     must arrive via a createAccount op with at least 1 XLM (base reserve)
//   - a non-XLM asset can only be received after the destination opts in
//     with a trustline — only the destination's own key can add it
//
// Pure decision, unit-tested; the send funnel maps it to ops and messages.
// ---------------------------------------------------------------------------

/** Minimum starting balance Stellar accepts for createAccount (2 × base reserve). */
export const MIN_ACTIVATION_XLM = 1;

export type StellarSendPlan =
  /** Destination exists (and, for assets, trusts the asset) — plain payment. */
  | { kind: 'payment' }
  /** XLM to a not-yet-existing account — activate it with createAccount. */
  | { kind: 'create-account' }
  | {
      kind: 'blocked';
      reason:
        | 'activation-minimum' // XLM to a new account, but below 1 XLM
        | 'destination-not-active' // asset to an account that doesn't exist
        | 'destination-needs-trustline'; // asset to an account without the line
    };

export function planStellarSend(params: {
  symbol: string;
  amount: BigNumber.Value;
  destinationExists: boolean;
  /** null = not applicable (XLM) or unknown. */
  destinationHasTrustline: boolean | null;
}): StellarSendPlan {
  const { symbol, amount, destinationExists, destinationHasTrustline } = params;
  const isXlm = symbol === 'XLM';

  if (!destinationExists) {
    if (!isXlm) return { kind: 'blocked', reason: 'destination-not-active' };
    if (BigNumber(amount).lt(MIN_ACTIVATION_XLM))
      return { kind: 'blocked', reason: 'activation-minimum' };
    return { kind: 'create-account' };
  }

  if (!isXlm && destinationHasTrustline === false)
    return { kind: 'blocked', reason: 'destination-needs-trustline' };

  return { kind: 'payment' };
}
