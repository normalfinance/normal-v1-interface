'use client';

import type { PoolTxRow } from '@/types/pools';

import { constants } from '@normalfinance/utils';
import { useState, useEffect, useCallback } from 'react';
import { PoolContract, type PoolRouterContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  pool: PoolRouterContract.PoolInfo | undefined;
  recentTransactions: PoolTxRow[] | undefined;
  fetchPool: () => void;
}

// ----------------------------------------------------------------------

export function usePool(poolAddress: string): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [pool, setPool] = useState<PoolRouterContract.PoolInfo | undefined>(undefined);

  const fetchPool = useCallback(async () => {
    try {
      const Pool = new PoolContract.Client({
        contractId: poolAddress,
        networkPassphrase: constants.NETWORK_PASSPHRASE,
        rpcUrl: constants.RPC_URL,
      });

      const res = await Pool.get_info();
      if (res.result) {
        console.log(res.result);
        setPool(res.result);
      }

      // const tx_builder = new TransactionBuilder(constants.TESTING_SOURCE, {
      //   fee: '1000',
      //   timebounds: { minTime: 0, maxTime: 0 },
      //   networkPassphrase: constants.NETWORK_PASSPHRASE,
      // });
      // tx_builder.addOperation(new Contract(poolAddress).call('get_info'));
      // const stellar_rpc = new rpc.Server(constants.RPC_URL);
      // const result = await stellar_rpc.simulateTransaction(tx_builder.build());
      // console.log(result);
      // if (rpc.Api.isSimulationSuccess(result)) {
      //   const val = scValToNative(result.result.retval);
      //   console.log(val);
      //   setPool(val);
      //   // return {
      //   //   pools: val,
      //   //   latestLedger: result.latestLedger,
      //   // };
      // } else {
      //   throw new Error(`Failed to fetch oralce decimals: ${result.error}`);
      // }
    } catch (e: any) {
      console.log(e);
      setError(e);
    }
  }, []);

  // On component mount, fetch pool
  useEffect(() => {
    fetchPool();
  }, [fetchPool]);

  return {
    error,
    loading,
    pool,
    recentTransactions,
    fetchPool,
  };
}

/**
 * Converts raw GraphQL pool history data to a list of PoolTxRow items.
 */
export function formatPoolHistory(data: any, txLimit: number): PoolTxRow[] {
  const parseAmount = (v: string | number) => parseFloat(v.toString());

  const swaps: PoolTxRow[] = data.swaps.map((s: any) => ({
    timestamp: s.timestamp,
    type: parseAmount(s.amountIn) > parseAmount(s.amountOut) ? 'Sell' : 'Buy',
    baseValue: parseAmount(s.amountIn),
    quoteValue: parseAmount(s.amountOut),
    wallet: s.user,
    txHash: s.txHash ?? '',
  }));

  const deposits: PoolTxRow[] = data.liquidity_deposits.map((d: any) => ({
    timestamp: d.timestamp,
    type: 'Deposit',
    baseValue: parseAmount(d.amountIn),
    quoteValue: parseAmount(d.amountOut),
    wallet: d.user,
    txHash: d.txHash ?? '',
  }));

  const withdrawals: PoolTxRow[] = data.liquidity_withdrawals.map((w: any) => ({
    timestamp: w.timestamp,
    type: 'Withdraw',
    baseValue: parseAmount(w.amountIn),
    quoteValue: parseAmount(w.amountOut),
    wallet: w.user,
    txHash: w.txHash ?? '',
  }));

  const allTxs = [...swaps, ...deposits, ...withdrawals];

  return allTxs.sort((a, b) => b.timestamp - a.timestamp).slice(0, txLimit);
}
