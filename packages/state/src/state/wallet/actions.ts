import {
  ApiToken,
  AppStore,
  GetStateType,
  SetStateType,
  StateToken as Token,
  WalletActions,
} from '@normalfinance/types';
import axios from 'axios';
import { captureException } from '@sentry/nextjs';
import { PoolRouterContract } from '@normalfinance/contracts';
import { usePersistStore } from '../store';
import {
  constants,
  format,
  getCryptoIconUrl,
  getOraclePrice,
  getTokenBalance,
} from '@normalfinance/utils';

export const createWalletActions = (
  setState: SetStateType,
  getState: GetStateType
): WalletActions => {
  return {
    tokens: [],

    getAllTokens: async () => {
      // Load native token
      const xlm = await getState().fetchNativeTokenInfo();

      // Load Normal tokens
      const pools = await getState().getAllPools();

      const normalTokens = pools.map(
        async (pool) => await getState().fetchNormalTokenInfo(pool, xlm?.usdValue ?? 0)
      );
      await Promise.all(normalTokens);

      // Load API tokens
      let url = 'https://raw.githubusercontent.com/normalfinance/token-list/main/tokenList.json';
      if (constants.StellarConfig.RPC_URL.includes('testnet')) {
        url =
          'https://raw.githubusercontent.com/normalfinance/token-list/main/tokenListTestnet.json';
      }
      const { data: apiTokens } = await axios.get(url);
      const allApiTokens = apiTokens
        ? apiTokens.assets.map(async (token: ApiToken) => {
            await getState().fetchApiTokenInfo(token);
          })
        : [];
      await Promise.all(allApiTokens);

      // Return all tokens
      return await getState().tokens;
    },

    fetchNativeTokenInfo: async () => {
      try {
        let updatedTokenInfo: Token | undefined;

        const tokenAddress = constants.StellarConfig.XLM_ADDRESS;

        let balance: bigint;
        try {
          balance = await getTokenBalance(tokenAddress, usePersistStore.getState().wallet.address!);
        } catch (error) {
          balance = BigInt(0);
        }

        const { price } = await getOraclePrice(
          constants.StellarConfig.REFLECTOR_ORACLE_ADDRESS,
          'XLM'
        );

        const formattedBalance = Number(format.formatTokenAmount(balance));
        const formattedUsdValue = Number(format.formatTokenAmount(price, 14));

        // Update state
        setState((state: AppStore) => {
          const updatedTokens = state.tokens.map((token: Token) =>
            token.id === tokenAddress
              ? {
                  ...token,
                  balance: formattedBalance,
                  decimals: constants.StellarConfig.XLM_DECIMALS,
                  symbol: 'XLM',
                  usdValue: formattedUsdValue,
                }
              : token
          );
          // If token couldnt be found, add it
          if (!updatedTokens.find((token: Token) => token.id === tokenAddress)) {
            updatedTokens.push({
              id: tokenAddress,
              balance: formattedBalance,
              decimals: constants.StellarConfig.XLM_DECIMALS,
              symbol: 'XLM',
              name: 'Stellar Lumens',
              icon: getCryptoIconUrl('XLM'),
              usdValue: formattedUsdValue,
              featured: false,
              percentageChange: 0,
            });
          }
          updatedTokenInfo = updatedTokens.find((token: Token) => token.id === tokenAddress);
          return { tokens: updatedTokens };
        });

        // eslint-disable-next-line consistent-return
        return updatedTokenInfo;
      } catch (error) {
        captureException(error);
        return undefined;
      }
    },

    fetchNormalTokenInfo: async (pool: PoolRouterContract.PoolInfo, xlmPrice: number) => {
      try {
        let updatedTokenInfo: Token | undefined;

        const tokenAddress = pool.pool_response.token_a.address;

        let balance: bigint;
        try {
          balance = await getTokenBalance(tokenAddress, usePersistStore.getState().wallet.address!);
        } catch (error) {
          balance = BigInt(0);
        }

        const reserve_a = BigInt(pool.pool_response.token_a.amount);
        const reserve_b = BigInt(pool.pool_response.token_b.amount);
        let poolPrice = BigInt(0);
        if (reserve_a > 0 && reserve_b > 0) poolPrice = reserve_b / reserve_a;

        const symbol = `n${pool.pool_response.pool.base_asset}`;

        const formattedBalance = Number(format.formatTokenAmount(balance));
        const formattedUsdValue = Number(poolPrice) * xlmPrice;

        // Update state
        setState((state: AppStore) => {
          const updatedTokens = state.tokens.map((token: Token) =>
            token.id === tokenAddress
              ? {
                  ...token,
                  balance: formattedBalance,
                  decimals: 7,
                  symbol,
                  usdValue: formattedUsdValue,
                }
              : token
          );
          // If token couldnt be found, add it
          if (!updatedTokens.find((token: Token) => token.id === tokenAddress)) {
            updatedTokens.push({
              id: tokenAddress,
              balance: formattedBalance,
              decimals: 7,
              symbol,
              name: `Normal ${pool.pool_response.pool.base_asset}`,
              icon: getCryptoIconUrl(symbol),
              usdValue: formattedUsdValue,
              featured: false,
              percentageChange: 0,
            });
          }
          updatedTokenInfo = updatedTokens.find((token: Token) => token.id === tokenAddress);
          return { tokens: updatedTokens };
        });
        // eslint-disable-next-line consistent-return
        return updatedTokenInfo;
      } catch (error) {
        captureException(error);
        return undefined;
      }
    },

    fetchApiTokenInfo: async (apiToken: ApiToken) => {
      try {
        let updatedTokenInfo: Token | undefined;

        const tokenAddress = apiToken.contract.toString();

        let balance: bigint;
        try {
          balance = await getTokenBalance(tokenAddress, usePersistStore.getState().wallet.address!);
        } catch (error) {
          balance = BigInt(0);
        }

        const { price } = await getOraclePrice(
          constants.StellarConfig.REFLECTOR_ORACLE_ADDRESS,
          apiToken.code
        );

        const formattedBalance = Number(format.formatTokenAmount(balance));
        const formattedUsdValue = Number(format.formatTokenAmount(price, 14));

        // Update state
        setState((state: AppStore) => {
          const updatedTokens = state.tokens.map((token: Token) =>
            token.id === tokenAddress
              ? {
                  ...token,
                  balance: formattedBalance,
                  decimals: apiToken.decimals,
                  symbol: apiToken.code,
                  usdValue: formattedUsdValue,
                }
              : token
          );
          // If token couldnt be found, add it
          if (!updatedTokens.find((token: Token) => token.id === tokenAddress)) {
            updatedTokens.push({
              id: tokenAddress,
              balance: formattedBalance,
              decimals: apiToken.decimals || 7,
              symbol: apiToken.code,
              name: apiToken.name,
              icon: apiToken.icon,
              usdValue: formattedUsdValue,
              featured: false,
              percentageChange: 0,
            });
          }
          updatedTokenInfo = updatedTokens.find((token: Token) => token.id === tokenAddress);
          return { tokens: updatedTokens };
        });

        // eslint-disable-next-line consistent-return
        return updatedTokenInfo;
      } catch (error) {
        captureException(error);
        return undefined;
      }
    },
  };
};
