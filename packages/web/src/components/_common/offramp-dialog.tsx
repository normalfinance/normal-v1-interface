import { useTranslate } from '@/locales';
import { buildAuthHeaders } from '@/utils/http';
import React, { useState, useEffect } from 'react';
import { runWithdrawFlow } from '@/lib/mgi/client';
import { useBoolean, useStellarConfig } from '@/hooks';
import { usePersistStore } from '@normalfinance/state';
import { openMoneyGramPlaceholder } from '@/lib/mgi/flow';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { cdn, isTestnet, createCoinbasePayOfframpURL } from '@normalfinance/utils';
import { detectWalletEnv, assertTestnetAndAccountMatch } from '@/lib/mgi/preflight';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  List,
  Stack,
  Button,
  Dialog,
  Avatar,
  TextField,
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

import AmountDialog from '../deposit-amount-dialog';

import type { OnrampAsset, OnrampProvider } from './onramp-dialog';

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

export interface OffRampDialogProps {
  open: boolean;
  amount: string;
  onClose: () => void;
  walletAddress: string | undefined;
  /** Asset to off-ramp out of; defaults to USDC on Stellar (legacy behavior). */
  asset?: OnrampAsset;
  /** Which providers to offer; defaults to Coinbase + MoneyGram. */
  providers?: OnrampProvider[];
  /** When set, the Coinbase sell asks for an amount in our UI (capped to the
   *  spendable balance) and presets+locks it on Coinbase — avoids "Max" overshoot. */
  assetBalance?: number;
}

// Kept back from a native off-ramp so the chain can pay its own fee (and SOL's
// rent-exempt minimum). BTC is resolved dynamically from the live fee rate (see
// below) since its miner fee swings widely; this is the fallback.
const NATIVE_RESERVE: Record<string, number> = {
  solana: 0.0009,
  ethereum: 0.001,
  bitcoin: 0.0001,
  stellar: 0,
};

// ----------------------------------------------------------------------
// COMPONENT -------------------------------------------------------------

