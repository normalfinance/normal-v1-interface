// CCTP Phase-0 spike — all constants in one place. TESTNET ONLY.
// Sources: developers.circle.com/cctp (contracts, domains), circlefin/stellar-cctp.

export const IRIS = 'https://iris-api-sandbox.circle.com';

export const DOMAIN = {
  ethereumSepolia: 0,
  baseSepolia: 6,
  stellar: 27,
};

// --- Stellar testnet ---------------------------------------------------------
export const STELLAR = {
  horizon: 'https://horizon-testnet.stellar.org',
  sorobanRpc: 'https://soroban-testnet.stellar.org',
  friendbot: 'https://friendbot.stellar.org',
  // Circle's Stellar TESTNET contracts (developers.circle.com/cctp/references/stellar-contracts)
  tokenMessengerMinter: 'CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP',
  messageTransmitter: 'CBJ6MTCKKZG73PMDZCJMSFRD7DQEMI4FKDH7CGDSV4W6FHCRBCQAVVJY',
  cctpForwarder: 'CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ',
  // Circle's official testnet USDC issuer on Stellar (faucet.circle.com asset).
  // The USDC Soroban contract id (SAC) is derived from this asset in code; the
  // outbound script cross-checks it by simulating the burn before submitting.
  usdcIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
};

// --- Base Sepolia --------------------------------------------------------------
export const BASE_SEPOLIA = {
  // CCTP V2 contracts are deployed at the same address on all EVM testnets.
  tokenMessengerV2: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
  messageTransmitterV2: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
  usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

// Standard transfer settings (per CCTP V2 docs): no fee, wait for finality.
export const MAX_FEE = 0n;
export const MIN_FINALITY_THRESHOLD = 2000;
