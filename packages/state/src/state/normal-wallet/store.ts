import { create } from 'zustand';
import { createNormalWalletActions, NormalWalletState } from './actions';

export const useNormalWalletStore = create<NormalWalletState>()((set, get) => {
  return createNormalWalletActions(set, get);
});
