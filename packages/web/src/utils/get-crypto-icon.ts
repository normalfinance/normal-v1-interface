export function getCryptoIconUrl(symbol: string): string {
  // Ensure symbol is provided and normalize to uppercase to match file names
  if (!symbol) return '';
  // Remove non-alphanumeric characters to match file naming (e.g., strip '/', '-', spaces)
  const sanitized = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `/assets/icons/crypto-icons/${sanitized}.png`;
}
