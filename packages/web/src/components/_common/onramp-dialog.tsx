import { useBoolean } from '@/hooks';
import { paths } from '@/routes/paths';
import React, { useState } from 'react';
import { useTranslate } from '@/locales';
import { CONFIG } from '@/global-config';
import { runDepositFlow } from '@/lib/mgi/client';
import { usePersistStore } from '@normalfinance/state';
import { detectWalletEnv, assertTestnetAndAccountMatch } from '@/lib/mgi/preflight';
import { cdn, isTestnet, createOnramperURL, createCoinbasePayURL } from '@normalfinance/utils';

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
import { useSnackbar } from '@/components/template/snackbar';

import GetHelpButton from './get-help-button';
import AmountDialog from '../deposit-amount-dialog';

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

export interface OnRampDialogProps {
  open: boolean;
  amount: string;
  onClose: () => void;
  walletAddress: string | undefined;
}

// ----------------------------------------------------------------------
// COMPONENT -------------------------------------------------------------

const OnRampDialog: React.FC<OnRampDialogProps> = ({ open, amount, onClose, walletAddress }) => {
  const theme = useTheme();
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();

  const persist = usePersistStore();

  const moneyGramAmountDialog = useBoolean();

  const [mgiLoading, setMgiLoading] = useState(false);

  const openExternal = (url: string) => window.open(url, '_blank', 'noopener');

  const userAddress = persist.wallet.address;
  const isConnected = !!userAddress;

  /** Onramper */
  const onramperUrl = createOnramperURL(CONFIG.onramper.apiKey, {
    amountUsd: amount,
    tokenSymbol: 'USDC',
    walletAddress,
    fiat: 'USD',
  });

  /** Coinbase */
  const handleCoinbaseClick = async () => {
    if (!walletAddress) {
      enqueueSnackbar('Please connect your wallet first', { variant: 'warning' });
      return;
    }
    const r = await fetch('/api/coinbase/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: walletAddress, asset: 'USDC' }),
    });
    const { token: sessionToken, error } = await r.json();
    if (error || !sessionToken) {
      enqueueSnackbar('Failed to start Coinbase checkout. Try again later.', { variant: 'error' });
      return;
    }
    const url = createCoinbasePayURL({
      amountUsd: amount,
      assetSymbol: 'USDC',
      sessionToken,
      fiat: 'USD',
      sandbox: isTestnet(),
      path: 'buy/select-asset',
    });
    openExternal(url);
  };

  /** MoneyGram */
  const startMgiAfterAmount = async (usdcAmount: string) => {
    if (!isConnected) {
      enqueueSnackbar('Connect your wallet to continue', { variant: 'warning' });
      return;
    }

    try {
      setMgiLoading(true);

      // Optional – sanity preflight (gives user actionable errors)
      const env = await detectWalletEnv();
      assertTestnetAndAccountMatch(env, userAddress!);

      await runDepositFlow(userAddress!, usdcAmount, () => {
        enqueueSnackbar('MoneyGram ready — awaiting USDC deposit', { variant: 'info' });
      });
    } catch (e: any) {
      enqueueSnackbar(e?.message || 'MoneyGram deposit failed', { variant: 'error' });
    } finally {
      setMgiLoading(false);
    }
  };

  const ONRAMPS: OnrampOption[] = [
    {
      id: 'onramper',
      avatar:
        'https://dashboard.onramper.com/assets/onramper-logo-08814537d425beb902d0f9b80fc5ac47b5fa20f88139ff16f09b290335d68447.png',
      heading: 'Onramper',
      description: t('Debit Card, ACH, Apple Pay, Google Pay'),
      url: onramperUrl,
    },
    {
      id: 'coinbase',
      avatar: 'https://avatars.githubusercontent.com/u/1885080?s=200&v=4',
      heading: 'Coinbase',
      description: t('Debit Card, ACH, Apple Pay, Coinbase Balance'),
      onClick: handleCoinbaseClick,
    },
    {
      id: 'moneygram',
      avatar: cdn('/icons/moneygram/mgi.webp'),
      heading: 'MoneyGram',
      description: t('Drop-off cash at a physical location'),
      onClick: () => moneyGramAmountDialog.onTrue(),
    },
  ];

  return (
    <>
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
              {t('Deposit Cash')}
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
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: theme.palette.divider,
              borderRadius: 4,
            },
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
            {t("You'll continue to the provider's website to complete your transaction")}
          </Typography>
        </Box>
      </Dialog>

      <AmountDialog
        open={moneyGramAmountDialog.value}
        onCancel={moneyGramAmountDialog.onFalse}
        onConfirm={(val) => {
          moneyGramAmountDialog.onFalse();
          startMgiAfterAmount(val);
        }}
        min={1}
        max={900}
      />
    </>
  );
};

export default OnRampDialog;
