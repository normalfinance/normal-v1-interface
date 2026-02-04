'use client';

import type { TreasuryContract, LongShortPairFactoryContract } from '@normalfinance/contracts';

import { useState } from 'react';
import { buildAuthHeaders } from '@/utils/http';
import { constants } from '@normalfinance/utils';
import { TransactionType } from '@/types/transaction';
import { usePersistStore } from '@normalfinance/state';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';

import { useContractTransaction } from './use-contract-transaction';

// ----------------------------------------------------------------------

export type BuyLongArgs = Omit<Parameters<TreasuryContract.Client['buy_long']>[0], 'user'>;
export type SellLongArgs = Omit<Parameters<TreasuryContract.Client['sell_long']>[0], 'user'>;
export type BuyShortArgs = Omit<Parameters<TreasuryContract.Client['buy_short']>[0], 'user'>;
export type SellShortArgs = Omit<Parameters<TreasuryContract.Client['sell_short']>[0], 'user'>;

export type BuyLongMintArgs = {
  pair: string;
  asset: string;
  usdc_in: BigNumber;
  collateralPerPair: BigNumber;
};
export type BuyShortMintArgs = {
  pair: string;
  asset: string;
  usdc_in: BigNumber;
  collateralPerPair: BigNumber;
};
export type SellLongRedeemArgs = {
  pair: string;
  asset: string;
  long_in: number;
};
export type SellShortRedeemArgs = {
  pair: string;
  asset: string;
  short_in: number;
};

interface ReturnType {
  error: any | null;
  loading: boolean;
  setLoading: (isLoading: boolean) => void;

  buyLong: (args: BuyLongArgs) => Promise<void>;
  sellLong: (args: SellLongArgs) => Promise<void>;
  buyShort: (args: BuyShortArgs) => Promise<void>;
  sellShort: (args: SellShortArgs) => Promise<void>;

  buyLongMint: (args: BuyLongMintArgs) => Promise<void>;
  buyShortMint: (args: BuyShortMintArgs) => Promise<void>;
  sellLongRedeem: (args: SellLongRedeemArgs) => Promise<void>;
  sellShortRedeem: (args: SellShortRedeemArgs) => Promise<void>;
}

// ----------------------------------------------------------------------

