import { Horizon } from '@stellar/stellar-sdk';
import { AppStorePersist, Token, TokenState, Wallet } from '@normalfinance/types';
import { usePersistStore } from '../store';
import { logger, getStellarConfigForNetwork } from '@normalfinance/utils';
import { useNetworkStore } from '../network/store';

export const createConnectWalletActions = () => {
  return {
    wallet: {
      address: undefined,
      activeChain: undefined,
      server: undefined,
      walletType: undefined,
    },
    // See PersistWalletActions.lastWalletType — written on connect, preserved
    // across disconnect (#32 chunk 1).
    lastWalletType: undefined,

    // This function stores wallet connection details after the Stellar Wallets Kit
    // has already handled the connection process
    connectWallet: async (walletAddress: string, walletType?: string) => {
      logger.log('[WALLET ACTIONS] Storing wallet connection details:', {
        walletAddress,
        walletType,
      });

      const currentNetwork = useNetworkStore.getState().network;
      const config = getStellarConfigForNetwork(currentNetwork);

      const activeChain = {
        id: currentNetwork,
        name: currentNetwork === 'testnet' ? 'Stellar Testnet' : 'Stellar Public',
        networkPassphrase: config.NETWORK_PASSPHRASE,
      };

      // Create a server object to connect to the blockchain
      const server = new Horizon.Server(config.HORIZON_URL, {
        allowHttp: config.HORIZON_URL.startsWith('http://'),
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
        lastWalletType: newState.walletType,
      }));

      logger.log('[WALLET ACTIONS] Wallet state updated successfully');

      return;
    },

    // Disconnect the wallet
    disconnectWallet: () => {
      // Update the state
      usePersistStore.setState((state: AppStorePersist) => {
        const tokensWithoutBalance = state.tokenState.tokens.map((tkn) => ({
          ...tkn,
          balance: '0',
        }));

        const tokensRecord = tokensWithoutBalance.reduce<Record<string, Token>>((acc, token) => {
          const key = token.contract;
          if (!acc[key]) acc[key] = token;
          else acc[key] = token;
          return acc;
        }, {});

        const newTokenState: TokenState = {
          tokens: tokensWithoutBalance,
          tokensByAddress: tokensRecord,
          lastUpdated: 0,
        };

        return {
          ...state,
          wallet: {
            address: undefined,
            activeChain: undefined,
            server: undefined,
            walletType: undefined,
          },
          // lastWalletType intentionally NOT cleared (carried by the spread):
          // it must survive disconnect so an empty slot stays distinguishable
          // from a fresh device (#32 chunk 1, finding #42).
          tokenState: newTokenState,
        };
      });
    },
  };
};
