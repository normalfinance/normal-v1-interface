import { logger } from '@normalfinance/utils';
import { useRef, useEffect, useCallback } from 'react';
import { usePersistStore, useStellarWalletKitStore } from '@normalfinance/state';
import { LEDGER_ID } from '@creit.tech/stellar-wallets-kit/modules/ledger.module';
import { HANA_ID, XBULL_ID, LOBSTR_ID, FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit';
import { WALLET_CONNECT_ID } from '@creit.tech/stellar-wallets-kit/modules/walletconnect.module';

// These wallets use WalletConnect sessions that do not survive page reloads.
// We never try to silently restore them — we clear state so the user knows
// they need to reconnect and sign fresh.
const SESSION_BASED_WALLET_TYPES = new Set(['lobstr', 'wallet-connect']);

const getWalletIdFromType = (walletType?: string): string | null => {
  switch (walletType) {
    case 'hana':
      return HANA_ID;
    case 'xbull':
      return XBULL_ID;
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

        // Session-based wallets (Lobstr, WalletConnect) use a live WebSocket
        // session that does not survive page reloads. Pretending they are
        // still connected causes silent signing failures, so we disconnect
        // immediately and let the user reconnect explicitly.
        if (SESSION_BASED_WALLET_TYPES.has(storedWalletType)) {
          walletKitStore.setPublicKey(null);
          walletKitStore.setConnected(false);
          walletKitStore.setSelectedWallet(null);
          persistStore.disconnectWallet();
          logger.log('[WALLET KIT] Session-based wallet cleared on page load:', storedWalletType);
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

          // Use the persisted address directly to avoid triggering extension
          // popups on every page navigation. We only call getAddress() when
          // there is no stored address (e.g. first-time connect or after disconnect).
          const storedAddress = persistStore.wallet.address;
          if (storedAddress) {
            walletKitStore.setPublicKey(storedAddress);
            walletKitStore.setConnected(true);
          } else {
            await new Promise((resolve) => setTimeout(resolve, 500));
            const result = await walletKitStore.kit.getAddress();
            if (result?.address) {
              walletKitStore.setPublicKey(result.address);
              walletKitStore.setConnected(true);
              await persistStore.connectWallet(result.address, storedWalletType);
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
