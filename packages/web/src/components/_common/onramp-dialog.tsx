import { paths } from '@/routes/paths';
import React, { useState } from 'react';
import { useTranslate } from '@/locales';
import { buildAuthHeaders } from '@/utils/http';
import { runDepositFlow } from '@/lib/mgi/client';
import { supabase } from '@/lib/createSupabaseClient';
import { usePersistStore } from '@normalfinance/state';
import { useBoolean , useStellarConfig } from '@/hooks';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';
import { useNormalWallet } from '@/hooks/stellar/use-normal-wallet';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import { detectWalletEnv, assertTestnetAndAccountMatch } from '@/lib/mgi/preflight';
import {
  cdn,
  logger,
  isTestnet,
  createStripeURL,
  createCoinbasePayOnrampURL,
} from '@normalfinance/utils';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  List,
  Alert,
  Stack,
  Button,
  Dialog,
  Avatar,
  Typography,
  IconButton,
  DialogTitle,
  ListItemText,
  DialogContent,
  ListItemButton,
  ListItemAvatar,
  CircularProgress,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';
import NormalWalletCreate from '@/components/_common/normal-wallet-create';

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
  const config = useStellarConfig();

  const persist = usePersistStore();
  const { connectWallet: connectNormalWallet } = useNormalWallet();

  const moneyGramAmountDialog = useBoolean();

  const [mgiLoading, setMgiLoading] = useState(false);
  const [showCreateNormalWallet, setShowCreateNormalWallet] = useState(false);

  const openExternal = (url: string) => window.open(url, '_blank', 'noopener');

  const userAddress = persist.wallet.address;
  const isConnected = !!userAddress;

  // Account status checks
  const {
    isLoading: isCheckingAccount,
    accountExists,
    hasUsdcTrustline,
    refetch: refetchAccountStatus,
  } = useAccountStatus(userAddress);

  // Trustline hook
  const { addTrustLine, txBroadcasting: isAddingTrustline } = useTrustLine();

  // Check if prerequisites are met
  const prerequisitesMet = accountExists && hasUsdcTrustline;

  const handleNormalWalletCreated = async () => {
    setShowCreateNormalWallet(false);
    await connectNormalWallet();
    await refetchAccountStatus();
  };

  // Handle adding USDC trustline
  const handleAddTrustline = async () => {
    if (!userAddress) {
      enqueueSnackbar(t('Please connect your wallet first'), { variant: 'warning' });
      return;
    }

    const usdcIssuer = config.USDC_ISSUER;
    if (!usdcIssuer) {
      enqueueSnackbar(t('USDC issuer not configured'), { variant: 'error' });
      return;
    }

    try {
      await addTrustLine('USDC', usdcIssuer);
      enqueueSnackbar(t('USDC enabled successfully!'), { variant: 'success' });
      await refetchAccountStatus();
    } catch (error: any) {
      logger.error('[OnRampDialog] Add trustline failed:', error);
      enqueueSnackbar(error.message || t('Failed to enable USDC'), { variant: 'error' });
    }
  };

  /** Onramper */
  // const onramperUrl = createOnramperURL(CONFIG.onramper.apiKey, {
  //   amountUsd: amount,
  //   tokenSymbol: 'USDC',
  //   walletAddress,
  //   fiat: 'USD',
  // });

  /** Stripe */
  const stripeUrl = createStripeURL(amount);

  /** Coinbase */
  const handleCoinbaseClick = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Authentication required');
    }

    if (!walletAddress) {
      enqueueSnackbar('Please login and connect your wallet first', { variant: 'warning' });
      return;
    }
    const headers = await buildAuthHeaders();
    const r = await fetch('/api/coinbase/session', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ address: walletAddress, asset: 'USDC' }),
    });

    const { token: sessionToken, error } = await r.json();
    if (error || !sessionToken) {
      enqueueSnackbar('Failed to start Coinbase checkout. Try again later.', { variant: 'error' });
      return;
    }
    const url = createCoinbasePayOnrampURL({
      amountUsd: amount,
      assetSymbol: 'USDC',
      sessionToken,
      fiat: 'USD',
      sandbox: isTestnet(),
      path: 'buy/select-asset',
      redirectUrl: `${window.location.origin}${paths.invest}`,
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
      id: 'stripe',
      avatar:
        'https://cdn.brandfetch.io/idxAg10C0L/w/480/h/480/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B',
      heading: 'Stripe',
      description: t('Debit Card, ACH, Apple Pay, Google Pay'),
      url: stripeUrl,
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
          {!isConnected && (
            <Stack spacing={2} sx={{ mb: 2 }}>
              <Alert severity="info" icon={<Iconify icon="solar:wallet-bold" width={22} />}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  {t('Normal Account Required')}
                </Typography>
                <Typography variant="body2">
                  {t('Create a Normal account to start your first USDC deposit.')}
                </Typography>
              </Alert>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                onClick={() => setShowCreateNormalWallet(true)}
                startIcon={<Iconify icon="solar:add-circle-bold" />}
              >
                {t('Create Normal Account')}
              </Button>
            </Stack>
          )}

          {isConnected && isCheckingAccount && (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 4 }}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {t('Checking account status...')}
              </Typography>
            </Stack>
          )}

          {!isCheckingAccount && isConnected && accountExists && !hasUsdcTrustline && (
            <Stack spacing={2} sx={{ mb: 2 }}>
              <Alert severity="info" icon={<Iconify icon="solar:link-bold" width={22} />}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  {t('USDC Trustline Required')}
                </Typography>
                <Typography variant="body2">
                  {t('Add a USDC trustline to receive USDC from onramp providers.')}
                </Typography>
              </Alert>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                onClick={handleAddTrustline}
                disabled={isAddingTrustline}
                startIcon={
                  isAddingTrustline ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <Iconify icon="solar:add-circle-bold" />
                  )
                }
              >
                {isAddingTrustline ? t('Adding Trustline...') : t('Add USDC Trustline')}
              </Button>
            </Stack>
          )}

          {!isCheckingAccount && isConnected && prerequisitesMet && (
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
          )}
        </DialogContent>

        {!isCheckingAccount && isConnected && prerequisitesMet && (
          <Box sx={{ px: 4, pb: 4, width: '100%' }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, color: 'text.primary', fontSize: '12px', textAlign: 'center' }}
            >
              {t("You'll continue to the provider's website to complete your transaction")}
            </Typography>
          </Box>
        )}
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
      <NormalWalletCreate
        open={showCreateNormalWallet}
        onClose={() => setShowCreateNormalWallet(false)}
        onSuccess={handleNormalWalletCreated}
      />
    </>
  );
};

export default OnRampDialog;
