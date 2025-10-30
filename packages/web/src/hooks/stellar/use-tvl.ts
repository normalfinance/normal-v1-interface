'use client';

import { BigNumber } from 'bignumber.js';
import { useState, useCallback } from 'react';
import { logger, constants } from '@normalfinance/utils';
import { PoolRouterContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  totalTVL: number | undefined;
  fetchTVL: (tokens: string[]) => void;
  fetchTotalTVL: () => void;
}

// ----------------------------------------------------------------------

export function useTVL(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [tvlByTokens, setTVLByTokens] = useState<Record<string, BigNumber> | undefined>(undefined);
  const [totalTVL, setTotalTVl] = useState<number | undefined>(undefined);

  const fetchTVL = useCallback(async (tokens: string[]) => {
    try {
      const PoolRouter = new PoolRouterContract.Client({
        contractId: constants.StellarConfig.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      const tvl = await PoolRouter.get_total_liquidity({ tokens });

      if (tvl.result) {
        const key = tokens.join(':');
        setTVLByTokens({
          ...tvlByTokens,
          [key]: BigNumber(tvl.result),
        });
      }
    } catch (e: any) {
      logger.log(e);
      setError(e);
    }
    return;
  }, []);

  const fetchTotalTVL = useCallback(async () => {
    // try {
    //   const PoolRouter = new PoolRouterContract.Client({
    //     contractId: constants.StellarConfig.POOL_ROUTER_ADDRESS,
    //     networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
    //     rpcUrl: constants.StellarConfig.RPC_URL,
    //   });
    //   const pools = await PoolRouter.get_pools();
    //   if (pools.result) {
    //     const LiquidityCalculator = new LiquidityCalculatorContract.Client({
    //       contractId: constants.StellarConfig.LIQUIDITY_CALCULATOR_ADDRESS,
    //       networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
    //       rpcUrl: constants.StellarConfig.RPC_URL,
    //     });
    //     const tvl = await LiquidityCalculator.get_liquidity({ pools: pools.result });
    //     if (tvl.result) {
    //       setTotalTVl(tvl.result);
    //     }
    //   }
    // } catch (e: any) {
    //   logger.log(e);
    //   setError(e);
    // }
    // return;
  }, []);

  return {
    error,
    loading,
    totalTVL,
    fetchTVL,
    fetchTotalTVL,
  };
}
