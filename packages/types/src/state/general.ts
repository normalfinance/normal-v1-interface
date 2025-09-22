import { AppStorePersist } from './persist';
import { Horizon } from '@stellar/stellar-sdk';
import { WalletActions } from './wallet';
import { LoadingActions } from './loading';
import { PoolActions } from './pool';

interface GeneralStore {
  server: Horizon.Server;
  networkPassphrase: string;
}

export type AppStore = WalletActions & GeneralStore & LoadingActions & PoolActions;

export { AppStorePersist };

export type SetStateType = (
  partial: AppStore | Partial<AppStore> | ((state: AppStore) => AppStore | Partial<AppStore>),
  replace?: boolean | undefined
) => void;

export type GetStateType = () => AppStore;
