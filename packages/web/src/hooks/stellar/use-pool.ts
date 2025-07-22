'use client';

import { constants } from '@normalfinance/utils';
import { useState, useEffect, useCallback } from 'react';
import { PoolContract, type PoolRouterContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  pool: PoolRouterContract.PoolInfo | undefined;
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
    fetchPool,
  };
}
