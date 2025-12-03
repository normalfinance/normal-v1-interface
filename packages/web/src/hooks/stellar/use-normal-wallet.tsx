import { logger } from '@normalfinance/utils';
import { useRef, useEffect, useCallback } from 'react';
import { usePersistStore, useNormalWalletStore } from '@normalfinance/state';
import { createKeypairFromSecret } from '@normalfinance/utils';
import type { MnemonicStrength } from '@normalfinance/utils';

const NORMAL_WALLET_STORAGE_KEY = 'normal-wallet-private-key';

/**
 * Encrypt and store private key in localStorage
 * Note: Simple base64 encoding is used for now. should consider something more secure in the future.
 */
const storePrivateKey = (privateKey: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const encoded = btoa(privateKey); // we should consider using Buffer.from(randomBytes).toString("hex") instead of btoa in the future.
    localStorage.setItem(NORMAL_WALLET_STORAGE_KEY, encoded);
  } catch (error) {
    logger.error('[NORMAL WALLET] Failed to store private key:', error);
  }
};

/**
 * Retrieve and decrypt private key from localStorage
 */
const getStoredPrivateKey = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const encoded = localStorage.getItem(NORMAL_WALLET_STORAGE_KEY);
    if (!encoded) return null;
    return atob(encoded); // we should consider using Buffer.from(randomBytes).toString("hex") instead of atob in the future.
  } catch (error) {
    logger.error('[NORMAL WALLET] Failed to retrieve private key:', error);
    return null;
  }
};

/**
 * Remove private key from localStorage
 */
const removeStoredPrivateKey = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(NORMAL_WALLET_STORAGE_KEY);
  } catch (error) {
    logger.error('[NORMAL WALLET] Failed to remove private key:', error);
  }
};

export const useNormalWallet = () => {
  const persistStore = usePersistStore();
  const normalWalletStore = useNormalWalletStore();

  const connectionChecked = useRef(false);

  // Restore Normal wallet from persist store and localStorage on mount
  useEffect(() => {
    const restoreWallet = async () => {
      try {
        if (typeof window === 'undefined') return;

        if (connectionChecked.current) {
          return;
        }

        if (normalWalletStore.isConnecting) {
          return;
        }

        if (normalWalletStore.isConnected && normalWalletStore.publicKey) {
          return;
        }

        // Only restore if wallet type is 'normal-wallet'
        if (persistStore.wallet.walletType !== 'normal-wallet') {
          return;
        }

        connectionChecked.current = true;

        const storedAddress = persistStore.wallet.address;
        if (storedAddress) {
          // Try to restore keypair from localStorage
          const storedPrivateKey = getStoredPrivateKey();
          if (storedPrivateKey) {
            try {
              const keypair = createKeypairFromSecret(storedPrivateKey);
              const publicKey = keypair.publicKey();

              // Verify the public key matches the stored address
              if (publicKey === storedAddress) {
                normalWalletStore.setKeypair(keypair);
                normalWalletStore.setPublicKey(publicKey);
                normalWalletStore.setConnected(true);
                logger.log('[NORMAL WALLET] Wallet restored successfully');
              } else {
                logger.warn('[NORMAL WALLET] Stored private key does not match stored address');
                // Clear invalid data
                removeStoredPrivateKey();
                persistStore.disconnectWallet();
              }
            } catch (error) {
              logger.error('[NORMAL WALLET] Failed to restore keypair:', error);
              // Clear invalid data
              removeStoredPrivateKey();
              persistStore.disconnectWallet();
            }
          } else {
            // No private key stored, disconnect
            logger.warn('[NORMAL WALLET] No private key found in storage');
            persistStore.disconnectWallet();
          }
        }
      } catch (error) {
        logger.error('[NORMAL WALLET] Failed to restore wallet:', error);
      }
    };

    if (
      persistStore.wallet.walletType === 'normal-wallet' &&
      persistStore.wallet.address &&
      !normalWalletStore.isConnected &&
      !normalWalletStore.isConnecting
    ) {
      restoreWallet();
    }
  }, [
    persistStore.wallet.walletType,
    persistStore.wallet.address,
    normalWalletStore.isConnected,
    normalWalletStore.isConnecting,
    normalWalletStore.publicKey,
  ]);

  const createWallet = useCallback(
    async (strength?: MnemonicStrength, passphrase?: string) => {
      try {
        const result = await normalWalletStore.createWallet(strength, passphrase);
        // Store private key securely
        if (normalWalletStore.keypair) {
          storePrivateKey(normalWalletStore.keypair.secret());
        }
        // Connect to persist store
        await normalWalletStore.connectWallet(persistStore);
        return result;
      } catch (error) {
        logger.error('[NORMAL WALLET] Failed to create wallet:', error);
        throw error;
      }
    },
    [normalWalletStore, persistStore]
  );

  const importWalletFromMnemonic = useCallback(
    async (mnemonic: string, passphrase?: string) => {
      try {
        const result = await normalWalletStore.importWalletFromMnemonic(mnemonic, passphrase);
        // Store private key securely
        if (normalWalletStore.keypair) {
          storePrivateKey(normalWalletStore.keypair.secret());
        }
        // Connect to persist store
        await normalWalletStore.connectWallet(persistStore);
        return result;
      } catch (error) {
        logger.error('[NORMAL WALLET] Failed to import wallet from mnemonic:', error);
        throw error;
      }
    },
    [normalWalletStore, persistStore]
  );

  const importWalletFromPrivateKey = useCallback(
    async (privateKey: string) => {
      try {
        const result = await normalWalletStore.importWalletFromPrivateKey(privateKey);
        // Store private key securely
        if (normalWalletStore.keypair) {
          storePrivateKey(normalWalletStore.keypair.secret());
        }
        // Connect to persist store
        await normalWalletStore.connectWallet(persistStore);
        return result;
      } catch (error) {
        logger.error('[NORMAL WALLET] Failed to import wallet from private key:', error);
        throw error;
      }
    },
    [normalWalletStore, persistStore]
  );

  const connectWallet = useCallback(async () => {
    await normalWalletStore.connectWallet(persistStore);
  }, [normalWalletStore, persistStore]);

  const signTransaction = useCallback(
    async (xdr: string, networkPassphrase?: string) => {
      return await normalWalletStore.signTransaction(xdr, networkPassphrase);
    },
    [normalWalletStore]
  );

  const disconnectWallet = useCallback(async () => {
    try {
      connectionChecked.current = false;
      // Remove private key from storage
      removeStoredPrivateKey();
      await normalWalletStore.disconnectWallet();
      await persistStore.disconnectWallet();
    } catch (error) {
      connectionChecked.current = false;
      logger.error('[NORMAL WALLET] Error disconnecting wallet:', error);
    }
  }, [normalWalletStore, persistStore]);

  return {
    publicKey: normalWalletStore.publicKey,
    isConnected: normalWalletStore.isConnected,
    isConnecting: normalWalletStore.isConnecting,
    mnemonic: normalWalletStore.mnemonic, // Only available during creation/import
    createWallet,
    importWalletFromMnemonic,
    importWalletFromPrivateKey,
    connectWallet,
    signTransaction,
    disconnectWallet,
  };
};
