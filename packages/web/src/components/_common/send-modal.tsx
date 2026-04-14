'use client';

import type { Token } from '@normalfinance/types';

import { useSnackbar } from 'notistack';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';
import { usePersistStore } from '@normalfinance/state';
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { isValidStellarAddress } from '@/utils/stellar-address';
import {
  getMaxAmount,
  getCryptoIconUrl,
  convertCoinToFiat,
  convertFiatToCoin,
  sanitizeAmountInput,
} from '@normalfinance/utils';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Stack,
  Button,
  Dialog,
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

interface SendModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SendModal({ open, onClose }: SendModalProps) {
  const theme = useTheme();
  const { t } = useTranslate('auto');
  const { enqueueSnackbar } = useSnackbar();

  const persist = usePersistStore();
  const tokens = persist.tokenState.tokens;

  const sendableTokens = useMemo(
    () => tokens.filter((tkn) => BigNumber(tkn.balance).gt(0)),
    [tokens]
  );

  const [sendToken, setSendToken] = useState<Token | null>(null);
  const [destination, setDestination] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [amount, setAmount] = useState<string>('0');
  const [isFiatMode, setIsFiatMode] = useState<boolean>(true);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [coinValue, setCoinValue] = useState<number>(0);
  const [fiatValue, setFiatValue] = useState<number>(0);

  const [inputWidth, setInputWidth] = useState<number>(0);
  const spanRef = useRef<HTMLSpanElement>(null);

  // Reset form each time the dialog opens and default-select the highest-balance token
  useEffect(() => {
    if (!open) return;
    setDestination('');
    setMemo('');
    setAmount('0');
    setIsFiatMode(true);
    setShowOptions(false);
    const best = [...sendableTokens].sort((a, b) =>
      BigNumber(b.balance).multipliedBy(b.price).comparedTo(BigNumber(a.balance).multipliedBy(a.price)) ?? 0
    )[0];
    setSendToken(best ?? sendableTokens[0] ?? null);
  }, [open, sendableTokens]);

  useEffect(() => {
    if (sendToken) {
      const amt = BigNumber(amount) || BigNumber(0);
      const _coinValue = isFiatMode ? amt.dividedBy(sendToken.price) : amt;
      const _fiatValue = _coinValue.multipliedBy(sendToken.price);
      setCoinValue(_coinValue.toNumber());
      setFiatValue(_fiatValue.toNumber());
    } else {
      setCoinValue(0);
      setFiatValue(0);
    }
  }, [amount, sendToken, isFiatMode]);

  useEffect(() => {
    if (spanRef.current) {
      setInputWidth(spanRef.current.offsetWidth + 8);
    }
  }, [amount]);

  const coinAmount = useMemo(() => {
    if (!sendToken) return BigNumber(0);
    const amt = BigNumber(amount) || BigNumber(0);
    return isFiatMode ? amt.dividedBy(sendToken.price) : amt;
  }, [amount, sendToken, isFiatMode]);

