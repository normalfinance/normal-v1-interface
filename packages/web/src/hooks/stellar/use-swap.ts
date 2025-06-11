'use client';

import type { Client as PoolClient } from '@normalfinance/contracts/build/pool';
import type { Client as PoolRouterClient } from '@normalfinance/contracts/build/pool_router';
import type { Client as PoolSwapFeeClient } from '@normalfinance/contracts/build/pool_swap_fee';

import { useState } from 'react';
import { constants } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';

import { useContractTransaction } from '../use-contract-transaction';

// ----------------------------------------------------------------------

export type EstimateSwapArgs = Parameters<PoolRouterClient['estimate_swap']>[0];
export type SwapArgs = Omit<Parameters<PoolSwapFeeClient['swap']>[0], 'user'>;
export type SwapStrictReceiveArgs = Omit<Parameters<PoolClient['swap_strict_receive']>[0], 'user'>;

interface ReturnType {
  error: any | null;
  loading: boolean;

  onEstimateSwap: (args: EstimateSwapArgs, token_in_decimals?: number) => Promise<void>;
  onSwap: (
    args: SwapArgs,
    token_in_decimals?: number,
    token_out_decimals?: number
  ) => Promise<void>;
  onSwapStrictReceive: (
    poolAddress: string,
    args: SwapStrictReceiveArgs,
    token_out_decimals?: number
  ) => Promise<void>;
}

// ----------------------------------------------------------------------

export function useSwap(): ReturnType {
  const storePersist = usePersistStore();

  const { executeContractTransaction } = useContractTransaction();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for async operations

  const onEstimateSwap = async (args: EstimateSwapArgs, token_in_decimals?: number) => {
    await executeContractTransaction({
      contractType: 'pool_router',
      contractAddress: constants.POOL_ROUTER_ADDRESS,
      transactionFunction: async (client, restore) =>
        client.estimate_swap(
          {
            ...args,
            in_amount: BigInt((args.in_amount * 10 ** (token_in_decimals || 7)).toFixed(0)),
          },
          { simulate: !restore }
        ),
    });
  };

  const onSwap = async (
    args: SwapArgs,
    token_in_decimals?: number,
    token_out_decimals?: number
  ) => {
    await executeContractTransaction({
      contractType: 'pool_swap_fee',
      contractAddress: constants.POOL_SWAP_FEE_ADDRESS,
      transactionFunction: async (client, restore) =>
        client.swap(
          {
            user: storePersist.wallet.address!,
            ...args,
            in_amount: BigInt((args.in_amount * 10 ** (token_in_decimals || 7)).toFixed(0)),
            out_min: BigInt((args.out_min * 10 ** (token_out_decimals || 7)).toFixed(0)),
          },
          { simulate: !restore }
        ),
    });
  };

  const onSwapStrictReceive = async (
    poolAddress: string,
    args: SwapStrictReceiveArgs,
    token_out_decimals?: number
  ) => {
    await executeContractTransaction({
      contractType: 'pool',
      contractAddress: poolAddress,
      transactionFunction: async (client, restore) =>
        client.swap_strict_receive(
          {
            user: storePersist.wallet.address!,
            ...args,
            out_amount: BigInt((args.out_amount * 10 ** (token_out_decimals || 7)).toFixed(0)),
          },
          { simulate: !restore }
        ),
    });
  };

  return {
    error,
    loading,
    onEstimateSwap,
    onSwap,
    onSwapStrictReceive,
  };
}
