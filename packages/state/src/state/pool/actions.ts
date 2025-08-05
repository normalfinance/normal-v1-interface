import { PoolRouterContract } from '@normalfinance/contracts';
import { GetStateType, SetStateType } from '@normalfinance/types';
import { constants } from '@normalfinance/utils';
import { captureException } from '@sentry/nextjs';

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
        const allPoolsDetails = await PoolRouter.query_all_pools_details();
        const parsedResults: PoolRouterContract.PoolInfo[] = allPoolsDetails.result;

        setState({ pools: parsedResults });

        return parsedResults;
      } catch (error: any) {
        captureException(error);
        return undefined;
      }
    },

    setPools: (_pools: PoolRouterContract.PoolInfo[]) => {
      setState({ pools: _pools });
    },

    getPool: async (asset: string) => {
      try {
        const pool = await PoolRouter.query_pool_details({ asset });

        if (pool.result) {
          return pool.result;
        }
      } catch (error: any) {
        captureException(error);
        return undefined;
      }
    },
  };
}
