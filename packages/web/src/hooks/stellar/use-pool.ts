'use client';

import type { PoolInfo } from '@normalfinance/types';

import { useState, useCallback } from 'react';
import { constants, getOraclePrice, getTokenSymbol } from '@normalfinance/utils';
import { PoolContract, PoolRouterContract, PoolElasticContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  fetchPoolByAddress: (poolAddress: string) => Promise<PoolInfo | undefined>;
  fetchPoolByRouter: (tokens: string[], pool_index: Buffer) => Promise<PoolInfo | undefined>;
  fetchPoolsByPair: (tokens: string[]) => Promise<Map<string, string> | undefined>;
}

// ----------------------------------------------------------------------

export function usePool(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPoolByAddress = useCallback(
    async (poolAddress: string): Promise<PoolInfo | undefined> => {
      try {
        setError(null);
        setLoading(true);

        return await getPoolInfo(poolAddress, pool.result['pool_type']);
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

        const pool = await PoolRouter.get_info({ tokens, pool_index });

        if (pool?.result) {
          return await getPoolInfo(pool.result, pool.result['pool_type']);
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

  const fetchPoolsByPair = useCallback(
    async (tokens: string[]): Promise<Map<string, string> | undefined> => {
      try {
        setError(null);
        setLoading(true);

        const PoolRouter = new PoolRouterContract.Client({
          contractId: constants.StellarConfig.POOL_ROUTER_ADDRESS,
          networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
          rpcUrl: constants.StellarConfig.RPC_URL,
        });

        const pools = await PoolRouter.get_pools({ tokens });

        if (pools?.result) {
          return pools;
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

  return {
    error,
    loading,
    fetchPoolByAddress,
    fetchPoolByRouter,
    fetchPoolsByPair,
  };
}

const getPoolInfo = async (
  poolAddress: string,
  type: PoolRouterContract.LiquidityPoolType
): Promise<PoolInfo> => {
  let Pool: PoolContract.Client | PoolElasticContract.Client;

  if (type === 1) {
    // Constant Product
    Pool = new PoolContract.Client({
      contractId: poolAddress,
      networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
      rpcUrl: constants.StellarConfig.RPC_URL,
    });
  } else if (type === 2) {
    // Elastic
    Pool = new PoolElasticContract.Client({
      contractId: poolAddress,
      networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
      rpcUrl: constants.StellarConfig.RPC_URL,
    });
  } else {
    throw Error('Unsupported pool type');
  }

  const [fee_fraction, reserves, tokens, token_share, total_shares] = await Promise.all([
    Pool.get_fee_fraction(),
    Pool.get_reserves(),
    Pool.get_tokens(),
    Pool.share_id(),
    Pool.get_total_shares(),
  ]);

  const tokenASymbol = (await getTokenSymbol(tokens.result[0])) ?? 'Unknown';
  const tokenBSymbol = (await getTokenSymbol(tokens.result[1])) ?? 'Unknown';
  const tokenShareSymbol = (await getTokenSymbol(token_share.result)) ?? 'LP Token';

  const tokenAOraclePrice = await getOraclePrice(
    constants.StellarConfig.REFLECTOR_ORACLE_ADDRESS,
    tokenASymbol
  );
  const tokenBOraclePrice = await getOraclePrice(
    constants.StellarConfig.REFLECTOR_ORACLE_ADDRESS,
    tokenBSymbol
  );

  const poolDetails: PoolInfo = {
    address: poolAddress,
    token_a: {
      address: tokens?.result ? tokens.result[0] : '',
      amount: reserves?.result ? reserves.result[0] : 0,
      symbol: tokenASymbol,
      oraclePrice: tokenAOraclePrice.price,
    },
    token_b: {
      address: tokens?.result ? tokens.result[1] : '',
      amount: reserves?.result ? reserves.result[1] : 0,
      symbol: tokenBSymbol,
      oraclePrice: tokenBOraclePrice.price,
    },
    token_share: {
      address: token_share?.result ? token_share.result : 0,
      amount: 0,
      symbol: tokenShareSymbol,
    },
    total_shares: total_shares?.result ? total_shares.result : 0,
    fee_fraction: fee_fraction?.result ? fee_fraction.result : 0,
  };

  return poolDetails;
};
