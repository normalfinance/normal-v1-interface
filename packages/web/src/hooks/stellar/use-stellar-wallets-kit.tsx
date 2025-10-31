import { logger } from '@normalfinance/utils';
import { useRef, useEffect, useCallback } from 'react';
import { usePersistStore, useStellarWalletKitStore } from '@normalfinance/state';
import { LEDGER_ID } from '@creit.tech/stellar-wallets-kit/modules/ledger.module';
import { HANA_ID, XBULL_ID, LOBSTR_ID, FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit';
import { WALLET_CONNECT_ID } from '@creit.tech/stellar-wallets-kit/modules/walletconnect.module';

export const useStellarWalletsKit = () => {
  const persistStore = usePersistStore();
  const walletKitStore = useStellarWalletKitStore();

  const connectionChecked = useRef(false);

  // Initialize the wallet kit on first load
  useEffect(() => {
    if (!walletKitStore.isInitialized) {
      walletKitStore.initializeKit();
    }
  }, [walletKitStore.isInitialized]);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (typeof window === 'undefined') return;

        if (connectionChecked.current) {
          return;
        }

        if (walletKitStore.isConnecting) {
          return;
        }

        if (walletKitStore.isConnected && walletKitStore.publicKey) {
          return;
        }

        connectionChecked.current = true;

        if (persistStore.wallet.address) {
          walletKitStore.setPublicKey(persistStore.wallet.address);
          walletKitStore.setConnected(true);

          const storedWalletType = persistStore.wallet.walletType;
          if (storedWalletType) {
            let walletId: string | null = null;
            switch (storedWalletType) {
              case 'hana':
                walletId = HANA_ID;
                break;
              case 'xbull':
                walletId = XBULL_ID;
                break;
              case 'freighter':
                walletId = FREIGHTER_ID;
                break;
              case 'lobstr':
                walletId = LOBSTR_ID;
                break;
              case 'wallet-connect':
                walletId = WALLET_CONNECT_ID;
                break;
              case 'ledger':
                walletId = LEDGER_ID;
                break;
              default:
                walletId = null;
                break;
            }
            if (walletId) {
              walletKitStore.setSelectedWallet(walletId);

              if (walletKitStore.kit) {
                try {
                  walletKitStore.kit.setWallet(walletId);
                } catch (setWalletError) {
                  // Silent fail
                }
              }
            }
          }
          return;
        }

        if (!walletKitStore.kit) return;

        const storedWalletType = persistStore.wallet.walletType;

        if (!storedWalletType) {
          return;
        }

        let walletId: string | null = null;
        switch (storedWalletType) {
          case 'hana':
            walletId = HANA_ID;
            break;
          case 'xbull':
            walletId = XBULL_ID;
            break;
          case 'freighter':
            walletId = FREIGHTER_ID;
            break;
          case 'lobstr':
            walletId = LOBSTR_ID;
            break;
          case 'wallet-connect':
            walletId = WALLET_CONNECT_ID;
            break;
          case 'ledger':
            walletId = LEDGER_ID;
            break;
          default:
            walletId = null;
            break;
        }

        if (walletId) {
          try {
            walletKitStore.kit.setWallet(walletId);
            walletKitStore.setSelectedWallet(walletId);

            await new Promise((resolve) => setTimeout(resolve, 500));

            const address = await walletKitStore.kit.getAddress();
            if (address?.address) {
              walletKitStore.setPublicKey(address.address);
              walletKitStore.setConnected(true);

              if (address.address !== persistStore.wallet.address) {
                await persistStore.connectWallet(address.address, storedWalletType);
              }
            }
          } catch (restoreError) {
            logger.error('Failed to restore wallet:', restoreError);
          }
        }
      } catch (error) {
        logger.error('Failed to check connection:', error);
      }
    };

    if (
      (persistStore.wallet.walletType || persistStore.wallet.address) &&
      !walletKitStore.isConnected &&
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
    walletKitStore.kit,
  ]);

  const connectWallet = useCallback(async () => {
    await walletKitStore.connectWallet(persistStore);
  }, [walletKitStore, persistStore]);

  const signTransaction = useCallback(
    async (xdr: string) => await walletKitStore.signTransaction(xdr),
    [walletKitStore]
  );

  const disconnectWallet = useCallback(async () => {
    try {
      connectionChecked.current = false;
      await walletKitStore.disconnectWallet();
    } catch (error) {
      connectionChecked.current = false;
      // Let the store handle the error state
    }
  }, [walletKitStore]);

  const getSupportedWallets = useCallback(async () => {
    try {
      return await walletKitStore.getSupportedWallets();
    } catch (error) {
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
