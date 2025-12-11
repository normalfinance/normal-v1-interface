import type { CardProps } from '@mui/material';
import type { Pool, Token } from '@normalfinance/types';
import type { SwapFeeInfo } from '@/types/swap-fee-info';
import type { SwapQueryParams } from '@/types/query-params';

import { paths } from '@/routes/paths';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { useSwap, useTrustLine } from '@/hooks';
import { fCurrency } from '@/utils/format-number';
import { getConversionText } from '@/utils/conversion-helpers';
import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import {
  logger,
  constants,
  checkTrustline,
  getCryptoIconUrl,
  sortTokenAddreses,
  sanitizeAmountInput,
} from '@normalfinance/utils';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Alert, Stack, Button, InputBase, Typography } from '@mui/material';

import { Iconify } from '@/components/template/iconify';

import PickToken from './pick-token';
import SwapReview from './swap-review';
import { WalletGate } from './wallet-gate';
import ReceiveModal from './receive-modal';
import FeeInfoAccordion from './fee-info-accordion';
import SwapSendPopupButton from './swap-send-popup-button';
import SwapSendEmptyPopupButton from './swap-send-empty-popup-button';

enum ButtonState {
  SELECT_TOKEN = 'SELECT_TOKEN',
  ENTER_AMOUNT = 'ENTER_AMOUNT',
  ZERO_BALANCE = 'ZERO_BALANCE',
  CHECKING_TRUSTLINE = 'CHECKING_TRUSTLINE',
  CREATE_TRUSTLINE = 'CREATE_TRUSTLINE',
  CREATING_TRUSTLINE = 'CREATING_TRUSTLINE',
  NO_POOL_FOUND = 'NO_POOL_FOUND',
  FINALIZING_QUOTE = 'FINALIZING_QUOTE',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  REVIEW = 'REVIEW',
}

interface ButtonConfig {
  label: string;
  disabled: boolean;
  action: () => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error';
}

interface SwapCardProps extends CardProps {
  swapFeeInfo?: SwapFeeInfo;
  queryParams?: SwapQueryParams;
  changeTab?: React.Dispatch<React.SetStateAction<false | 'swap' | 'send' | 'buy'>>;
}

