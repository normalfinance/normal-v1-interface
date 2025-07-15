export function getCryptoIconUrl(symbol: string, addPrefix: boolean): string {
  // Ensure symbol is provided and normalize to uppercase to match file names
  if (!symbol) return '';
  // Remove non-alphanumeric characters to match file naming (e.g., strip '/', '-', spaces)
  const sanitized = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  // All Normal token icons are now stored as .webp files with an "n" prefix (e.g., nBTC.webp)
  return addPrefix
    ? `/assets/icons/crypto-icons/n${sanitized}.webp`
    : `/assets/icons/crypto-icons/${sanitized}.webp`;
}
