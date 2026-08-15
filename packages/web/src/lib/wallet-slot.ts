// ---------------------------------------------------------------------------
// Wallet-slot decisions (#32 chunk 1, doc 72 §2/§4b).
//
// The persist store has ONE wallet slot, and two different systems write to
// it automatically: the Turnkey self-heal (restores a wiped address) and the
// wallet-creation flows (adopt the new wallet after signup). Both were
// correct when every user had exactly one wallet; with companion Normal
// wallets alongside external wallets, both become wallet-SWITCHERS unless
// guarded. These two pure functions are that guard — kept free of hooks and
// stores so the invariants I1/I2/I5/I6/I7 are directly unit-testable.
// ---------------------------------------------------------------------------

/**
 * May the Turnkey self-heal connect the user's Turnkey Stellar wallet into
 * the empty slot? (use-normal-wallet's recovery effect)
 *
 * An EMPTY slot has two meanings, disambiguated by the `lastWalletType`
 * breadcrumb (written on every connect, surviving disconnect):
 * - breadcrumb absent → fresh device / cleared storage: restore. This is the
 *   returning normal-wallet user logging in on a new laptop — today's
 *   behavior, and it must keep working (invariant I6).
 * - breadcrumb 'normal-wallet' → the slot was wiped by a bug/cleanup, not by
 *   choice: restore (the original self-heal case).
 * - breadcrumb = an external type → the user's last act was choosing an
 *   external wallet; an empty slot means they DISCONNECTED. Restoring the
 *   Turnkey wallet here silently switches their wallet — finding #42.
 *   Never restore (invariants I2/I7).
 */
export function shouldRestoreTurnkeyStellar(
  slotAddress: string | undefined,
  lastWalletType: string | undefined
): boolean {
  if (slotAddress) return false; // slot occupied — nothing to heal
  if (lastWalletType && lastWalletType !== 'normal-wallet') return false;
  return true;
}

/**
 * May a wallet-creation flow ADOPT the freshly created Turnkey Stellar wallet
 * into the slot? Only when the slot is empty — the signup/onboarding case
 * (invariant I5). An occupied slot means an external wallet is connected and
 * the new wallet is a COMPANION: linked and server-known, but the user's
 * chosen wallet stays put (invariant I1).
 */
export function shouldAdoptIntoSlot(slotAddress: string | undefined): boolean {
  return !slotAddress;
}
