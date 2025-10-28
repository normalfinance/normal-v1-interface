'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { Client as PoolRouterClient } from '@normalfinance/contracts/build/pool_router';

import { useState } from 'react';
import { constants } from '@normalfinance/utils';
import { TransactionType } from '@/types/transaction';
import { usePersistStore } from '@normalfinance/state';

import { useContractTransaction } from './use-contract-transaction';

export type DepositLiquidityArgs = Omit<Parameters<PoolRouterClient['deposit']>[0], 'user'>;
export type WithdrawLiquidityArgs = Omit<Parameters<PoolRouterClient['withdraw']>[0], 'user'>;

interface ReturnType {
  error: any | null;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  depositLiquidity: (args: DepositLiquidityArgs) => Promise<void>;
  withdrawLiquidity: (args: WithdrawLiquidityArgs) => Promise<void>;
}

export function useLiquidity(): ReturnType {
  const storePersist = usePersistStore();

  const { executeContractTransaction } = useContractTransaction();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const executeLiquidity = async (
    signedTransactionXDR: string,
    transactionType: string = 'Liquidity'
  ) => {
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
      throw new Error(data.error || 'Liquidity execution failed');
    }

    return data;
  };

  const rateLimitCheck = async () => {
    if (!storePersist.wallet.address) return;
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
  };

  const depositLiquidity = async (args: DepositLiquidityArgs) => {
    setLoading(true);

    await rateLimitCheck();

    const tokenA = storePersist.tokenState.tokensByAddress[args.tokens[0]];
    const tokenB = storePersist.tokenState.tokensByAddress[args.tokens[1]];

    const processedArgs = {
      ...args,
      user: storePersist.wallet.address!,
      desired_amounts: [
        BigInt((args.desired_amounts[0] * 10 ** tokenA.decimals).toFixed(0)),
        BigInt((args.desired_amounts[1] * 10 ** tokenB.decimals).toFixed(0)),
      ],
    };

    await executeContractTransaction({
      contractType: 'pool_router',
      contractAddress: constants.StellarConfig.POOL_ROUTER_ADDRESS,
      transactionDetails: {
        type: TransactionType.DEPOSIT_LIQUIDITY,
        token1: { name: tokenA.symbol, amount: args.desired_amounts[0] },
        token2: { name: tokenB.symbol, amount: args.desired_amounts[1] },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.deposit(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          // Get the unsigned transaction XDR and manually sign it with the wallet
          const unsignedXDR = tx.built?.toXDR();

          if (unsignedXDR) {
            // Use the safeSignTransaction function to sign the transaction
            const signedXDR = await client.options.signTransaction(unsignedXDR);

            const apiRes = await executeLiquidity(signedXDR, 'Deposit Liquidity');
            if (apiRes?.transactionHash) {
              (tx as any).hash = apiRes.transactionHash;
            }
          }

          return tx;
        }
      },
    });

    setLoading(false);
  };

  const withdrawLiquidity = async (args: WithdrawLiquidityArgs) => {
    setLoading(true);

    await rateLimitCheck();

    const processedArgs = {
      ...args,
      user: storePersist.wallet.address!,
      share_amount: BigInt((args.share_amount * 10 ** 7).toFixed(0)),
      min_amounts: args.min_amounts.map((amt) => BigInt((amt * 10 ** 7).toFixed(0))),
    };

    await executeContractTransaction({
      contractType: 'pool_router',
      contractAddress: constants.StellarConfig.POOL_ROUTER_ADDRESS,
      transactionDetails: {
        type: TransactionType.REMOVE_LIQUIDITY,
        token1: { name: 'Pool Token', amount: args.share_amount },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.withdraw(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          // Get the unsigned transaction XDR and manually sign it with the wallet
          const unsignedXDR = tx.built?.toXDR();

          if (unsignedXDR) {
            // Use the safeSignTransaction function to sign the transaction
            const signedXDR = await client.options.signTransaction(unsignedXDR);

            const apiRes = await executeLiquidity(signedXDR, 'Withdraw Liquidity');
            if (apiRes?.transactionHash) {
              (tx as any).hash = apiRes.transactionHash;
            }
          }

          return tx;
        }
      },
    });

    setLoading(false);
  };

  return {
    error,
    loading,
    setLoading,
    depositLiquidity,
    withdrawLiquidity,
  };
}
