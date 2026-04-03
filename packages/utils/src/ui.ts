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

  // Check if original symbol started with lowercase 'n' and was followed by an uppercase letter
  const isNormalToken = /^n[A-Z0-9]/.test(symbol);

  // If Normal token, lowercase `n` prefix is preserved and attached to the uppercase remainder
  const fileName = isNormalToken ? `n${sanitized.slice(1)}` : sanitized;

  return isNormalToken ? cdn(`/tokens/normal/${fileName}.svg`) : cdn(`/tokens/${fileName}.webp`);
}
