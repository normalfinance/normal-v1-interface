'use client';

// ---------------------------------------------------------------------------
// P0-1 (#66): BTC balance + price for swap-card / send-modal — now a thin
// SELECTOR over the shared server aggregate (`useWalletBalances`, one deduped
// SWR over /api/wallet/portfolio) instead of a browser-direct mempool.space
// fetch per mount per user. Addresses still come from the Turnkey wallet
// lookup. Provider failures surface as the aggregate's stale-snapshot values
// (the old "keep last known, never a confident 0" behavior, now server-side
// for every chain). Post-action freshness rides the shared hook's bypassed
// event refresh; `refetchBalance` is the awaitable cache-bypassing refresh
// the #62 arrival gate needs.
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import { nativeAssetToToken } from '@/lib/portfolio/native-token';

import { useTurnkeyWallet } from './use-turnkey-wallet';
import { useWalletBalances } from './use-wallet-balances';

export function useBtcPortfolio(enabled = true) {
  const { addresses, loading: walletLoading, hasWallet, refetch } = useTurnkeyWallet(enabled);
  const balances = useWalletBalances(enabled);

  const address = addresses?.bitcoinAddress ?? null;
  const asset = balances.getAsset('BTC');
  // Memoized so the token keeps a STABLE identity between data updates — the
  // pre-memo version built a fresh object every render, and consumers that
  // watch the token list (send-modal's open-reset) fired on every keystroke,
  // wiping the form (observed live 2026-08-13).
  const btcToken = useMemo(
    () => (address ? nativeAssetToToken(asset, 'bitcoin') : null),
    [address, asset]
  );

  return {
    btcToken,
    bitcoinAddress: address,
    hasWallet,
    // Doc 90 W3: BTC was the only chain with NO failure surface — an outage
    // rendered as a confident 0 and the asset page's retry branch was
    // unreachable. Same meaning as useEthPortfolio/useSolPortfolio.
    error: asset?.status === 'error',
    loading: walletLoading || balances.isLoading,
    refetch,
    refetchBalance: balances.refreshFresh,
  };
}
