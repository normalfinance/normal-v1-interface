import type { CardProps } from '@mui/material';
import type { Token } from '@normalfinance/types';
import type { SendQueryParams } from '@/types/query-params';

import { useSnackbar } from 'notistack';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';
import { usePersistStore } from '@normalfinance/state';
import React, { useRef, useState, useEffect } from 'react';
import {
  getMaxAmount,
  getCryptoIconUrl,
  convertCoinToFiat,
  convertFiatToCoin,
  sanitizeAmountInput,
  isValidStellarAddress,
} from '@normalfinance/utils';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Button, InputBase, Typography } from '@mui/material';

import PickToken from './pick-token';
import SendReview from './send-review';
import { WalletGate } from './wallet-gate';
import { Iconify } from '../template/iconify';

interface SendCardProps extends CardProps {
  tokens: Token[];
  networkCost?: number;
  queryParams?: SendQueryParams;
}

const DEFAULT_DESTINATION = 'Wallet address';

const SendCard: React.FC<SendCardProps> = ({ tokens, networkCost, queryParams, ...other }) => {
  const theme = useTheme();
  const { t } = useTranslate('auto');
  const { enqueueSnackbar } = useSnackbar();

  // State declarations...
  const [sendToken, setSendToken] = useState<Token | null>(tokens.length ? tokens[0] : null);
  const [destination, setDestination] = useState<string>(DEFAULT_DESTINATION);
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
    if (destination === DEFAULT_DESTINATION) {
      return 'Input wallet address';
    }
    if (!sendToken) {
      return 'Select a token';
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
      if (!isValidStellarAddress(destination)) {
        enqueueSnackbar(t('Invalid Stellar address'), { variant: 'error' });
        return;
      }
      if (destination == persist.wallet.address) {
        enqueueSnackbar(t('Cannot send tokens to yourself'), { variant: 'error' });
        return;
      }
      setReviewOpen(true);
    }
  };

  // Main button with multiple states
  const persist = usePersistStore();
  const isConnected = !!persist.wallet.address;
  const isSendReady = getButtonLabel() === 'Send';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', width: 1 }} width={1}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            height: '278px',
            padding: theme.spacing(2),
            alignItems: 'flex-start',
            borderRadius: '20px 20px 0 0',
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: alpha(theme.palette.grey[500], 0.08),
            overflow: 'hidden',
          }}
        >
          <Box sx={{ height: '82px' }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
              {t("You're sending")}
            </Typography>
          </Box>
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
              <Typography sx={{ color: theme.palette.text.secondary, fontSize: '64px' }}>
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
                  fontSize: '64px',
                  fontWeight: 400,
                  lineHeight: '48px',
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
                fontSize: '64px',
                fontWeight: 400,
                lineHeight: '48px',
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
                  src={sendToken.icon ? getCryptoIconUrl(sendToken.symbol) : ''}
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
                <Button
                  variant="soft"
                  color="secondary"
                  size="small"
                  sx={{ fontWeight: 500, fontSize: '12px', p: 0, height: '24px', minWidth: '36px' }}
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
          )}
        </Button>
      </Box>
      {/* Destination Input for Wallet Address/ENS */}
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
          {t('To')}
        </Typography>
        <InputBase
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          onFocus={() => {
            if (destination === DEFAULT_DESTINATION) {
              setDestination('');
            }
          }}
          onBlur={() => {
            if (destination.trim() === '') {
              setDestination(DEFAULT_DESTINATION);
            }
          }}
          sx={{
            width: '100%',
            border: 'none',
            padding: 0,
            color:
              destination === DEFAULT_DESTINATION
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
      </Box>
      {/* Main Button */}
      <Box>
        {isConnected ? (
          <Button
            fullWidth
            variant="soft"
            color="secondary"
            size="large"
            disabled={!isSendReady}
            onClick={handleMainButtonClick}
            sx={{ borderRadius: 2.5 }}
          >
            {getButtonLabel()}
          </Button>
        ) : (
          <WalletGate buttonText="Connect wallet to Send" fullWidth variant="soft">
            {null}
          </WalletGate>
        )}
      </Box>
      {reviewOpen && (
        <SendReview
          open={reviewOpen}
          onClose={handleReviewClose}
          sendToken={sendToken}
          tokenValue={coinValue}
          fiatValue={fiatValue}
          address={destination}
          networkCost={networkCost ?? 0}
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

export default SendCard;
