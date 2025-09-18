'use client';

import type { StateToken as Token } from '@normalfinance/types';

import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import { PoolRouterContract } from '@normalfinance/contracts';
import { format, constants, getTokenBalance, getCryptoIconUrl, logger } from '@normalfinance/utils';

// ----------------------------------------------------------------------

export type PoolPosition = {
  poolAddress: string;
  tokenAddress: string;
  tokenA: Token;
  tokenB: Token;
  balance: number;
  lpPercentage: string;
  totalShares: number;
  status: string;
  poolFee: string;
  poolVersion: string;
};

interface ReturnType {
  error: any | null;
  loading: boolean;
  positions: PoolPosition[] | undefined;
  fetchPositions: () => void;
}

// ----------------------------------------------------------------------

export function useLiquidityPositions(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [positions, setPostions] = useState<PoolPosition[] | undefined>(undefined);

  const fetchTokenInfoIntoPositions = async (
    poolInfo: PoolRouterContract.PoolInfo
  ): Promise<PoolPosition | undefined> => {
    // eslint-disable-next-line prefer-const
    let position: PoolPosition | undefined;

    const tokenAddress = poolInfo.pool_response.token_share.address;

    let balance: bigint;
    try {
      balance = await getTokenBalance(tokenAddress, usePersistStore.getState().wallet.address!);
    } catch (e: any) {
      logger.log(e);
      setError(e.toString());
      balance = BigInt(0);
    }

    if (Number(balance) == 0) return position;

    const normalTokenSymbol = format.formatNormalToken(
      poolInfo.pool_response.pool.base_asset,
      'with-n'
    );

    position = {
      poolAddress: poolInfo.pool_address,
      tokenAddress: poolInfo.pool_response.token_share.address,
      tokenA: {
        id: poolInfo.pool_response.token_a.address,
        decimals: 7,
        symbol: normalTokenSymbol,
        name: normalTokenSymbol,
        icon: getCryptoIconUrl(
          format.formatNormalToken(poolInfo.pool_response.pool.base_asset, 'without-n')
        ),
        balance: 0,
        usdValue: 0,
        featured: false,
        percentageChange: 0,
      },
      tokenB: {
        id: poolInfo.pool_response.token_b.address,
        decimals: 7,
        symbol: 'XLM',
        name: poolInfo.pool_response.pool.quote_asset,
        icon: getCryptoIconUrl(poolInfo.pool_response.pool.quote_asset),
        balance: 0,
        usdValue: 0,
        featured: false,
        percentageChange: 0,
      },
      balance: Number(balance),
      lpPercentage: (Number(balance) / Number(poolInfo.pool_response.token_share.amount)).toFixed(
        4
      ),
      totalShares: Number(poolInfo.pool_response.token_share.amount),
      status: 'Active',
      poolFee: (Number(poolInfo.pool_response.pool.fee_fraction) / 100).toString(),
      poolVersion: 'v1',
    };

    return position;
  };

  const fetchPositions = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const PoolRouter = new PoolRouterContract.Client({
        contractId: constants.StellarConfig.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      const allPoolsDetails = await PoolRouter.query_all_pools_details();

      // Parse results
      const parsedResults: PoolRouterContract.PoolInfo[] = allPoolsDetails.result;

      const allPositions = parsedResults
        ? parsedResults.map((poolInfo) => fetchTokenInfoIntoPositions(poolInfo))
        : [];

      const data = await Promise.all(allPositions);

      const userPositions = data.filter((e) => e !== undefined);
      setPostions(userPositions as PoolPosition[]);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
    return;
  }, []);

  // On component mount, fetch positions
  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return {
    error,
    loading,
    positions,
    fetchPositions,
  };
}
