import { Connector, NetworkDetails } from '@normalfinance/types';
import { constants } from '@normalfinance/utils';

interface SignTransactionProps {
  xdr: string;
  accountToSign?: string;
  networkPassphrase?: string;
}

interface SignBlobProps {
  blob: string;
  accountToSign: string;
}

interface SignAuthEntryProps {
  xdr: string;
  accountToSign?: string;
}

interface SignMessageProps {
  message: string;
  accountToSign?: string;
}

declare const window: Window & {
  hanaWallet?: {
    stellar?: {
      getPublicKey(): Promise<string>;
      signTransaction({
        xdr,
        accountToSign,
        networkPassphrase,
      }: SignTransactionProps): Promise<string>;
      signBlob({ blob, accountToSign }: SignBlobProps): Promise<string>;
      signAuthEntry({ xdr, accountToSign }: SignAuthEntryProps): Promise<string>;
      signMessage({ message, accountToSign }: SignMessageProps): Promise<string>;
    };
  };
};

export function hana(): Connector {
  return {
    id: 'hana',
    name: 'Hana Wallet',
    iconUrl: '/assets/icons/wallets/hana.png',
    iconBackground: '#fff',
    installed: true,
    downloadUrls: {
      browserExtension:
        'https://chrome.google.com/webstore/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk?hl=en',
    },
    async isConnected(): Promise<boolean> {
      // Check if window has hanaWallet
      return !!window.hanaWallet;
    },
    async getNetworkDetails(): Promise<NetworkDetails> {
      return {
        network: constants.StellarConfig.NETWORK_PASSPHRASE.includes('Test') ? 'testnet' : 'public',
        networkUrl: constants.StellarConfig.HORIZON_URL,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
      };
    },
    async isAvailable(): Promise<boolean> {
      return typeof window !== 'undefined' && !!window.hanaWallet?.stellar;
    },
    async getPublicKey(): Promise<string> {
      return await window.hanaWallet!.stellar!.getPublicKey();
    },
    async signTransaction(
      xdr: string,
      opts?: {
        network?: string;
        networkPassphrase?: string;
        accountToSign?: string;
      }
    ): Promise<string> {
      const signedTx = await window.hanaWallet!.stellar!.signTransaction({
        xdr,
        accountToSign: opts?.accountToSign,
        networkPassphrase: opts?.networkPassphrase,
      });
      return signedTx;
    },
  };
}
