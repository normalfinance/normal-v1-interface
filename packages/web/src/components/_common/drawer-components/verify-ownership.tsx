'use client';

import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import { runProofOfOwnership } from '@/auth/proof-of-ownership';
import { isWalletVerifiedForSession } from '@/utils/wallet-proof';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';

import { Box, Stack, Button, Typography, CircularProgress } from '@mui/material';

import { Iconify } from '@/components/template/iconify';

type Props = { onContinue?: () => void };

type KitSignResult = string | { signedXDR?: string; xdr?: string };

export default function VerifyOwnershipCard({ onContinue }: Props) {
  const { t } = useTranslate();
  const persist = usePersistStore();
  const { signTransaction: kitSignTx, isConnected, connectWallet } = useStellarWalletsKit();

  const address = persist.wallet.address;
  const networkPassphrase = persist.wallet.activeChain?.networkPassphrase;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedNow, setVerifiedNow] = useState<boolean>(() =>
    isWalletVerifiedForSession(address)
  );

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
    if (!address || !networkPassphrase) return;
    if (isWalletVerifiedForSession(address)) {
      setVerifiedNow(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await runProofOfOwnership({
        address,
        signTransaction,
        networkPassphrase,
        message: 'i love normal',
      });
      setVerifiedNow(true);
    } catch (e: any) {
      setError(e?.message || 'Verification failed.');
      setVerifiedNow(false);
    } finally {
      setLoading(false);
    }
  }, [address, networkPassphrase, signTransaction]);

  useEffect(() => {
    void start();
  }, [start]);

  return (
    <Box sx={{ p: 2, pt: 10, display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        {t('Verify wallet ownership')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('Please approve the signature in your wallet to confirm you own this address.')}
      </Typography>

      {loading && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={20} />
          <Typography variant="body2">{t('Waiting for your signature...')}</Typography>
        </Stack>
      )}

      {!loading && error && !verifiedNow && (
        <Stack spacing={1}>
          <Typography variant="body2" color="error">
            {error}
          </Typography>
          <Button
            variant="contained"
            color="info"
            startIcon={<Iconify icon="solar:pen-2-bold-duotone" />}
            onClick={start}
          >
            {t('Retry signing')}
          </Button>
        </Stack>
      )}

      {!loading && verifiedNow && (
        <Stack spacing={1}>
          <Typography variant="body2" color="success.main">
            {t('Signature verified. You can continue.')}
          </Typography>
          <Button
            variant="contained"
            color="success"
            startIcon={<Iconify icon="solar:check-circle-bold-duotone" />}
            onClick={() => onContinue?.()}
          >
            {t('Continue')}
          </Button>
        </Stack>
      )}
    </Box>
  );
}
