import type { Token } from '@normalfinance/types';

export const MONO = {
  fontFamily: '"Geist Mono", ui-monospace, monospace',
  fontFeatureSettings: '"ss01","ss02","zero"',
  fontVariantNumeric: 'tabular-nums',
} as const;

export const CARD_SX = {
  background: '#ffffff',
  border: '1px solid rgba(10,10,15,0.08)',
  borderRadius: '22px',
  p: '28px',
  boxShadow:
    '0 1px 0 rgba(255,255,255,0.6) inset, 0 24px 60px rgba(10,10,15,0.08), 0 2px 8px rgba(10,10,15,0.04)',
} as const;

export const DONUT_COLORS = ['#5BCFFF', '#B17BFF', '#FF7BC5', '#FFB060', '#6E8BFF', '#1AB37D', '#FF8A65'];
export const DONUT_R = 76;
export const DONUT_SIZE = 210;
export const DONUT_CX = DONUT_SIZE / 2;
export const DONUT_CY = DONUT_SIZE / 2;
export const DONUT_CIRC = 2 * Math.PI * DONUT_R;
export const DONUT_STROKE = 20;
export const DONUT_GAP = 7;

export const TAG_STYLES = {
  deposit:    { bg: 'rgba(26,179,125,0.11)',  color: '#0A6649', label: 'Deposit' },
  withdraw:   { bg: 'rgba(10,10,15,0.07)',    color: '#2A2A33', label: 'Withdraw' },
  swap:       { bg: 'rgba(177,123,255,0.13)', color: '#5A2E9E', label: 'Swap' },
  send:       { bg: 'rgba(10,10,15,0.07)',    color: '#2A2A33', label: 'Sent' },
  receive:    { bg: 'rgba(91,207,255,0.14)',  color: '#0A5272', label: 'Received' },
  buy:        { bg: 'rgba(26,179,125,0.11)',  color: '#0A6649', label: 'On-Ramp' },
  sell:       { bg: 'rgba(255,176,96,0.16)',  color: '#8A4A00', label: 'Off-Ramp' },
  mint:       { bg: 'rgba(26,179,125,0.11)',  color: '#0A6649', label: 'Mint' },
  redeem:     { bg: 'rgba(255,176,96,0.16)',  color: '#8A4A00', label: 'Redeem' },
  add_liq:    { bg: 'rgba(91,207,255,0.14)',  color: '#0A5272', label: 'Add Liquidity' },
  remove_liq: { bg: 'rgba(255,123,197,0.12)', color: '#7A1D4A', label: 'Remove Liquidity' },
} as const;

export interface ActivityItem {
  id: string;
  kind: 'swap' | 'deposit' | 'withdraw';
  assetIn: string;
  assetOut: string | null;
  amountIn: string;
  amountOut: string | null;
  txHash: string | null;
  createdAt: string;
}

export interface HoldingData {
  token: Token;
  value: number;
  percentage: number;
}

export type ActivityTab = 'all' | 'swaps' | 'savings' | 'transfers';

export const PAGE_SIZE = 10;
