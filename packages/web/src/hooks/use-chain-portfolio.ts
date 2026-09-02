'use client';

// ---------------------------------------------------------------------------
// P0-1 (#66): native ETH / SOL balance + price — now thin SELECTORS over the
// shared server aggregate (`useWalletBalances`) instead of browser-direct
// JSON-RPC calls per mount per user. See use-btc-portfolio.ts for the full
// rationale.
//
// STILL exported for ACTION-TIME use (the data-layer rule: display reads
// share the cache; action-time freshness keeps its own live read):
//  - fetchEthBalance / fetchSolBalance — coinbase-offramp-modal's preflight
//  - ETH_RPC_URL / SOL_RPC_URL — tx-confirmation probing (lifi-tracker,
//    send-confirmation) and send building
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import { rpcFromPool } from '@/lib/portfolio/rpc-pool';
import { nativeAssetToToken } from '@/lib/portfolio/native-token';
import { ETH_RPC_URLS, SOL_RPC_URLS } from '@/lib/chains/rpc-fallback';

import { useTurnkeyWallet } from './use-turnkey-wallet';
import { useWalletBalances } from './use-wallet-balances';

export const ETH_RPC_URL =
  process.env.NEXT_PUBLIC_ETH_RPC_URL ?? 'https://ethereum-rpc.publicnode.com';
// NOTE: the official api.mainnet-beta.solana.com endpoint 403s browser/agent
// requests — use publicnode's keyless RPC by default. For production set a
// dedicated keyed RPC (e.g. Helius) via NEXT_PUBLIC_SOLANA_RPC_URL.
export const SOL_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://solana-rpc.publicnode.com';

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

/** ACTION-TIME live read (off-ramp preflight) — not for display paths.
 *  Pooled since 2026-09-02: a provider hiccup here reads as "you don't have
 *  the funds", which is worse than a slow answer from a fallback. */
export async function fetchEthBalance(address: string): Promise<number> {
  const { value } = await rpcFromPool(ETH_RPC_URLS, (url) =>
    rpc(url, 'eth_getBalance', [address, 'latest'])
  );
  return Number(BigInt(value as string)) / 1e18;
}

/** ACTION-TIME live read (off-ramp preflight) — not for display paths. */
export async function fetchSolBalance(address: string): Promise<number> {
  const { value } = await rpcFromPool(SOL_RPC_URLS, (url) => rpc(url, 'getBalance', [address]));
  return ((value as any)?.value ?? 0) / 1e9;
}

function useChainPortfolio(chain: 'ethereum' | 'solana', enabled = true) {
  const { addresses, loading: walletLoading, hasWallet, refetch } = useTurnkeyWallet(enabled);
  const balances = useWalletBalances(enabled);

  const address =
    (chain === 'ethereum' ? addresses?.ethereumAddress : addresses?.solanaAddress) ?? null;
  const asset = balances.getAsset(chain === 'ethereum' ? 'ETH' : 'SOL');
  // Memoized for a STABLE identity between data updates — see the note in
  // use-btc-portfolio.ts (fresh-per-render objects wiped the send form).
  const token = useMemo(
    () => (address ? nativeAssetToToken(asset, chain) : null),
    [address, asset, chain]
  );

  return {
    token,
    address,
    hasWallet,
    loading: walletLoading || balances.isLoading,
    // Per-asset error from the aggregate — same meaning as the old
    // balanceError: the chain source failed, distinct from a genuine zero.
    error: asset?.status === 'error',
    refetch,
    refetchBalance: balances.refreshFresh,
  };
}

export function useEthPortfolio(enabled = true) {
  const { token, address, hasWallet, loading, error, refetch, refetchBalance } = useChainPortfolio(
    'ethereum',
    enabled
  );
  return {
    ethToken: token,
    ethereumAddress: address,
    hasWallet,
    loading,
    error,
    refetch,
    refetchBalance,
  };
}

export function useSolPortfolio(enabled = true) {
  const { token, address, hasWallet, loading, error, refetch, refetchBalance } = useChainPortfolio(
    'solana',
    enabled
  );
  return {
    solToken: token,
    solanaAddress: address,
    hasWallet,
    loading,
    error,
    refetch,
    refetchBalance,
  };
}
