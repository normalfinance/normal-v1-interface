import { SAVINGS_COLOR } from '@/lib/portfolio/allocation';

import { PRE_RECORDING_FEES } from './snapshot';

// ----------------------------------------------------------------------
// The /dashboard's chart colours. Charts need real values (the chart library
// mixes and parses them), so they live here rather than as CSS tokens.
//
// One colour per product, the same on every chart and in both modes: the
// logo's hues at the depth a chart mark keeps on the white page and on the
// dark one. Savings takes the app's own Savings mint (SAVINGS_COLOR), so it
// reads the same on the site, in the app and here. The order is the order the
// products stack in (largest volume first), and was checked with the dataviz
// validator for both surfaces (2026-11-18): every neighbour 13 or more apart
// for red-green colour blindness (deutan) and 24 or more for full colour
// vision; inside the chart lightness band; 3:1 on the dark page, and on white
// all but the mint, which the legend's words and values back up.
// ----------------------------------------------------------------------

export const PRODUCT_COLOR: Record<string, string> = {
  savings: SAVINGS_COLOR,
  cctp: '#7C5CF0',
  soroswap: '#E8613E',
  lifi: '#0A8FD6',
  send: '#D6338A',
  ramp: '#B8800F',
};

/** Anything without a colour of its own, and fees recorded before per-swap recording. */
export const OTHER_COLOR = '#8E8E99';

export const productColor = (product: string): string =>
  product === PRE_RECORDING_FEES ? OTHER_COLOR : (PRODUCT_COLOR[product] ?? OTHER_COLOR);

/** CCTP into Stellar (the direction Stellar gains) and out of it. */
export const BRIDGE_COLOR = { in: '#0A8FD6', out: OTHER_COLOR } as const;
