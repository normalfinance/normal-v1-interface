// ---------------------------------------------------------------------------
// #74b "send to your own wallet": which of the account's OTHER wallets can be
// offered as a send destination. Pure so the rules are testable:
//
// - the SENDER is never offered (self-send burns a fee for nothing)
// - the companion Normal wallet appears when an external wallet is connected
// - ALL linked external wallets appear (Niko's decision — stale ones are
//   cleaned up in Settings, not filtered here)
// - one chip per address, whatever source it came from
// ---------------------------------------------------------------------------

export interface OwnWalletCandidate {
  address: string;
  label: string;
}

const shortAddr = (addr: string) => `${addr.slice(0, 4)}…${addr.slice(-4)}`;

export function buildOwnWalletCandidates(params: {
  /** The wallet this send is signed by — under a #74c companion send this is
   *  the COMPANION, and the connected slot wallet becomes a destination. */
  senderAddress: string | null | undefined;
  companionAddress: string | null | undefined;
  /** The connected slot wallet (external), so a companion-sourced send can
   *  offer it as a destination even if its linked_wallets row is missing. */
  slotWallet?: { address: string; label: string } | null;
  linkedWallets: { walletAddress: string; walletName: string | null }[];
}): OwnWalletCandidate[] {
  const { senderAddress, companionAddress, slotWallet, linkedWallets } = params;
  const seen = new Set<string>(senderAddress ? [senderAddress] : []);
  const out: OwnWalletCandidate[] = [];

  if (companionAddress && !seen.has(companionAddress)) {
    seen.add(companionAddress);
    out.push({ address: companionAddress, label: 'Normal wallet' });
  }

  if (slotWallet?.address && !seen.has(slotWallet.address)) {
    seen.add(slotWallet.address);
    out.push({ address: slotWallet.address, label: slotWallet.label });
  }

  for (const w of linkedWallets) {
    if (!w.walletAddress || seen.has(w.walletAddress)) continue;
    seen.add(w.walletAddress);
    out.push({ address: w.walletAddress, label: w.walletName || shortAddr(w.walletAddress) });
  }

  return out;
}
