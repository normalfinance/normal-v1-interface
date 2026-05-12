'use client';

import type { Token } from '@normalfinance/types';

import { Horizon } from '@stellar/stellar-sdk';
import { useSnackbar } from 'notistack';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';
import { usePersistStore } from '@normalfinance/state';
import { useStellarConfig } from '@/hooks';
import { isValidStellarAddress } from '@/utils/stellar-address';
import React, { useRef, useMemo, useState, useEffect } from 'react';
import {
  getMaxAmount,
  getCryptoIconUrl,
  sanitizeAmountInput,
} from '@normalfinance/utils';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Stack,
  Button,
  Dialog,
  Tooltip,
  Divider,
  InputBase,
  Typography,
  IconButton,
  DialogTitle,
  DialogContent,
} from '@mui/material';

import PickToken from './pick-token';
import SendReview from './send-review';
import { Iconify } from '../template/iconify';
import PasteIconButton from '../paste-icon-button';

// ----------------------------------------------------------------------

const NETWORK_FEE_XLM = 0.0002;

interface SendModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SendModal({ open, onClose }: SendModalProps) {
  const theme = useTheme();
  const { t } = useTranslate('auto');
  const { enqueueSnackbar } = useSnackbar();

  const persist = usePersistStore();
  const config = useStellarConfig();
  const tokens = persist.tokenState.tokens;

  const sendableTokens = useMemo(
    () => tokens.filter((tkn) => BigNumber(tkn.balance).gt(0)),
    [tokens]
  );

