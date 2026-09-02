import type { MnemonicStrength } from '@normalfinance/utils';

import { shouldRestoreTurnkeyStellar } from '@/lib/wallet-slot';
import { useRef, useState, useEffect, useCallback } from 'react';
import { linkWallet, updateLastUsed } from '@/services/linked-wallets';
import { useWalletPassword } from '@/providers/WalletPasswordProvider';
import { logger, createKeypairFromSecret } from '@normalfinance/utils';
import { usePersistStore, useNormalWalletStore } from '@normalfinance/state';
import {
  getTurnkeyWalletInfo,
  isTurnkeyStellarAddress,
  isTurnkeyStellarAddressStrict,
} from '@/lib/turnkey/wallet-info';
import {
  isLegacyBase64,
  isPasswordEncrypted,
  isIndexedDBEncrypted,
  decryptFromLocalStorage,
  encryptPrivateKeyWithPassword,
  decryptPrivateKeyWithPassword,
} from '@/lib/client-crypto';

const NORMAL_WALLET_STORAGE_KEY = 'normal-wallet-private-key';

export const NORMAL_WALLET_REIMPORT_REQUIRED_MESSAGE =
  'No local wallet key found. Please re-import your wallet using your recovery phrase to continue signing.';

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

export const hasStoredNormalWalletKey = (): boolean => {
  const storedKeyFormat = getStoredKeyFormat();
  return storedKeyFormat === 'v2' || storedKeyFormat === 'v1' || storedKeyFormat === 'legacy';
};

/**
 * Remove private key from localStorage.
 * Exported so the Turnkey import flow can retire the local key once the
 * wallet is passkey-secured.
 */
export const removeStoredNormalWalletKey = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(NORMAL_WALLET_STORAGE_KEY);
  } catch (error) {
    logger.error('[NORMAL WALLET] Failed to remove private key:', error);
  }
};

const removeStoredPrivateKey = removeStoredNormalWalletKey;

