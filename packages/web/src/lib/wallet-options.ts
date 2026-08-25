// Which wallet does a ramp use? — doc 87 §1 / doc 88 B1+F1.
//
// The live bug (Niko, 2026-08-25): both ramp dialogs hardcoded
// `persist.wallet.address` — the SLOT — so the MoneyGram off-ramp silently
// sold from Lobstr, and an on-ramp deposits into whichever wallet happens to
// be connected, unnamed. The rule this module exists to enforce:
//
//   NEVER silently pick a wallet when a choice exists,
//   and always NAME the wallet even when there is no choice.
//
// Scope fact that keeps this small: BTC/ETH/SOL have exactly ONE possible
// address (the Turnkey wallet — see addressFor in use-asset-actions), so a
// choice only ever exists for STELLAR assets, and only for hybrid users
// (external wallet connected + companion Normal wallet).
//
// Pure on purpose: callers supply the slot wallet, the companion and the
// balances; every rule below is testable without React or a network.

import BigNumber from 'bignumber.js';

export interface WalletOption {
  /** Stable key for selection state. */
  key: 'external' | 'normal';
  address: string;
  /** Human name — "Lobstr", "Normal wallet"… Never empty: an unnamed wallet
   *  is how the original bug stayed invisible. */
  label: string;
  /** Balance of the ramp's asset in this wallet, when known. */
  balance?: number;
}

export interface BuildOptionsInput {
  /** The slot wallet (persist store). walletType null/'normal-wallet' means
   *  the slot IS the Normal wallet — no external wallet connected. */
  slotAddress: string | null | undefined;
  slotWalletType: string | null | undefined;
  slotLabel: string;
  /** The companion Normal wallet (hybrid users only; null otherwise). */
  companionAddress: string | null | undefined;
  /** Asset balance held by the companion, when known. */
  companionBalance?: number;
  /** TOTAL balance of the asset across Stellar wallets (the aggregate view).
   *  The external wallet's share is total − companion, floored at 0 — the
   *  aggregate is the only per-user total we have, and the companion's share
   *  is reported separately by the portfolio route. */
  totalBalance?: number;
}

const isExternalType = (t: string | null | undefined): boolean =>
  t != null && t !== 'normal-wallet';

/** Every Stellar wallet a ramp could use, external first (matching the swap
 *  card's ordering so the two surfaces feel like one system). */
export function buildStellarWalletOptions(input: BuildOptionsInput): WalletOption[] {
  const options: WalletOption[] = [];
  const hybrid = isExternalType(input.slotWalletType) && !!input.slotAddress;

  if (hybrid) {
    const external: WalletOption = {
      key: 'external',
      address: input.slotAddress!,
      label: input.slotLabel,
    };
    if (input.totalBalance != null) {
      const companionShare = input.companionBalance ?? 0;
      external.balance = BigNumber.max(
        BigNumber(input.totalBalance).minus(companionShare),
        0
      ).toNumber();
    }
    options.push(external);
    if (input.companionAddress) {
      options.push({
        key: 'normal',
        address: input.companionAddress,
        label: 'Normal wallet',
        ...(input.companionBalance != null ? { balance: input.companionBalance } : {}),
      });
    }
    return options;
  }

  // Single-wallet user: the slot IS the Normal wallet. One option — still
  // named, so the dialog can say which wallet it is using.
  if (input.slotAddress) {
    options.push({
      key: 'normal',
      address: input.slotAddress,
      label: 'Normal wallet',
      ...(input.totalBalance != null ? { balance: input.totalBalance } : {}),
    });
  }
  return options;
}

/** Off-ramp: a wallet with none of the asset cannot sell it. Filter — but
 *  never down to zero options when SOMETHING holds a balance elsewhere, and
 *  never filter at all when balances are unknown (an unknown balance is not
 *  a zero balance; hiding a wallet on missing data would be the old silent
 *  pick wearing a new coat). */
export function filterSellableOptions(options: WalletOption[]): WalletOption[] {
  const anyKnown = options.some((o) => o.balance != null);
  if (!anyKnown) return options;
  const holders = options.filter((o) => (o.balance ?? 0) > 0);
  return holders.length > 0 ? holders : options;
}

/** Default selection.
 *  - off-ramp: the wallet that actually holds the asset; if several (or none)
 *    do, the first option (external-first ordering = today's behaviour, so a
 *    hybrid user's default does not change under their feet).
 *  - on-ramp: the NORMAL wallet when present — savings and cross-chain swaps
 *    live there, and depositing into the external wallet is the half of the
 *    bug that strands money somewhere the user did not choose. */
export function defaultSelection(
  options: WalletOption[],
  flow: 'onramp' | 'offramp'
): WalletOption | null {
  if (options.length === 0) return null;
  if (flow === 'onramp') {
    return options.find((o) => o.key === 'normal') ?? options[0];
  }
  const holders = options.filter((o) => (o.balance ?? 0) > 0);
  if (holders.length === 1) return holders[0];
  return options[0];
}
