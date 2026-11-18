'use client';

import { WARNING, BRAND_COLORS } from '@/theme/brand-colors';

// ---------------------------------------------------------------------------
// Which network an asset lives on (Stellar USDC is not Ethereum USDC; BTC is
// its own network). Shown as the small circle on the coin (AssetAvatar) or in
// words, never as a coloured chip (Niko 2026-11-09: the NetworkBadge pill went).
// ---------------------------------------------------------------------------

export type AssetNetwork = 'Bitcoin' | 'Stellar' | 'Ethereum' | 'Solana';

export function getAssetNetwork(token: { contract: string }): AssetNetwork {
  switch (token.contract) {
    case '__btc__':
      return 'Bitcoin';
    case '__eth__':
      return 'Ethereum';
    case '__sol__':
      return 'Solana';
    default:
      return 'Stellar';
  }
}

export const NETWORK_STYLES: Record<AssetNetwork, { dot: string; bg: string; color: string }> = {
  Bitcoin: { dot: '#F7931A', bg: 'rgba(247,147,26,0.09)', color: WARNING },
  Stellar: { dot: '#14B8A6', bg: 'rgba(20,184,166,0.09)', color: '#0A5C52' },
  Ethereum: { dot: '#627EEA', bg: 'rgba(98,126,234,0.09)', color: BRAND_COLORS.sky.deep },
  Solana: { dot: '#9945FF', bg: 'rgba(153,69,255,0.09)', color: BRAND_COLORS.violet.deep },
};
