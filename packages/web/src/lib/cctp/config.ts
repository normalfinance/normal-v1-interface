// Circle CCTP V2 constants — contracts, domains, attestation API — per network.
// Values validated end-to-end by the Phase-0 spike (scripts/cctp-spike) on
// 2026-07-07: outbound Stellar→Base 20s total, inbound proven incl. forwarder.
// Sources: developers.circle.com/cctp (supported-chains-and-domains,
// references/stellar, evm-smart-contracts), github.com/circlefin/stellar-cctp.

import type { NetworkType } from '@normalfinance/utils';

// CCTP domain ids (chain-agnostic constants, same on test/mainnet)
export const CCTP_DOMAIN = {
  ethereum: 0,
  solana: 5,
  base: 6,
  stellar: 27,
} as const;
export type CctpChain = keyof typeof CCTP_DOMAIN;

// Standard transfer (no Circle fee): attest at hard finality.
export const CCTP_MAX_FEE = 0n;
export const CCTP_MIN_FINALITY_THRESHOLD = 2000;

// Iris attestation service. Public, no API key; 35 req/s shared rate limit —
// exceed it and the service blocks for 5 minutes. Always call via IrisClient.
export const IRIS_URL: Record<NetworkType, string> = {
  mainnet: 'https://iris-api.circle.com',
  testnet: 'https://iris-api-sandbox.circle.com',
};

interface StellarCctpContracts {
  tokenMessengerMinter: string;
  messageTransmitter: string;
  cctpForwarder: string;
  usdcIssuer: string;
}

export const STELLAR_CCTP: Record<NetworkType, StellarCctpContracts> = {
  mainnet: {
    tokenMessengerMinter: 'CAE2G5Z77UP7GYPYGFOWFGW7C7J6I4YP2AFGSADRKQY62SYUFLPNFTXL',
    messageTransmitter: 'CACMENFFJPJMSDAJQLX4R7K3SFZIW2LJSE3R2UMLGSWHFHS353FVXAZV',
    cctpForwarder: 'CBZL2IH7F6BIDAA3WBNXYKIXSATJGMSW7K5P5MJ6STX5RXN47TZJDF5T',
    usdcIssuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  },
  testnet: {
    tokenMessengerMinter: 'CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP',
    messageTransmitter: 'CBJ6MTCKKZG73PMDZCJMSFRD7DQEMI4FKDH7CGDSV4W6FHCRBCQAVVJY',
    cctpForwarder: 'CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ',
    usdcIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  },
};

interface EvmCctpContracts {
  tokenMessengerV2: `0x${string}`;
  messageTransmitterV2: `0x${string}`;
}

// CCTP V2 contracts are deployed at identical addresses on every EVM mainnet,
// and at identical addresses on every EVM testnet.
export const EVM_CCTP: Record<NetworkType, EvmCctpContracts> = {
  mainnet: {
    tokenMessengerV2: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterV2: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
  },
  testnet: {
    tokenMessengerV2: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
    messageTransmitterV2: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
  },
};

// Native USDC token per EVM chain (testnet = the corresponding Sepolia).
export const EVM_USDC: Record<'ethereum' | 'base', Record<NetworkType, `0x${string}`>> = {
  ethereum: {
    mainnet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    testnet: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
  base: {
    mainnet: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    testnet: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
};

// Rough end-to-end ETAs for user-facing copy, from spike measurements and
// Circle's documented finality windows.
export const CCTP_ETA_SECONDS: Record<'fromStellar' | 'fromEvm', number> = {
  fromStellar: 30, // spike: 20s total (attestation ~7s)
  fromEvm: 19 * 60, // Circle: ~13–19 min mainnet hard finality (testnet slower)
};
