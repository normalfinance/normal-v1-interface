'use client';

import type { Token } from '@normalfinance/types';
import type { MemoRequirement } from '@/lib/stellar/memo-required';

import { useSnackbar } from 'notistack';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { Horizon } from '@stellar/stellar-sdk';
import { fCurrency } from '@/utils/format-number';
import { usePendingOutflow } from '@/lib/spendable';
import { usePersistStore } from '@normalfinance/state';
import { useBtcPortfolio } from '@/hooks/use-btc-portfolio';
import { useSendToken } from '@/hooks/stellar/use-send-token';
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { spendableXlm, SAVINGS_XLM_BUFFER } from '@/utils/stellar-reserve';
import { useEthPortfolio, useSolPortfolio } from '@/hooks/use-chain-portfolio';
import { knownMemoRequirement, fetchMemoRequirement } from '@/lib/stellar/memo-required';
import { getMaxAmount, getCryptoIconUrl, sanitizeAmountInput } from '@normalfinance/utils';

import {
  Box,
  Stack,
  Button,
  Dialog,
  Tooltip,
  Typography,
  DialogTitle,
  DialogContent,
} from '@mui/material';

import PickToken from './pick-token';
import SendReview from './send-review';
import { Iconify } from '../template/iconify';
import PasteIconButton from '../paste-icon-button';
import { BtcTxStatusModal } from './btc-tx-status-modal';
import { createSolanaAdapter } from './send-adapters/solana';
import { createStellarAdapter } from './send-adapters/stellar';
import { createBitcoinAdapter } from './send-adapters/bitcoin';
import { NetworkBadge, getAssetNetwork } from './network-badge';
import { createEthereumAdapter } from './send-adapters/ethereum';

import type { SendAdapter } from './send-adapters';

// ----------------------------------------------------------------------

interface SendModalProps {
  open: boolean;
  onClose: () => void;
  /** Preselect this asset on open (e.g. from the asset detail page). */
  initialSymbol?: string;
}

