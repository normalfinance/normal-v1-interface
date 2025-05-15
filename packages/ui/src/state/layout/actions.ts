import type { AppStore, GetStateType, SetStateType, LayoutActions } from '@normalfinance/types';

export const createLayoutActions = (
  setState: SetStateType,
  getState: GetStateType
): LayoutActions => ({
  walletModalOpen: false,
  tourRunning: false,
  loading: true,
  setTourRunning: (running: boolean) => {
    setState((state: AppStore) => ({ ...state, tourRunning: running }));
  },
  setLoading: (loading: boolean) => {
    setState((state: AppStore) => ({ ...state, loading }));
  },
  tourStep: 0,
  setTourStep: (step: number) => {
    setState((state: AppStore) => ({ ...state, tourStep: step }));
  },
  setWalletModalOpen: (open: boolean) => {
    setState((state: AppStore) => ({ ...state, walletModalOpen: open }));
  },
});
