import { StrKey } from '@stellar/stellar-sdk';

export enum AddressType {
  Stellar = 'XLM',
  Unknown = 'UNKNOWN',
}

export function isValidStellarAddress(address: string | undefined | null): address is string {
  if (!address) return false;

  try {
    if (address.startsWith('G')) {
      StrKey.decodeEd25519PublicKey(address);
      return true;
    }
    if (address.startsWith('C')) {
      StrKey.decodeContract(address);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function detectAddressType(address: string | undefined | null): AddressType {
  if (isValidStellarAddress(address)) return AddressType.Stellar;
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
    case AddressType.Stellar:
      return isValidStellarAddress(address) ? null : 'Invalid Stellar address.';
    default:
      return isValidCryptoAddress(address) ? null : 'Invalid crypto address format.';
  }
}
