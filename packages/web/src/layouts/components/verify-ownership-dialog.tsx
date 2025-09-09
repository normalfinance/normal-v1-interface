'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useTranslate } from '@/locales';
import { Iconify } from '@/components/template/iconify';
import { usePersistStore, useAppStore } from '@normalfinance/state';
import { runProofOfOwnership } from '@/auth/proof-of-ownership';

type Props = {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
};

export default function VerifyOwnershipDialog({ open, onClose, onVerified }: Props) {
  const { t } = useTranslate();
  const persist = usePersistStore();
  const app = useAppStore();

  const address = persist.wallet.address;
  const walletType = persist.wallet.walletType as
    | 'freighter'
    | 'xbull'
    | 'lobstr'
    | 'hana'
    | 'wallet-connect'
    | undefined;

  const networkPassphrase = persist.wallet.activeChain?.networkPassphrase;

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const signTransaction = useCallback(
    async (
      xdr: string,
      opts?: { networkPassphrase?: string; accountToSign?: string }
    ): Promise<string> => {
      if (!walletType) throw new Error('Missing wallet type');
      switch (walletType) {
        case 'freighter':
          return (
            await (await import('../../../../state/src/state/wallet/freighter')).freighter()
          ).signTransaction(xdr, opts);
        case 'xbull':
          return (
            await (await import('../../../../state/src/state/wallet/xbull')).xbull()
          ).signTransaction(xdr, opts);
        case 'lobstr':
          return (
            await (await import('../../../../state/src/state/wallet/lobstr')).lobstr()
          ).signTransaction(xdr, opts);
        case 'hana':
          return (
            await (await import('../../../../state/src/state/wallet/hana')).hana()
          ).signTransaction(xdr, opts);
        case 'wallet-connect': {
          // Prefer existing instance if present
          const existing = app.walletConnectInstance;
          if (existing) return existing.signTransaction(xdr, opts);
          const { WalletConnect } = await import(
            '../../../../state/src/state/wallet/wallet-connect'
          );
          const client = new WalletConnect();
          return client.signTransaction(xdr, opts);
        }
        default:
          throw new Error('Unsupported wallet');
      }
    },
    [walletType, app.walletConnectInstance]
  );

  const start = useCallback(async () => {
    if (!open) return;
    if (!address || !walletType) return;

    setLoading(true);
    setError(null);
    try {
      await runProofOfOwnership({
        walletType,
        address,
        signTransaction,
        networkPassphrase,
      });
      onVerified(); // tell parent we’re verified
      onClose(); // close dialog
    } catch (e: any) {
      setError(e?.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }, [open, address, walletType, signTransaction, networkPassphrase, onVerified, onClose]);

  useEffect(() => {
    // auto-run on open
    if (open) void start();
  }, [open, start]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('Verify wallet ownership')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {t('Please approve the signature in your wallet to confirm you own this address.')}
          </Typography>

          {loading && (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={20} />
              <Typography variant="body2">{t('Waiting for your signature...')}</Typography>
            </Stack>
          )}

          {!loading && error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        {!loading && error && (
          <Button
            onClick={start}
            variant="contained"
            color="info"
            startIcon={<Iconify icon="solar:pen-2-bold-duotone" />}
          >
            {t('Retry')}
          </Button>
        )}
        <Button onClick={onClose}>{t('Close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
