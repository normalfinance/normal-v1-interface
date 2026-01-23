'use client';

import QRCode from 'qrcode';
import { useTranslate } from '@/locales';
import { logger } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';
import React, { useState, useEffect, useCallback } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { createStellarExpertUrl } from '@/utils/transactions.utils';
import { useNormalWallet } from '@/hooks/stellar/use-normal-wallet';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import { requestFaucetFunding, submitTrustlineTransaction } from '@/services/faucet';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Stack,
  Alert,
  Dialog,
  Button,
  Typography,
  DialogTitle,
  DialogContent,
  CircularProgress,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';

interface ReceiveModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ReceiveModal({ open, onClose }: ReceiveModalProps) {
  const theme = useTheme();
  const { t } = useTranslate();
  const { copy } = useCopyToClipboard();
  const { enqueueSnackbar } = useSnackbar();
  const persist = usePersistStore();
  const { signTransaction } = useNormalWallet();

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isFunding, setIsFunding] = useState(false);

  const walletAddress = persist.wallet.address;

  // Account status check
  const {
    isLoading: isCheckingAccount,
    accountExists,
    refetch: refetchAccountStatus,
  } = useAccountStatus(walletAddress);

  // Handle funding account via faucet
  const handleFundAccount = async () => {
    if (!walletAddress) {
      enqueueSnackbar(t('Please connect your wallet first'), { variant: 'warning' });
      return;
    }

    setIsFunding(true);
    try {
      logger.log('[ReceiveModal] Requesting faucet funding for:', walletAddress);
      const { txHash, trustlineXDR } = await requestFaucetFunding(walletAddress);
      logger.log('[ReceiveModal] Account funded successfully:', txHash);

      // Auto-create trustline if we have the XDR and can sign
      if (trustlineXDR && signTransaction) {
        try {
          const signedXDR = await signTransaction(trustlineXDR);
          await submitTrustlineTransaction(signedXDR);
          logger.log('[ReceiveModal] Trustline created automatically');
          enqueueSnackbar(t('Account funded and USDC trustline created!'), { variant: 'success' });
        } catch (trustlineError: any) {
          logger.warn('[ReceiveModal] Auto-trustline failed:', trustlineError);
          enqueueSnackbar(t('Account funded successfully!'), { variant: 'success' });
        }
      } else {
        enqueueSnackbar(t('Account funded successfully!'), { variant: 'success' });
      }

      // Refetch account status
      await refetchAccountStatus();
    } catch (error: any) {
      logger.error('[ReceiveModal] Faucet funding failed:', error);
      if (
        error.message?.includes('already been funded') ||
        error.message?.includes('already exists')
      ) {
        enqueueSnackbar(t('Account already funded. Refreshing status...'), { variant: 'info' });
        await refetchAccountStatus();
      } else if (error.message?.includes('Rate limit')) {
        enqueueSnackbar(t('Rate limit exceeded. Please try again later.'), { variant: 'error' });
      } else {
        enqueueSnackbar(error.message || t('Failed to fund account'), { variant: 'error' });
      }
    } finally {
      setIsFunding(false);
    }
  };

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
          {t('Deposit Crypto')}
        </Typography>
        {!isCheckingAccount && accountExists && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('Scan the QR code or copy your account ID below')}
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

        {/* Account not funded - show faucet button */}
        {!isCheckingAccount && !accountExists && (
          <Stack spacing={3} alignItems="center">
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: alpha(theme.palette.grey[500], 0.08),
                width: '100%',
              }}
            >
              <Iconify icon="solar:wallet-bold" width={48} sx={{ color: 'warning.main', mb: 2 }} />
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                {t('Account Not Funded')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {t(
                  'Your account needs to be funded with XLM before you can receive crypto from external sources.'
                )}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                onClick={handleFundAccount}
                disabled={isFunding}
                startIcon={
                  isFunding ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <Iconify icon="solar:rocket-bold" />
                  )
                }
              >
                {isFunding ? t('Funding Account...') : t('Fund Account (Free)')}
              </Button>
            </Box>
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
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
