'use client';

import type { Pair } from '@normalfinance/types';

import { BigNumber } from 'bignumber.js';
import { TransactionType } from '@/types/transaction';
import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import { TreasuryContract } from '@normalfinance/contracts';
import { format, constants, convertCoinToFiat } from '@normalfinance/utils';

import { useContractTransaction } from './use-contract-transaction';

// ----------------------------------------------------------------------

export type LiquidityPosition = {
  pair: Pair;

  totalShares: BigNumber;
  userShares: BigNumber;
  userSharePercentage: BigNumber;

  balances: {
    long: BigNumber;
    short: BigNumber;
    usdc: BigNumber;
    reward: BigNumber;
  };
  usdValues: {
    long: string;
    short: string;
    usdc: string;
    reward: BigNumber;
  };
};

interface ReturnType {
  error: any | null;
  loading: boolean;
  setLoading: (isLoading: boolean) => void;
  liquidityPositions: LiquidityPosition[] | undefined;
  totalValue: BigNumber;
  fetchPositions: () => void;
  deposit: (pairAddress: string, amount: number) => Promise<void>;
  withdraw: (pairAddress: string, shares: number) => Promise<void>;
}

// ----------------------------------------------------------------------

export function useManageLiquidity(): ReturnType {
  const {
    wallet,
    tokenState: { tokensByAddress },
    pairState: { pairs },
  } = usePersistStore();

  const { executeContractTransaction } = useContractTransaction();

  const tokenUSDC = tokensByAddress[constants.StellarConfig.USDC_ADDRESS];

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<LiquidityPosition[] | undefined>(undefined);
  const [totalValue, setTotalValue] = useState<BigNumber>(BigNumber(0));

  // Fetch info from Treasury
  const TreasuryClient = new TreasuryContract.Client({
    contractId: constants.StellarConfig.TREASURY_ADDRESS,
    networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
    rpcUrl: constants.StellarConfig.RPC_URL,
  });

  const executePair = async (signedTransactionXDR: string, transactionType: string = 'Trade') => {
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
      throw new Error(data.error || 'Trade execution failed');
    }

    return data;
  };

  const rateLimitCheck = async () => {
    if (!wallet.address) return;
    const res = await fetch('/api/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: wallet.address }),
    });
    if (res.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    const data = await res.json();
    if (!data.allowed) {
      throw new Error(data.error || 'Trade not allowed');
    }
  };

  const fetchPositionDetails = async (pair: Pair): Promise<LiquidityPosition | undefined> => {
    if (!wallet.address) {
      return undefined;
    }

    const summaryResponse = await TreasuryClient.get_user_with_summary({
      pair: pair.pairAddress,
      user: wallet.address,
    });

    if (summaryResponse && summaryResponse.result) {
      const { summary, user_shares } =
        summaryResponse.result as TreasuryContract.TreasuryUserSummary;

      // Shares info
      const userShares = BigNumber(format.fTokenAmount(user_shares, 7));
      const totalShares = BigNumber(format.fTokenAmount(summary.total_shares, 7));
      const userSharePercentage = userShares.dividedBy(totalShares);

      const tokenLong = tokensByAddress[pair.tokens.long];
      const tokenShort = tokensByAddress[pair.tokens.short];

      // Rewards
      const claimableReward = BigNumber(0);

      const liquidityPosition: LiquidityPosition = {
        pair,

        userShares,
        totalShares,
        userSharePercentage,

        balances: {
          long: summary.balances.long,
          short: summary.balances.short,
          usdc: summary.balances.usdc,
          reward: claimableReward,
        },
        usdValues: {
          long: convertCoinToFiat(summary.balances.long, BigNumber(tokenLong.price)),
          short: convertCoinToFiat(summary.balances.short, BigNumber(tokenShort.price)),
          usdc: convertCoinToFiat(summary.balances.usdc, BigNumber(tokenUSDC.price)),
          reward: claimableReward,
        },
      };

      return liquidityPosition;
    }

    return undefined;
  };

  const fetchPositions = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      if (pairs.length) {
        const liquidityPositions = await Promise.all(
          pairs.map(async (pair) => await fetchPositionDetails(pair))
        );

        // Safely remove all undefined values
        const liquidityPositionsFiltered = liquidityPositions.filter(
          (r): r is NonNullable<typeof r> => r !== undefined && r !== null
        );

        setPositions(liquidityPositionsFiltered as LiquidityPosition[]);

        // Total value
        const total = liquidityPositionsFiltered.reduce((acc, pos) => {
          const totalPositionValue = BigNumber(pos.usdValues.long)
            .plus(pos.usdValues.short)
            .plus(pos.usdValues.usdc);

          return acc.plus(totalPositionValue);
        }, BigNumber(0));

        setTotalValue(total);
      }
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
    return;
  }, []);

  const deposit = async (pairAddress: string, amount: number) => {
    setLoading(true);

    await rateLimitCheck();

    const precisionAmount = BigInt((amount * 10 ** 7).toFixed(0));

    const processedArgs: Parameters<TreasuryContract.Client['deposit']>[0] = {
      user: wallet.address!,
      pair: pairAddress,
      pairs_to_deposit: precisionAmount,
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
      user: wallet.address!,
      pair: pairAddress,
      shares: BigInt((shares * 10 ** 7).toFixed(0)),
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

  // On component mount, fetch positions
  useEffect(() => {
    fetchPositions();
  }, [fetchPositions, pairs]);

  return {
    error,
    loading,
    setLoading,
    fetchPositions,
    liquidityPositions: positions,
    totalValue,
    deposit,
    withdraw,
  };
}
