import { Horizon } from '@stellar/stellar-sdk';
import { AppStorePersist, Wallet } from '@normalfinance/types';
import { usePersistStore } from '../store';
import { constants, logger } from '@normalfinance/utils';

export const createConnectWalletActions = () => {
  return {
    wallet: {
      address: undefined,
      activeChain: undefined,
      server: undefined,
      walletType: undefined,
    },

    // This function stores wallet connection details after the Stellar Wallets Kit
    // has already handled the connection process
    connectWallet: async (walletAddress: string, walletType?: string) => {
      logger.log('[WALLET ACTIONS] Storing wallet connection details:', {
        walletAddress,
        walletType,
      });

      // Get the network details
      const network =
        (process.env.NEXT_PUBLIC_NETWORK ?? '').toUpperCase() === 'TESTNET' ? 'testnet' : 'public';

      const activeChain = {
        id: network,
        name: network === 'testnet' ? 'Stellar Testnet' : 'Stellar Public',
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
      };

      // Create a server object to connect to the blockchain
      const server = new Horizon.Server(constants.StellarConfig.HORIZON_URL, {
        allowHttp: constants.StellarConfig.HORIZON_URL.startsWith('http://'),
      });

      // Update the state to store the wallet address and server
      const newState: Wallet = {
        address: walletAddress,
        activeChain,
        server: server as any, // not the best fix
        walletType: (walletType as any) || 'stellar-wallets-kit',
      };
      usePersistStore.setState((state: AppStorePersist) => ({
        ...state,
        wallet: newState,
      }));

      logger.log('[WALLET ACTIONS] Wallet state updated successfully');

      // Check invite code status for this wallet address
      try {
        const persistStore = usePersistStore.getState();
        await persistStore.checkWalletInviteStatus(walletAddress);
      } catch (error) {
        logger.error('Error checking wallet invite status:', error);
      }

      return;
    },

    // Disconnect the wallet
    disconnectWallet: () => {
      // Update the state
      usePersistStore.setState((state: AppStorePersist) => ({
        ...state,
        wallet: {
          address: undefined,
          activeChain: undefined,
          server: undefined,
          walletType: undefined,
        },
      }));
    },
  };
};
