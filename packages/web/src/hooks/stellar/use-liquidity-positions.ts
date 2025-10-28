'use client';

import type { PoolInfo, StateToken as Token } from '@normalfinance/types';

import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import { logger, getTokenBalance } from '@normalfinance/utils';

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
  const {
    tokenState: { tokens },
    poolState: { pools },
  } = usePersistStore();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [positions, setPostions] = useState<PoolPosition[] | undefined>(undefined);

  const fetchTokenInfoIntoPositions = async (pool: PoolInfo): Promise<PoolPosition | undefined> => {
    // eslint-disable-next-line prefer-const
    let position: PoolPosition | undefined;

    const tokenShareAddress = pool.tokenShare.address;

    // Find TokenA and TokenB
    const tokenA = tokens.find((tkn) => tkn.contract === pool.tokenA)!;
    const tokenB = tokens.find((tkn) => tkn.contract === pool.tokenA)!;

    let balance: bigint;
    try {
      balance = await getTokenBalance(
        tokenShareAddress,
        usePersistStore.getState().wallet.address!
      );
    } catch (e: any) {
      logger.log(e);
      setError(e.toString());
      balance = BigInt(0);
    }

    if (Number(balance) == 0) return position;

    // if (tokenA === undefined) {
    //   await
    // }

    position = {
      poolAddress: pool.address,
      tokenAddress: tokenShareAddress,
      tokenA,
      tokenB,
      balance: Number(balance),
      lpPercentage: (Number(balance) / pool.totalShares).toFixed(4),
      totalShares: Number(pool.totalShares),
      status: 'Active',
      poolFee: (pool.feeFraction / 100).toString(),
      poolVersion: 'v1',
    };

    return position;
  };

  const fetchPositions = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // const allPositions = pools.map((pool) => fetchTokenInfoIntoPositions(pool));

      const data = await Promise.all([]);

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
