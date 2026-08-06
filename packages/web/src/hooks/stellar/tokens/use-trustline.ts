'use client';

import { useStellarConfig } from '@/hooks';
import { useState, useCallback } from 'react';
import { usePersistStore } from '@normalfinance/state';
import { logger, createTrustline } from '@normalfinance/utils';

import { useStellarWalletsKit } from '../use-stellar-wallets-kit';
import { useWalletReconnect, WalletSessionExpiredError } from '../use-wallet-reconnect';
import { useNormalWallet, NORMAL_WALLET_REIMPORT_REQUIRED_MESSAGE } from '../use-normal-wallet';

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
  const config = useStellarConfig();
  const storePersist = usePersistStore();
  const { publicKey: stellarKitPublicKey } = useStellarWalletsKit();
  const {
    signTransaction: signWithNormalWallet,
    publicKey: normalWalletPublicKey,
    canSign: normalWalletCanSign,
  } = useNormalWallet();
  const { signOrReconnect } = useWalletReconnect();

  // Determine which signer to use based on wallet type
  const isNormalWallet = storePersist.wallet.walletType === 'normal-wallet';
  const signTransaction = isNormalWallet ? signWithNormalWallet : signOrReconnect;
  const publicKey = isNormalWallet ? normalWalletPublicKey : stellarKitPublicKey;

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false); // Loading state for async operations

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

        if (isNormalWallet && !normalWalletCanSign) {
          throw new Error(NORMAL_WALLET_REIMPORT_REQUIRED_MESSAGE);
        }

        const walletAddress = publicKey || storePersist.wallet.address;

        if (!walletAddress) {
          throw new Error('No account found');
        }

        logger.log('[TRUSTLINE] Creating trustline for:', assetCode, 'with issuer:', assetIssuer);
        logger.log('[TRUSTLINE] Signer context', {
          walletType: storePersist.wallet.walletType,
          walletAddress,
          configNetworkPassphrase: config.NETWORK_PASSPHRASE,
          horizonUrl: config.HORIZON_URL,
          envNetwork: process.env.NEXT_PUBLIC_NETWORK,
        });

        await createTrustline(walletAddress, assetCode, assetIssuer, signTransaction, config);

        logger.log('[TRUSTLINE] Trustline created successfully');
        setTrustlineButtonActive(false);
      } catch (e: any) {
        if (e instanceof WalletSessionExpiredError) return;
        logger.error('[TRUSTLINE] Error creating trustline:', e);
        setError(e);
        setTxBroadcasting(false);
        setLoading(false);
        throw e; // Re-throw so callers can handle the error in UI
      }

      setTxBroadcasting(false);
      setLoading(false);
    },
    [
      storePersist.wallet.address,
      storePersist.wallet.walletType,
      publicKey,
      signTransaction,
      config,
      isNormalWallet,
      normalWalletCanSign,
    ]
  );

  return {
    error,
    loading,
    txBroadcasting,
    trustlineButtonActive,
    addTrustLine,
  };
}
