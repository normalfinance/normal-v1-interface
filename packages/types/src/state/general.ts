import { Server } from "soroban-client";
import { PersistWalletActions, AppStorePersist } from "./persist";
import { LayoutActions } from "./layout";
import { Horizon } from "@stellar/stellar-sdk";
import { WalletActions } from "./wallet";
import { LoadingActions } from "./loading";

interface GeneralStore {
  server: Horizon.Server;
  networkPassphrase: string;
}

export type AppStore = WalletActions & LayoutActions & GeneralStore & LoadingActions;

export { AppStorePersist };

export type SetStateType = (
  partial:
    | AppStore
    | Partial<AppStore>
    | ((state: AppStore) => AppStore | Partial<AppStore>),
  replace?: boolean | undefined
) => void;

export type GetStateType = () => AppStore;
