import { useTranslate } from '@/locales';
import { buildAuthHeaders } from '@/utils/http';
import { useMgiLimits } from '@/hooks/use-mgi-limits';
import { useBoolean, useStellarConfig } from '@/hooks';
import { usePersistStore } from '@normalfinance/state';
import { openMoneyGramPlaceholder } from '@/lib/mgi/flow';
import React, { useMemo, useState, useEffect } from 'react';
import { connectedWalletLabel } from '@/lib/portfolio/display';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { runWithdrawFlow, hasCachedMgiToken } from '@/lib/mgi/client';
import { WalletSessionExpiredError } from '@/hooks/stellar/use-wallet-reconnect';
import { cdn, isTestnet, createCoinbasePayOfframpURL } from '@normalfinance/utils';
import { detectWalletEnv, assertTestnetAndAccountMatch } from '@/lib/mgi/preflight';
import {
  defaultSelection,
  filterSellableOptions,
  buildStellarWalletOptions,
} from '@/lib/wallet-options';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  List,
  Stack,
  Button,
  Dialog,
  Avatar,
  Typography,
  DialogTitle,
  ListItemText,
  DialogContent,
  ListItemButton,
  ListItemAvatar,
  CircularProgress,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';
import WalletChoice from '@/components/_common/wallet-choice';
import ModalCloseButton from '@/components/_common/modal-close-button';

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
  /** USD spot for the asset — enables the $/token toggle on the amount step. */
  assetPrice?: number;
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
  assetPrice,
}) => {
  const theme = useTheme();
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const config = useStellarConfig();

  const persist = usePersistStore();

  // doc 88 B1 — which STELLAR wallet does this ramp use? The old code
  // hardcoded the slot (persist.wallet.address), which silently sold from /
  // deposited into whichever wallet happened to be connected. Options are
  // built from the slot + companion Normal wallet; WalletChoice renders them,
  // and the choice is never made silently when more than one wallet exists.
  // (BTC/ETH/SOL have exactly one possible address, so no picker there.)
  const stellarRamp = asset.blockchain === 'stellar';
  const walletBalances = useWalletBalances(open && stellarRamp);
  const stellarOptions = useMemo(() => {
    if (!stellarRamp) return [];
    // The aggregate's Stellar rows are SLOT-only (companion arrives separately).
    const slotBal = Number(walletBalances.getAsset(asset.symbol)?.balance ?? NaN);
    const compRaw = walletBalances.companionStellar?.assets.find(
      (a) => a.symbol.toUpperCase() === asset.symbol.toUpperCase()
    )?.balance;
    return buildStellarWalletOptions({
      slotAddress: persist.wallet.address,
      slotWalletType: persist.wallet.walletType,
      slotLabel: connectedWalletLabel(persist.wallet.walletType),
      companionAddress: walletBalances.companionStellar?.address ?? null,
      ...(Number.isFinite(slotBal) ? { slotBalance: slotBal } : {}),
      ...(compRaw != null ? { companionBalance: Number(compRaw) } : {}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stellarRamp,
    walletBalances.getAsset,
    walletBalances.companionStellar,
    persist.wallet.address,
    persist.wallet.walletType,
    asset.symbol,
  ]);
  const rampOptions = useMemo(() => filterSellableOptions(stellarOptions), [stellarOptions]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setSelectedKey(defaultSelection(rampOptions, 'offramp')?.key ?? null);
    // Re-defaulting on option-count changes only: a balance ticking over must
    // not yank a selection the user already made.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rampOptions.length]);
  const selectedWallet = rampOptions.find((o) => o.key === selectedKey) ?? null;

  const { user, session } = useSupabaseAuth();

  const moneyGramAmountDialog = useBoolean();
  const mgiLimits = useMgiLimits();

  const [, setMgiLoading] = useState(false);
  // Coinbase amount-entry step (only when assetBalance is provided)
  const [cbStep, setCbStep] = useState(false);
  const [cbAmount, setCbAmount] = useState('');
  const [cbLoading, setCbLoading] = useState(false);
  // $/token amount toggle (Niko, 2026-08-13) — only offered when a price is known.
  const [cbFiatMode, setCbFiatMode] = useState(false);
  // BTC miner fee swings widely — resolve the reserve from the live fee rate.
  const [btcReserve, setBtcReserve] = useState<number | null>(null);
  // XLM must keep an account min-balance reserve (Stellar's rent equivalent).
  const [xlmReserve, setXlmReserve] = useState<number | null>(null);

  const openExternal = (url: string) => window.open(url, '_blank', 'noopener');

  // MoneyGram is a Stellar/USDC-only flow; native chains sell straight from
  // their own chain address (passed in as walletAddress).
  const isStellarAsset = asset.blockchain === 'stellar';
  // The SELECTED wallet, falling back to the old behaviour (the slot / the
  // caller's address) when the picker has nothing — never to a different
  // wallet than the one on screen.
  const userAddress = stellarRamp
    ? (selectedWallet?.address ?? persist.wallet.address)
    : persist.wallet.address;
  const sellAddress = stellarRamp ? (selectedWallet?.address ?? walletAddress) : walletAddress;

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
    if (!cbStep || asset.blockchain !== 'stellar' || asset.symbol !== 'XLM' || !sellAddress) {
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${config.HORIZON_URL}/accounts/${sellAddress}`);
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
  }, [cbStep, asset.blockchain, asset.symbol, sellAddress, config.HORIZON_URL]);

  // Most the user can sell while leaving fee/rent behind (floored so it's always
  // safely sendable). Only used when assetBalance is provided (native off-ramp).
  // USDC has no reserve on the USDC amount (the fee is paid in XLM separately).
  const reserve =
    asset.blockchain === 'bitcoin'
      ? (btcReserve ?? NATIVE_RESERVE.bitcoin)
      : asset.blockchain === 'stellar'
        ? asset.symbol === 'XLM'
          ? (xlmReserve ?? 1.6)
          : 0
        : (NATIVE_RESERVE[asset.blockchain] ?? 0);
  const sellMax =
    assetBalance != null ? Math.max(Math.floor((assetBalance - reserve) * 1e6) / 1e6, 0) : null;

  // Fiat mirror of the cap, floored to cents with the SAME rule everywhere
  // (display, Max fill, validation) — typing exactly the shown number must
  // always pass (the send-dialog lesson from doc 67).
  const price = assetPrice != null && assetPrice > 0 ? assetPrice : null;
  const sellMaxFiat =
    sellMax != null && price != null ? Math.max(Math.floor(sellMax * price * 100) / 100, 0) : null;

  // The typed amount converted to crypto units (what Coinbase is preset with).
  const cbAmountCrypto = (() => {
    const amt = Number(cbAmount);
    if (!Number.isFinite(amt) || amt <= 0) return null;
    return cbFiatMode && price != null ? amt / price : amt;
  })();

  // Reserve resolution (Niko's UX, 2026-08-13): BTC's fee-rate and XLM's
  // Horizon reserve arrive async — until then the CTA shows "Calculating
  // fees…" instead of silently using a fallback number the breakdown would
  // then contradict. ETH/SOL/USDC reserves are static, so they're ready
  // immediately.
  const reserveReady =
    asset.blockchain === 'bitcoin'
      ? btcReserve != null
      : asset.blockchain === 'stellar' && asset.symbol === 'XLM'
        ? xlmReserve != null
        : true;

  // Full-balance + reserve figures for the fee breakdown, unit-following.
  const fmtUnit = (crypto: number): string =>
    cbFiatMode && price != null
      ? `$${(Math.floor(crypto * price * 100) / 100).toFixed(2)}`
      : `${Math.floor(crypto * 1e6) / 1e6} ${asset.symbol}`;

  const handleClose = () => {
    setCbStep(false);
    setCbAmount('');
    setCbFiatMode(false);
    onClose();
  };

  /** Coinbase */
  const handleCoinbaseClick = async (cryptoAmount?: string) => {
    if (!user?.id) {
      enqueueSnackbar(t('Please login first'), { variant: 'warning' });
      return;
    }

    if (!sellAddress || !session) {
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
          address: sellAddress,
          asset: asset.symbol,
          blockchain: asset.blockchain,
        }),
      });
      const { token: sessionToken, error } = await r.json();
      if (error || !sessionToken) {
        win?.close();
        enqueueSnackbar(t('Failed to start Coinbase checkout. Try again later.'), {
          variant: 'error',
        });
        return;
      }
      // doc 89 F2: record the handoff BEFORE navigating, so a closed tab
      // cannot lose the fact that money is in flight. Fire-and-forget:
      // tracking failure must never block the sale.
      void (async () => {
        try {
          await fetch('/api/ramp/transfers', {
            method: 'POST',
            headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              direction: 'offramp',
              provider: 'coinbase',
              network: isTestnet() ? 'testnet' : 'mainnet',
              asset: asset.symbol,
              chain: asset.blockchain,
              walletAddress: sellAddress,
              amountExpected: cbAmount || null,
              baselineBalance: stellarRamp ? (selectedWallet?.balance ?? null) : null,
            }),
          });
        } catch {
          /* untracked this time — never blocked */
        }
      })();
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
      enqueueSnackbar(t('Failed to start Coinbase checkout. Try again later.'), {
        variant: 'error',
      });
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
    if (cbAmountCrypto == null) {
      enqueueSnackbar(t('Enter an amount'), { variant: 'warning' });
      return;
    }
    // Compare in the unit the user typed, against the same-rounded cap they
    // were shown — never fail someone for a float hair past the display.
    const overMax =
      cbFiatMode && sellMaxFiat != null
        ? Number(cbAmount) > sellMaxFiat
        : sellMax != null && cbAmountCrypto > sellMax;
    if (overMax) {
      enqueueSnackbar(
        cbFiatMode && sellMaxFiat != null
          ? t('Max is ${{max}} (some is kept for network fees)', { max: sellMaxFiat })
          : t('Max is {{max}} {{symbol}} (some is kept for network fees)', {
              max: sellMax,
              symbol: asset.symbol,
            }),
        { variant: 'warning' }
      );
      return;
    }
    setCbLoading(true);
    try {
      // Coinbase is preset in CRYPTO units; cap to sellMax so a fiat→crypto
      // conversion can never overshoot the reserve by rounding.
      const cryptoAmt = sellMax != null ? Math.min(cbAmountCrypto, sellMax) : cbAmountCrypto;
      await handleCoinbaseClick(cryptoAmt.toFixed(6));
      handleClose();
    } finally {
      setCbLoading(false);
    }
  };

  /** MoneyGram */
  async function startMgiWithdraw(addr: string, amountStr: string) {
    // Pre-open the popup ONLY when a cached SEP-10 token means no signature is
    // coming — a fresh passkey (WebAuthn) ceremony requires document focus,
    // which a pre-opened popup steals ("The document is not focused."). Without
    // a cached token we sign first, then openMoneyGramWindow's snackbar
    // fallback opens MoneyGram from an explicit click.
    const popup = hasCachedMgiToken(addr, isTestnet()) ? openMoneyGramPlaceholder() : null;
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
      // Session expiry already surfaced its own reconnect snackbar.
      if (!(e instanceof WalletSessionExpiredError)) {
        enqueueSnackbar(t('MoneyGram withdrawal failed'), { variant: 'error' });
      }
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
        <DialogTitle sx={{ p: 2, pb: '12px', width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" color="text.primary">
              {isStellarAsset && asset.symbol === 'USDC'
                ? t('Withdraw Cash')
                : t('Sell {{symbol}}', { symbol: asset.symbol })}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ModalCloseButton onClick={handleClose} aria-label="close dialog" />
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
          {stellarRamp && (
            <WalletChoice
              options={rampOptions}
              selectedKey={selectedKey}
              onSelect={(o) => setSelectedKey(o.key)}
              flow="offramp"
              symbol={asset.symbol}
            />
          )}
          {cbStep ? (
            // The send-dialog's visual language (Niko, 2026-08-13): labeled
            // boxes, mono amounts, unit-following Available, $/token toggle.
            <Stack spacing={2}>
              <Box
                sx={{
                  p: '14px',
                  borderRadius: '14px',
                  bgcolor: '#FAFAFB',
                  border: '1px solid rgba(10,10,15,0.08)',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: '10px',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'rgba(10,10,15,0.45)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {t('Amount')}
                  </Typography>
                  {assetBalance != null && (
                    <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)' }}>
                      {/* FULL balance (Niko's UX): the fee math lives in the
                          breakdown below, not hidden inside this number. */}
                      {t('Balance:')}{' '}
                      <Box component="span" sx={{ color: '#0A0A0F', fontWeight: 600 }}>
                        {fmtUnit(assetBalance)}
                      </Box>
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Exact send-dialog amount pattern (Niko, 2026-08-13: the
                      TextField + generic 'monospace' rendered the $ oversized
                      and italic-looking): sans $ prefix at the SAME size as
                      the Geist Mono digits. */}
                  {cbFiatMode && (
                    <Typography
                      sx={{
                        fontSize: '24px',
                        fontWeight: 600,
                        color: 'rgba(10,10,15,0.35)',
                        letterSpacing: '-0.02em',
                        lineHeight: 1,
                      }}
                    >
                      $
                    </Typography>
                  )}
                  <Box
                    component="input"
                    type="number"
                    autoFocus
                    placeholder="0"
                    value={cbAmount}
                    disabled={cbLoading}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCbAmount(e.target.value)
                    }
                    onKeyDown={(e: React.KeyboardEvent) => e.key === '-' && e.preventDefault()}
                    sx={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      bgcolor: 'transparent',
                      fontSize: '24px',
                      fontWeight: 600,
                      color: '#0A0A0F',
                      letterSpacing: '-0.02em',
                      fontFamily: '"Geist Mono", "Courier New", monospace',
                      width: '100%',
                      minWidth: 0,
                      '&::placeholder': { color: 'rgba(10,10,15,0.2)' },
                      '&::-webkit-inner-spin-button, &::-webkit-outer-spin-button': {
                        appearance: 'none',
                      },
                    }}
                  />
                  {!cbFiatMode && (
                    <Typography
                      sx={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'rgba(10,10,15,0.45)',
                        flexShrink: 0,
                      }}
                    >
                      {asset.symbol}
                    </Typography>
                  )}
                  {price != null && (
                    <Box
                      component="button"
                      aria-label="toggle currency"
                      disabled={cbLoading}
                      onClick={() => {
                        setCbAmount('');
                        setCbFiatMode((p) => !p);
                      }}
                      sx={{
                        width: 28,
                        height: 28,
                        border: 'none',
                        bgcolor: 'rgba(10,10,15,0.06)',
                        color: '#0A0A0F',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
                      }}
                    >
                      <Iconify icon="solar:transfer-vertical-bold-duotone" width={16} />
                    </Box>
                  )}
                  <Button
                    size="small"
                    onClick={() => {
                      if (sellMax == null) return;
                      setCbAmount(
                        cbFiatMode && sellMaxFiat != null ? sellMaxFiat.toFixed(2) : String(sellMax)
                      );
                    }}
                    disabled={cbLoading || sellMax == null || !reserveReady}
                    sx={{
                      minWidth: 0,
                      px: '10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(10,10,15,0.12)',
                      color: '#0A0A0F',
                      fontWeight: 700,
                      fontSize: '11px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('Max')}
                  </Button>
                </Box>
                {price != null && cbAmountCrypto != null && (
                  <Typography sx={{ fontSize: '12.5px', color: 'rgba(10,10,15,0.5)', mt: '4px' }}>
                    {cbFiatMode
                      ? `≈ ${cbAmountCrypto.toFixed(6)} ${asset.symbol}`
                      : `≈ $${(cbAmountCrypto * price).toFixed(2)}`}
                  </Typography>
                )}
              </Box>

              {/* Fee breakdown above the CTA (Niko's UX, 2026-08-13): show the
                  full balance, what's kept back and why, and what Coinbase
                  does on its side — instead of a silently smaller Max. */}
              {assetBalance != null && (
                <Box
                  sx={{
                    p: '12px 14px',
                    borderRadius: '12px',
                    bgcolor: 'rgba(10,10,15,0.03)',
                    border: '1px solid rgba(10,10,15,0.06)',
                  }}
                >
                  <Stack spacing={0.75}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontSize: '12.5px', color: 'rgba(10,10,15,0.55)' }}>
                        {t('Your balance')}
                      </Typography>
                      <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: '#0A0A0F' }}>
                        {fmtUnit(assetBalance)}
                      </Typography>
                    </Box>
                    {reserve > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: '12.5px', color: 'rgba(10,10,15,0.55)' }}>
                          {t('Kept for the network fee')}
                        </Typography>
                        <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: '#0A0A0F' }}>
                          {reserveReady ? `− ${fmtUnit(reserve)}` : t('calculating…')}
                        </Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontSize: '12.5px', color: 'rgba(10,10,15,0.55)' }}>
                        {t('Max you can sell')}
                      </Typography>
                      <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#0A0A0F' }}>
                        {reserveReady && sellMax != null ? fmtUnit(sellMax) : t('calculating…')}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.45)', pt: '2px' }}
                    >
                      {t('Coinbase then shows the cash you’ll receive after its own fees.')}
                    </Typography>
                  </Stack>
                </Box>
              )}

              <Button
                fullWidth
                variant="contained"
                onClick={handleCbContinue}
                disabled={cbLoading || !reserveReady || cbAmountCrypto == null}
                startIcon={
                  !reserveReady ? (
                    <CircularProgress size={14} sx={{ color: 'rgba(10,10,15,0.3)' }} />
                  ) : undefined
                }
                sx={{
                  borderRadius: '12px',
                  bgcolor: '#0A0A0F',
                  py: '12px',
                  fontWeight: 700,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#1a1a25' },
                  '&.Mui-disabled': { bgcolor: 'rgba(10,10,15,0.08)', color: 'rgba(10,10,15,0.3)' },
                }}
              >
                {!reserveReady
                  ? t('Calculating fees…')
                  : cbLoading
                    ? t('Opening…')
                    : t('Continue to Coinbase')}
              </Button>
              <Button
                onClick={() => setCbStep(false)}
                disabled={cbLoading}
                sx={{ textTransform: 'none', color: 'rgba(10,10,15,0.6)', fontWeight: 600 }}
              >
                {t('Back')}
              </Button>
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
        // MoneyGram's LIVE SEP-24 /info limits — hardcoding went stale once
        // already (min moved 1 → 15) and users got raw anchor rejections.
        min={mgiLimits.withdraw.min}
        max={mgiLimits.withdraw.max}
        kind="withdraw"
      />
    </>
  );
};

export default OffRampDialog;
