import {
  ApiToken,
  AppStorePersist,
  StateToken as Token,
  TokenActions,
  TokenState,
} from '@normalfinance/types';
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

async function fetchTokenBalance(token: ApiToken, address: string): Promise<number> {
  // Fetch the user's balance
  let balance = 0;
  try {
    const rawBalance = await getTokenBalance(token.contract, address);
    balance = Number(format.formatTokenAmount(rawBalance, token.decimals));
  } catch (error) {
    logger.warn('[WALLET ACTIONS] Error getting API token balance:', error);
    console.log({ error });
  }
  return balance;
}

async function fetchTokenPrices(token: ApiToken): Promise<number> {
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
    if (!pools || pools.length === 0) return 0;
    const pool = pools[0];

    return pool.prices.tokenA;
  } else {
    if (token.symbol === 'USDC') return 1; // FIXME: REMOVE THIS ASAP
    let oraclePrice = 0;
    try {
      const { price } = await getReflectorPubnetPrice(token.contract);
      oraclePrice = Number(format.formatTokenAmount(price, 14));
    } catch (error) {
      console.log({ error });
      // Some tokens might not have oracle prices
    }
    return oraclePrice;
  }
}

export const createTokenActions = (): TokenActions => {
  const initialState: TokenState = {
    tokens: [],
    tokensByAddress: {},
  };

  return {
    tokenState: initialState,

    getAllTokens: async () => {
      try {
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

        let balance = 0;

        if (walletAddress) balance = await fetchTokenBalance(token, walletAddress);

        const price = await fetchTokenPrices(token);

        // Update state
        usePersistStore.setState((state: AppStorePersist) => {
          const updatedTokens = state.tokenState.tokens.map((existingToken: Token) =>
            existingToken.contract === token.contract
              ? {
                  ...existingToken,
                  balance,
                  price,
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
              balance,
              price,
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
