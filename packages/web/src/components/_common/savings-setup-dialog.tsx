'use client';

import QRCode from 'qrcode';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { buildAuthHeaders } from '@/utils/http';
import { supabase } from '@/lib/createSupabaseClient';
import React, { useState, useEffect, useCallback } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { createStellarExpertUrl } from '@/utils/transactions.utils';
import { logger, isTestnet, createCoinbasePayOnrampURL } from '@normalfinance/utils';

import {
  Box,
  Stack,
  Button,
  Dialog,
  Divider,
  Typography,
  DialogContent,
  CircularProgress,
} from '@mui/material';

import ModalCloseButton from '@/components/_common/modal-close-button';

import { Iconify } from '../template/iconify';
import { useSnackbar } from '../template/snackbar';

// ---------------------------------------------------------------------------
// Guided savings setup — the pop-up that walks a user through what they need to
// do before they can save: (1) activate the Stellar account with XLM (QR /
// account ID / Coinbase, exactly like the old fund-xlm step), then (2) add the
// USDC trustline. Activation is detected by the SavingsCard polling account
// status while this is open, so the moment XLM lands we auto-advance in place —
// no separate receive modal, no manual refresh required.
// ---------------------------------------------------------------------------

interface SavingsSetupDialogProps {
  open: boolean;
  onClose: () => void;
  walletAddress: string;
  accountExists: boolean;
  hasUsdcTrustline: boolean;
  /** true only when a USDC trustline is required (issuer configured) */
  trustlineRequired: boolean;
  isCheckingAccount: boolean;
  onRefetch: () => void;
  onAddTrustline: () => void;
  isAddingTrustline: boolean;
}

const STEPS = [
  { key: 'activate', label: 'Activate' },
  { key: 'trustline', label: 'Add USDC' },
] as const;

const pillBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  px: '14px',
  py: '8px',
  borderRadius: '10px',
  border: '1px solid rgba(10,10,15,0.12)',
  bgcolor: '#FFFFFF',
  color: '#0A0A0F',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background 150ms ease',
  '&:hover': { bgcolor: '#F4F4F7' },
} as const;

