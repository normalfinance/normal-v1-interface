import { AppStorePersist } from './persist';
import { Horizon } from '@stellar/stellar-sdk';
import { WalletActions } from './wallet';
import { LoadingActions } from './loading';
import { ErrorActions } from './error';

interface GeneralStore {
  server: Horizon.Server;
  networkPassphrase: string;
}

export type AppStore = WalletActions & GeneralStore & LoadingActions & ErrorActions;

export { AppStorePersist };

export type SetStateType = (
  partial: AppStore | Partial<AppStore> | ((state: AppStore) => AppStore | Partial<AppStore>),
  replace?: boolean | undefined
) => void;

export type GetStateType = () => AppStore;
