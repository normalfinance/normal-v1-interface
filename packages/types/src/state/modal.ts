export interface ModalActions {
  modalState: {
    receive: boolean;
    disclaimer: boolean;
    addLiquidity: boolean;
  };
  setModalView: (modal: string, showing: boolean) => void;
}
