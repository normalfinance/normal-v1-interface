'use client';

import type { Client } from '@normalfinance/contracts/build/pool_router';

import { useState } from 'react';
import { constants } from '@normalfinance/utils';
import { TransactionType } from '@/types/transaction';
import { usePersistStore } from '@normalfinance/state';

import { useContractTransaction } from './use-contract-transaction';

export type DepositLiquidityArgs = Omit<Parameters<Client['deposit']>[0], 'user'>;
export type WithdrawLiquidityArgs = Omit<Parameters<Client['withdraw']>[0], 'user'>;

interface ReturnType {
  error: any | null;
  loading: boolean;
  depositLiquidity: (args: DepositLiquidityArgs) => Promise<void>;
  withdrawLiquidity: (args: WithdrawLiquidityArgs) => Promise<void>;
}

export function useLiquidity(): ReturnType {
  const storePersist = usePersistStore();

  const { executeContractTransaction } = useContractTransaction();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

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
    await rateLimitCheck();

    const processedArgs = {
      ...args,
      user: storePersist.wallet.address!,
      token_b_amount: BigInt(
        (args.token_b_amount * 10 ** constants.StellarConfig.XLM_DECIMALS).toFixed(0)
      ),
    };

    await executeContractTransaction({
      contractType: 'pool_router',
      contractAddress: constants.StellarConfig.POOL_ROUTER_ADDRESS,
      transactionDetails: {
        type: TransactionType.DEPOSIT_LIQUIDITY,
        token1: { name: 'XLM', amount: args.token_b_amount },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.deposit(processedArgs, { simulate: !restore });
        if (restore) return tx;

        const signedTransaction = await tx.signAndSend();
        const signedXDR = signedTransaction.assembled?.toXDR();

        if (signedXDR) {
          return await executeLiquidity(signedXDR, 'Deposit Liquidity');
        }

        return signedTransaction;
      },
    });
  };

  const withdrawLiquidity = async (args: WithdrawLiquidityArgs) => {
    await rateLimitCheck();

    const processedArgs = {
      ...args,
      user: storePersist.wallet.address!,
      share_amount: BigInt(
        (args.share_amount * 10 ** constants.StellarConfig.XLM_DECIMALS).toFixed(0)
      ),
    };

    await executeContractTransaction({
      contractType: 'pool_router',
      contractAddress: constants.StellarConfig.POOL_ROUTER_ADDRESS,
      transactionDetails: {
        type: TransactionType.REMOVE_LIQUIDITY,
        token1: { name: 'XLM', amount: args.share_amount },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.withdraw(processedArgs, { simulate: !restore });
        if (restore) return tx;

        const signedTransaction = await tx.signAndSend();
        const signedXDR = signedTransaction.assembled?.toXDR();

        if (signedXDR) {
          return await executeLiquidity(signedXDR, 'Withdraw Liquidity');
        }

        return signedTransaction;
      },
    });
  };

  return {
    error,
    loading,
    depositLiquidity,
    withdrawLiquidity,
  };
}
