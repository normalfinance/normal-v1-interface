'use client';

import { useState, useCallback } from 'react';
import { usePersistStore } from '@normalfinance/state';
import { createTrustline } from '@normalfinance/utils';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  txBroadcasting: boolean;
  trustlineButtonActive: boolean;
  addTrustLine: (assetCode: string, assetIssuer: string) => Promise<void>;
}

// ----------------------------------------------------------------------

export function useTrustLine(): ReturnType {
  const storePersist = usePersistStore();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for async operations

  const [txBroadcasting, setTxBroadcasting] = useState<boolean>(false);

  const [trustlineButtonActive, setTrustlineButtonActive] = useState<boolean>(false);

  /**
   * Adds a trustline for the specified token.
   *
   * @async
   */
  const addTrustLine = useCallback(
    async (assetCode: string, assetIssuer: string): Promise<void> => {
      try {
        setError(null);

        setLoading(true);

        setTxBroadcasting(true);

        // Force check if we're using the right version

        try {
          const result = await createTrustline(
            storePersist.wallet.address!,
            assetCode,
            assetIssuer
          );
        } catch (fetchError) {
          throw fetchError; // Re-throw so the outer catch handles it
        }

        setTrustlineButtonActive(false);
      } catch (e: any) {
        setError(e);
      }

      setTxBroadcasting(false);

      setLoading(false);
    },
    [storePersist.wallet.address]
  );

  return {
    error,
    loading,
    txBroadcasting,
    trustlineButtonActive,
    addTrustLine,
  };
}
