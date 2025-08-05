'use client';

import type { Stake, Client } from '@normalfinance/contracts/build/insurance_fund';

import { BigNumber } from 'bignumber.js';
import { getTokenBalance } from '@/lib/token';
import { constants } from '@normalfinance/utils';
import { captureException } from '@sentry/nextjs';
import { TransactionType } from '@/types/transaction';
import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import { InsuranceFundContract } from '@normalfinance/contracts';

import { useContractTransaction } from './use-contract-transaction';

export type InsuranceFundInfo = {
  total_shares: BigNumber;
  optimal_insurance: BigNumber;
  unstaking_period: BigNumber;
  current_rate: BigNumber;
  current_utilization: BigNumber;
};
export type DepositArgs = Omit<Parameters<Client['deposit']>[0], 'user'>;
export type RequestWithdrawArgs = Omit<Parameters<Client['request_withdraw']>[0], 'user'>;

interface ReturnType {
  error: any | null;
  loading: boolean;
  insuranceFund: InsuranceFundInfo | undefined;
  balance: BigNumber | undefined;
  stake: Stake | undefined;
  onFetchStake: () => Promise<void>;
  onDeposit: (args: DepositArgs) => Promise<void>;
  onRequestWithdraw: (args: RequestWithdrawArgs) => Promise<void>;
  onCancelRequestWithdraw: () => Promise<void>;
  onWithdraw: () => Promise<void>;
}

export function useInsuranceFund(): ReturnType {
  const storePersist = usePersistStore();

  const { executeContractTransaction } = useContractTransaction();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [insuranceFund, setInsuranceFund] = useState<InsuranceFundInfo | undefined>(undefined);
  const [balance, setBalance] = useState<BigNumber | undefined>(undefined);
  const [stake, setStake] = useState<Stake | undefined>(undefined);

  const fetchInsuranceFundBalance = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const xlmBalance = await getTokenBalance(
        constants.StellarConfig.XLM_ADDRESS,
        constants.StellarConfig.INSURANCE_FUND_ADDRESS
      );

      if (xlmBalance) setBalance(BigNumber(xlmBalance));
    } catch (e: any) {
      captureException(e);
      console.log(e);
      setError(e.toString());
    }

    setLoading(false);
    return;
  }, []);

  const fetchInsuranceFund = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const InsuranceFund = new InsuranceFundContract.Client({
        contractId: constants.StellarConfig.INSURANCE_FUND_ADDRESS,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      const [total_shares, optimal_insurance, unstaking_period, current_rate, current_utilization] =
        await Promise.all([
          InsuranceFund.get_total_shares(),
          InsuranceFund.get_optimal_insurance(),
          InsuranceFund.get_unstaking_period(),
          InsuranceFund.get_rate(),
          InsuranceFund.get_utilization(),
        ]);

      // if (total_shares.result) {
      setInsuranceFund({
        total_shares: BigNumber(total_shares.result),
        optimal_insurance: BigNumber(optimal_insurance.result),
        unstaking_period: BigNumber(unstaking_period.result),
        current_rate: BigNumber(current_rate.result),
        current_utilization: BigNumber(current_utilization.result),
      });
      // }
    } catch (e: any) {
      captureException(e);
      console.log(e);
      setError(e.toString());
    }

    setLoading(false);
    return;
  }, []);

  const fetchInsuranceFundStake = useCallback(async () => {
    if (storePersist.wallet.address) {
      try {
        setError(null);
        setLoading(true);

        const InsuranceFund = new InsuranceFundContract.Client({
          contractId: constants.StellarConfig.INSURANCE_FUND_ADDRESS,
          networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
          rpcUrl: constants.StellarConfig.RPC_URL,
        });

        const user_stake = await InsuranceFund.get_stake({ user: storePersist.wallet.address });

        if (user_stake?.result) {
          setStake(user_stake.result as Stake);
        }
      } catch (e: any) {
        captureException(e);
        console.log(e);
        setError(e.toString());
      } finally {
        setLoading(false);
      }
    }
  }, [storePersist.wallet.address]);

  const executeInsurance = async (
    signedTransactionXDR: string,
    transactionType: string = 'Insurance Fund'
  ) => {
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
      throw new Error(data.error || 'Insurance fund execution failed');
    }

    console.log('Data from backend: ', data);

    return data;
  };

  const onDeposit = async (args: DepositArgs) => {
    const processedArgs = {
      user: storePersist.wallet.address!,
      amount: BigInt((args.amount * 10 ** constants.StellarConfig.XLM_DECIMALS).toFixed(0)),
    };

    await executeContractTransaction({
      contractType: 'insurance_fund',
      contractAddress: constants.StellarConfig.INSURANCE_FUND_ADDRESS,
      transactionDetails: {
        type: TransactionType.STAKE,
        token1: { name: 'XLM', amount: args.amount },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.deposit(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          console.log('txtxtx', tx, tx.signed, signedXDR);

          if (signedXDR) {
            const apiRes = await executeInsurance(signedXDR, 'Insurance Fund Deposit');
            console.log('API result:', apiRes);
            if (apiRes?.transactionHash) {
              (tx as any).hash = apiRes.transactionHash;
            }
          }

          return tx;
        }
      },
    });
  };

  const onRequestWithdraw = async (args: RequestWithdrawArgs) => {
    const processedArgs = {
      user: storePersist.wallet.address!,
      amount: BigInt((args.amount * 10 ** constants.StellarConfig.XLM_DECIMALS).toFixed(0)),
    };

    await executeContractTransaction({
      contractType: 'insurance_fund',
      contractAddress: constants.StellarConfig.INSURANCE_FUND_ADDRESS,
      transactionDetails: {
        type: TransactionType.REQUEST_UNSTAKE,
        token1: { name: 'XLM', amount: args.amount },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.request_withdraw(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            await executeInsurance(signedXDR, 'Insurance Fund Request Withdraw');
          }

          return tx;
        }
      },
    });
  };

  const onCancelRequestWithdraw = async () => {
    const processedArgs = {
      user: storePersist.wallet.address!,
    };

    await executeContractTransaction({
      contractType: 'insurance_fund',
      contractAddress: constants.StellarConfig.INSURANCE_FUND_ADDRESS,
      transactionDetails: {
        type: TransactionType.CANCEL_REQUEST_UNSTAKE,
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.cancel_request_withdraw(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            await executeInsurance(signedXDR, 'Insurance Fund Cancel Request Withdraw');
          }

          return tx;
        }
      },
    });
  };

  const onWithdraw = async () => {
    const processedArgs = {
      user: storePersist.wallet.address!,
    };

    await executeContractTransaction({
      contractType: 'insurance_fund',
      contractAddress: constants.StellarConfig.INSURANCE_FUND_ADDRESS,
      transactionDetails: {
        type: TransactionType.UNSTAKE,
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
            await executeInsurance(signedXDR, 'Insurance Fund Withdraw');
          }

          return tx;
        }
      },
    });
  };

  useEffect(() => {
    fetchInsuranceFund();
    fetchInsuranceFundStake();
    fetchInsuranceFundBalance();
  }, [fetchInsuranceFund, fetchInsuranceFundStake, fetchInsuranceFundBalance]);

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
