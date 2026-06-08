'use client';

import type { Token } from '@normalfinance/types';

import { cdn } from '@normalfinance/utils';
import { useState, useEffect } from 'react';

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

  useEffect(() => {
    const addr = addresses?.bitcoinAddress;
    if (!addr) {
      setBtcToken(null);
      return;
    }
    setBalanceLoading(true);
    fetchBtcData(addr).then((data) => {
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
    });
  }, [addresses?.bitcoinAddress]);

  return {
    btcToken,
    bitcoinAddress: addresses?.bitcoinAddress ?? null,
    hasWallet,
    loading: walletLoading || balanceLoading,
    refetch,
  };
}
