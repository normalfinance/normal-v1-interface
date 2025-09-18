'use client';

import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';
import { runProofOfOwnership } from '@/auth/proof-of-ownership';
import { isWalletVerifiedForSession } from '@/utils/wallet-proof';
import { useProofDialogStore } from '@/stores/proof-dialog-store';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';

import {
  Stack,
  Paper,
  Dialog,
  Button,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';

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
  const { startProof, busy } = useProofDialogStore();

  const {
    signTransaction: kitSignTx,
    isConnected,
    connectWallet,
    disconnectWallet,
  } = useStellarWalletsKit();

  const address = persist.wallet.address || null;
  const networkPassphrase = persist.wallet.activeChain?.networkPassphrase || null;

  const [phase, setPhase] = useState<'idle' | 'signing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const verified = useMemo(
    () => (address ? isWalletVerifiedForSession(address) : false),
    [address]
  );

  const launchedRef = useRef(false);

  const runOnce = useCallback(async () => {
    if (!address || !networkPassphrase) return;

    await startProof(async () => {
      if (verified) {
        setPhase('success');
        onVerified?.();
        return;
      }

      setPhase('signing');
      setErrorMsg(null);

      const signTransaction = async (xdr: string) => {
        if (!isConnected) {
          await connectWallet();
        }
        const res = (await kitSignTx(xdr)) as KitSignResult;
        return typeof res === 'string' ? res : (res?.signedXDR ?? res?.xdr ?? '');
      };

      await runProofOfOwnership({
        address,
        signTransaction,
        networkPassphrase,
        message,
      });

      setPhase('success');
      onVerified?.();
    }).catch((e: any) => {
      setErrorMsg(e?.message || t('Verification failed.'));
      setPhase('error');
    });
  }, [
    address,
    networkPassphrase,
    verified,
    startProof,
    onVerified,
    message,
    t,
    isConnected,
    connectWallet,
    kitSignTx,
  ]);

  useEffect(() => {
    if (!open) {
      launchedRef.current = false;
      setPhase('idle');
      setErrorMsg(null);
      return;
    }
    if (launchedRef.current) return;
    if (!address || !networkPassphrase) return;
    launchedRef.current = true;
    void runOnce();
  }, [open, address, networkPassphrase, runOnce]);

  const handleRetry = () => {
    setPhase('idle');
    setErrorMsg(null);
    launchedRef.current = false;
    void runOnce();
  };

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
    <Dialog open={open} maxWidth="sm" fullWidth onClose={() => {}} disableEscapeKeyDown>
      <DialogTitle>{t('Verify Wallet Ownership')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {verified && (
            <Typography variant="body2" color="text.secondary">
              {t('This wallet is already verified for this session.')}
            </Typography>
          )}

          {!verified && phase === 'signing' && (
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
          )}

          {!verified && phase === 'error' && (
            <>
              <Typography variant="body2" color="error">
                {errorMsg}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('You can retry the signature or cancel to disconnect the wallet.')}
              </Typography>
            </>
          )}

          {!verified && phase === 'idle' && (
            <Typography variant="body2" color="text.secondary">
              {t('Preparing verification...')}
            </Typography>
          )}

          {phase === 'success' && (
            <>
              <Typography variant="body2" color="success.main">
                {t('Wallet ownership verified successfully.')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('You may now continue using the app.')}
              </Typography>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        {phase !== 'success' ? (
          <>
            {phase === 'error' && (
              <Button onClick={handleRetry} variant="contained" color="primary" disabled={busy}>
                {t('Retry')}
              </Button>
            )}
            <Button onClick={handleCancel} color="inherit" disabled={busy}>
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
