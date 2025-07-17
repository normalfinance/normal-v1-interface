import { Address } from '@stellar/stellar-sdk';

export function isAddress(value: string): string | false {
  if (value?.length === 56) {
    try {
      return value?.match(/^[A-Z0-9]{56}$/) ? value : false;
    } catch {
      return false;
    }
  } else {
    return false;
  }
}

export function isPolkadotAdress(value: string): string | false {
  if (value?.length === 48) {
    try {
      return value?.match(/^[A-Za-z0-9]{48}$/) ? value : false;
    } catch {
      return false;
    }
  } else {
    return false;
  }
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  let parsed = isAddress(address);
  if (!parsed) {
    const isPolkadot = isPolkadotAdress(address);
    if (!isPolkadot) {
      throw Error(`Invalid 'address' parameter '${address}'.`);
    } else {
      parsed = isPolkadot;
      return `${parsed.substring(0, chars)}...${parsed.substring(48 - chars)}`;
    }
  }
  return `${parsed.substring(0, chars)}...${parsed.substring(56 - chars)}`;
}

export function isValidSymbol(code: string): boolean {
  return /^[A-Za-z0-9]{2,}$/.test(code);
}

export function convertContractAddressToHex(address: string): string {
  const addressObj = Address.fromString(address);

  // Extract raw 32-byte contract ID as hex
  return Buffer.from(addressObj.toScAddress().contractId()).toString('hex');
}