  const [sendToken, setSendToken] = useState<Token | null>(null);
  const [destination, setDestination] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isFiatMode, setIsFiatMode] = useState<boolean>(false);
  const [showMemo, setShowMemo] = useState<boolean>(false);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [xlmSubentries, setXlmSubentries] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Reset form each time the dialog opens
  useEffect(() => {
    if (!open) return;
    setDestination('');
    setMemo('');
    setAmount('');
    setIsFiatMode(false);
    setShowMemo(false);
    setXlmSubentries(null);
    const best = [...sendableTokens].sort((a, b) =>
      BigNumber(b.balance).multipliedBy(b.price).comparedTo(BigNumber(a.balance).multipliedBy(a.price)) ?? 0
    )[0];
    setSendToken(best ?? sendableTokens[0] ?? null);
  }, [open]);

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

  const xlmReserve = useMemo(
    () =>
      sendToken?.symbol === 'XLM' && xlmSubentries !== null
        ? (2 + xlmSubentries) * 0.5
        : undefined,
    [sendToken?.symbol, xlmSubentries]
  );

  // Spendable balance: total minus reserve and fee for XLM, full balance for other tokens
  const spendableBalance = useMemo(() => {
    if (!sendToken) return BigNumber(0);
    if (sendToken.symbol === 'XLM' && xlmReserve !== undefined) {
      return BigNumber.max(
        BigNumber(sendToken.balance).minus(xlmReserve).minus(NETWORK_FEE_XLM),
        0
      );
    }
    return BigNumber(sendToken.balance);
  }, [sendToken, xlmReserve]);

  // Parse the entered amount into coin units
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

  const xlmPrice = useMemo(
    () => BigNumber(tokens.find((t) => t.symbol === 'XLM')?.price ?? 0),
    [tokens]
  );

  const feeFiat = useMemo(
    () => BigNumber(NETWORK_FEE_XLM).multipliedBy(xlmPrice),
    [xlmPrice]
  );

  const insufficientBalance = coinAmount.gt(0) && spendableBalance.lt(coinAmount);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(sanitizeAmountInput(e.target.value));
  };

  const handleMaxClick = () => {
    if (!sendToken) return;
    if (isFiatMode) {
      setAmount(spendableBalance.multipliedBy(sendToken.price).toFixed(2, BigNumber.ROUND_DOWN));
    } else {
      setAmount(getMaxAmount(sendToken, false, xlmReserve));
    }
  };

  const toggleMode = () => {
    if (!sendToken || !amount) {
      setIsFiatMode((prev) => !prev);
      return;
    }
    const n = BigNumber(amount);
    if (n.isNaN() || n.isZero()) {
      setIsFiatMode((prev) => !prev);
      return;
    }
    if (isFiatMode) {
      setAmount(coinAmount.toFixed(sendToken.decimals));
    } else {
      setAmount(fiatAmount.toFixed(2));
    }
    setIsFiatMode((prev) => !prev);
  };

  const getButtonLabel = (): string => {
    if (!sendToken) return 'Select an asset';
    if (!destination) return 'Enter destination address';
    if (!isValidStellarAddress(destination)) return 'Invalid destination address';
    if (!amount || coinAmount.isZero()) return 'Enter an amount';
    if (insufficientBalance) return `Insufficient ${sendToken.symbol} balance`;
    return 'Review transaction';
  };

  const isReviewReady = getButtonLabel() === 'Review transaction';

  const handleReviewClick = () => {
    if (!sendToken) return;
    if (destination === persist.wallet.address) {
      enqueueSnackbar(t('Cannot send to your own address'), { variant: 'error' });
      return;
    }
    setReviewOpen(true);
  };

  const handleReviewClose = () => {
    setReviewOpen(false);
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ px: 3, pt: 3, pb: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{t('Send')}</Typography>
            <IconButton onClick={onClose} size="small">
              <Iconify icon="mingcute:close-line" width={20} />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: 3, pt: 2, pb: 3 }}>
          <Stack spacing={2}>
            {/* Asset + available balance */}
            <Box
              onClick={() => setPickerOpen(true)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1.5,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                cursor: 'pointer',
                '&:hover': { bgcolor: alpha(theme.palette.grey[500], 0.06) },
              }}
            >
              {sendToken ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      component="img"
                      src={sendToken.icon ?? getCryptoIconUrl(sendToken.symbol)}
                      sx={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <Box>
                      <Typography variant="subtitle2">{sendToken.symbol}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('Available:')}{' '}
                        <Box component="span" fontWeight={600} color="text.primary">
                          {spendableBalance.toFixed(Math.min(sendToken.decimals, 4), BigNumber.ROUND_DOWN)} {sendToken.symbol}
                        </Box>
                        {' '}
                        <Box component="span" color="text.disabled">
                          ({fCurrency(spendableBalance.multipliedBy(sendToken.price))})
                        </Box>
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      variant="soft"
                      color="primary"
                      size="small"
                      sx={{ minWidth: 44, height: 26, fontSize: 11, fontWeight: 700, px: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMaxClick();
                      }}
                    >
                      {t('MAX')}
                    </Button>
                    <Iconify icon="eva:chevron-down-fill" width={18} color="text.secondary" />
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('Select asset')}
                </Typography>
              )}
            </Box>

            {/* Amount input */}
            <Box
              sx={{
                px: 2,
                py: 2,
                borderRadius: 2,
                border: `1px solid ${insufficientBalance ? theme.palette.error.main : theme.palette.divider}`,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                {t('Amount')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isFiatMode && (
                  <Typography variant="h5" color="text.secondary" sx={{ lineHeight: 1 }}>
                    $
                  </Typography>
                )}
                <InputBase
                  inputRef={inputRef}
                  type="number"
                  value={amount}
                  onChange={handleInputChange}
                  placeholder="0"
                  onKeyDown={(e) => e.key === '-' && e.preventDefault()}
                  sx={{
                    flex: 1,
                    '& input': {
                      fontSize: '28px',
                      fontWeight: 600,
                      lineHeight: 1.2,
                      color: insufficientBalance ? theme.palette.error.main : theme.palette.text.primary,
                      p: 0,
                    },
                  }}
                  inputProps={{ min: 0 }}
                />
                {!isFiatMode && sendToken && (
                  <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600, flexShrink: 0 }}>
                    {sendToken.symbol}
                  </Typography>
                )}
                <Tooltip title={t('Toggle USD / crypto')}>
                  <IconButton size="small" onClick={toggleMode} sx={{ ml: 0.5 }}>
                    <Iconify icon="solar:transfer-vertical-bold-duotone" width={18} />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Converted value */}
              <Typography variant="caption" color={insufficientBalance ? 'error' : 'text.secondary'} sx={{ mt: 0.5, display: 'block' }}>
                {insufficientBalance
                  ? t('Exceeds available balance')
                  : sendToken && coinAmount.gt(0)
                  ? isFiatMode
                    ? `≈ ${coinAmount.toFixed(4)} ${sendToken.symbol}`
                    : `≈ ${fCurrency(fiatAmount)}`
                  : t('Enter amount above')}
              </Typography>
            </Box>

            {/* Destination */}
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderRadius: 2,
                border: `1px solid ${
                  destination && !isValidStellarAddress(destination)
                    ? theme.palette.error.main
                    : theme.palette.divider
                }`,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                {t('To')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InputBase
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value.trim())}
                  placeholder="G…"
                  sx={{
                    flex: 1,
                    '& input': { fontSize: '14px', p: 0, fontFamily: 'monospace' },
                  }}
                />
                <PasteIconButton
                  alert="Destination pasted"
                  onSubmit={(v) => { setDestination(v.trim()); return true; }}
                />
              </Box>
              {destination && !isValidStellarAddress(destination) && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                  {t('Not a valid Stellar address')}
                </Typography>
              )}
            </Box>

            {/* Memo toggle */}
            <Box>
              <Button
                size="small"
                color="inherit"
                startIcon={<Iconify icon={showMemo ? 'eva:minus-circle-outline' : 'eva:plus-circle-outline'} width={16} />}
                onClick={() => setShowMemo((p) => !p)}
                sx={{ color: 'text.secondary', fontSize: 12 }}
              >
                {showMemo ? t('Remove memo') : t('Add memo (optional)')}
              </Button>
              {showMemo && (
                <Box
                  sx={{
                    mt: 1,
                    px: 2,
                    py: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: alpha(theme.palette.grey[500], 0.04),
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    {t('Memo')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InputBase
                      type="text"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      placeholder={t('Exchange ID, note…')}
                      sx={{ flex: 1, '& input': { fontSize: '14px', p: 0 } }}
                    />
                    <PasteIconButton alert="Memo pasted" onSubmit={(v) => { setMemo(v); return true; }} />
                  </Box>
                </Box>
              )}
            </Box>

            {/* Fee + reserve info */}
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Stack spacing={0.75}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('Network fee')}
                    </Typography>
                    <Tooltip title={t('Stellar network fee paid to validators. Cannot be changed.')}>
                      <Iconify icon="eva:info-outline" width={14} sx={{ color: 'text.disabled', cursor: 'help' }} />
                    </Tooltip>
                  </Box>
                  <Typography variant="caption" color="text.primary" fontWeight={600}>
                    {NETWORK_FEE_XLM} XLM{' '}
                    <Box component="span" color="text.secondary" fontWeight={400}>
                      ({fCurrency(feeFiat)})
                    </Box>
                  </Typography>
                </Box>

                {sendToken?.symbol === 'XLM' && xlmReserve !== undefined && (
                  <>
                    <Divider sx={{ my: 0.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {t('Minimum reserve')}
                        </Typography>
                        <Tooltip title={t('Stellar requires every account to keep a minimum XLM balance (2 XLM base + 0.5 XLM per trustline/offer). This amount stays in your account and is not sent.')}>
                          <Iconify icon="eva:info-outline" width={14} sx={{ color: 'text.disabled', cursor: 'help' }} />
                        </Tooltip>
                      </Box>
                      <Typography variant="caption" color="text.primary" fontWeight={600}>
                        {xlmReserve.toFixed(1)} XLM
                      </Typography>
                    </Box>
                  </>
                )}
              </Stack>
            </Box>

            {/* CTA */}
            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              disabled={!isReviewReady}
              onClick={handleReviewClick}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              {t(getButtonLabel())}
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

      {reviewOpen && sendToken && (
        <SendReview
          open={reviewOpen}
          onClose={handleReviewClose}
          sendToken={sendToken}
          tokenValue={coinAmount.toNumber()}
          fiatValue={fiatAmount.toNumber()}
          address={destination}
          memo={memo}
        />
      )}
    </>
  );
}
