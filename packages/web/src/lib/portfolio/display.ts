import type { Token } from '@normalfinance/types';
import type { PortfolioAsset } from '@/types/portfolio';

import { INK } from '@/theme/brand-colors';
import { cdn, getCryptoIconUrl } from '@normalfinance/utils';
import { CHAINS, chainForSymbol } from '@/lib/chains/registry';

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
  XLM: { name: 'Stellar', icon: getCryptoIconUrl('XLM') },
  USDC: { name: 'Digital dollars', icon: getCryptoIconUrl('USDC') },
};

export function assetDisplay(symbol: string): { name: string; icon: string } {
  return ASSET_DISPLAY[symbol] ?? { name: symbol, icon: getCryptoIconUrl(symbol) };
}

// The colour a coin is known by, for its price lines. A chain's own coin takes
// the chain's brand colour (CHAINS); these two take their logo's instead: the
// digital dollar its issuer's blue, Stellar's coin the black of its rocket
// (the registry's teal marks the Stellar chain in badges, not the coin).
const COIN_COLORS: Record<string, string> = {
  USDC: '#2775CA',
  // The ink token, so its line turns light on the dark page.
  XLM: INK,
};

/** The colour of a coin's price line: its logo's colour, ink when unknown. */
export function assetColor(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (COIN_COLORS[upper]) return COIN_COLORS[upper];
  const chain = chainForSymbol(upper);
  return chain ? CHAINS[chain].brandColor : INK;
}

/** #32: short human label for the connected external wallet, used to tag
 *  per-wallet asset rows on account-wide surfaces. */
export function connectedWalletLabel(walletType?: string | null): string {
  switch (walletType) {
    case 'freighter':
      return 'Freighter';
    case 'lobstr':
      return 'Lobstr';
    case 'ledger':
      return 'Ledger';
    case 'wallet-connect':
      return 'WalletConnect';
    default:
      return 'Connected wallet';
  }
}

export function portfolioAssetToToken(a: PortfolioAsset): Token {
  // Fall back to the shared asset display so XLM/USDC get their real name and
  // icon — the old `icon: ''` fallback rendered broken images the first time
  // the drawer showed companion XLM/USDC rows (observed live 2026-08-15).
  const d = NATIVE_DISPLAY[a.symbol] ?? {
    name: assetDisplay(a.symbol).name,
    contract: a.symbol,
    icon: assetDisplay(a.symbol).icon,
  };
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

// ---------------------------------------------------------------------------
// Doc 129: the Base rows. Base is the network Circle swaps and Autoinvest pass
// through; what sits on the person's own address there is theirs and counts.
// Their own contract ids, so a Base row never collides with the Stellar
// Digital dollars row or the Ethereum row (React keys, lookups, tabs).
// ---------------------------------------------------------------------------

export const BASE_TOKEN_CONTRACTS: Record<string, string> = {
  USDC: '__base_usdc__',
  ETH: '__base_eth__',
};

export const isBaseToken = (token: { contract: string }) =>
  Object.values(BASE_TOKEN_CONTRACTS).includes(token.contract);

/** A Base row as a Token. The " · " part of the name is the row's label. */
export function baseAssetToToken(a: PortfolioAsset): Token {
  const token = portfolioAssetToToken(a);
  const label = a.symbol === 'ETH' ? 'Base · Network fees' : 'Base';
  return {
    ...token,
    contract: BASE_TOKEN_CONTRACTS[a.symbol] ?? `__base_${a.symbol.toLowerCase()}__`,
    name: `${token.name} · ${label}`,
  } as Token;
}

/**
 * Each Base row right under the last row of the same coin (USDC on Base under
 * Digital dollars, ETH on Base under Ethereum), the rest in their order. A
 * Base row whose coin has no row of its own goes last. Pure.
 */
export function placeBaseRows<T extends { symbol: string; contract: string }>(rows: T[]): T[] {
  const out = rows.filter((r) => !isBaseToken(r));
  for (const b of rows.filter(isBaseToken)) {
    let at = -1;
    out.forEach((r, i) => {
      if (r.symbol === b.symbol) at = i;
    });
    out.splice(at === -1 ? out.length : at + 1, 0, b);
  }
  return out;
}
