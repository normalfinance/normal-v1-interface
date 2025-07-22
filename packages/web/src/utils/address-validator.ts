// import { getAddress } from 'ethers';
import { StrKey } from 'stellar-sdk';
// import * as bitcoin from 'bitcoinjs-lib';
// import { PublicKey } from '@solana/web3.js';

export enum AddressType {
  // Bitcoin = 'BTC',
  // Ethereum = 'ETH',
  // Solana = 'SOL',
  Stellar = 'XLM',
  Unknown = 'UNKNOWN',
}

// export function isValidBitcoinAddress(address: string | undefined | null): address is string {
//   if (!address) return false;

//   try {
//     bitcoin.address.toOutputScript(address, bitcoin.networks.bitcoin);
//     return true;
//   } catch {
//     try {
//       bitcoin.address.toOutputScript(address, bitcoin.networks.testnet);
//       return true;
//     } catch {
//       return false;
//     }
//   }
// }

// export function isValidEthereumAddress(address: string | undefined | null): address is string {
//   if (!address) return false;

//   try {
//     getAddress(address);
//     return true;
//   } catch {
//     return false;
//   }
// }

// export function isValidSolanaAddress(address: string | undefined | null): address is string {
//   if (!address) return false;

//   try {
//     const pubkey = new PublicKey(address);

//     return PublicKey.isOnCurve(pubkey.toBytes());
//   } catch {
//     return false;
//   }
// }

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
  // if (isValidBitcoinAddress(address)) return AddressType.Bitcoin;
  // if (isValidEthereumAddress(address)) return AddressType.Ethereum;
  // if (isValidSolanaAddress(address)) return AddressType.Solana;
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
    // case AddressType.Bitcoin:
    //   return isValidBitcoinAddress(address) ? null : 'Invalid Bitcoin address.';
    // case AddressType.Ethereum:
    //   return isValidEthereumAddress(address) ? null : 'Invalid Ethereum address.';
    // case AddressType.Solana:
    //   return isValidSolanaAddress(address) ? null : 'Invalid Solana address.';
    case AddressType.Stellar:
      return isValidStellarAddress(address) ? null : 'Invalid Stellar address.';
    default:
      return isValidCryptoAddress(address) ? null : 'Invalid crypto address format.';
  }
}
