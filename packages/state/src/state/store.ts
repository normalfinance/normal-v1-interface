import { create } from 'zustand';
import { createTokenActions } from './persist/createTokenActions';
import { persist } from 'zustand/middleware';
import { AppStore, AppStorePersist } from '@normalfinance/types';
import { createConnectWalletActions } from './persist/createConnectWalletActions';
import { createDisclaimerAction } from './persist/createDisclaimerActions';
import { createLoadingActions } from './loading/actions';
import { createReferralActions } from './persist/createReferralActions';
import { createModalActions } from './modal/actions';

//@ts-ignore
export const useAppStore = create<AppStore>()((set, get) => {
  // Create a loading state
  const loading = createLoadingActions(set, get);

  // Create modal state
  const modal = createModalActions(set, get);

  return {
    ...loading,
    ...modal,
  };
});

export const usePersistStore = create<AppStorePersist>()(
  persist(
    (set, get) => {
      // Create a wallet with the given server and network passphrase.
      const walletPersist = createConnectWalletActions();

      // Create a store for disclaimer modal
      const disclaimeActions = createDisclaimerAction();

      // Create referral actions
      const referralActions = createReferralActions();

      // Create token actions
      const tokenActions = createTokenActions();

      return {
        ...walletPersist,
        ...disclaimeActions,
        ...referralActions,
        ...tokenActions,
      };
    },
    {
      name: 'just-some-normal-storage',
      version: 7,
      migrate: (persistedState, version) => {
        if (!persistedState) return {};

        // Upgrade all to v7 schema (removed pair state)
        if (version < 7) {
          return {};
        }
      },
    }
  )
);
