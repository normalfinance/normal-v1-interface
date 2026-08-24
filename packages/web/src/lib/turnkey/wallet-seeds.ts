// Rules for recording Turnkey wallets (seeds) — doc 83 phase 1.
//
// A sub-organization can hold several wallets, each one a separate recovery
// phrase controlling its own addresses. `turnkey_wallets` holds the user's
// sub-org and their PRIMARY wallet; `turnkey_wallet_seeds` holds them all.
//
// The decision below is the one that matters, so it lives here rather than
// inside a route: get it wrong and the primary row ends up describing two
// different seeds at once, which is exactly the defect this phase exists to
// remove.

/** Should this wallet own the primary `turnkey_wallets` row?
 *
 *  TRUE when the row has no wallet yet (import-init creates it with an empty
 *  walletId), and when the incoming wallet IS the row's wallet — which covers
 *  every lazy chain-add, since those re-sync the same wallet with one more
 *  address.
 *
 *  FALSE means a SECOND seed arrived. Overwriting the row then is what left
 *  `walletId` pointing at the imported wallet while `stellarAddress` still
 *  belonged to the original, so "Export recovery phrase" handed back a phrase
 *  that did not open the wallet on screen.
 */
export function isPrimaryWallet(
  rowWalletId: string | null | undefined,
  incomingWalletId: string
): boolean {
  if (!rowWalletId) return true;
  return rowWalletId === incomingWalletId;
}

/** Default name for a wallet in the list. Imported wallets carry a hint of the
 *  address so two rows are never indistinguishable — the passkey picker taught
 *  us what identical labels cost (doc 82). */
export function defaultSeedLabel(isPrimary: boolean, stellarAddress?: string | null): string {
  if (isPrimary) return 'Normal wallet';
  if (stellarAddress && stellarAddress.length >= 8) {
    return `Imported · ${stellarAddress.slice(0, 4)}…${stellarAddress.slice(-4)}`;
  }
  return 'Imported wallet';
}

/** Only overwrite address fields we actually derived. A lazy chain-add reports
 *  one new chain; blanking the others would erase addresses the user holds. */
export function seedAddressUpdate(derived: {
  stellar?: string | null;
  bitcoin?: string | null;
  ethereum?: string | null;
  solana?: string | null;
}): Record<string, string> {
  const out: Record<string, string> = {};
  if (derived.stellar) out.stellarAddress = derived.stellar;
  if (derived.bitcoin) out.bitcoinAddress = derived.bitcoin;
  if (derived.ethereum) out.ethereumAddress = derived.ethereum;
  if (derived.solana) out.solanaAddress = derived.solana;
  return out;
}
