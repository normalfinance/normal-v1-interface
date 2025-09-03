'use client';

import { constants } from '@normalfinance/utils';
import { useState, useEffect, useCallback } from 'react';
import { PoolRouterContract, LiquidityCalculatorContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  totalTVL: number | undefined;
  fetchTVL: () => void;
}

// ----------------------------------------------------------------------

export function useTotalTVL(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalTVL, setTotalTVl] = useState<number | undefined>(undefined);

  const fetchTVL = useCallback(async () => {
    try {
      const PoolRouter = new PoolRouterContract.Client({
        contractId: constants.StellarConfig.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      const pools = await PoolRouter.get_pools();

      if (pools.result) {
        const LiquidityCalculator = new LiquidityCalculatorContract.Client({
          contractId: constants.StellarConfig.LIQUIDITY_CALCULATOR_ADDRESS,
          networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
          rpcUrl: constants.StellarConfig.RPC_URL,
        });

        const tvl = await LiquidityCalculator.get_liquidity({ pools: pools.result });

        if (tvl.result) {
          setTotalTVl(tvl.result);
        }
      }
    } catch (e: any) {
      console.log(e);
      setError(e);
    }
    return;
  }, []);

  // On component mount, fetch total pools TVL
  useEffect(() => {
    fetchTVL();
  }, [fetchTVL]);

  return {
    error,
    loading,
    totalTVL,
    fetchTVL,
  };
}
