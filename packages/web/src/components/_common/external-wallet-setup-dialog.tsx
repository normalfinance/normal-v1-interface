'use client';

// ---------------------------------------------------------------------------
// #74 — guided setup for a CONNECTED EXTERNAL wallet that can't hold USDC
// yet. Two steps, each a VIEW over live chain state (derived from the probe
// on every render), so the dialog is resumable by construction:
//
//   1. activate   QR + address; the user sends ≥2 XLM from anywhere
//                 (exchange, another wallet). We poll Horizon and advance
//                 the moment the account exists — no "I did it" button.
//   2. trustline  one kit approval adds the USDC trustline (the external
//                 wallet signs its own changeTrust).
//
// Contrast with NormalWalletSetupDialog: that one sets up the COMPANION
// (passkey signs, funding comes FROM the external wallet). Here the external
// wallet is the subject, and activation money must come from outside — which
// is why step 1 is a QR, not a send button.
// ---------------------------------------------------------------------------

import QRCode from 'qrcode';
import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { useState, useEffect } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import { deriveWalletReadiness } from '@/lib/stellar/wallet-readiness';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';

const MONO = { fontFamily: '"Geist Mono", "Courier New", monospace' } as const;

// 1 XLM activates the account; the USDC trustline locks ~0.5 more, plus a
// little for fees — 2 keeps the user from having to top up twice.
const SUGGESTED_XLM = 2;

type Step = 'activate' | 'trustline' | 'ready';

interface Props {
  open: boolean;
  onClose: () => void;
  address: string;
  walletLabel: string;
}

