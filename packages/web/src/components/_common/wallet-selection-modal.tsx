'use client';

import React from 'react';
import { useTranslate } from '@/locales';

import {
  Box,
  Chip,
  Stack,
  Dialog,
  Button,
  Divider,
  Typography,
  IconButton,
  DialogTitle,
  DialogContent,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';

//TODO: UI Updates in this modal

export type WalletSelectionModalProps = {
  open: boolean;
  onClose: () => void;
  onCreateNormalWallet: () => void;
  onConnectNormalWallet?: () => void;
  onContinueToOtherWallets: () => void;
  showImportOption?: boolean;
};

const WALLET_SELECTION_SEEN_KEY = 'wallet-selection-modal-seen';

/**
 * Check if user has seen the wallet selection modal before
 */
export const hasSeenWalletSelectionModal = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(WALLET_SELECTION_SEEN_KEY) === 'true';
};

/**
 * Mark wallet selection modal as seen
 */
export const markWalletSelectionModalSeen = (): void => {
  if (typeof window === 'undefined') return;
  //   localStorage.setItem(WALLET_SELECTION_SEEN_KEY, 'true');
};

export default function WalletSelectionModal({
  open,
  onClose,
  onCreateNormalWallet,
  onConnectNormalWallet,
  onContinueToOtherWallets,
  showImportOption = false,
}: WalletSelectionModalProps) {
  const { t } = useTranslate();

  const handleCreateNormalWallet = () => {
    markWalletSelectionModalSeen();
    onCreateNormalWallet();
    onClose();
  };

  const handleContinueToOtherWallets = () => {
    markWalletSelectionModalSeen();
    onContinueToOtherWallets();
    onClose();
  };

  const handleConnectNormalWallet = () => {
    if (!onConnectNormalWallet) return;
    markWalletSelectionModalSeen();
    onConnectNormalWallet();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      style={{
        padding: 10,
      }}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 2, position: 'relative' }}>
        <Typography variant="h5" component="div">
          {t('Account Setup')}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 5 }}>
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('Select how you would like to setup your account')}
          </Typography>

          <Box
            sx={{
              border: 1,
              borderColor: 'success.main',
              borderRadius: 2,
              p: 2,
              bgcolor: 'background.neutral',
            }}
          >
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip size="small" color="success" variant="outlined" label={t('Recommended')} />
                <Typography variant="caption" color="text.secondary">
                  {t('Best for most users')}
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                onClick={handleCreateNormalWallet}
                sx={{
                  py: 2,
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                }}
                startIcon={<Iconify icon="solar:check-circle-bold" width={24} />}
              >
                <Box sx={{ textAlign: 'left', flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {t('Create a Normal account')}
                  </Typography>
                </Box>
              </Button>
              {showImportOption && (
                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  size="large"
                  onClick={handleConnectNormalWallet}
                  sx={{
                    py: 2,
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                  }}
                  startIcon={<Iconify icon="solar:import-bold" width={24} />}
                >
                  <Box sx={{ textAlign: 'left', flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {t('Import an existing account')}
                    </Typography>
                  </Box>
                </Button>
              )}
            </Stack>
          </Box>

          <Divider sx={{ my: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {t('or')}
            </Typography>
          </Divider>

          <Box
            sx={{
              border: 1,
              borderColor: 'warning.light',
              borderRadius: 2,
              p: 2,
              bgcolor: 'background.neutral',
            }}
          >
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip size="small" color="warning" variant="outlined" label={t('Advanced')} />
                <Typography variant="caption" color="text.disabled">
                  {t('Requires wallet familiarity')}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="inherit"
                fullWidth
                size="large"
                onClick={handleContinueToOtherWallets}
                sx={{
                  py: 2,
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                }}
                startIcon={<Iconify icon="solar:wallet-bold" width={24} />}
              >
                <Box sx={{ textAlign: 'left', flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {t('Connect a crypto wallet')}
                  </Typography>
                </Box>
              </Button>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
