import type { CardProps } from '@mui/material';
import type { SwapFeeInfo } from '@/types/swap-fee-info';
import type { SwapQueryParams } from '@/types/query-params';
import type { StateToken as Token } from '@normalfinance/types';

import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { getConversionText } from '@/utils/conversion-helpers';
import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useSwap, BuyDirection, useTrustLine, SellDirection } from '@/hooks';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import { format, constants, checkTrustline, getCryptoIconUrl } from '@normalfinance/utils';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Button, InputBase, Typography } from '@mui/material';

import { Iconify } from '@/components/template/iconify';

import PickToken from './pick-token';
import SwapReview from './swap-review';
import { WalletGate } from './wallet-gate';
import FeeInfoAccordion from './fee-info-accordion';
import SwapSendPopupButton from './swap-send-popup-button';
import SwapSendEmptyPopupButton from './swap-send-empty-popup-button';

interface SwapCardProps extends CardProps {
  tokensList?: Token[];
  swapFeeInfo?: SwapFeeInfo;
  queryParams?: SwapQueryParams;
}

const SwapCard: React.FC<SwapCardProps> = ({ tokensList = [], queryParams, ...other }) => {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  // Using the store
  const storePersist = usePersistStore();
  const appStore = useAppStore();
  const { publicKey } = useStellarWalletsKit();

  const {
    trustlineButtonActive,
    addTrustLine,
    loading: trustlineLoading,
    txBroadcasting,
    error: _,
  } = useTrustLine();

  const { onEstimateSwap, onSwap } = useSwap();

  const [loadingSimulate, setLoadingSimulate] = useState<boolean>(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [creatingTrustline, setCreatingTrustline] = useState<boolean>(false);
  const [needsTrustline, setNeedsTrustline] = useState<boolean>(false);
  const [checkingTrustline, setCheckingTrustline] = useState<boolean>(false);

  const [maxSlippage, setMaxSlippage] = useState<number>(10_000); // bps
  const [exchangeRate, setExchangeRate] = useState<string>('');
  const [networkFee, setNetworkFee] = useState<string>('');
  const [poolFee, setPoolFee] = useState<string>('');
  const [priceImpact, setPriceImpact] = useState<number>(0); // bps

  // 1) States for tokens, default sell token is first in the list
  const [tokens, setTokens] = useState(tokensList);
  const [sellToken, setSellToken] = useState<Token | null>(tokens.length ? tokens[0] : null);
  const [buyToken, setBuyToken] = useState<Token | null>(null);

  // 2) State for the user's sell amount
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

  // Compute the fiat value for the user's sell input
  const sellVal = parseFloat(amount) || 0;
  const sellFiatValue = sellToken && sellVal > 0 ? sellVal * sellToken.usdValue : 0;

  // 5) Example of how much buyToken the user might get
  const [buyAmount, setBuyAmount] = useState<number>(0);

  useEffect(() => {
    if (tokensList.length === 0) return;
    setTokens(tokensList);
    // If no sell token is set yet, default to XLM if present, otherwise first token
    if (!sellToken) {
      const xlmToken = tokensList.find((tkn) => tkn.symbol === 'XLM');
      setSellToken(xlmToken || tokensList[0]);
    }
  }, [tokensList]);

  // Initialize from query params
  useEffect(() => {
    if (!queryParams) return;

    // Set tokens based on query params
    if (queryParams.token_in && tokens.length > 0) {
      const sellTokenFromQuery = tokens.find(
        (tkn1) => tkn1.symbol.toLowerCase() === queryParams.token_in?.toLowerCase()
      );
      if (sellTokenFromQuery) {
        setSellToken(sellTokenFromQuery);
      }
    }

    if (queryParams.token_out && tokens.length > 0) {
      const buyTokenFromQuery = tokens.find(
        (tkn2) => tkn2.symbol.toLowerCase() === queryParams.token_out?.toLowerCase()
      );
      if (buyTokenFromQuery) {
        setBuyToken(buyTokenFromQuery);
      }
    }

    // Set amount
    if (queryParams.in_amount) {
      setAmount(queryParams.in_amount);
    }
  }, [queryParams, tokens]);

  // 6) Open/close the token picker
  const handleOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  // Function to check if trustline is needed for the buy token
  const checkTrustlineStatus = useCallback(async () => {
    console.log('[TRUSTLINE CHECK] Starting check for token:', buyToken?.symbol);

    if (!buyToken || buyToken.symbol === 'XLM') {
      console.log('[TRUSTLINE CHECK] No check needed - XLM or no token');
      setNeedsTrustline(false);
      return;
    }

    const walletAddress = publicKey || storePersist.wallet.address;
    if (!walletAddress) {
      console.log('[TRUSTLINE CHECK] No wallet address available');
      setNeedsTrustline(false);
      return;
    }

    console.log('[TRUSTLINE CHECK] Checking for wallet:', walletAddress);
    setCheckingTrustline(true);
    try {
      const trustlineStatus = await checkTrustline(
        walletAddress,
        buyToken.symbol,
        constants.StellarConfig.NORMAL_TOKEN_ISSUER
      );
      console.log('[TRUSTLINE CHECK] Result:', trustlineStatus);
      setNeedsTrustline(!trustlineStatus.exists);
    } catch (error) {
      console.error('[TRUSTLINE CHECK] Error checking trustline:', error);
      setNeedsTrustline(false);
    }
    setCheckingTrustline(false);
  }, [buyToken, publicKey, storePersist.wallet.address]);

  // Check trustline status when buy token changes
  useEffect(() => {
    checkTrustlineStatus();
  }, [checkTrustlineStatus]);

  // 7) Auto-fetch quote whenever relevant fields change: sellToken, buyToken, amount
  useEffect(() => {
    // Clear old quote state each time we start a new calculation
    setIsLoading(false);
    setQuoteFetched(false);
    setInsufficientBalance(false);
    setBuyAmount(0);
    setSwapError(null);
    setCreatingTrustline(false);
    setNeedsTrustline(false);
    setCheckingTrustline(false);

    // Make sure we have both tokens
    if (!sellToken || !buyToken) {
      return;
    }

    // If user hasn't typed anything or typed 0
    if (!amount || sellVal <= 0) {
      return;
    }

    // Start "fetching" quote
    setIsLoading(true);

    doSimulateSwap();

    // Simulate an async fetch with a 1s delay
    const timer = setTimeout(() => {
      setIsLoading(false);
      setQuoteFetched(true);

      const potentialBuyAmount = sellVal * (sellToken.usdValue / buyToken.usdValue);
      setBuyAmount(potentialBuyAmount);

      if (sellVal > sellToken.balance) {
        setInsufficientBalance(true);
      }
    }, 1000);

    // Cleanup if user changes input quickly
    // eslint-disable-next-line consistent-return
    return () => {
      clearTimeout(timer);
    };
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
      // User selecting the sell token
      if (buyToken && buyToken.id === token.id) {
        // Prevent selecting the same token as the buy side
        setBuyToken(null);
      }
      setSellToken(token);

      if (token.symbol !== 'XLM') {
        // Sell token is a Normal Token
        // Ensure the buy token is XLM
        if (!buyToken || buyToken.symbol !== 'XLM') {
          const xlmToken = tokens.find((tkn) => tkn.symbol === 'XLM');
          if (xlmToken) setBuyToken(xlmToken);
        }
      } else {
        // Sell token is XLM
        // Ensure buy token is a Normal Token (if it's something else or also XLM)
        if (buyToken && !buyToken.symbol.startsWith('n')) {
          // If buyToken is not a Normal Token (or if somehow XLM), clear it
          setBuyToken(null);
        }
      }
    } else if (activeButton === 'buy') {
      // User selecting the buy token
      if (sellToken && sellToken.id === token.id) {
        // Prevent selecting the same token as the sell side
        setSellToken(null);
      }
      setBuyToken(token);

      if (token.symbol !== 'XLM') {
        // Buy token is a Normal Token
        // Ensure the sell token is XLM
        if (!sellToken || sellToken.symbol !== 'XLM') {
          const xlmToken = tokens.find((tkn) => tkn.symbol === 'XLM');
          if (xlmToken) setSellToken(xlmToken);
        }
      } else {
        // Buy token is XLM
        // Ensure sell token is a Normal Token
        if (sellToken && !sellToken.symbol.startsWith('n')) {
          setSellToken(null);
        }
      }
    }

    // After adjusting, close the picker
    handleClose();
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

  // 10) Derive the main button's label
  const getButtonLabel = (): string => {
    console.log('[BUTTON LABEL] State check:', {
      sellToken: sellToken?.symbol,
      buyToken: buyToken?.symbol,
      checkingTrustline,
      creatingTrustline,
      needsTrustline,
      sellVal,
      isLoading,
      quoteFetched,
      insufficientBalance,
    });

    if (!sellToken || !buyToken) {
      return 'Select a token';
    }
    if (checkingTrustline) {
      return 'Checking trustline...';
    }
    if (creatingTrustline) {
      return 'Creating trustline...';
    }
    // Check trustline first, before amount validation
    if (needsTrustline && buyToken.symbol !== 'XLM') {
      console.log('[BUTTON LABEL] Returning Create Trustline');
      return 'Create Trustline';
    }
    if (sellVal <= 0) {
      return 'Enter an amount';
    }
    if (isLoading) {
      return 'Finalizing quote...';
    }
    if (quoteFetched) {
      if (insufficientBalance) {
        return `Insufficient ${sellToken.symbol}`;
      }
      return 'Review';
    }
    return 'Enter an amount';
  };

  // Different button states have different actions
  const handleMainButtonClick = () => {
    const label = getButtonLabel();
    if (label === 'Select a token') {
      return;
    } else if (label === 'Enter an amount') {
      return;
    } else if (label === 'Finalizing quote...') {
      return;
    } else if (label.startsWith('Insufficient')) {
      return;
    } else if (label === 'Create Trustline') {
      handleCreateTrustline();
    } else if (label === 'Review') {
      // open a review popup
      setReviewOpen(true);
    }
  };

  // Separate function to handle trustline creation
  const handleCreateTrustline = async () => {
    if (!buyToken || buyToken.symbol === 'XLM') return;

    setCreatingTrustline(true);
    setSwapError(null);

    try {
      await addTrustLine(buyToken.symbol, constants.StellarConfig.NORMAL_TOKEN_ISSUER);
      // After successful trustline creation, check status again
      await checkTrustlineStatus();
    } catch (error) {
      setSwapError('Failed to create trustline');
      console.error('Trustline creation error:', error);
    } finally {
      setCreatingTrustline(false);
    }
  };

  // Max the sell token
  const handleMaxClick = () => {
    if (sellToken) {
      setAmount(sellToken.balance.toString());
    }
  };

  /**
   * Executes the swap transaction.
   * This function signs and sends the transaction using WalletConnect or Signer.
   *
   * @async
   */
  const checkIfSwapAllowed = async () => {
    setSwapError(null);
    if (!sellToken || !buyToken) return false;
    return true;
  };

  /**
   * Simulates the swap transaction to determine the exchange rate and network fee.
   *
   * @async
   */
  const doSimulateSwap = useCallback(async (): Promise<void> => {
    if (sellToken && buyToken) {
      if (amount === '0') {
        // setTokenAmounts([0, 0]);
        setAmount('0');
        setBuyAmount(0);
        setExchangeRate('');
        setNetworkFee('');
        return;
      }

      setLoadingSimulate(true);
      try {
        const asset = buyToken.symbol === 'XLM' ? sellToken.symbol : buyToken.symbol;
        const direction = sellToken.symbol === 'XLM' ? BuyDirection : SellDirection;

        await onEstimateSwap({
          asset: format.formatNormalToken(asset, 'without-n'),
          direction,
          in_amount: amount,
        });
      } catch (e) {
        // Simulation error handled silently
      }
      setLoadingSimulate(false);
    }
  }, [sellToken?.name, buyToken, amount, buyAmount]);

  // New: doSwap function for use in onSubmit (simplified - no trustline creation)
  const doSwap = async (): Promise<void> => {
    if (sellToken && buyToken && sellToken.id && buyToken.id) {
      try {
        const allowed = await checkIfSwapAllowed();
        if (!allowed) {
          return;
        }

        // Check if trustline exists for the buy token (if it's not XLM)
        if (buyToken.symbol !== 'XLM') {
          const walletAddress = publicKey || storePersist.wallet.address;
          if (!walletAddress) {
            setSwapError('No wallet connected');
            return;
          }

          const trustlineStatus = await checkTrustline(
            walletAddress,
            buyToken.symbol,
            constants.StellarConfig.NORMAL_TOKEN_ISSUER
          );

          if (!trustlineStatus.exists) {
            setSwapError('Trustline required before swap. Please create trustline first.');
            return;
          }
        }

        // Now call the client-side onSwap (sign and submit)
        const asset = buyToken.symbol === 'XLM' ? sellToken.symbol : buyToken.symbol;
        const direction = sellToken.symbol === 'XLM' ? BuyDirection : SellDirection;

        await onSwap({
          asset: format.formatNormalToken(asset, 'without-n'),
          direction,
          in_amount: Number(amount),
          out_min: Number(0), //buyAmount
        });

        setTimeout(async () => {
          await appStore.fetchNativeTokenInfo();
          // await appStore.fetchNormalTokenInfo(pool);
        }, 7000);
      } catch (error) {
        setSwapError('Error during swap transaction');
      }
    }
  };

  // Main button with multiple states
  const persist = usePersistStore();
  const isConnected = !!persist.wallet.address;

  const getFilteredTokens = (): Token[] => {
    if (activeButton === 'sell') {
      // Filtering options for the sell token selection
      if (!buyToken) {
        // No buy token selected yet: allow XLM and Normal Tokens only
        return tokens.filter((tkn) => tkn.symbol === 'XLM' || tkn.symbol.startsWith('n'));
      }
      // If buy token is already selected:
      if (buyToken.symbol === 'XLM') {
        // Buy is XLM, so sell must be a Normal Token
        return tokens.filter((tkn) => tkn.symbol.startsWith('n'));
      } else if (buyToken.symbol.startsWith('n')) {
        // Buy is a Normal Token, so sell must be XLM
        return tokens.filter((tkn) => tkn.symbol === 'XLM');
      }
    } else if (activeButton === 'buy') {
      // Filtering options for the buy token selection
      if (!sellToken) {
        // No sell token selected yet: allow XLM and Normal Tokens only
        return tokens.filter((tkn) => tkn.symbol === 'XLM' || tkn.symbol.startsWith('n'));
      }
      // If sell token is already selected:
      if (sellToken.symbol === 'XLM') {
        // Sell is XLM, so buy must be a Normal Token
        return tokens.filter((tkn) => tkn.symbol.startsWith('n'));
      } else if (sellToken.symbol.startsWith('n')) {
        // Sell is a Normal Token, so buy must be XLM
        return tokens.filter((tkn) => tkn.symbol === 'XLM');
      }
    }
    // Fallback: if something is unexpected, default to allowing only XLM and Normal Tokens
    return tokens.filter((tkn) => tkn.symbol === 'XLM' || tkn.symbol.startsWith('n'));
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
            borderRadius: '8px',
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
              borderRadius: '8px',
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
            borderRadius: '20px',
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
              textAlign: 'left',
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
              <Typography variant="body1" noWrap data-testid="sell-token-picker">
                {t('Sell')}
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
                  imgUrl={getCryptoIconUrl(sellToken.symbol)}
                  label={sellToken.symbol}
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
                      {sellToken.balance}{' '}
                      <Box
                        component="span"
                        sx={{
                          color: insufficientBalance
                            ? theme.palette.error.main
                            : theme.palette.text.primary,
                        }}
                      >
                        {sellToken?.symbol}
                      </Box>
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleMaxClick}
                    disabled={isLoading}
                    sx={{
                      fontWeight: 500,
                      fontSize: '12px',
                      p: 0,
                      height: '24px',
                      minWidth: '36px',
                      backgroundColor: 'rgba(148,123,255,0.29)',
                      color: '#6E4BFF',
                      '&:hover': {
                        backgroundColor: 'rgba(148,123,255,0.20)',
                      },
                    }}
                  >
                    {t('Max')}
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
            borderRadius: '20px',
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            overflow: 'hidden',
            textAlign: 'left',
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
            <Typography variant="body1" noWrap data-testid="buy-token-picker">
              {t('Buy')}
            </Typography>

            <Box
              sx={{
                maxWidth: '100%',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
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
              }}
            >
              {buyToken ? `${fCurrency(buyToken.usdValue * buyAmount)}` : '$0'}
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
                imgUrl={getCryptoIconUrl(buyToken.symbol)}
                label={buyToken.symbol}
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
      {/* Display swap error if exists */}
      {swapError && (
        <Box
          sx={{
            padding: theme.spacing(1.5),
            backgroundColor: alpha(theme.palette.error.main, 0.1),
            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
            borderRadius: '12px',
            mb: 1,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.error.main,
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            {swapError}
          </Typography>
        </Box>
      )}

      {/* Main button with multiple states */}
      {isConnected ? (
        <Button
          fullWidth
          variant="contained" // use a supported variant
          size="large"
          onClick={handleMainButtonClick}
          disabled={isLoading || creatingTrustline || checkingTrustline}
          sx={{
            backgroundColor: 'rgba(148,123,255,0.29)',
            color: '#6E4BFF',
            '&:hover': {
              backgroundColor: 'rgba(148,123,255,0.20)',
            },
            borderRadius: '20px',
          }}
        >
          {getButtonLabel()}
        </Button>
      ) : (
        <WalletGate buttonText="Connect Wallet to Swap" fullWidth variant="contained">
          {null}
        </WalletGate>
      )}

      {/* Additional box with fee info */}
      {quoteFetched && !isLoading && (
        <FeeInfoAccordion
          conversionText={sellToken && buyToken ? getConversionText(sellToken, buyToken) : ''}
          insufficientBalance={insufficientBalance}
          sellToken={sellToken || undefined}
          poolFee={0.3} // TODO: fix
          networkCost={0}
          priceImpact={priceImpact ?? 0}
          maxSlippage={maxSlippage}
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
          feePercentage="0.3" // TODO: fix
          networkCost={networkFee ?? '0'}
          priceImpact={priceImpact ?? 0}
          maxSlippage={maxSlippage}
          sellFiatValue={sellFiatValue}
          onSubmit={() => doSwap()}
        />
      )}
      {/* Token Picker Popup */}
      <PickToken
        open={open}
        onClose={handleClose}
        buttonSource={activeButton}
        tokens={tokens}
        onTokenSelect={handleTokenSelect}
      />
    </Box>
  );
};

export default SwapCard;
