import { Connector, NetworkDetails } from '@normalfinance/types';
import { constants } from '@normalfinance/utils';
import {
  StellarWalletsKit,
  WalletNetwork,
  HanaModule,
  HANA_ID,
} from '@creit.tech/stellar-wallets-kit';

// Initialize the Stellar Wallets Kit for Hana
console.log(
  '[HANA STELLAR KIT STATE] Environment variable NEXT_PUBLIC_STELLAR_NETWORK:',
  process.env.NEXT_PUBLIC_STELLAR_NETWORK
);
console.log('[HANA STELLAR KIT STATE] Forcing TESTNET network');

const stellarKit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET, // Force testnet
  selectedWalletId: HANA_ID,
  modules: [new HanaModule()],
});

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
      getPublicKey(): Promise<{ address: string }>;
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
    name: 'Hana Wallet (Stellar Kit)',
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
        network:
          (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? '').toUpperCase() === 'TESTNET'
            ? 'testnet'
            : 'public',
        networkUrl: constants.StellarConfig.HORIZON_URL,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
      };
    },
    async isAvailable(): Promise<boolean> {
      return typeof window !== 'undefined' && !!window.hanaWallet?.stellar;
    },
    async getPublicKey(): Promise<string> {
      // Always open the wallet selection modal first for user consent
      await stellarKit.openModal({
        onWalletSelected: async (option) => {
          stellarKit.setWallet(option.id);
        },
      });

      // After user selects wallet, get the address
      const result = await stellarKit.getAddress();
      return result.address;
    },
    async signTransaction(
      xdr: string,
      opts?: {
        network?: string;
        networkPassphrase?: string;
        accountToSign?: string;
      }
    ): Promise<string> {
      console.log('[HANA STELLAR KIT STATE] Signing transaction with opts:', opts);

      try {
        // Ensure wallet is set
        stellarKit.setWallet(HANA_ID);

        console.log('[HANA STELLAR KIT STATE] Attempting to sign transaction with opts:', opts);
        console.log('[HANA STELLAR KIT STATE] About to call stellarKit.signTransaction');

        // Get the current address if not provided
        const currentAddress = opts?.accountToSign || (await stellarKit.getAddress()).address;
        console.log('[HANA STELLAR KIT STATE] Using address for signing:', currentAddress);

        const { signedTxXdr } = await stellarKit.signTransaction(xdr, {
          address: currentAddress,
          networkPassphrase: 'Test SDF Network ; September 2015',
        });

        console.log('[HANA STELLAR KIT STATE] Successfully signed transaction, got result:', signedTxXdr);
        return signedTxXdr;
      } catch (error) {
        console.error('[HANA STELLAR KIT] Error signing transaction:', error);
        throw error;
      }
    },
  };
}
