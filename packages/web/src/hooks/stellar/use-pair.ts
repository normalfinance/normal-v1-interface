'use client';

import type { AppError } from '@/utils/errors';
import type { Pair } from '@normalfinance/types';

import { BigNumber } from 'bignumber.js';
import { handleHookError } from '@/utils/errors';
import { TransactionType } from '@/types/transaction';
import { usePersistStore } from '@normalfinance/state';
import { format, constants } from '@normalfinance/utils';
import { useState, useEffect, useCallback } from 'react';
import { LongShortPairContract } from '@normalfinance/contracts';

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
  error: AppError | null;
  loading: boolean;
  setLoading: (isLoading: boolean) => void;
  pair: Pair | undefined;
  mintPair: (args: MintPairArgs) => Promise<void>;
  redeemPair: (args: RedeemPairArgs) => Promise<void>;
  fetchPair: () => Promise<void>;
  clearError: () => void;
}

// ----------------------------------------------------------------------

export function usePair(pairAddress: string): ReturnType {
  const storePersist = usePersistStore();

  const { executeContractTransaction } = useContractTransaction();

  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);
  const [pair, setPair] = useState<Pair | undefined>(undefined);

  const clearError = useCallback(() => setError(null), []);

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
    const res = await fetch('/api/pairs', {
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

      // Query the pair contract directly using its address
      const PairClient = new LongShortPairContract.Client({
        contractId: pairAddress,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      const summaryResponse = await PairClient.get_summary();

      if (summaryResponse && summaryResponse.result) {
        const summary = summaryResponse.result as LongShortPairContract.PairSummary;

        // Compute scaled price
        const priceBoundaryDelta = BigNumber(summary.price_bounds.upper).minus(
          summary.price_bounds.lower
        );

        const scaledPrice = BigNumber(summary.collateral.collateral_percent_long)
          .multipliedBy(priceBoundaryDelta)
          .plus(summary.price_bounds.lower);

        const pairDetails: Pair = {
          pairAddress,
          asset: summary.asset,
          status: summary.status,
          tokens: summary.tokens,
          collateral: {
            collateralPerPair: BigNumber(
              format.fTokenAmount(summary.collateral.collateral_per_pair, 7)
            ).toString(),
            collateralPercentLong: BigNumber(
              format.fTokenAmount(summary.collateral.collateral_percent_long, 7)
            ).toString(),
            totalCollateral: BigNumber(
              format.fTokenAmount(summary.collateral.total_collateral, 7)
            ).toString(),
          },
          scaledPrice: format.fTokenAmount(scaledPrice, 14).toString(),
          priceBounds: {
            lower: BigNumber(format.fTokenAmount(summary.price_bounds.lower, 7)).toString(),
            upper: BigNumber(format.fTokenAmount(summary.price_bounds.upper, 7)).toString(),
          },
          client: PairClient,
        };

        setPair(pairDetails);
      }
    } catch (e) {
      handleHookError(e, 'usePair', setError);
    } finally {
      setLoading(false);
    }
  }, [pairAddress]);

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
        type: TransactionType.MINT_PAIR,
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
        type: TransactionType.REDEEM_PAIR,
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
    fetchPair,
    clearError,
  };
}
