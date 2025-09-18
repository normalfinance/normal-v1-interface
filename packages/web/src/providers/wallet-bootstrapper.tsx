'use client';

import { useEffect, useRef } from 'react';
import { usePersistStore, useAppStore } from '@normalfinance/state';
import { isWalletVerifiedForSession } from '@/utils/wallet-proof';

export default function WalletBootstrapper() {
  const persist = usePersistStore();
  const app = useAppStore();
  const address = persist.wallet.address;

  const loadingRef = useRef(false);

  const loadTokens = async () => {
    if (loadingRef.current) return;
    if (!address || !isWalletVerifiedForSession(address)) return;
    loadingRef.current = true;
    try {
      await app.getAllTokens();
    } catch (e) {
      console.error('[wallet-bootstrapper] getAllTokens failed', e);
    } finally {
      loadingRef.current = false;
    }
  };

  // on address change (covers: reload with same session, or switching account)
  useEffect(() => {
    void loadTokens();
  }, [address]);

  // when proof completes anywhere
  useEffect(() => {
    const onVerified = () => void loadTokens();
    window.addEventListener('nf:walletVerified', onVerified as any);
    return () => window.removeEventListener('nf:walletVerified', onVerified as any);
  }, []);

  return null;
}
