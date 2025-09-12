import { GetState, SetState } from 'zustand';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import type { ISupportedWallet } from '@creit.tech/stellar-wallets-kit';
import {
  HANA_ID,
  XBULL_ID,
  LOBSTR_ID,
  HanaModule,
  xBullModule,
  LobstrModule,
  FREIGHTER_ID,
  WalletNetwork,
  FreighterModule,
} from '@creit.tech/stellar-wallets-kit';

import {
  WalletConnectAllowedMethods,
  WalletConnectModule,
  WALLET_CONNECT_ID,
} from '@creit.tech/stellar-wallets-kit/modules/walletconnect.module';

import { LedgerModule, LEDGER_ID } from '@creit.tech/stellar-wallets-kit/modules/ledger.module';

import { Networks } from '@stellar/stellar-sdk';

export interface StellarWalletKitState {
  kit: StellarWalletsKit | null;
  isInitialized: boolean;
  publicKey: string | null;
  isConnected: boolean;
  selectedWallet: string | null;
  isConnecting: boolean;
  isModalOpen: boolean;
  connectionPromise: Promise<void> | null;

  initializeKit: () => void;
  setPublicKey: (publicKey: string | null) => void;
  setConnected: (connected: boolean) => void;
  setSelectedWallet: (wallet: string | null) => void;
  setConnecting: (connecting: boolean) => void;
  setModalOpen: (open: boolean) => void;
  setConnectionPromise: (promise: Promise<void> | null) => void;
  connectWallet: (persistStore?: any) => Promise<void>;
  signTransaction: (xdr: string) => Promise<string>;
  disconnectWallet: () => Promise<void>;
  getSupportedWallets: () => Promise<ISupportedWallet[]>;
  resetWalletKitState: () => void;
}

