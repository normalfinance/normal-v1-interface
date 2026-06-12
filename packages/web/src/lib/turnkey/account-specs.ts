import type { v1WalletAccountParams } from '@turnkey/sdk-types';

// ---------------------------------------------------------------------------
// Turnkey wallet account specs — single source of truth, safe to import from
// both server routes and client code (plain data + types only).
//
// IMPORTANT: accounts are created LAZILY, one chain at a time, only when the
// user acts on that asset — Turnkey pricing scales with addresses. Never
// create all chains up front.
// ---------------------------------------------------------------------------

/** Native SegWit Bitcoin (bc1q…) — standard BIP-84 path */
export const BITCOIN_ACCOUNT: v1WalletAccountParams[] = [
  {
    curve: 'CURVE_SECP256K1',
    pathFormat: 'PATH_FORMAT_BIP32',
    path: "m/84'/0'/0'/0/0",
    addressFormat: 'ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH',
  },
];

/** Ethereum (0x…) — standard BIP-44 path */
export const ETHEREUM_ACCOUNT: v1WalletAccountParams[] = [
  {
    curve: 'CURVE_SECP256K1',
    pathFormat: 'PATH_FORMAT_BIP32',
    path: "m/44'/60'/0'/0/0",
    addressFormat: 'ADDRESS_FORMAT_ETHEREUM',
  },
];

/** Stellar (G…) — standard SEP-0005 path, matches our local mnemonic derivation */
export const XLM_ACCOUNT: v1WalletAccountParams[] = [
  {
    curve: 'CURVE_ED25519',
    pathFormat: 'PATH_FORMAT_BIP32',
    path: "m/44'/148'/0'",
    addressFormat: 'ADDRESS_FORMAT_XLM',
  },
];
