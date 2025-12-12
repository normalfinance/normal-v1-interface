export interface ModalActions {
  modalState: {
    receive: boolean;
    disclaimer: boolean;
  };
  setModalView: (modal: string, showing: boolean) => void;
}
