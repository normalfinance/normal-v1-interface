import { GetStateType, SetStateType } from '@normalfinance/types';

export function createErrorActions(set: SetStateType, get: GetStateType) {
  return {
    globalError: null,
    setGlobalError: (error: string | null) => {
      set({ globalError: error });
    },
  };
}
