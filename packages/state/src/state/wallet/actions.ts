import {
  AppStore,
  GetStateType,
  SetStateType,
  StateToken as Token,
  WalletActions,
} from "@normalfinance/types";
import {
  NormalPoolRouterContract,
  SorobanTokenContract,
} from "@normalfinance/contracts";
import { usePersistStore } from "../store";
import {
  constants,
  Signer,
} from "@normalfinance/utils";

const getCategory = (name: string) => {
  switch (name.toLowerCase()) {
    case "usdc":
      return "Stable";

    default:
      return "Non-Stable";
  }
};

export const createWalletActions = (
  setState: SetStateType,
  getState: GetStateType
): WalletActions => {
  return {
    tokens: [],
    allTokens: [],

    getAllTokens: async () => {
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
    let parsedResults: NormalPoolRouterContract.LiquidityPoolInfo[];
    try {
      const publicKey = address || constants.TESTING_SOURCE.accountId();

      // Pool Router contract
      const poolRouterContract = new NormalPoolRouterContract.Client({
        publicKey,
        contractId: constants.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.NETWORK_PASSPHRASE,
        rpcUrl: constants.RPC_URL,
      });
      // Fetch all available tokens from chain
      const allPoolsDetails = await poolRouterContract.query_all_pools_details();

      // Parse results
      parsedResults = allPoolsDetails.result;
    } catch (e) {
      const publicKey = constants.TESTING_SOURCE.accountId();

      // Factory contract
      const poolRouterContract = new NormalPoolRouterContract.Client({
        publicKey,
        contractId: constants.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.NETWORK_PASSPHRASE,
        rpcUrl: constants.RPC_URL,
      });
      // Fetch all available tokens from chain
      const allPoolsDetails = await poolRouterContract.query_all_pools_details();
      // Parse results
      parsedResults = allPoolsDetails.result;
    }

    // Loop through all pools and get asset_a and asset_b addresses in an array
    const _allAssets = parsedResults
      .map((pool) => [pool.pool_response.asset_a.address, pool.pool_response.asset_b.address])
      // Flatten the array
      .reduce((acc: string[], curr: string[]) => [...acc, ...curr], [])
      // Remove duplicates
      .filter((_address, index, self) => self.indexOf(_address) === index);

    const allAssets = _allAssets
      ? _allAssets.map(async (asset) => {
          await getState().fetchTokenInfo(asset);
        })
      : [];

    await Promise.all(allAssets);

    const _tokens = getState()
      .tokens.filter((token: Token) => token?.symbol !== 'POOL' && token.isStakingToken !== true)
      .map(async (token: Token) => ({
        name: token?.symbol === 'native' ? 'XLM' : token?.symbol,
        icon: `/assets/icons/cryptoIcons/${
          token?.symbol === 'native' ? 'XLM' : token?.symbol.toLowerCase()
        }.svg`,
        amount: Number(token?.balance) / 10 ** token?.decimals,
        category: getCategory(token?.symbol === 'native' ? 'XLM' : token?.symbol),
        // usdValue: Number(await fetchTokenPrices(token?.symbol)).toFixed(2),
        usdValue: Number(token.balance).toFixed(2),
        contractId: token?.id,
      }));
    // Wait promise
    const _allTokens = await Promise.all(_tokens);
    setState((state: AppStore) => ({ allTokens: _allTokens }));
    return _allTokens;
  },

  fetchTokenInfo: async (tokenAddress: string, isStakingToken: boolean = false) => {
    let updatedTokenInfo: Token | undefined;
    // Check if account, server, and network passphrase are set
    if (!getState().server || !getState().networkPassphrase) {
      throw new Error('Missing account, server, or network passphrase');
    }
    // Token contract
    const TokenContract = new SorobanTokenContract.Client({
      contractId: tokenAddress.toString(),
      networkPassphrase: constants.NETWORK_PASSPHRASE,
      rpcUrl: constants.RPC_URL,
    });
    let balance: bigint;
    try {
      balance = (
        await TokenContract.balance({
          id: usePersistStore.getState().wallet.address!,
        })
      ).result;

      if (tokenAddress == 'CABCLZXGTOIZ75FFKDGVANUT665LO34DZM5LHHDNVEHDFTC5CY4UTIWQ') {
        balance +=
          (
            await getState().fetchTokenInfo(
              'CBSM6C6OZJN2CS27RFTTYZJNAGRZ4MFHWVSV6GKLMCOYTQXD6K7UEA2A'
            )
          )?.balance || BigInt(0);
      }
    } catch (e) {
      balance = BigInt(0);
    }
    let symbol: string;
    try {
      const _symbol: string =
        getState().tokens.find((token: Token) => token.id === tokenAddress)?.symbol ||
        (await TokenContract.symbol()).result;
      symbol = _symbol === 'native' ? 'XLM' : _symbol;
    } catch (e) {
      return;
    }
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
              isStakingToken,
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
          isStakingToken,
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