  const insufficientBalance = sendToken ? BigNumber(sendToken.balance).lt(coinAmount) : false;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(sanitizeAmountInput(e.target.value));
  };

  const handleAmountFocus = () => {
    if (amount === '0') setAmount('');
  };

  const handleAmountBlur = () => {
    if (amount.trim() === '') setAmount('0');
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-') e.preventDefault();
  };

  const toggleAmountMode = () => {
    if (sendToken) {
      const amt = parseFloat(amount) || 0;
      if (amt === 0) {
        setAmount('0');
      } else if (isFiatMode) {
        const coinVal = convertFiatToCoin(amt, BigNumber(sendToken.price));
        setAmount(coinVal.toFixed(sendToken.decimals));
      } else {
        const fiatVal = convertCoinToFiat(BigNumber(amt), BigNumber(sendToken.price));
        setAmount(fiatVal);
      }
    }
    setIsFiatMode((prev) => !prev);
  };

  const getButtonLabel = (): string => {
    if (!sendToken) return 'Select an asset';
    if (destination === '') return 'Enter account';
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return 'Enter an amount';
    if (insufficientBalance) return `Insufficient ${sendToken.symbol}`;
    return 'Review';
  };

  const isReviewReady = getButtonLabel() === 'Review';

  const handleReviewClick = () => {
    if (!sendToken) return;
    if (!isValidStellarAddress(destination)) {
      enqueueSnackbar(t('Invalid destination'), { variant: 'error' });
      return;
    }
    if (destination === persist.wallet.address) {
      enqueueSnackbar(t('Cannot send assets to yourself'), { variant: 'error' });
      return;
    }
    setReviewOpen(true);
  };

  const handleReviewClose = () => {
    setReviewOpen(false);
    // Also close the outer Send dialog when a transaction completes successfully.
    // SendReview closes itself after a successful send, so when reviewOpen goes false,
    // if there was a successful outcome the snackbar is already showing. We clear form
    // state and dismiss the outer dialog.
    onClose();
  };

  const handlePasteDestination = (value: string): boolean => {
    if (!value) return false;
    setDestination(value);
    return true;
  };

  const handlePasteMemo = (value: string): boolean => {
    if (!value) return false;
    setMemo(value);
    return true;
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ p: 2, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" component="div">
              {t('Send crypto')}
            </Typography>
            <IconButton onClick={onClose}>
              <Iconify icon="mingcute:close-line" width={24} />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 2, pt: 1 }}>
          <Stack spacing="2px">
            {/* Amount input */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '130px',
                padding: theme.spacing(2),
                alignItems: 'flex-start',
                borderRadius: '20px 20px 0 0',
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: alpha(theme.palette.grey[500], 0.08),
                overflow: 'hidden',
              }}
            >
              <Typography variant="body2" sx={{ color: theme.palette.text.primary, mb: 0.5 }}>
                {t('Amount')}
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  position: 'relative',
                }}
              >
                {isFiatMode && (
                  <Typography sx={{ color: theme.palette.text.secondary, fontSize: '40px' }}>
                    {t('$')}
                  </Typography>
                )}
                <InputBase
                  type="number"
                  value={amount}
                  onChange={handleInputChange}
                  onFocus={handleAmountFocus}
                  onBlur={handleAmountBlur}
                  onKeyDown={handleAmountKeyDown}
                  sx={{
                    display: 'inline-flex',
                    maxWidth: '100%',
                    width: `${inputWidth}px`,
                    border: 'none',
                    padding: 0,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    color: insufficientBalance
                      ? theme.palette.error.main
                      : amount === '0' || amount === ''
                        ? theme.palette.text.secondary
                        : theme.palette.text.primary,
                    '& input': {
                      textAlign: 'center',
                      padding: 0,
                      fontSize: '40px',
                      fontWeight: 400,
                      lineHeight: '40px',
                    },
                  }}
                  inputProps={{ min: 0 }}
                />
                <span
                  ref={spanRef}
                  style={{
                    fontSize: '40px',
                    fontWeight: 400,
                    lineHeight: '40px',
                    letterSpacing: '0px',
                    visibility: 'hidden',
                    whiteSpace: 'pre',
                    position: 'absolute',
                  }}
                >
                  {amount || '0'}
                </span>
              </Box>
              <Box
                sx={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                {sendToken && isFiatMode ? (
                  <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                    {coinAmount.toFixed(6)} {sendToken.symbol}
                  </Typography>
                ) : sendToken ? (
                  <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                    {fCurrency(BigNumber(sendToken.price).multipliedBy(coinAmount))}
                  </Typography>
                ) : null}
                <Iconify
                  icon="solar:transfer-horizontal-bold-duotone"
                  width={14}
                  sx={{
                    color: theme.palette.text.secondary,
                    cursor: 'pointer',
                    rotate: '-90deg',
                  }}
                  onClick={toggleAmountMode}
                />
              </Box>
            </Box>

            {/* Token selector */}
            <Button
              onClick={() => setPickerOpen(true)}
              sx={{
                display: 'flex',
                flexDirection: 'row',
                gap: 2,
                padding: theme.spacing(2),
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: '0 0 20px 20px',
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: alpha(theme.palette.grey[500], 0.08),
                overflow: 'hidden',
              }}
            >
              {sendToken ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Box
                      component="img"
                      src={sendToken.icon ?? getCryptoIconUrl(sendToken.symbol)}
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                    <Box
                      sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          color: theme.palette.text.primary,
                          textAlign: 'start',
                        }}
                      >
                        {sendToken.symbol}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          color: theme.palette.text.primary,
                          fontSize: '12px',
                          textAlign: 'start',
                        }}
                      >
                        {t('Balance:')}
                        <Box component="span">
                          {' '}
                          {BigNumber(sendToken.balance).toFixed(sendToken.decimals)}
                        </Box>{' '}
                        <Box component="span" sx={{ color: theme.palette.text.secondary }}>
                          {t('(')}
                          {fCurrency(BigNumber(sendToken.balance).multipliedBy(sendToken.price))}
                          {t(')')}
                        </Box>
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: '6px',
                    }}
                  >
                    <Button
                      variant="soft"
                      color="secondary"
                      size="small"
                      sx={{
                        fontWeight: 500,
                        fontSize: '12px',
                        p: 0,
                        height: '24px',
                        minWidth: '36px',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (sendToken) {
                          setAmount(getMaxAmount(sendToken, isFiatMode));
                        }
                      }}
                    >
                      {t('Max')}
                    </Button>
                    <Iconify
                      width={24}
                      icon="eva:arrow-ios-downward-fill"
                      sx={{ color: theme.palette.text.primary }}
                    />
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('Select a token')}
                </Typography>
              )}
            </Button>

            {/* Destination */}
            <Box
              sx={{
                mt: '2px',
                display: 'flex',
                flexDirection: 'column',
                padding: '12px',
                px: '16px',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderRadius: '20px',
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: alpha(theme.palette.grey[500], 0.08),
                overflow: 'hidden',
              }}
            >
              <Typography variant="caption" sx={{ color: theme.palette.text.primary }}>
                {t('To')}
              </Typography>
              <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', gap: 1 }}>
                <InputBase
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="GAD...123"
                  sx={{
                    flex: 1,
                    border: 'none',
                    padding: 0,
                    color:
                      destination === ''
                        ? theme.palette.text.secondary
                        : theme.palette.text.primary,
                  }}
                  inputProps={{
                    style: {
                      fontSize: '14px',
                      fontWeight: 400,
                      lineHeight: '22px',
                    },
                  }}
                />
                <PasteIconButton
                  alert="Successfully pasted destination"
                  onSubmit={handlePasteDestination}
                />
              </Box>
            </Box>

            {/* Memo toggle */}
            <Box sx={{ mt: 1 }}>
              <Button
                size="small"
                color="inherit"
                onClick={() => setShowOptions((prev) => !prev)}
                endIcon={
                  <Iconify
                    icon={
                      showOptions ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'
                    }
                    width={14}
                  />
                }
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                {t('Options')}
              </Button>
            </Box>

            {showOptions && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '12px',
                  px: '16px',
                  alignItems: 'flex-start',
                  borderRadius: '20px',
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: alpha(theme.palette.grey[500], 0.08),
                  overflow: 'hidden',
                }}
              >
                <Typography variant="caption" sx={{ color: theme.palette.text.primary }}>
                  {t('Memo (optional)')}
                </Typography>
                <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', gap: 1 }}>
                  <InputBase
                    type="text"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="abc123"
                    sx={{ flex: 1, border: 'none', padding: 0 }}
                    inputProps={{
                      style: {
                        fontSize: '14px',
                        fontWeight: 400,
                        lineHeight: '22px',
                      },
                    }}
                  />
                  <PasteIconButton alert="Successfully pasted memo" onSubmit={handlePasteMemo} />
                </Box>
              </Box>
            )}

            {/* Main action */}
            <Button
              fullWidth
              variant="soft"
              color="success"
              size="large"
              disabled={!isReviewReady}
              onClick={handleReviewClick}
              sx={{ borderRadius: 2.5, mt: 2 }}
            >
              {t(getButtonLabel())}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Token picker */}
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

      {/* Review + submit */}
      {reviewOpen && sendToken && (
        <SendReview
          open={reviewOpen}
          onClose={handleReviewClose}
          sendToken={sendToken}
          tokenValue={coinValue}
          fiatValue={fiatValue}
          address={destination}
          memo={memo}
        />
      )}
    </>
  );
}
