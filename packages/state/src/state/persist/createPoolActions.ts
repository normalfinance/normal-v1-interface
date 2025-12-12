import { PoolContract, PoolRouterContract } from '@normalfinance/contracts';
import { AppStorePersist, PoolActions, Pool, PoolState, Address } from '@normalfinance/types';
import { constants, format, getTokenSymbol, logger, sortTokenAddreses } from '@normalfinance/utils';
import { usePersistStore } from '../store';
import { BigNumber } from 'bignumber.js';
import { u128 } from '@stellar/stellar-sdk/lib/contract';

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

async function getPoolDetails(poolAddress: string, poolIndex: Buffer) {
  const PoolClient = new PoolContract.Client({
    contractId: poolAddress,
    networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
    rpcUrl: constants.StellarConfig.RPC_URL,
  });

  const [feeResponse, reservesResponse, tokensResponse, tokenShareResponse, totalSharesResponse] =
    await Promise.all([
      PoolClient.get_fee_fraction(),
      PoolClient.get_reserves(),
      PoolClient.get_tokens(),
      PoolClient.share_id(),
      PoolClient.get_total_shares(),
    ]);

  // Tokens
  const tokens =
    tokensResponse && tokensResponse.result ? Array.from<Address>(tokensResponse.result) : [];

  // We can't render anything without the token addresses
  if (!tokens || !tokens.length) return;

  // Reserves
  const reserves =
    reservesResponse && reservesResponse.result ? Array.from<u128>(reservesResponse.result) : [];

  // We can't render anything without both reserves
  if (reserves.length !== 2) return;

  const reserveA = BigNumber(format.fTokenAmount(reserves[0], 7));
  const reserveB = BigNumber(format.fTokenAmount(reserves[1], 7));

  const priceA = reserveA.eq(0) || reserveB.eq(0) ? BigNumber(0) : reserveB.div(reserveA);
  const priceB = reserveA.eq(0) || reserveB.eq(0) ? BigNumber(0) : reserveA.div(reserveB);

  // LP Token
  const tokenShareAddress: Address =
    tokenShareResponse && tokenShareResponse.result ? tokenShareResponse.result : '';

  const tokenShareSymbol = tokenShareAddress
    ? ((await getTokenSymbol(tokenShareAddress)) ?? 'LP Token')
    : '';

  const totalShares =
    totalSharesResponse && totalSharesResponse.result
      ? BigNumber(format.fTokenAmount(totalSharesResponse.result, 7))
      : BigNumber(0);

  // Fee
  const fee = feeResponse && feeResponse.result ? Number(feeResponse.result) : 30;

  const poolDetails: Pool = {
    index: poolIndex,
    version: 'v1',
    fee,
    addresses: {
      pool: poolAddress,
      tokenA: tokens[0],
      tokenB: tokens[1],
      tokenShare: tokenShareAddress,
    },
    reserves: {
      tokenA: reserveA.toString(),
      tokenB: reserveB.toString(),
    },
    prices: {
      tokenA: priceA.toString(),
      tokenB: priceB.toString(),
    },
    shares: {
      address: tokenShareAddress,
      symbol: tokenShareSymbol,
      total: totalShares.toString(),
    },

    client: PoolClient,
  };

  return poolDetails;
}

export function createPoolActions(): PoolActions {
  const initialState: PoolState = {
    pools: [],
    poolsByTokens: {},
    lastUpdated: 0,
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
        const now = Date.now();
        const lastFetched = usePersistStore.getState().poolState.lastUpdated;
        const refreshInterval = 1000 * 60 * 5; // 5 minutes

        if (lastFetched && now - lastFetched < refreshInterval) {
          return;
        }

        // TODO: add rate limiter

        const tokensSetsCountResponse = await PoolRouter.get_tokens_sets_count();

        const tokensSetsEnd =
          tokensSetsCountResponse && tokensSetsCountResponse.result
            ? tokensSetsCountResponse.result
            : 3;

        const poolsForTokensRangeResponse = await PoolRouter.get_pools_for_tokens_range({
          start: 0,
          end: tokensSetsEnd,
        });

        // No pools found
        if (!poolsForTokensRangeResponse || !poolsForTokensRangeResponse.result) return;

        // Convert complex data structure to usable format
        const poolsData = extractInnerAddresses(poolsForTokensRangeResponse.result);

        if (!poolsData || !poolsData.length) return;

        const pools = await Promise.all(
          poolsData.map(async ({ address: poolAddress, index: poolIndex }) => {
            return await getPoolDetails(poolAddress, poolIndex);
          })
        );

        // Safely remove all undefined values
        const poolsFiltered = pools.filter(
          (r): r is NonNullable<typeof r> => r !== undefined && r !== null
        );

        // Map pools by their tokens
        const poolsByTokens = poolsFiltered.reduce<Record<string, Pool[]>>((acc, pool) => {
          const { tokens: sortedTokens } = sortTokenAddreses(
            pool.addresses.tokenA,
            pool.addresses.tokenB
          );
          const key = sortedTokens.join(':');
          if (!acc[key]) acc[key] = [];
          acc[key].push(pool);
          return acc;
        }, {});

        const newState: PoolState = {
          pools: poolsFiltered,
          poolsByTokens,
          lastUpdated: now,
        };

        // Update the state
        usePersistStore.setState((state: AppStorePersist) => ({
          ...state,
          poolState: newState,
        }));
      } catch (error) {
        logger.error('Failed to get all pools:', error);
      }
    },

    getPool: async (poolAddress: string) => {
      try {
        const pools = usePersistStore.getState().poolState.pools;
        const pool = pools.find((p) => p.addresses.pool === poolAddress);

        if (!pools || !pools.length || !pool) {
          return;
        }

        const poolDetails = await getPoolDetails(pool.addresses.pool, pool.index);

        // Update the state

        usePersistStore.setState((state: AppStorePersist) => {
          const updatedPools = state.poolState.pools.map((existingPool) =>
            existingPool.addresses.pool === poolAddress ? poolDetails : existingPool
          );

          // Safely remove all undefined values
          const poolsFiltered = updatedPools.filter(
            (r): r is NonNullable<typeof r> => r !== undefined && r !== null
          );

          // Map pools by their tokens
          const poolsByTokens = poolsFiltered.reduce<Record<string, Pool[]>>((acc, pool) => {
            const { tokens: sortedTokens } = sortTokenAddreses(
              pool.addresses.tokenA,
              pool.addresses.tokenB
            );
            const key = sortedTokens.join(':');
            if (!acc[key]) acc[key] = [];
            acc[key].push(pool);
            return acc;
          }, {});

          const newState: PoolState = {
            pools: poolsFiltered,
            poolsByTokens,
            lastUpdated: Date.now(),
          };

          return {
            ...state,
            poolState: newState,
          };
        });

        return;
      } catch (error) {
        logger.error('Error updating pool:', error);
        return;
      }
    },
  };
}
