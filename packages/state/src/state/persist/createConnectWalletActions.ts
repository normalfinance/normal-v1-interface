import { Horizon } from '@stellar/stellar-sdk';
import { AppStorePersist } from '@normalfinance/types';
import { usePersistStore } from '../store';
import { constants } from '@normalfinance/utils';

/** Session helper: remove a single address from the verified map */
function clearSessionProof(address?: string | null) {
  if (typeof window === 'undefined' || !address) return;
  try {
    const KEY = 'nf_verified_addrs';
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return;
    const map = JSON.parse(raw) as Record<string, boolean>;
    if (map[address]) {
      delete map[address];
      sessionStorage.setItem(KEY, JSON.stringify(map));
    }
  } catch {}
}

export const createConnectWalletActions = () => {
  return {
    wallet: {
      address: undefined,
      activeChain: undefined,
      server: undefined,
      walletType: undefined,
    },

    connectWallet: async (walletAddress: string, walletType?: string) => {
      const prevAddress = usePersistStore.getState().wallet.address;
      if (prevAddress && prevAddress !== walletAddress) {
        clearSessionProof(prevAddress);
      }
      clearSessionProof(walletAddress);

      const network =
        (process.env.NEXT_PUBLIC_NETWORK ?? '').toUpperCase() === 'TESTNET' ? 'testnet' : 'public';

      const activeChain = {
        id: network,
        name: network === 'testnet' ? 'Stellar Testnet' : 'Stellar Public',
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
      };

      // Horizon server
      const server = new Horizon.Server(constants.StellarConfig.HORIZON_URL, {
        allowHttp: constants.StellarConfig.HORIZON_URL.startsWith('http://'),
      });

      // Persist
      usePersistStore.setState((state: AppStorePersist) => ({
        ...state,
        wallet: {
          address: walletAddress,
          activeChain,
          server,
          walletType: (walletType as any) || 'stellar-wallets-kit',
        },
      }));
      return;
    },

    disconnectWallet: () => {
      const current = usePersistStore.getState().wallet.address;
      clearSessionProof(current);

      usePersistStore.setState((state: AppStorePersist) => ({
        ...state,
        wallet: {
          address: undefined,
          activeChain: undefined,
          server: undefined,
          walletType: undefined,
        },
      }));
    },
  };
};
