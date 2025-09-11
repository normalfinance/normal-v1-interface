import React from 'react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { CONFIG } from '@/global-config';
import { createOnramperURL, createCoinbasePayURL } from '@/utils/checkout';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  List,
  Chip,
  Dialog,
  Avatar,
  Typography,
  IconButton,
  DialogTitle,
  ListItemText,
  DialogContent,
  ListItemButton,
  ListItemAvatar,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';

import GetHelpButton from './get-help-button';

// ----------------------------------------------------------------------
// TYPES ----------------------------------------------------------------

export interface CheckoutOption {
  id: string;
  avatar: string; // URL of the logo / avatar
  heading: string;
  description: string;
  url?: string; // external link or deeplink
  onClick?: () => void;
}

export interface CheckoutDialogProps {
  open: boolean;
  token: string;
  amount: string;
  onClose: () => void;
  walletAddress: string | undefined;
}

// ----------------------------------------------------------------------
// COMPONENT -------------------------------------------------------------

const CheckoutDialog: React.FC<CheckoutDialogProps> = ({
  open,
  token,
  amount,
  onClose,
  walletAddress,
}) => {
  const theme = useTheme();
  const { t } = useTranslate();

  const handleCheckoutClick = (wallet: CheckoutOption) => {
    window.open(wallet.url, '_blank', 'noopener');
  };
  const openExternal = (url: string) => window.open(url, '_blank', 'noopener');

  // ----------------------------------------------------------------------
  // DEFAULT DATA ----------------------------------------------------------

  const onramperUrl = createOnramperURL(CONFIG.onramper.apiKey, {
    amountUsd: amount,
    tokenSymbol: token,
    walletAddress: walletAddress,
    fiat: 'USD',
  });

  async function handleCoinbaseClick() {
    // Get a session token from your server
    const r = await fetch('/api/coinbase/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: walletAddress, // Stellar G...
        asset: token, // 'XLM' (or whatever was selected)
      }),
    });
    const { token: sessionToken, error } = await r.json();
    if (error || !sessionToken) {
      // surface a toast/snackbar for the user
      return;
    }

    const url = createCoinbasePayURL({
      amountUsd: amount,
      assetSymbol: token,
      sessionToken,
      fiat: 'USD',
    });

    window.open(url, '_blank', 'noopener');
  }

  const CHECKOUTS: CheckoutOption[] = [
    {
      id: 'onramper',
      avatar:
        'https://dashboard.onramper.com/assets/onramper-logo-08814537d425beb902d0f9b80fc5ac47b5fa20f88139ff16f09b290335d68447.png',
      heading: 'Onramper',
      description: t('Fiat-to-crypto Aggregator'),
      url: onramperUrl,
    },
    {
      id: 'coinbase',
      avatar: 'https://avatars.githubusercontent.com/u/1885080?s=200&v=4',
      heading: 'Coinbase',
      description: t('Debit Card, ACH, Apple Pay, Coinbase Cash Balance'),
      onClick: handleCoinbaseClick, // <-- key change
    },
  ];

  const disableButtons = !amount || Number(amount) <= 0 || !token || !walletAddress;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            gap: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: '100%',
            maxWidth: 400,
          },
        },
      }}
    >
      <DialogTitle sx={{ p: 2, pb: 0, width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" color="text.primary">
            {t('Checkout with')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GetHelpButton url={paths.help.buy} />
            <IconButton onClick={onClose} aria-label="close dialog">
              <Iconify icon="mingcute:close-line" width={24} />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          p: 2,
          width: '100%',
          '&::-webkit-scrollbar': { width: 2 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: theme.palette.divider, borderRadius: 4 },
        }}
      >
        {/* Remove "Coming soon" since both are active */}
        <List disablePadding>
          {CHECKOUTS.map((checkout) => (
            <ListItemButton
              key={checkout.id}
              disabled={disableButtons}
              onClick={() => {
                if (checkout.onClick) {
                  checkout.onClick();
                } else if (checkout.url) {
                  openExternal(checkout.url);
                }
              }}
              sx={{
                borderRadius: 1,
                mb: 1,
                border: `1px solid ${alpha(theme.palette.grey[500], 0.14)}`,
              }}
            >
              <ListItemAvatar>
                <Avatar
                  src={checkout.avatar}
                  alt={checkout.heading}
                  sx={{ width: 36, height: 36 }}
                />
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography variant="subtitle2" color="text.primary">
                    {checkout.heading}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {checkout.description}
                  </Typography>
                }
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>

      <Box sx={{ px: 4, pb: 4, width: '100%' }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 500, color: 'text.primary', fontSize: '12px', textAlign: 'center' }}
        >
          {t(
            "You'll continue to the provider's portal to see the fees associated with your transaction"
          )}
        </Typography>
      </Box>
    </Dialog>
  );
};

export default CheckoutDialog;
