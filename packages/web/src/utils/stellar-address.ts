/**
 * Validates a Stellar address (public key starting with G, or contract address starting with C).
 * Both use base32 encoding: A-Z and 2-7, 56 characters total.
 */
export function isValidStellarAddress(address: string): boolean {
  return address === 'native' || /^[GC][A-Z2-7]{55}$/.test(address);
}
