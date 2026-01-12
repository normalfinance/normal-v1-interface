import { GetStateType, ModalActions, ModalType, SetStateType } from '@normalfinance/types';

export function createModalActions(set: SetStateType, get: GetStateType): ModalActions {
  return {
    modalState: {
      ON_RAMP: false,
      OFF_RAMP: false,
      DEPOSIT_CRYPTO: false,
      ADD_LIQUIDITY: false,
      REMOVE_LIQUIDITY: false,
    },
    setModalView: (modal: ModalType, showing: boolean) => {
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
