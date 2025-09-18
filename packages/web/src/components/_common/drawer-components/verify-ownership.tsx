'use client';

import { useEffect, useState, useCallback } from 'react';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslate } from '@/locales';
import { Iconify } from '@/components/template/iconify';
import { usePersistStore, useAppStore } from '@normalfinance/state';
import { runProofOfOwnership } from '@/auth/proof-of-ownership';
import { isWalletVerifiedForSession } from '@/utils/wallet-proof';

type Props = {
  onContinue?: () => void; // <-- tell parent to render connected wallet
};

export default function VerifyOwnershipCard({ onContinue }: Props) {
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedNow, setVerifiedNow] = useState<boolean>(() =>
    isWalletVerifiedForSession(address)
  );

  const signTransaction = useCallback(
    async (xdr: string, opts?: { networkPassphrase?: string; accountToSign?: string }) => {
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
          const instance = app.walletConnectInstance;
          if (instance) return instance.signTransaction(xdr, opts);
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
    if (!address || !walletType) return;
    if (isWalletVerifiedForSession(address)) {
      setVerifiedNow(true);
      return; // already verified this session
    }
    setLoading(true);
    setError(null);
    try {
      await runProofOfOwnership({
        walletType,
        address,
        signTransaction,
        networkPassphrase,
      });
      // runProofOfOwnership marks session verified on success
      setVerifiedNow(true);
    } catch (e: any) {
      setError(e?.message || 'Verification failed.');
      setVerifiedNow(false);
    } finally {
      setLoading(false);
    }
  }, [address, walletType, signTransaction, networkPassphrase]);

  useEffect(() => {
    // auto start once the component mounts
    void start();
  }, [start]);

  return (
    <Box
      sx={{
        p: 2,
        pt: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'start',
      }}
    >
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
