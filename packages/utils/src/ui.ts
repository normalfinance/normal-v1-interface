import { cdn } from './cdn';

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

  return cdn(`/tokens/${fileName}.webp`);
}
