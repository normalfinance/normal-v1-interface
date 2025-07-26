'use client';

import type { StateToken as Token } from '@normalfinance/types';

import { useState, useCallback } from 'react';
import { constants } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';
import { PoolRouterContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

export type PoolPosition = {
  pool_address: string;
  token_a: Token | undefined;
  token_b: Token | undefined;
  balance: BigNumber;
  lpPercentage: string;
  totalShares: string | BigNumber;
  status: string;
};

interface ReturnType {
  error: any | null;
  loading: boolean;
  positions: PoolPosition[] | undefined;
  fetchPositions: () => void;
}

// ----------------------------------------------------------------------

export function useLPTokens(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [positions, setPostions] = useState<PoolPosition[] | undefined>(undefined);
  const storePersist = usePersistStore();

  const fetchPositions = useCallback(async () => {
    // Add rate limit check
    if (storePersist.wallet.address) {
      const res = await fetch('/api/liquidity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: storePersist.wallet.address }),
      });
      if (res.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      const data = await res.json();
      if (!data.allowed) {
        throw new Error(data.error || 'Liquidity management not allowed');
      }
    }

    try {
      const PoolRouter = new PoolRouterContract.Client({
        contractId: constants.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.NETWORK_PASSPHRASE,
        rpcUrl: constants.RPC_URL,
      });

      const pools = await PoolRouter.query_all_pools_details();

      // if (pools.result && userTokens) {
      //   const userLpTokens = pools.result?.map((p: PoolRouterContract.PoolInfo) => {
      //     const match = userTokens.find(
      //       (token) => token.address === p.pool_response.token_share.address
      //     );

      //     if (!match || parseFloat(match.balance) === 0) return null;

      //     const details: PoolDetails = {
      //       poolInfo: {
      //         tokenA: {
      //           name: p.pool_response.pool.base_asset,
      //           iconUrl: getCryptoIconUrl(p.pool_response.pool.base_asset),
      //         },
      //         tokenB: {
      //           name: p.pool_response.pool.quote_asset,
      //           iconUrl: getCryptoIconUrl(p.pool_response.pool.quote_asset),
      //         },
      //         address: match.address,
      //       },
      //       metadata: {
      //         version: 'v1',
      //         feeTier: p.pool_response.pool.fee_fraction,
      //       },
      //       performance: {
      //         position: match.balance,
      //         fees: 0,
      //       },
      //     };
      //     return details;
      //   });

      //   setPostions(userLpTokens as any);
      // }
    } catch (e: any) {
      console.log(e);
      setError(e);
    }
    return;
  }, [storePersist.wallet.address]);

  // On component mount, fetch positions
  // useEffect(() => {
  //   fetchPositions();
  // }, [fetchPositions]);

  return {
    error,
    loading,
    positions,
    fetchPositions,
  };
}
