'use client';

import React from 'react';
import { useTranslate } from '@/locales';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Stack,
  Typography,
  IconButton,
  Box,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';

//TODO: UI Updates in this modal

export type WalletSelectionModalProps = {
  open: boolean;
  onClose: () => void;
  onCreateNormalWallet: () => void;
  onConnectNormalWallet: () => void;
  onContinueToOtherWallets: () => void;
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
}: WalletSelectionModalProps) {
  const { t } = useTranslate();

  const handleCreateNormalWallet = () => {
    markWalletSelectionModalSeen();
    onCreateNormalWallet();
    onClose();
  };

  const handleConnectNormalWallet = () => {
    markWalletSelectionModalSeen();
    onConnectNormalWallet();
    onClose();
  };

  const handleContinueToOtherWallets = () => {
    markWalletSelectionModalSeen();
    onContinueToOtherWallets();
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
          {t('Choose Wallet Type')}
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
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('Select how you would like to connect your account')}
          </Typography>

          {/* Create Normal Wallet */}
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
            startIcon={<Iconify icon="solar:wallet-bold" width={24} />}
          >
            <Box sx={{ textAlign: 'left', flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {t('Create A Normal Account')}
              </Typography>
            </Box>
          </Button>

          {/* Connect Normal Wallet */}
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
            startIcon={<Iconify icon="solar:wallet-money-bold" width={24} />}
          >
            <Box sx={{ textAlign: 'left', flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {t('Import Existing Normal Account')}
              </Typography>
            </Box>
          </Button>

          {/* Continue to Other Wallets */}
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
              mt: 1,
            }}
            startIcon={<Iconify icon="solar:link-circle-bold" width={24} />}
          >
            <Box sx={{ textAlign: 'left', flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {t('Continue With Other Stellar Wallets')}
              </Typography>
            </Box>
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
