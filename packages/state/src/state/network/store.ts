import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCurrentNetwork, NetworkType } from '@normalfinance/utils';

const COOKIE_NAME = 'normal-network';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function writeNetworkCookie(network: NetworkType) {
  if (typeof document !== 'undefined') {
    document.cookie = `${COOKIE_NAME}=${network}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }
}

interface NetworkStore {
  network: NetworkType;
  isMainnet: boolean;
  toggleNetwork: () => void;
}

export const useNetworkStore = create<NetworkStore>()(
  persist(
    (set) => ({
      network: getCurrentNetwork(),
      isMainnet: getCurrentNetwork() === 'mainnet',
      toggleNetwork: () =>
        set((state) => {
          const next = state.network === 'mainnet' ? 'testnet' : 'mainnet';
          writeNetworkCookie(next);
          return { network: next, isMainnet: next === 'mainnet' };
        }),
    }),
    {
      name: 'normal.network',
      onRehydrateStorage: () => (state) => {
        if (state) {
          writeNetworkCookie(state.network);
        }
      },
    }
  )
);
