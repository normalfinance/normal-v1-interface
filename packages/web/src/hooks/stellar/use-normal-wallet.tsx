import type { MnemonicStrength } from '@normalfinance/utils';

import { useRef, useEffect, useCallback } from 'react';
import { fetchAndDecryptMnemonic } from '@/lib/fetch-mnemonic';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { linkWallet, updateLastUsed } from '@/services/linked-wallets';
import { usePersistStore, useNormalWalletStore } from '@normalfinance/state';
import { useWalletPassword } from '@/providers/WalletPasswordProvider';
import {
  isLegacyBase64,
  isPasswordEncrypted,
  isIndexedDBEncrypted,
  decryptFromLocalStorage,
  encryptPrivateKeyWithPassword,
  decryptPrivateKeyWithPassword,
} from '@/lib/client-crypto';
import {
  logger,
  validateMnemonic,
  normalizeMnemonic,
  createKeypairFromSecret,
  createWalletFromMnemonic,
} from '@normalfinance/utils';

const NORMAL_WALLET_STORAGE_KEY = 'normal-wallet-private-key';

/**
 * Encrypt and store private key in localStorage using password-derived key (v2).
 */
const storePrivateKey = async (privateKey: string, password: string): Promise<void> => {
  if (typeof window === 'undefined') return;
  try {
    const encrypted = await encryptPrivateKeyWithPassword(privateKey, password);
    localStorage.setItem(NORMAL_WALLET_STORAGE_KEY, encrypted);
  } catch (error) {
    logger.error('[NORMAL WALLET] Failed to store private key:', error);
  }
};

/**
 * Retrieve and decrypt a v2 password-encrypted private key from localStorage.
 */
const getStoredPrivateKey = async (password: string): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(NORMAL_WALLET_STORAGE_KEY);
    if (!stored) return null;
    return await decryptPrivateKeyWithPassword(stored, password);
  } catch (error) {
    // Re-throw password errors so callers can handle them
    if (error instanceof Error && error.message === 'Incorrect password') {
      throw error;
    }
    logger.error('[NORMAL WALLET] Failed to retrieve private key:', error);
    return null;
  }
};

type StoredKeyFormat = 'none' | 'legacy' | 'v1' | 'v2';

/**
 * Detect the format of the stored private key.
 */