export function useTrade(): ReturnType {
  const storePersist = usePersistStore();

  const { executeContractTransaction } = useContractTransaction();

  const { session } = useSupabaseAuth();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const executePair = async (signedTransactionXDR: string, transactionType: string = 'Trade') => {
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
      throw new Error(data.error || 'Trade execution failed');
    }

    return data;
  };

  const rateLimitCheck = async () => {
    if (!storePersist.wallet.address || !session) return;
    const headers = await buildAuthHeaders();
    const res = await fetch('/api/trade', {
      method: 'POST',
      headers,
      credentials: 'include',
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

  /**
   *
   * Single-Step Trade Functions
   *
   */

  const buyLong = async (args: BuyLongArgs) => {
    if (!storePersist.wallet.address) {
      setError('No account found');
      return;
    }

    setLoading(true);

    await rateLimitCheck();

    const processedArgs: Parameters<TreasuryContract.Client['buy_long']>[0] = {
      user: storePersist.wallet.address,
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
      transactionFunction: async (client) => {
        const tx = await client.buy_long(processedArgs, {
          fee: Number(process.env.NEXT_PUBLIC_STELLAR_FEE ?? 5000000),
          timeoutInSeconds: Number(process.env.NEXT_PUBLIC_STELLAR_TIMEOUT ?? 600),
        });

        await tx.sign();
        const signedXDR = tx.signed?.toXDR();

        if (signedXDR) {
          const apiRes = await executePair(signedXDR, 'Buy Long');
          if (apiRes?.transactionHash) {
            (tx as any).hash = apiRes.transactionHash;
          }
        }

        return tx;
      },
    });

    setLoading(false);
  };

  const sellLong = async (args: SellLongArgs) => {
    if (!storePersist.wallet.address) {
      setError('No account found');
      return;
    }

    setLoading(true);

    await rateLimitCheck();

    const processedArgs: Parameters<TreasuryContract.Client['sell_long']>[0] = {
      user: storePersist.wallet.address,
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
      transactionFunction: async (client) => {
        const tx = await client.sell_long(processedArgs, {
          fee: Number(process.env.NEXT_PUBLIC_STELLAR_FEE ?? 5000000),
          timeoutInSeconds: Number(process.env.NEXT_PUBLIC_STELLAR_TIMEOUT ?? 600),
        });

        await tx.sign();
        const signedXDR = tx.signed?.toXDR();

        if (signedXDR) {
          const apiRes = await executePair(signedXDR, 'Sell Long');
          if (apiRes?.transactionHash) {
            (tx as any).hash = apiRes.transactionHash;
          }
        }

        return tx;
      },
    });

    setLoading(false);
  };

  const buyShort = async (args: BuyShortArgs) => {
    if (!storePersist.wallet.address) {
      setError('No account found');
      return;
    }

    setLoading(true);

    await rateLimitCheck();

    const processedArgs: Parameters<TreasuryContract.Client['buy_short']>[0] = {
      user: storePersist.wallet.address,
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
      transactionFunction: async (client) => {
        const tx = await client.buy_short(processedArgs, {
          fee: Number(process.env.NEXT_PUBLIC_STELLAR_FEE ?? 5000000),
          timeoutInSeconds: Number(process.env.NEXT_PUBLIC_STELLAR_TIMEOUT ?? 600),
        });

        await tx.sign();
        const signedXDR = tx.signed?.toXDR();

        if (signedXDR) {
          const apiRes = await executePair(signedXDR, 'Buy Short');
          if (apiRes?.transactionHash) {
            (tx as any).hash = apiRes.transactionHash;
          }
        }

        return tx;
      },
    });

    setLoading(false);
  };

  const sellShort = async (args: SellShortArgs) => {
    if (!storePersist.wallet.address) {
      setError('No account found');
      return;
    }

    setLoading(true);

    await rateLimitCheck();

    const processedArgs: Parameters<TreasuryContract.Client['sell_short']>[0] = {
      user: storePersist.wallet.address,
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
      transactionFunction: async (client) => {
        const tx = await client.sell_short(processedArgs, {
          fee: Number(process.env.NEXT_PUBLIC_STELLAR_FEE ?? 5000000),
          timeoutInSeconds: Number(process.env.NEXT_PUBLIC_STELLAR_TIMEOUT ?? 600),
        });

        await tx.sign();
        const signedXDR = tx.signed?.toXDR();

        if (signedXDR) {
          const apiRes = await executePair(signedXDR, 'Sell Short');
          if (apiRes?.transactionHash) {
            (tx as any).hash = apiRes.transactionHash;
          }
        }

        return tx;
      },
    });

    setLoading(false);
  };

  /**
   *
   * Two-Step Trade Functions
   *
   */

  const buyLongMint = async (args: BuyLongMintArgs) => {
    if (!storePersist.wallet.address) {
      setError('No account found');
      return;
    }

    setLoading(true);

    await rateLimitCheck();

    // Mint
    const tokensToMint = args.usdc_in.dividedBy(args.collateralPerPair);
    const tokensToMintBN = BigInt((tokensToMint.toNumber() * 10 ** 7).toFixed(0));

    const mintArgs: Parameters<LongShortPairFactoryContract.Client['mint']>[0] = {
      user: storePersist.wallet.address!,
      asset: args.asset,
      tokens_to_mint: tokensToMintBN,
    };

    await executeContractTransaction({
      contractType: 'long_short_pair_factory',
      contractAddress: constants.StellarConfig.LONG_SHORT_PAIR_FACTORY_ADDRESS,
      transactionDetails: {
        type: TransactionType.MINT_PAIR,
        token1: { name: 'LONG', amount: String(args.usdc_in) },
      },
      transactionFunction: async (client) => {
        const tx = await client.mint(mintArgs, {
          fee: Number(process.env.NEXT_PUBLIC_STELLAR_FEE ?? 5000000),
          timeoutInSeconds: Number(process.env.NEXT_PUBLIC_STELLAR_TIMEOUT ?? 600),
        });

        await tx.sign();
        const signedXDR = tx.signed?.toXDR();

        if (signedXDR) {
          const apiRes = await executePair(signedXDR, 'Buy Short (via Mint)');
          if (apiRes?.transactionHash) {
            (tx as any).hash = apiRes.transactionHash;
          }
        }

        return tx;
      },
    });

    // Trade
    const tradeArgs: Parameters<TreasuryContract.Client['sell_short']>[0] = {
      user: storePersist.wallet.address,
      pair: args.pair,
      short_in: tokensToMintBN,
      min_usdc_out: 0,
    };

    await executeContractTransaction({
      contractType: 'treasury',
      contractAddress: constants.StellarConfig.TREASURY_ADDRESS,
      transactionDetails: {
        type: TransactionType.TRADE,
        token1: { name: 'Short', amount: String(tradeArgs.short_in) },
      },
      transactionFunction: async (client) => {
        const tx = await client.sell_short(tradeArgs, {
          fee: Number(process.env.NEXT_PUBLIC_STELLAR_FEE ?? 5000000),
          timeoutInSeconds: Number(process.env.NEXT_PUBLIC_STELLAR_TIMEOUT ?? 600),
        });

        await tx.sign();
        const signedXDR = tx.signed?.toXDR();

        if (signedXDR) {
          const apiRes = await executePair(signedXDR, 'Sell Short');
          if (apiRes?.transactionHash) {
            (tx as any).hash = apiRes.transactionHash;
          }
        }

        return tx;
      },
    });

    setLoading(false);
  };

  const buyShortMint = async (args: BuyShortMintArgs) => {
    if (!storePersist.wallet.address) {
      setError('No account found');
      return;
    }

    setLoading(true);

    await rateLimitCheck();

    // Mint
    const tokensToMint = args.usdc_in.dividedBy(args.collateralPerPair);
    const tokensToMintBN = BigInt((tokensToMint.toNumber() * 10 ** 7).toFixed(0));

    const mingArgs: Parameters<LongShortPairFactoryContract.Client['mint']>[0] = {
      user: storePersist.wallet.address,
      asset: args.asset,
      tokens_to_mint: tokensToMint,
    };

    await executeContractTransaction({
      contractType: 'long_short_pair_factory',
      contractAddress: constants.StellarConfig.LONG_SHORT_PAIR_FACTORY_ADDRESS,
      transactionDetails: {
        type: TransactionType.MINT_PAIR,
        token1: { name: args.asset, amount: String(args.usdc_in) },
      },
      transactionFunction: async (client) => {
        const tx = await client.mint(mingArgs, {
          fee: Number(process.env.NEXT_PUBLIC_STELLAR_FEE ?? 5000000),
          timeoutInSeconds: Number(process.env.NEXT_PUBLIC_STELLAR_TIMEOUT ?? 600),
        });

        await tx.sign();
        const signedXDR = tx.signed?.toXDR();

        if (signedXDR) {
          const apiRes = await executePair(signedXDR, 'Mint');
          if (apiRes?.transactionHash) {
            (tx as any).hash = apiRes.transactionHash;
          }
        }

        return tx;
      },
    });

    // Trade - Sell Long
    const tradeArgs: Parameters<TreasuryContract.Client['sell_long']>[0] = {
      user: storePersist.wallet.address,
      pair: args.pair,
      long_in: tokensToMintBN,
      min_usdc_out: 0,
    };

    await executeContractTransaction({
      contractType: 'treasury',
      contractAddress: constants.StellarConfig.TREASURY_ADDRESS,
      transactionDetails: {
        type: TransactionType.TRADE,
        token1: { name: 'Long', amount: String(tradeArgs.long_in) },
      },
      transactionFunction: async (client) => {
        const tx = await client.sell_long(tradeArgs, {
          fee: Number(process.env.NEXT_PUBLIC_STELLAR_FEE ?? 5000000),
          timeoutInSeconds: Number(process.env.NEXT_PUBLIC_STELLAR_TIMEOUT ?? 600),
        });

        await tx.sign();
        const signedXDR = tx.signed?.toXDR();

        if (signedXDR) {
          const apiRes = await executePair(signedXDR, 'Sell Long');
          if (apiRes?.transactionHash) {
            (tx as any).hash = apiRes.transactionHash;
          }
        }

        return tx;
      },
    });

    setLoading(false);
  };

  const sellLongRedeem = async (args: SellLongRedeemArgs) => {
    if (!storePersist.wallet.address) {
      setError('No account found');
      return;
    }

    setLoading(true);

    await rateLimitCheck();

    // Trade - Buy Short
    const usdcIn = BigInt((args.long_in * 10 ** 7).toFixed(0));

    const tradeArgs: Parameters<TreasuryContract.Client['buy_short']>[0] = {
      user: storePersist.wallet.address!,
      pair: args.pair,
      usdc_in: BigInt((args.long_in * 10 ** 7).toFixed(0)),
      min_short_out: args.long_in,
    };

    await executeContractTransaction({
      contractType: 'treasury',
      contractAddress: constants.StellarConfig.TREASURY_ADDRESS,
      transactionDetails: {
        type: TransactionType.TRADE,
        token1: { name: 'Short', amount: String(args.long_in) },
      },
      transactionFunction: async (client) => {
        const tx = await client.buy_short(tradeArgs, {
          fee: Number(process.env.NEXT_PUBLIC_STELLAR_FEE ?? 5000000),
          timeoutInSeconds: Number(process.env.NEXT_PUBLIC_STELLAR_TIMEOUT ?? 600),
        });

        await tx.sign();
        const signedXDR = tx.signed?.toXDR();

        if (signedXDR) {
          const apiRes = await executePair(signedXDR, 'Buy Short');
          if (apiRes?.transactionHash) {
            (tx as any).hash = apiRes.transactionHash;
          }
        }

        return tx;
      },
    });

    // Redeem
    const tokensToRedeem = 0;

    const redeemArgs: Parameters<LongShortPairFactoryContract.Client['redeem']>[0] = {
      user: storePersist.wallet.address,
      asset: args.asset,
      tokens_to_redeem: tokensToRedeem,
    };

    await executeContractTransaction({
      contractType: 'long_short_pair_factory',
      contractAddress: constants.StellarConfig.LONG_SHORT_PAIR_FACTORY_ADDRESS,
      transactionDetails: {
        type: TransactionType.REDEEM_PAIR,
        token1: { name: args.asset, amount: String(tokensToRedeem) },
      },
      transactionFunction: async (client) => {
        const tx = await client.redeem(redeemArgs, {
          fee: Number(process.env.NEXT_PUBLIC_STELLAR_FEE ?? 5000000),
          timeoutInSeconds: Number(process.env.NEXT_PUBLIC_STELLAR_TIMEOUT ?? 600),
        });

        await tx.sign();
        const signedXDR = tx.signed?.toXDR();

        if (signedXDR) {
          const apiRes = await executePair(signedXDR, 'Redeem');
          if (apiRes?.transactionHash) {
            (tx as any).hash = apiRes.transactionHash;
          }
        }

        return tx;
      },
    });

    setLoading(false);
  };

  const sellShortRedeem = async (args: SellShortRedeemArgs) => {
    if (!storePersist.wallet.address) {
      setError('No account found');
      return;
    }

    setLoading(true);

    await rateLimitCheck();

    // Trade - Sell Short
    const tradeArgs: Parameters<TreasuryContract.Client['buy_long']>[0] = {
      user: storePersist.wallet.address!,
      pair: args.pair,
      usdc_in: BigInt((args.short_in * 10 ** 7).toFixed(0)),
      min_long_out: args.short_in,
    };

    await executeContractTransaction({
      contractType: 'treasury',
      contractAddress: constants.StellarConfig.TREASURY_ADDRESS,
      transactionDetails: {
        type: TransactionType.TRADE,
        token1: { name: 'SHORT', amount: String(args.short_in) },
      },
      transactionFunction: async (client) => {
        const tx = await client.buy_long(tradeArgs, {
          fee: Number(process.env.NEXT_PUBLIC_STELLAR_FEE ?? 5000000),
          timeoutInSeconds: Number(process.env.NEXT_PUBLIC_STELLAR_TIMEOUT ?? 600),
        });

        await tx.sign();
        const signedXDR = tx.signed?.toXDR();

        if (signedXDR) {
          const apiRes = await executePair(signedXDR, 'Buy Long');
          if (apiRes?.transactionHash) {
            (tx as any).hash = apiRes.transactionHash;
          }
        }

        return tx;
      },
    });

    // Redeem
    const tokensToRedeem = 0;

    const redeemArgs: Parameters<LongShortPairFactoryContract.Client['redeem']>[0] = {
      user: storePersist.wallet.address,
      asset: args.asset,
      tokens_to_redeem: tokensToRedeem,
    };

    await executeContractTransaction({
      contractType: 'long_short_pair_factory',
      contractAddress: constants.StellarConfig.LONG_SHORT_PAIR_FACTORY_ADDRESS,
      transactionDetails: {
        type: TransactionType.REDEEM_PAIR,
        token1: { name: args.asset, amount: String(tokensToRedeem) },
      },
      transactionFunction: async (client) => {
        const tx = await client.redeem(redeemArgs, {
          fee: Number(process.env.NEXT_PUBLIC_STELLAR_FEE ?? 5000000),
          timeoutInSeconds: Number(process.env.NEXT_PUBLIC_STELLAR_TIMEOUT ?? 600),
        });

        await tx.sign();
        const signedXDR = tx.signed?.toXDR();

        if (signedXDR) {
          const apiRes = await executePair(signedXDR, 'Redeem');
          if (apiRes?.transactionHash) {
            (tx as any).hash = apiRes.transactionHash;
          }
        }

        return tx;
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

    buyLongMint,
    buyShortMint,
    sellLongRedeem,
    sellShortRedeem,
  };
}
