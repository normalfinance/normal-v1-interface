'use client';

import { useCallback } from 'react';
import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';
import { closeSnackbar, enqueueSnackbar } from 'notistack';
import { runWalletKitSigning } from '@/lib/wallet-kit-guard';

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

export function isSessionError(err: any): boolean {
  const msg: string = (err?.message ?? '').toLowerCase();
  return msg.includes('connection key') || msg.includes('walletconnect') || msg.includes('session');
}

// Module-level (not a hook) so non-React code — e.g. the MGI kit signer — can
// surface the same reconnect UX. Labels are parameters because t() only exists
// inside hooks; callers without a translator get the English defaults.
export function showWalletReconnectSnackbar(
  connectWallet: () => void,
  labels?: { message?: string; action?: string }
) {
  const key = enqueueSnackbar(labels?.message ?? 'Your wallet session has expired.', {
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
        {labels?.action ?? 'Reconnect'}
      </Button>
    ),
  });
}

export function useWalletReconnect() {
  const { t } = useTranslate();
  const { wallet } = usePersistStore();
  const { signTransaction: kitSign, connectWallet } = useStellarWalletsKit();

  const isSessionBased = SESSION_BASED_WALLET_TYPES.has(wallet.walletType ?? '');

  const signOrReconnect = useCallback(
    async (xdr: string, networkPassphrase?: string): Promise<string> => {
      try {
        // Serialized + pending-retried: two back-to-back signatures (savings
        // fee → deposit) bounced off WalletConnect's one-request-at-a-time
        // rule on mainnet, charging the fee and losing the deposit (finding
        // #54). See lib/wallet-kit-guard.ts.
        return await runWalletKitSigning(() => kitSign(xdr, networkPassphrase));
      } catch (err: any) {
        if (!(isSessionBased && isSessionError(err))) throw err;
        // Inline recovery (Niko, 2026-08-18): an expired session used to
        // ABORT the whole flow with a "reconnect" snackbar — mid-swap that
        // meant a red failed step and redoing everything by hand. Instead:
        // tell the user why a wallet window is about to appear, reopen the
        // connect flow, and retry the SAME signature once — the in-flight
        // step pauses and continues instead of failing.
        enqueueSnackbar(
          t('Your wallet session expired — reconnect to continue where you left off.'),
          { variant: 'info', autoHideDuration: 6000 }
        );
        try {
          await connectWallet();
          return await runWalletKitSigning(() => kitSign(xdr, networkPassphrase));
        } catch (retryErr: any) {
          // Reconnect declined/closed, or the fresh session still can't sign:
          // fall back to the persistent snackbar + typed error (callers
          // suppress their own error UI for this one).
          showWalletReconnectSnackbar(connectWallet, {
            message: t('Your wallet session has expired.'),
            action: t('Reconnect'),
          });
          throw isSessionError(retryErr) ? new WalletSessionExpiredError() : retryErr;
        }
      }
    },
    [kitSign, connectWallet, isSessionBased, t]
  );

  return { signOrReconnect };
}
