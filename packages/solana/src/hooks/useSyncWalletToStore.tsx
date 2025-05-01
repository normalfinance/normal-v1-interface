import { useEffect } from 'react';
import { BigNum, BASE_PRECISION_EXP } from '@drift-labs/sdk';

import { useCommonNormalStore } from '../stores';
import { useWalletContext } from './useWalletContext';
import { useCommonDriftActions } from './useCommonDriftActions';

/**
 * Keeps the authority and connected state of `WalletContext` from `@solana/wallet-adapter-react` updated in the app store when the wallet connects, disconnects, or changes.
 *
 * Also sets SOL balance in the store to 0 on disconnect.
 */
export const useSyncWalletToStore = (clearDataFromStore?: () => void) => {
  const actions = useCommonDriftActions();
  const set = useCommonNormalStore((s) => s.set);
  const walletContextState = useWalletContext();

  useEffect(() => {
    walletContextState?.wallet?.adapter?.on('connect', () => {
      const authority = walletContextState?.wallet?.adapter?.publicKey;

      set((s) => {
        s.currentSolBalance = {
          value: new BigNum(0, BASE_PRECISION_EXP),
          loaded: false,
        };
        s.authority = authority;
        s.authorityString = authority?.toString() || '';
      });

      if (authority && walletContextState.wallet?.adapter) {
        clearDataFromStore && clearDataFromStore();
        actions.handleWalletConnect(authority, walletContextState.wallet?.adapter);
      }
    });

    walletContextState?.wallet?.adapter?.on('disconnect', () => {
      set((s) => {
        s.currentSolBalance = {
          value: new BigNum(0, BASE_PRECISION_EXP),
          loaded: false,
        };
        s.authority = undefined;
        s.authorityString = '';
      });

      actions.handleWalletDisconnect();
      clearDataFromStore && clearDataFromStore();
    });

    return () => {
      console.log('adapter changed, firing off');
      walletContextState?.wallet?.adapter.off('connect');
      walletContextState?.wallet?.adapter.off('disconnect');
    };
  }, [walletContextState?.wallet?.adapter]);

  // useEffect(() => {
  // 	set((s) => {
  // 		s.authority = walletContext?.wallet?.adapter?.publicKey;
  // 		s.authorityString =
  // 			walletContext?.wallet?.adapter?.publicKey?.toString() || '';
  // 	});
  // }, [walletContext?.wallet?.adapter?.publicKey]);
};
