'use client';

import type { Token } from '@normalfinance/types';

import { useSnackbar } from 'notistack';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { Horizon } from '@stellar/stellar-sdk';
import { fCurrency } from '@/utils/format-number';
import { usePersistStore } from '@normalfinance/state';
import { useBtcPortfolio } from '@/hooks/use-btc-portfolio';
import { useSendToken } from '@/hooks/stellar/use-send-token';
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useEthPortfolio, useSolPortfolio } from '@/hooks/use-chain-portfolio';
import {
  getMaxAmount,
  getCryptoIconUrl,
  sanitizeAmountInput,
} from '@normalfinance/utils';

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
    [tokens],
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
          .comparedTo(BigNumber(a.balance).multipliedBy(a.price)) ?? 0,
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
  }, [sendToken, isBtc, isEth, isSol, bitcoinAddress, ethereumAddress, solanaAddress, stellarSend, xlmPrice, enqueueSnackbar]);

  const xlmSubentriesForAdapter = xlmSubentries ?? undefined;

  const spendableBalance = useMemo(() => {
    if (!sendToken || !adapter) return BigNumber(0);
    return adapter.getSpendableBalance(sendToken, xlmSubentriesForAdapter);
  }, [sendToken, adapter, xlmSubentriesForAdapter]);

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
    [destination, adapter],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(sanitizeAmountInput(e.target.value));
  };

  const handleMaxClick = () => {
    if (!sendToken) return;
    if (isFiatMode) {
      setAmount(spendableBalance.multipliedBy(sendToken.price).toFixed(2, BigNumber.ROUND_DOWN));
    } else {
      if (isNative) {
        setAmount(spendableBalance.toFixed(8, BigNumber.ROUND_DOWN));
      } else {
        setAmount(getMaxAmount(sendToken, false, xlmSubentries !== null ? (2 + xlmSubentries) * 0.5 : undefined));
      }
    }
  };

  const toggleMode = () => {
    if (!sendToken || !amount) { setIsFiatMode((p) => !p); return; }
    const n = BigNumber(amount);
    if (n.isNaN() || n.isZero()) { setIsFiatMode((p) => !p); return; }
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
    if (insufficientBalance) return t('Insufficient {{symbol}} balance', { symbol: sendToken.symbol });
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
            <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#0A0A0F', letterSpacing: '-0.01em' }}>
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
                    <Typography sx={{ fontSize: '12px', fontWeight: 500, color: 'rgba(10,10,15,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {t('Asset')}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)' }}>
                      {t('Available:')} {' '}
                      <Box component="span" sx={{ color: '#0A0A0F', fontWeight: 600 }}>
                        {spendableBalance.toFixed(
                          Math.min(sendToken.decimals, isBtc ? 6 : 4),
                          BigNumber.ROUND_DOWN,
                        )} {sendToken.symbol}
                      </Box>
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                      <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#0A0A0F', letterSpacing: '-0.01em' }}>
                        {sendToken.symbol}
                      </Typography>
                      <NetworkBadge network={getAssetNetwork(sendToken)} />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Box
                        component="button"
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleMaxClick(); }}
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
                          cursor: 'pointer',
                          flexShrink: 0,
                          fontFamily: 'inherit',
                          '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
                        }}
                      >
                        MAX
                      </Box>
                      <Iconify icon="eva:chevron-down-fill" width={18} sx={{ color: 'rgba(10,10,15,0.4)' }} />
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
              <Typography sx={{ fontSize: '12px', fontWeight: 500, color: 'rgba(10,10,15,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', mb: '10px' }}>
                {t('Amount')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isFiatMode && (
                  <Typography sx={{ fontSize: '24px', fontWeight: 600, color: 'rgba(10,10,15,0.35)', letterSpacing: '-0.02em', lineHeight: 1 }}>
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
                    '&::-webkit-inner-spin-button, &::-webkit-outer-spin-button': { appearance: 'none' },
                  }}
                />
                {!isFiatMode && sendToken && (
                  <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'rgba(10,10,15,0.45)', flexShrink: 0 }}>
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
                  borderColor: destination && !isAddressValid ? 'error.main' : 'rgba(10,10,15,0.24)',
                },
              }}
            >
              <Typography sx={{ fontSize: '12px', fontWeight: 500, color: 'rgba(10,10,15,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', mb: '10px' }}>
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
                  onSubmit={(v) => { setDestination(v.trim()); return true; }}
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

            {/* Memo — Stellar only */}
            {adapter?.hasMemo && (
              <Box>
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
                  <Iconify icon={showMemo ? 'eva:minus-circle-outline' : 'eva:plus-circle-outline'} width={16} />
                  {showMemo ? t('Remove memo') : t('Add memo (optional)')}
                </Box>
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
                    <Typography sx={{ fontSize: '12px', fontWeight: 500, color: 'rgba(10,10,15,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', mb: '10px' }}>
                      {t('Memo')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Box
                        component="input"
                        type="text"
                        value={memo}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMemo(e.target.value)}
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
                        onSubmit={(v) => { setMemo(v); return true; }}
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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                    <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', fontFamily: '"Geist Mono", "Courier New", monospace' }}>
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
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
                            {t('Minimum reserve')}
                          </Typography>
                          <Tooltip title={t('Stellar requires every account to keep a minimum XLM balance (2 XLM base + 0.5 XLM per trustline/offer). This amount stays in your account and is not sent.')}>
                            <Box sx={{ display: 'flex', color: 'rgba(10,10,15,0.3)', cursor: 'help' }}>
                              <Iconify icon="eva:info-outline" width={13} />
                            </Box>
                          </Tooltip>
                        </Box>
                        <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', fontFamily: '"Geist Mono", "Courier New", monospace' }}>
                          {((2 + xlmSubentries) * 0.5).toFixed(1)} XLM
                        </Typography>
                      </Box>
                    </>
                  )}
                </Stack>
              </Box>
            )}

            {/* BTC fee loading indicator */}
            {isBtc && !feeDisplay && (
              <Box sx={{ p: '12px 14px', borderRadius: '12px', bgcolor: '#FAFAFB', border: '1px solid rgba(10,10,15,0.06)' }}>
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
