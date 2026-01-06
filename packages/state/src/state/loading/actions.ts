import { GetStateType, SetStateType } from '@normalfinance/types';

export function createLoadingActions(set: SetStateType, get: GetStateType) {
  return {
    globalIsLoading: false,
    setGlobalIsLoading: (isLoading: boolean) => {
      set({ globalIsLoading: isLoading });
    },
  };
}
