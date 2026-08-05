import { logger } from '@normalfinance/utils';
import { useRef, useEffect, useCallback } from 'react';
import { LOBSTR_ID, FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit';
import { usePersistStore, useStellarWalletKitStore } from '@normalfinance/state';
import { LEDGER_ID } from '@creit.tech/stellar-wallets-kit/modules/ledger.module';
import { linkWallet, isWalletLinked, updateLastUsed } from '@/services/linked-wallets';
import { WALLET_CONNECT_ID } from '@creit.tech/stellar-wallets-kit/modules/walletconnect.module';

// Wallets that use WalletConnect sessions — sessions do not survive page reloads.
// Signing after a page reload will fail until the user reconnects.
export const SESSION_BASED_WALLET_TYPES = new Set(['lobstr', 'wallet-connect']);

// Addresses already reconciled with `linked_wallets` in this page session.
// Module-level, not a ref: the hook is mounted by several components at once
// (drawer, wallet gate, onboarding wizard) and they would otherwise each run
// their own lookup on every navigation.
const linkEnsured = new Set<string>();

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
async function ensureWalletLinked(address: string | null | undefined): Promise<void> {
  if (!address || linkEnsured.has(address)) return;
  linkEnsured.add(address);

  try {
    // Check before writing. POST consumes the "3 wallets per day" creation
    // quota even for an address that is already linked (that route's
    // early-return is commented out), so linking unconditionally would burn
    // the allowance a genuine new wallet needs.
    if (await isWalletLinked(address)) {
      updateLastUsed(address).catch(() => {});
      return;
    }
    await linkWallet(address);
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

        const storedWalletType = persistStore.wallet.walletType;
        if (!storedWalletType || storedWalletType === 'normal-wallet') {
          return;
        }

        if (!walletKitStore.kit) return;

        const walletId = getWalletIdFromType(storedWalletType);
        if (!walletId) {
          logger.warn('[WALLET KIT] Persisted wallet type cannot be restored:', storedWalletType);
          walletKitStore.setPublicKey(null);
          walletKitStore.setConnected(false);
          walletKitStore.setSelectedWallet(null);
          persistStore.disconnectWallet();
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
            void ensureWalletLinked(storedAddress);
          } else {
            await new Promise((resolve) => setTimeout(resolve, 500));
            const result = await walletKitStore.kit.getAddress();
            if (result?.address) {
              walletKitStore.setPublicKey(result.address);
              walletKitStore.setConnected(true);
              await persistStore.connectWallet(result.address, storedWalletType);
              void ensureWalletLinked(result.address);
            }
          }
        } catch (restoreError) {
          connectionChecked.current = false;
          walletKitStore.setPublicKey(null);
          walletKitStore.setConnected(false);
          walletKitStore.setSelectedWallet(null);
          persistStore.disconnectWallet();
          logger.error('Failed to restore wallet:', restoreError);
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
  }, [
    persistStore.wallet.walletType,
    persistStore.wallet.address,
    walletKitStore.isConnected,
    walletKitStore.isConnecting,
    walletKitStore.publicKey,
    walletKitStore.selectedWallet,
    walletKitStore.kit,
  ]);

  const connectWallet = useCallback(async () => {
    await walletKitStore.connectWallet(persistStore);

    // Done here rather than at the three call sites (account drawer, wallet
    // gate, onboarding wizard) because all three go through this hook — one
    // place means a fourth connect path cannot forget.
    //
    // Read the address from getState(): the zustand value captured in this
    // closure is from the render before the connect, so it is still stale.
    // Null means the user closed the picker without choosing.
    await ensureWalletLinked(useStellarWalletKitStore.getState().publicKey);
  }, [walletKitStore, persistStore]);

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
