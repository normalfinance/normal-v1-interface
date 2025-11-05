import { ApiToken, AppStorePersist, Token, TokenActions, TokenState } from '@normalfinance/types';
import axios from 'axios';
import { usePersistStore } from '../store';
import {
  constants,
  format,
  getReflectorPubnetPrice,
  getTokenBalance,
  logger,
  sortTokenAddreses,
} from '@normalfinance/utils';
import { BigNumber } from 'bignumber.js';

const fetchTokenBalance = async (token: ApiToken, address: string): Promise<BigNumber> => {
  let balance = BigNumber(0);
  try {
    const rawBalance = await getTokenBalance(token.contract, address);
    balance = BigNumber(format.fTokenAmount(rawBalance, token.decimals));
  } catch (error) {
    logger.warn('[WALLET ACTIONS] Error getting API token balance:', error);
  }
  return balance;
};

const fetchTokenPrices = async (token: ApiToken): Promise<BigNumber> => {
  // Oracle price
  let isNormalToken = token.issuer === constants.StellarConfig.NORMAL_TOKEN_ISSUER;

  if (isNormalToken) {
    // Compute price from the pool
    const { tokens: sortedTokens } = sortTokenAddreses(
      token.contract,
      constants.StellarConfig.USDC_ADDRESS
    );
    const tokensKey = sortedTokens.join(':');

    const pools = usePersistStore.getState().poolState.poolsByTokens[tokensKey];
    if (!pools || pools.length === 0) return BigNumber(0);
    const pool = pools[0];

    return BigNumber(pool.prices.tokenA);
  } else {
    if (token.symbol === 'USDC') return BigNumber(1); // FIXME: REMOVE THIS ASAP
    let oraclePrice = BigNumber(0);
    try {
      const { price } = await getReflectorPubnetPrice(token.contract);
      oraclePrice = BigNumber(format.fTokenAmount(price, 14));
    } catch (error) {
      console.log({ error });
      // Some tokens might not have oracle prices
    }
    return oraclePrice;
  }
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
        const lastFetched = usePersistStore.getState().tokenState.lastUpdated;
        const refreshInterval = 1000 * 60 * 5; // 5 minutes

        const zeroTokenBalance = usePersistStore
          .getState()
          .tokenState.tokens.every((tkn) => tkn.balance === '0');

        if (lastFetched && !zeroTokenBalance && now - lastFetched < refreshInterval && !override) {
          return;
        }

        let tokens: ApiToken[] = [];

        // Load 3rd party tokens
        const { data: apiTokens } = await axios.get(
          'https://raw.githubusercontent.com/normalfinance/token-list/main/tokenList.json'
        );
        if (apiTokens) tokens = tokens.concat(apiTokens.assets);

        // Load Normal tokens
        const { data: normalTokens } = await axios.get(
          'https://raw.githubusercontent.com/normalfinance/token-list/main/normalTokenList.json'
        );
        if (normalTokens) tokens = tokens.concat(normalTokens.assets);

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

        logger.log(
          '[WALLET ACTIONS] Fetching API token for address:',
          walletAddress,
          'token:',
          token.contract
        );

        let balance = BigNumber(0);

        if (walletAddress) balance = await fetchTokenBalance(token, walletAddress);

        const price = await fetchTokenPrices(token);

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
