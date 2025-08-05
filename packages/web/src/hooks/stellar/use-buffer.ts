'use client';

import type { Reserve } from '@normalfinance/contracts/build/buffer';

import { constants } from '@normalfinance/utils';
import { captureException } from '@sentry/nextjs';
import { useState, useEffect, useCallback } from 'react';
import { BufferContract } from '@normalfinance/contracts';

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

export function useBuffer(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [buffer, setBuffer] = useState<BufferInfo | undefined>(undefined);

  const fetchBuffer = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const Buffer = new BufferContract.Client({
        contractId: constants.StellarConfig.BUFFER_ADDRESS,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      const [min_time_between_payouts, min_reserve_ratio, last_payout_timestamp, reserve] =
        await Promise.all([
          Buffer.get_min_time_between_payouts(),
          Buffer.get_min_reserve_ratio(),
          Buffer.get_last_payout_timestamp(),
          Buffer.get_reserve({ token: constants.StellarConfig.XLM_ADDRESS }),
        ]);

      // if (min_time_between_payouts?.result) {
      setBuffer({
        min_time_between_payouts: min_time_between_payouts.result,
        min_reserve_ratio: min_reserve_ratio.result,
        last_payout_timestamp: last_payout_timestamp.result,
        reserve: reserve.result,
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
