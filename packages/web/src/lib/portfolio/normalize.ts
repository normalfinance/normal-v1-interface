import type { SavingsPosition } from '@/types/savings';
import type { AssetStatus, PortfolioAsset, PortfolioChain } from '@/types/portfolio';

import { CHAINS, CHAIN_IDS } from '@/lib/chains/registry';

// ---------------------------------------------------------------------------
// Pure portfolio/savings normalization + reconciliation. NO I/O, no server-only
// imports. Shared by the server aggregator and the client savings read.
//
// Tested in normalize.test.ts (`yarn test`). Every case there is anchored to a
// bug this module actually produced or a rule promised below — if a change
// fails one, it is re-introducing a bug users have already seen.
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

/** Doc 129: the coins the portfolio reads on Base, with their decimals there. */
export const BASE_ASSET_DECIMALS = { USDC: 6, ETH: 18 } as const;
export type BaseAssetSymbol = keyof typeof BASE_ASSET_DECIMALS;

/** One Base row (USDC or ETH on the person's EVM address), same rules as buildAsset. */
export function buildBaseAsset(
  symbol: BaseAssetSymbol,
  address: string,
  balance: number | null,
  price: number | null,
  change24h: number | null = null
): PortfolioAsset {
  return {
    ...buildAsset(symbol, address, balance, price, change24h),
    chain: 'base',
    decimals: BASE_ASSET_DECIMALS[symbol],
  };
}

export interface PortfolioPayloadLike {
  updatedAt: number;
  assets: PortfolioAsset[];
  base?: { address: string; assets: PortfolioAsset[] } | null;
}

/** The snapshot key of a Base row: never collides with a main asset's symbol. */
export const baseSnapshotKey = (symbol: string) => `base:${symbol}`;

/** Merge fresh assets with a last-good snapshot: an errored asset falls back to
 *  its prior value (marked `stale`); ok assets refresh the snapshot. Base rows
 *  follow the same rule under their own keys, for the same address only. */
export function applyStaleFallback(
  fresh: PortfolioPayloadLike,
  lastGood: Record<string, PortfolioAsset> | null
): { merged: PortfolioPayloadLike; snapshot: Record<string, PortfolioAsset> } {
  const snapshot: Record<string, PortfolioAsset> = { ...(lastGood ?? {}) };
  const settle = (a: PortfolioAsset, key: string, sameAddressOnly: boolean): PortfolioAsset => {
    if (a.status === 'ok') {
      snapshot[key] = a;
      return a;
    }
    const prior = lastGood?.[key];
    if (prior && prior.balance !== null && (!sameAddressOnly || prior.address === a.address)) {
      return { ...prior, status: 'stale' as AssetStatus, price: a.price ?? prior.price };
    }
    return a;
  };
  // Main assets: keyed by symbol, exactly as before.
  const assets = fresh.assets.map((a) => settle(a, a.symbol, false));
  // Base rows: their own keys, and a last-good value only for the same address.
  const base = fresh.base
    ? {
        ...fresh.base,
        assets: fresh.base.assets.map((a) => settle(a, baseSnapshotKey(a.symbol), true)),
      }
    : fresh.base;
  return { merged: { ...fresh, assets, ...(base !== undefined ? { base } : {}) }, snapshot };
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

    // Deposits and current value move together, and that relationship is what
    // identifies a lagging read — not how large the gap happens to be.
    //
    // `totalDeposited` is deposits net of withdrawals, so it can only fall if
    // the user withdrew — and a withdrawal lowers current value too. If
    // deposits fall while current value holds or rises, the deposits source is
    // behind the chain (DeFindex's events feed lags 30-120s, and falls back to
    // our own DB records when rate-limited, which may not have the newest
    // deposit yet).
    //
    // This replaces a `drop / prevTD < 0.2` heuristic that assumed the lag was
    // always small relative to the position. Depositing 4.24 into a 10.67
    // position produced a 28% gap, slipped past the threshold, and the stale
    // figure was accepted: deposits showed 10.67 against a value of 14.91, so
    // the deposit itself was displayed as 4.24 of earnings.
    const depositsFell = apiTD < prevTD - 0.001;
    const valueHeld = currentValue >= prevCV - 0.001;
    const depositsLagging = depositsFell && valueHeld;

    // Separate inconsistency: deposits exceeding the current value means the
    // deposits figure is ahead of a value that hasn't caught up.
    const stale = apiTD > currentValue + 0.001 || depositsLagging;
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
