'use client';

import type { Token } from '@normalfinance/types';

import { cdn } from '@normalfinance/utils';
import { chainOfActivityEvent } from '@/lib/tx-events';
import { useState, useEffect, useCallback } from 'react';

import { useTurnkeyWallet } from './use-turnkey-wallet';

// Every provider call the UI waits on needs a deadline — without one a slow
// provider has no upper bound, which is what makes a shared loading state
// unsafe to build (#20/#37).
const MEMPOOL_TIMEOUT_MS = 8_000;

async function fetchBtcData(address: string): Promise<{ btc: number; price: number } | null> {
  try {
    const [addrRes, priceRes] = await Promise.all([
      fetch(`https://mempool.space/api/address/${address}`, {
        signal: AbortSignal.timeout(MEMPOOL_TIMEOUT_MS),
      }),
      fetch('https://mempool.space/api/v1/prices', {
        signal: AbortSignal.timeout(MEMPOOL_TIMEOUT_MS),
      }),
    ]);
    if (!addrRes.ok) return null;
    const addrData = await addrRes.json();
    const priceData = priceRes.ok ? await priceRes.json() : null;
    const funded: number = addrData.chain_stats?.funded_txo_sum ?? 0;
    const spent: number = addrData.chain_stats?.spent_txo_sum ?? 0;
    const btc = (funded - spent) / 1e8;
    const price: number = priceData?.USD ?? 0;
    return { btc, price };
  } catch {
    return null;
  }
}

export function useBtcPortfolio(enabled = true) {
  const { addresses, loading: walletLoading, hasWallet, refetch } = useTurnkeyWallet(enabled);
  const [btcToken, setBtcToken] = useState<Token | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const address = addresses?.bitcoinAddress ?? null;

  // Re-runnable on demand (e.g. after a swap) — the effect alone only fires on
  // address change, so a same-address balance update would otherwise be missed.
  const loadBalance = useCallback(async () => {
    if (!address) {
      setBtcToken(null);
      return;
    }
    setBalanceLoading(true);
    const data = await fetchBtcData(address);
    if (!data) {
      // Provider failed or timed out. Keep whatever we last knew rather than
      // rendering a confident "0 BTC" — a wrong balance reads as lost funds,
      // and on a first load an absent card is honest where a zero is a lie.
      setBalanceLoading(false);
      return;
    }
    setBtcToken({
      symbol: 'BTC',
      contract: '__btc__',
      name: 'Bitcoin',
      issuer: '',
      org: '',
      domain: '',
      icon: cdn('tokens/bitcoin.webp'),
      decimals: 8,
      featured: false,
      balance: String(data.btc),
      price: String(data.price),
      percentageChange: 0,
    } as Token);
    setBalanceLoading(false);
  }, [address]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  // Auto-refresh when a swap settles (fires `nf:activity-updated`), so the BTC
  // balance updates everywhere without a manual page refresh. Chain-scoped
  // events (plain sends) refresh only their own chain — skip the others.
  useEffect(() => {
    const onUpdate = (e: Event) => {
      const only = chainOfActivityEvent(e);
      if (only && only !== 'bitcoin') return;
      loadBalance();
    };
    window.addEventListener('nf:activity-updated', onUpdate);
    return () => window.removeEventListener('nf:activity-updated', onUpdate);
  }, [loadBalance]);

  return {
    btcToken,
    bitcoinAddress: address,
    hasWallet,
    loading: walletLoading || balanceLoading,
    refetch,
    refetchBalance: loadBalance,
  };
}
