import { create } from 'zustand';

type ProofDialogState = {
  open: boolean;
  openedBy?: string;
  portalId: string | null;
  busy: boolean;
  ensureOpen: (by?: string) => void;
  close: () => void;
  registerPortal: (id: string) => boolean;
  unregisterPortal: (id: string) => void;
  startProof: (runner: () => Promise<void>) => Promise<boolean>;
};

export const useProofDialogStore = create<ProofDialogState>((set, get) => ({
  open: false,
  openedBy: undefined,

  portalId: null,
  busy: false,

  ensureOpen: (by) => {
    const s = get();
    if (s.open) return;
    set({ open: true, openedBy: by });
  },

  close: () => set({ open: false, openedBy: undefined }),

  registerPortal: (id) => {
    const s = get();
    if (!s.portalId) {
      set({ portalId: id });
      return true;
    }
    return s.portalId === id;
  },

  unregisterPortal: (id) => {
    if (get().portalId === id) {
      set({ portalId: null });
    }
  },

  startProof: async (runner) => {
    const s = get();
    if (s.busy) return false;
    set({ busy: true });
    try {
      await runner();
      return true;
    } finally {
      set({ busy: false });
    }
  },
}));
