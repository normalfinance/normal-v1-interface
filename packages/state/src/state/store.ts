import { create } from 'zustand';
import { createWalletActions } from './wallet/actions';
import { persist } from 'zustand/middleware';
import { Horizon } from '@stellar/stellar-sdk';
import { AppStore, AppStorePersist } from '@normalfinance/types';
import { createConnectWalletActions } from './persist/createConnectWalletActions';
import { createDisclaimerAction } from './persist/createDisclaimerActions';
import { createLoadingActions } from './loading/actions';
import { constants } from '@normalfinance/utils';
import { createReferralActions } from './persist/createReferralActions';
import { createInviteCodeActions } from './persist/createInviteCodeActions';
import { createPoolActions } from './pool/actions';

//@ts-ignore
export const useAppStore = create<AppStore>()((set, get) => {
  // Create a new server instance.
  const server = new Horizon.Server(constants.StellarConfig.RPC_URL);

  // Create a wallet with the given server and network passphrase.
  const wallet = createWalletActions(set, get);

  // Create a loading state
  const loading = createLoadingActions(set, get);

  // Create
  const pool = createPoolActions(set, get);

  return {
    server,
    networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
    ...wallet,
    ...loading,
    ...pool,
  };
});

export const usePersistStore = create<AppStorePersist>()(
  persist(
    (set, get) => {
      // Create a new server instance.
      const server = new Horizon.Server(constants.StellarConfig.RPC_URL);

      // Create a wallet with the given server and network passphrase.
      const walletPersist = createConnectWalletActions();

      // Create a store for disclaimer modal
      const disclaimer = createDisclaimerAction();

      // Create referral actions
      const referralActions = createReferralActions();

      // Create invite code actions
      const inviteCodeActions = createInviteCodeActions();

      return {
        server,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        ...walletPersist,
        ...disclaimer,
        ...referralActions,
        ...inviteCodeActions,
      };
    },
    {
      name: 'app-storage', // name of the item in the storage (must be unique)
    }
  )
);
