import { cdn } from './cdn';

/** Normal index tokens use a leading `n` or `sn` on the symbol (matches assets routing conventions). */
export function isNormalToken(tokenOrSymbol: string | { symbol: string }): boolean {
  const symbol = typeof tokenOrSymbol === 'string' ? tokenOrSymbol : tokenOrSymbol.symbol;
  if (!symbol) return false;
  return /^(sn|n)/.test(symbol);
}

export function getCryptoIconUrl(symbol: string): string {
  if (!symbol) return '';

  // Normalize to uppercase for consistency
  const sanitized = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Special case: always use 'XLM.webp'
  if (sanitized === 'XLM') {
    return cdn('/tokens/XLM.webp');
  }

  // The native chains are stored under their NAME, not their ticker
  // (tokens/bitcoin.webp, not tokens/BTC.webp) — building "/tokens/BTC.webp"
  // 404s, which is exactly how Bitcoin rendered as a broken image in the
  // asset picker on staging (2026-08-22) while ETH/SOL happened to carry an
  // explicit icon. Keep this in step with ASSET_DISPLAY in
  // web/src/lib/portfolio/display.ts, which uses the same files.
  const NATIVE_ICON_FILES: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    SOL: 'solana',
  };
  if (NATIVE_ICON_FILES[sanitized]) {
    return cdn(`/tokens/${NATIVE_ICON_FILES[sanitized]}.webp`);
  }

  // Check if original symbol started with lowercase 'n' and was followed by an uppercase letter
  const isNormalToken = /^n[A-Z0-9]/.test(symbol);

  // If Normal token, lowercase `n` prefix is preserved and attached to the uppercase remainder
  const fileName = isNormalToken ? `n${sanitized.slice(1)}` : sanitized;

  return isNormalToken ? cdn(`/tokens/normal/${fileName}.svg`) : cdn(`/tokens/${fileName}.webp`);
}
