import { GetStateType, SetStateType } from '@normalfinance/types';

export function createModalActions(set: SetStateType, get: GetStateType) {
  return {
    modalState: {
      disclaimer: false,
      receive: false,
      addLiquidity: false,
    },
    setModalView: (modal: string, showing: boolean) => {
      const { modalState } = get();
      set({
        modalState: {
          ...modalState,
          [modal]: showing,
        },
      });
    },
  };
}
