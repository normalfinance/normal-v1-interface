'use client';

import type { TreasuryContract } from '@normalfinance/contracts';

import { useState } from 'react';
import { constants } from '@normalfinance/utils';
import { TransactionType } from '@/types/transaction';
import { usePersistStore } from '@normalfinance/state';

import { useContractTransaction } from './use-contract-transaction';

// ----------------------------------------------------------------------

export type BuyLongArgs = Omit<Parameters<TreasuryContract.Client['buy_long']>[0], 'user'>;
export type SellLongArgs = Omit<Parameters<TreasuryContract.Client['sell_long']>[0], 'user'>;
export type BuyShortArgs = Omit<Parameters<TreasuryContract.Client['buy_short']>[0], 'user'>;
export type SellShortArgs = Omit<Parameters<TreasuryContract.Client['sell_short']>[0], 'user'>;

interface ReturnType {
  error: any | null;
  loading: boolean;
  setLoading: (isLoading: boolean) => void;

  buyLong: (args: BuyLongArgs) => Promise<void>;
  sellLong: (args: SellLongArgs) => Promise<void>;
  buyShort: (args: BuyShortArgs) => Promise<void>;
  sellShort: (args: SellShortArgs) => Promise<void>;
}

// ----------------------------------------------------------------------

export function useTrade(): ReturnType {
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

  const buyLong = async (args: BuyLongArgs) => {
    setLoading(true);

    // await rateLimitCheck();

    const processedArgs: Parameters<TreasuryContract.Client['buy_long']>[0] = {
      user: storePersist.wallet.address!,
      pair: args.pair,
      usdc_in: BigInt((args.usdc_in * 10 ** 7).toFixed(0)),
      min_long_out: 0,
    };

    await executeContractTransaction({
      contractType: 'treasury',
      contractAddress: constants.StellarConfig.TREASURY_ADDRESS,
      transactionDetails: {
        type: TransactionType.TRADE,
        token1: { name: 'USDC', amount: String(args.usdc_in) },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.buy_long(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executePair(signedXDR, 'Buy Long');
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

  const sellLong = async (args: SellLongArgs) => {
    setLoading(true);

    // await rateLimitCheck();

    const processedArgs: Parameters<TreasuryContract.Client['sell_long']>[0] = {
      user: storePersist.wallet.address!,
      pair: args.pair,
      long_in: BigInt((args.long_in * 10 ** 7).toFixed(0)),
      min_usdc_out: 0,
    };

    await executeContractTransaction({
      contractType: 'treasury',
      contractAddress: constants.StellarConfig.TREASURY_ADDRESS,
      transactionDetails: {
        type: TransactionType.TRADE,
        token1: { name: 'LONG', amount: String(args.long_in) },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.sell_long(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executePair(signedXDR, 'Sell Long');
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

  const buyShort = async (args: BuyShortArgs) => {
    setLoading(true);

    // await rateLimitCheck();

    const processedArgs: Parameters<TreasuryContract.Client['buy_short']>[0] = {
      user: storePersist.wallet.address!,
      pair: args.pair,
      usdc_in: BigInt((args.usdc_in * 10 ** 7).toFixed(0)),
      min_short_out: 0,
    };

    await executeContractTransaction({
      contractType: 'treasury',
      contractAddress: constants.StellarConfig.TREASURY_ADDRESS,
      transactionDetails: {
        type: TransactionType.TRADE,
        token1: { name: 'USDC', amount: String(args.usdc_in) },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.buy_short(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executePair(signedXDR, 'Buy Short');
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

  const sellShort = async (args: SellShortArgs) => {
    setLoading(true);

    // await rateLimitCheck();

    const processedArgs: Parameters<TreasuryContract.Client['sell_short']>[0] = {
      user: storePersist.wallet.address!,
      pair: args.pair,
      short_in: BigInt((args.short_in * 10 ** 7).toFixed(0)),
      min_usdc_out: 0,
    };

    await executeContractTransaction({
      contractType: 'treasury',
      contractAddress: constants.StellarConfig.TREASURY_ADDRESS,
      transactionDetails: {
        type: TransactionType.TRADE,
        token1: { name: 'SHORT', amount: String(args.short_in) },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.sell_short(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executePair(signedXDR, 'Sell Short');
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
    buyLong,
    sellLong,
    buyShort,
    sellShort,
  };
}
