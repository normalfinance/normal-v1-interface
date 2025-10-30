import { PoolContract, PoolRouterContract } from '@normalfinance/contracts';
import { AppStorePersist, PoolActions, Pool, PoolState } from '@normalfinance/types';
import {
  calculatePoolPrices,
  constants,
  format,
  getTokenSymbol,
  logger,
} from '@normalfinance/utils';
import { usePersistStore } from '../store';
import { BigNumber } from 'bignumber.js';

const SKIPPED_POOLS = ['CDCADRS4JAUPWO3BXERSUMUWEGBZO6TKBRMPKQUD3QLS2PGM7MV3FILX'];

/**
 * Parses a Vec<(Vec<Address>, Map<BytesN<32>, Address>)> into a flat list of inner Address values.
 */
function extractInnerAddresses(
  data: [string[], Map<any, string>][]
): { address: string; index: Buffer }[] {
  const result: { address: string; index: Buffer }[] = [];
  const seen = new Set<string>();

  for (const [, map] of data) {
    map.forEach((addr) => {
      const address = addr[1];
      const index = Buffer.from(addr[0]);
      if (!seen.has(address)) {
        seen.add(address);
        if (!SKIPPED_POOLS.includes(address)) {
          result.push({ address, index });
        }
      }
    });
  }

  return result;
}

export function createPoolActions(): PoolActions {
  const initialState: PoolState = {
    pools: [],
    poolsByTokens: {},
  };

  const PoolRouter = new PoolRouterContract.Client({
    contractId: constants.StellarConfig.POOL_ROUTER_ADDRESS,
    networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
    rpcUrl: constants.StellarConfig.RPC_URL,
  });

  return {
    poolState: initialState,

    getAllPools: async () => {
      try {
        const tokensSetsCount = await PoolRouter.get_tokens_sets_count();

        const poolsForTokensRange = await PoolRouter.get_pools_for_tokens_range({
          start: 0,
          end: tokensSetsCount?.result || 3,
        });

        const pools = extractInnerAddresses(poolsForTokensRange.result);

        const poolsWithDetails = await Promise.all(
          pools.map(async (pool) => {
            const { address, index } = pool;

            const Pool = new PoolContract.Client({
              contractId: address,
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

            const tokenA = tokens?.result ? tokens.result[0] : '';
            const tokenB = tokens?.result ? tokens.result[1] : '';
            const tokenAReserve = BigNumber(reserves?.result ? reserves.result[0] : 0);
            const tokenBReserve = BigNumber(reserves?.result ? reserves.result[1] : 0);

            const tokenShareSymbol = (await getTokenSymbol(token_share.result)) ?? 'LP Token';

            // Calculate price using pool reserves
            const poolPrices = calculatePoolPrices(tokenAReserve, tokenBReserve);

            const poolDetails: Pool = {
              address,
              index,
              tokenA,
              tokenB,
              reserves: {
                tokenA: Number(format.formatTokenAmount(tokenAReserve)),
                tokenB: Number(format.formatTokenAmount(tokenBReserve)),
              },
              prices: poolPrices,
              tokenShare: {
                address: token_share?.result ? token_share.result : 0,
                amount: 0,
                symbol: tokenShareSymbol,
              },
              totalShares: total_shares?.result
                ? Number(format.formatTokenAmount(total_shares.result, 7))
                : 0,
              feeFraction: fee_fraction?.result ? fee_fraction.result : 0,
              version: 'v1',
              client: Pool,
            };

            return poolDetails;
          })
        );

        const poolRecord = poolsWithDetails.reduce<Record<string, Pool[]>>((acc, pool) => {
          const key = [pool.tokenA, pool.tokenB].join(':');
          if (!acc[key]) acc[key] = [];
          acc[key].push(pool);
          return acc;
        }, {});

        const newState: PoolState = {
          pools: poolsWithDetails,
          poolsByTokens: poolRecord,
        };

        usePersistStore.setState((state: AppStorePersist) => ({
          ...state,
          poolState: newState,
        }));
      } catch (error) {
        logger.error('Failed to get all pools:', error);
      }
    },
  };
}
