import type { Token } from '@/types/token';
import type { CardProps } from '@mui/material';
import type { SwapFeeInfo } from '@/types/swap-fee-info';

import { CONFIG } from '@/global-config';
import { fCurrency } from '@/utils/format-number';
import React, { useState, useEffect } from 'react';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { getConversionText } from '@/utils/conversion-helpers';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Button, InputBase, Typography } from '@mui/material';

import { Iconify } from 'src/components/iconify';

import PickToken from './pick-token';
import SwapReview from './swap-review';
import { useConfetti } from '../confetti';
import FeeInfoAccordion from './fee-info-accordion';
import SwapSendPopupButton from './swap-send-popup-button';
import SwapSendEmptyPopupButton from './swap-send-empty-popup-button';

interface SwapCardProps extends CardProps {
  tokensList?: Token[];
  swapFeeInfo?: SwapFeeInfo;
}

const SwapCard: React.FC<SwapCardProps> = ({ tokensList = [], swapFeeInfo, ...other }) => {
  const theme = useTheme();
  const { showConfetti } = useConfetti();

  //For swap simulation purposes we make a copy of our list
  const [localTokenList, setLocalTokenList] = useState(CONFIG.tokenList);
  // Add a state for swap simulation
  const [isSwapping, setIsSwapping] = useState(false);
  //simulate the swap
  const simulateSwap = () => {
    if (!sellToken || !buyToken) return;

    const sellVal = parseFloat(amount) || 0;
    const soldDollarValue = sellVal * sellToken.pricestatus;
    const buyVal = soldDollarValue / buyToken.pricestatus;

    setLocalTokenList((prevTokens) => {
      console.log('prevTokens:', prevTokens);
      const newTokens = prevTokens.map((token) => {
        if (token.id === sellToken.id) {
          const newCount = token.countstatus - sellVal;
          return {
            ...token,
            countstatus: newCount,
            owned: newCount > 0,
          };
        }
        if (token.id === buyToken.id) {
          const newCount = token.countstatus + buyVal;
          return {
            ...token,
            countstatus: newCount,
            owned: newCount > 0,
          };
        }
        return token;
      });
      console.log('newTokens:', newTokens);
      const updatedSellToken = newTokens.find((token) => token.id === sellToken.id) || null;
      const updatedBuyToken = newTokens.find((token) => token.id === buyToken.id) || null;
      setSellToken(updatedSellToken);
      setBuyToken(updatedBuyToken);
      //set amount to 0
      setAmount('0');

      return newTokens;
    });
  };

  // 1) States for tokens, default sell token is first in the list
  const [sellToken, setSellToken] = useState<Token | null>(
    localTokenList.length ? localTokenList[0] : null
  );
  const [buyToken, setBuyToken] = useState<Token | null>(null);

  // 2) State for the user’s sell amount
  const [amount, setAmount] = useState<string>('0');

  // 3) Popup states for picking tokens
  const [open, setOpen] = useState(false);
  const [activeButton, setActiveButton] = useState<'sell' | 'buy' | ''>('');

  // 4) State for review dialog
  const [reviewOpen, setReviewOpen] = useState(false);
  const handleReviewClose = () => setReviewOpen(false);

  // 4) Quote states
  const [isLoading, setIsLoading] = useState(false);
  const [quoteFetched, setQuoteFetched] = useState(false);
  const [insufficientBalance, setInsufficientBalance] = useState(false);

  // Compute the fiat value for the user’s sell input
  const sellVal = parseFloat(amount) || 0;
  const sellFiatValue = sellToken && sellVal > 0 ? sellVal * sellToken.pricestatus : 0;

  // 5) Example of how much buyToken the user might get
  const [buyAmount, setBuyAmount] = useState<number>(0);

  // 6) Open/close the token picker
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  // 7) Auto-fetch quote whenever relevant fields change: sellToken, buyToken, amount
  useEffect(() => {
    // Clear old quote state each time we start a new calculation
    setIsLoading(false);
    setQuoteFetched(false);
    setInsufficientBalance(false);
    setBuyAmount(0);

    // Make sure we have both tokens
    if (!sellToken || !buyToken) return;

    // If user hasn't typed anything or typed 0
    if (!amount || sellVal <= 0) {
      return;
    }

    // Start “fetching” quote
    setIsLoading(true);

    // Simulate an async fetch with a 1s delay
    const timer = setTimeout(() => {
      setIsLoading(false);
      setQuoteFetched(true);

      const potentialBuyAmount = sellVal * (sellToken.pricestatus / buyToken.pricestatus);
      setBuyAmount(potentialBuyAmount);

      if (sellVal > sellToken.countstatus) {
        setInsufficientBalance(true);
      }
    }, 1000);

    // Cleanup if user changes input quickly
    return () => clearTimeout(timer);
  }, [sellToken, buyToken, amount, sellVal]);

  // 8) handle input changes, dont allow negative numbers as input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(sanitizeAmountInput(e.target.value));
  };

  const handleFocus = () => {
    if (amount === '0') setAmount('');
  };

  const handleBlur = () => {
    if (amount === '') setAmount('0');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-') e.preventDefault();
  };

  // 9) handle token selection from popup, are we picking a sell token or a buy token?
  const handleTokenSelect = (token: Token) => {
    if (activeButton === 'sell') {
      if (buyToken && buyToken.id === token.id) {
        setBuyToken(null);
      }
      setSellToken(token);
    } else if (activeButton === 'buy') {
      if (sellToken && sellToken.id === token.id) {
        setSellToken(null);
      }
      setBuyToken(token);
    }
  };

  // Function to invert tokens and amounts
  const handleInvertTokens = () => {
    if (!sellToken || !buyToken) return;

    const oldSellToken = sellToken;
    const oldBuyToken = buyToken;
    const oldBuyAmount = buyAmount;

    // Swap tokens
    setSellToken(oldBuyToken);
    setBuyToken(oldSellToken);

    // Swap amounts: set the input to reflect the old calculated buy amount
    const newTypedAmount = oldBuyAmount > 0 ? oldBuyAmount.toFixed(6).replace(',', '.') : '0';
    setAmount(newTypedAmount);

    // Reset quote states
    setIsLoading(false);
    setQuoteFetched(false);
    setInsufficientBalance(false);
    setBuyAmount(0);
  };

  // 10) Derive the main button’s label
  const getButtonLabel = (): string => {
    if (isSwapping) {
      return 'Finalizing swap...';
    }
    if (!sellToken || !buyToken) {
      return 'Select a token';
    }
    if (sellVal <= 0) {
      return 'Enter an amount';
    }
    if (isLoading) {
      return 'Finalizing quote...';
    }
    if (quoteFetched) {
      if (insufficientBalance) {
        return `Insufficient ${sellToken.shortname}`;
      }
      return 'Review';
    }
    return 'Enter an amount';
  };

  // Different button states have different actions
  const handleMainButtonClick = () => {
    const label = getButtonLabel();
    if (label === 'Select a token') {
    } else if (label === 'Enter an amount') {
    } else if (label === 'Finalizing quote...') {
    } else if (label.startsWith('Insufficient')) {
    } else if (label === 'Review') {
      // open a review popup
      setReviewOpen(true);
    }
  };

  // Max the sell token
  const handleMaxClick = () => {
    if (sellToken) {
      setAmount(sellToken.countstatus.toString());
    }
  };

  const handleSubmit = () => {
    handleReviewClose();

    setIsSwapping(true);
    // Simulate a 1s delay before performing the swap
    setTimeout(() => {
      simulateSwap();
      showConfetti();
      setIsSwapping(false);
    }, 1000);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {/* Invert tokens button in the middle */}
        <Box
          onClick={handleInvertTokens}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '44px',
            height: '44px',
            transform: 'translate(-50%, -50%)',
            borderRadius: '6px',
            overflow: 'hidden',
            zIndex: 2,
            cursor: 'pointer',
            padding: '4px',
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: '100%',
              borderRadius: 'inherit',
              backgroundColor:
                theme.palette.mode === 'light' ? theme.palette.grey[300] : theme.palette.grey[900],
              transition: 'background-color 0.3s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': {
                backgroundColor:
                  theme.palette.mode === 'light'
                    ? theme.palette.grey[400]
                    : theme.palette.grey[700],
              },
            }}
          >
            <Iconify
              width={24}
              icon="eva:arrow-downward-fill"
              sx={{
                color:
                  theme.palette.mode === 'light'
                    ? theme.palette.text.primary
                    : theme.palette.common.white,
              }}
            />
          </Box>
        </Box>

        {/* SELL Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: 2,
            height: '160px',
            padding: theme.spacing(2),
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderRadius: '8px',
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: alpha(theme.palette.grey[500], 0.08),
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexGrow: 1,
              minWidth: 0,
              alignItems: 'flex-start',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                flexGrow: 1,
                minWidth: 0,
              }}
            >
              <Typography variant="body1" noWrap textAlign="left">
                Sell
              </Typography>
              <InputBase
                type="number"
                value={amount}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                inputProps={{
                  min: 0,
                  style: {
                    fontSize: 'var(--h3-size, 32px)',
                    fontStyle: 'normal',
                    fontWeight: 'var(--h3-weight, 700)',
                    lineHeight: 'var(--h3-line-height, 48px)',
                    letterSpacing: 'var(--h3-letter-spacing, 0px)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'clip',
                  },
                }}
                sx={{
                  width: '100%',
                  border: 'none',
                  padding: 0,
                  color: insufficientBalance
                    ? theme.palette.error.main
                    : amount === '0' || amount === ''
                      ? theme.palette.text.secondary
                      : theme.palette.text.primary,
                  flexGrow: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'clip',
                  whiteSpace: 'nowrap',
                }}
              />
              <Typography
                noWrap
                sx={{
                  fontSize: 'var(--components-nav-item-size, 14px)',
                  fontStyle: 'normal',
                  fontWeight: 'var(--components-nav-item-weight, 500)',
                  lineHeight: 'var(--components-nav-item-line-height, 22px)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'clip',
                  minWidth: 0,
                  textAlign: 'left',
                }}
              >
                {`${fCurrency(sellFiatValue)}`}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-end',
              height: '128px',
              overflow: 'hidden',
            }}
          >
            {sellToken ? (
              <Box
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}
              >
                <SwapSendPopupButton
                  imgUrl={sellToken.logo ?? sellToken.url}
                  label={sellToken.shortname}
                  onClick={() => {
                    setActiveButton('sell');
                    handleOpen();
                  }}
                />
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-end',
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
                        color: insufficientBalance
                          ? theme.palette.error.main
                          : theme.palette.text.secondary,
                        fontSize: '12px',
                      }}
                    >
                      {sellToken.countstatus.toFixed(6)}{' '}
                      <Box
                        component="span"
                        sx={{
                          color: insufficientBalance
                            ? theme.palette.error.main
                            : theme.palette.text.primary,
                        }}
                      >
                        {sellToken?.shortname}
                      </Box>
                    </Typography>
                  </Box>
                  <Button
                    variant="soft"
                    color="success"
                    size="small"
                    onClick={handleMaxClick}
                    disabled={isLoading}
                    sx={{
                      fontWeight: 500,
                      fontSize: '12px',
                      p: 0,
                      height: '24px',
                      minWidth: '36px',
                    }}
                  >
                    Max
                  </Button>
                </Box>
              </Box>
            ) : (
              <SwapSendEmptyPopupButton
                label="Select token"
                onClick={() => {
                  setActiveButton('sell');
                  handleOpen();
                }}
              />
            )}
          </Box>
        </Box>

        {/* BUY Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: 2,
            height: '160px',
            padding: theme.spacing(2),
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '8px',
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              minWidth: 0,
              overflow: 'hidden',
              gap: 2,
            }}
          >
            <Typography variant="body1" noWrap textAlign="left">
              Buy
            </Typography>

            <Box
              sx={{
                maxWidth: '100%',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'flex-start',
              }}
            >
              <Typography
                sx={{
                  display: 'inline-block',
                  fontSize: 'var(--h3-size, 32px)',
                  fontStyle: 'normal',
                  fontWeight: 'var(--h3-weight, 700)',
                  lineHeight: 'var(--h3-line-height, 48px)',
                  letterSpacing: 'var(--h3-letter-spacing, 0px)',
                  textAlign: 'left',
                  color: !quoteFetched ? theme.palette.text.secondary : theme.palette.text.primary,
                }}
              >
                {quoteFetched && buyToken ? buyAmount.toFixed(6) : 0}
              </Typography>
            </Box>

            <Typography
              sx={{
                fontSize: 'var(--components-nav-item-size, 14px)',
                fontStyle: 'normal',
                fontWeight: 'var(--components-nav-item-weight, 500)',
                lineHeight: 'var(--components-nav-item-line-height, 22px)',
                opacity: quoteFetched && buyToken ? 1 : 0,
                whiteSpace: 'nowrap',
                overflow: 'visible',
                textAlign: 'left',
              }}
            >
              {buyToken ? `${fCurrency(buyToken.pricestatus * buyAmount)}` : '$0'}
            </Typography>
          </Box>

          <Box
            sx={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-end',
              height: '128px',
              overflow: 'hidden',
            }}
          >
            {buyToken ? (
              <SwapSendPopupButton
                imgUrl={buyToken.logo ?? buyToken.url}
                label={buyToken.shortname}
                onClick={() => {
                  setActiveButton('buy');
                  handleOpen();
                }}
              />
            ) : (
              <SwapSendEmptyPopupButton
                label="Select token"
                onClick={() => {
                  setActiveButton('buy');
                  handleOpen();
                }}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* Main button with multiple states */}
      <Box>
        <Button
          fullWidth
          variant="soft"
          color="success"
          size="large"
          onClick={handleMainButtonClick}
          disabled={isLoading || isSwapping}
        >
          {getButtonLabel()}
        </Button>
      </Box>

      {/* Additional box with fee info */}
      {quoteFetched && !isLoading && (
        <FeeInfoAccordion
          conversionText={sellToken && buyToken ? getConversionText(sellToken, buyToken) : ''}
          insufficientBalance={insufficientBalance}
          sellToken={sellToken || undefined}
          swapFeeInfo={swapFeeInfo}
          sellFiatValue={sellFiatValue}
        />
      )}

      {reviewOpen && (
        <SwapReview
          open={reviewOpen}
          onClose={handleReviewClose}
          sellToken={sellToken!}
          buyToken={buyToken!}
          sellAmount={amount}
          buyAmount={buyAmount}
          feePercentage={swapFeeInfo?.feePercentage ?? 0}
          networkCost={swapFeeInfo?.networkCost ?? 0}
          priceImpact={swapFeeInfo?.priceImpact ?? 0}
          maxSlippage={swapFeeInfo?.maxSlippage ?? 0}
          sellFiatValue={sellFiatValue}
          onSubmit={handleSubmit}
        />
      )}

      {/* Token Picker Popup */}
      <PickToken
        open={open}
        onClose={handleClose}
        buttonSource={activeButton}
        tokensList={localTokenList}
        onTokenSelect={handleTokenSelect}
      />
    </Box>
  );
};

export default SwapCard;