export default function ExternalWalletSetupDialog({ open, onClose, address, walletLabel }: Props) {
  const { t } = useTranslate();
  const { copy } = useCopyToClipboard();
  const { enqueueSnackbar } = useSnackbar();
  const config = useStellarConfig();
  const probe = useAccountStatus(open ? address : undefined);
  const { addTrustLine } = useTrustLine();
  const [busy, setBusy] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  const readiness = deriveWalletReadiness(probe);
  // 'unknown' (transient probe failure) keeps showing the QR step — the
  // poller below retries; we never claim progress we can't see.
  const step: Step =
    readiness === 'ready' ? 'ready' : readiness === 'no-trustline' ? 'trustline' : 'activate';

  useEffect(() => {
    if (!open || !address) return;
    QRCode.toDataURL(address, {
      width: 180,
      margin: 1,
      color: { dark: '#0A0A0F', light: '#FFFFFF' },
    })
      .then(setQrUrl)
      .catch(() => setQrUrl(''));
  }, [open, address]);

  // Watch for the activation payment: poll while the account isn't there yet
  // (or the last probe failed), stop the moment it lands — the step advances
  // by derivation, no user action needed.
  useEffect(() => {
    if (!open) return undefined;
    if (readiness !== 'not-activated' && readiness !== 'unknown') return undefined;
    const id = setInterval(() => probe.refetch(), 4000);
    return () => clearInterval(id);
  }, [open, readiness, probe.refetch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = () => {
    copy(address);
    enqueueSnackbar(t('Address copied'), { variant: 'success' });
  };

  const handleAddTrustline = async () => {
    try {
      setBusy(true);
      await addTrustLine('USDC', config.USDC_ISSUER);
      enqueueSnackbar(t('USDC trustline added — this wallet can now hold USDC.'), {
        variant: 'success',
      });
      await probe.refetch();
    } catch (e: any) {
      enqueueSnackbar(e?.message || t('Could not add the USDC trustline.'), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const STEPS: { key: Step; label: string }[] = [
    { key: 'activate', label: t('Activate the wallet with XLM') },
    { key: 'trustline', label: t('Add the USDC trustline') },
  ];
  const activeIdx = step === 'ready' ? STEPS.length : STEPS.findIndex((s) => s.key === step);

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: '22px', p: '22px' } } }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: '6px' }}>
        <Typography sx={{ fontSize: '17px', fontWeight: 700, color: '#0A0A0F' }}>
          {t('Set up {{wallet}} for USDC', { wallet: walletLabel })}
        </Typography>
        <Box
          component="button"
          onClick={busy ? undefined : onClose}
          sx={{ all: 'unset', cursor: 'pointer', color: 'rgba(10,10,15,0.4)', display: 'flex' }}
        >
          <Iconify icon="mingcute:close-line" width={20} />
        </Box>
      </Stack>
      <Typography
        sx={{ fontSize: '12.5px', color: 'rgba(10,10,15,0.5)', mb: '14px', lineHeight: 1.5 }}
      >
        {t('Two one-time steps and this wallet can hold and receive USDC.')}
      </Typography>

      {/* Step list — same visual language as the Normal-wallet setup. */}
      <Stack spacing={0} sx={{ mb: '10px' }}>
        {STEPS.map((s, idx) => {
          const done = idx < activeIdx;
          const active = idx === activeIdx;
          return (
            <Stack
              key={s.key}
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ py: '7px', opacity: done || active ? 1 : 0.45 }}
            >
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {done ? (
                  <Iconify icon="lets-icons:check-fill" width={20} sx={{ color: '#1AB37D' }} />
                ) : active && (busy || (s.key === 'activate' && probe.isLoading)) ? (
                  <CircularProgress size={16} sx={{ color: '#0A0A0F' }} />
                ) : (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: active ? '#0A0A0F' : 'rgba(10,10,15,0.15)',
                    }}
                  />
                )}
              </Box>
              <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: '#0A0A0F' }}>
                {s.label}
              </Typography>
            </Stack>
          );
        })}
      </Stack>

      {step === 'activate' && (
        <Stack alignItems="center" spacing={1.25}>
          <Typography
            sx={{
              fontSize: '12px',
              color: 'rgba(10,10,15,0.55)',
              textAlign: 'center',
              lineHeight: 1.55,
            }}
          >
            {t(
              'Send at least {{amount}} XLM to this address from any wallet or exchange — 1 XLM activates it and ~0.5 XLM is reserved by the USDC trustline. We advance automatically when it arrives.',
              { amount: SUGGESTED_XLM }
            )}
          </Typography>
          {qrUrl && (
            <Box
              component="img"
              src={qrUrl}
              alt={t('Wallet address QR code')}
              sx={{
                width: 180,
                height: 180,
                borderRadius: '12px',
                border: '1px solid rgba(10,10,15,0.08)',
              }}
            />
          )}
          <Box
            component="button"
            onClick={handleCopy}
            sx={{
              appearance: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              maxWidth: '100%',
              px: '12px',
              py: '8px',
              borderRadius: '10px',
              border: '1px solid rgba(10,10,15,0.12)',
              bgcolor: '#FAFAFB',
              cursor: 'pointer',
              fontFamily: 'inherit',
              '&:hover': { bgcolor: '#F4F4F7' },
            }}
          >
            <Typography
              sx={{
                ...MONO,
                fontSize: '11.5px',
                color: '#0A0A0F',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {`${address.slice(0, 10)}…${address.slice(-10)}`}
            </Typography>
            <Iconify
              icon="solar:copy-outline"
              width={14}
              sx={{ color: 'rgba(10,10,15,0.45)', flexShrink: 0 }}
            />
          </Box>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <CircularProgress size={12} sx={{ color: 'rgba(10,10,15,0.35)' }} />
            <Typography sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.45)' }}>
              {t('Watching for the payment…')}
            </Typography>
          </Stack>
        </Stack>
      )}

      {step === 'trustline' && (
        <Stack spacing={1.25}>
          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.55)', lineHeight: 1.55 }}>
            {t(
              '{{wallet}} is active. One approval in your wallet adds the USDC trustline (reserves ~0.5 XLM) — after that it can hold and receive USDC.',
              { wallet: walletLabel }
            )}
          </Typography>
          <Box
            component="button"
            onClick={busy ? undefined : handleAddTrustline}
            sx={{
              appearance: 'none',
              border: 'none',
              borderRadius: '12px',
              py: '12px',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: busy ? 'default' : 'pointer',
              bgcolor: '#0A0A0F',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: busy ? 0.7 : 1,
              '&:hover': busy ? {} : { opacity: 0.85 },
            }}
          >
            {busy && <CircularProgress size={14} sx={{ color: '#fff' }} />}
            {busy ? t('Waiting for your approval…') : t('Add USDC trustline')}
          </Box>
        </Stack>
      )}

      {step === 'ready' && (
        <Stack alignItems="center" spacing={1.25} sx={{ py: '6px' }}>
          <Iconify icon="lets-icons:check-fill" width={36} sx={{ color: '#1AB37D' }} />
          <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.65)', textAlign: 'center' }}>
            {t('{{wallet}} can now hold and receive USDC.', { wallet: walletLabel })}
          </Typography>
          <Box
            component="button"
            onClick={onClose}
            sx={{
              appearance: 'none',
              border: 'none',
              borderRadius: '12px',
              px: '28px',
              py: '10px',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              bgcolor: '#0A0A0F',
              color: '#fff',
              '&:hover': { opacity: 0.85 },
            }}
          >
            {t('Done')}
          </Box>
        </Stack>
      )}
    </Dialog>
  );
}
