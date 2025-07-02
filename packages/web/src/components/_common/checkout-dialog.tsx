import React from 'react';
import { paths } from '@/routes/paths';
import { CONFIG } from '@/global-config';
import { createZKP2PURL, createOnramperURL, createCoinbasePayURL } from '@normalfinance/utils';

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

export interface CheckoutOption {
  id: string;
  avatar: string; // URL of the logo / avatar
  heading: string;
  description: string;
  url: string; // external link or deeplink
}

export interface CheckoutDialogProps {
  open: boolean;
  token: string;
  amount: string;
  onClose: () => void;
}

// ----------------------------------------------------------------------
// COMPONENT -------------------------------------------------------------

const CheckoutDialog: React.FC<CheckoutDialogProps> = ({ open, token, amount, onClose }) => {
  const theme = useTheme();

  const handleCheckoutClick = (wallet: CheckoutOption) => {
    window.open(wallet.url, '_blank', 'noopener');
  };

  // ----------------------------------------------------------------------
  // DEFAULT DATA ----------------------------------------------------------

  const DEFAULT_CHECKOUTS: CheckoutOption[] = [
    {
      id: 'onramper',
      avatar:
        'https://dashboard.onramper.com/assets/onramper-logo-08814537d425beb902d0f9b80fc5ac47b5fa20f88139ff16f09b290335d68447.png',
      heading: 'Onramper',
      description: 'Fiat-to-crypto Aggregator',
      url: createOnramperURL(CONFIG.onramper.apiKey, amount),
    },
    {
      id: 'coinbase',
      avatar: 'https://avatars.githubusercontent.com/u/1885080?s=200&v=4',
      heading: 'Coinbase',
      description: 'Debit Card, ACH, Apple Pay, Coinbase Cash Balance',
      url: createCoinbasePayURL(CONFIG.coinbase.projectId, amount),
    },
  ];

  if (CONFIG.deployment === 'SOLANA') {
    DEFAULT_CHECKOUTS.push({
      id: 'ZKP2P',
      avatar:
        'https://docs.zkp2p.xyz/~gitbook/image?url=https%3A%2F%2F3629680097-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252F6e2L3XxfmJSq8oZRw1gA%252Ficon%252FbST5e9IdOO2ji6l2a9vo%252FLogo-clear-background-512px.png%3Falt%3Dmedia%26token%3Daa14d9e1-4b05-4f9d-9aeb-44d820b50d90&width=32&dpr=1&quality=100&sign=9b52fc92&sv=2',
      heading: 'ZKP2P',
      description: 'Trustless onramping with Venmo and more',
      url: createZKP2PURL(amount),
    });
  }

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
            maxHeight: 'auto',
          },
        },
      }}
    >
      <DialogTitle sx={{ p: 2, pb: 0, width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div" color="text.primary">
            Checkout with
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
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
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.divider,
            borderRadius: 4,
          },
          scrollbarWidth: 'thin',
          scrollbarColor: `${theme.palette.divider} transparent`,
        }}
      >
        <List disablePadding>
          {DEFAULT_CHECKOUTS.map((checkout) => (
            <ListItemButton
              key={checkout.id}
              onClick={() => handleCheckoutClick(checkout)}
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
          sx={{
            fontWeight: 500,
            color: theme.palette.text.primary,
            fontSize: '12px',
            textAlign: 'center',
          }}
        >
          You’ll continue to the provider’s portal to see the fees associated with your transaction
        </Typography>
      </Box>
    </Dialog>
  );
};

export default CheckoutDialog;
