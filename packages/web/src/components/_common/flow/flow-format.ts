'use client';

import type { Translate } from '@/lib/flow/types';

import { formatCoin } from '../app-ui';

// ---------------------------------------------------------------------------
// Figures on the review page, written the way people read them.
// ---------------------------------------------------------------------------

/**
 * A rate in the direction people read: "1 BTC ≈ 87,100 USDC", never
 * "1 USDC ≈ 0.0000114 BTC". `outPerIn` is how much `to` one `from` buys.
 */
export function readableRate(from: string, to: string, outPerIn: number): string | null {
  if (!Number.isFinite(outPerIn) || outPerIn <= 0) return null;
  return outPerIn < 0.01
    ? `1 ${to} ≈ ${formatCoin(1 / outPerIn, from)}`
    : `1 ${from} ≈ ${formatCoin(outPerIn, to)}`;
}

/** "Under 1% of this swap" rather than a misleading "0%". */
export function shareOfSwap(t: Translate, share: number): string | undefined {
  if (!Number.isFinite(share) || share <= 0) return undefined;
  const pct = share * 100;
  return pct < 1
    ? t('Under 1% of this swap')
    : t('{{pct}}% of this swap', { pct: Math.round(pct) });
}