export function SavingsSetupDialog({
  open,
  onClose,
  walletAddress,
  accountExists,
  hasUsdcTrustline,
  trustlineRequired,
  isCheckingAccount,
  onRefetch,
  onAddTrustline,
  isAddingTrustline,
}: SavingsSetupDialogProps) {
  const { t } = useTranslate();
  const { copy } = useCopyToClipboard();
  const { enqueueSnackbar } = useSnackbar();

  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isCoinbaseLoading, setIsCoinbaseLoading] = useState(false);

  const step: 'activate' | 'trustline' | 'done' = !accountExists
    ? 'activate'
    : trustlineRequired && !hasUsdcTrustline
      ? 'trustline'
      : 'done';
  const activeIndex = step === 'activate' ? 0 : 1;

  const generateQRCode = useCallback(async () => {
    if (!walletAddress) return;
    setIsGeneratingQR(true);
    try {
      const url = await QRCode.toDataURL(walletAddress, {
        width: 200,
        margin: 1,
        color: { dark: '#0A0A0F', light: '#FFFFFF' },
      });
      setQrCodeUrl(url);
    } catch (e) {
      logger.error('[SavingsSetupDialog] QR error', e);
    } finally {
      setIsGeneratingQR(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (open && step === 'activate' && walletAddress) generateQRCode();
  }, [open, step, walletAddress, generateQRCode]);

  const handleCopy = () => {
    if (!walletAddress) return;
    copy(walletAddress);
    enqueueSnackbar(t('Account ID copied to clipboard'), { variant: 'success' });
  };

  const handleExplorer = () => {
    if (!walletAddress) return;
    window.open(createStellarExpertUrl('account', walletAddress), '_blank', 'noopener');
  };

  const handleCoinbase = async () => {
    if (!walletAddress) return;
    const win = window.open('', '_blank');
    setIsCoinbaseLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        win?.close();
        enqueueSnackbar(t('Please log in first'), { variant: 'warning' });
        return;
      }
      const headers = await buildAuthHeaders();
      const r = await fetch('/api/coinbase/session', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ address: walletAddress, asset: 'XLM' }),
      });
      const { token: sessionToken, error } = await r.json();
      if (error || !sessionToken) {
        win?.close();
        enqueueSnackbar(t('Failed to start Coinbase checkout. Try again later.'), {
          variant: 'error',
        });
        return;
      }
      const url = createCoinbasePayOnrampURL({
        amountUsd: '5',
        assetSymbol: 'XLM',
        sessionToken,
        fiat: 'USD',
        sandbox: isTestnet(),
        path: 'buy/select-asset',
        redirectUrl: `${window.location.origin}${paths.savings}`,
      });
      if (win) {
        win.opener = null;
        win.location.href = url;
      }
    } catch (err: any) {
      win?.close();
      logger.error('[SavingsSetupDialog] Coinbase XLM onramp error:', err);
      enqueueSnackbar(t('Failed to start Coinbase checkout. Try again later.'), {
        variant: 'error',
      });
    } finally {
      setIsCoinbaseLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: '22px' } } }}
    >
      <DialogContent sx={{ px: '24px', py: '26px' }}>
        <Stack spacing={2.25}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0A0A0F',
                  letterSpacing: '-0.02em',
                }}
              >
                {t('Set up Normal Savings')}
              </Typography>
              <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)', mt: '2px' }}>
                {t('A couple of quick steps to start earning yield on USDC.')}
              </Typography>
            </Box>
            <ModalCloseButton onClick={onClose} />
          </Box>

          {/* Step indicator */}
          {trustlineRequired && (
            <Stack direction="row" spacing={1}>
              {STEPS.map((s, i) => {
                const done = i < activeIndex || step === 'done';
                const active = i === activeIndex && step !== 'done';
                return (
                  <Stack
                    key={s.key}
                    direction="row"
                    alignItems="center"
                    spacing={0.75}
                    sx={{ flex: 1 }}
                  >
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: done
                          ? 'rgba(26,179,125,0.14)'
                          : active
                            ? '#0A0A0F'
                            : 'rgba(10,10,15,0.06)',
                        color: done ? '#0A6649' : active ? '#fff' : 'rgba(10,10,15,0.4)',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {done ? <Iconify icon="eva:checkmark-outline" width={12} /> : i + 1}
                    </Box>
                    <Typography
                      sx={{
                        fontSize: '12px',
                        fontWeight: active ? 600 : 500,
                        color: active || done ? '#0A0A0F' : 'rgba(10,10,15,0.4)',
                      }}
                    >
                      {s.label}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          )}

          {/* Step 1 — Activate (QR + account ID + Coinbase, auto-detected) */}
          {step === 'activate' && (
            <Stack spacing={1.5} alignItems="center">
              <Box
                sx={{
                  px: '14px',
                  py: '12px',
                  borderRadius: '12px',
                  bgcolor: 'rgba(59,130,246,0.05)',
                  border: '1px solid rgba(59,130,246,0.15)',
                  width: '100%',
                }}
              >
                <Typography
                  sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.7)', lineHeight: 1.55 }}
                >
                  {t(
                    'Your Stellar account needs a little XLM to activate before it can hold USDC. Scan the code or send at least 1 XLM to the account ID below — it activates automatically the moment funds arrive.'
                  )}
                </Typography>
              </Box>

              {/* QR */}
              <Box
                sx={{
                  p: '16px',
                  borderRadius: '16px',
                  bgcolor: '#FAFAFB',
                  border: '1px solid rgba(10,10,15,0.08)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 200,
                  width: '100%',
                }}
              >
                {isGeneratingQR ? (
                  <CircularProgress size={32} sx={{ color: 'rgba(10,10,15,0.3)' }} />
                ) : qrCodeUrl ? (
                  <Box
                    component="img"
                    src={qrCodeUrl}
                    alt="Wallet Address QR Code"
                    sx={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
                  />
                ) : (
                  <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.4)' }}>
                    {t('Unable to generate QR code')}
                  </Typography>
                )}
              </Box>

              {/* Address */}
              <Box
                sx={{
                  px: '14px',
                  py: '12px',
                  borderRadius: '12px',
                  bgcolor: '#FAFAFB',
                  border: '1px solid rgba(10,10,15,0.08)',
                  width: '100%',
                  wordBreak: 'break-all',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '12px',
                    color: '#0A0A0F',
                    fontFamily: '"Geist Mono", "Courier New", monospace',
                    lineHeight: 1.6,
                  }}
                >
                  {walletAddress}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1}>
                <Box component="button" onClick={handleCopy} sx={pillBtn}>
                  <Iconify icon="solar:copy-outline" width={15} />
                  {t('Copy Account ID')}
                </Box>
                <Box component="button" onClick={handleExplorer} sx={pillBtn}>
                  <Iconify icon="eva:external-link-outline" width={15} />
                  {t('View Explorer')}
                </Box>
              </Stack>

              <Divider sx={{ width: '100%' }}>
                <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.4)' }}>
                  {t('or')}
                </Typography>
              </Divider>

              <Button
                fullWidth
                onClick={handleCoinbase}
                disabled={isCoinbaseLoading}
                startIcon={
                  isCoinbaseLoading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <Box
                      component="img"
                      src="https://avatars.githubusercontent.com/u/1885080?s=200&v=4"
                      sx={{ width: 18, height: 18, borderRadius: '50%' }}
                    />
                  )
                }
                sx={{
                  borderRadius: '12px',
                  bgcolor: '#0A0A0F',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '14px',
                  py: '13px',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#1a1a25' },
                  '&.Mui-disabled': { bgcolor: 'rgba(10,10,15,0.08)', color: 'rgba(10,10,15,0.3)' },
                }}
              >
                {isCoinbaseLoading ? t('Opening Coinbase…') : t('Buy XLM via Coinbase')}
              </Button>

              {/* Live watcher — polled by the card; click to force a check now. */}
              <Box
                component="button"
                onClick={onRefetch}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: 'rgba(10,10,15,0.5)',
                  fontSize: '12px',
                  py: '2px',
                  '&:hover': { color: 'rgba(10,10,15,0.75)' },
                }}
              >
                <CircularProgress size={13} sx={{ color: 'rgba(10,10,15,0.35)' }} />
                {isCheckingAccount
                  ? t('Checking…')
                  : t('Watching for your XLM — activates automatically')}
              </Box>
            </Stack>
          )}

          {/* Step 2 — Add USDC trustline */}
          {step === 'trustline' && (
            <Stack spacing={1.75}>
              <Box
                sx={{
                  px: '14px',
                  py: '12px',
                  borderRadius: '12px',
                  bgcolor: 'rgba(59,130,246,0.05)',
                  border: '1px solid rgba(59,130,246,0.15)',
                }}
              >
                <Typography
                  sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.7)', lineHeight: 1.55 }}
                >
                  {t(
                    'Nice — your account is active. Add a USDC trustline so it can hold and earn USDC. One quick signature, just a tiny network fee.'
                  )}
                </Typography>
              </Box>
              <Button
                fullWidth
                onClick={onAddTrustline}
                disabled={isAddingTrustline}
                startIcon={
                  isAddingTrustline ? (
                    <CircularProgress size={16} sx={{ color: '#fff' }} />
                  ) : (
                    <Iconify icon="solar:add-circle-bold" width={18} />
                  )
                }
                sx={{
                  background: '#0A0A0F',
                  color: '#fff',
                  borderRadius: '12px',
                  py: '13px',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': { background: '#1a1a25' },
                  '&.Mui-disabled': { background: 'rgba(10,10,15,0.35)', color: '#fff' },
                }}
              >
                {isAddingTrustline ? t('Adding trustline…') : t('Add USDC trustline')}
              </Button>
            </Stack>
          )}

          {/* Done */}
          {step === 'done' && (
            <Stack spacing={2} alignItems="center" sx={{ py: 1 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: 'rgba(26,179,125,0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Iconify icon="solar:check-circle-bold" width={30} sx={{ color: '#0A6649' }} />
              </Box>
              <Typography
                sx={{ fontSize: '14px', color: 'rgba(10,10,15,0.7)', textAlign: 'center' }}
              >
                {t('You’re all set — deposit USDC to start earning.')}
              </Typography>
              <Button
                fullWidth
                onClick={onClose}
                sx={{
                  background: '#0A0A0F',
                  color: '#fff',
                  borderRadius: '12px',
                  py: '13px',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': { background: '#1a1a25' },
                }}
              >
                {t('Start saving')}
              </Button>
            </Stack>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
