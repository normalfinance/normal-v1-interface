import { create } from 'zustand';
import { createTokenActions } from './persist/createTokenActions';
import { persist } from 'zustand/middleware';
import { AppStore, AppStorePersist } from '@normalfinance/types';
import { createConnectWalletActions } from './persist/createConnectWalletActions';
import { createDisclaimerAction } from './persist/createDisclaimerActions';
import { createLoadingActions } from './loading/actions';
import { createReferralActions } from './persist/createReferralActions';
import { createInviteCodeActions } from './persist/createInviteCodeActions';
import { createPoolActions } from './persist/createPoolActions';
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
      const disclaimer = createDisclaimerAction();

      // Create referral actions
      const referralActions = createReferralActions();

      // Create invite code actions
      const inviteCodeActions = createInviteCodeActions();

      // Create pool actions
      const poolActions = createPoolActions();

      // Create token actions
      const tokenActions = createTokenActions();

      return {
        ...walletPersist,
        ...disclaimer,
        ...referralActions,
        ...inviteCodeActions,
        ...poolActions,
        ...tokenActions,
      };
    },
    {
      name: 'just-some-normal-storage',
      version: 3,
      migrate: (persistedState, version) => {
        if (!persistedState) return {};

        // Upgrade from v0, v1, v2 → v3 schema
        if (version < 3) {
          return {};
        }
      },
    }
  )
);
