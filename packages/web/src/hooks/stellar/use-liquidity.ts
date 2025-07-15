'use client';

import type { Client } from '@normalfinance/contracts/build/pool_router';

import { useState } from 'react';
import { constants } from '@normalfinance/utils';
import { TransactionType } from '@/types/transaction';
import { usePersistStore } from '@normalfinance/state';

import { useContractTransaction } from './use-contract-transaction';

// ----------------------------------------------------------------------

export type DepositLiquidityArgs = Parameters<Client['deposit']>[0];
export type WithdrawLiquidityArgs = Parameters<Client['withdraw']>[0];

interface ReturnType {
  error: any | null;
  loading: boolean;
  depositLiquidity: (args: DepositLiquidityArgs) => Promise<void>;
  withdrawLiquidity: (args: WithdrawLiquidityArgs) => Promise<void>;
}

// ----------------------------------------------------------------------

export function useLiquidity(): ReturnType {
  const storePersist = usePersistStore();

  const { executeContractTransaction } = useContractTransaction();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for async operations

  const depositLiquidity = async (args: DepositLiquidityArgs) => {
    await executeContractTransaction({
      contractType: 'pool_router',
      contractAddress: constants.POOL_ROUTER_ADDRESS,
      transactionDetails: {
        type: TransactionType.DEPOSIT_LIQUIDITY,
        token1: { name: 'XLM', amount: args.token_b_amount },
      },
      transactionFunction: async (client, restore) =>
        client.deposit(
          {
            ...args,
            user: storePersist.wallet.address!,
            token_b_amount: BigInt((args.token_b_amount * 10 ** constants.XLM_DECIMALS).toFixed(0)),
          },
          { simulate: !restore }
        ),
    });
  };

  const withdrawLiquidity = async (args: WithdrawLiquidityArgs) => {
    await executeContractTransaction({
      contractType: 'pool_router',
      contractAddress: constants.POOL_ROUTER_ADDRESS,
      transactionDetails: {
        type: TransactionType.REMOVE_LIQUIDITY,
        token1: { name: 'XLM', amount: args.share_amount },
      },
      transactionFunction: async (client, restore) =>
        client.withdraw(
          {
            ...args,
            user: storePersist.wallet.address!,
            share_amount: BigInt((args.share_amount * 10 ** constants.XLM_DECIMALS).toFixed(0)),
          },
          { simulate: !restore }
        ),
    });
  };

  return {
    error,
    loading,
    depositLiquidity,
    withdrawLiquidity,
  };
}
