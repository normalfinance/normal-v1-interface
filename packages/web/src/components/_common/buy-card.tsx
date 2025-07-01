import type { Token } from '@/types/token';
import type { CardProps } from '@mui/material';

import React, { useRef, useState, useEffect } from 'react';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { convertFiatToCoin } from '@/utils/conversion-helpers';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Stack, Button, InputBase, Typography } from '@mui/material';

import PickToken from './pick-token';
import CheckoutDialog from './checkout-dialog';
import SwapSendPopupButton from './swap-send-popup-button';
import SwapSendEmptyPopupButton from './swap-send-empty-popup-button';

interface BuyCardProps extends CardProps {
  tokensList?: Token[];
  cashBalance?: number;
}

export interface QuickAmountButton {
  amount: number;
}

const QUICK_BUTTONS: QuickAmountButton[] = [
  {
    amount: 100,
  },
  {
    amount: 300,
  },
  {
    amount: 1000,
  },
];

const BuyCard: React.FC<BuyCardProps> = ({ tokensList = [], cashBalance, ...other }) => {
  const theme = useTheme();

  // State declarations...
  const [buyToken, setBuyToken] = useState<Token | null>(tokensList.length ? tokensList[0] : null);
  const [amount, setAmount] = useState<string>('0');
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  // For dynamic width measurement
  const [inputWidth, setInputWidth] = useState<number>(0);
  const spanRef = useRef<HTMLSpanElement>(null);

  const fiatValue = parseFloat(amount) || 0;
  const buyableAmt =
    buyToken && fiatValue > 0 ? convertFiatToCoin(fiatValue, buyToken.pricestatus) : 0;

  const balance = cashBalance ?? 0;
  const insufficient = fiatValue > balance;

  // State for review dialog
  const [reviewOpen, setReviewOpen] = useState(false);
  const handleReviewClose = () => setReviewOpen(false);

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

  const getButtonLabel = (): string => {
    if (!buyToken) {
      return 'Select a token';
    }
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) {
      return 'Enter an amount';
    }
    if (insufficient) {
      return 'Insufficient balance';
    }

    return 'Buy';
  };

  const handleMainButtonClick = () => {
    const label = getButtonLabel();
    if (label === 'Select a token') {
    } else if (label === 'Enter an amount') {
    } else if (label === 'Input wallet address') {
    } else if (label.startsWith('Insufficient')) {
    } else if (label === 'Buy') {
      // open a review popup
      setReviewOpen(true);
    }
  };

  const handleTokenSelect = (token: Token) => {
    setBuyToken(token);
  };

  return (
    <Stack sx={{ gap: '2px' }}>
      <Stack sx={{ gap: '1px' }}>
        <Stack
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            height: '400px',
            padding: theme.spacing(2),
            alignItems: 'flex-start',
            borderRadius: '8px',
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: alpha(theme.palette.grey[500], 0.08),
            overflow: 'hidden',
          }}
        >
          <Box sx={{ height: '82px' }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
              You're buying
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
            <Typography sx={{ color: theme.palette.text.secondary, fontSize: '64px' }}>
              $
            </Typography>
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
                color: insufficient
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
          {buyToken ? (
            <Box
              sx={{
                display: 'flex',
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              mt={1}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <SwapSendPopupButton
                  imgUrl={buyToken.url}
                  label={buyToken.shortname}
                  onClick={() => {
                    handleOpen();
                  }}
                />
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      height: '100%',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        color: theme.palette.text.secondary,
                        fontSize: '12px',
                      }}
                    >
                      {buyableAmt.toFixed(6)}{' '}
                      <Box
                        component="span"
                        sx={{
                          color: theme.palette.text.primary,
                        }}
                      >
                        {buyToken?.shortname}
                      </Box>
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          ) : (
            <SwapSendEmptyPopupButton
              label="Select token"
              onClick={() => {
                handleOpen();
              }}
            />
          )}

          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 2, justifyContent: 'center', width: '100%' }}
          >
            {QUICK_BUTTONS.map(({ amount: quick }) => (
              <Button
                key={quick}
                variant="outlined"
                onClick={() => setAmount(String(quick))}
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: alpha(theme.palette.grey[500], 0.08),
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.grey[500], 0.16),
                    border: `1px solid ${theme.palette.divider}`,
                  },
                  gap: 1,
                  borderRadius: '32px',
                  px: '12px',
                  py: '6px',
                  minWidth: 0, // keep pill-shaped
                  fontSize: '12px',
                }}
              >
                ${quick}
              </Button>
            ))}
          </Stack>
        </Stack>
        <Box>
          <Button
            fullWidth
            variant="soft"
            color="success"
            size="large"
            onClick={handleMainButtonClick}
            disabled={getButtonLabel() !== 'Buy'}
          >
            {getButtonLabel()}
          </Button>
        </Box>
        <PickToken
          open={open}
          onClose={handleClose}
          tokens={tokensList}
          onTokenSelect={handleTokenSelect}
        />

        {reviewOpen && (
          <CheckoutDialog
            open={reviewOpen}
            token={buyToken?.shortname ?? 'USDC'}
            amount={amount}
            onClose={handleReviewClose}
          />
        )}
      </Stack>
    </Stack>
  );
};

export default BuyCard;
