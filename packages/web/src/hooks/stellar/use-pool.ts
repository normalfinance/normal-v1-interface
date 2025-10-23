'use client';

import type { PoolInfo } from '@normalfinance/types';

import { useState, useCallback } from 'react';
import { constants } from '@normalfinance/utils';
import { PoolContract, PoolRouterContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  // pool: any | undefined;
  fetchPoolByAddress: (poolAddress: string) => Promise<PoolInfo | undefined>;
  fetchPoolByRouter: (tokens: string[], pool_index: Buffer) => Promise<PoolInfo | undefined>;
}

// ----------------------------------------------------------------------

export function usePool(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // const [pool, setPool] = useState<any | undefined>(undefined);

  const fetchPoolByAddress = useCallback(
    async (poolAddress: string): Promise<PoolInfo | undefined> => {
      try {
        setError(null);
        setLoading(true);

        const Pool = new PoolContract.Client({
          contractId: poolAddress,
          networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
          rpcUrl: constants.StellarConfig.RPC_URL,
        });

        const [fee_fraction, reserves, pool_tokens, token_share, total_shares] = await Promise.all([
          Pool.get_fee_fraction(),
          Pool.get_reserves(),
          Pool.get_tokens(),
          Pool.share_id(),
          Pool.get_total_shares(),
        ]);

        const poolDetails: PoolInfo = {
          address: poolAddress,
          token_a: {
            address: pool_tokens?.result ? pool_tokens.result[0] : '',
            amount: reserves?.result ? reserves.result[0] : 0,
            symbol: 'nBTC', // FIXME:
          },
          token_b: {
            address: pool_tokens?.result ? pool_tokens.result[1] : '',
            amount: reserves?.result ? reserves.result[1] : 0,
            symbol: 'USDC', // FIXME:
          },
          token_share: {
            address: token_share?.result ? token_share.result : 0,
            amount: 0,
            symbol: 'LP Token',
          },
          total_shares: total_shares?.result ? total_shares.result : 0,
          fee_fraction: fee_fraction?.result ? fee_fraction.result : 0,
        };

        // setPool(poolDetails);
        return poolDetails;
      } catch (e: any) {
        setError(e);
      } finally {
        setLoading(false);
      }
      return undefined;
    },
    []
  );

  const fetchPoolByRouter = useCallback(
    async (tokens: string[], pool_index: Buffer): Promise<PoolInfo | undefined> => {
      try {
        setError(null);
        setLoading(true);

        const PoolRouter = new PoolRouterContract.Client({
          contractId: constants.StellarConfig.POOL_ROUTER_ADDRESS,
          networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
          rpcUrl: constants.StellarConfig.RPC_URL,
        });

        const poolInfo = await PoolRouter.get_info({ tokens, pool_index });

        if (poolInfo?.result) {
          const Pool = new PoolContract.Client({
            contractId: poolInfo.result,
            networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
            rpcUrl: constants.StellarConfig.RPC_URL,
          });

          const [fee_fraction, reserves, pool_tokens, token_share, total_shares] =
            await Promise.all([
              Pool.get_fee_fraction(),
              Pool.get_reserves(),
              Pool.get_tokens(),
              Pool.share_id(),
              Pool.get_total_shares(),
            ]);

          const poolDetails: PoolInfo = {
            address: poolInfo.result,
            token_a: {
              address: pool_tokens?.result ? pool_tokens.result[0] : '',
              amount: reserves?.result ? reserves.result[0] : 0,
              symbol: 'nBTC', // FIXME:
            },
            token_b: {
              address: pool_tokens?.result ? pool_tokens.result[1] : '',
              amount: reserves?.result ? reserves.result[1] : 0,
              symbol: 'USDC', // FIXME:
            },
            token_share: {
              address: token_share?.result ? token_share.result : 0,
              amount: 0,
              symbol: 'LP Token',
            },
            total_shares: total_shares?.result ? total_shares.result : 0,
            fee_fraction: fee_fraction?.result ? fee_fraction.result : 0,
          };

          // setPool(poolDetails);
          return poolDetails;
        }
      } catch (e: any) {
        setError(e);
      } finally {
        setLoading(false);
      }
      return undefined;
    },
    []
  );

  // On component mount, fetch pool
  // useEffect(() => {
  //   fetchPool();
  // }, [fetchPool]);

  return {
    error,
    loading,
    // pool,
    fetchPoolByAddress,
    fetchPoolByRouter,
  };
}
