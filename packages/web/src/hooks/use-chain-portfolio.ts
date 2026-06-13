'use client';

import type { Token } from '@normalfinance/types';

import { cdn } from '@normalfinance/utils';
import { useState, useEffect } from 'react';

import { useTurnkeyWallet } from './use-turnkey-wallet';

// ---------------------------------------------------------------------------
// Native ETH / SOL balance + USD price, mirroring use-btc-portfolio.
// Balances come from public JSON-RPC endpoints; prices reuse our cached
// /api/prices/history route (last point of the 1d series).
// ---------------------------------------------------------------------------

export const ETH_RPC_URL =
  process.env.NEXT_PUBLIC_ETH_RPC_URL ?? 'https://ethereum-rpc.publicnode.com';
export const SOL_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';

async function rpc(url: string, method: string, params: unknown[]): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${method} failed (${res.status})`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message ?? `RPC ${method} error`);
  return data.result;
}

export async function fetchEthBalance(address: string): Promise<number> {
  const hex: string = await rpc(ETH_RPC_URL, 'eth_getBalance', [address, 'latest']);
  return Number(BigInt(hex)) / 1e18;
}

export async function fetchSolBalance(address: string): Promise<number> {
  const result = await rpc(SOL_RPC_URL, 'getBalance', [address]);
  return (result?.value ?? 0) / 1e9;
}

async function fetchUsdPrice(symbol: string): Promise<number> {
  try {
    const res = await fetch(`/api/prices/history?symbol=${symbol}&range=1d`);
    if (!res.ok) return 0;
    const data = await res.json();
    const prices: [number, number][] = data?.prices ?? [];
    return prices.length ? prices[prices.length - 1][1] : 0;
  } catch {
    return 0;
  }
}

interface ChainSpec {
  symbol: string;
  name: string;
  contract: string;
  icon: string;
  decimals: number;
  addressKey: 'ethereumAddress' | 'solanaAddress';
  fetchBalance: (address: string) => Promise<number>;
}

const CHAIN_SPECS: Record<'ethereum' | 'solana', ChainSpec> = {
  ethereum: {
    symbol: 'ETH',
    name: 'Ethereum',
    contract: '__eth__',
    icon: cdn('tokens/ethereum.webp'),
    decimals: 18,
    addressKey: 'ethereumAddress',
    fetchBalance: fetchEthBalance,
  },
  solana: {
    symbol: 'SOL',
    name: 'Solana',
    contract: '__sol__',
    icon: cdn('tokens/solana.webp'),
    decimals: 9,
    addressKey: 'solanaAddress',
    fetchBalance: fetchSolBalance,
  },
};

function useChainPortfolio(chain: 'ethereum' | 'solana', enabled = true) {
  const spec = CHAIN_SPECS[chain];
  const { addresses, loading: walletLoading, hasWallet, refetch } = useTurnkeyWallet(enabled);
  const [token, setToken] = useState<Token | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const address = addresses?.[spec.addressKey] ?? null;

  useEffect(() => {
    if (!address) {
      setToken(null);
      return;
    }
    setBalanceLoading(true);
    Promise.all([
      spec.fetchBalance(address).catch(() => 0),
      fetchUsdPrice(spec.symbol),
    ]).then(([balance, price]) => {
      setToken({
        symbol: spec.symbol,
        contract: spec.contract,
        name: spec.name,
        issuer: '',
        org: '',
        domain: '',
        icon: spec.icon,
        decimals: spec.decimals,
        featured: false,
        balance: String(balance),
        price: String(price),
        percentageChange: 0,
      } as Token);
      setBalanceLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  return {
    token,
    address,
    hasWallet,
    loading: walletLoading || balanceLoading,
    refetch,
  };
}

export function useEthPortfolio(enabled = true) {
  const { token, address, hasWallet, loading, refetch } = useChainPortfolio('ethereum', enabled);
  return { ethToken: token, ethereumAddress: address, hasWallet, loading, refetch };
}

export function useSolPortfolio(enabled = true) {
  const { token, address, hasWallet, loading, refetch } = useChainPortfolio('solana', enabled);
  return { solToken: token, solanaAddress: address, hasWallet, loading, refetch };
}
