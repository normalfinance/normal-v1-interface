'use client';

import BigNumber from 'bignumber.js';
import { constants } from '@normalfinance/utils';
import { useState, useEffect, useCallback } from 'react';
import { PoolRouterContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  tvl: BigNumber | undefined;
  refresh: (asset: string) => void;
}

// ----------------------------------------------------------------------

export function usePoolTVL(asset: string): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalTVL, setTotalTVl] = useState<BigNumber | undefined>(undefined);

  const fetchTVL = useCallback(async () => {
    try {
      const PoolRouter = new PoolRouterContract.Client({
        contractId: constants.StellarConfig.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      const tvl = await PoolRouter.get_total_liquidity({ asset });

      if (tvl.result) {
        setTotalTVl(BigNumber(tvl.result));
      }
    } catch (e: any) {
      console.log(e);
      setError(e);
    }
    return;
  }, []);

  // On component mount, fetch pool TVL
  useEffect(() => {
    fetchTVL();
  }, [fetchTVL]);

  return {
    error,
    loading,
    tvl: totalTVL,
    refresh: fetchTVL,
  };
}
