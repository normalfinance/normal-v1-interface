import { ApiToken, AppStorePersist, Token, TokenActions, TokenState } from '@normalfinance/types';
import axios from 'axios';
import { usePersistStore } from '../store';
import {
  checkTrustline,
  constants,
  format,
  getReflectorExternalPrice,
  getTokenBalance,
  isNormalToken,
  isTestnet,
  logger,
} from '@normalfinance/utils';
import { BigNumber } from 'bignumber.js';

const fetchTokenBalance = async (token: ApiToken, address: string): Promise<BigNumber> => {
  let balance = BigNumber(0);

  try {
    // Check trustline
    const trustlineStatus = await checkTrustline(address, token.symbol, token.issuer);
    if (!trustlineStatus.exists) return balance;

    const rawBalance = await getTokenBalance(token.contract, address);
    balance = BigNumber(format.fTokenAmount(rawBalance, token.decimals));
  } catch (error) {
    logger.warn('[WALLET ACTIONS] Error getting API token balance:', error);
  }
  return balance;
};

const fetchTokenPrice = async (token: ApiToken): Promise<BigNumber> => {
  if (isNormalToken(token.issuer)) {
    const pairByToken = usePersistStore.getState().pairState.pairByToken;
    if (!pairByToken || !Object.keys(pairByToken).length) return BigNumber(0);

    const pair = pairByToken[token.contract];
    if (!pair) return BigNumber(0);

    const isTokenLong = token.contract === pair.tokens.long;

    return BigNumber(
      isTokenLong
        ? pair.collateral.collateralPercentLong
        : 1 - Number(pair.collateral.collateralPercentLong)
    );
  } else {
    let oraclePrice = BigNumber(0);

    try {
      const { price } = await getReflectorExternalPrice(token.symbol);
      oraclePrice = BigNumber(format.fTokenAmount(price, 14));
    } catch (error) {
      logger.error('Failed getting USDC oracle price: ', error);
      oraclePrice = BigNumber(1); // fallback
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
        // const lastFetched = usePersistStore.getState().tokenState.lastUpdated;
        // const refreshInterval = 1000 * 60 * 5; // 5 minutes

        const zeroTokenBalance = usePersistStore
          .getState()
          .tokenState.tokens.every((tkn) => tkn.balance === '0');

        // `if (lastFetched && !zeroTokenBalance && now - lastFetched < refreshInterval && !override) {
        //   return;
        // }`

        let tokens: ApiToken[] = [];

        // Load 3rd party tokens
        const tokenListName = isTestnet() ? 'tokenListTestnet' : 'tokenList';
        const { data: apiTokens } = await axios.get(
          `https://raw.githubusercontent.com/normalfinance/token-list/main/${tokenListName}.json`
        );
        if (apiTokens) tokens = tokens.concat(apiTokens.assets);

        // Load Normal tokens from Pairs
        const persistStore = usePersistStore.getState();

        persistStore.pairState.pairs.forEach((pair) => {
          // Long
          const longTkn: ApiToken = {
            symbol: `n${pair.asset}`,
            issuer: constants.StellarConfig.NORMAL_ISSUER,
            contract: pair.tokens.long,
            name: `Normal ${pair.asset}`,
            org: 'Normal',
            domain: 'normalfinance.io',
            icon: `https://cdn.normalapi.com/tokens/normal/n${pair.asset}.webp`,
            decimals: 7,
            featured: false,
          };

          // Short
          const shortTkn: ApiToken = {
            symbol: `n${pair.asset}SHORT`,
            issuer: constants.StellarConfig.NORMAL_ISSUER,
            contract: pair.tokens.short,
            name: `Normal ${pair.asset} Short`,
            org: 'Normal',
            domain: 'normalfinance.io',
            icon: `https://cdn.normalapi.com/tokens/normal/n${pair.asset}.webp`,
            decimals: 7,
            featured: false,
          };

          tokens = tokens.concat([longTkn, shortTkn]);
        });

        // Load all token info
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

        // TODO: add rate limiter

        let balance = BigNumber(0);

        if (walletAddress) balance = await fetchTokenBalance(token, walletAddress);

        const price = await fetchTokenPrice(token);

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
