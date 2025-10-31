import { create } from 'zustand';
import { createStellarWalletKitActions, StellarWalletKitState } from './actions';

export const useStellarWalletKitStore = create<StellarWalletKitState>()((set, get) => {
  return createStellarWalletKitActions(set, get);
});
