import type { Token } from '@normalfinance/types';
import type { PortfolioAsset } from '@/types/portfolio';

import { cdn, getCryptoIconUrl } from '@normalfinance/utils';

// Client-safe display metadata, used to turn the lean PortfolioAsset (from the
// aggregator) into the Token shape the existing cards expect, and to label
// unified positions. NATIVE covers BTC/ETH/SOL (which have no token-store
// metadata); ASSET_DISPLAY covers all five for the composer.

const NATIVE_DISPLAY: Record<string, { name: string; contract: string; icon: string }> = {
  BTC: { name: 'Bitcoin', contract: '__btc__', icon: cdn('tokens/bitcoin.webp') },
  ETH: { name: 'Ethereum', contract: '__eth__', icon: cdn('tokens/ethereum.webp') },
  SOL: { name: 'Solana', contract: '__sol__', icon: cdn('tokens/solana.webp') },
};

const ASSET_DISPLAY: Record<string, { name: string; icon: string }> = {
  BTC: { name: 'Bitcoin', icon: cdn('tokens/bitcoin.webp') },
  ETH: { name: 'Ethereum', icon: cdn('tokens/ethereum.webp') },
  SOL: { name: 'Solana', icon: cdn('tokens/solana.webp') },
  XLM: { name: 'Stellar Lumens', icon: getCryptoIconUrl('XLM') },
  USDC: { name: 'USD Coin', icon: getCryptoIconUrl('USDC') },
};

export function assetDisplay(symbol: string): { name: string; icon: string } {
  return ASSET_DISPLAY[symbol] ?? { name: symbol, icon: getCryptoIconUrl(symbol) };
}

export function portfolioAssetToToken(a: PortfolioAsset): Token {
  const d = NATIVE_DISPLAY[a.symbol] ?? { name: a.symbol, contract: a.symbol, icon: '' };
  return {
    symbol: a.symbol,
    contract: d.contract,
    name: d.name,
    issuer: '',
    org: '',
    domain: '',
    icon: d.icon,
    decimals: a.decimals,
    featured: false,
    balance: a.balance ?? '0',
    price: a.price ?? '0',
    percentageChange: 0,
  } as Token;
}
