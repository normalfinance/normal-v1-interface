import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { buildAuthHeaders } from '@/utils/http';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/createSupabaseClient';
import { usePersistStore } from '@normalfinance/state';
import { useBoolean , useStellarConfig } from '@/hooks';
import { openMoneyGramPlaceholder } from '@/lib/mgi/flow';
import { reportMgiStatus, refreshMgiStatus } from '@/lib/mgi/db';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';
import { useNormalWallet } from '@/hooks/stellar/use-normal-wallet';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import { FAILED_MGI_STATUSES, TERMINAL_MGI_STATUSES } from '@/lib/mgi/statuses';
import { WalletSessionExpiredError } from '@/hooks/stellar/use-wallet-reconnect';
import { detectWalletEnv, assertTestnetAndAccountMatch } from '@/lib/mgi/preflight';
import { runDepositFlow, openTxInAnchorUI, hasCachedMgiToken } from '@/lib/mgi/client';
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

export interface OnrampAsset {
  symbol: string; // 'USDC' | 'XLM' | 'BTC' | 'ETH' | 'SOL'
  blockchain: 'stellar' | 'bitcoin' | 'ethereum' | 'solana';
}

export type OnrampProvider = 'stripe' | 'coinbase' | 'moneygram';

export interface OnRampDialogProps {
  open: boolean;
  amount: string;
  onClose: () => void;
  walletAddress: string | undefined;
  /** Asset to onramp into; defaults to USDC on Stellar (legacy behavior). */
  asset?: OnrampAsset;
  /** Which providers to offer; defaults to all of them. */
  providers?: OnrampProvider[];
}

// ----------------------------------------------------------------------
// COMPONENT -------------------------------------------------------------

