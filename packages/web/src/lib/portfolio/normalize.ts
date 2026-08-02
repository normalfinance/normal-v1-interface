import type { SavingsPosition } from '@/types/savings';
import type { AssetStatus, PortfolioAsset, PortfolioChain } from '@/types/portfolio';

import { CHAINS, CHAIN_IDS } from '@/lib/chains/registry';

// ---------------------------------------------------------------------------
// Pure portfolio/savings normalization + reconciliation. NO I/O, no server-only
// imports — so it's unit-testable in isolation (see normalize.test.ts) and
// shared by the server aggregator and the client savings read.
// ---------------------------------------------------------------------------

// Native assets derive from the chain registry so this can't drift out of sync
// with it; non-native assets (USDC on Stellar) are listed explicitly, since a
// chain's registry entry describes the chain, not every token issued on it.
export const ASSET_META: Record<string, { chain: PortfolioChain; decimals: number }> = {
  ...Object.fromEntries(
    CHAIN_IDS.map((id) => [
      CHAINS[id].symbol,
      { chain: CHAINS[id].id as PortfolioChain, decimals: CHAINS[id].decimals },
    ])
  ),
  USDC: { chain: 'stellar', decimals: 7 },
};

/** Normalize a single asset. No address → not set up → holds 0 (not an error);
 *  address present but balance null → the source errored. */
export function buildAsset(
  symbol: string,
  address: string | null,
  balance: number | null,
  price: number | null,
  change24h: number | null = null
): PortfolioAsset {
  const meta = ASSET_META[symbol];
  const bal = address ? balance : 0;
  const status: AssetStatus = bal === null ? 'error' : 'ok';
  const balanceStr = bal === null ? null : String(bal);
  const usdValue = bal !== null && price !== null ? String(bal * price) : null;
  return {
    symbol,
    chain: meta.chain,
    address,
    balance: balanceStr,
    price: price !== null ? String(price) : null,
    usdValue,
    change24h,
    decimals: meta.decimals,
    status,
  };
}

export interface PortfolioPayloadLike {
  updatedAt: number;
  assets: PortfolioAsset[];
}

/** Merge fresh assets with a last-good snapshot: an errored asset falls back to
 *  its prior value (marked `stale`); ok assets refresh the snapshot. */
export function applyStaleFallback(
  fresh: PortfolioPayloadLike,
  lastGood: Record<string, PortfolioAsset> | null
): { merged: PortfolioPayloadLike; snapshot: Record<string, PortfolioAsset> } {
  const snapshot: Record<string, PortfolioAsset> = { ...(lastGood ?? {}) };
  const assets = fresh.assets.map((a) => {
    if (a.status === 'ok') {
      snapshot[a.symbol] = a;
      return a;
    }
    const prior = lastGood?.[a.symbol];
    if (prior && prior.balance !== null) {
      return { ...prior, status: 'stale' as AssetStatus, price: a.price ?? prior.price };
    }
    return a;
  });
  return { merged: { ...fresh, assets }, snapshot };
}

const ZERO_POSITION: SavingsPosition = {
  shares: '0',
  currentValue: '0',
  totalDeposited: '0',
  earnings: '0',
};

/** Reconcile a fresh savings read against the cached value.
 *  - NEVER clobber a real (>0) position with a 0/empty result — the Soroban RPC
 *    and events indexer transiently return nothing; the read SWR is shared, so a
 *    bad read would otherwise zero savings everywhere and stick.
 *  - The events indexer lags 30-120s behind, so a small totalDeposited dip after
 *    a recent (optimistically cached) deposit is treated as lag, keeping prev. */
export function reconcileSavingsPosition(
  apiPos: SavingsPosition | undefined | null,
  prev: SavingsPosition | null
): SavingsPosition {
  const apiCV = apiPos ? parseFloat(apiPos.currentValue || '0') : 0;
  const prevCV = prev ? parseFloat(prev.currentValue || '0') : 0;

  if (apiCV <= 0 && prevCV > 0 && prev) return prev;
  if (!apiPos) return ZERO_POSITION;

  if (prev) {
    const apiTD = parseFloat(apiPos.totalDeposited);
    const prevTD = parseFloat(prev.totalDeposited);
    const currentValue = parseFloat(apiPos.currentValue);
    const tdDrop = prevTD - apiTD;
    const smallIndexerLag = tdDrop > 0.001 && prevTD > 0 && tdDrop / prevTD < 0.2;
    const stale = apiTD > currentValue + 0.001 || smallIndexerLag;
    if (stale) {
      return {
        ...apiPos,
        totalDeposited: prev.totalDeposited,
        earnings: Math.max(currentValue - prevTD, 0).toFixed(7),
      };
    }
  }
  return apiPos;
}