export function createStellarWalletKitActions(
  set: SetState<StellarWalletKitState>,
  get: GetState<StellarWalletKitState>
): StellarWalletKitState {
  const initializeKit = () => {
    const { isInitialized } = get();
    if (typeof window === 'undefined' || isInitialized) return;

    try {
      const kit = new StellarWalletsKit({
        network:
          process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'MAINNET'
            ? WalletNetwork.PUBLIC
            : WalletNetwork.TESTNET,
        modules: [
          new HanaModule(),
          new xBullModule(),
          new FreighterModule(),
          new LobstrModule(),
          new WalletConnectModule({
            url: 'https://normalfinance.io',
            projectId: 'c23b8cc582d9a0db289b74ddda7bfc6e',
            method: WalletConnectAllowedMethods.SIGN,
            description: 'Crypto Indexes',
            name: 'Normal Finance',
            icons: ['https://normalfinance.io/favicon.ico'],
            network:
              process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'MAINNET'
                ? WalletNetwork.PUBLIC
                : WalletNetwork.TESTNET,
          }),
          new LedgerModule(),
        ],
      });

      set({ kit, isInitialized: true });
    } catch (error) {
      console.error('Failed to initialize wallet kit:', error);
      set({ isInitialized: false });
    }
  };

  const connectWallet = async (persistStore?: any) => {
    const { isConnecting, isModalOpen, connectionPromise, kit } = get();

    if (typeof window === 'undefined') {
      throw new Error('Wallet connection not available on server-side');
    }

    if (isConnecting || isModalOpen) {
      if (connectionPromise) {
        await connectionPromise;
      }
      return;
    }

    if (!kit) {
      throw new Error('Failed to initialize wallet kit');
    }

    set({ isConnecting: true, isModalOpen: true });

    const newConnectionPromise = new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        kit.openModal({
          onWalletSelected: async (wallet: ISupportedWallet) => {
            try {
              kit.setWallet(wallet.id);
              set({ selectedWallet: wallet.id });

              const address = await kit.getAddress();

              set({
                publicKey: address.address,
                isConnected: true,
              });

              let walletType: string = 'stellar-wallets-kit';
              switch (wallet.id) {
                case HANA_ID:
                  walletType = 'hana-stellar-kit';
                  break;
                case XBULL_ID:
                  walletType = 'xbull-stellar-kit';
                  break;
                case FREIGHTER_ID:
                  walletType = 'freighter-stellar-kit';
                  break;
                case LOBSTR_ID:
                  walletType = 'lobstr-stellar-kit';
                  break;
                case WALLET_CONNECT_ID:
                  walletType = 'wallet-connect-stellar-kit';
                  break;
                case LEDGER_ID:
                  walletType = 'ledger-stellar-kit';
                  break;
                default:
                  walletType = 'stellar-wallets-kit';
                  break;
              }

              if (persistStore?.connectWallet) {
                await persistStore.connectWallet(address.address, walletType);
              }

              try {
                await kit.signMessage('Welcome to Normal Finance', {
                  networkPassphrase:
                    process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'MAINNET'
                      ? Networks.PUBLIC
                      : Networks.TESTNET,
                  address: address.address,
                });
              } catch (signError) {
                console.error('Failed to sign message:', signError);
              }

              resolve();
            } catch (error) {
              reject(error);
            }
          },
          onClosed: (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          },
        });
      }, 100);
    });

    set({ connectionPromise: newConnectionPromise });

    try {
      await newConnectionPromise;
    } catch (error) {
      throw error;
    } finally {
      set({
        isConnecting: false,
        isModalOpen: false,
        connectionPromise: null,
      });
    }
  };

  const signTransaction = async (xdr: string): Promise<string> => {
    const { kit, publicKey, selectedWallet } = get();

    if (typeof window === 'undefined') {
      throw new Error('Transaction signing not available on server-side');
    }

    if (!kit) {
      throw new Error('Failed to initialize wallet kit');
    }

    if (!publicKey) {
      throw new Error('No wallet connected');
    }

    if (!selectedWallet) {
      throw new Error('No wallet selected. Please connect your wallet first.');
    }

    try {
      const { signedTxXdr } = await kit.signTransaction(xdr, {
        networkPassphrase:
          process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'MAINNET'
            ? Networks.PUBLIC
            : Networks.TESTNET,
        address: publicKey,
      });

      return signedTxXdr;
    } catch (error) {
      throw error;
    }
  };

  const disconnectWallet = async () => {
    const { kit } = get();

    try {
      if (typeof window !== 'undefined' && kit?.disconnect) {
        await kit.disconnect();
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }

    set({
      publicKey: null,
      isConnected: false,
      selectedWallet: null,
      isConnecting: false,
      isModalOpen: false,
      connectionPromise: null,
    });
  };

  const getSupportedWallets = async (): Promise<ISupportedWallet[]> => {
    const { kit } = get();

    try {
      if (typeof window === 'undefined') {
        return [];
      }

      if (!kit) {
        return [];
      }

      const wallets = await kit.getSupportedWallets();
      return wallets;
    } catch (error) {
      return [];
    }
  };

  const resetWalletKitState = () => {
    const { kit, isInitialized } = get();
    set({
      publicKey: null,
      isConnected: false,
      selectedWallet: null,
      isConnecting: false,
      isModalOpen: false,
      connectionPromise: null,

      kit,
      isInitialized,
    });
  };

  return {
    kit: null,
    isInitialized: false,
    publicKey: null,
    isConnected: false,
    selectedWallet: null,
    isConnecting: false,
    isModalOpen: false,
    connectionPromise: null,

    initializeKit,
    setPublicKey: (publicKey) => set({ publicKey }),
    setConnected: (isConnected) => set({ isConnected }),
    setSelectedWallet: (selectedWallet) => set({ selectedWallet }),
    setConnecting: (isConnecting) => set({ isConnecting }),
    setModalOpen: (isModalOpen) => set({ isModalOpen }),
    setConnectionPromise: (connectionPromise) => set({ connectionPromise }),
    connectWallet,
    signTransaction,
    disconnectWallet,
    getSupportedWallets,
    resetWalletKitState,
  };
}
