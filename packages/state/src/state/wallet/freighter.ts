import freighterApi from '@stellar/freighter-api';
import { Connector, NetworkDetails } from '@normalfinance/types';
import { constants } from '@normalfinance/utils';

export function freighter(): Connector {
  return {
    id: 'freighter',
    name: 'Freighter',
    iconUrl: '/assets/icons/wallets/freighter.svg',
    iconBackground: '#fff',
    installed: true,
    downloadUrls: {
      browserExtension:
        'https://chrome.google.com/webstore/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk?hl=en',
    },
    async isConnected(): Promise<boolean> {
      return !!freighterApi?.isConnected();
    },
    async getNetworkDetails(): Promise<NetworkDetails> {
      return {
        // ...(await freighterApi.getNetworkDetails()),
        network: constants.StellarConfig.NETWORK_PASSPHRASE.includes('Test') ? 'testnet' : 'public',
        networkUrl: constants.StellarConfig.HORIZON_URL,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
      };
    },
    async getPublicKey(): Promise<string> {
      await freighterApi.requestAccess();
      return (await freighterApi.getAddress()).address;
    },
    async isAvailable(): Promise<boolean> {
      return freighterApi
        .isConnected()
        .then(({ isConnected, error }) => !error && isConnected)
        .catch((): boolean => false);
    },
    signTransaction(
      xdr: string,
      opts?: {
        network?: string;
        networkPassphrase?: string;
        accountToSign?: string;
      }
    ): Promise<any> {
      return freighterApi.signTransaction(xdr, opts);
    },
  };
}
