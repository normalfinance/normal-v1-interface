import { GetState, SetState } from 'zustand';
import { Keypair, Networks, Transaction } from '@stellar/stellar-sdk';
import { logger } from '@normalfinance/utils';
import {
  generateWalletWithMnemonic,
  createWalletFromMnemonic,
  createKeypairFromSecret,
  validateMnemonic,
  validatePrivateKey,
  signTransactionWithKeypair,
  type MnemonicStrength,
} from '@normalfinance/utils';

export interface NormalWalletState {
  publicKey: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  keypair: Keypair | null;
  mnemonic: string | null;

  createWallet: (
    strength?: MnemonicStrength,
    passphrase?: string
  ) => Promise<{ publicKey: string; mnemonic: string }>;
  importWalletFromMnemonic: (
    mnemonic: string,
    passphrase?: string
  ) => Promise<{ publicKey: string }>;
  importWalletFromPrivateKey: (privateKey: string) => Promise<{ publicKey: string }>;
  connectWallet: (persistStore?: any) => Promise<void>;
  signTransaction: (xdr: string, networkPassphrase?: string) => Promise<string>;
  disconnectWallet: () => Promise<void>;
  setPublicKey: (publicKey: string | null) => void;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setKeypair: (keypair: Keypair | null) => void;
  setMnemonic: (mnemonic: string | null) => void;
  resetNormalWalletState: () => void;
}

export function createNormalWalletActions(
  set: SetState<NormalWalletState>,
  get: GetState<NormalWalletState>
): NormalWalletState {
  const createWallet = async (
    strength?: MnemonicStrength,
    passphrase?: string
  ): Promise<{ publicKey: string; mnemonic: string }> => {
    if (typeof window === 'undefined') {
      throw new Error('Wallet creation not available on server-side');
    }

    const { isConnecting } = get();
    if (isConnecting) {
      throw new Error('Wallet operation already in progress');
    }

    try {
      set({ isConnecting: true });

      const walletData = generateWalletWithMnemonic({ strength, passphrase });

      set({
        publicKey: walletData.publicKey,
        isConnected: true,
        keypair: walletData.keypair,
        mnemonic: walletData.mnemonic,
        isConnecting: false,
      });

      logger.log('[NORMAL WALLET] Wallet created successfully:', {
        publicKey: walletData.publicKey,
      });

      return {
        publicKey: walletData.publicKey,
        mnemonic: walletData.mnemonic,
      };
    } catch (error) {
      set({ isConnecting: false });
      logger.error('[NORMAL WALLET] Failed to create wallet:', error);
      throw error;
    }
  };

  const importWalletFromMnemonic = async (
    mnemonic: string,
    passphrase?: string
  ): Promise<{ publicKey: string }> => {
    if (typeof window === 'undefined') {
      throw new Error('Wallet import not available on server-side');
    }

    const { isConnecting } = get();
    if (isConnecting) {
      throw new Error('Wallet operation already in progress');
    }

    if (!validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    try {
      set({ isConnecting: true });

      const walletData = createWalletFromMnemonic(mnemonic, passphrase);

      set({
        publicKey: walletData.publicKey,
        isConnected: true,
        keypair: walletData.keypair,
        mnemonic: null,
        isConnecting: false,
      });

      logger.log('[NORMAL WALLET] Wallet imported from mnemonic successfully:', {
        publicKey: walletData.publicKey,
      });

      return {
        publicKey: walletData.publicKey,
      };
    } catch (error) {
      set({ isConnecting: false });
      logger.error('[NORMAL WALLET] Failed to import wallet from mnemonic:', error);
      throw error;
    }
  };

  const importWalletFromPrivateKey = async (privateKey: string): Promise<{ publicKey: string }> => {
    if (typeof window === 'undefined') {
      throw new Error('Wallet import not available on server-side');
    }

    const { isConnecting } = get();
    if (isConnecting) {
      throw new Error('Wallet operation already in progress');
    }

    if (!validatePrivateKey(privateKey)) {
      throw new Error('Invalid private key');
    }

    try {
      set({ isConnecting: true });

      const keypair = createKeypairFromSecret(privateKey);

      set({
        publicKey: keypair.publicKey(),
        isConnected: true,
        keypair,
        mnemonic: null,
        isConnecting: false,
      });

      logger.log('[NORMAL WALLET] Wallet imported from private key successfully:', {
        publicKey: keypair.publicKey(),
      });

      return {
        publicKey: keypair.publicKey(),
      };
    } catch (error) {
      set({ isConnecting: false });
      logger.error('[NORMAL WALLET] Failed to import wallet from private key:', error);
      throw error;
    }
  };

  const connectWallet = async (persistStore?: any): Promise<void> => {
    const { publicKey, keypair, isConnecting } = get();

    if (typeof window === 'undefined') {
      throw new Error('Wallet connection not available on server-side');
    }

    if (isConnecting) {
      return;
    }

    if (publicKey && keypair && persistStore) {
      await persistStore.connectWallet(publicKey, 'normal-wallet');
      return;
    }

    throw new Error('No wallet available. Please create or import a wallet first.');
  };

  const signTransaction = async (xdr: string, networkPassphrase?: string): Promise<string> => {
    const { keypair, publicKey } = get();

    if (typeof window === 'undefined') {
      throw new Error('Transaction signing not available on server-side');
    }

    if (!keypair) {
      throw new Error('No wallet connected');
    }

    if (!publicKey) {
      throw new Error('No public key available');
    }

    try {
      const passphrase =
        networkPassphrase ||
        (process.env.NEXT_PUBLIC_NETWORK?.toLowerCase() === 'mainnet'
          ? Networks.PUBLIC
          : Networks.TESTNET);

      logger.log('[NORMAL WALLET] signTransaction', {
        rawEnv: process.env.NEXT_PUBLIC_NETWORK,
        requestedPassphrase: networkPassphrase,
        resolvedPassphrase: passphrase,
        publicKey,
      });

      const signedXDR = signTransactionWithKeypair(xdr, keypair, passphrase);

      logger.log('[NORMAL WALLET] Transaction signed successfully');
      return signedXDR;
    } catch (error) {
      logger.error('[NORMAL WALLET] Failed to sign transaction:', error);
      throw error;
    }
  };

  const disconnectWallet = async (): Promise<void> => {
    try {
      set({
        publicKey: null,
        isConnected: false,
        keypair: null,
        mnemonic: null,
        isConnecting: false,
      });

      logger.log('[NORMAL WALLET] Wallet disconnected');
    } catch (error) {
      logger.error('[NORMAL WALLET] Error disconnecting wallet:', error);
      throw error;
    }
  };

  const resetNormalWalletState = () => {
    set({
      publicKey: null,
      isConnected: false,
      keypair: null,
      mnemonic: null,
      isConnecting: false,
    });
  };

  return {
    publicKey: null,
    isConnected: false,
    isConnecting: false,
    keypair: null,
    mnemonic: null,

    createWallet,
    importWalletFromMnemonic,
    importWalletFromPrivateKey,
    connectWallet,
    signTransaction,
    disconnectWallet,
    setPublicKey: (publicKey) => set({ publicKey }),
    setConnected: (isConnected) => set({ isConnected }),
    setConnecting: (isConnecting) => set({ isConnecting }),
    setKeypair: (keypair) => set({ keypair }),
    setMnemonic: (mnemonic) => set({ mnemonic }),
    resetNormalWalletState,
  };
}
