import { PoolContract, PoolRouterContract } from '@normalfinance/contracts';
import { GetStateType, PoolInfo, SetStateType } from '@normalfinance/types';
import { constants, getTokenSymbol } from '@normalfinance/utils';

/**
 * Parses a Vec<(Vec<Address>, Map<BytesN<32>, Address>)> into a flat list of inner Address values.
 */
export function extractInnerAddresses(data: [string[], Map<any, string>][]): string[] {
  const result: string[] = [];

  for (const [, map] of data) {
    map.forEach((addr) => result.push(addr[1]));
  }

  return result;
}

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
        const tokensSetsCount = await PoolRouter.get_tokens_sets_count();

        const poolsForTokensRange = await PoolRouter.get_pools_for_tokens_range({
          start: 0,
          end: tokensSetsCount?.result || 3,
        });

        const poolAddresses = extractInnerAddresses(poolsForTokensRange.result);

        const poolsWithDetails = await Promise.all(
          poolAddresses.map(async (poolAddress) => {
            const Pool = new PoolContract.Client({
              contractId: poolAddress,
              networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
              rpcUrl: constants.StellarConfig.RPC_URL,
            });

            const [fee_fraction, reserves, tokens, token_share, total_shares] = await Promise.all([
              Pool.get_fee_fraction(),
              Pool.get_reserves(),
              Pool.get_tokens(),
              Pool.share_id(),
              Pool.get_total_shares(),
            ]);

            const tokenASymbol = (await getTokenSymbol(tokens.result[0])) ?? 'Unknown';
            const tokenBSymbol = (await getTokenSymbol(tokens.result[1])) ?? 'USDC';

            const poolDetails: PoolInfo = {
              address: poolAddress,
              token_a: {
                address: tokens?.result ? tokens.result[0] : '',
                amount: reserves?.result ? reserves.result[0] : 0,
                symbol: tokenASymbol,
              },
              token_b: {
                address: tokens?.result ? tokens.result[1] : '',
                amount: reserves?.result ? reserves.result[1] : 0,
                symbol: tokenBSymbol,
              },
              token_share: {
                address: token_share?.result ? token_share.result : 0,
                amount: 0,
                symbol: 'LP Token',
              },
              total_shares: total_shares?.result ? total_shares.result : 0,
              fee_fraction: fee_fraction?.result ? fee_fraction.result : 0,
            };

            return poolDetails;
          })
        );

        // const parsedResults: PoolInfo[] = allPoolsDetails.result;
        console.log(poolsForTokensRange.result);

        console.log({ poolsWithDetails });

        setState({ pools: poolsWithDetails });

        return poolsWithDetails;
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
