'use client';

import { useCallback } from 'react';
import { usePersistStore } from '@normalfinance/state';
import { closeSnackbar, enqueueSnackbar } from 'notistack';
import Button from '@mui/material/Button';

import { useStellarWalletsKit, SESSION_BASED_WALLET_TYPES } from './use-stellar-wallets-kit';

// Thrown when a session-based wallet needs to reconnect — callers should
// suppress their own error UI and let the reconnect snackbar handle it.
export class WalletSessionExpiredError extends Error {
  constructor() {
    super('Wallet session expired — reconnect required');
    this.name = 'WalletSessionExpiredError';
  }
}

function isSessionError(err: any): boolean {
  const msg: string = (err?.message ?? '').toLowerCase();
  return msg.includes('connection key') || msg.includes('walletconnect') || msg.includes('session');
}

export function useWalletReconnect() {
  const { wallet } = usePersistStore();
  const { signTransaction: kitSign, connectWallet } = useStellarWalletsKit();

  const isSessionBased = SESSION_BASED_WALLET_TYPES.has(wallet.walletType ?? '');

  const signOrReconnect = useCallback(
    async (xdr: string, networkPassphrase?: string): Promise<string> => {
      try {
        return await kitSign(xdr, networkPassphrase);
      } catch (err: any) {
        if (isSessionBased && isSessionError(err)) {
          const key = enqueueSnackbar(
            'Your wallet session has expired.',
            {
              variant: 'warning',
              persist: true,
              action: () => (
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  onClick={() => {
                    closeSnackbar(key);
                    connectWallet();
                  }}
                  sx={{ ml: 1, fontWeight: 600 }}
                >
                  Reconnect
                </Button>
              ),
            }
          );
          throw new WalletSessionExpiredError();
        }
        throw err;
      }
    },
    [kitSign, connectWallet, isSessionBased]
  );

  return { signOrReconnect };
}
