import { ApiToken, AppStorePersist, NetworkConfig, Token, TokenActions, TokenState } from '@normalfinance/types';
import { usePersistStore } from '../store';
import { useNetworkStore } from '../network/store';
import {
  checkTrustline,
  constants,
  format,
  getReflectorExternalPrice,
  getStellarConfigForNetwork,
  getTokenBalance,
  logger,
} from '@normalfinance/utils';
import { BigNumber } from 'bignumber.js';

const fetchTokenBalance = async (token: ApiToken, address: string, config: NetworkConfig): Promise<BigNumber> => {
  let balance = BigNumber(0);

  try {
    // Check trustline
    const trustlineStatus = await checkTrustline(address, token.symbol, token.issuer, config);
    if (!trustlineStatus.exists) return balance;

    const rawBalance = await getTokenBalance(token.contract, address, config);
    balance = BigNumber(format.fTokenAmount(rawBalance, token.decimals));
  } catch (error) {
    logger.warn('[WALLET ACTIONS] Error getting API token balance:', error);
  }
  return balance;
};

const fetchTokenPrice = async (token: ApiToken, config: NetworkConfig): Promise<BigNumber> => {
  let oraclePrice = BigNumber(0);

  try {
    const { price } = await getReflectorExternalPrice(token.symbol, config);
    oraclePrice = BigNumber(format.fTokenAmount(price, 14));
  } catch (error) {
    logger.error('Failed getting oracle price: ', error);
    // Fallback to 1 for stablecoins
    if (token.symbol === 'USDC') {
      oraclePrice = BigNumber(1);
    }
  }

  return oraclePrice;
};

export const createTokenActions = (): TokenActions => {
  const initialState: TokenState = {
    tokens: [],
    tokensByAddress: {},
    lastUpdated: 0,
  };

  return {
    tokenState: initialState,

    getAllTokens: async (override: boolean = false) => {
      try {
        const now = Date.now();

        // Load tokens from local token list (runtime network-aware)
        const network = useNetworkStore.getState().network;
        const tokens: ApiToken[] = constants.getTokenListForNetwork(network);

        // Clear stale tokens from previous network before loading new ones
        usePersistStore.setState((state: AppStorePersist) => ({
          ...state,
          tokenState: { tokens: [], tokensByAddress: {}, lastUpdated: state.tokenState.lastUpdated },
        }));

        // Load all token info
        const persistStore = usePersistStore.getState();
        const allTokens = tokens
          ? tokens.map(async (token: ApiToken) => {
              await persistStore.updateTokenInfo(token);
            })
          : [];

        await Promise.all(allTokens);

        usePersistStore.setState((state: AppStorePersist) => {
          const newState: TokenState = {
            ...state.tokenState,
            lastUpdated: now,
          };

          return {
            ...state,
            tokenState: newState,
          };
        });

        return;
      } catch (error) {
        logger.error('Failed to get all tokens:', error);
        throw error;
      }
    },

    updateTokenInfo: async (token: ApiToken) => {
      try {
        // Get wallet address from persist store
        const walletAddress = usePersistStore.getState().wallet.address;
        const network = useNetworkStore.getState().network;
        const networkConfig = getStellarConfigForNetwork(network);


        // TODO: add rate limiter

        let balance = BigNumber(0);

        if (walletAddress) balance = await fetchTokenBalance(token, walletAddress, networkConfig);

        const price = await fetchTokenPrice(token, networkConfig);

        // Update state
        usePersistStore.setState((state: AppStorePersist) => {
          const updatedTokens = state.tokenState.tokens.map((existingToken: Token) =>
            existingToken.contract === token.contract
              ? {
                  ...existingToken,
                  balance: balance.toString(),
                  price: price.toString(),
                  percentageChange: 0,
                }
              : existingToken
          );

          // If token couldn't be found, add it
          if (
            !updatedTokens.find((updatedToken: Token) => updatedToken.contract === token.contract)
          ) {
            const newToken: Token = {
              ...token,
              balance: balance.toString(),
              price: price.toString(),
              percentageChange: 0,
            };
            updatedTokens.push(newToken);
          }

          const tokensRecord = updatedTokens.reduce<Record<string, Token>>((acc, token) => {
            const key = token.contract;
            if (!acc[key]) acc[key] = token;
            else acc[key] = token;
            return acc;
          }, {});

          const newState: TokenState = {
            tokens: updatedTokens,
            tokensByAddress: tokensRecord,
            lastUpdated: state.tokenState.lastUpdated,
          };

          return {
            ...state,
            tokenState: newState,
          };
        });

        return;
      } catch (error) {
        logger.error('Error updating token info:', error);
        return;
      }
    },
  };
};
