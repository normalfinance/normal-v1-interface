'use client';

import type { PoolInfo, StateToken as Token } from '@normalfinance/types';

import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import { logger, format, getTokenBalance } from '@normalfinance/utils';

// ----------------------------------------------------------------------

export type PoolPosition = {
  pool: PoolInfo;
  tokenA: Token;
  tokenB: Token;
  balances: {
    tokenShare: number;
    tokenA: number;
    tokenB: number;
    feeA: number;
    feeB: number;
    reward: number;
  };
  usdValues: {
    tokenA: number;
    tokenB: number;
    feeA: number;
    feeB: number;
    reward: number;
  };
  lpPercentage: string;
  tokenSharePrice: number;
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
    wallet,
    tokenState: { tokens },
    poolState: { pools },
  } = usePersistStore();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [positions, setPostions] = useState<PoolPosition[] | undefined>(undefined);

  const fetchTokenInfoIntoPositions = async (pool: PoolInfo): Promise<PoolPosition | undefined> => {
    if (!wallet.address) {
      return undefined;
    }

    const tokenA = tokens.find((tkn) => tkn.contract === pool.tokenA);
    const tokenB = tokens.find((tkn) => tkn.contract === pool.tokenB);

    const userTokenShareBalance = await fetchTokenBalance(pool.tokenShare.address, wallet.address);

    if (!userTokenShareBalance) return undefined;

    if (!tokenA || !tokenB) {
      return undefined;
    }

    const totalReserveAValue = pool.reserves.tokenA * tokenA.price;
    const totalReserveBValue = pool.reserves.tokenB * tokenB.price;

    const lpPercentage = userTokenShareBalance / pool.totalShares;

    const positionTokenABalance = Number(
      format.formatTokenAmount(pool.reserves.tokenA * lpPercentage)
    );
    const positionTokenBBalance = Number(
      format.formatTokenAmount(pool.reserves.tokenB * lpPercentage)
    );

    const tokenAValue = positionTokenABalance * tokenA.price;
    const tokenBValue = positionTokenBBalance * tokenB.price;

    const tokenSharePrice = (totalReserveAValue + totalReserveBValue) / pool.totalShares;

    // const rewardTokenAddress = constants.StellarConfig.XLM_ADDRESS; // FIXME: pull from pool or pool router
    // const rewardToken = tokens.find((tkn) => tkn.contract === rewardTokenAddress);

    // const { result: userClaimableReward } = await pool.client.get_user_reward({
    //   user: wallet.address,
    // }); {Number(token.balance).toFixed(token.decimals)}

    const position: PoolPosition = {
      pool,
      tokenA,
      tokenB,
      balances: {
        tokenShare: userTokenShareBalance,
        tokenA: Number(format.formatTokenAmount(pool.reserves.tokenA * lpPercentage)),
        tokenB: Number(format.formatTokenAmount(pool.reserves.tokenB * lpPercentage)),
        feeA: 0, // TODO: how do we compute this?
        feeB: 0,
        reward: 0, // userClaimableReward ?? 0,
      },
      usdValues: {
        tokenA: tokenAValue,
        tokenB: tokenBValue,
        feeA: 0,
        feeB: 0,
        reward: 0, // userClaimableReward && rewardToken ? userClaimableReward * rewardToken.price : 0,
      },
      lpPercentage: lpPercentage.toFixed(4),
      tokenSharePrice,
    };

    return position;
  };

  const fetchPositions = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const allPositions = await Promise.all(
        pools.map(async (pool) => await fetchTokenInfoIntoPositions(pool))
      );

      const userPositions = allPositions.filter((e) => e !== undefined);

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

async function fetchTokenBalance(tokenAddress: string, address: string): Promise<number> {
  // Fetch the user's balance
  let balance = 0;
  try {
    const rawBalance = await getTokenBalance(tokenAddress, address);
    balance = Number(format.formatTokenAmount(rawBalance, 7));
  } catch (error) {
    logger.warn('[WALLET ACTIONS] Error getting API token balance:', error);
    console.log({ error });
  }
  return balance;
}
