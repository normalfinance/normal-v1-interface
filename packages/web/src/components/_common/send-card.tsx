import React, { useState, useRef, useEffect } from 'react';
import { Typography, Box, CardProps, Button, InputBase } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Token } from '@/types/token';
import { fCurrency } from '@/utils/format-number';
import { Iconify } from '../iconify';
import PickToken from './pick-token';
import SendReview from './send-review';
import { SwapFeeInfo } from '@/types/swap-fee-info';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { convertCoinToFiat, convertFiatToCoin, getMaxAmount } from '@/utils/conversion-helpers';

interface SendCardProps extends CardProps {
  tokensList?: Token[];
  swapFeeInfo?: SwapFeeInfo;
}

const DEFAULT_DESTINATION = 'Wallet address or ENS name';

const SendCard: React.FC<SendCardProps> = ({ tokensList = [], swapFeeInfo, ...other }) => {
  const theme = useTheme();

  // State declarations...
  const [sendToken, setSendToken] = useState<Token | null>(
    tokensList.length ? tokensList[0] : null
  );
  const [destination, setDestination] = useState<string>(DEFAULT_DESTINATION);
  const [amount, setAmount] = useState<string>('0');
  const [isFiatMode, setIsFiatMode] = useState<boolean>(true);
  const [open, setOpen] = useState<boolean>(false);
  const [activeButton, setActiveButton] = useState<'sell' | 'buy' | 'send' | ''>('');

  // For dynamic width measurement
  const [inputWidth, setInputWidth] = useState<number>(0);
  const spanRef = useRef<HTMLSpanElement>(null);

  // State for review dialog
  const [reviewOpen, setReviewOpen] = useState(false);
  const handleReviewClose = () => setReviewOpen(false);

  const [coinValue, setCoinValue] = useState<number>(0);
  const [fiatValue, setFiatValue] = useState<number>(0);

  useEffect(() => {
    if (sendToken) {
      const amt = parseFloat(amount) || 0;
      // When in fiat mode, the input is in dollars:
      const _coinValue = isFiatMode ? amt / sendToken.pricestatus : amt;
      const _fiatValue = sendToken ? _coinValue * sendToken.pricestatus : 0;
      setCoinValue(_coinValue);
      setFiatValue(_fiatValue);
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
        const coinVal = convertFiatToCoin(amt, sendToken.pricestatus);
        setAmount(coinVal.toFixed(6));
      } else {
        const fiatVal = convertCoinToFiat(amt, sendToken.pricestatus);
        setAmount(fiatVal.toFixed(6));
      }
    }
    setIsFiatMode(!isFiatMode);
  };

  // Calculations and getButtonLabel() ...

  let coinAmount = 0;
  if (sendToken) {
    const amt = parseFloat(amount) || 0;
    coinAmount = isFiatMode ? amt / sendToken.pricestatus : amt;
  }

  const insufficientBalance = sendToken ? coinAmount > sendToken.countstatus : false;

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
      return `Insufficient ${sendToken.shortname}`;
    }
    return 'Send';
  };

  const handleMainButtonClick = () => {
    const label = getButtonLabel();
    if (label === 'Select a token') {
    } else if (label === 'Enter an amount') {
    } else if (label === 'Input wallet address') {
    } else if (label.startsWith('Insufficient')) {
    } else if (label === 'Send') {
      // open a review popup
      setReviewOpen(true);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            height: '278px',
            padding: theme.spacing(2),
            alignItems: 'flex-start',
            borderRadius: '8px 8px 0 0',
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: alpha(theme.palette.grey[500], 0.08),
            overflow: 'hidden',
          }}
        >
          <Box sx={{ height: '82px' }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
              You're sending
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
                $
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
                {coinAmount.toFixed(6)} {sendToken.shortname}
              </Typography>
            ) : sendToken ? (
              <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                {fCurrency(coinAmount * sendToken.pricestatus)}
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
            setActiveButton('send');
            setOpen(true);
          }}
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: 2,
            padding: theme.spacing(2),
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '0 0 8px 8px',
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: alpha(theme.palette.grey[500], 0.08),
            overflow: 'hidden',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Box
              component="img"
              src={sendToken?.url}
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
                {sendToken?.shortname}
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
                Balance: <Box component="span">{sendToken?.countstatus}</Box>{' '}
                <Box component="span" sx={{ color: theme.palette.text.secondary }}>
                  ({fCurrency((sendToken?.countstatus ?? 0) * (sendToken?.pricestatus ?? 0))})
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
              color="success"
              size="small"
              sx={{ fontWeight: 500, fontSize: '12px', p: 0, height: '24px', minWidth: '36px' }}
              onClick={(e) => {
                e.stopPropagation();
                if (sendToken) {
                  setAmount(getMaxAmount(sendToken.countstatus, sendToken.pricestatus, isFiatMode));
                }
              }}
            >
              Max
            </Button>
            <Iconify
              width={24}
              icon="eva:arrow-ios-downward-fill"
              sx={{ color: theme.palette.text.primary }}
            />
          </Box>
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
          borderRadius: '8px',
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.grey[500], 0.08),
          overflow: 'hidden',
        }}
      >
        <Typography variant="caption" sx={{ color: theme.palette.text.primary }}>
          To
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
        <Button
          fullWidth
          variant="soft"
          color="success"
          size="large"
          onClick={handleMainButtonClick}
        >
          {getButtonLabel()}
        </Button>
      </Box>

      {reviewOpen && (
        <SendReview
          open={reviewOpen}
          onClose={handleReviewClose}
          sendToken={sendToken}
          tokenValue={coinValue}
          fiatValue={fiatValue}
          address={destination}
          networkCost={swapFeeInfo?.networkCost ?? 0}
        />
      )}

      {/* Token Picker Popup */}
      <PickToken
        open={open}
        onClose={() => setOpen(false)}
        buttonSource="send"
        tokensList={tokensList}
        onTokenSelect={(token) => {
          setSendToken(token);
          setOpen(false);
        }}
      />
    </Box>
  );
};

export default SendCard;