export const useNormalWallet = () => {
  const persistStore = usePersistStore();
  const normalWalletStore = useNormalWalletStore();
  const { requestPassword } = useWalletPassword();

  const connectionChecked = useRef(false);
  const recoveryChecked = useRef(false);

  // Self-heal a wiped Stellar address.
  //
  // `disconnectWallet()` clears `wallet.address` from the PERSISTED store, so
  // once it runs the address is gone across reloads and only signing in again
  // restored it. Everything Stellar then breaks quietly — balances are fetched
  // with `stellar=` empty, and the activity/savings hooks get a null key — while
  // BTC/ETH/SOL keep working, because the server reads those from the authed DB
  // row. That asymmetry is exactly the "XLM and USDC don't load" report.
  //
  // Turnkey is the authority on which Stellar address belongs to this user, so
  // if the persisted one is missing while Turnkey has it, restore it.
  //
  // #32 chunk 1: guarded by the lastWalletType breadcrumb — an empty slot
  // whose breadcrumb records an EXTERNAL wallet means the user disconnected
  // by choice; restoring the Turnkey wallet there silently switched their
  // wallet (finding #42). Absent breadcrumb (fresh device) restores as
  // always. Decision logic + invariants: lib/wallet-slot.ts.
  useEffect(() => {
    if (recoveryChecked.current) return;
    if (!shouldRestoreTurnkeyStellar(persistStore.wallet.address, persistStore.lastWalletType))
      return;

    recoveryChecked.current = true;
    (async () => {
      try {
        const info = await getTurnkeyWalletInfo();
        if (!info?.stellarAddress) return;
        // Re-check: another path may have connected while we were awaiting.
        const latest = usePersistStore.getState();
        if (!shouldRestoreTurnkeyStellar(latest.wallet.address, latest.lastWalletType)) return;

        logger.warn(
          '[NORMAL WALLET] Persisted Stellar address was missing; restoring it from Turnkey'
        );
        await persistStore.connectWallet(info.stellarAddress, 'normal-wallet');
        normalWalletStore.setPublicKey(info.stellarAddress);
        normalWalletStore.setConnected(true);
      } catch (error) {
        // Unknown, not "no wallet" — allow a later attempt rather than
        // permanently giving up on recovery.
        recoveryChecked.current = false;
        logger.error('[NORMAL WALLET] Stellar address recovery failed:', error);
      }
    })();
  }, [persistStore, normalWalletStore]);

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

        if (!hasStoredNormalWalletKey()) {
          // Turnkey-imported wallets have no local key — signing goes through
          // the passkey, so the connection is still valid.
          // STRICT on purpose: a failed lookup must never be read as "not your
          // wallet", because the branch below disconnects the wallet. On
          // failure this throws, the catch below clears `connectionChecked`,
          // and the next render retries instead of stranding the session.
          const isTurnkeyManaged = await isTurnkeyStellarAddressStrict(storedAddress);
          if (!isTurnkeyManaged) {
            logger.warn(
              '[NORMAL WALLET] Persisted Normal wallet is missing a local key; clearing stale connection state'
            );
            normalWalletStore.setKeypair(null);
            normalWalletStore.setPublicKey(null);
            normalWalletStore.setConnected(false);
            persistStore.disconnectWallet();
            return;
          }
        }

        // Address-only restore: never prompt for password on mount. The
        // decrypted keypair is populated lazily by signTransaction on the
        // first sign, which caches it in the zustand store for the session.
        // This keeps the wallet "connected" for all read paths (balances,
        // history, etc.) without disturbing the user with a modal on every
        // page load.
        normalWalletStore.setPublicKey(storedAddress);
        normalWalletStore.setConnected(true);
      } catch (error) {
        // The guard is set before the awaits above, so leaving it set after a
        // failure would strand the wallet for the whole page session — no
        // balances, no savings, no activity, recoverable only by a full
        // reload. Clearing it lets the next render retry.
        connectionChecked.current = false;
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
    normalWalletStore,
    persistStore,
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
      if (!hasStoredNormalWalletKey() && !(await isTurnkeyStellarAddress(address))) {
        throw new Error(NORMAL_WALLET_REIMPORT_REQUIRED_MESSAGE);
      }

      await persistStore.connectWallet(address, 'normal-wallet');
      normalWalletStore.setPublicKey(address);
      normalWalletStore.setConnected(true);
      updateLastUsed(address).catch(() => {});
    },
    [persistStore, normalWalletStore]
  );

  const signTransaction = useCallback(
    async (xdr: string, networkPassphrase?: string) => {
      // Always read the latest zustand state — the hook-captured `normalWalletStore`
      // can be stale if the store updated between render and this call.
      const latest = useNormalWalletStore.getState();
      if (latest.keypair && latest.publicKey) {
        return latest.signTransaction(xdr, networkPassphrase);
      }

      const walletAddress = persistStore.wallet.address || latest.publicKey;
      if (!walletAddress) {
        throw new Error('No wallet connected');
      }

      // Turnkey-managed wallet: sign with the user's passkey — no local key,
      // no password. Takes precedence over any stored local key.
      const turnkeyInfo = await getTurnkeyWalletInfo();
      if (turnkeyInfo?.subOrgId && turnkeyInfo.stellarAddress === walletAddress) {
        const { signStellarXdrWithTurnkey } = await import('@/lib/turnkey/stellar-signer');
        return signStellarXdrWithTurnkey(
          xdr,
          networkPassphrase,
          turnkeyInfo.subOrgId,
          turnkeyInfo.stellarAddress
        );
      }

      // Self-custody: prompt for password and decrypt the locally-stored key
      const keyFormat = getStoredKeyFormat();

      const finalizeSign = (decryptedKey: string) => {
        const keypairFromStorage = createKeypairFromSecret(decryptedKey);
        if (keypairFromStorage.publicKey() !== walletAddress) {
          throw new Error(
            'The stored local key does not match your wallet address. Please re-import your wallet using your recovery phrase.'
          );
        }
        latest.setKeypair(keypairFromStorage);
        latest.setPublicKey(keypairFromStorage.publicKey());
        latest.setConnected(true);
        return useNormalWalletStore.getState().signTransaction(xdr, networkPassphrase);
      };

      if (keyFormat === 'v2') {
        try {
          const password = await requestPassword('enter');
          const storedPrivateKey = await getStoredPrivateKey(password);
          if (!storedPrivateKey) {
            throw new Error(
              'Could not decrypt your local wallet key. Please re-import your wallet using your recovery phrase.'
            );
          }
          return finalizeSign(storedPrivateKey);
        } catch (error) {
          if (error instanceof Error && error.message === 'User cancelled password entry') {
            throw new Error('Password required to sign. Please try again.');
          }
          throw error;
        }
      }

      if (keyFormat === 'legacy' || keyFormat === 'v1') {
        // Lazy migration: silently decrypt the legacy/v1 key, prompt the user
        // for a new password, re-encrypt as v2, then proceed with the sign.
        let decryptedKey: string;
        try {
          const stored = localStorage.getItem(NORMAL_WALLET_STORAGE_KEY);
          if (!stored) {
            throw new Error('No local key');
          }
          decryptedKey =
            keyFormat === 'legacy' ? atob(stored) : await decryptFromLocalStorage(stored);
        } catch (error) {
          logger.error('[NORMAL WALLET] Failed to decrypt legacy/v1 key:', error);
          throw new Error(
            'Could not decrypt your local wallet key. Please re-import your wallet using your recovery phrase.'
          );
        }

        try {
          const password = await requestPassword('migrate');
          await storePrivateKey(decryptedKey, password);
          logger.log('[NORMAL WALLET] Migrated to v2 password encryption');
        } catch (error) {
          if (error instanceof Error && error.message === 'User cancelled password entry') {
            throw new Error('Password required to sign. Please try again.');
          }
          throw error;
        }

        return finalizeSign(decryptedKey);
      }

      // No local key at all — only possible for users whose wallet was created
      // under the removed platform-custody flow. They must re-import.
      throw new Error(NORMAL_WALLET_REIMPORT_REQUIRED_MESSAGE);
    },
    [persistStore.wallet.address, requestPassword]
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

  // Turnkey-managed wallets sign via passkey — no local key needed.
  const [isTurnkeyManaged, setIsTurnkeyManaged] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const addr = normalWalletStore.publicKey;
    if (!addr) {
      setIsTurnkeyManaged(false);
      return undefined;
    }
    isTurnkeyStellarAddress(addr).then((managed) => {
      if (!cancelled) setIsTurnkeyManaged(managed);
    });
    return () => {
      cancelled = true;
    };
  }, [normalWalletStore.publicKey]);

  // canSign is true when the wallet can sign transactions: a keypair is in
  // memory, a locally-stored key exists (v2, v1, or legacy) that
  // signTransaction can unlock on demand, or the address is Turnkey-managed
  // (passkey signing).
  const canSign = !!normalWalletStore.keypair || hasStoredNormalWalletKey() || isTurnkeyManaged;

  return {
    publicKey: normalWalletStore.publicKey,
    isConnected: normalWalletStore.isConnected,
    isConnecting: normalWalletStore.isConnecting,
    canSign,
    mnemonic: normalWalletStore.mnemonic,
    createWallet,
    importWalletFromMnemonic,
    importWalletFromPrivateKey,
    connectWallet,
    connectWalletWithoutKeypair,
    signTransaction,
    disconnectWallet,
  };
};
