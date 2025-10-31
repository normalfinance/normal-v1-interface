'use client';

import type { Pool, Token } from '@normalfinance/types';

import { BigNumber } from 'bignumber.js';
import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import {
  logger,
  format,
  constants,
  getTokenBalance,
  convertCoinToFiat,
} from '@normalfinance/utils';

// ----------------------------------------------------------------------

export type PoolPosition = {
  pool: Pool;
  tokenA: Token;
  tokenB: Token;
  balances: {
    tokenShare: BigNumber;
    tokenA: BigNumber;
    tokenB: BigNumber;
    feeA: BigNumber;
    feeB: BigNumber;
    reward: BigNumber;
  };
  usdValues: {
    tokenA: string;
    tokenB: string;
    feeA: string;
    feeB: string;
    reward: string;
  };
  lpPercentage: string;
  tokenSharePrice: BigNumber;
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

  const fetchTokenInfoIntoPositions = async (pool: Pool): Promise<PoolPosition | undefined> => {
    if (!wallet.address) {
      return undefined;
    }

    const tokenA = tokens.find((tkn) => tkn.contract === pool.addresses.tokenA);
    const tokenB = tokens.find((tkn) => tkn.contract === pool.addresses.tokenB);
    const rewardToken = tokens.find((tkn) => tkn.contract === constants.StellarConfig.XLM_ADDRESS);

    const tokenShareBalanceRaw = await fetchTokenBalance(pool.addresses.tokenShare, wallet.address);
    if (!tokenShareBalanceRaw || tokenShareBalanceRaw.eq(0)) return undefined;

    const tokenShareBalance = BigNumber(format.fTokenAmount(tokenShareBalanceRaw, 7));

    if (!tokenA || !tokenB) {
      return undefined;
    }

    const reserveABN = BigNumber(pool.reserves.tokenA);
    const reserveBBN = BigNumber(pool.reserves.tokenB);

    const totalReserveAValue = reserveABN.multipliedBy(tokenA.price);
    const totalReserveBValue = reserveBBN.multipliedBy(tokenB.price);

    const lpPercentage = tokenShareBalance.dividedBy(pool.shares.total);

    const positionTokenABalance = reserveABN.multipliedBy(lpPercentage);
    const positionTokenBBalance = reserveBBN.multipliedBy(lpPercentage);

    const tokenSharePrice = totalReserveAValue
      .plus(totalReserveBValue)
      .dividedBy(pool.shares.total);

    const feeA = BigNumber(0);
    const feeB = BigNumber(0);
    const claimableReward = BigNumber(0);

    const position: PoolPosition = {
      pool,
      tokenA,
      tokenB,
      balances: {
        tokenShare: tokenShareBalance,
        tokenA: reserveABN.multipliedBy(lpPercentage),
        tokenB: reserveBBN.multipliedBy(lpPercentage),
        feeA,
        feeB,
        reward: claimableReward,
      },
      usdValues: {
        tokenA: convertCoinToFiat(positionTokenABalance, BigNumber(tokenA.price)),
        tokenB: convertCoinToFiat(positionTokenBBalance, BigNumber(tokenB.price)),
        feeA: convertCoinToFiat(feeA, BigNumber(tokenA.price)),
        feeB: convertCoinToFiat(feeB, BigNumber(tokenB.price)),
        reward: rewardToken
          ? convertCoinToFiat(claimableReward, BigNumber(rewardToken.price))
          : '0',
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

      const poolPositions = await Promise.all(
        pools.map(async (pool) => await fetchTokenInfoIntoPositions(pool))
      );

      // Safely remove all undefined values
      const poolPositionsFiltered = poolPositions.filter(
        (r): r is NonNullable<typeof r> => r !== undefined && r !== null
      );

      setPostions(poolPositionsFiltered as PoolPosition[]);
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

const fetchTokenBalance = async (tokenAddress: string, address: string): Promise<BigNumber> => {
  let balance = BigNumber(0);
  try {
    const rawBalance = await getTokenBalance(tokenAddress, address);
    balance = BigNumber(rawBalance);
  } catch (error) {
    logger.warn('[WALLET ACTIONS] Error getting API token balance:', error);
  }
  return balance;
};
