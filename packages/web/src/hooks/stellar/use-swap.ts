'use client';

import type { PoolSwapFeeContract } from '@normalfinance/contracts';
import type { Client as PoolClient } from '@normalfinance/contracts/build/pool';
import type { Client as PoolRouterClient } from '@normalfinance/contracts/build/pool_router';
import type { Client as PoolSwapFeeClient } from '@normalfinance/contracts/build/pool_swap_fee';

import { useState } from 'react';
import { constants } from '@normalfinance/utils';
import { TransactionType } from '@/types/transaction';
import { usePersistStore } from '@normalfinance/state';

import { useContractTransaction } from './use-contract-transaction';

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

const buyDirection: PoolSwapFeeContract.SwapDirection = {
  tag: 'Buy',
  values: undefined,
};

// ----------------------------------------------------------------------

export function useSwap(): ReturnType {
  const storePersist = usePersistStore();

  const { executeContractTransaction } = useContractTransaction();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for async operations

  const executeSwap = async (signedTransactionXDR: string, transactionType: string = 'Swap') => {
    if (!storePersist.wallet.address) return null;
    const res = await fetch('/api/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: storePersist.wallet.address,
        signedTransactionXDR,
        transactionType,
      }),
    });

    if (res.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Swap execution failed');
    }

    return data;
  };

  const onEstimateSwap = async (args: EstimateSwapArgs, token_in_decimals?: number) => {
    const buy = args.direction == buyDirection;
    const processedArgs = {
      ...args,
      in_amount: BigInt((args.in_amount * 10 ** (token_in_decimals || 7)).toFixed(0)),
    };

    await executeContractTransaction({
      contractType: 'pool_router',
      contractAddress: constants.StellarConfig.POOL_ROUTER_ADDRESS,
      transactionDetails: {
        type: TransactionType.SWAP,
        token1: { name: buy ? 'XLM' : `n${args.asset}`, amount: args.in_amount },
        token2: { name: buy ? `n${args.asset}` : 'XLM', amount: '' },
      },
      transactionFunction: async (client, restore) =>
        await client.estimate_swap(processedArgs, { simulate: !restore }),
    });
  };

  const onSwapWithFee = async (
    args: SwapArgs,
    token_in_decimals?: number,
    token_out_decimals?: number
  ) => {
    const buy = args.direction == buyDirection;
    const processedArgs = {
      user: storePersist.wallet.address!,
      ...args,
      in_amount: BigInt((args.in_amount * 10 ** (token_in_decimals || 7)).toFixed(0)),
      out_min: BigInt((args.out_min * 10 ** (token_out_decimals || 7)).toFixed(0)),
    };

    await executeContractTransaction({
      contractType: 'pool_swap_fee',
      contractAddress: constants.StellarConfig.POOL_SWAP_FEE_ADDRESS,
      transactionDetails: {
        type: TransactionType.SWAP,
        token1: { name: buy ? 'XLM' : `n${args.asset}`, amount: args.in_amount },
        token2: { name: buy ? `n${args.asset}` : 'XLM', amount: args.out_min },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.swap(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executeSwap(signedXDR, 'Pool Swap with Fee');
            if (apiRes?.transactionHash) {
              (tx as any).hash = apiRes.transactionHash;
            }
          }

          return tx;
        }
      },
    });
  };

  const onSwap = async (
    args: SwapArgs,
    token_in_decimals?: number,
    token_out_decimals?: number
  ) => {
    const buy = args.direction == buyDirection;
    const processedArgs = {
      user: storePersist.wallet.address!,
      ...args,
      in_amount: BigInt((args.in_amount * 10 ** (token_in_decimals || 7)).toFixed(0)),
      out_min: BigInt((args.out_min * 10 ** (token_out_decimals || 7)).toFixed(0)),
    };

    await executeContractTransaction({
      contractType: 'pool_router',
      contractAddress: constants.StellarConfig.POOL_ROUTER_ADDRESS,
      transactionDetails: {
        type: TransactionType.SWAP,
        token1: { name: buy ? 'XLM' : `n${args.asset}`, amount: args.in_amount },
        token2: { name: buy ? `n${args.asset}` : 'XLM', amount: args.out_min },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.swap(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executeSwap(signedXDR, 'Pool Router Swap');
            if (apiRes?.transactionHash) {
              (tx as any).hash = apiRes.transactionHash;
            }
          }

          return tx;
        }
      },
    });
  };

  const onSwapStrictReceive = async (
    poolAddress: string,
    args: SwapStrictReceiveArgs,
    token_out_decimals?: number
  ) => {
    const buy = args.direction == buyDirection;
    const processedArgs = {
      user: storePersist.wallet.address!,
      ...args,
      out_amount: BigInt((args.out_amount * 10 ** (token_out_decimals || 7)).toFixed(0)),
    };

    await executeContractTransaction({
      contractType: 'pool',
      contractAddress: poolAddress,
      transactionDetails: {
        type: TransactionType.SWAP,
        token1: { name: buy ? 'XLM' : '', amount: args.in_max },
        token2: { name: buy ? '' : 'XLM', amount: args.out_amount },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.swap_strict_receive(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executeSwap(signedXDR, 'Pool Swap Strict Receive');
            if (apiRes?.transactionHash) {
              (tx as any).hash = apiRes.transactionHash;
            }
          }

          return tx;
        }
      },
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
