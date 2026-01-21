import type { Pair } from '@normalfinance/types';

import BigNumber from 'bignumber.js';
import { useMemo, useState, useEffect, useCallback } from 'react';

import type { TreasuryBalances } from './use-treasury';
import { constants } from '@normalfinance/utils';

// return shape
type TreasuryLiquidityState = {
  balancesByPair: Record<string, TreasuryBalances>;
  liquidityValueByPair: Record<string, BigNumber>;
  totalLiquidityValue: BigNumber;
};

type UseTreasuryLiquidityArgs = {
  pairs: Pair[];
  tokensByAddress: Record<string, { price: BigNumber.Value } | undefined>;

  // you implement this (RPC / indexer / contract call)
  fetchTreasuryBalancesForPair: (pairAddress: string) => Promise<TreasuryBalances | undefined>;

  // optional refresh
  refreshMs?: number;
};

const ZERO_BALANCES: TreasuryBalances = {
  long: new BigNumber(0),
  short: new BigNumber(0),
  usdc: new BigNumber(0),
};

export function useTreasuryLiquidityByPair({
  pairs,
  tokensByAddress,
  fetchTreasuryBalancesForPair,
}: UseTreasuryLiquidityArgs) {
  const [balancesByPair, setBalancesByPair] = useState<Record<string, TreasuryBalances>>({});
  const [liquidityValueByPair, setLiquidityValueByPair] = useState<Record<string, BigNumber>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const usdcPrice = useMemo(() => {
    const p = tokensByAddress?.[constants.StellarConfig.USDC_ADDRESS]?.price;
    return p == null ? null : new BigNumber(p);
  }, [tokensByAddress]);

  const fetchAll = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      // Fetch balances concurrently
      const results = await Promise.all(
        pairs.map(async (pair) => {
          const balances = (await fetchTreasuryBalancesForPair(pair.pairAddress)) ?? ZERO_BALANCES;

          return { pair, balances };
        })
      );

      const nextBalancesByPair: Record<string, TreasuryBalances> = {};
      const nextLiquidityValueByPair: Record<string, BigNumber> = {};

      for (const { pair, balances } of results) {
        const longP = tokensByAddress?.[pair.tokens.long]?.price;
        const longPrice = new BigNumber(longP == null ? 0 : longP);

        const shortP = tokensByAddress?.[pair.tokens.short]?.price;
        const shortPrice = new BigNumber(shortP == null ? 0 : shortP);

        const uPrice = usdcPrice ?? new BigNumber(0);

        // Total USD value for this pair:
        // long + short valued at pair.price, usdc valued at usdcPrice
        const longValue = balances.long.multipliedBy(longPrice);
        const shortValue = balances.short.multipliedBy(shortPrice);
        const usdcValue = balances.usdc.multipliedBy(uPrice);

        const totalValue = longValue.plus(shortValue).plus(usdcValue);

        nextBalancesByPair[pair.pairAddress] = balances;
        nextLiquidityValueByPair[pair.pairAddress] = totalValue;
      }

      setBalancesByPair(nextBalancesByPair);
      setLiquidityValueByPair(nextLiquidityValueByPair);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [pairs, fetchTreasuryBalancesForPair, usdcPrice]);

  // Optional overall total across all pairs
  const totalLiquidityValue = useMemo(
    () => Object.values(liquidityValueByPair).reduce((acc, v) => acc.plus(v), new BigNumber(0)),
    [liquidityValueByPair]
  );

  // Initial fetch + optional polling
  useEffect(() => {
    if (!pairs?.length) return;
    fetchAll();
  }, [pairs?.length, fetchAll]);

  const state: TreasuryLiquidityState = {
    balancesByPair,
    liquidityValueByPair,
    totalLiquidityValue,
  };

  return { ...state, loading, error, refetch: fetchAll };
}
