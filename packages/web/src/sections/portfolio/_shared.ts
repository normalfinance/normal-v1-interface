import type { Token } from '@normalfinance/types';

import { FRAME_SX } from '@/components/_common/brand';

export const MONO = {
  fontFamily: '"Geist Mono", ui-monospace, monospace',
  fontFeatureSettings: '"ss01","ss02","zero"',
  fontVariantNumeric: 'tabular-nums',
} as const;

/** The swap card: a tool used as one unit, so it keeps its frame (Niko 2026-11-10). */
export const CARD_SX = FRAME_SX;

export interface HoldingData {
  token: Token;
  value: number;
  percentage: number;
}

export type ActivityTab = 'all' | 'swaps' | 'savings' | 'transfers';

export const PAGE_SIZE = 10;
