import type { ISupportedWallet } from '@creit.tech/stellar-wallets-kit';

import { useState, useEffect, useRef } from 'react';
import { Networks } from '@stellar/stellar-sdk';
import { usePersistStore } from '@normalfinance/state';
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
  StellarWalletsKit,
} from '@creit.tech/stellar-wallets-kit';

let globalIsConnecting = false;
let globalIsModalOpen = false;
let globalConnectionPromise: Promise<void> | null = null;
let modalOpenCalls = 0;

let kit: StellarWalletsKit | null = null;
let kitInitialized = false;

const initializeKit = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (kitInitialized && kit) {
    return kit;
  }

  if (!kit && !kitInitialized) {
    kitInitialized = true;

    try {
      kit = new StellarWalletsKit({
        network:
          process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'MAINNET'
            ? WalletNetwork.PUBLIC
            : WalletNetwork.TESTNET,
        modules: [new HanaModule(), new xBullModule(), new FreighterModule(), new LobstrModule()],
      });
    } catch (error) {
      kitInitialized = false;
      kit = null;
    }
  }

  return kit;
};

export const useStellarWalletsKit = () => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const persistStore = usePersistStore();

  const connectWalletCalled = useRef(false);
  const connectionChecked = useRef(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (typeof window === 'undefined') return;

        if (connectionChecked.current) {
          return;
        }

        if (globalIsConnecting || isConnecting) {
          return;
        }

        if (isConnected && publicKey) {
          return;
        }

        connectionChecked.current = true;

        if (persistStore.wallet.address) {
          setPublicKey(persistStore.wallet.address);
          setIsConnected(true);

          const storedWalletType = persistStore.wallet.walletType;
          if (storedWalletType) {
            let walletId: string | null = null;
            switch (storedWalletType) {
              case 'hana':
              case 'hana-stellar-kit':
                walletId = HANA_ID;
                break;
              case 'xbull':
              case 'xbull-stellar-kit':
                walletId = XBULL_ID;
                break;
              case 'freighter':
              case 'freighter-stellar-kit':
                walletId = FREIGHTER_ID;
                break;
              case 'lobstr':
              case 'lobstr-stellar-kit':
                walletId = LOBSTR_ID;
                break;
              default:
                walletId = null;
                break;
            }
            if (walletId) {
              setSelectedWallet(walletId);

              const walletKit = initializeKit();
              if (walletKit) {
                try {
                  walletKit.setWallet(walletId);
                } catch (setWalletError) {
                  // Silent fail
                }
              }
            }
          }
          return;
        }

        const walletKit = initializeKit();
        if (!walletKit) return;

        const storedWalletType = persistStore.wallet.walletType;

        if (!storedWalletType) {
          return;
        }

        let walletId: string | null = null;
        switch (storedWalletType) {
          case 'hana':
          case 'hana-stellar-kit':
            walletId = HANA_ID;
            break;
          case 'xbull':
          case 'xbull-stellar-kit':
            walletId = XBULL_ID;
            break;
          case 'freighter':
          case 'freighter-stellar-kit':
            walletId = FREIGHTER_ID;
            break;
          case 'lobstr':
          case 'lobstr-stellar-kit':
            walletId = LOBSTR_ID;
            break;
          default:
            walletId = null;
            break;
        }

        if (walletId) {
          try {
            walletKit.setWallet(walletId);
            setSelectedWallet(walletId);

            await new Promise((resolve) => setTimeout(resolve, 500));

            const address = await walletKit.getAddress();
            if (address?.address) {
              setPublicKey(address.address);
              setIsConnected(true);

              if (address.address !== persistStore.wallet.address) {
                await persistStore.connectWallet(address.address, storedWalletType);
              }
            }
          } catch (restoreError) {
            // Silent fail
          }
        }
      } catch (error) {
        // Silent fail
      }
    };

    if (
      (persistStore.wallet.walletType || persistStore.wallet.address) &&
      !isConnected &&
      !isConnecting
    ) {
      checkConnection();
    }
  }, [
    persistStore.wallet.walletType,
    persistStore.wallet.address,
    isConnected,
    isConnecting,
    publicKey,
  ]);

  const connectWallet = async () => {
    try {
      if (typeof window === 'undefined') {
        throw new Error('Wallet connection not available on server-side');
      }

      if (connectWalletCalled.current) {
        return;
      }

      if (globalIsModalOpen || globalIsConnecting) {
        if (globalConnectionPromise) {
          await globalConnectionPromise;
        }
        return;
      }

      if (isModalOpen || isConnecting) {
        return;
      }

      connectWalletCalled.current = true;
      globalIsConnecting = true;
      globalIsModalOpen = true;
      setIsConnecting(true);
      setIsModalOpen(true);

      const walletKit = initializeKit();
      if (!walletKit) {
        throw new Error('Failed to initialize wallet kit');
      }

      modalOpenCalls++;

      globalConnectionPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          walletKit.openModal({
            onWalletSelected: async (wallet: ISupportedWallet) => {
              try {
                walletKit.setWallet(wallet.id);
                setSelectedWallet(wallet.id);

                const address = await walletKit.getAddress();

                setPublicKey(address.address);
                setIsConnected(true);

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
                  default:
                    walletType = 'stellar-wallets-kit';
                    break;
                }

                await persistStore.connectWallet(address.address, walletType);

                try {
                  await walletKit.signMessage('Welcome to Normal Finance', {
                    networkPassphrase:
                      process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'MAINNET'
                        ? Networks.PUBLIC
                        : Networks.TESTNET,
                    address: address.address,
                  });
                } catch (signError) {
                  // Silent fail
                }

                resolve();
              } catch (error) {
                reject(error);
              } finally {
                connectWalletCalled.current = false;
                globalIsConnecting = false;
                globalIsModalOpen = false;
                globalConnectionPromise = null;
                setIsConnecting(false);
                setIsModalOpen(false);
              }
            },
            onClosed: (error) => {
              connectWalletCalled.current = false;
              globalIsConnecting = false;
              globalIsModalOpen = false;
              globalConnectionPromise = null;
              setIsConnecting(false);
              setIsModalOpen(false);

              if (error) {
                reject(error);
              } else {
                resolve();
              }
            },
          });
        }, 100);
      });

      await globalConnectionPromise;
    } catch (error) {
      connectWalletCalled.current = false;
      globalIsConnecting = false;
      globalIsModalOpen = false;
      globalConnectionPromise = null;
      setIsConnecting(false);
      setIsModalOpen(false);
      throw error;
    }
  };

  const signTransaction = async (xdr: string) => {
    if (typeof window === 'undefined') {
      throw new Error('Transaction signing not available on server-side');
    }

    const walletKit = initializeKit();
    if (!walletKit) {
      throw new Error('Failed to initialize wallet kit');
    }

    if (!publicKey) {
      throw new Error('No wallet connected');
    }

    if (!selectedWallet) {
      throw new Error('No wallet selected. Please connect your wallet first.');
    }

    try {
      const { signedTxXdr } = await walletKit.signTransaction(xdr, {
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
    try {
      if (typeof window !== 'undefined') {
        const walletKit = initializeKit();
        if (walletKit?.disconnect) {
          await walletKit.disconnect();
        }
      }

      connectWalletCalled.current = false;
      connectionChecked.current = false;
      globalIsConnecting = false;
      globalIsModalOpen = false;
      globalConnectionPromise = null;
      setPublicKey(null);
      setIsConnected(false);
      setSelectedWallet(null);
      setIsConnecting(false);
      setIsModalOpen(false);
    } catch (error) {
      connectWalletCalled.current = false;
      connectionChecked.current = false;
      globalIsConnecting = false;
      globalIsModalOpen = false;
      globalConnectionPromise = null;
      setPublicKey(null);
      setIsConnected(false);
      setSelectedWallet(null);
      setIsConnecting(false);
      setIsModalOpen(false);
    }
  };

  const getSupportedWallets = async () => {
    try {
      if (typeof window === 'undefined') {
        return [];
      }

      const walletKit = initializeKit();
      if (!walletKit) {
        return [];
      }

      const wallets = await walletKit.getSupportedWallets();
      return wallets;
    } catch (error) {
      return [];
    }
  };

  return {
    kit: kit || null,
    publicKey,
    isConnected,
    selectedWallet,
    isConnecting,
    isModalOpen,
    connectWallet,
    signTransaction,
    disconnectWallet,
    getSupportedWallets,
  };
};
