/**
 * Shortens a hex address to something like `0x123456...ABCD`.
 *
 * @param address The full hex address, e.g. "0x742d35Cc66..."
 * @param firstChars How many characters from the start (default 6).
 * @param lastChars How many characters from the end (default 4).
 * @returns A shortened address string, or the original address if it's too short.
 */
export function shortenAddress(address: string, firstChars = 6, lastChars = 4): string {
  if (!address) return '';
  if (address.length <= firstChars + lastChars) return address;
  const start = address.slice(0, firstChars);
  const end = address.slice(-lastChars);
  return `${start}...${end}`;
}
