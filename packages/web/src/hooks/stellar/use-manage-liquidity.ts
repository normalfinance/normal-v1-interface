'use client';

import type { TreasuryContract } from '@normalfinance/contracts';

import { useState } from 'react';
import { constants } from '@normalfinance/utils';
import { TransactionType } from '@/types/transaction';
import { usePersistStore } from '@normalfinance/state';

import { useContractTransaction } from './use-contract-transaction';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  setLoading: (isLoading: boolean) => void;
  deposit: (pairAddress: string, amount: number) => Promise<void>;
  withdraw: (pairAddress: string, shares: number) => Promise<void>;
}

// ----------------------------------------------------------------------

export function useManageLiquidity(): ReturnType {
  const storePersist = usePersistStore();

  const { executeContractTransaction } = useContractTransaction();

  const [error] = useState(null);
  const [loading, setLoading] = useState(true);

  const executePair = async (signedTransactionXDR: string, transactionType: string = 'Trade') => {
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
      throw new Error(data.error || 'Trade execution failed');
    }

    return data;
  };

  const rateLimitCheck = async () => {
    if (!storePersist.wallet.address) return;
    const res = await fetch('/api/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: storePersist.wallet.address }),
    });
    if (res.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    const data = await res.json();
    if (!data.allowed) {
      throw new Error(data.error || 'Trade not allowed');
    }
  };

  const deposit = async (pairAddress: string, amount: number) => {
    setLoading(true);

    await rateLimitCheck();

    const precisionAmount = BigInt((amount * 10 ** 7).toFixed(0));

    const processedArgs: Parameters<TreasuryContract.Client['deposit']>[0] = {
      user: storePersist.wallet.address!,
      pair: pairAddress,
      amt_long: precisionAmount,
      amt_short: precisionAmount,
      amt_usdc: precisionAmount,
    };

    await executeContractTransaction({
      contractType: 'treasury',
      contractAddress: constants.StellarConfig.TREASURY_ADDRESS,
      transactionDetails: {
        type: TransactionType.DEPOSIT_LIQUIDITY,
        token1: { name: 'USDC', amount: String(amount) },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.deposit(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executePair(signedXDR, 'Deposit Liquidity');
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

  const withdraw = async (pairAddress: string, shares: number) => {
    setLoading(true);

    await rateLimitCheck();

    const processedArgs: Parameters<TreasuryContract.Client['withdraw']>[0] = {
      user: storePersist.wallet.address!,
      pair: pairAddress,
      shares: BigInt((shares * 10 ** 7).toFixed(0)),
      min_long: 0,
      min_short: 0,
      min_usdc: 0,
    };

    await executeContractTransaction({
      contractType: 'treasury',
      contractAddress: constants.StellarConfig.TREASURY_ADDRESS,
      transactionDetails: {
        type: TransactionType.REMOVE_LIQUIDITY,
        token1: { name: 'USDC', amount: String(shares) },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.withdraw(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executePair(signedXDR, 'Withdraw Liquidity');
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
    deposit,
    withdraw,
  };
}
