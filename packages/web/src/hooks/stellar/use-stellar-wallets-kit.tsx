import { useState, useEffect } from 'react';
import {
  StellarWalletsKit,
  WalletNetwork,
  HanaModule,
  xBullModule,
  FreighterModule,
  LobstrModule,
  HANA_ID,
  XBULL_ID,
  FREIGHTER_ID,
  LOBSTR_ID,
  ISupportedWallet,
} from '@creit.tech/stellar-wallets-kit';
import { Networks } from '@stellar/stellar-sdk';
import { usePersistStore } from '@normalfinance/state';

// Initialize the Stellar Wallets Kit with all supported wallets
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
  ],
});

export const useStellarWalletsKit = () => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const persistStore = usePersistStore();

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const storedWalletType = persistStore.wallet.walletType;
        let walletId: string | null = null;
        
        // Map wallet types to kit IDs
        if (storedWalletType) {
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
            case 'lobster-stellar-kit':
              walletId = LOBSTR_ID;
              break;
          }
        }

        if (walletId) {
          console.log('[STELLAR WALLETS KIT] Restoring wallet:', walletId);
          kit.setWallet(walletId);
          setSelectedWallet(walletId);
        }

        const address = await kit.getAddress();
        if (address?.address) {
          setPublicKey(address.address);
          setIsConnected(true);
          console.log('[STELLAR WALLETS KIT] Existing connection found:', address.address);
        }
      } catch (error) {
        console.log('[STELLAR WALLETS KIT] No existing connection found:', error);
      }
    };

    checkConnection();
  }, [persistStore.wallet.walletType]);

  const connectWallet = async () => {
    try {
      console.log('[STELLAR WALLETS KIT] Opening wallet selection modal...');
      
      kit.openModal({
        onWalletSelected: async (wallet: ISupportedWallet) => {
          console.log('[STELLAR WALLETS KIT] Wallet selected:', wallet.name, 'ID:', wallet.id);
          
          kit.setWallet(wallet.id);
          setSelectedWallet(wallet.id);
          
          const address = await kit.getAddress();
          console.log('[STELLAR WALLETS KIT] Connected account:', address.address);
          
          setPublicKey(address.address);
          setIsConnected(true);

          // Map wallet ID to wallet type for storage
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
              walletType = 'lobster-stellar-kit';
              break;
          }

          // Store the wallet connection in persist store
          await persistStore.connectWallet(address.address, walletType);

          // Test message signing for verification
          try {
            const signature = await kit.signMessage('Welcome to Normal Finance', {
              networkPassphrase: 
                process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'MAINNET'
                  ? Networks.PUBLIC
                  : Networks.TESTNET,
              address: address.address,
            });

            console.log('[STELLAR WALLETS KIT] Message signing test successful');
          } catch (signError) {
            console.warn('[STELLAR WALLETS KIT] Message signing test failed:', signError);
          }
        },
        onClosed: (error) => {
          console.log('[STELLAR WALLETS KIT] Modal closed', error ? 'with error:' : 'by user', error);
        },
      });
    } catch (error) {
      console.error('[STELLAR WALLETS KIT] Error connecting wallet:', error);
      throw error;
    }
  };

  const signTransaction = async (xdr: string) => {
    console.log('[STELLAR WALLETS KIT] Signing transaction with address:', publicKey);
    console.log('[STELLAR WALLETS KIT] Selected wallet:', selectedWallet);
    
    if (!publicKey) {
      throw new Error('No wallet connected');
    }

    try {
      const { signedTxXdr } = await kit.signTransaction(xdr, {
        networkPassphrase: 
          process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'MAINNET'
            ? Networks.PUBLIC
            : Networks.TESTNET,
        address: publicKey,
      });
      
      console.log('[STELLAR WALLETS KIT] Transaction signed successfully');
      return signedTxXdr;
    } catch (error) {
      console.error('[STELLAR WALLETS KIT] Error signing transaction:', error);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    try {
      console.log('[STELLAR WALLETS KIT] Disconnecting wallet...');
      
      // Call kit's disconnect if available
      if (kit.disconnect) {
        await kit.disconnect();
      }
      
      setPublicKey(null);
      setIsConnected(false);
      setSelectedWallet(null);
      
      console.log('[STELLAR WALLETS KIT] Wallet disconnected successfully');
    } catch (error) {
      console.error('[STELLAR WALLETS KIT] Error during disconnect:', error);
      // Still update local state even if disconnect fails
      setPublicKey(null);
      setIsConnected(false);
      setSelectedWallet(null);
    }
  };

  const getSupportedWallets = async () => {
    try {
      const wallets = await kit.getSupportedWallets();
      console.log('[STELLAR WALLETS KIT] Supported wallets:', wallets);
      return wallets;
    } catch (error) {
      console.error('[STELLAR WALLETS KIT] Error getting supported wallets:', error);
      return [];
    }
  };

  return {
    kit,
    publicKey,
    isConnected,
    selectedWallet,
    connectWallet,
    signTransaction,
    disconnectWallet,
    getSupportedWallets,
  };
};
