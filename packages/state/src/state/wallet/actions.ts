import {
  ApiToken,
  AppStore,
  GetStateType,
  SetStateType,
  StateToken as Token,
  WalletActions,
} from '@normalfinance/types';
import {
  OracleRegistryContract,
  PoolRouterContract,
  SorobanTokenContract,
} from '@normalfinance/contracts';
import { usePersistStore } from '../store';
import { constants, getCryptoIconUrl } from '@normalfinance/utils';

export const createWalletActions = (
  setState: SetStateType,
  getState: GetStateType
): WalletActions => {
  return {
    tokens: [],

    getAllTokens: async (_allApiTokens: ApiToken[]) => {
      // If wallet is connected, use it, otherwise some demo account
      const appStorageValue = localStorage?.getItem('app-storage');

      let address: string = '';

      if (appStorageValue !== null) {
        try {
          const parsedValue = JSON.parse(appStorageValue);
          address = parsedValue?.state?.wallet?.address;
        } catch (error) {
          console.log('Error parsing app-storage value:', error);
        }
      }

      const poolRouter = new PoolRouterContract.Client({
        contractId: constants.StellarConfig.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      // Fetch all available tokens from chain
      const allPoolsDetails = await poolRouter.query_all_pools_details();

      // Parse results
      let parsedResults: PoolRouterContract.PoolInfo[] = allPoolsDetails.result;

      // NORMAL TOKENS
      const _allNormalTokens = parsedResults.map((pool) => pool.pool_response.token_a.address); // _allAssets

      const _allApiTokenAddressses = _allApiTokens.map((token) => token.contract);

      const allTokens = _allNormalTokens
        ? [..._allNormalTokens, ..._allApiTokenAddressses].map(async (token: string) => {
            await getState().fetchTokenInfo(token);
          })
        : [];

      await Promise.all(allTokens);

      // =================================================================

      const oracleRegistry = new OracleRegistryContract.Client({
        contractId: constants.StellarConfig.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      const _tokens = getState().tokens.map(async (token: Token) => {
        const price = await oracleRegistry.get_last_price({ asset: token?.symbol });

        return {
          ...token,
          name: token?.symbol === 'native' ? 'XLM' : token?.symbol,
          icon: getCryptoIconUrl(token?.symbol === 'native' ? 'XLM' : token?.symbol),
          usdValue: Number(Number(price.last_oracle_price).toFixed(2)),
          featured: false,
          percentageChange: 0,
        };
      });

      // Wait promise
      const _allTokens = await Promise.all(_tokens);
      setState((state: AppStore) => ({ tokens: _allTokens }));

      return _allTokens;
    },

    fetchTokenInfo: async (tokenAddress: string) => {
      let updatedTokenInfo: Token | undefined;

      // Check if account, server, and network passphrase are set
      if (!getState().server || !getState().networkPassphrase) {
        throw new Error('Missing account, server, or network passphrase');
      }

      const TokenContract = new SorobanTokenContract.Client({
        contractId: tokenAddress.toString(),
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      // BALANCE
      let balance: bigint;
      try {
        balance = (
          await TokenContract.balance({
            id: usePersistStore.getState().wallet.address!,
          })
        ).result;
      } catch (e) {
        balance = BigInt(0);
      }

      // SYMBOL
      let symbol: string;
      try {
        const _symbol: string =
          getState().tokens.find((token: Token) => token.id === tokenAddress)?.symbol ||
          (await TokenContract.symbol()).result;
        symbol = _symbol === 'native' ? 'XLM' : _symbol;
      } catch (e) {
        return;
      }

      // DECIMALS
      const decimals =
        getState().tokens.find((token: Token) => token.id === tokenAddress)?.decimals ||
        Number((await TokenContract.decimals()).result);

      // Update token balance
      setState((state: AppStore) => {
        const updatedTokens = state.tokens.map((token: Token) =>
          token.id === tokenAddress
            ? {
                ...token,
                balance,
                decimals,
                symbol,
              }
            : token
        );
        // If token couldnt be found, add it
        if (!updatedTokens.find((token: Token) => token.id === tokenAddress)) {
          updatedTokens.push({
            id: tokenAddress,
            balance,
            decimals,
            symbol: symbol === 'native' ? 'XLM' : symbol,
            name: '',
            icon: '',
            usdValue: 0,
            featured: false,
            percentageChange: 0,
          });
        }
        updatedTokenInfo = updatedTokens.find((token: Token) => token.id === tokenAddress);
        return { tokens: updatedTokens };
      });

      // eslint-disable-next-line consistent-return
      return updatedTokenInfo;
    },
  };
};
