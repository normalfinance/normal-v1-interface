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
  Paper,
} from '@mui/material';
import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';
import { runProofOfOwnership } from '@/auth/proof-of-ownership';
import { isWalletVerifiedForSession } from '@/utils/wallet-proof';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';

type KitSignResult = string | { signedXDR?: string; xdr?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onVerified?: () => void;
  message?: string;
};

export default function VerifyOwnershipDialog({
  open,
  onClose,
  onVerified,
  message = 'i love normal',
}: Props) {
  const { t } = useTranslate();
  const persist = usePersistStore();
  const {
    signTransaction: kitSignTx,
    isConnected,
    connectWallet,
    disconnectWallet,
  } = useStellarWalletsKit();

  const address = persist.wallet.address;
  const networkPassphrase = persist.wallet.activeChain?.networkPassphrase;

  const [phase, setPhase] = useState<'idle' | 'signing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const alreadyVerified = isWalletVerifiedForSession(address);

  const signTransaction = useCallback(
    async (xdr: string) => {
      if (!isConnected) {
        await connectWallet();
      }
      const res = (await kitSignTx(xdr)) as KitSignResult;
      return typeof res === 'string' ? res : (res?.signedXDR ?? res?.xdr ?? '');
    },
    [isConnected, connectWallet, kitSignTx]
  );

  const start = useCallback(async () => {
    if (!open) return;
    if (!address || !networkPassphrase) return; // wait until store is populated
    if (isWalletVerifiedForSession(address)) {
      setPhase('success');
      return;
    }

    setPhase('signing');
    setErrorMsg(null);
    try {
      await runProofOfOwnership({ address, signTransaction, networkPassphrase, message });
      setPhase('success');
      onVerified?.();
    } catch (e: any) {
      setErrorMsg(e?.message || t('Verification failed.'));
      setPhase('error');
    }
  }, [open, address, networkPassphrase, signTransaction, onVerified, message, t]);

  // Kick off when opened; also retry when address/chain arrives
  useEffect(() => {
    if (open) void start();
  }, [open, address, networkPassphrase, start]);

  useEffect(() => {
    if (!open) {
      setPhase('idle');
      setErrorMsg(null);
    }
  }, [open]);

  const handleCancel = async () => {
    try {
      persist.disconnectWallet();
      await disconnectWallet();
    } finally {
      onClose();
    }
  };

  const handleCloseSuccess = () => {
    onVerified?.();
    onClose();
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth onClose={() => {}}>
      <DialogTitle>{t('Verify Wallet Ownership')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {alreadyVerified ? (
            <Typography variant="body2" color="text.secondary">
              {t('This wallet is already verified for this session.')}
            </Typography>
          ) : phase === 'signing' ? (
            <>
              <Typography variant="body2" color="text.secondary">
                {t('Please approve the signature in your wallet to confirm you own this address.')}
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, fontFamily: 'monospace', fontSize: 14 }}>
                {message}
              </Paper>
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={20} />
                <Typography variant="body2">{t('Waiting for your signature...')}</Typography>
              </Stack>
            </>
          ) : phase === 'error' ? (
            <>
              <Typography variant="body2" color="error">
                {errorMsg}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('You can retry the signature or cancel to disconnect the wallet.')}
              </Typography>
            </>
          ) : phase === 'success' ? (
            <>
              <Typography variant="body2" color="success.main">
                {t('Wallet ownership verified successfully.')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('You may now continue using the app.')}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('Preparing verification...')}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        {phase !== 'success' ? (
          <>
            {phase === 'error' && (
              <Button
                onClick={() => {
                  setPhase('idle');
                  void start();
                }}
                variant="contained"
                color="primary"
              >
                {t('Retry')}
              </Button>
            )}
            <Button onClick={handleCancel} color="inherit">
              {t('Cancel')}
            </Button>
          </>
        ) : (
          <Button onClick={handleCloseSuccess} variant="contained" color="success">
            {t('Continue')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
