'use client';

import type { StateToken as Token } from '@normalfinance/types';

import { captureException } from '@sentry/nextjs';
import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import { constants, getCryptoIconUrl } from '@normalfinance/utils';
import { PoolRouterContract, SorobanTokenContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

export type PoolPosition = {
  poolAddress: string;
  tokenAddress: string;
  tokenA: Token;
  tokenB: Token;
  balance: number;
  lpPercentage: string;
  totalShares: number;
  status: string;
  poolFee: string;
  poolVersion: string;
};

interface ReturnType {
  error: any | null;
  loading: boolean;
  positions: PoolPosition[] | undefined;
  fetchPositions: () => void;
}

// ----------------------------------------------------------------------

export function useLiquidityPositions(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [positions, setPostions] = useState<PoolPosition[] | undefined>(undefined);

  const fetchTokenInfoIntoPositions = async (
    poolInfo: PoolRouterContract.PoolInfo
  ): Promise<PoolPosition | undefined> => {
    // eslint-disable-next-line prefer-const
    let position: PoolPosition | undefined;

    // Check if account, server, and network passphrase are set
    // if (!getState().server || !getState().networkPassphrase) {
    //   throw new Error('Missing account, server, or network passphrase');
    // }

    const tokenAddress = poolInfo.pool_response.token_share.address;

    const TokenContract = new SorobanTokenContract.Client({
      contractId: tokenAddress.toString(),
      networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
      rpcUrl: constants.StellarConfig.RPC_URL,
    });

    // BALANCE
    let balance: bigint;
    try {
      balance = (
        await TokenContract.balance({
          id: usePersistStore.getState().wallet.address!,
        })
      ).result;
    } catch (e) {
      balance = BigInt(0);
    }

    // SYMBOL
    let symbol: string;
    try {
      symbol = (await TokenContract.symbol()).result;
    } catch (e) {
      return position;
    }

    // DECIMALS
    const decimals = Number((await TokenContract.decimals()).result);

    position = {
      poolAddress: poolInfo.pool_address,
      tokenAddress: poolInfo.pool_response.token_share.address,
      tokenA: {
        id: poolInfo.pool_response.token_a.address,
        decimals,
        symbol,
        name: `n${poolInfo.pool_response.pool.base_asset}`,
        icon: getCryptoIconUrl(poolInfo.pool_response.pool.base_asset),
        balance: BigInt(0),
        usdValue: 0,
        featured: false,
        percentageChange: 0,
      },
      tokenB: {
        id: poolInfo.pool_response.token_b.address,
        decimals,
        symbol,
        name: poolInfo.pool_response.pool.quote_asset,
        icon: getCryptoIconUrl(poolInfo.pool_response.pool.quote_asset),
        balance: BigInt(0),
        usdValue: 0,
        featured: false,
        percentageChange: 0,
      },
      balance: Number(balance),
      lpPercentage: (Number(balance) / Number(poolInfo.pool_response.token_share.amount)).toFixed(
        4
      ),
      totalShares: Number(poolInfo.pool_response.token_share.amount),
      status: 'Active',
      poolFee: (Number(poolInfo.pool_response.pool.fee_fraction) / 100).toString(),
      poolVersion: 'v1',
    };

    return position;
  };

  const fetchPositions = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const PoolRouter = new PoolRouterContract.Client({
        contractId: constants.StellarConfig.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      const allPoolsDetails = await PoolRouter.query_all_pools_details();

      // Parse results
      const parsedResults: PoolRouterContract.PoolInfo[] = allPoolsDetails.result;

      const allPositions = parsedResults
        ? parsedResults.map((poolInfo) => fetchTokenInfoIntoPositions(poolInfo))
        : [];

      const data = await Promise.all(allPositions);
      setPostions(data as PoolPosition[]);
    } catch (e: any) {
      captureException(e);
      setError(e);
    } finally {
      setLoading(false);
    }
    return;
  }, []);

  // On component mount, fetch positions
  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return {
    error,
    loading,
    positions,
    fetchPositions,
  };
}
