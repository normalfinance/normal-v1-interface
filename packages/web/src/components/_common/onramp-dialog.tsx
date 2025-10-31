import React from 'react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { CONFIG } from '@/global-config';
import { enqueueSnackbar } from 'notistack';
import { createOnramperURL, createCoinbasePayURL } from '@normalfinance/utils';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  List,
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

export interface OnrampOption {
  id: string;
  avatar: string; // URL of the logo / avatar
  heading: string;
  description: string;
  url?: string; // external link or deeplink
  onClick?: () => void;
}

export interface OnrampDialogProps {
  open: boolean;
  token: string;
  amount: string;
  onClose: () => void;
  walletAddress: string | undefined;
}

// ----------------------------------------------------------------------
// COMPONENT -------------------------------------------------------------

const OnrampDialog: React.FC<OnrampDialogProps> = ({
  open,
  token,
  amount,
  onClose,
  walletAddress,
}) => {
  const theme = useTheme();
  const { t } = useTranslate();

  const openExternal = (url: string) => window.open(url, '_blank', 'noopener');

  const onramperUrl = createOnramperURL(CONFIG.onramper.apiKey, {
    amountUsd: amount,
    tokenSymbol: token,
    walletAddress,
    fiat: 'USD',
  });

  const handleCoinbaseClick = async () => {
    if (!walletAddress) {
      enqueueSnackbar('Please connect your wallet first', { variant: 'warning' });
      return;
    }
    const r = await fetch('/api/coinbase/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: walletAddress, asset: token }),
    });
    const { token: sessionToken, error } = await r.json();
    if (error || !sessionToken) {
      enqueueSnackbar('Failed to start Coinbase checkout. Try again later.', { variant: 'error' });
      return;
    }
    const url = createCoinbasePayURL({
      amountUsd: amount,
      assetSymbol: token,
      sessionToken,
      fiat: 'USD',
      sandbox: true,
      path: 'buy/select-asset',
    });
    openExternal(url);
  };

  const ONRAMPS: OnrampOption[] = [
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
      onClick: handleCoinbaseClick,
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
            {t('Onramp with')}
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
        <List disablePadding>
          {ONRAMPS.map((checkout) => (
            <ListItemButton
              key={checkout.id}
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

export default OnrampDialog;
