import { useSnackbar } from 'notistack';
import { logger } from '@normalfinance/utils';
import { useRef, useEffect, useCallback } from 'react';
import { connectedWalletLabel } from '@/lib/portfolio/display';
import { friendlyAppError } from '@/utils/errors/error-classifier';
import { LOBSTR_ID, FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit';
import { usePersistStore, useStellarWalletKitStore } from '@normalfinance/state';
import { LEDGER_ID } from '@creit.tech/stellar-wallets-kit/modules/ledger.module';
import { WALLET_CONNECT_ID } from '@creit.tech/stellar-wallets-kit/modules/walletconnect.module';
import {
  linkWallet,
  updateLastUsed,
  getLinkedWallets,
  updateWalletName,
} from '@/services/linked-wallets';

// Wallets that use WalletConnect sessions — sessions do not survive page reloads.
// Signing after a page reload will fail until the user reconnects.
export const SESSION_BASED_WALLET_TYPES = new Set(['lobstr', 'wallet-connect']);

// Addresses already reconciled with `linked_wallets` in this page session.
// Module-level, not a ref: the hook is mounted by several components at once
// (drawer, wallet gate, onboarding wizard) and they would otherwise each run
// their own lookup on every navigation.
const linkEnsured = new Set<string>();

/** Forget that an address was linked this session. MUST be called when a
 *  wallet is unlinked — otherwise a reconnect in the SAME session skips the
 *  re-link and leaves the wallet connected-but-unowned (403s when logging
 *  transactions, finding #41's failure mode). */
export function forgetWalletLink(address: string | null | undefined): void {
  if (address) linkEnsured.delete(address);
}

/**
 * Make sure the connected external wallet has a `linked_wallets` row.
 *
 * WHY: `userOwnsWallet()` accepts an address only if it is in `linked_wallets`
 * or `turnkey_wallets`. The Normal-wallet paths link on create/import; external
 * wallets had no equivalent, so both transaction-log routes returned 403 and
 * their swaps never reached the database — finding #41 in
 * docs/audit/46-external-wallets.md.
 *
 * Never throws: a failure here must not break a working wallet connection.
 */
async function ensureWalletLinked(
  address: string | null | undefined,
  walletName?: string
): Promise<void> {
  if (!address || linkEnsured.has(address)) return;
  linkEnsured.add(address);

  try {
    // Check before writing. POST consumes the "3 wallets per day" creation
    // quota even for an address that is already linked (that route's
    // early-return is commented out), so linking unconditionally would burn
    // the allowance a genuine new wallet needs.
    const wallets = await getLinkedWallets();
    const existing = wallets.find((w) => w.walletAddress === address);
    if (existing) {
      updateLastUsed(address).catch(() => {});
      // Backfill the display name ONLY when the row has none — a custom name
      // the user typed in Settings is never overwritten by a reconnect
      // (Niko 2026-08-21: rows showed "Unnamed Account" for known wallets).
      if (walletName && !existing.walletName) updateWalletName(address, walletName).catch(() => {});
      return;
    }
    await linkWallet(address, walletName);
  } catch (error) {
    // Clear the guard so a later mount can retry — otherwise one failed
    // lookup (expired session, rate limit) would strand the user unlinked for
    // the whole page session.
    linkEnsured.delete(address);
    logger.warn('[WALLET KIT] Could not link the connected wallet:', error);
  }
}

const getWalletIdFromType = (walletType?: string): string | null => {
  switch (walletType) {
    case 'freighter':
      return FREIGHTER_ID;
    case 'lobstr':
      return LOBSTR_ID;
    case 'wallet-connect':
      return WALLET_CONNECT_ID;
    case 'ledger':
      return LEDGER_ID;
    default:
      return null;
  }
};

export const useStellarWalletsKit = () => {
  const persistStore = usePersistStore();
  const walletKitStore = useStellarWalletKitStore();

  const connectionChecked = useRef(false);

  // Initialize the wallet kit on first load
  useEffect(() => {
    if (!walletKitStore.isInitialized) {
      walletKitStore.initializeKit();
    }
  }, [walletKitStore.isInitialized, walletKitStore]);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (typeof window === 'undefined') return;

        const hasIncompleteConnection =
          walletKitStore.isConnected && walletKitStore.publicKey && !walletKitStore.selectedWallet;

        if (connectionChecked.current && !hasIncompleteConnection) {
          return;
        }

        if (walletKitStore.isConnecting) {
          return;
        }

        if (
          walletKitStore.isConnected &&
          walletKitStore.publicKey &&
          walletKitStore.selectedWallet
        ) {
          return;
        }

        // NOTE: this function only ever runs when a wallet type is ALREADY in
        // the slot (see the guard at the bottom of this effect), so it cannot
        // restore anything after a logout. Post-logout re-attach lives in
        // components/_common/external-wallet-reattach.tsx, which writes the
        // slot and lets this effect do the kit-level work.
        const storedWalletType = persistStore.wallet.walletType;
        if (!storedWalletType || storedWalletType === 'normal-wallet') {
          return;
        }

        if (!walletKitStore.kit) return;

        const walletId = getWalletIdFromType(storedWalletType);
        if (!walletId) {
          // DO NOT disconnect (live incident 2026-08-22: "I see $53 for a
          // second, then it immediately disconnects"). Failing to map a
          // wallet type to a kit module means we cannot restore SIGNING —
          // it does not mean the user disconnected their wallet. Wiping the
          // slot here destroyed the connection on every fresh page/session,
          // because that is the only time the kit store starts empty and
          // this branch is reachable. Keep the wallet; signing prompts a
          // reconnect through the existing session-expired flow.
          logger.warn(
            '[WALLET KIT] Cannot map wallet type to a kit module; leaving the wallet connected for display:',
            storedWalletType
          );
          // Deterministic (a switch on a string): re-running cannot change the
          // outcome, so stop re-checking and keep the console clean.
          connectionChecked.current = true;
          return;
        }

        connectionChecked.current = true;

        try {
          walletKitStore.kit.setWallet(walletId);
          walletKitStore.setSelectedWallet(walletId);

          // Use the persisted address directly to avoid triggering wallet
          // extension popups on every page navigation. We only call getAddress()
          // when there is no stored address (e.g. first-time connect or after disconnect).
          const storedAddress = persistStore.wallet.address;
          if (storedAddress) {
            walletKitStore.setPublicKey(storedAddress);
            walletKitStore.setConnected(true);
            // Backfill: users who connected before the linking fix never got a
            // `linked_wallets` row and would stay unable to log transactions
            // until they happened to reconnect. Guarded to once per session,
            // and it never blocks the restore.
            void ensureWalletLinked(storedAddress, connectedWalletLabel(storedWalletType));
          } else {
            await new Promise((resolve) => setTimeout(resolve, 500));
            const result = await walletKitStore.kit.getAddress();
            if (result?.address) {
              walletKitStore.setPublicKey(result.address);
              walletKitStore.setConnected(true);
              await persistStore.connectWallet(result.address, storedWalletType);
              void ensureWalletLinked(result.address, connectedWalletLabel(storedWalletType));
            }
          }
        } catch (restoreError) {
          // Same rule as above: a transient kit failure (no WalletConnect
          // session after a logout, module not ready, extension asleep) must
          // not delete the user's connection. Clear only the KIT's state so a
          // later attempt can retry; the slot — which drives balances and the
          // wallet's identity everywhere — stays.
          connectionChecked.current = false;
          walletKitStore.setPublicKey(null);
          walletKitStore.setConnected(false);
          walletKitStore.setSelectedWallet(null);
          logger.error('Failed to restore wallet (kit only; wallet kept):', restoreError);
        }
      } catch (error) {
        logger.error('Failed to check connection:', error);
      }
    };

    if (
      persistStore.wallet.walletType &&
      persistStore.wallet.walletType !== 'normal-wallet' &&
      (!walletKitStore.isConnected || !walletKitStore.selectedWallet) &&
      !walletKitStore.isConnecting
    ) {
      checkConnection();
    }
    // Deliberately field-scoped: the store objects change identity on every
    // state update; depending on them would re-run the restore constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    persistStore.wallet.walletType,
    persistStore.wallet.address,
    walletKitStore.isConnected,
    walletKitStore.isConnecting,
    walletKitStore.publicKey,
    walletKitStore.selectedWallet,
    walletKitStore.kit,
  ]);

  const { enqueueSnackbar } = useSnackbar();

  const connectWallet = useCallback(async () => {
    try {
      await walletKitStore.connectWallet(persistStore);
    } catch (e) {
      // Doc 90 W2: a connect FAILURE used to be indistinguishable from
      // "nothing happened".
      enqueueSnackbar(friendlyAppError(e), { variant: 'error' });
      return;
    }

    // Done here rather than at the three call sites (account drawer, wallet
    // gate, onboarding wizard) because all three go through this hook — one
    // place means a fourth connect path cannot forget.
    //
    // Read the address from getState(): the zustand value captured in this
    // closure is from the render before the connect, so it is still stale.
    // Null means the user closed the picker without choosing.
    const connectedAddress = useStellarWalletKitStore.getState().publicKey;
    if (!connectedAddress) {
      // User closed the picker — say so instead of total silence.
      enqueueSnackbar('Wallet connection was cancelled — nothing was linked.', {
        variant: 'info',
      });
      return;
    }
    // NB: the reconnect memo is NOT written here — it is derived from the
    // wallet slot in components/_common/external-wallet-reattach.tsx, so it
    // cannot race with a disconnect.
    await ensureWalletLinked(
      connectedAddress,
      connectedWalletLabel(usePersistStore.getState().wallet.walletType)
    );
  }, [walletKitStore, persistStore, enqueueSnackbar]);

  const signTransaction = useCallback(
    async (xdr: string, networkPassphrase?: string) =>
      await walletKitStore.signTransaction(xdr, networkPassphrase),
    [walletKitStore]
  );

  const disconnectWallet = useCallback(async () => {
    try {
      connectionChecked.current = false;
      await walletKitStore.disconnectWallet();
    } catch {
      connectionChecked.current = false;
      // Let the store handle the error state
    }
  }, [walletKitStore]);

  const getSupportedWallets = useCallback(async () => {
    try {
      return await walletKitStore.getSupportedWallets();
    } catch {
      return [];
    }
  }, [walletKitStore]);

  return {
    kit: walletKitStore.kit,
    publicKey: walletKitStore.publicKey,
    isConnected: walletKitStore.isConnected,
    selectedWallet: walletKitStore.selectedWallet,
    isConnecting: walletKitStore.isConnecting,
    isModalOpen: walletKitStore.isModalOpen,
    connectWallet,
    signTransaction,
    disconnectWallet,
    getSupportedWallets,
  };
};
