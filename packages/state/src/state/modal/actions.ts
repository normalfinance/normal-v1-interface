import { GetStateType, SetStateType, ModalActions } from '@normalfinance/types';

export function createModalActions(set: SetStateType, get: GetStateType) {
  return {
    modalState: {
      disclaimer: false,
      receive: false,
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
