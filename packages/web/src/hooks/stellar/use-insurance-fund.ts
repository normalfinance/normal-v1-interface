'use client';

import type { Stake, Client } from '@normalfinance/contracts/build/insurance_fund';

import { constants } from '@normalfinance/utils';
import { TransactionType } from '@/types/transaction';
import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import { InsuranceFundContract } from '@normalfinance/contracts';

import { useContractTransaction } from './use-contract-transaction';

// ----------------------------------------------------------------------

export type InsuranceFundInfo = {
  total_shares: number;
  optimal_insurance: number;
  unstaking_period: number;
  current_rate: number;
  current_utilization: number;
};
export type DepositArgs = Omit<Parameters<Client['deposit']>[0], 'user'>;
export type RequestWithdrawArgs = Omit<Parameters<Client['request_withdraw']>[0], 'user'>;

interface ReturnType {
  error: any | null;
  loading: boolean;
  insuranceFund: InsuranceFundInfo | undefined;
  balance: number;
  stake: Stake | undefined;
  onFetchStake: () => Promise<void>;
  onDeposit: (args: DepositArgs) => Promise<void>;
  onRequestWithdraw: (args: RequestWithdrawArgs) => Promise<void>;
  onCancelRequestWithdraw: () => Promise<void>;
  onWithdraw: () => Promise<void>;
}

// ----------------------------------------------------------------------

export function useInsuranceFund(): ReturnType {
  const storePersist = usePersistStore();

  const { executeContractTransaction } = useContractTransaction();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [insuranceFund, setInsuranceFund] = useState<InsuranceFundInfo | undefined>(undefined);
  const [balance, setBalance] = useState<number>(0);
  const [stake, setStake] = useState<Stake | undefined>(undefined);

  const fetchInsuranceFund = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const InsuranceFund = new InsuranceFundContract.Client({
        contractId: constants.INSURANCE_FUND_ADDRESS,
        networkPassphrase: constants.NETWORK_PASSPHRASE,
        rpcUrl: constants.RPC_URL,
      });

      // Fetch Insurance Fund config and info from chain
      const [total_shares, optimal_insurance, unstaking_period, current_rate, current_utilization] =
        await Promise.all([
          InsuranceFund.get_total_shares(),
          InsuranceFund.get_optimal_insurance(),
          InsuranceFund.get_unstaking_period(),
          InsuranceFund.get_rate(),
          InsuranceFund.get_utilization(),
        ]);

      if (total_shares?.result) {
        setInsuranceFund({
          total_shares,
          optimal_insurance,
          unstaking_period,
          current_rate,
          current_utilization,
        });
      }

      // Get balance
      const _balance = 0;

      setBalance(_balance);
    } catch (e: any) {
      console.log(e);
      setError(e.toString());
    }

    setLoading(false);
    return;
  }, []);

  const fetchInsuranceFundStake = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const InsuranceFund = new InsuranceFundContract.Client({
        contractId: constants.INSURANCE_FUND_ADDRESS,
        networkPassphrase: constants.NETWORK_PASSPHRASE,
        rpcUrl: constants.RPC_URL,
      });

      const user_stake = await InsuranceFund.get_stake({ user: storePersist.wallet.address! });

      if (user_stake?.result) {
        setStake(user_stake.result);
      }
    } catch (e: any) {
      console.log(e);
      setError(e.toString());
    }

    setLoading(false);
    return;
  }, []);

  const rateLimitCheck = async () => {
    if (!storePersist.wallet.address) return;
    const res = await fetch('/api/staking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: storePersist.wallet.address }),
    });
    if (res.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    const data = await res.json();
    if (!data.allowed) {
      throw new Error(data.error || 'Staking not allowed');
    }
  };

  const onDeposit = async (args: DepositArgs) => {
    await rateLimitCheck();

    await executeContractTransaction({
      contractType: 'insurance_fund',
      contractAddress: constants.INSURANCE_FUND_ADDRESS,
      transactionDetails: {
        type: TransactionType.STAKE,
        token1: { name: 'XLM', amount: args.amount },
      },
      transactionFunction: async (client, restore) =>
        client.deposit(
          {
            user: storePersist.wallet.address!,
            amount: BigInt((args.amount * 10 ** constants.XLM_DECIMALS).toFixed(0)), // hardcoded 7 since only XLM is supported
          },
          { simulate: !restore }
        ),
    });
  };

  const onRequestWithdraw = async (args: RequestWithdrawArgs) => {
    await rateLimitCheck();
    await executeContractTransaction({
      contractType: 'insurance_fund',
      contractAddress: constants.INSURANCE_FUND_ADDRESS,
      transactionDetails: {
        type: TransactionType.REQUEST_UNSTAKE,
        token1: { name: 'XLM', amount: args.amount },
      },
      transactionFunction: async (client, restore) =>
        client.request_withdraw(
          {
            user: storePersist.wallet.address!,
            amount: BigInt((args.amount * 10 ** constants.XLM_DECIMALS).toFixed(0)), // hardcoded 7 since only XLM is supported
          },
          { simulate: !restore }
        ),
    });
  };

  const onCancelRequestWithdraw = async () => {
    await rateLimitCheck();
    await executeContractTransaction({
      contractType: 'insurance_fund',
      contractAddress: constants.INSURANCE_FUND_ADDRESS,
      transactionDetails: {
        type: TransactionType.CANCEL_REQUEST_UNSTAKE,
      },
      transactionFunction: async (client, restore) =>
        client.cancel_request_withdraw(
          {
            user: storePersist.wallet.address!,
          },
          { simulate: !restore }
        ),
    });
  };

  const onWithdraw = async () => {
    await rateLimitCheck();
    await executeContractTransaction({
      contractType: 'insurance_fund',
      contractAddress: constants.INSURANCE_FUND_ADDRESS,
      transactionDetails: {
        type: TransactionType.UNSTAKE,
      },
      transactionFunction: async (client, restore) =>
        client.withdraw(
          {
            user: storePersist.wallet.address!,
          },
          { simulate: !restore }
        ),
    });
  };

  // On component mount, fetch Buffer and Insurance Fund
  useEffect(() => {
    fetchInsuranceFund();
    fetchInsuranceFundStake();
  }, [fetchInsuranceFund, fetchInsuranceFundStake]);

  return {
    error,
    loading,
    balance,
    insuranceFund,
    stake,
    onFetchStake: fetchInsuranceFundStake,
    onDeposit,
    onRequestWithdraw,
    onCancelRequestWithdraw,
    onWithdraw,
  };
}
