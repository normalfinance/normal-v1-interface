import { Connector, NetworkDetails } from '@normalfinance/types';
import { constants } from '@normalfinance/utils';
import {
  StellarWalletsKit,
  WalletNetwork,
  HANA_ID,
  HanaModule,
} from '@creit.tech/stellar-wallets-kit';

// Initialize the Stellar Wallets Kit for Hana
const stellarKit = new StellarWalletsKit({
  network:
    process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'MAINNET'
      ? WalletNetwork.PUBLIC
      : WalletNetwork.TESTNET,
  selectedWalletId: HANA_ID,
  modules: [new HanaModule()],
});

export function hanaStellarKit(): Connector {
  return {
    id: 'hana-stellar-kit',
    name: 'Hana Wallet (Stellar Kit)',
    iconUrl: '/assets/icons/wallets/hana.png',
    iconBackground: '#fff',
    installed: true,
    downloadUrls: {
      browserExtension:
        'https://chrome.google.com/webstore/detail/hana-wallet/jfdlamikmbghhapbgfoogdffldioobgl',
    },
    async isConnected(): Promise<boolean> {
      try {
        const publicKey = await stellarKit.getAddress();
        return !!publicKey;
      } catch {
        return false;
      }
    },
    async getNetworkDetails(): Promise<NetworkDetails> {
      return {
        network:
          (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? '').toUpperCase() === 'MAINNET'
            ? 'public'
            : 'testnet',
        networkUrl: constants.StellarConfig.HORIZON_URL,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
      };
    },
    async isAvailable(): Promise<boolean> {
      return typeof window !== 'undefined' && !!stellarKit.getAddress();
    },
    async getPublicKey(): Promise<string> {
      try {
        return (await stellarKit.getAddress()).address;
      } catch (error) {
        await stellarKit.openModal({
          onWalletSelected: async (option) => {
            stellarKit.setWallet(option.id);
          },
        });
        return (await stellarKit.getAddress()).address;
      }
    },
    async signTransaction(
      xdr: string,
      opts?: {
        network?: string;
        networkPassphrase?: string;
        accountToSign?: string;
      }
    ): Promise<string> {
      console.log('[HANA STELLAR KIT] Signing transaction with opts:', opts);

      try {
        const { signedTxXdr } = await stellarKit.signTransaction(xdr, {
          networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        });
        return signedTxXdr;
      } catch (error) {
        console.error('[HANA STELLAR KIT] Error signing transaction:', error);
        throw error;
      }
    },
  };
}
