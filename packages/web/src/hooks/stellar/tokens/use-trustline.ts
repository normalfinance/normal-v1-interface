'use client';

import { useState, useCallback } from 'react';
import { usePersistStore } from '@normalfinance/state';
import { logger, createTrustline } from '@normalfinance/utils';

import { useStellarWalletsKit } from '../use-stellar-wallets-kit';

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
  const { signTransaction, publicKey } = useStellarWalletsKit();

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

        const walletAddress = publicKey || storePersist.wallet.address;

        if (!walletAddress) {
          throw new Error('No wallet connected');
        }

        logger.log('[TRUSTLINE] Creating trustline for:', assetCode, 'with issuer:', assetIssuer);

        await createTrustline(walletAddress, assetCode, assetIssuer, signTransaction);

        logger.log('[TRUSTLINE] Trustline created successfully');
        setTrustlineButtonActive(false);
      } catch (e: any) {
        logger.error('[TRUSTLINE] Error creating trustline:', e);
        setError(e);
      }

      setTxBroadcasting(false);
      setLoading(false);
    },
    [storePersist.wallet.address, publicKey, signTransaction]
  );

  return {
    error,
    loading,
    txBroadcasting,
    trustlineButtonActive,
    addTrustLine,
  };
}
