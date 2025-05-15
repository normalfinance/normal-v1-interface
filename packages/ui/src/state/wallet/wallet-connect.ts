import type { Connector, NetworkDetails } from '@normalfinance/types';

import { SOROBAN_NETWORK_PASSPHRASE } from '@normalfinance/utils/build/constants';
import {
  WalletConnectAllowedMethods,
  WalletConnect as WalletClient,
} from '@normalfinance/utils/build/stellar';

export class WalletConnect implements Connector {
  id: string;
  name: string;
  iconUrl: string;
  iconBackground: string;
  installed: boolean;
  downloadUrls: {
    browserExtension: string;
  };
  client?: WalletClient;
  publicKey?: string;

  constructor(ignoreClient = false) {
    this.id = 'wallet-connect';
    this.name = 'Wallet Connect';
    this.iconUrl = 'https://stellar.creit.tech/wallet-icons/walletconnect.svg';
    this.iconBackground = '#fff';
    this.installed = true;
    // this.downloadUrls = {
    //   browserExtension:
    //     'https://chrome.google.com/webstore/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk?hl=en',
    // };
    if (ignoreClient) return;
    this.client = new WalletClient({
      projectId: 'c23b8cc582d9a0db289b74ddda7bfc6e',
      name: 'Normal',
      description: 'Serving only the tastiest DeFi',
      url: 'https://app.normalfinance.io',
      icons: ['https://app.phoenix-hub.io/logoIcon.png'],
      method: WalletConnectAllowedMethods.SIGN_AND_SUBMIT,
      network: 'stellar:pubnet',
    });
  }

  async isConnected(): Promise<boolean> {
    console.log(this.client);
    return !!this.client;
  }

  async getNetworkDetails(): Promise<NetworkDetails> {
    return {
      network: 'public',
      networkPassphrase: SOROBAN_NETWORK_PASSPHRASE,
      networkUrl:
        'https://mainnet.stellar.validationcloud.io/v1/YcyPYotN_b6-_656rpr0CabDwlGgkT42NCzPVIqcZh0',
    };
  }

  getPublicKey(): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
    return this.client?.getPublicKey()!;
  }

  signTransaction(
    xdr: string,
    opts?: {
      network?: string;
      networkPassphrase?: string;
      accountToSign?: string;
    }
  ): Promise<string> {
    return this.client!.signTransaction(xdr, opts);
  }
}
