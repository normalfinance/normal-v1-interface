import {
  ApiToken,
  AppStore,
  GetStateType,
  SetStateType,
  StateToken as Token,
  WalletActions,
} from '@normalfinance/types';
import axios from 'axios';
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

        // Get wallet address from persist store
        const walletAddress = usePersistStore.getState().wallet.address;
        
        if (!walletAddress) {
          console.warn('[WALLET ACTIONS] No wallet address found, skipping native token fetch');
          return undefined;
        }
        
        console.log('[WALLET ACTIONS] Fetching native token for address:', walletAddress);

        let balance: bigint;
        try {
          balance = await getTokenBalance(tokenAddress, walletAddress);
        } catch (error) {
          console.warn('[WALLET ACTIONS] Error getting token balance:', error);
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
              featured: true,
            });
          }

          updatedTokenInfo = updatedTokens.find((token: Token) => token.id === tokenAddress);

          return {
            ...state,
            tokens: updatedTokens,
          };
        });

        return updatedTokenInfo;
      } catch (error) {
        console.error('Error fetching native token info:', error);
        return undefined;
      }
    },

    fetchNormalTokenInfo: async (pool: PoolRouterContract.PoolInfo, xlmPrice: number) => {
      try {
        let updatedTokenInfo: Token | undefined;

        // Use token_a address from the pool response (this is the actual token contract)
        const tokenAddress = pool.pool_response.token_a.address;

        // Get wallet address from persist store
        const walletAddress = usePersistStore.getState().wallet.address;
        
        if (!walletAddress) {
          console.warn('[WALLET ACTIONS] No wallet address found, skipping normal token fetch');
          return undefined;
        }
        
        console.log('[WALLET ACTIONS] Fetching normal token for address:', walletAddress, 'token:', tokenAddress);

        let balance: bigint;
        try {
          balance = await getTokenBalance(tokenAddress, walletAddress);
        } catch (error) {
          console.warn('[WALLET ACTIONS] Error getting normal token balance:', error);
          balance = BigInt(0);
        }

        // Calculate price using pool reserves
        const reserve_a = BigInt(pool.pool_response.token_a.amount);
        const reserve_b = BigInt(pool.pool_response.token_b.amount);
        let poolPrice = BigInt(0);
        if (reserve_a > 0 && reserve_b > 0) poolPrice = reserve_b / reserve_a;

        // Create the proper token symbol (e.g., "nBTC", "nETH", "nSOL")
        const symbol = `n${pool.pool_response.pool.base_asset}`;

        const decimals = 7; // Standard for Stellar tokens
        const formattedBalance = Number(format.formatTokenAmount(balance, decimals));
        const formattedUsdValue = Number(poolPrice) * xlmPrice;

        // Update state
        setState((state: AppStore) => {
          const updatedTokens = state.tokens.map((token: Token) =>
            token.id === tokenAddress
              ? {
                  ...token,
                  balance: formattedBalance,
                  decimals,
                  symbol,
                  name: `Normal ${pool.pool_response.pool.base_asset}`,
                  usdValue: formattedUsdValue,
                }
              : token
          );

          // If token couldnt be found, add it
          if (!updatedTokens.find((token: Token) => token.id === tokenAddress)) {
            updatedTokens.push({
              id: tokenAddress,
              balance: formattedBalance,
              decimals,
              symbol,
              name: `Normal ${pool.pool_response.pool.base_asset}`,
              icon: getCryptoIconUrl(symbol),
              usdValue: formattedUsdValue,
              featured: true, // Normal tokens are featured
            });
          }

          updatedTokenInfo = updatedTokens.find((token: Token) => token.id === tokenAddress);

          return {
            ...state,
            tokens: updatedTokens,
          };
        });

        return updatedTokenInfo;
      } catch (error) {
        console.error('Error fetching normal token info:', error);
        return undefined;
      }
    },

    fetchApiTokenInfo: async (apiToken: ApiToken) => {
      try {
        let updatedTokenInfo: Token | undefined;

        const tokenAddress = apiToken.contract;

        // Get wallet address from persist store
        const walletAddress = usePersistStore.getState().wallet.address;
        
        if (!walletAddress) {
          console.warn('[WALLET ACTIONS] No wallet address found, skipping API token fetch');
          return undefined;
        }
        
        console.log('[WALLET ACTIONS] Fetching API token for address:', walletAddress, 'token:', tokenAddress);

        let balance: bigint;
        try {
          balance = await getTokenBalance(tokenAddress, walletAddress);
        } catch (error) {
          console.warn('[WALLET ACTIONS] Error getting API token balance:', error);
          balance = BigInt(0);
        }

        let usdValue = 0;
        try {
          const { price } = await getOraclePrice(
            constants.StellarConfig.REFLECTOR_ORACLE_ADDRESS,
            apiToken.code
          );
          usdValue = Number(format.formatTokenAmount(price, 14));
        } catch (error) {
          // Some tokens might not have oracle prices
          usdValue = 0;
        }

        const formattedBalance = Number(format.formatTokenAmount(balance, apiToken.decimals));

        // Update state
        setState((state: AppStore) => {
          const updatedTokens = state.tokens.map((token: Token) =>
            token.id === tokenAddress
              ? {
                  ...token,
                  balance: formattedBalance,
                  decimals: apiToken.decimals,
                  symbol: apiToken.code,
                  name: apiToken.name,
                  usdValue,
                }
              : token
          );

          // If token couldnt be found, add it
          if (!updatedTokens.find((token: Token) => token.id === tokenAddress)) {
            updatedTokens.push({
              id: tokenAddress,
              balance: formattedBalance,
              decimals: apiToken.decimals,
              symbol: apiToken.code,
              name: apiToken.name,
              icon: apiToken.icon,
              usdValue,
              featured: false,
            });
          }

          updatedTokenInfo = updatedTokens.find((token: Token) => token.id === tokenAddress);

          return {
            ...state,
            tokens: updatedTokens,
          };
        });

        return updatedTokenInfo;
      } catch (error) {
        console.error('Error fetching API token info:', error);
        return undefined;
      }
    },
  };
};