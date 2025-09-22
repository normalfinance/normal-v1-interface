import { PoolRouterContract } from '@normalfinance/contracts';
import { Horizon } from '@stellar/stellar-sdk';

export type ApiToken = {
  code: string;
  issuer: string;
  contract: string;
  name: string;
  org: string;
  domain: string;
  icon: string;
  decimals: number;
};

export type StateToken = {
  id: string;
  balance: number;
  decimals: number;
  symbol: string;
  // ===
  name: string;
  icon: string;
  usdValue: number;
  featured: boolean;
  percentageChange?: number;
};

export type TokenMapType = {
  [key: string]: StateToken;
};

export type TokenBalancesMap = {
  [tokenAddress: string]: { usdValue: string; balance: string };
};

export type Wallet = {
  address: string | undefined;
  activeChain: WalletChain | undefined;
  server: Horizon.Server | undefined;
  walletType:
    | 'freighter'
    | 'xbull'
    | 'lobstr'
    | 'wallet-connect'
    | 'hana'
    | 'ledger'
    | 'hana-stellar-kit'
    | 'xbull-stellar-kit'
    | 'freighter-stellar-kit'
    | 'lobstr-stellar-kit'
    | 'stellar-wallets-kit'
    | 'wallet-connect-stellar-kit'
    | 'ledger-stellar-kit'
    | undefined;
};

export interface WalletActions {
  tokens: StateToken[];
  walletConnectInstance?: any;
  fetchNativeTokenInfo: () => Promise<StateToken | undefined>;
  fetchNormalTokenInfo: (
    pool: PoolRouterContract.PoolInfo,
    xlmPrice: number
  ) => Promise<StateToken | undefined>;
  fetchApiTokenInfo: (apiToken: ApiToken) => Promise<StateToken | undefined>;
  getAllTokens: () => Promise<StateToken[]>;
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

export interface Connector {
  id: string;
  name: string;
  iconUrl: string;
  iconBackground: string;
  installed: boolean;
  downloadUrls: {
    browserExtension: string;
  };
  client?: any;

  isConnected(): Promise<boolean>;

  getNetworkDetails(): Promise<NetworkDetails>;

  getPublicKey(): Promise<string>;

  isAvailable(): Promise<boolean>;

  signTransaction(
    xdr: string,
    opts?: {
      network?: string;
      networkPassphrase?: string;
      accountToSign?: string;
    }
  ): Promise<string>;
}

// Sourced from https://github.com/tmm/wagmi/blob/main/packages/core/src/constants/chains.ts
// This is just so we can clearly see which of wagmi's first-class chains we provide metadata for
export type ChainName = 'futurenet' | 'public' | 'testnet' | 'sandbox' | 'standalone';

export type ChainMetadata = WalletChain;