const OnRampDialog: React.FC<OnRampDialogProps> = ({
  open,
  amount,
  onClose,
  walletAddress,
  asset = { symbol: 'USDC', blockchain: 'stellar' },
  providers = ['stripe', 'coinbase', 'moneygram'],
}) => {
  const theme = useTheme();
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const config = useStellarConfig();

  const persist = usePersistStore();
  const { connectWallet: connectNormalWallet } = useNormalWallet();

  const moneyGramAmountDialog = useBoolean();

  const [mgiLoading, setMgiLoading] = useState(false);
  // Set once the user commits inside MoneyGram's UI — the dialog then shows
  // the "complete your cash deposit" state instead of the provider list.
  const [mgiCommitted, setMgiCommitted] = useState<{
    id: string | null;
    amount: string;
    status: string;
  } | null>(null);
  const [showCreateNormalWallet, setShowCreateNormalWallet] = useState(false);

  const openExternal = (url: string) => window.open(url, '_blank', 'noopener');

  // Non-Stellar assets onramp straight to the chain address passed in —
  // Stellar account/trustline prerequisites don't apply to them.
  const isStellarAsset = asset.blockchain === 'stellar';

  const userAddress = persist.wallet.address;
  const isConnected = isStellarAsset ? !!userAddress : !!walletAddress;

  // Account status checks
  const {
    isLoading: isCheckingAccount,
    accountExists,
    hasUsdcTrustline,
    refetch: refetchAccountStatus,
  } = useAccountStatus(userAddress);

  // Trustline hook
  const { addTrustLine, txBroadcasting: isAddingTrustline } = useTrustLine();

  // Prerequisites are Stellar-specific: USDC needs an activated account with
  // a trustline; XLM purchases activate the account themselves; native chains
  // just need their address, which the caller guarantees.
  const prerequisitesMet = !isStellarAsset
    ? true
    : asset.symbol === 'USDC'
      ? accountExists && hasUsdcTrustline
      : asset.symbol === 'XLM'
        ? true
        : accountExists;
  const checkingAccount = isStellarAsset && asset.symbol !== 'XLM' ? isCheckingAccount : false;

  const handleNormalWalletCreated = async () => {
    setShowCreateNormalWallet(false);
    await connectNormalWallet();
    await refetchAccountStatus();
  };

  // Closing the dialog leaves the committed state behind — the pending banner
  // and activity feed on the USDC page take over from there.
  const handleDialogClose = () => {
    setMgiCommitted(null);
    onClose();
  };

  // While the post-commit screen is open, watch the deposit: status checks
  // against MoneyGram using the cached SEP-10 token ONLY (never a background
  // passkey prompt), mirrored into our DB so every other view updates too.
  useEffect(() => {
    const id = mgiCommitted?.id;
    if (!open || !id || !userAddress) return undefined;
    if (TERMINAL_MGI_STATUSES.has(mgiCommitted.status)) return undefined;
    const iv = setInterval(async () => {
      if (!hasCachedMgiToken(userAddress, isTestnet())) return;
      try {
        const tx = await refreshMgiStatus(userAddress, id);
        const status = tx?.status ? String(tx.status) : '';
        if (!status) return;
        setMgiCommitted((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
        if (status === 'completed') {
          enqueueSnackbar(t('MoneyGram deposit completed — USDC received'), {
            variant: 'success',
          });
          window.dispatchEvent(new Event('nf:activity-updated'));
        }
      } catch {
        /* transient — next tick retries */
      }
    }, 15_000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mgiCommitted?.id, mgiCommitted?.status, userAddress]);

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
  const stripeUrl = createStripeURL(amount, asset.symbol.toLowerCase(), asset.blockchain);

  /** Coinbase */
  const handleCoinbaseClick = async () => {
    if (!walletAddress) {
      enqueueSnackbar('Please login and connect your wallet first', { variant: 'warning' });
      return;
    }
    // Open synchronously so Safari treats it as user-initiated.
    // Avoid 'noopener' here — it causes window.open to return null in Safari,
    // preventing us from setting the URL later. We null opener manually instead.
    const win = window.open('', '_blank');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        win?.close();
        enqueueSnackbar('Please log in first', { variant: 'warning' });
        return;
      }
      const headers = await buildAuthHeaders();
      const r = await fetch('/api/coinbase/session', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          address: walletAddress,
          asset: asset.symbol,
          blockchain: asset.blockchain,
        }),
      });

      const { token: sessionToken, error } = await r.json();
      if (error || !sessionToken) {
        win?.close();
        enqueueSnackbar('Failed to start Coinbase checkout. Try again later.', { variant: 'error' });
        return;
      }
      const url = createCoinbasePayOnrampURL({
        amountUsd: amount,
        assetSymbol: asset.symbol,
        sessionToken,
        fiat: 'USD',
        sandbox: isTestnet(),
        path: 'buy/select-asset',
        redirectUrl: `${window.location.origin}${isStellarAsset ? paths.invest : paths.assets.details(asset.symbol)}`,
      });
      if (win) {
        win.opener = null;
        win.location.href = url;
      }
    } catch (err: any) {
      win?.close();
      logger.error('Coinbase USDC onramp error:', err);
      enqueueSnackbar('Failed to start Coinbase checkout. Try again later.', { variant: 'error' });
    }
  };

  /** MoneyGram */
  const startMgiAfterAmount = async (usdcAmount: string) => {
    if (!isConnected) {
      enqueueSnackbar('Connect your wallet to continue', { variant: 'warning' });
      return;
    }

    // Pre-open the popup synchronously ONLY when a cached SEP-10 token means no
    // signature is coming. A fresh signature runs a WebAuthn passkey ceremony,
    // which requires the document to stay focused — a pre-opened popup steals
    // focus and the ceremony dies with "The document is not focused." Without a
    // cached token we sign first (page focused), then openMoneyGramWindow's
    // snackbar fallback opens MoneyGram from an explicit click.
    const popup = hasCachedMgiToken(userAddress!, isTestnet()) ? openMoneyGramPlaceholder() : null;

    try {
      setMgiLoading(true);

      // Optional – sanity preflight (gives user actionable errors)
      const env = await detectWalletEnv();
      assertTestnetAndAccountMatch(env, userAddress!);

      await runDepositFlow(
        userAddress!,
        usdcAmount,
        (tx) => {
          // Committed in MoneyGram's UI. For a cash DEPOSIT there is no
          // reference number yet (it's generated after the cash handoff) —
          // what the user needs now is instructions, not a code.
          const txId = tx?.id ? String(tx.id) : null;
          const status = String(tx?.status ?? 'pending_user_transfer_start');
          if (txId) reportMgiStatus(txId, { status });
          setMgiCommitted({ id: txId, amount: usdcAmount, status });
        },
        popup
      );
    } catch (e: any) {
      popup?.close();
      // Session expiry already surfaced its own reconnect snackbar.
      if (!(e instanceof WalletSessionExpiredError)) {
        enqueueSnackbar(e?.message || 'MoneyGram deposit failed', { variant: 'error' });
      }
    } finally {
      setMgiLoading(false);
    }
  };

  const ALL_ONRAMPS: (OnrampOption & { id: OnrampProvider })[] = [
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

  // MoneyGram is a Stellar/USDC flow — never offer it for other chains
  const ONRAMPS = ALL_ONRAMPS.filter(
    (option) => providers.includes(option.id) && (isStellarAsset || option.id !== 'moneygram')
  );

  return (
    <>
      <Dialog
        open={open}
        onClose={handleDialogClose}
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
              {mgiCommitted
                ? t('Complete your cash deposit')
                : isStellarAsset && asset.symbol === 'USDC'
                  ? t('Deposit Cash')
                  : t('Buy {{symbol}}', { symbol: asset.symbol })}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={handleDialogClose} aria-label="close dialog">
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
          {mgiCommitted ? (
            <Stack spacing={2} sx={{ py: 1 }}>
              <Alert
                severity={
                  mgiCommitted.status === 'completed'
                    ? 'success'
                    : FAILED_MGI_STATUSES.has(mgiCommitted.status)
                      ? 'warning'
                      : 'info'
                }
                icon={<Iconify icon="solar:hand-money-bold" width={22} />}
              >
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  {mgiCommitted.status === 'completed'
                    ? t('Cash received — USDC delivered')
                    : FAILED_MGI_STATUSES.has(mgiCommitted.status)
                      ? t('This deposit is no longer active')
                      : t('Drop off your cash')}
                </Typography>
                <Typography variant="body2">
                  {mgiCommitted.status === 'completed'
                    ? t('MoneyGram received your cash and the USDC has been sent to your wallet.')
                    : FAILED_MGI_STATUSES.has(mgiCommitted.status)
                      ? t('MoneyGram reports this deposit as {{status}}. Start a new deposit if needed.', {
                          status: mgiCommitted.status,
                        })
                      : t(
                          'Bring ${{amount}} in cash to the MoneyGram location you selected. No code is needed — the agent finds your transaction by your name and phone number, and your receipt with a reference number comes after paying. Your USDC arrives here shortly after.',
                          { amount: mgiCommitted.amount }
                        )}
                </Typography>
              </Alert>

              {mgiCommitted.id &&
                mgiCommitted.status !== 'completed' &&
                !FAILED_MGI_STATUSES.has(mgiCommitted.status) && (
                  <Button
                    variant="outlined"
                    fullWidth
                    size="large"
                    startIcon={<Iconify icon="solar:document-text-bold" />}
                    onClick={() => openTxInAnchorUI(userAddress!, mgiCommitted.id!)}
                  >
                    {t('View drop-off details')}
                  </Button>
                )}

              <Button variant="contained" fullWidth size="large" onClick={handleDialogClose}>
                {mgiCommitted.status === 'completed' ? t('Done') : t("Done — I'll drop off the cash")}
              </Button>

              {mgiCommitted.status !== 'completed' && (
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                  {t('You can close this — the deposit stays visible under Activity on your USDC page.')}
                </Typography>
              )}
            </Stack>
          ) : (
            <>
          {!isConnected && isStellarAsset && (
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

          {isConnected && checkingAccount && (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 4 }}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {t('Checking account status...')}
              </Typography>
            </Stack>
          )}

          {isStellarAsset && !isCheckingAccount && isConnected && accountExists && !hasUsdcTrustline && (
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

          {!checkingAccount && isConnected && prerequisitesMet && (
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
            </>
          )}
        </DialogContent>

        {!mgiCommitted && !checkingAccount && isConnected && prerequisitesMet && (
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
        // MGI production SEP-24 /info: deposit USDC min 1 / max 950, no fees.
        min={1}
        max={950}
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
