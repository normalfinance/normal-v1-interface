'use client';

import { useState, useCallback } from 'react';
import { usePersistStore } from '@normalfinance/state';
import { logger, createTrustline } from '@normalfinance/utils';

import { useNormalWallet } from '../use-normal-wallet';
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
  const { signTransaction: signWithStellarKit, publicKey: stellarKitPublicKey } =
    useStellarWalletsKit();
  const { signTransaction: signWithNormalWallet, publicKey: normalWalletPublicKey } =
    useNormalWallet();

  // Determine which signer to use based on wallet type
  const isNormalWallet = storePersist.wallet.walletType === 'normal-wallet';
  const signTransaction = isNormalWallet ? signWithNormalWallet : signWithStellarKit;
  const publicKey = isNormalWallet ? normalWalletPublicKey : stellarKitPublicKey;

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
          throw new Error('No account found');
        }

        logger.log('[TRUSTLINE] Creating trustline for:', assetCode, 'with issuer:', assetIssuer);

        await createTrustline(walletAddress, assetCode, assetIssuer, signTransaction);

        logger.log('[TRUSTLINE] Trustline created successfully');
        setTrustlineButtonActive(false);
      } catch (e: any) {
        logger.error('[TRUSTLINE] Error creating trustline:', e);
        setError(e);
        setTxBroadcasting(false);
        setLoading(false);
        throw e; // Re-throw so callers can handle the error in UI
      }

      setTxBroadcasting(false);
      setLoading(false);
    },
    [storePersist.wallet.address, storePersist.wallet.walletType, publicKey, signTransaction]
  );

  return {
    error,
    loading,
    txBroadcasting,
    trustlineButtonActive,
    addTrustLine,
  };
}
