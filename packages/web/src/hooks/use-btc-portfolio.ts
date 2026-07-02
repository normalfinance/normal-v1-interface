'use client';

import type { Token } from '@normalfinance/types';

import { cdn } from '@normalfinance/utils';
import { useState, useEffect, useCallback } from 'react';

import { useTurnkeyWallet } from './use-turnkey-wallet';

async function fetchBtcData(address: string): Promise<{ btc: number; price: number } | null> {
  try {
    const [addrRes, priceRes] = await Promise.all([
      fetch(`https://mempool.space/api/address/${address}`),
      fetch('https://mempool.space/api/v1/prices'),
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
      balance: String(data?.btc ?? 0),
      price: String(data?.price ?? 0),
      percentageChange: 0,
    } as Token);
    setBalanceLoading(false);
  }, [address]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  // Auto-refresh when a swap settles (fires `nf:activity-updated`), so the BTC
  // balance updates everywhere without a manual page refresh.
  useEffect(() => {
    const onUpdate = () => loadBalance();
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
