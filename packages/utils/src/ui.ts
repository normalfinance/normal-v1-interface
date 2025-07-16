export function getCryptoIconUrl(symbol: string): string {
  // Ensure symbol is provided and normalize to uppercase to match file names
  if (!symbol) return '';

  // Remove non-alphanumeric characters to match file naming (e.g., strip '/', '-', spaces)
  const sanitized = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Always use plain 'XLM'
  if (sanitized === 'XLM') {
    return `/assets/icons/crypto-icons/XLM.webp`;
  }

  // Normal tokens are prefixed with 'n'
  const isNormalToken = sanitized.startsWith('N') && sanitized !== 'XLM';

  // Use n-prefix for Normal tokens, else raw symbol
  const fileName = isNormalToken ? sanitized : sanitized;

  return `/assets/icons/crypto-icons/${isNormalToken ? fileName : sanitized}.webp`;
}
