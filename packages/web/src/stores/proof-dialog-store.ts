import { create } from 'zustand';

type ProofDialogState = {
  open: boolean;
  openedBy?: string;
  ensureOpen: (by?: string) => void;
  close: () => void;
};

export const useProofDialogStore = create<ProofDialogState>((set, get) => ({
  open: false,
  openedBy: undefined,
  ensureOpen: (by) => {
    if (get().open) return;
    set({ open: true, openedBy: by });
  },
  close: () => set({ open: false, openedBy: undefined }),
}));
