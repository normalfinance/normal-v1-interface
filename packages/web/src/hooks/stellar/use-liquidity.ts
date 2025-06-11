'use client';

import type { Client } from '@normalfinance/contracts/build/pool_router';

import { useState } from 'react';
import { constants } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';

import { useContractTransaction } from '../use-contract-transaction';

// ----------------------------------------------------------------------

export type DepositLiquidityArgs = Parameters<Client['deposit']>[0];
export type WithdrawLiquidityArgs = Parameters<Client['withdraw']>[0];

interface ReturnType {
  error: any | null;
  loading: boolean;
  onDepositLiquidity: (args: DepositLiquidityArgs) => Promise<void>;
  onWithdrawLiquidity: (args: WithdrawLiquidityArgs) => Promise<void>;
}

// ----------------------------------------------------------------------

export function useLiquidity(): ReturnType {
  const storePersist = usePersistStore();

  const { executeContractTransaction } = useContractTransaction();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for async operations

  const onDepositLiquidity = async (args: DepositLiquidityArgs) => {
    await executeContractTransaction({
      contractType: 'pool_router',
      contractAddress: constants.POOL_ROUTER_ADDRESS,
      transactionFunction: async (client, restore) =>
        client.deposit(
          {
            ...args,
            user: storePersist.wallet.address!,
            desired_amount: BigInt((args.desired_amount * 10 ** constants.XLM_DECIMALS).toFixed(0)),
          },
          { simulate: !restore }
        ),
    });
  };

  const onWithdrawLiquidity = async (args: WithdrawLiquidityArgs) => {
    await executeContractTransaction({
      contractType: 'pool_router',
      contractAddress: constants.POOL_ROUTER_ADDRESS,
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
    onDepositLiquidity,
    onWithdrawLiquidity,
  };
}
