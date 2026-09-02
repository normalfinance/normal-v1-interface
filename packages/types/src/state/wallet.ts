import { Horizon } from '@stellar/stellar-sdk';

export type Wallet = {
  address: string | undefined;
  activeChain: WalletChain | undefined;
  server: Horizon.Server | undefined;
  // 'xbull' and 'hana' removed 2026-08-07 (finding #43): their kit modules
  // were deleted in May; a persisted legacy value now simply fails the
  // restore lookup and disconnects, same as before, minus the dead options.
  walletType:
    | 'freighter'
    | 'lobstr'
    | 'stellar-wallets-kit'
    | 'wallet-connect'
    | 'ledger'
    | 'normal-wallet'
    | undefined;
};

export interface WalletActions {
  walletConnectInstance?: any;
}

export interface WalletChain {
  id: string;
  name?: string;
  networkPassphrase: string;
  iconBackground?: string;
  iconUrl?: string | null;
  // TODO: Use this to indicate which chains a dapp supports
  unsupported?: boolean;
}

export interface NetworkDetails {
  network: string;
  networkUrl: string;
  networkPassphrase: string;
}

// Sourced from https://github.com/tmm/wagmi/blob/main/packages/core/src/constants/chains.ts
// This is just so we can clearly see which of wagmi's first-class chains we provide metadata for
export type ChainName = 'futurenet' | 'public' | 'testnet' | 'sandbox' | 'standalone';

export type ChainMetadata = WalletChain;
