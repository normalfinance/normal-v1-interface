import { create } from "zustand";
import { createWalletActions } from "./wallet/actions";
import { persist, createJSONStorage } from "zustand/middleware";
import { Horizon } from "@stellar/stellar-sdk";
import { AppStore, AppStorePersist } from "@normalfinance/types";
import { createConnectWalletActions } from "./persist/createConnectWalletActions";
import { createLayoutActions } from "./layout/actions";
import { createDisclaimerAction } from "./persist/createDisclaimerActions";
import { createLoadingActions } from "./loading/actions";
import { createReferralActions } from "./persist/createReferralActions";

//@ts-ignore
export const useAppStore = create<AppStore>()((set, get) => {
  // Create a new server instance.
  const server = new Horizon.Server("https://soroban-rpc.stellar.org");

  // The network passphrase for the test network.
  const networkPassphrase = "Public Global Stellar Network ; September 2015";

  // Create some states for the app and layouting
  const layout = createLayoutActions(set, get);

  // Create a wallet with the given server and network passphrase.
  const wallet = createWalletActions(set, get);

  // Create a loading state
  const loading = createLoadingActions(set, get);

  return {
    server,
    networkPassphrase,
    ...wallet,
    ...layout,
    ...loading,
  };
});

export const usePersistStore = create<AppStorePersist>()(
  persist(
    (set, get) => {
      // Create a new server instance.
      const server = new Horizon.Server("https://soroban-rpc.stellar.org");

      // The network passphrase for the test network.
      const networkPassphrase =
        "Public Global Stellar Network ; September 2015";

      // Create a wallet with the given server and network passphrase.
      const walletPersist = createConnectWalletActions();

      //Create a store for disclaimer modal
      const disclaimer = createDisclaimerAction();

      // Create referral actions
      const referralActions = createReferralActions();

      return {
        server,
        networkPassphrase,
        ...walletPersist,
        ...disclaimer,
        ...referralActions,
      };
    },
    {
      name: "app-storage", // name of the item in the storage (must be unique)
    }
  )
);
