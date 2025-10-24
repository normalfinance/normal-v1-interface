'use client';

import type { PoolInfo, StateToken as Token } from '@normalfinance/types';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { logger, getTokenBalance, getCryptoIconUrl } from '@normalfinance/utils';

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
  const { pools } = useAppStore();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [positions, setPostions] = useState<PoolPosition[] | undefined>(undefined);

  const fetchTokenInfoIntoPositions = async (pool: PoolInfo): Promise<PoolPosition | undefined> => {
    // eslint-disable-next-line prefer-const
    let position: PoolPosition | undefined;

    const tokenAddress = pool.token_share.address;

    let balance: bigint;
    try {
      balance = await getTokenBalance(tokenAddress, usePersistStore.getState().wallet.address!);
    } catch (e: any) {
      logger.log(e);
      setError(e.toString());
      balance = BigInt(0);
    }

    if (Number(balance) == 0) return position;

    position = {
      poolAddress: pool.address,
      tokenAddress: pool.token_share.address,
      tokenA: {
        id: pool.token_a.address,
        decimals: 7,
        symbol: pool.token_a.symbol,
        name: pool.token_a.symbol,
        icon: getCryptoIconUrl(pool.token_a.symbol),
        balance: 0,
        usdValue: 0,
        featured: false,
        percentageChange: 0,
      },
      tokenB: {
        id: pool.token_b.address,
        decimals: 7,
        symbol: pool.token_b.symbol,
        name: pool.token_b.symbol,
        icon: getCryptoIconUrl(pool.token_b.symbol),
        balance: 0,
        usdValue: 0,
        featured: false,
        percentageChange: 0,
      },
      balance: Number(balance),
      lpPercentage: (Number(balance) / Number(pool.total_shares)).toFixed(4),
      totalShares: Number(pool.total_shares),
      status: 'Active',
      poolFee: (Number(pool.fee_fraction) / 100).toString(),
      poolVersion: 'v1',
    };

    return position;
  };

  const fetchPositions = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const allPositions = pools.map((pool) => fetchTokenInfoIntoPositions(pool));

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
  }, [fetchPositions, pools]);

  return {
    error,
    loading,
    positions,
    fetchPositions,
  };
}
