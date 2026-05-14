'use client';

import QRCode from 'qrcode';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { buildAuthHeaders } from '@/utils/http';
import { supabase } from '@/lib/createSupabaseClient';
import { usePersistStore } from '@normalfinance/state';
import React, { useState, useEffect, useCallback } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { createStellarExpertUrl } from '@/utils/transactions.utils';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import { logger, isTestnet, createCoinbasePayOnrampURL } from '@normalfinance/utils';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Stack,
  Alert,
  Dialog,
  Button,
  Divider,
  Typography,
  DialogTitle,
  DialogContent,
  CircularProgress,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';

export type ReceiveModalContext = 'deposit' | 'receive';

interface ReceiveModalProps {
  open: boolean;
  onClose: () => void;
  context?: ReceiveModalContext;
}

export default function ReceiveModal({ open, onClose, context = 'deposit' }: ReceiveModalProps) {
  const theme = useTheme();
  const { t } = useTranslate();
  const { copy } = useCopyToClipboard();
  const { enqueueSnackbar } = useSnackbar();
  const persist = usePersistStore();

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isCoinbaseLoading, setIsCoinbaseLoading] = useState(false);

  const walletAddress = persist.wallet.address;
  const isReceiveContext = context === 'receive';

  // Account status check
  const {
    isLoading: isCheckingAccount,
    accountExists,
    error: accountStatusError,
  } = useAccountStatus(walletAddress);

  const generateQRCode = useCallback(async () => {
    if (!walletAddress) return;

    setIsGeneratingQR(true);
    try {
      const qrDataUrl = await QRCode.toDataURL(walletAddress, {
        width: 200,
        margin: 1,
        color: {
          dark: theme.palette.text.primary,
          light: theme.palette.background.paper,
        },
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      logger.error('Error generating QR code:', error);
      enqueueSnackbar('Failed to generate QR code', { variant: 'error' });
    } finally {
      setIsGeneratingQR(false);
    }
  }, [walletAddress, theme.palette.text.primary, theme.palette.background.paper, enqueueSnackbar]);

  useEffect(() => {
    if (open && walletAddress) {
      generateQRCode();
    }
  }, [open, walletAddress, generateQRCode]);

  const handleCopyAddress = () => {
    if (walletAddress) {
      copy(walletAddress);
      enqueueSnackbar('Wallet address copied to clipboard', { variant: 'success' });
    }
  };

  const handleCoinbaseXlm = async () => {
    if (!walletAddress) return;
    // Open synchronously so Safari treats it as user-initiated.
    // Avoid 'noopener' here — it causes window.open to return null in Safari,
    // preventing us from setting the URL later. We null opener manually instead.
    const win = window.open('', '_blank');
    setIsCoinbaseLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
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
        enqueueSnackbar(t('Failed to start Coinbase checkout. Try again later.'), { variant: 'error' });
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
      logger.error('Coinbase XLM onramp error:', err);
      enqueueSnackbar(t('Failed to start Coinbase checkout. Try again later.'), { variant: 'error' });
    } finally {
      setIsCoinbaseLoading(false);
    }
  };

  const handleViewOnExplorer = () => {
    if (walletAddress) {
      const url = createStellarExpertUrl('account', walletAddress);
      window.open(url, '_blank', 'noopener');
    }
  };

  if (!walletAddress) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 2 }}>
        <Typography variant="h6" component="div">
          {t(isReceiveContext ? 'Receive Crypto' : 'Deposit Crypto')}
        </Typography>
        {!isCheckingAccount && accountExists && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('Scan the QR code or copy your account ID below')}
          </Typography>
        )}
        {!isCheckingAccount && !accountExists && !accountStatusError && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t(
              isReceiveContext
                ? 'Activate your Stellar account first, then receive other Stellar assets'
                : 'Activate your Stellar account first, then deposit other Stellar assets'
            )}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', py: 3 }}>
        {/* Loading state */}
        {isCheckingAccount && (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 4 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {t('Checking account status...')}
            </Typography>
          </Stack>
        )}

        {/* Account status error */}
        {!isCheckingAccount && accountStatusError && (
          <Stack spacing={2} alignItems="center">
            <Alert severity="error" sx={{ width: '100%', textAlign: 'left' }}>
              <Typography variant="body2">
                {t(
                  'We could not check your Stellar account right now. Please try again in a moment.'
                )}
              </Typography>
            </Alert>

            <Button
              variant="soft"
              color="info"
              startIcon={<Iconify icon="solar:copy-outline" />}
              onClick={handleCopyAddress}
            >
              {t('Copy Account ID')}
            </Button>
          </Stack>
        )}

        {/* Account not funded yet - show activation instructions */}
        {!isCheckingAccount && !accountExists && !accountStatusError && (
          <Stack spacing={3} alignItems="center">
            <Alert severity="info" sx={{ width: '100%', textAlign: 'left' }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t('This Stellar account is not active on-chain yet.')}
              </Typography>
              <Typography variant="body2">
                {t(
                  'Send at least 1 XLM to this account ID first. Once the account is funded, you can receive USDC and other Stellar assets here.'
                )}
              </Typography>
            </Alert>

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: alpha(theme.palette.grey[500], 0.08),
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 220,
                minWidth: 220,
              }}
            >
              {isGeneratingQR ? (
                <CircularProgress size={40} />
              ) : qrCodeUrl ? (
                <Box
                  component="img"
                  src={qrCodeUrl}
                  alt="Wallet Address QR Code"
                  sx={{
                    maxWidth: '100%',
                    height: 'auto',
                  }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('Unable to generate QR code')}
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: alpha(theme.palette.grey[500], 0.08),
                width: '100%',
                wordBreak: 'break-all',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  color: theme.palette.text.primary,
                }}
              >
                {walletAddress}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Button
                key="copy"
                variant="soft"
                color="info"
                startIcon={<Iconify icon="solar:copy-outline" />}
                onClick={handleCopyAddress}
              >
                {t('Copy Account ID')}
              </Button>

              <Button
                key="view"
                variant="soft"
                color="secondary"
                startIcon={<Iconify icon="eva:external-link-outline" />}
                onClick={handleViewOnExplorer}
              >
                {t('View Explorer')}
              </Button>
            </Stack>

            <Divider sx={{ width: '100%' }}>
              <Typography variant="caption" color="text.secondary">
                {t('or')}
              </Typography>
            </Divider>

            <Button
              fullWidth
              variant="contained"
              color="primary"
              disabled={isCoinbaseLoading}
              onClick={handleCoinbaseXlm}
              startIcon={
                isCoinbaseLoading
                  ? <CircularProgress size={18} color="inherit" />
                  : <Box component="img" src="https://avatars.githubusercontent.com/u/1885080?s=200&v=4" sx={{ width: 18, height: 18, borderRadius: '50%' }} />
              }
            >
              {isCoinbaseLoading ? t('Opening Coinbase…') : t('Buy XLM via Coinbase')}
            </Button>
          </Stack>
        )}

        {/* Account exists - show QR code and address */}
        {!isCheckingAccount && accountExists && (
          <Stack spacing={3} alignItems="center">
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: alpha(theme.palette.grey[500], 0.08),
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 220,
                minWidth: 220,
              }}
            >
              {isGeneratingQR ? (
                <CircularProgress size={40} />
              ) : qrCodeUrl ? (
                <Box
                  component="img"
                  src={qrCodeUrl}
                  alt="Wallet Address QR Code"
                  sx={{
                    maxWidth: '100%',
                    height: 'auto',
                  }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('Unable to generate QR code')}
                </Typography>
              )}
            </Box>

            <Stack spacing={2} alignItems="center" sx={{ width: '100%' }}>
              <Alert severity="warning">
                <Typography variant="body2">
                  {t('This wallet ONLY supports Stellar tokens!')}
                </Typography>
              </Alert>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: alpha(theme.palette.grey[500], 0.08),
                  width: '100%',
                  wordBreak: 'break-all',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    color: theme.palette.text.primary,
                  }}
                >
                  {walletAddress}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1}>
                <Button
                  key="copy"
                  variant="soft"
                  color="info"
                  startIcon={<Iconify icon="solar:copy-outline" />}
                  onClick={handleCopyAddress}
                >
                  {t('Copy Account ID')}
                </Button>

                <Button
                  key="view"
                  variant="soft"
                  color="secondary"
                  startIcon={<Iconify icon="eva:external-link-outline" />}
                  onClick={handleViewOnExplorer}
                >
                  {t('View Explorer')}
                </Button>
              </Stack>

              <Divider sx={{ width: '100%' }}>
                <Typography variant="caption" color="text.secondary">
                  {t('or')}
                </Typography>
              </Divider>

              <Button
                fullWidth
                variant="contained"
                color="primary"
                disabled={isCoinbaseLoading}
                onClick={handleCoinbaseXlm}
                startIcon={
                  isCoinbaseLoading
                    ? <CircularProgress size={18} color="inherit" />
                    : <Box component="img" src="https://avatars.githubusercontent.com/u/1885080?s=200&v=4" sx={{ width: 18, height: 18, borderRadius: '50%' }} />
                }
              >
                {isCoinbaseLoading ? t('Opening Coinbase…') : t('Buy XLM via Coinbase')}
              </Button>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
