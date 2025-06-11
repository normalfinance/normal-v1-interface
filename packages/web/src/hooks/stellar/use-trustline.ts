'use client';

import { useState, useCallback } from 'react';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { checkTrustline, fetchAndIssueTrustline } from '@normalfinance/utils';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  txBroadcasting: boolean;
  trustlineButtonActive: boolean;
  handleTrustLine: (tokenAddress: string) => Promise<void>;
  addTrustLine: () => Promise<void>;
}

// ----------------------------------------------------------------------

export function useTrustLine(): ReturnType {
  const store = useAppStore(); // Global state management
  const storePersist = usePersistStore();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for async operations

  const [txBroadcasting, setTxBroadcasting] = useState<boolean>(false);

  const [trustlineButtonActive, setTrustlineButtonActive] = useState<boolean>(false);
  const [trustlineTokenName, setTrustlineTokenName] = useState<string>('');
  const [trustlineAssetAmount, setTrustlineAssetAmount] = useState<number>(0);

  /**
   * Handles adding a trustline for a token.
   *
   * @param {string} tokenAddress - The address of the token.
   * @async
   */
  const handleTrustLine = useCallback(
    async (tokenAddress: string): Promise<void> => {
      const trust = await checkTrustline(storePersist.wallet.address!, tokenAddress);
      setTrustlineButtonActive(!trust.exists);
      // setTrustlineTokenSymbol(trust.asset?.code || '');
      const tlAsset = await store.fetchTokenInfo(
        'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA'
      );
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      setTrustlineAssetAmount(Number(tlAsset?.balance) / 10 ** tlAsset?.decimals!);
      setTrustlineTokenName(trust.asset?.contract || '');
    },
    [storePersist.wallet.address]
  );

  /**
   * Adds a trustline for the specified token.
   *
   * @async
   */
  const addTrustLine = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      setLoading(true);

      setTxBroadcasting(true);
      await fetchAndIssueTrustline(storePersist.wallet.address!, trustlineTokenName);
      setTrustlineButtonActive(false);
    } catch (e) {
      console.log(e);
      setError(e);
    }
    setTxBroadcasting(false);

    setLoading(false);
  }, [storePersist.wallet.address, trustlineTokenName]);

  return {
    error,
    loading,
    txBroadcasting,
    trustlineButtonActive,
    handleTrustLine,
    addTrustLine,
  };
}
