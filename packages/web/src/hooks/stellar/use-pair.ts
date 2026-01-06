'use client';

import type { Pair } from '@normalfinance/types';

import { constants } from '@normalfinance/utils';
import { TransactionType } from '@/types/transaction';
import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';

import { useContractTransaction } from './use-contract-transaction';

// ----------------------------------------------------------------------

// User - Simplified args for the UI (internal conversions handle the rest)
export interface MintPairArgs {
  pair: string;
  tokens_to_mint: number; // Amount in human-readable units (will be converted to bigint)
}

export interface RedeemPairArgs {
  pair: string;
  tokens_to_redeem: number; // Amount in human-readable units (will be converted to bigint)
}

interface ReturnType {
  error: any | null;
  loading: boolean;
  setLoading: (isLoading: boolean) => void;
  pair: Pair | undefined;
  mintPair: (args: MintPairArgs) => Promise<void>;
  redeemPair: (args: RedeemPairArgs) => Promise<void>;
}

// ----------------------------------------------------------------------

export function usePair(pairAddress: string): ReturnType {
  const storePersist = usePersistStore();

  const { executeContractTransaction } = useContractTransaction();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pair, setPair] = useState<Pair | undefined>(undefined);

  const executePair = async (signedTransactionXDR: string, transactionType: string = 'Pair') => {
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
      throw new Error(data.error || 'Pair execution failed');
    }

    return data;
  };

  const rateLimitCheck = async () => {
    if (!storePersist.wallet.address) return;
    const res = await fetch('/api/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: storePersist.wallet.address }),
    });
    if (res.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    const data = await res.json();
    if (!data.allowed) {
      throw new Error(data.error || 'Pair management not allowed');
    }
  };

  const fetchPair = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // Query the index contract directly using its address
      // const pairClient = new LongShortPairContractClient.Client({
      //   contractId: pairAddress,
      //   networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
      //   rpcUrl: constants.StellarConfig.RPC_URL,
      // });

      // const pairSummaryResponse = await pairClient.get_pair_summary();

      // if (pairSummaryResponse && pairSummaryResponse.result) {
      //   const summary = pairSummaryResponse.result as PairSummary;
      //   setPair(summary);
      // }
    } catch (e: any) {
      // captureException(e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const mintPair = async (args: MintPairArgs) => {
    setLoading(true);

    await rateLimitCheck();

    const processedArgs = {
      user: storePersist.wallet.address!,
      asset: pairAddress,
      tokens_to_mint: BigInt((args.tokens_to_mint * 10 ** 7).toFixed(0)),
    };

    await executeContractTransaction({
      contractType: 'long_short_pair_factory',
      contractAddress: constants.StellarConfig.LONG_SHORT_PAIR_FACTORY_ADDRESS,
      transactionDetails: {
        type: TransactionType.MINT_INDEX,
        token1: { name: 'USDC', amount: String(args.tokens_to_mint) },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.mint(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executePair(signedXDR, 'Mint Pair');
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

  const redeemPair = async (args: RedeemPairArgs) => {
    setLoading(true);

    await rateLimitCheck();

    const processedArgs = {
      user: storePersist.wallet.address!,
      tokens_to_redeem: BigInt((args.tokens_to_redeem * 10 ** 7).toFixed(0)),
    };

    await executeContractTransaction({
      contractType: 'long_short_pair',
      contractAddress: pairAddress,
      transactionDetails: {
        type: TransactionType.REDEEM_INDEX,
        token1: { name: 'USDC', amount: String(args.tokens_to_redeem) },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.redeem(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executePair(signedXDR, 'Redeem Pair');
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

  // On component mount, fetch pair
  useEffect(() => {
    fetchPair();
  }, [fetchPair, pairAddress]);

  return {
    error,
    loading,
    setLoading,
    pair,
    mintPair,
    redeemPair,
  };
}
