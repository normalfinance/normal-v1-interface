import { PoolRouterContract } from '@normalfinance/contracts';
import { GetStateType, PoolInfo, SetStateType } from '@normalfinance/types';
import { constants } from '@normalfinance/utils';

export function createPoolActions(setState: SetStateType, getState: GetStateType) {
  const PoolRouter = new PoolRouterContract.Client({
    contractId: constants.StellarConfig.POOL_ROUTER_ADDRESS,
    networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
    rpcUrl: constants.StellarConfig.RPC_URL,
  });

  return {
    pools: [],

    getAllPools: async () => {
      try {
        const allPoolsDetails = await PoolRouter.get_pools({ tokens: [] });
        const parsedResults: PoolInfo[] = allPoolsDetails.result;

        setState({ pools: parsedResults });

        return parsedResults;
      } catch (error: any) {
        return undefined;
      }
    },

    setPools: (_pools: PoolInfo[]) => {
      setState({ pools: _pools });
    },

    getPool: async (asset: string) => {
      try {
        const pool = await PoolRouter.get_pools({ tokens: [] });

        if (pool.result) {
          return pool.result;
        }
      } catch (error: any) {
        return undefined;
      }
    },
  };
}