const getStoredKeyFormat = (): StoredKeyFormat => {
  if (typeof window === 'undefined') return 'none';
  const stored = localStorage.getItem(NORMAL_WALLET_STORAGE_KEY);
  if (!stored) return 'none';
  if (isPasswordEncrypted(stored)) return 'v2';
  if (isIndexedDBEncrypted(stored)) return 'v1';
  if (isLegacyBase64(stored)) return 'legacy';
  return 'none';
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
  const { session } = useSupabaseAuth();
  const { requestPassword } = useWalletPassword();

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
        if (!storedAddress) return;

        const format = getStoredKeyFormat();

        if (format === 'none') {
          // No key stored — connect address-only
          normalWalletStore.setPublicKey(storedAddress);
          normalWalletStore.setConnected(true);
          return;
        }

        let decryptedKey: string | null = null;

        if (format === 'v2') {
          // Password-encrypted — prompt user
          try {
            const password = await requestPassword('enter');
            decryptedKey = await getStoredPrivateKey(password);
          } catch {
            // User cancelled or password reset — connect address-only
            normalWalletStore.setPublicKey(storedAddress);
            normalWalletStore.setConnected(true);
            return;
          }
        } else {
          // Legacy or v1 — decrypt old way, then migrate to v2
          try {
            const stored = localStorage.getItem(NORMAL_WALLET_STORAGE_KEY);
            if (!stored) {
              normalWalletStore.setPublicKey(storedAddress);
              normalWalletStore.setConnected(true);
              return;
            }

            if (format === 'legacy') {
              decryptedKey = atob(stored);
            } else {
              // v1: IndexedDB-encrypted
              decryptedKey = await decryptFromLocalStorage(stored);
            }

            // Migrate: prompt for new password and re-encrypt as v2
            if (decryptedKey) {
              try {
                const password = await requestPassword('migrate');
                await storePrivateKey(decryptedKey, password);
                logger.log('[NORMAL WALLET] Migrated to v2 password encryption');
              } catch {
                // User cancelled migration — still restore the key this time
                logger.warn('[NORMAL WALLET] User cancelled migration, continuing with decrypted key');
              }
            }
          } catch (error) {
            logger.error('[NORMAL WALLET] Failed to decrypt legacy/v1 key:', error);
            removeStoredPrivateKey();
            persistStore.disconnectWallet();
            return;
          }
        }

        if (decryptedKey) {
          try {
            const keypair = createKeypairFromSecret(decryptedKey);
            const publicKey = keypair.publicKey();

            if (publicKey === storedAddress) {
              normalWalletStore.setKeypair(keypair);
              normalWalletStore.setPublicKey(publicKey);
              normalWalletStore.setConnected(true);
              logger.log('[NORMAL WALLET] Wallet restored successfully');
            } else {
              logger.warn('[NORMAL WALLET] Stored private key does not match stored address');
              removeStoredPrivateKey();
              persistStore.disconnectWallet();
            }
          } catch (error) {
            logger.error('[NORMAL WALLET] Failed to restore keypair:', error);
            removeStoredPrivateKey();
            persistStore.disconnectWallet();
          }
        } else {
          normalWalletStore.setPublicKey(storedAddress);
          normalWalletStore.setConnected(true);
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
    requestPassword,
  ]);

  const createWallet = useCallback(
    async (strength?: MnemonicStrength, passphrase?: string, walletName?: string) => {
      try {
        const result = await normalWalletStore.createWallet(strength, passphrase);
        const stateToStore = useNormalWalletStore.getState();
        if (stateToStore.keypair) {
          const password = await requestPassword('set');
          await storePrivateKey(stateToStore.keypair.secret(), password);
        }
        // Connect to persist store
        await normalWalletStore.connectWallet(persistStore);

        await linkWallet(result.publicKey, walletName);

        return result;
      } catch (error) {
        logger.error('[NORMAL WALLET] Failed to create wallet:', error);
        throw error;
      }
    },
    [normalWalletStore, persistStore, requestPassword]
  );

  const importWalletFromMnemonic = useCallback(
    async (
      mnemonic: string,
      passphrase?: string,
      walletName?: string,
      options?: { persistLocally?: boolean }
    ) => {
      try {
        const result = await normalWalletStore.importWalletFromMnemonic(mnemonic, passphrase);
        const stateToStore = useNormalWalletStore.getState();
        if (stateToStore.keypair && options?.persistLocally !== false) {
          const password = await requestPassword('set');
          await storePrivateKey(stateToStore.keypair.secret(), password);
        }
        await normalWalletStore.connectWallet(persistStore);
        await linkWallet(result.publicKey, walletName);
        return result;
      } catch (error) {
        logger.error('[NORMAL WALLET] Failed to import wallet from mnemonic:', error);
        throw error;
      }
    },
    [normalWalletStore, persistStore, requestPassword]
  );

  const importWalletFromPrivateKey = useCallback(
    async (privateKey: string, walletName?: string, options?: { persistLocally?: boolean }) => {
      try {
        const result = await normalWalletStore.importWalletFromPrivateKey(privateKey);
        const stateToStore = useNormalWalletStore.getState();
        if (stateToStore.keypair && options?.persistLocally !== false) {
          const password = await requestPassword('set');
          await storePrivateKey(stateToStore.keypair.secret(), password);
        }
        await normalWalletStore.connectWallet(persistStore);
        await linkWallet(result.publicKey, walletName);
        return result;
      } catch (error) {
        logger.error('[NORMAL WALLET] Failed to import wallet from private key:', error);
        throw error;
      }
    },
    [normalWalletStore, persistStore, requestPassword]
  );

  const connectWallet = useCallback(async () => {
    await normalWalletStore.connectWallet(persistStore);

    const publicKey = normalWalletStore.publicKey;
    if (publicKey) {
      updateLastUsed(publicKey).catch(() => {});
    }
  }, [normalWalletStore, persistStore]);

  const connectWalletWithoutKeypair = useCallback(
    async (address: string) => {
      await persistStore.connectWallet(address, 'normal-wallet');
      normalWalletStore.setPublicKey(address);
      normalWalletStore.setConnected(true);
      updateLastUsed(address).catch(() => {});
    },
    [persistStore, normalWalletStore]
  );

  const clearKeypairForPlatformCustody = useCallback(() => {
    removeStoredPrivateKey();
    normalWalletStore.setKeypair(null);
  }, [normalWalletStore]);

  const signTransaction = useCallback(
    async (xdr: string, networkPassphrase?: string) => {
      const { keypair, publicKey } = normalWalletStore;
      if (keypair && publicKey) {
        return normalWalletStore.signTransaction(xdr, networkPassphrase);
      }

      const walletAddress = persistStore.wallet.address;
      if (!walletAddress) {
        throw new Error('No wallet connected');
      }

      const mnemonic = await fetchAndDecryptMnemonic(walletAddress, session);
      if (mnemonic) {
        const normalized = normalizeMnemonic(mnemonic);
        if (!validateMnemonic(normalized)) {
          throw new Error('Invalid mnemonic from platform custody');
        }
        const walletData = createWalletFromMnemonic(normalized);
        if (walletData.publicKey !== walletAddress) {
          throw new Error('Mnemonic does not match wallet address');
        }
        normalWalletStore.setKeypair(walletData.keypair);
        try {
          const signedXDR = await normalWalletStore.signTransaction(xdr, networkPassphrase);
          return signedXDR;
        } finally {
          normalWalletStore.setKeypair(null);
          removeStoredPrivateKey();
        }
      }

      // Self-custody fallback: prompt for password and decrypt
      const keyFormat = getStoredKeyFormat();
      if (keyFormat === 'v2') {
        try {
          const password = await requestPassword('enter');
          const storedPrivateKey = await getStoredPrivateKey(password);
          if (storedPrivateKey) {
            const keypairFromStorage = createKeypairFromSecret(storedPrivateKey);
            if (keypairFromStorage.publicKey() !== walletAddress) {
              throw new Error('Stored private key does not match wallet address');
            }
            normalWalletStore.setKeypair(keypairFromStorage);
            return normalWalletStore.signTransaction(xdr, networkPassphrase);
          }
        } catch (error) {
          if (error instanceof Error && error.message === 'User cancelled password entry') {
            throw new Error('No wallet key available. Sign in and try again.');
          }
          throw error;
        }
      }

      throw new Error('No wallet key available. Sign in and try again.');
    },
    [normalWalletStore, persistStore.wallet.address, session, requestPassword]
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
    mnemonic: normalWalletStore.mnemonic,
    createWallet,
    importWalletFromMnemonic,
    importWalletFromPrivateKey,
    connectWallet,
    connectWalletWithoutKeypair,
    clearKeypairForPlatformCustody,
    signTransaction,
    disconnectWallet,
  };
};