export default function SendModal({ open, onClose, initialSymbol }: SendModalProps) {
  const { t } = useTranslate('auto');
  const { enqueueSnackbar } = useSnackbar();

  const persist = usePersistStore();
  const config = useStellarConfig();
  const tokens = persist.tokenState.tokens;

  const { send: stellarSend } = useSendToken();
  const { btcToken, bitcoinAddress } = useBtcPortfolio(open);
  const { ethToken, ethereumAddress } = useEthPortfolio(open);
  const { solToken, solanaAddress } = useSolPortfolio(open);

  // Build the full sendable list: Stellar tokens + native chains with balance
  const sendableTokens = useMemo(() => {
    const stellar = tokens.filter((tkn) => BigNumber(tkn.balance).gt(0));
    const natives = [btcToken, ethToken, solToken].filter(
      (tkn): tkn is Token => !!tkn && BigNumber(tkn.balance).gt(0)
    );
    return [...stellar, ...natives];
  }, [tokens, btcToken, ethToken, solToken]);

  const xlmPrice = useMemo(
    () => BigNumber(tokens.find((tok) => tok.symbol === 'XLM')?.price ?? 0).toNumber(),
    [tokens]
  );

  const [sendToken, setSendToken] = useState<Token | null>(null);
  const [destination, setDestination] = useState('');
  const [memo, setMemo] = useState('');
  const [amount, setAmount] = useState('');
  const [isFiatMode, setIsFiatMode] = useState(false);
  const [showMemo, setShowMemo] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [xlmSubentries, setXlmSubentries] = useState<number | null>(null);
  const [maxLoading, setMaxLoading] = useState(false);
  // BTC fee estimate — fetched when BTC is selected
  const [btcFeeRateSatPerVbyte, setBtcFeeRateSatPerVbyte] = useState<number | null>(null);
  // Post-send BTC transaction status
  const [btcTxInfo, setBtcTxInfo] = useState<{
    txid: string;
    amountBtc: number;
    destination: string;
    estimatedFeeSat?: number;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const isBtc = sendToken?.contract === '__btc__';
  const isEth = sendToken?.contract === '__eth__';
  const isSol = sendToken?.contract === '__sol__';
  const isNative = isBtc || isEth || isSol;

  // Reset form each time the dialog opens
  useEffect(() => {
    if (!open) return;
    setDestination('');
    setMemo('');
    setAmount('');
    setIsFiatMode(false);
    setShowMemo(false);
    setXlmSubentries(null);
    setBtcFeeRateSatPerVbyte(null);
    const preselected = initialSymbol
      ? sendableTokens.find((tkn) => tkn.symbol === initialSymbol)
      : undefined;
    const best = [...sendableTokens].sort(
      (a, b) =>
        BigNumber(b.balance)
          .multipliedBy(b.price)
          .comparedTo(BigNumber(a.balance).multipliedBy(a.price)) ?? 0
    )[0];
    setSendToken(preselected ?? best ?? sendableTokens[0] ?? null);
  }, [open, sendableTokens, initialSymbol]);

  // Fetch XLM subentry count for accurate reserve calculation
  useEffect(() => {
    if (!open || sendToken?.symbol !== 'XLM' || !persist.wallet.address) return;
    setXlmSubentries(null);
    const horizonServer = new Horizon.Server(config.HORIZON_URL, {
      allowHttp: config.HORIZON_URL.startsWith('http://'),
    });
    horizonServer
      .loadAccount(persist.wallet.address)
      .then((acc) => setXlmSubentries(acc.subentry_count))
      .catch(() => setXlmSubentries(null));
  }, [open, sendToken?.symbol, persist.wallet.address, config.HORIZON_URL]);

  // Fetch BTC fee rate when BTC is selected
  useEffect(() => {
    if (!isBtc) return;
    fetch('https://mempool.space/api/v1/fees/recommended')
      .then((r) => r.json())
      .then((data) => setBtcFeeRateSatPerVbyte(data.halfHourFee ?? null))
      .catch(() => setBtcFeeRateSatPerVbyte(null));
  }, [isBtc]);

  // Build the active adapter based on selected token
  const adapter = useMemo((): SendAdapter | null => {
    if (!sendToken) return null;
    const onError = (msg: string) => {
      enqueueSnackbar(msg, { variant: 'error' });
    };
    if (isBtc) {
      if (!bitcoinAddress) return null;
      return createBitcoinAdapter(bitcoinAddress, onError);
    }
    if (isEth) {
      if (!ethereumAddress) return null;
      return createEthereumAdapter(ethereumAddress, onError);
    }
    if (isSol) {
      if (!solanaAddress) return null;
      return createSolanaAdapter(solanaAddress, onError);
    }
    return createStellarAdapter(stellarSend, xlmPrice);
  }, [
    sendToken,
    isBtc,
    isEth,
    isSol,
    bitcoinAddress,
    ethereumAddress,
    solanaAddress,
    stellarSend,
    xlmPrice,
    enqueueSnackbar,
  ]);

  const xlmSubentriesForAdapter = xlmSubentries ?? undefined;

  // #62: money committed to in-flight sends/swaps is not offerable, even
  // while the displayed balance still includes it (it lags the chain by a
  // few seconds). Derived live from the pending ledgers — never a store write.
  const pendingOutflow = usePendingOutflow(adapter?.network, sendToken?.symbol);

  const spendableBalance = useMemo(() => {
    if (!sendToken || !adapter) return BigNumber(0);
    const base = adapter.getSpendableBalance(sendToken, xlmSubentriesForAdapter);
    const net = base.minus(pendingOutflow);
    return net.gt(0) ? net : BigNumber(0);
  }, [sendToken, adapter, xlmSubentriesForAdapter, pendingOutflow]);

  const coinAmount = useMemo(() => {
    if (!sendToken || !amount) return BigNumber(0);
    const n = BigNumber(amount);
    if (n.isNaN()) return BigNumber(0);
    return isFiatMode ? n.dividedBy(sendToken.price) : n;
  }, [amount, sendToken, isFiatMode]);

  const fiatAmount = useMemo(() => {
    if (!sendToken) return BigNumber(0);
    return coinAmount.multipliedBy(sendToken.price);
  }, [coinAmount, sendToken]);

  const insufficientBalance = coinAmount.gt(0) && spendableBalance.lt(coinAmount);

  // Fee display for the info row
  const feeDisplay = useMemo(() => {
    if (!adapter) return null;
    if (adapter.feeInfo) return adapter.feeInfo;
    // BTC: dynamic estimate
    if (isBtc && btcFeeRateSatPerVbyte !== null) {
      const feeSat = Math.ceil(btcFeeRateSatPerVbyte * 141);
      const feeBtc = feeSat / 1e8;
      const feeFiat = feeBtc * (sendToken ? parseFloat(sendToken.price) : 0);
      return {
        label: `~${feeSat.toLocaleString()} sat`,
        fiatLabel: `(${fCurrency(feeFiat)})`,
        tooltip: `Estimated Bitcoin miner fee at ${btcFeeRateSatPerVbyte} sat/vbyte. Actual fee may vary.`,
      };
    }
    return null;
  }, [adapter, isBtc, btcFeeRateSatPerVbyte, sendToken]);

  // Address validation via adapter
  const isAddressValid = useMemo(
    () => (destination ? (adapter?.validateAddress(destination) ?? false) : true),
    [destination, adapter]
  );

  // Exchange deposit addresses pool every customer's funds into one account;
  // the memo routes the payment to the right customer. A memo-less send to
  // one succeeds on-chain and vanishes into the exchange's omnibus balance
  // (finding #48 — it happened, with Coinbase). Seed list answers instantly;
  // the route adds the live directory + SEP-29 flag for addresses we don't
  // know. null = not required / still checking, and the Review gate below
  // fails CLOSED only on a positive answer, so a slow check can never block
  // an ordinary send.
  const [memoRequirement, setMemoRequirement] = useState<MemoRequirement | null>(null);
  useEffect(() => {
    setMemoRequirement(null);
    if (adapter?.network !== 'stellar' || !destination || !isAddressValid) return undefined;

    const known = knownMemoRequirement(destination);
    if (known) {
      setMemoRequirement(known);
      setShowMemo(true);
      return undefined;
    }

    let cancelled = false;
    fetchMemoRequirement(destination).then((req) => {
      if (cancelled || !req.required) return;
      setMemoRequirement(req);
      setShowMemo(true);
    });
    return () => {
      cancelled = true;
    };
  }, [destination, isAddressValid, adapter?.network]);

  const memoMissing = !!memoRequirement?.required && !memo.trim();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(sanitizeAmountInput(e.target.value));
  };

  const handleMaxClick = async () => {
    if (!sendToken) return;
    if (isFiatMode) {
      setAmount(spendableBalance.multipliedBy(sendToken.price).toFixed(2, BigNumber.ROUND_DOWN));
      return;
    }
    if (isNative) {
      setAmount(spendableBalance.toFixed(8, BigNumber.ROUND_DOWN));
      return;
    }
    if (sendToken.symbol === 'XLM' && persist.wallet.address) {
      // Fresh on-chain read so MAX exactly matches what the send will accept —
      // the cached store balance/subentry count can lag, and the send execution
      // does its own fresh read. Same spendableXlm helper on both sides.
      setMaxLoading(true);
      try {
        const server = new Horizon.Server(config.HORIZON_URL, {
          allowHttp: config.HORIZON_URL.startsWith('http://'),
        });
        const acc = await server.loadAccount(persist.wallet.address);
        setXlmSubentries(acc.subentry_count);
        const nativeBal = acc.balances.find((b) => b.asset_type === 'native')?.balance ?? '0';
        let max = spendableXlm(nativeBal, acc.subentry_count);
        // Savings-capable accounts (they hold the USDC trustline) keep a small
        // XLM buffer so future deposit/withdraw fees are always covered — but
        // only when there's enough headroom to bother.
        if (acc.subentry_count > 0 && max.gt(SAVINGS_XLM_BUFFER)) {
          max = max.minus(SAVINGS_XLM_BUFFER);
        }
        setAmount(max.toFixed(7, BigNumber.ROUND_DOWN));
      } catch {
        setAmount(spendableBalance.toFixed(7, BigNumber.ROUND_DOWN));
      } finally {
        setMaxLoading(false);
      }
      return;
    }
    // Other Stellar tokens (e.g. USDC): full balance.
    setAmount(getMaxAmount(sendToken, false));
  };

  // Whether MAX kept the extra savings buffer (drives the info note below).
  const savingsBufferApplies = sendToken?.symbol === 'XLM' && (xlmSubentries ?? 0) > 0;

  const toggleMode = () => {
    if (!sendToken || !amount) {
      setIsFiatMode((p) => !p);
      return;
    }
    const n = BigNumber(amount);
    if (n.isNaN() || n.isZero()) {
      setIsFiatMode((p) => !p);
      return;
    }
    if (isFiatMode) {
      setAmount(coinAmount.toFixed(sendToken.decimals));
    } else {
      setAmount(fiatAmount.toFixed(2));
    }
    setIsFiatMode((p) => !p);
  };

  const getButtonLabel = (): string => {
    if (!sendToken) return t('Select an asset');
    if (!destination) return t('Enter destination address');
    if (!isAddressValid) {
      return t('Invalid destination address');
    }
    if (!amount || coinAmount.isZero()) return t('Enter an amount');
    if (insufficientBalance)
      return t('Insufficient {{symbol}} balance', { symbol: sendToken.symbol });
    // Fail closed for exchange destinations: without the memo the funds
    // arrive at the exchange but are never credited to the user's account.
    if (memoMissing) return t('Enter the memo from the exchange');
    return t('Review transaction');
  };

  const isReviewReady = getButtonLabel() === t('Review transaction');

  const handleReviewClick = () => {
    if (!sendToken || !isReviewReady) return;
    if (adapter?.network === 'stellar' && destination === persist.wallet.address) {
      enqueueSnackbar(t('Cannot send to your own address'), { variant: 'error' });
      return;
    }
    setReviewOpen(true);
  };

  const handleReviewClose = () => {
    setReviewOpen(false);
    onClose();
  };

  const handleBtcSendSuccess = (txid: string) => {
    setBtcTxInfo({
      txid,
      amountBtc: coinAmount.toNumber(),
      destination,
      estimatedFeeSat: btcEstimatedFeeSat,
    });
    setReviewOpen(false);
    // Keep SendModal mounted — BtcTxStatusModal renders in its place
  };

  // Estimate fee in sats for the review dialog (BTC only)
  const btcEstimatedFeeSat = useMemo(() => {
    if (!isBtc || btcFeeRateSatPerVbyte === null) return undefined;
    return Math.ceil(btcFeeRateSatPerVbyte * 141);
  }, [isBtc, btcFeeRateSatPerVbyte]);

  return (
    <>
      <Dialog
        open={open && !btcTxInfo}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '22px' } } }}
      >
        <DialogTitle sx={{ px: '22px', pt: '22px', pb: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography
              sx={{ fontSize: '15px', fontWeight: 600, color: '#0A0A0F', letterSpacing: '-0.01em' }}
            >
              {t('Send')}
            </Typography>
            <Box
              component="button"
              onClick={onClose}
              sx={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                border: 'none',
                bgcolor: 'rgba(10,10,15,0.06)',
                color: '#0A0A0F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 150ms ease',
                '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
              }}
            >
              <Iconify icon="mingcute:close-line" width={16} />
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: '22px', pt: '16px', pb: '22px' }}>
          <Stack spacing={1.5}>
            {/* Asset selector */}
            <Box
              onClick={() => setPickerOpen(true)}
              sx={{
                p: '16px',
                borderRadius: '16px',
                bgcolor: '#FAFAFB',
                border: '1px solid rgba(10,10,15,0.08)',
                cursor: 'pointer',
                transition: 'border-color 150ms ease',
                '&:hover': { borderColor: 'rgba(10,10,15,0.16)' },
              }}
            >
              {sendToken ? (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '10px' }}>
                    <Typography
                      sx={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'rgba(10,10,15,0.45)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {t('Asset')}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)' }}>
                      {t('Available:')}{' '}
                      <Box component="span" sx={{ color: '#0A0A0F', fontWeight: 600 }}>
                        {spendableBalance.toFixed(
                          Math.min(sendToken.decimals, isBtc ? 6 : 4),
                          BigNumber.ROUND_DOWN
                        )}{' '}
                        {sendToken.symbol}
                      </Box>
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        px: '12px',
                        py: '8px',
                        borderRadius: '100px',
                        bgcolor: '#FFFFFF',
                        border: '1px solid rgba(10,10,15,0.08)',
                      }}
                    >
                      <Box
                        component="img"
                        src={sendToken.icon ?? getCryptoIconUrl(sendToken.symbol)}
                        sx={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <Typography
                        sx={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#0A0A0F',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {sendToken.symbol}
                      </Typography>
                      <NetworkBadge network={getAssetNetwork(sendToken)} />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Box
                        component="button"
                        disabled={maxLoading}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleMaxClick();
                        }}
                        sx={{
                          border: 'none',
                          bgcolor: 'rgba(10,10,15,0.06)',
                          color: '#0A0A0F',
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          px: '8px',
                          py: '4px',
                          borderRadius: '6px',
                          cursor: maxLoading ? 'default' : 'pointer',
                          opacity: maxLoading ? 0.5 : 1,
                          flexShrink: 0,
                          fontFamily: 'inherit',
                          '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
                        }}
                      >
                        {maxLoading ? '…' : 'MAX'}
                      </Box>
                      <Iconify
                        icon="eva:chevron-down-fill"
                        width={18}
                        sx={{ color: 'rgba(10,10,15,0.4)' }}
                      />
                    </Box>
                  </Box>
                </>
              ) : (
                <Typography sx={{ fontSize: '14px', color: 'rgba(10,10,15,0.4)' }}>
                  {t('Select asset')}
                </Typography>
              )}
            </Box>

            {/* Amount input */}
            <Box
              sx={{
                p: '16px',
                borderRadius: '16px',
                bgcolor: '#FAFAFB',
                border: '1px solid',
                borderColor: insufficientBalance ? 'error.main' : 'rgba(10,10,15,0.08)',
                transition: 'border-color 150ms ease',
                '&:focus-within': {
                  borderColor: insufficientBalance ? 'error.main' : 'rgba(10,10,15,0.24)',
                },
              }}
            >
              <Typography
                sx={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'rgba(10,10,15,0.45)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  mb: '10px',
                }}
              >
                {t('Amount')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isFiatMode && (
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
                  ref={inputRef}
                  component="input"
                  type="number"
                  value={amount}
                  onChange={handleInputChange}
                  placeholder="0"
                  onKeyDown={(e: React.KeyboardEvent) => e.key === '-' && e.preventDefault()}
                  sx={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    bgcolor: 'transparent',
                    fontSize: '24px',
                    fontWeight: 600,
                    color: insufficientBalance ? 'error.main' : '#0A0A0F',
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
                {!isFiatMode && sendToken && (
                  <Typography
                    sx={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'rgba(10,10,15,0.45)',
                      flexShrink: 0,
                    }}
                  >
                    {sendToken.symbol}
                  </Typography>
                )}
                <Tooltip title={t('Toggle USD / crypto')}>
                  <Box
                    component="button"
                    onClick={toggleMode}
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
                      fontFamily: 'inherit',
                      '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
                    }}
                  >
                    <Iconify icon="solar:transfer-vertical-bold-duotone" width={16} />
                  </Box>
                </Tooltip>
              </Box>
              <Typography
                sx={{
                  fontSize: '12px',
                  color: insufficientBalance ? 'error.main' : 'rgba(10,10,15,0.45)',
                  mt: '6px',
                }}
              >
                {insufficientBalance
                  ? t('Exceeds available balance')
                  : sendToken && coinAmount.gt(0)
                    ? isFiatMode
                      ? `≈ ${coinAmount.toFixed(isBtc ? 6 : 4)} ${sendToken.symbol}`
                      : `≈ ${fCurrency(fiatAmount)}`
                    : t('Enter amount above')}
              </Typography>
            </Box>

            {/* Destination address */}
            <Box
              sx={{
                p: '16px',
                borderRadius: '16px',
                bgcolor: '#FAFAFB',
                border: '1px solid',
                borderColor: destination && !isAddressValid ? 'error.main' : 'rgba(10,10,15,0.08)',
                transition: 'border-color 150ms ease',
                '&:focus-within': {
                  borderColor:
                    destination && !isAddressValid ? 'error.main' : 'rgba(10,10,15,0.24)',
                },
              }}
            >
              <Typography
                sx={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'rgba(10,10,15,0.45)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  mb: '10px',
                }}
              >
                {t('To')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box
                  component="input"
                  type="text"
                  value={destination}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDestination(e.target.value.trim())
                  }
                  placeholder={adapter?.addressPlaceholder ?? 'G…'}
                  sx={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    bgcolor: 'transparent',
                    fontSize: '13px',
                    color: '#0A0A0F',
                    fontFamily: '"Geist Mono", "Courier New", monospace',
                    width: '100%',
                    minWidth: 0,
                    '&::placeholder': { color: 'rgba(10,10,15,0.25)' },
                  }}
                />
                <PasteIconButton
                  alert="Destination pasted"
                  onSubmit={(v) => {
                    setDestination(v.trim());
                    return true;
                  }}
                />
              </Box>
              {destination && !isAddressValid && (
                <Typography sx={{ fontSize: '12px', color: 'error.main', mt: '6px' }}>
                  {t('Not a valid {{network}} address', {
                    network:
                      adapter?.network === 'stellar'
                        ? 'Stellar'
                        : adapter
                          ? adapter.network.charAt(0).toUpperCase() + adapter.network.slice(1)
                          : '',
                  })}
                </Typography>
              )}
            </Box>

            {/* Memo — Stellar only. When the destination is a known exchange
                the field is forced open and required: the toggle disappears so
                it cannot be dismissed, and Review stays disabled without it. */}
            {adapter?.hasMemo && (
              <Box>
                {memoRequirement?.required ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      p: '12px 14px',
                      borderRadius: '12px',
                      bgcolor: 'rgba(245,158,11,0.08)',
                      border: '1px solid rgba(245,158,11,0.35)',
                    }}
                  >
                    <Iconify
                      icon="eva:alert-triangle-outline"
                      width={18}
                      sx={{ color: '#B45309', mt: '1px', flexShrink: 0 }}
                    />
                    <Typography sx={{ fontSize: '12.5px', color: '#78350F', lineHeight: 1.5 }}>
                      {memoRequirement.name
                        ? t(
                            '{{name}} requires a memo. It is shown next to the deposit address in your {{name}} account. Without it your funds will not be credited.',
                            { name: memoRequirement.name }
                          )
                        : t(
                            'This address requires a memo. It is shown next to the deposit address at the receiving service. Without it your funds will not be credited.'
                          )}
                    </Typography>
                  </Box>
                ) : (
                  <Box
                    component="button"
                    onClick={() => setShowMemo((p) => !p)}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: 'none',
                      bgcolor: 'transparent',
                      color: 'rgba(10,10,15,0.5)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      p: 0,
                      transition: 'color 150ms ease',
                      '&:hover': { color: '#0A0A0F' },
                    }}
                  >
                    <Iconify
                      icon={showMemo ? 'eva:minus-circle-outline' : 'eva:plus-circle-outline'}
                      width={16}
                    />
                    {showMemo ? t('Remove memo') : t('Add memo (optional)')}
                  </Box>
                )}
                {showMemo && (
                  <Box
                    sx={{
                      mt: '10px',
                      p: '16px',
                      borderRadius: '16px',
                      bgcolor: '#FAFAFB',
                      border: '1px solid rgba(10,10,15,0.08)',
                      transition: 'border-color 150ms ease',
                      '&:focus-within': { borderColor: 'rgba(10,10,15,0.24)' },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'rgba(10,10,15,0.45)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        mb: '10px',
                      }}
                    >
                      {memoRequirement?.required ? t('Memo (required)') : t('Memo')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Box
                        component="input"
                        type="text"
                        value={memo}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setMemo(e.target.value)
                        }
                        placeholder={t('Exchange ID, note…')}
                        sx={{
                          flex: 1,
                          border: 'none',
                          outline: 'none',
                          bgcolor: 'transparent',
                          fontSize: '14px',
                          color: '#0A0A0F',
                          fontFamily: 'inherit',
                          width: '100%',
                          minWidth: 0,
                          '&::placeholder': { color: 'rgba(10,10,15,0.25)' },
                        }}
                      />
                      <PasteIconButton
                        alert="Memo pasted"
                        onSubmit={(v) => {
                          setMemo(v);
                          return true;
                        }}
                      />
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {/* Fee + reserve info */}
            {feeDisplay && (
              <Box
                sx={{
                  p: '12px 14px',
                  borderRadius: '12px',
                  bgcolor: '#FAFAFB',
                  border: '1px solid rgba(10,10,15,0.06)',
                }}
              >
                <Stack spacing={0.75}>
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
                        {t('Network fee')}
                      </Typography>
                      <Tooltip title={feeDisplay.tooltip}>
                        <Box sx={{ display: 'flex', color: 'rgba(10,10,15,0.3)', cursor: 'help' }}>
                          <Iconify icon="eva:info-outline" width={13} />
                        </Box>
                      </Tooltip>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#0A0A0F',
                        fontFamily: '"Geist Mono", "Courier New", monospace',
                      }}
                    >
                      {feeDisplay.label}{' '}
                      <Box component="span" sx={{ color: 'rgba(10,10,15,0.45)', fontWeight: 400 }}>
                        {feeDisplay.fiatLabel}
                      </Box>
                    </Typography>
                  </Box>

                  {/* XLM minimum reserve info */}
                  {sendToken?.symbol === 'XLM' && xlmSubentries !== null && (
                    <>
                      <Box sx={{ height: '1px', bgcolor: 'rgba(10,10,15,0.06)' }} />
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
                            {t('Minimum reserve')}
                          </Typography>
                          <Tooltip
                            title={t(
                              'Stellar requires every account to keep a minimum XLM balance (2 XLM base + 0.5 XLM per trustline/offer). This amount stays in your account and is not sent.'
                            )}
                          >
                            <Box
                              sx={{ display: 'flex', color: 'rgba(10,10,15,0.3)', cursor: 'help' }}
                            >
                              <Iconify icon="eva:info-outline" width={13} />
                            </Box>
                          </Tooltip>
                        </Box>
                        <Typography
                          sx={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#0A0A0F',
                            fontFamily: '"Geist Mono", "Courier New", monospace',
                          }}
                        >
                          {((2 + xlmSubentries) * 0.5).toFixed(1)} XLM
                        </Typography>
                      </Box>
                      {savingsBufferApplies && (
                        <Typography
                          sx={{ fontSize: '11px', color: 'rgba(10,10,15,0.4)', lineHeight: 1.4 }}
                        >
                          {t(
                            'MAX keeps ~{{buffer}} XLM extra so you can always pay savings deposit & withdrawal fees.',
                            { buffer: SAVINGS_XLM_BUFFER }
                          )}
                        </Typography>
                      )}
                    </>
                  )}
                </Stack>
              </Box>
            )}

            {/* BTC fee loading indicator */}
            {isBtc && !feeDisplay && (
              <Box
                sx={{
                  p: '12px 14px',
                  borderRadius: '12px',
                  bgcolor: '#FAFAFB',
                  border: '1px solid rgba(10,10,15,0.06)',
                }}
              >
                <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.4)' }}>
                  {t('Fetching fee estimate…')}
                </Typography>
              </Box>
            )}

            {/* CTA */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={!isReviewReady}
              onClick={handleReviewClick}
              sx={{
                borderRadius: '12px',
                bgcolor: '#0A0A0F',
                fontWeight: 700,
                fontSize: '15px',
                py: '13px',
                textTransform: 'none',
                letterSpacing: '-0.01em',
                '&:hover': { bgcolor: '#1a1a25' },
                '&.Mui-disabled': { bgcolor: 'rgba(10,10,15,0.08)', color: 'rgba(10,10,15,0.3)' },
              }}
            >
              {getButtonLabel()}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <PickToken
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        buttonSource="send"
        tokens={sendableTokens}
        onTokenSelect={(token) => {
          setSendToken(token);
          setPickerOpen(false);
        }}
      />

      {reviewOpen && sendToken && adapter && (
        <SendReview
          open={reviewOpen}
          onClose={handleReviewClose}
          sendToken={sendToken}
          tokenValue={coinAmount.toNumber()}
          fiatValue={fiatAmount.toNumber()}
          address={destination}
          memo={memo}
          sendFn={adapter.send.bind(adapter)}
          estimatedFeeSat={btcEstimatedFeeSat}
          onBtcSendSuccess={handleBtcSendSuccess}
        />
      )}

      {btcTxInfo && (
        <BtcTxStatusModal
          open
          onClose={() => {
            setBtcTxInfo(null);
            onClose();
          }}
          txid={btcTxInfo.txid}
          amountBtc={btcTxInfo.amountBtc}
          destination={btcTxInfo.destination}
          estimatedFeeSat={btcTxInfo.estimatedFeeSat}
        />
      )}
    </>
  );
}
