/* eslint-disable consistent-return */

'use client';

import type { Horizon } from '@stellar/stellar-sdk';

import { useStellarConfig } from '@/hooks';
import { logger, fetchTransaction } from '@normalfinance/utils';
import { useRef, useState, useEffect, useCallback } from 'react';

export interface TransactionStatus {
  isLoading: boolean;
  error: Error | null;
  transaction: Horizon.ServerApi.TransactionRecord | undefined;
  refetch: () => Promise<void>;
  secondsUntilNextRefresh: number | null;
}

export function useTransactionStatus(
  transactionHash: string,
  refreshMs?: number
): TransactionStatus {
  const config = useStellarConfig();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [transaction, setTransaction] = useState<Horizon.ServerApi.TransactionRecord | undefined>(
    undefined
  );

  const [secondsUntilNextRefresh, setSecondsUntilNextRefresh] = useState<number | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const nextRefreshAtRef = useRef<number | null>(null);

  const scheduleNextRefresh = useCallback(() => {
    if (!refreshMs || refreshMs <= 0) {
      nextRefreshAtRef.current = null;
      setSecondsUntilNextRefresh(null);
      return;
    }

    const next = Date.now() + refreshMs;
    nextRefreshAtRef.current = next;
    setSecondsUntilNextRefresh(Math.ceil(refreshMs / 1000));
  }, [refreshMs]);

  const checkTransactionStatus = useCallback(async () => {
    if (!transactionHash) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const trx = await fetchTransaction(transactionHash, config);

      if (!trx) {
        setTransaction(undefined);
        return;
      }

      setTransaction(trx);
    } catch (err: any) {
      logger.error('[useTransactionStatus] Error checking transaction status:', err);
      setError(err);
    } finally {
      setIsLoading(false);
      scheduleNextRefresh();
    }
  }, [transactionHash, scheduleNextRefresh, config]);

  // Initial fetch / hash change
  useEffect(() => {
    checkTransactionStatus();
  }, [checkTransactionStatus]);

  // Polling effect
  useEffect(() => {
    if (!refreshMs || refreshMs <= 0 || (transaction && transaction.successful)) return;

    scheduleNextRefresh();

    intervalRef.current = setInterval(() => {
      checkTransactionStatus();
    }, refreshMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refreshMs, transaction, checkTransactionStatus, scheduleNextRefresh]);

  // Countdown ticker (1s resolution)
  useEffect(() => {
    if (!refreshMs || refreshMs <= 0 || (transaction && transaction.successful)) return;

    countdownRef.current = setInterval(() => {
      if (!nextRefreshAtRef.current) return;

      const remainingMs = nextRefreshAtRef.current - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      setSecondsUntilNextRefresh(remainingSec);
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [refreshMs, transaction]);

  return {
    isLoading,
    error,
    transaction,
    refetch: checkTransactionStatus,
    secondsUntilNextRefresh,
  };
}
