// Remembering the connected EXTERNAL wallet across a logout (Niko 2026-08-22:
// "I logged off without disconnecting my Lobstr wallet and it was not there
// after I logged back in — it should only go away if we disconnect it").
//
// Why a separate memo instead of the persist slot: logout deliberately clears
// the slot (persist.disconnectWallet in the drawer's logout handler), and it
// SHOULD — the slot is what the app treats as "connected right now", and on a
// shared browser the next person must not inherit it. So the slot stays
// cleared, and this memo records only "the last external wallet THIS browser
// connected", which is re-attached on the next login ONLY after the server
// confirms the address belongs to the session that just signed in. A
// different user therefore never inherits it.
//
// Cleared on EXPLICIT disconnect/unlink — never on logout. That is exactly the
// distinction the user asked for.

const KEY = 'nf:last-external-wallet:v1';

export interface ExternalWalletMemo {
  address: string;
  walletType: string;
}

export function rememberExternalWallet(
  address: string | null | undefined,
  walletType?: string | null
): void {
  // Only external wallets: the Normal (Turnkey) wallet restores itself from
  // the server on login and must never be re-attached from a browser memo.
  if (!address || !walletType || walletType === 'normal-wallet') return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ address, walletType }));
  } catch {
    /* storage unavailable → the user reconnects manually, as before */
  }
}

export function readExternalWalletMemo(): ExternalWalletMemo | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.address && parsed?.walletType ? (parsed as ExternalWalletMemo) : null;
  } catch {
    return null;
  }
}

export function forgetExternalWallet(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}
