import { Horizon } from '@stellar/stellar-sdk';

export type Wallet = {
  address: string | undefined;
  activeChain: WalletChain | undefined;
  server: Horizon.Server | undefined;
  walletType:
    | 'hana'
    | 'xbull'
    | 'freighter'
    | 'lobstr'
    | 'stellar-wallets-kit'
    | 'wallet-connect'
    | 'ledger'
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
