export enum AddressType {
  Bitcoin = 'BTC',
  Ethereum = 'ETH',
  Solana = 'SOL',
  Unknown = 'UNKNOWN',
}

export function isValidBitcoinAddress(address: string | undefined | null): address is string {
  if (!address) return false;

  if (/^(bc1|BC1|tb1)[0-9a-z]{25,63}$/.test(address)) return true;

  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) return true;
  if (/^[mn2][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) return true;

  return false;
}

export function isValidEthereumAddress(address: string | undefined | null): address is string {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function isValidSolanaAddress(address: string | undefined | null): address is string {
  if (!address) return false;

  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

export function detectAddressType(address: string | undefined | null): AddressType {
  if (isValidBitcoinAddress(address)) return AddressType.Bitcoin;
  if (isValidEthereumAddress(address)) return AddressType.Ethereum;
  if (isValidSolanaAddress(address)) return AddressType.Solana;
  return AddressType.Unknown;
}

export function isValidCryptoAddress(address: string | undefined | null): address is string {
  return detectAddressType(address) !== AddressType.Unknown;
}

export function validateCryptoAddress(
  address: string | undefined | null,
  expectedType: AddressType
): string | null {
  if (!address) {
    return 'Address is required.';
  }

  switch (expectedType) {
    case AddressType.Bitcoin:
      return isValidBitcoinAddress(address) ? null : 'Invalid Bitcoin address.';

    case AddressType.Ethereum:
      return isValidEthereumAddress(address) ? null : 'Invalid Ethereum address.';

    case AddressType.Solana:
      return isValidSolanaAddress(address) ? null : 'Invalid Solana address.';

    default:
      return isValidCryptoAddress(address) ? null : 'Invalid crypto address format.';
  }
}
