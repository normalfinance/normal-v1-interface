import type { CardProps } from '@mui/material';
import type { SendQueryParams } from '@/types/query-params';

import { useSnackbar } from 'notistack';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';
import React, { useRef, useState, useEffect } from 'react';
import { ModalType, type Token } from '@normalfinance/types';
import { useSendToken } from '@/hooks/stellar/use-send-token';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { knownMemoRequirement } from '@/lib/stellar/memo-required-list';
import {
  getMaxAmount,
  getCryptoIconUrl,
  convertCoinToFiat,
  convertFiatToCoin,
  sanitizeAmountInput,
  isValidAccountAddress,
} from '@normalfinance/utils';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Button,
  Divider,
  Accordion,
  InputBase,
  Typography,
  AccordionDetails,
  AccordionSummary,
} from '@mui/material';

import PickToken from './pick-token';
import SendReview from './send-review';
import { WalletGate } from './wallet-gate';
import { Iconify } from '../template/iconify';
import PasteIconButton from '../paste-icon-button';

interface WithdrawCardProps extends CardProps {
  tokens: Token[];
  queryParams?: SendQueryParams;
}

const WithdrawCard: React.FC<WithdrawCardProps> = ({ tokens, queryParams, ...other }) => {
  const theme = useTheme();
  const { t } = useTranslate('auto');
  const { enqueueSnackbar } = useSnackbar();

  const { setModalView } = useAppStore();
  const { send: stellarSend } = useSendToken();

  // State declarations...
  const [sendToken, setSendToken] = useState<Token | null>(tokens.length ? tokens[0] : null);
  const [destination, setDestination] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [amount, setAmount] = useState<string>('0');
  const [isFiatMode, setIsFiatMode] = useState<boolean>(true);
  const [open, setOpen] = useState<boolean>(false);

  // For dynamic width measurement
  const [inputWidth, setInputWidth] = useState<number>(0);
  const spanRef = useRef<HTMLSpanElement>(null);

  // State for review dialog
  const [reviewOpen, setReviewOpen] = useState(false);
  const handleReviewClose = () => setReviewOpen(false);

  const [coinValue, setCoinValue] = useState<number>(0);
  const [fiatValue, setFiatValue] = useState<number>(0);

  useEffect(() => {
    if (queryParams) {
      if (queryParams.token) {
        const foundToken = tokens.find(
          (token) => token.symbol.toLowerCase() === queryParams.token?.toLowerCase()
        );
        if (foundToken) {
          setSendToken(foundToken);
        }
      }

      if (queryParams.amount) {
        setAmount(queryParams.amount);
      }

      if (queryParams.destination) {
        setDestination(queryParams.destination);
      }

      if (queryParams.memo) {
        setDestination(queryParams.memo);
      }
    }
  }, [queryParams, tokens]);

  useEffect(() => {
    if (sendToken) {
      const amt = BigNumber(amount) || BigNumber(0);
      // When in fiat mode, the input is in dollars:
      const _coinValue = isFiatMode ? amt.dividedBy(sendToken.price) : amt;
      const _fiatValue = sendToken ? _coinValue.multipliedBy(sendToken.price) : BigNumber(0);
      setCoinValue(_coinValue.toNumber());
      setFiatValue(_fiatValue.toNumber());
    } else {
      setCoinValue(0);
      setFiatValue(0);
    }
  }, [amount, sendToken, isFiatMode]);

  useEffect(() => {
    if (spanRef.current) {
      // Increase the extra space to account for kerning issues with characters like "."
      setInputWidth(spanRef.current.offsetWidth + 8);
    }
  }, [amount]);

  //prevent "-" ot "," in input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(sanitizeAmountInput(e.target.value));
  };

  // Toggle mode, handle focus/blur, etc...
  const handleAmountFocus = () => {
    if (amount === '0') {
      setAmount('');
    }
  };

  const handleAmountBlur = () => {
    if (amount.trim() === '') {
      setAmount('0');
    }
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
    setIsFiatMode(!isFiatMode);
  };

  // Calculations and getButtonLabel() ...

  let coinAmount = BigNumber(0);
  if (sendToken) {
    const amt = BigNumber(amount) || BigNumber(0);
    coinAmount = isFiatMode ? amt.dividedBy(sendToken.price) : amt;
  }

  const insufficientBalance = sendToken ? BigNumber(sendToken.balance).lt(coinAmount) : false;

  const getButtonLabel = (): string => {
    if (destination === '') {
      return 'Enter account';
    }
    if (!sendToken) {
      return 'Select an asset';
    }
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) {
      return 'Enter an amount';
    }
    if (insufficientBalance) {
      return `Insufficient ${sendToken.symbol}`;
    }
    return 'Send';
  };

  const handleMainButtonClick = () => {
    const label = getButtonLabel();

    if (label === 'Send') {
      if (!isValidAccountAddress(destination)) {
        enqueueSnackbar(t('Invalid destination'), { variant: 'error' });
        return;
      }
      if (destination == persist.wallet.address) {
        enqueueSnackbar(t('Cannot send assets to yourself'), { variant: 'error' });
        return;
      }
      // This flow's memo support is paste-only and not enforced, so an
      // exchange deposit could still go out unattributed — block it and
      // point at the Send dialog, which enforces the memo (finding #48).
      const exchange = knownMemoRequirement(destination);
      if (exchange?.required) {
        enqueueSnackbar(
          t(
            '{{name}} deposits need a memo, which this form does not support. Use the Send button on the portfolio page instead.',
            { name: exchange.name ?? t('This exchange') }
          ),
          { variant: 'error' }
        );
        return;
      }
      setReviewOpen(true);
    }
  };

  const handlePasteDestination = (value: string): boolean => {
    if (!value || value === '') return false;
    setDestination(value);
    return true;
  };

  const handlePasteMemo = (value: string): boolean => {
    if (!value || value === '') return false;
    setMemo(value);
    return true;
  };

  // Main button with multiple states
  const persist = usePersistStore();
  const isSendReady = getButtonLabel() === 'Send';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', width: 1, flex: 1 }} width={1}>
      <Button
        variant="soft"
        color="success"
        fullWidth
        size="large"
        // sx={{ mb: 2 }}
        startIcon={<Iconify icon="solar:wad-of-money-bold" />}
        onClick={() => setModalView(ModalType.OFF_RAMP, true)}
      >
        {t('Withdraw cash')}
      </Button>

      <Divider sx={{ my: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          {t('or')}
        </Typography>
      </Divider>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
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
            {t('Send crypto')}
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
              inputProps={{
                min: 0,
              }}
            />
            {/* Hidden span used for measuring text width */}
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
        {/* Pick token */}
        <Button
          onClick={() => {
            setOpen(true);
          }}
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
          {sendToken && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Box
                  component="img"
                  src={sendToken ? (sendToken.icon ?? getCryptoIconUrl(sendToken.symbol)) : ''}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, color: theme.palette.text.primary, textAlign: 'start' }}
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
                <div>
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
                </div>
                <Iconify
                  width={24}
                  icon="eva:arrow-ios-downward-fill"
                  sx={{ color: theme.palette.text.primary }}
                />
              </Box>
            </>
          )}
        </Button>
      </Box>
      {/* Destination Input for Wallet Address */}
      <Box
        sx={{
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
        <InputBase
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="GAD...123"
          sx={{
            width: '100%',
            border: 'none',
            padding: 0,
            color: destination === '' ? theme.palette.text.secondary : theme.palette.text.primary,
          }}
          inputProps={{
            style: {
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '22px',
            },
          }}
        />
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '6px',
          }}
        >
          <PasteIconButton
            alert="Successfully pasted destination"
            onSubmit={handlePasteDestination}
          />
        </Box>
      </Box>

      {/* Input for Memo (optional) */}
      <Accordion
        disableGutters
        sx={{
          mt: 0,
          backgroundColor: 'transparent !important',
          boxShadow: 'none !important',
          width: '100%',
          padding: '0px !important',
          '::before': { display: 'none' },
        }}
      >
        <AccordionSummary
          expandIcon={
            <Iconify
              icon="eva:arrow-ios-upward-fill"
              width={14}
              sx={{ color: theme.palette.text.secondary, cursor: 'pointer' }}
            />
          }
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              color: theme.palette.text.secondary,
              fontSize: '12px',
            }}
          >
            {t('Options')}
          </Typography>
        </AccordionSummary>

        <AccordionDetails sx={{ p: 0, px: 1 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              padding: '12px',
              px: '16px',
              justifyContent: 'center',
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
            <InputBase
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="abc123"
              sx={{
                width: '100%',
                border: 'none',
                padding: 0,
              }}
              inputProps={{
                style: {
                  fontSize: '14px',
                  fontWeight: 400,
                  lineHeight: '22px',
                },
              }}
            />
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'flex-end',
                gap: '6px',
              }}
            >
              <PasteIconButton alert="Successfully pasted memo" onSubmit={handlePasteMemo} />
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Main Button */}
      <Box>
        <WalletGate buttonText="Login to withdraw" fullWidth variant="soft">
          <Button
            fullWidth
            variant="soft"
            color="secondary"
            size="large"
            disabled={!isSendReady}
            onClick={handleMainButtonClick}
            sx={{ borderRadius: 2.5, mt: 2 }}
          >
            {getButtonLabel()}
          </Button>
        </WalletGate>
      </Box>
      {reviewOpen && sendToken && (
        <SendReview
          open={reviewOpen}
          onClose={handleReviewClose}
          sendToken={sendToken}
          tokenValue={coinValue}
          fiatValue={fiatValue}
          address={destination}
          memo={memo}
          sendFn={(params) =>
            stellarSend({
              destination: params.destination,
              token: params.token,
              amount: params.amount,
              memo: params.memo,
            })
          }
        />
      )}
      {/* Token Picker Popup */}
      <PickToken
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        buttonSource="send"
        tokens={tokens}
        onTokenSelect={(token) => {
          setSendToken(token);
          setOpen(false);
        }}
      />
    </Box>
  );
};

export default WithdrawCard;
