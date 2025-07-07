'use client';

import type { SingleStat } from '@/components/_explore-page-components/explore-stats/explore-stats';

import { constants } from '@normalfinance/utils';
import { useState, useEffect, useCallback } from 'react';
import { PoolRouterContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  stats: SingleStat[] | undefined;
  refreshStats: () => Promise<void>;
}

// ----------------------------------------------------------------------

export function usePoolsStats(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for async operations

  const [stats, setStats] = useState<SingleStat[] | undefined>(undefined);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const PoolRouter = new PoolRouterContract.Client({
        contractId: constants.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.NETWORK_PASSPHRASE,
        rpcUrl: constants.RPC_URL,
      });

      const [daily_volume, total_tvl, total_pools] = await Promise.all([
        PoolRouter.get_total_liquidity(),
      ]);

      if (daily_volume?.result) {
        const newStats = [
          { title: '1D Volume', total: daily_volume.result, percent: 100 },
          { title: 'Total TVL', total: total_tvl.result, percent: 47 },
          { title: 'Total Pools', total: total_pools.result, percent: -26 },
          { title: 'Total Indexes', total: 0, percent: 0 },
          { title: 'Total Index TVL', total: 0, percent: 0 },
        ];

        setStats(newStats);
      }
    } catch (e) {
      console.log(e);
      setError(e.toString());
    }

    setLoading(false);
    return;
  }, []);

  // On component mount, fetch Buffer
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    error,
    loading,
    stats,
    refreshStats: fetchStats,
  };
}
