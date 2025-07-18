'use client';

import QRCode from 'qrcode';
import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';
import React, { useState, useEffect, useCallback } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Stack,
  Dialog,
  Button,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
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

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  const walletAddress = persist.wallet.address;

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
      console.error('Error generating QR code:', error);
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
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Typography variant="h6" component="div">
          {t('Receive Crypto')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('Scan QR code or copy address the address below')}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', py: 3 }}>
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

            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:copy-outline" />}
              onClick={handleCopyAddress}
              sx={{
                borderColor: theme.palette.primary.main,
                color: theme.palette.primary.main,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              {t('Copy Address')}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary" sx={{ minWidth: 120 }}>
          {t('Close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
