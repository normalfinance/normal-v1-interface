import { LayoutActions, AppStore, GetStateType, SetStateType } from '@normalfinance/types';

export const createLayoutActions = (
  setState: SetStateType,
  getState: GetStateType
): LayoutActions => {
  return {
    walletModalOpen: false,
    loading: true,
    setLoading: (loading: boolean) => {
      setState((state: AppStore) => {
        return { ...state, loading };
      });
    },
    setWalletModalOpen: (open: boolean) => {
      setState((state: AppStore) => {
        return { ...state, walletModalOpen: open };
      });
    },
  };
};
