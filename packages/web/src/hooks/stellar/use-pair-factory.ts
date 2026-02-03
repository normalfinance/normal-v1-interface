'use client';

import { useState } from 'react';
import { constants } from '@normalfinance/utils';
import { TransactionType } from '@/types/transaction';
import { usePersistStore } from '@normalfinance/state';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { LongShortPairFactoryContract } from '@normalfinance/contracts';

import { useContractTransaction } from './use-contract-transaction';

// ----------------------------------------------------------------------

// User - Simplified args for the UI (internal conversions handle the rest)
export interface MintPairArgs {
  asset: string;
  tokens_to_mint: number; // Amount in human-readable units (will be converted to bigint)
}

export interface RedeemPairArgs {
  asset: string;
  tokens_to_redeem: number; // Amount in human-readable units (will be converted to bigint)
}

interface ReturnType {
  error: any | null;
  loading: boolean;
  setLoading: (isLoading: boolean) => void;
  mintPair: (args: MintPairArgs) => Promise<void>;
  redeemPair: (args: RedeemPairArgs) => Promise<void>;
  getPairByAsset: (asset: string) => Promise<string | undefined>;
}

// ----------------------------------------------------------------------

export function usePairFactory(): ReturnType {
  const storePersist = usePersistStore();

  const { executeContractTransaction } = useContractTransaction();

  const { session } = useSupabaseAuth();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const executePair = async (signedTransactionXDR: string, transactionType: string = 'Pair') => {
    if (!storePersist.wallet.address || !session) return null;
    const res = await fetch('/api/transaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      credentials: 'include',
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
    if (!storePersist.wallet.address || !session) return;
    const res = await fetch('/api/pairs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      credentials: 'include',
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

  const mintPair = async (args: MintPairArgs) => {
    setLoading(true);

    await rateLimitCheck();

    const processedArgs = {
      user: storePersist.wallet.address!,
      asset: args.asset,
      tokens_to_mint: BigInt((args.tokens_to_mint * 10 ** 7).toFixed(0)),
    };

    await executeContractTransaction({
      contractType: 'long_short_pair_factory',
      contractAddress: constants.StellarConfig.LONG_SHORT_PAIR_FACTORY_ADDRESS,
      transactionDetails: {
        type: TransactionType.MINT_PAIR,
        token1: { name: `${args.asset} pairs`, amount: String(args.tokens_to_mint) },
      },
      transactionFunction: async (client) => {
        const tx = await client.mint(processedArgs, {
          fee: Number(process.env.NEXT_PUBLIC_STELLAR_FEE ?? 5000000),
          timeoutInSeconds: Number(process.env.NEXT_PUBLIC_STELLAR_TIMEOUT ?? 600),
        });

        await tx.sign();
        const signedXDR = tx.signed?.toXDR();

        if (signedXDR) {
          const apiRes = await executePair(signedXDR, 'Mint Pair');
          if (apiRes?.transactionHash) {
            (tx as any).hash = apiRes.transactionHash;
          }
        }

        return tx;
      },
    });

    setLoading(false);
  };

  const redeemPair = async (args: RedeemPairArgs) => {
    setLoading(true);

    await rateLimitCheck();

    const processedArgs = {
      user: storePersist.wallet.address!,
      asset: args.asset,
      tokens_to_redeem: BigInt((args.tokens_to_redeem * 10 ** 7).toFixed(0)),
    };

    await executeContractTransaction({
      contractType: 'long_short_pair_factory',
      contractAddress: constants.StellarConfig.LONG_SHORT_PAIR_FACTORY_ADDRESS,
      transactionDetails: {
        type: TransactionType.REDEEM_PAIR,
        token1: { name: `${args.asset} pairs`, amount: String(args.tokens_to_redeem) },
      },
      transactionFunction: async (client) => {
        const tx = await client.redeem(processedArgs, {
          fee: Number(process.env.NEXT_PUBLIC_STELLAR_FEE ?? 5000000),
          timeoutInSeconds: Number(process.env.NEXT_PUBLIC_STELLAR_TIMEOUT ?? 600),
        });

        await tx.sign();
        const signedXDR = tx.signed?.toXDR();

        if (signedXDR) {
          const apiRes = await executePair(signedXDR, 'Redeem Pair');
          if (apiRes?.transactionHash) {
            (tx as any).hash = apiRes.transactionHash;
          }
        }

        return tx;
      },
    });

    setLoading(false);
  };

  const getPairByAsset = async (asset: string) => {
    setLoading(true);

    try {
      await rateLimitCheck();

      const FactoryClient = new LongShortPairFactoryContract.Client({
        contractId: constants.StellarConfig.LONG_SHORT_PAIR_FACTORY_ADDRESS,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      const getPairByAssetResponse = await FactoryClient.get_pair_by_asset({ asset });

      if (!getPairByAssetResponse || !getPairByAssetResponse.result) return undefined;

      const pairAddress = getPairByAssetResponse.result as string;

      return pairAddress;
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
    return undefined;
  };

  return {
    error,
    loading,
    setLoading,
    mintPair,
    redeemPair,
    getPairByAsset,
  };
}