const OffRampDialog: React.FC<OffRampDialogProps> = ({
  open,
  amount,
  onClose,
  walletAddress,
  asset = { symbol: 'USDC', blockchain: 'stellar' },
  providers = ['coinbase', 'moneygram'],
  assetBalance,
}) => {
  const theme = useTheme();
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const config = useStellarConfig();

  const persist = usePersistStore();

  const { user, session } = useSupabaseAuth();

  const moneyGramAmountDialog = useBoolean();

  const [mgiLoading, setMgiLoading] = useState(false);
  // Coinbase amount-entry step (only when assetBalance is provided)
  const [cbStep, setCbStep] = useState(false);
  const [cbAmount, setCbAmount] = useState('');
  const [cbLoading, setCbLoading] = useState(false);
  // BTC miner fee swings widely — resolve the reserve from the live fee rate.
  const [btcReserve, setBtcReserve] = useState<number | null>(null);
  // XLM must keep an account min-balance reserve (Stellar's rent equivalent).
  const [xlmReserve, setXlmReserve] = useState<number | null>(null);

  const openExternal = (url: string) => window.open(url, '_blank', 'noopener');

  // MoneyGram is a Stellar/USDC-only flow; native chains sell straight from
  // their own chain address (passed in as walletAddress).
  const isStellarAsset = asset.blockchain === 'stellar';
  const userAddress = persist.wallet.address;

  // When the BTC amount step opens, estimate the reserve from the current
  // mempool fee rate (~2-in/2-out tx + buffer) so Max stays sendable.
  useEffect(() => {
    if (!cbStep || asset.blockchain !== 'bitcoin') return undefined;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('https://mempool.space/api/v1/fees/recommended');
        const f = await r.json();
        const rate = f.halfHourFee || 15; // sat/vByte
        const feeSat = rate * 210 * 1.4; // ~210 vbytes, 1.4x safety buffer
        const reserveBtc = Math.min(Math.max(feeSat / 1e8, 0.00003), 0.0005);
        if (!cancelled) setBtcReserve(reserveBtc);
      } catch {
        if (!cancelled) setBtcReserve(0.0001);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cbStep, asset.blockchain]);

  // When the XLM amount step opens, fetch the account's actual min-balance
  // reserve from Horizon ((2 + subentries) × 0.5 XLM + fee) so Max stays sendable.
  useEffect(() => {
    if (!cbStep || asset.blockchain !== 'stellar' || asset.symbol !== 'XLM' || !walletAddress) {
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${config.HORIZON_URL}/accounts/${walletAddress}`);
        const acc = await r.json();
        const subentries = Number(acc.subentry_count ?? 1);
        const reserveXlm = (2 + subentries) * 0.5 + 0.01;
        if (!cancelled) setXlmReserve(reserveXlm);
      } catch {
        if (!cancelled) setXlmReserve(1.6);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cbStep, asset.blockchain, asset.symbol, walletAddress, config.HORIZON_URL]);

  // Most the user can sell while leaving fee/rent behind (floored so it's always
  // safely sendable). Only used when assetBalance is provided (native off-ramp).
  // USDC has no reserve on the USDC amount (the fee is paid in XLM separately).
  const reserve =
    asset.blockchain === 'bitcoin'
      ? btcReserve ?? NATIVE_RESERVE.bitcoin
      : asset.blockchain === 'stellar'
        ? asset.symbol === 'XLM'
          ? xlmReserve ?? 1.6
          : 0
        : NATIVE_RESERVE[asset.blockchain] ?? 0;
  const sellMax =
    assetBalance != null ? Math.max(Math.floor((assetBalance - reserve) * 1e6) / 1e6, 0) : null;

  const handleClose = () => {
    setCbStep(false);
    setCbAmount('');
    onClose();
  };

  /** Coinbase */
  const handleCoinbaseClick = async (cryptoAmount?: string) => {
    if (!user?.id) {
      enqueueSnackbar(t('Please login first'), { variant: 'warning' });
      return;
    }

    if (!walletAddress || !session) {
      enqueueSnackbar(t('Please connect your wallet first'), { variant: 'warning' });
      return;
    }

    // Open the tab synchronously (survives popup blockers) and navigate it only
    // once the tokenized URL is ready. Critically, we NEVER expose the single-use
    // Coinbase session URL as a window.open target: link prefetchers, corporate
    // link scanners, or a reopened tab that pre-visit such targets consume the
    // one-time sessionToken first, producing Coinbase's "sessionToken already
    // used" error. Blank-then-navigate (matching the on-ramp flow) avoids that.
    const win = window.open('', '_blank');
    try {
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
        enqueueSnackbar(t('Failed to start Coinbase checkout. Try again later.'), { variant: 'error' });
        return;
      }
      const url = createCoinbasePayOfframpURL({
        sessionToken,
        // Return to the current page with markers so the GLOBAL resume handler
        // (mounted in ModalProvider) can complete the on-chain send — Coinbase
        // can't pull funds from a self-custody wallet.
        redirectUrl: `${window.location.origin}${window.location.pathname}?offramp=coinbase&sym=${asset.symbol}&chain=${asset.blockchain}`,
        // URL-safe, stable identifier — the status API path includes this verbatim,
        // so an email (with an encoded '@') would break the JWT path match (401).
        partnerUserRef: user.id,
        fiat: 'USD',
        sandbox: isTestnet(),
        defaultAsset: asset.symbol,
        defaultNetwork: asset.blockchain,
        // Pre-fill our spendable-capped amount, but leave the order EDITABLE so the
        // user can still choose their cash-out destination (bank, EUR/USD balance…).
        // We don't lock it (disableEdit) because that also removes the destination
        // choice — the modal's pre-flight still guards against an over-Max amount.
        ...(cryptoAmount ? { presetCryptoAmount: cryptoAmount } : {}),
      });
      if (win) {
        win.opener = null;
        win.location.href = url;
      } else {
        // Popup was blocked outright — best-effort direct open.
        openExternal(url);
      }
    } catch {
      win?.close();
      enqueueSnackbar(t('Failed to start Coinbase checkout. Try again later.'), { variant: 'error' });
    }
  };

  // Coinbase row: native off-ramp goes through our amount step first; otherwise
  // (USDC) hand off directly as before.
  const onCoinbaseRowClick = () => {
    if (sellMax != null) {
      setCbAmount('');
      setCbStep(true);
    } else {
      handleCoinbaseClick();
    }
  };

  const handleCbContinue = async () => {
    const amt = Number(cbAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      enqueueSnackbar(t('Enter an amount'), { variant: 'warning' });
      return;
    }
    if (sellMax != null && amt > sellMax) {
      enqueueSnackbar(
        t('Max is {{max}} {{symbol}} (some is kept for network fees)', {
          max: sellMax,
          symbol: asset.symbol,
        }),
        { variant: 'warning' }
      );
      return;
    }
    setCbLoading(true);
    try {
      await handleCoinbaseClick(String(amt));
      handleClose();
    } finally {
      setCbLoading(false);
    }
  };

  /** MoneyGram */
  async function startMgiWithdraw(addr: string, amountStr: string) {
    // Open the popup synchronously, inside the click's user activation — after
    // the SEP-10 passkey prompt + network calls, window.open would be blocked.
    // We navigate this window once MGI's interactive URL is ready.
    const popup = openMoneyGramPlaceholder();
    setMgiLoading(true);
    try {
      const env = await detectWalletEnv();
      assertTestnetAndAccountMatch(env, addr);

      const withdrawAmount = Number(amountStr);
      if (!Number.isFinite(withdrawAmount) || withdrawAmount <= 0) {
        popup?.close();
        enqueueSnackbar(t('Enter a valid USDC amount'), { variant: 'warning' });
        return;
      }

      await runWithdrawFlow(
        addr,
        withdrawAmount,
        () => {
          enqueueSnackbar(t('MoneyGram ready — send USDC when prompted'), { variant: 'info' });
        },
        popup
      );
    } catch (e: any) {
      popup?.close();
      enqueueSnackbar(t('MoneyGram withdrawal failed'), { variant: 'error' });
    } finally {
      setMgiLoading(false);
    }
  }

  const ALL_OFFRAMPS: (OnrampOption & { id: OnrampProvider })[] = [
    {
      id: 'coinbase',
      avatar: 'https://avatars.githubusercontent.com/u/1885080?s=200&v=4',
      heading: 'Coinbase',
      description: t('Debit Card, ACH, Apple Pay, Coinbase Balance'),
      onClick: onCoinbaseRowClick,
    },
    {
      id: 'moneygram',
      avatar: cdn('/icons/moneygram/mgi.webp'),
      heading: 'MoneyGram',
      description: t('Pick up cash at a physical location'),
      onClick: () => moneyGramAmountDialog.onTrue(),
    },
  ];

  // MoneyGram is a Stellar/USDC flow — never offer it for other chains.
  const OFFRAMPS = ALL_OFFRAMPS.filter(
    (option) =>
      (providers as string[]).includes(option.id) && (isStellarAsset || option.id !== 'moneygram')
  );

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
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
              {isStellarAsset && asset.symbol === 'USDC'
                ? t('Withdraw Cash')
                : t('Sell {{symbol}}', { symbol: asset.symbol })}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={handleClose} aria-label="close dialog">
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
          {cbStep ? (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {t('How much {{symbol}} do you want to sell? Max keeps a little back for network fees.', { symbol: asset.symbol })}
              </Typography>
              <TextField
                autoFocus
                fullWidth
                type="number"
                label={t('Amount ({{symbol}})', { symbol: asset.symbol })}
                value={cbAmount}
                onChange={(e) => setCbAmount(e.target.value)}
                disabled={cbLoading}
                helperText={
                  sellMax != null
                    ? t('Available: {{max}} {{symbol}}', { max: sellMax, symbol: asset.symbol })
                    : ''
                }
                InputProps={{
                  endAdornment: (
                    <Button
                      size="small"
                      onClick={() => sellMax != null && setCbAmount(String(sellMax))}
                      disabled={cbLoading || sellMax == null}
                    >
                      {t('Max')}
                    </Button>
                  ),
                }}
              />
              <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                <Button variant="outlined" onClick={() => setCbStep(false)} disabled={cbLoading}>
                  {t('Back')}
                </Button>
                <Button variant="contained" onClick={handleCbContinue} disabled={cbLoading}>
                  {cbLoading ? t('Opening…') : t('Continue to Coinbase')}
                </Button>
              </Stack>
            </Stack>
          ) : (
            <List disablePadding>
              {OFFRAMPS.map((checkout) => (
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
          startMgiWithdraw(userAddress ?? '', val);
        }}
        // MGI production SEP-24 /info: withdraw USDC min 1 / max 2500, no fees.
        min={1}
        max={2500}
        kind="withdraw"
      />
    </>
  );
};

export default OffRampDialog;
