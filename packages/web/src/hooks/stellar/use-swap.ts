'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { Client as PoolClient } from '@normalfinance/contracts/build/pool';
import type { Client as PoolRouterClient } from '@normalfinance/contracts/build/pool_router';

import { useState } from 'react';
import { TransactionType } from '@/types/transaction';
import { usePersistStore } from '@normalfinance/state';
import { constants, sortTokenAddreses } from '@normalfinance/utils';

import { useContractTransaction } from './use-contract-transaction';

// ----------------------------------------------------------------------

export type EstimateSwapArgs = Parameters<PoolRouterClient['estimate_swap']>[0];
export type SwapArgs = Omit<Parameters<PoolRouterClient['swap']>[0], 'user'>;
export type SwapStrictReceiveArgs = Omit<Parameters<PoolClient['swap_strict_receive']>[0], 'user'>;

interface ReturnType {
  error: any | null;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  onEstimateSwap: (args: EstimateSwapArgs) => Promise<void>;
  onSwap: (args: SwapArgs) => Promise<void>;
  onSwapStrictReceive: (poolAddress: string, args: SwapStrictReceiveArgs) => Promise<void>;
}

// ----------------------------------------------------------------------

export function useSwap(): ReturnType {
  const {
    wallet,
    tokenState: { tokensByAddress },
    poolState: { pools },
  } = usePersistStore();

  const { executeContractTransaction } = useContractTransaction();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for async operations

  const executeSwap = async (signedTransactionXDR: string, transactionType: string = 'Swap') => {
    if (!wallet.address) return null;
    const res = await fetch('/api/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: wallet.address,
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

  const onEstimateSwap = async (args: EstimateSwapArgs) => {
    const { tokens: sortedTokens } = sortTokenAddreses(args.tokens[0], args.tokens[1]);

    const tokenIn = tokensByAddress[args.token_in];

    const processedArgs: Parameters<PoolRouterClient['estimate_swap']>[0] = {
      ...args,
      tokens: sortedTokens,
      in_amount: BigInt((args.in_amount * 10 ** tokenIn.decimals).toFixed(0)),
    };

    await executeContractTransaction({
      contractType: 'pool_router',
      contractAddress: constants.StellarConfig.POOL_ROUTER_ADDRESS,
      transactionDetails: {
        type: TransactionType.ESTIMATE_SWAP,
      },
      transactionFunction: async (client, restore) =>
        await client.estimate_swap(processedArgs, { simulate: !restore }),
    });
  };

  const onSwap = async (args: SwapArgs) => {
    const { tokens: sortedTokens } = sortTokenAddreses(args.tokens[0], args.tokens[1]);

    const tokenIn = tokensByAddress[args.token_in];
    const tokenOut = tokensByAddress[args.token_out];

    const processedArgs: Parameters<PoolRouterClient['swap']>[0] = {
      ...args,
      user: wallet.address!,
      tokens: sortedTokens,
      in_amount: BigInt((args.in_amount * 10 ** tokenIn.decimals).toFixed(0)),
      out_min: BigInt((args.out_min * 10 ** tokenOut.decimals).toFixed(0)),
    };

    await executeContractTransaction({
      contractType: 'pool_router',
      contractAddress: constants.StellarConfig.POOL_ROUTER_ADDRESS,
      transactionDetails: {
        type: TransactionType.SWAP,
        token1: { name: tokenIn.symbol, amount: args.in_amount },
        token2: { name: tokenOut.symbol, amount: args.out_min },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.swap(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          // Get the unsigned transaction XDR and manually sign it with the wallet
          const unsignedXDR = tx.built?.toXDR();

          if (unsignedXDR) {
            // Use the safeSignTransaction function to sign the transaction
            const signedXDR = await client.options.signTransaction(unsignedXDR);

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

  const onSwapStrictReceive = async (poolAddress: string, args: SwapStrictReceiveArgs) => {
    const pool = pools.find((p) => p.addresses.pool === poolAddress);

    if (!pool) return;

    const tokenIn = tokensByAddress[args.in_idx];
    const tokenOut = tokensByAddress[args.out_idx];

    const processedArgs: Parameters<PoolClient['swap_strict_receive']>[0] = {
      ...args,
      user: wallet.address!,
      out_amount: BigInt((args.out_amount * 10 ** tokenOut.decimals).toFixed(0)),
      in_max: BigInt((args.in_max * 10 ** tokenIn.decimals).toFixed(0)),
    };

    await executeContractTransaction({
      contractType: 'pool',
      contractAddress: poolAddress,
      transactionDetails: {
        type: TransactionType.SWAP,
        token1: { name: tokenIn.symbol, amount: args.in_max },
        token2: { name: tokenOut.symbol, amount: args.out_amount },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.swap_strict_receive(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          // Get the unsigned transaction XDR and manually sign it with the wallet
          const unsignedXDR = tx.built?.toXDR();

          if (unsignedXDR) {
            // Use the safeSignTransaction function to sign the transaction
            const signedXDR = await client.options.signTransaction(unsignedXDR);

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
    setLoading,
    onEstimateSwap,
    onSwap,
    onSwapStrictReceive,
  };
}