const SwapCard: React.FC<SwapCardProps> = ({ queryParams, changeTab, ...other }) => {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  const router = useRouter();

  // Using the store
  const {
    wallet,
    updateTokenInfo,
    tokenState: { tokens },
    poolState: { poolsByTokens },
  } = usePersistStore();

  const { modalState, setModalView } = useAppStore();

  const { publicKey } = useStellarWalletsKit();

  const { addTrustLine } = useTrustLine();

  const { loading: loadingSwap, setLoading, onEstimateSwap, onSwap } = useSwap();

  const [swapError, setSwapError] = useState<string | null>(null);
  const [creatingTrustline, setCreatingTrustline] = useState<boolean>(false);
  const [needsTrustline, setNeedsTrustline] = useState<boolean>(false);
  const [checkingTrustline, setCheckingTrustline] = useState<boolean>(false);

  // 1) States for tokens, default sell token is first in the list
  const [sellToken, setSellToken] = useState<Token | null>(tokens.length ? tokens[0] : null);
  const [buyToken, setBuyToken] = useState<Token | null>(null);
  const [pool, setPool] = useState<Pool | null>(null);

  // 2) State for the user's sell amount
  const [amount, setAmount] = useState<string>('0');

  // 3) Popup states for picking tokens
  const [open, setOpen] = useState(false);
  const [activeButton, setActiveButton] = useState<'sell' | 'buy' | ''>('');

  // 4) State for review dialog
  const [reviewOpen, setReviewOpen] = useState(false);
  const handleReviewClose = () => setReviewOpen(false);

  // 4) Quote states
  const [quoteFetched, setQuoteFetched] = useState(false);
  const [insufficientBalance, setInsufficientBalance] = useState(false);

  // Compute the fiat value for the user's sell input
  const sellVal = parseFloat(amount) || 0;
  const sellFiatValue =
    sellToken && sellVal > 0 ? BigNumber(sellToken.price).multipliedBy(sellVal).toNumber() : 0;

  // 5) Example of how much buyToken the user might get
  const [buyAmount, setBuyAmount] = useState<number>(0);

  useEffect(() => {
    if (tokens.length === 0) return;

    // If no sell token is set yet, default to USDC if present, otherwise first token
    if (!sellToken) {
      const usdcToken = tokens.find((tkn) => tkn.contract === constants.StellarConfig.USDC_ADDRESS);
      setSellToken(usdcToken || tokens[0]);
    }
  }, [tokens]);

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
    logger.log('[TRUSTLINE CHECK] Starting check for token:', buyToken?.symbol);

    if (!buyToken || buyToken.symbol === 'XLM') {
      logger.log('[TRUSTLINE CHECK] No check needed - XLM or no token');
      setNeedsTrustline(false);
      return;
    }

    const walletAddress = publicKey || wallet.address;
    if (!walletAddress) {
      logger.log('[TRUSTLINE CHECK] No wallet address available');
      setNeedsTrustline(false);
      return;
    }

    logger.log('[TRUSTLINE CHECK] Checking for wallet:', walletAddress);
    setCheckingTrustline(true);
    try {
      const trustlineStatus = await checkTrustline(walletAddress, buyToken.symbol, buyToken.issuer);
      logger.log('[TRUSTLINE CHECK] Result:', trustlineStatus);
      setNeedsTrustline(!trustlineStatus.exists);
    } catch (error) {
      logger.error('[TRUSTLINE CHECK] Error checking trustline:', error);
      setNeedsTrustline(false);
    }
    setCheckingTrustline(false);
  }, [buyToken, publicKey, wallet.address]);

  // Check trustline status when buy token changes
  useEffect(() => {
    checkTrustlineStatus();
  }, [checkTrustlineStatus]);

  // 7) Auto-fetch quote whenever relevant fields change: sellToken, buyToken, amount
  useEffect(() => {
    // Clear old quote state each time we start a new calculation
    setLoading(false);
    setQuoteFetched(false);
    setInsufficientBalance(false);
    setBuyAmount(0);
    setSwapError(null);
    setCreatingTrustline(false);
    setNeedsTrustline(false);
    setCheckingTrustline(false);
    setPool(null);

    // Make sure we have both tokens
    if (!sellToken || !buyToken) {
      return;
    }

    const _pool = searchPool();

    // If no pool exists for the selected tokens
    if (!_pool) {
      return;
    }

    // If user hasn't typed anything or typed 0
    if (!amount || sellVal <= 0) {
      return;
    }

    // Start "fetching" quote
    setLoading(true);

    doSimulateSwap();

    // Simulate an async fetch with a 1s delay
    const timer = setTimeout(() => {
      setLoading(false);
      setQuoteFetched(true);

      if (BigNumber(sellToken.price).eq(0) || BigNumber(buyToken.price).eq(0)) {
        setBuyAmount(0);
      } else {
        const potentialBuyAmount = BigNumber(sellToken.price)
          .dividedBy(buyToken.price)
          .multipliedBy(sellVal);
        setBuyAmount(potentialBuyAmount.toNumber());
      }

      if (BigNumber(sellToken.balance).lt(sellVal)) {
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
      if (buyToken && buyToken.contract === token.contract) {
        // Prevent selecting the same token as the buy side
        setBuyToken(null);
      }
      setSellToken(token);
    } else if (activeButton === 'buy') {
      // User selecting the buy token
      if (sellToken && sellToken.contract === token.contract) {
        // Prevent selecting the same token as the sell side
        setSellToken(null);
      }
      setBuyToken(token);
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
    setLoading(false);
    setQuoteFetched(false);
    setInsufficientBalance(false);
    setBuyAmount(0);
  };

  const searchPool = useCallback((): Pool | null => {
    if (sellToken && buyToken && Object.keys(poolsByTokens).length) {
      const { tokens: sortedTokens } = sortTokenAddreses(sellToken.contract, buyToken.contract);
      const tokensKey = sortedTokens.join(':');

      const pools = poolsByTokens[tokensKey];

      if (!pools || pools.length === 0) {
        setPool(null);
        return null;
      }

      // TODO: Once we support multiple fee fractions for the same pair, this index can be 1 or 2
      const selectedpool = pools[0];

      setPool(selectedpool);

      return selectedpool;
    } else return null;
  }, [sellToken, buyToken]);

  const getButtonState = (): ButtonState => {
    logger.log('[BUTTON STATE] State check:', {
      sellToken: sellToken?.symbol,
      buyToken: buyToken?.symbol,
      checkingTrustline,
      creatingTrustline,
      needsTrustline,
      sellVal,
      loadingSwap,
      quoteFetched,
      insufficientBalance,
    });

    if (!sellToken || !buyToken) {
      return ButtonState.SELECT_TOKEN;
    }
    if (!pool) {
      return ButtonState.NO_POOL_FOUND;
    }
    if (!tokens.some((tkn) => tkn.balance != '0')) {
      return ButtonState.ZERO_BALANCE;
    }
    if (checkingTrustline) {
      return ButtonState.CHECKING_TRUSTLINE;
    }
    if (creatingTrustline) {
      return ButtonState.CREATING_TRUSTLINE;
    }
    // Check trustline first, before amount validation
    if (needsTrustline && buyToken.symbol !== 'XLM') {
      logger.log('[BUTTON STATE] Returning CREATE_TRUSTLINE');
      return ButtonState.CREATE_TRUSTLINE;
    }
    if (sellVal <= 0) {
      return ButtonState.ENTER_AMOUNT;
    }
    if (loadingSwap) {
      return ButtonState.FINALIZING_QUOTE;
    }
    if (quoteFetched) {
      if (insufficientBalance) {
        return ButtonState.INSUFFICIENT_BALANCE;
      }
      return ButtonState.REVIEW;
    }
    return ButtonState.ENTER_AMOUNT;
  };

  const getButtonConfig = (state: ButtonState): ButtonConfig => {
    const configs: Record<ButtonState, ButtonConfig> = {
      [ButtonState.SELECT_TOKEN]: {
        label: 'Select a token',
        disabled: true,
        action: () => {},
      },
      [ButtonState.ENTER_AMOUNT]: {
        label: 'Enter an amount',
        disabled: true,
        action: () => {},
      },
      [ButtonState.ZERO_BALANCE]: {
        label: 'Fund your account',
        disabled: true,
        action: () => {},
        color: 'error' as const,
      },
      [ButtonState.CHECKING_TRUSTLINE]: {
        label: 'Checking trustline...',
        disabled: true,
        action: () => {},
      },
      [ButtonState.CREATING_TRUSTLINE]: {
        label: 'Creating trustline...',
        disabled: true,
        action: () => {},
      },
      [ButtonState.NO_POOL_FOUND]: {
        label: 'No pool found',
        disabled: true,
        action: () => {},
        color: 'error' as const,
      },
      [ButtonState.FINALIZING_QUOTE]: {
        label: 'Fetching quote...',
        disabled: true,
        action: () => {},
      },
      [ButtonState.INSUFFICIENT_BALANCE]: {
        label: `Insufficient ${sellToken?.symbol || ''}`,
        disabled: true,
        action: () => {},
        color: 'error' as const,
      },
      [ButtonState.CREATE_TRUSTLINE]: {
        label: 'Create Trustline',
        disabled: false,
        action: handleCreateTrustline,
        variant: 'contained' as const,
      },
      [ButtonState.REVIEW]: {
        label: 'Review',
        disabled: false,
        action: () => setReviewOpen(true),
        variant: 'contained' as const,
      },
    };

    return configs[state];
  };

  const handleMainButtonClick = () => {
    const state = getButtonState();
    const config = getButtonConfig(state);
    config.action();
  };

  // Separate function to handle trustline creation
  const handleCreateTrustline = async () => {
    if (!buyToken || buyToken.symbol === 'XLM') return;

    setCreatingTrustline(true);
    setSwapError(null);

    try {
      await addTrustLine(buyToken.symbol, buyToken.issuer);
      // After successful trustline creation, check status again
      await checkTrustlineStatus();
    } catch (error) {
      setSwapError('Failed to create trustline');
      logger.error('Trustline creation error:', error);
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
    if (!sellToken || !buyToken || !pool) return false;
    return true;
  };

  /**
   * Simulates the swap transaction to determine the exchange rate and network fee.
   *
   * @async
   */
  const doSimulateSwap = useCallback(async (): Promise<void> => {
    if (sellToken && buyToken && pool) {
      if (amount === '0') {
        setAmount('0');
        setBuyAmount(0);
        return;
      }

      try {
        await onEstimateSwap({
          tokens: [sellToken.contract, buyToken.contract],
          token_in: sellToken.contract,
          token_out: buyToken.contract,
          pool_index: pool.index,
          in_amount: amount,
        });
      } catch (e) {
        // Simulation error handled silently
      }
    }
  }, [sellToken?.name, buyToken, amount, buyAmount]);

  // New: doSwap function for use in onSubmit (simplified - no trustline creation)
  const doSwap = async (): Promise<void> => {
    if (sellToken && buyToken && pool) {
      try {
        const allowed = await checkIfSwapAllowed();
        if (!allowed) {
          return;
        }

        // Check if trustline exists for the buy token (if it's not XLM)
        if (buyToken.symbol !== 'XLM') {
          const walletAddress = publicKey || wallet.address;
          if (!walletAddress) {
            setSwapError('No wallet connected');
            return;
          }

          const trustlineStatus = await checkTrustline(
            walletAddress,
            buyToken.symbol,
            buyToken.issuer
          );

          if (!trustlineStatus.exists) {
            setSwapError('Trustline required before swap. Please create trustline first.');
            return;
          }
        }

        // Now call the client-side onSwap (sign and submit
        await onSwap({
          tokens: [sellToken.contract, buyToken.contract],
          token_in: sellToken.contract,
          token_out: buyToken.contract,
          pool_index: pool.index,
          in_amount: Number(amount),
          out_min: Number(0), // buyAmount
        });

        setTimeout(async () => {
          await updateTokenInfo(sellToken);
          await updateTokenInfo(buyToken);
        }, 5000);
      } catch (error) {
        setSwapError('Error during swap transaction');
      }
    }
  };

  // Main button with multiple states
  const persist = usePersistStore();
  const isConnected = !!persist.wallet.address;

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
                  imgUrl={sellToken.icon ?? getCryptoIconUrl(sellToken.symbol)}
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
                      {BigNumber(sellToken.balance).toFixed(sellToken.decimals)}{' '}
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
                    disabled={loadingSwap}
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
              {buyToken ? `${fCurrency(BigNumber(buyToken.price).multipliedBy(buyAmount))}` : '$0'}
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
                imgUrl={buyToken.icon ?? getCryptoIconUrl(buyToken.symbol)}
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
            mt: 2,
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

      {isConnected ? (
        (() => {
          const buttonState = getButtonState();
          const buttonConfig = getButtonConfig(buttonState);

          return (
            <>
              <Button
                fullWidth
                variant={buttonConfig.variant || 'contained'}
                size="large"
                onClick={handleMainButtonClick}
                disabled={buttonConfig.disabled}
                color={buttonConfig.color}
                sx={{
                  backgroundColor:
                    buttonConfig.color === 'error' ? undefined : 'rgba(148,123,255,0.29)',
                  color: buttonConfig.color === 'error' ? undefined : '#6E4BFF',
                  '&:hover': {
                    backgroundColor:
                      buttonConfig.color === 'error' ? undefined : 'rgba(148,123,255,0.20)',
                  },
                  borderRadius: '20px',
                  mt: 2,
                }}
              >
                {buttonConfig.label}
              </Button>
              {buttonState === ButtonState.ZERO_BALANCE && (
                <>
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    {t(
                      'You must fund your wallet with XLM before investing. Please deposit or buy XLM below.'
                    )}
                  </Alert>
                  <Stack direction="row" spacing={1} width="100%" mt={2}>
                    <Button
                      fullWidth
                      variant="soft"
                      color="info"
                      onClick={() => setModalView('receive', true)}
                    >
                      {t('Deposit')}
                    </Button>
                    <Button
                      fullWidth
                      variant="soft"
                      color="success"
                      onClick={() => {
                        if (changeTab) changeTab('buy');
                        else router.push(`${paths.invest}?tab=buy`);
                      }}
                    >
                      {t('Buy')}
                    </Button>
                  </Stack>
                </>
              )}
              <ReceiveModal
                open={modalState.receive}
                onClose={() => {
                  setModalView('receive', false);
                }}
              />
            </>
          );
        })()
      ) : (
        <WalletGate buttonText="Login to Swap" fullWidth variant="contained">
          {null}
        </WalletGate>
      )}

      {/* Additional box with fee info */}
      {quoteFetched && !loadingSwap && (
        <FeeInfoAccordion
          conversionText={sellToken && buyToken ? getConversionText(sellToken, buyToken) : ''}
          insufficientBalance={insufficientBalance}
          sellToken={sellToken || undefined}
          poolFee={pool ? pool.fee : 30}
          networkCost={0}
          priceImpact={0}
          maxSlippage={10000}
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
          feePercentage={pool ? pool.fee : 30}
          networkCost="0"
          priceImpact={0}
          maxSlippage={10000}
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
