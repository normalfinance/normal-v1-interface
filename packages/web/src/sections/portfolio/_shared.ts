import type { Token } from '@normalfinance/types';

import { BLOCK_SX } from '@/components/_common/brand';

export const MONO = {
  fontFamily: '"Geist Mono", ui-monospace, monospace',
  fontFeatureSettings: '"ss01","ss02","zero"',
  fontVariantNumeric: 'tabular-nums',
} as const;

export const CARD_SX = BLOCK_SX;

export interface HoldingData {
  token: Token;
  value: number;
  percentage: number;
}

export type ActivityTab = 'all' | 'swaps' | 'savings' | 'transfers';

export const PAGE_SIZE = 10;
