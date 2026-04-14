export enum ModalType {
  ON_RAMP = 'ON_RAMP',
  OFF_RAMP = 'OFF_RAMP',

  DEPOSIT_CRYPTO = 'DEPOSIT_CRYPTO',
  SEND_CRYPTO = 'SEND_CRYPTO',

  // Liquidity management
  ADD_LIQUIDITY = 'ADD_LIQUIDITY',
  REMOVE_LIQUIDITY = 'REMOVE_LIQUIDITY',
}

export interface ModalActions {
  modalState: Record<ModalType, boolean>;
  setModalView: (modal: ModalType, showing: boolean) => void;
}
