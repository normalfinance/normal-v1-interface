'use client';

import type { Reserve } from '@normalfinance/contracts/build/buffer';

import { constants } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import { BufferContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

export type BufferInfo = {
  min_time_between_payouts: number;
  min_reserve_ratio: number;
  last_payout_timestamp: number;
  reserve: Reserve;
};

interface ReturnType {
  error: any | null;
  loading: boolean;
  buffer: BufferInfo | undefined;
  onFetchBuffer: () => Promise<void>;
}

// ----------------------------------------------------------------------

export function useBuffer(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for async operations

  const [buffer, setBuffer] = useState<BufferInfo | undefined>(undefined);
  const storePersist = usePersistStore();

  const rateLimitCheck = async () => {
    if (!storePersist.wallet.address) return;
    const res = await fetch('/api/pools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: storePersist.wallet.address }),
    });
    if (res.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    const data = await res.json();
    if (!data.allowed) {
      throw new Error(data.error || 'Pool data access not allowed');
    }
  };

  /**
   * Fetch Insurance Fund information
   *
   * @async
   * @function fetchBuffer
   * @returns {Promise<Buffer | undefined>} A promise that resolves to the pool information or undefined in case of failure.
   */
  const fetchBuffer = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      await rateLimitCheck();

      const Buffer = new BufferContract.Client({
        contractId: constants.INSURANCE_FUND_ADDRESS,
        networkPassphrase: constants.NETWORK_PASSPHRASE,
        rpcUrl: constants.RPC_URL,
      });

      const [min_time_between_payouts, min_reserve_ratio, last_payout_timestamp, reserve] =
        await Promise.all([
          Buffer.get_min_time_between_payouts(),
          Buffer.get_min_reserve_ratio(),
          Buffer.get_last_payout_timestamp(),
          Buffer.get_reserve({ token: constants.XLM_ADDRESS }), // hardcoded since only XLM is supported
        ]);

      if (min_time_between_payouts?.result) {
        setBuffer({
          min_time_between_payouts,
          min_reserve_ratio,
          last_payout_timestamp,
          reserve,
        });
      }
    } catch (e: any) {
      console.log(e);
      setError(e.toString());
    }

    setLoading(false);
    return;
  }, []);

  // On component mount, fetch Buffer
  useEffect(() => {
    fetchBuffer();
  }, [fetchBuffer]);

  return {
    error,
    loading,
    buffer,
    onFetchBuffer: fetchBuffer,
  };
}
