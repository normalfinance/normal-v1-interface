import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Typography,
  Box,
  IconButton,
  Stack,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Link as MuiLink,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { Iconify } from '../iconify';
import GetHelpButton from './get-help-button';

// ----------------------------------------------------------------------
// TYPES ----------------------------------------------------------------

export interface WalletOption {
  id: string;
  avatar: string; // URL of the logo / avatar
  heading: string;
  description: string;
  url: string; // external link or deeplink
}

export interface ConnectWalletDialogProps {
  open: boolean;
  onClose: () => void;
  wallets?: WalletOption[]; // optional custom list; falls back to DEFAULT_WALLETS
}

// ----------------------------------------------------------------------
// DEFAULT DATA ----------------------------------------------------------

const DEFAULT_WALLETS: WalletOption[] = [
  {
    id: 'metamask',
    avatar:
      'https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg',
    heading: 'MetaMask',
    description: 'Browser extension & mobile wallet',
    url: 'https://metamask.io/',
  },
  {
    id: 'walletConnect',
    avatar: 'https://docs.walletconnect.com/img/walletconnect-logo.svg',
    heading: 'WalletConnect',
    description: 'Connect via QR code or deep link',
    url: 'https://walletconnect.com/',
  },
  {
    id: 'coinbase',
    avatar: 'https://avatars.githubusercontent.com/u/1885080?s=200&v=4',
    heading: 'Coinbase Wallet',
    description: 'Mobile & browser wallet by Coinbase',
    url: 'https://wallet.coinbase.com/',
  },
];

// ----------------------------------------------------------------------
// COMPONENT -------------------------------------------------------------

const ConnectWalletDialog: React.FC<ConnectWalletDialogProps> = ({
  open,
  onClose,
  wallets = DEFAULT_WALLETS,
}) => {
  const theme = useTheme();

  const handleWalletClick = (wallet: WalletOption) => {
    window.open(wallet.url, '_blank', 'noopener');
  };

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
            Connect wallet
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
            <GetHelpButton />
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
          {wallets.map((wallet) => (
            <ListItemButton
              key={wallet.id}
              onClick={() => handleWalletClick(wallet)}
              sx={{
                borderRadius: 1,
                mb: 1,
                border: `1px solid ${alpha(theme.palette.grey[500], 0.14)}`,
              }}
            >
              <ListItemAvatar>
                <Avatar src={wallet.avatar} alt={wallet.heading} sx={{ width: 36, height: 36 }} />
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography variant="subtitle2" color="text.primary">
                    {wallet.heading}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {wallet.description}
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

export default ConnectWalletDialog;
