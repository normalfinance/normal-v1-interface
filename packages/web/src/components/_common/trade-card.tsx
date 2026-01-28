import type { CardProps } from '@mui/material';
import type { SwapQueryParams } from '@/types/query-params';
import type { Pair, Token, ButtonConfig, TrustlineState } from '@normalfinance/types';

import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { usePersistStore } from '@normalfinance/state';
import { useTrade, useTreasury, useTrustLine } from '@/hooks';
import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { getConversionTextScaled } from '@/utils/conversion-helpers';
import { fPercent, fCurrencyTwoDecimals } from '@/utils/format-number';
import { type TradeRoute, determineTradeRoute } from '@/utils/trade-route';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import { ModalType, TokenAmountButtonState as ButtonState } from '@normalfinance/types';
import {
  constants,
  isNormalToken,
  checkTrustline,
  getCryptoIconUrl,
  sanitizeAmountInput,
} from '@normalfinance/utils';

import { LoadingButton } from '@mui/lab';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Alert,
  Stack,
  Button,
  Switch,
  InputBase,
  Typography,
  InputAdornment,
} from '@mui/material';

import { useSnackbar } from '@/components/template/snackbar';

import PickToken from './pick-token';
import SwapReview from './swap-review';
import { WalletGate } from './wallet-gate';
import InfoAccordion from './info-accordion';
import { Iconify } from '../template/iconify';
import SwapSendPopupButton from './swap-send-popup-button';
import SwapSendEmptyPopupButton from './swap-send-empty-popup-button';

import type { InfoAccordionAlert } from './info-accordion';

type TradeCardTrustlineState = {
  selected: TrustlineState;
  usdc: TrustlineState;
};

const initialTrustlineState: TradeCardTrustlineState = {
  selected: {
    creating: false,
    needs: false,
    checking: false,
  },
  usdc: {
    creating: false,
    needs: false,
    checking: false,
  },
};

interface TradeCardProps extends CardProps {
  queryParams?: SwapQueryParams;
  changeTab?: React.Dispatch<React.SetStateAction<false | 'trade' | 'deposit' | 'withdraw'>>;
  defaultTokenSymbol?: string;
}

const TradeCard: React.FC<TradeCardProps> = ({
  queryParams,
  changeTab,
  defaultTokenSymbol,
  ...other
}) => {
  const posthog = usePostHog();
  const theme = useTheme();
  const { t } = useTranslate('auto');
  const { enqueueSnackbar } = useSnackbar();

  const { setModalView } = useAppStore();

  const {
    wallet,
    tokenState: { tokens, tokensByAddress },
    pairState: { pairByToken },
  } = usePersistStore();

  const { publicKey } = useStellarWalletsKit();

  const { addTrustLine } = useTrustLine();

  const {
    loading,
    setLoading,
    buyLong,
    sellLong,
    buyShort,
    sellShort,
    // buyLongMint,
    // buyShortMint,
    // sellLongRedeem,
    // sellShortRedeem,
  } = useTrade();

  const { fetchBalances: fetchTreasuryBalances } = useTreasury();

  const tradableTokens = tokens.filter((tkn) => isNormalToken(tkn));
  const defaultToken =
    defaultTokenSymbol && tradableTokens.find((tkn) => tkn.symbol === defaultTokenSymbol);
  const usdcToken = tokens.find((tkn) => tkn.contract === constants.StellarConfig.USDC_ADDRESS);

  const [swapError, setSwapError] = useState<string | null>(null);

  const [trustlineState, setTrustlineState] =
    useState<TradeCardTrustlineState>(initialTrustlineState);

  // 1) States for tokens, default sell token is first in the list
  const [selectedToken, setSelectedToken] = useState<Token | null>(
    defaultToken ? defaultToken : tradableTokens.length ? tradableTokens[0] : null
  );
  const [tradeDirection, setTradeDirection] = useState<'sell' | 'buy'>('buy');
  const [pair, setPair] = useState<Pair | null>(null);

  // 2) State for the user's trade amount
  const [fiatAmount, setFiatAmount] = useState<string>('0');

  // 3) Popup states for picking tokens
  const [open, setOpen] = useState(false);

  // 4) State for review dialog
  const [reviewOpen, setReviewOpen] = useState(false);
  const handleReviewClose = () => setReviewOpen(false);

  // 4) Quote states
  const [insufficientBalance, setInsufficientBalance] = useState(false);
  const [insufficientLiquidity, setInsufficientLiquidity] = useState(false);
  const [availableLiquidity, setAvailableLiquidity] = useState<string>('0');
  const [tradeRoute, setTradeRoute] = useState<TradeRoute | null>(null);

  // Compute the fiat value for the user's sell input
  const fiatAmountVal = parseFloat(fiatAmount) || 0;

  // 6) Open/close the token picker
  const handleOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  // Function to check if trustline is needed for the token and USDC
  const checkTrustlineStatus = useCallback(async () => {
    if (!selectedToken) {
      setTrustlineState((prev) => ({
        ...prev,
        selected: {
          ...prev.selected,
          needs: false,
        },
        usdc: {
          ...prev.usdc,
          needs: false,
        },
      }));
      return;
    }

    const walletAddress = publicKey || wallet.address;
    if (!walletAddress) {
      setTrustlineState((prev) => ({
        ...prev,
        selected: {
          ...prev.selected,
          needs: false,
        },
        usdc: {
          ...prev.usdc,
          needs: false,
        },
      }));
      return;
    }

    setTrustlineState((prev) => ({
      ...prev,
      selected: {
        ...prev.selected,
        checking: true,
      },
      usdc: {
        ...prev.usdc,
        checking: true,
      },
    }));
    try {
      const selectedTrustlineStatus = await checkTrustline(
        walletAddress,
        selectedToken.symbol,
        constants.StellarConfig.NORMAL_ISSUER
      );
      const usdcTrustlineStatus = await checkTrustline(
        walletAddress,
        'USDC',
        constants.StellarConfig.USDC_ISSUER
      );
      setTrustlineState((prev) => ({
        ...prev,
        selected: {
          ...prev.selected,
          needs: !selectedTrustlineStatus.exists,
        },
        usdc: {
          ...prev.usdc,
          needs: !usdcTrustlineStatus.exists,
        },
      }));
    } catch (error) {
      setTrustlineState((prev) => ({
        ...prev,
        selected: {
          ...prev.selected,
          needs: true,
        },
        usdc: {
          ...prev.usdc,
          needs: true,
        },
      }));
    }
    setTrustlineState((prev) => ({
      ...prev,
      selected: {
        ...prev.selected,
        checking: false,
      },
      usdc: {
        ...prev.usdc,
        checking: false,
      },
    }));
  }, [selectedToken, publicKey, wallet.address]);

  // Check trustline status when token changes
  useEffect(() => {
    checkTrustlineStatus();
  }, [checkTrustlineStatus]);

  const loadTreasuryBalances = useCallback(async () => {
    if (!pair || !selectedToken || !usdcToken) {
      setTradeRoute(null);
      return;
    }

    const balances = await fetchTreasuryBalances(pair.pairAddress);
    if (!balances) return;

    const longToken = tokensByAddress[pair.tokens.long];
    const shortToken = tokensByAddress[pair.tokens.short];
    const isLong = selectedToken.contract === pair.tokens.long;

    // Calculate required amount based on trade direction
    let requiredAmount: BigNumber;
    if (tradeDirection === 'buy') {
      const usdcValue = BigNumber(usdcToken.price).multipliedBy(fiatAmountVal);
      requiredAmount = usdcValue.dividedBy(isLong ? longToken.price : shortToken.price);
      setAvailableLiquidity((isLong ? balances.long : balances.short).toString());
    } else {
      const tokenValue = BigNumber(isLong ? longToken.price : shortToken.price).multipliedBy(
        fiatAmountVal
      );
      requiredAmount = tokenValue.dividedBy(usdcToken.price);
      setAvailableLiquidity(balances.usdc.toString());
    }

    // Determine optimal trade route
    const route = determineTradeRoute({
      tradeDirection,
      isLongToken: isLong,
      requiredAmount,
      treasuryBalances: balances,
    });

    setTradeRoute(route);
    setInsufficientLiquidity(!route.hasSufficientLiquidity);
  }, [
    pair,
    fiatAmountVal,
    tradeDirection,
    selectedToken,
    usdcToken,
    tokensByAddress,
    fetchTreasuryBalances,
  ]);

  // 7) Auto-fetch quote whenever relevant fields change: selectedToken, amount
  useEffect(() => {
    // Clear old quote state each time we start a new calculation
    setLoading(false);
    setSwapError(null);

    setInsufficientBalance(false);
    setInsufficientLiquidity(false);
    setTradeRoute(null);

    setTrustlineState(initialTrustlineState);

    setPair(null);

    // Make sure we have a token and the store pairs
    if (!selectedToken || !Object.keys(pairByToken).length) {
      return;
    }

    // Load the pair from the
    const pairFromStore = pairByToken[selectedToken.contract];

    // If no pair exists for the selected token
    if (!pairFromStore) {
      // setSwapError('No pair found from store');
      return;
    }

    setPair(pairFromStore);

    // If user hasn't typed anything or typed 0
    if (!fiatAmount || fiatAmountVal <= 0) {
      // setSwapError('No amount provided');
      return;
    }

    loadTreasuryBalances();

    if (!usdcToken) {
      // setSwapError('No USDC token found');
      return;
    }

    if (tradeDirection === 'buy') {
      if (BigNumber(usdcToken.balance).lt(fiatAmountVal)) {
        setInsufficientBalance(true);
      }
    } else {
      if (BigNumber(selectedToken.balance).lt(fiatAmountVal)) {
        setInsufficientBalance(true);
      }
    }
  }, [selectedToken, fiatAmount, fiatAmountVal]);

  // 8) handle input changes, dont allow negative numbers as input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiatAmount(sanitizeAmountInput(e.target.value));
  };

  const handleFocus = () => {
    if (fiatAmount === '0') setFiatAmount('');
  };

  const handleBlur = () => {
    if (fiatAmount === '') setFiatAmount('0');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-') e.preventDefault();
  };

  // 9) handle token selection from popup, are we picking a sell token or a buy token?
  const handleTokenSelect = (token: Token) => {
    setSelectedToken(token);

    // After adjusting, close the picker
    handleClose();
  };

  const getButtonState = (): ButtonState => {
    if (!selectedToken) {
      return ButtonState.SELECT_TOKEN;
    }
    if (!tokens.some((tkn) => tkn.balance != '0')) {
      return ButtonState.ZERO_BALANCE;
    }

    // Check trustline first, before amount validation
    if (trustlineState.selected.checking || trustlineState.usdc.checking) {
      return ButtonState.CHECKING_TRUSTLINE;
    }
    if (trustlineState.selected.creating || trustlineState.usdc.creating) {
      return ButtonState.CREATING_TRUSTLINE;
    }
    if (trustlineState.selected.needs || trustlineState.usdc.needs) {
      return ButtonState.CREATE_TRUSTLINE;
    }

    if (fiatAmountVal <= 0) {
      return ButtonState.ENTER_AMOUNT;
    }
    if (insufficientBalance) {
      return ButtonState.INSUFFICIENT_BALANCE;
    }
    if (insufficientLiquidity) {
      return ButtonState.INSUFFICIENT_BALANCE;
    }
    return ButtonState.SUBMIT;
  };

  const getButtonConfig = (state: ButtonState): ButtonConfig => {
    const configs: Record<ButtonState, ButtonConfig> = {
      [ButtonState.SELECT_TOKEN]: {
        label: 'Select an asset',
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
        label: 'Checking asset...',
        disabled: true,
        action: () => {},
      },
      [ButtonState.CREATING_TRUSTLINE]: {
        label: 'Enabling asset...',
        disabled: true,
        action: () => {},
      },
      [ButtonState.INSUFFICIENT_BALANCE]: {
        label: `Insufficient ${insufficientBalance ? 'balance' : 'liquidity'}`,
        disabled: true,
        action: () => {},
        color: 'error' as const,
      },
      [ButtonState.CREATE_TRUSTLINE]: {
        label: 'Enable asset',
        disabled: false,
        action: handleCreateTrustline,
        variant: 'contained' as const,
      },
      [ButtonState.SUBMIT]: {
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
    if (!selectedToken) return;

    setTrustlineState((prev) => ({
      ...prev,
      selected: {
        ...prev.selected,
        creating: trustlineState.selected.needs,
      },
      usdc: {
        ...prev.usdc,
        creating: trustlineState.usdc.needs,
      },
    }));
    setSwapError(null);

    try {
      if (trustlineState.usdc.needs) {
        await addTrustLine('USDC', constants.StellarConfig.USDC_ISSUER);
      }
      if (trustlineState.selected.needs) {
        await addTrustLine(selectedToken.symbol, constants.StellarConfig.NORMAL_ISSUER);
      }

      // After successful trustline creation, check status again
      await checkTrustlineStatus();
      enqueueSnackbar(t('Asset enabled successfully!'), { variant: 'success' });
    } catch (error) {
      setSwapError('Failed to enable asset(s)');
    } finally {
      setTrustlineState((prev) => ({
        ...prev,
        selected: {
          ...prev.selected,
          creating: false,
        },
        usdc: {
          ...prev.usdc,
          creating: false,
        },
      }));
    }
  };

  // Max the token (for buying or selling)
  const handleMaxClick = () => {
    if (selectedToken && usdcToken) {
      if (tradeDirection === 'buy') {
        // For buying: use USDC balance as the max amount
        setFiatAmount(usdcToken.balance);
      } else {
        // For selling: convert token balance to fiat value
        const maxFiatValue = BigNumber(selectedToken.balance).multipliedBy(selectedToken.price);
        setFiatAmount(maxFiatValue.toFixed(2));
      }
    }
  };

  /**
   * Executes the trade transaction.
   * This function signs and sends the transaction using WalletConnect or Signer.
   *
   * @async
   */
  const checkIfTradeAllowed = async () => {
    setSwapError(null);
    if (!selectedToken || !pair) return false;
    return true;
  };

  // Settle trade function - executes the optimal trade route
  const settleTrade = async (): Promise<void> => {
    if (!selectedToken || !usdcToken || !pair) {
      setSwapError(
        !selectedToken ? 'No token selected' : !usdcToken ? 'USDC not available' : 'Pair not found'
      );
      return;
    }

    try {
      const allowed = await checkIfTradeAllowed();
      if (!allowed) return;

      // Re-fetch treasury balances for fresh liquidity data at trade time
      const freshBalances = await fetchTreasuryBalances(pair.pairAddress);
      if (!freshBalances) {
        setSwapError('Unable to verify liquidity. Please try again.');
        return;
      }

      const isLong = selectedToken.contract === pair.tokens.long;
      const longToken = tokensByAddress[pair.tokens.long];
      const shortToken = tokensByAddress[pair.tokens.short];

      // Calculate amounts
      const usdcAmount = BigNumber(fiatAmount).dividedBy(usdcToken.price);
      const tokenAmount = BigNumber(fiatAmount).dividedBy(
        isLong ? longToken.price : shortToken.price
      );

      // Calculate required amount for fresh route determination
      let requiredAmount: BigNumber;
      if (tradeDirection === 'buy') {
        requiredAmount = usdcAmount
          .multipliedBy(usdcToken.price)
          .dividedBy(isLong ? longToken.price : shortToken.price);
      } else {
        requiredAmount = tokenAmount
          .multipliedBy(isLong ? longToken.price : shortToken.price)
          .dividedBy(usdcToken.price);
      }

      // Determine fresh route at trade time
      const route = determineTradeRoute({
        tradeDirection,
        isLongToken: isLong,
        requiredAmount,
        treasuryBalances: freshBalances,
      });

      // Execute based on route type
      switch (route.type) {
        case 'buy_long_direct':
          await buyLong({ pair: pair.pairAddress, usdc_in: Number(usdcAmount), min_long_out: 0 });
          break;
        case 'buy_long_mint':
          enqueueSnackbar(t('buy_long_mint not yet live'), { variant: 'info' });
          // await buyLongMint({
          //   pair: pair.pairAddress,
          //   asset: pair.asset,
          //   usdc_in: usdcAmount,
          //   collateralPerPair: BigNumber(format.fTokenAmount(pair.collateral.collateralPerPair, 7)),
          // });
          break;
        case 'buy_short_direct':
          await buyShort({ pair: pair.pairAddress, usdc_in: Number(usdcAmount), min_short_out: 0 });
          break;
        case 'buy_short_mint':
          enqueueSnackbar(t('buy_short_mint not yet live'), { variant: 'info' });
          // await buyShortMint({
          //   pair: pair.pairAddress,
          //   asset: pair.asset,
          //   usdc_in: usdcAmount,
          //   collateralPerPair: BigNumber(format.fTokenAmount(pair.collateral.collateralPerPair, 7)),
          // });
          break;
        case 'sell_long_direct':
          await sellLong({
            pair: pair.pairAddress,
            long_in: Number(tokenAmount),
            min_usdc_out: 0,
          });
          break;
        case 'sell_long_redeem':
          enqueueSnackbar(t('sell_long_redeem not yet live'), { variant: 'info' });
          // await sellLongRedeem({
          //   pair: pair.pairAddress,
          //   asset: pair.asset,
          //   long_in: Number(tokenAmount),
          // });
          break;
        case 'sell_short_direct':
          await sellShort({
            pair: pair.pairAddress,
            short_in: Number(tokenAmount),
            min_usdc_out: 0,
          });
          break;
        case 'sell_short_redeem':
          enqueueSnackbar(t('sell_short_redeem not yet live'), { variant: 'info' });
          // await sellShortRedeem({
          //   pair: pair.pairAddress,
          //   asset: pair.asset,
          //   short_in: Number(tokenAmount),
          // });
          break;
        default:
          throw new Error(`Unknown trade route: ${route.type}`);
      }

      handleClose();
      setFiatAmount('0');
    } catch (error) {
      console.log(error);
      posthog.captureException(error);
      setSwapError('Error during trade');
    }
  };

  // Main button with multiple states
  const persist = usePersistStore();
  const isConnected = !!persist.wallet.address;

  const getInfoAccordionAlerts = useCallback((): InfoAccordionAlert[] => {
    const alerts: InfoAccordionAlert[] = [];

    if (insufficientBalance && selectedToken && usdcToken) {
      alerts.push({
        title: `Not enough ${tradeDirection === 'buy' ? 'USD' : selectedToken.symbol} to trade`,
        icon: 'solar:danger-triangle-bold',
      });
    }
    if (insufficientLiquidity && selectedToken && tradeRoute) {
      alerts.push({
        title: tradeRoute.label,
        icon: 'solar:routing-2-bold',
      });
    }

    return alerts;
  }, [
    selectedToken,
    usdcToken,
    tradeDirection,
    insufficientBalance,
    insufficientLiquidity,
    tradeRoute,
  ]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {/* Token Section */}
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
                <Switch
                  checked={tradeDirection === 'buy'}
                  color="success"
                  onClick={() => {
                    setTradeDirection(tradeDirection === 'buy' ? 'sell' : 'buy');
                  }}
                />
                {t('Buy')}
              </Typography>
              <InputBase
                type="number"
                value={fiatAmount}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                disabled={getButtonState() == ButtonState.CREATE_TRUSTLINE}
                startAdornment={
                  <InputAdornment position="start">
                    <Typography
                      sx={{
                        fontSize: 'var(--h3-size, 32px)',
                        fontWeight: 'var(--h3-weight, 700)',
                        color:
                          fiatAmount === '0' || fiatAmount === ''
                            ? theme.palette.text.secondary
                            : theme.palette.text.primary,
                      }}
                    >
                      $
                    </Typography>
                  </InputAdornment>
                }
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
                    : fiatAmount === '0' || fiatAmount === ''
                      ? theme.palette.text.secondary
                      : theme.palette.text.primary,
                  flexGrow: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'clip',
                  whiteSpace: 'nowrap',
                }}
              />
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
            {selectedToken ? (
              <Box
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}
              >
                <SwapSendPopupButton
                  imgUrl={selectedToken.icon ?? getCryptoIconUrl(selectedToken.symbol)}
                  label={selectedToken.symbol}
                  onClick={() => {
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
                      {tradeDirection === 'buy'
                        ? BigNumber(usdcToken?.balance || '0').toFixed(2)
                        : BigNumber(selectedToken.balance).toFixed(selectedToken.decimals)}{' '}
                      <Box
                        component="span"
                        sx={{
                          color: insufficientBalance
                            ? theme.palette.error.main
                            : theme.palette.text.primary,
                        }}
                      >
                        {tradeDirection === 'buy' ? 'USDC' : selectedToken?.symbol}
                      </Box>
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleMaxClick}
                    disabled={loading}
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
                label="Select asset"
                onClick={() => {
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
              <LoadingButton
                fullWidth
                variant={buttonConfig.variant || 'contained'}
                size="large"
                onClick={handleMainButtonClick}
                disabled={buttonConfig.disabled}
                color={buttonConfig.color}
                loading={loading}
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
              </LoadingButton>
              {buttonState === ButtonState.ZERO_BALANCE && (
                <>
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    {t('You must fund your account before investing.')}
                  </Alert>
                  <Stack direction="row" spacing={1} width="100%" mt={2}>
                    <Button
                      variant="soft"
                      color="success"
                      fullWidth
                      size="large"
                      startIcon={<Iconify icon="solar:wad-of-money-bold" />}
                      onClick={() => setModalView(ModalType.ON_RAMP, true)}
                    >
                      {t('Deposit cash')}
                    </Button>

                    <Button
                      variant="soft"
                      color="primary"
                      fullWidth
                      size="large"
                      startIcon={<Iconify icon="solar:wallet-bold" />}
                      onClick={() => setModalView(ModalType.DEPOSIT_CRYPTO, true)}
                    >
                      {t('Deposit crypto')}
                    </Button>
                  </Stack>
                </>
              )}
            </>
          );
        })()
      ) : (
        <WalletGate buttonText="Login to trade" fullWidth>
          {null}
        </WalletGate>
      )}

      {/* Additional box with info */}
      {!loading && selectedToken && pair && (
        <InfoAccordion
          highlights={usdcToken ? [getConversionTextScaled(usdcToken, selectedToken, pair)] : []}
          alerts={getInfoAccordionAlerts()}
          rows={[
            {
              title: `Fee (${fPercent(0.3)})`,
              value: fCurrencyTwoDecimals(fiatAmountVal * (30 / 10000)),
            },
            {
              title: 'Available Liquidity',
              value: fCurrencyTwoDecimals(availableLiquidity),
            },
            ...(tradeRoute
              ? [
                  {
                    title: 'Route',
                    value: tradeRoute.label,
                  },
                ]
              : []),
          ]}
        />
      )}

      {reviewOpen && (
        <SwapReview
          open={reviewOpen}
          onClose={handleReviewClose}
          tradeDirection={tradeDirection}
          selectedToken={selectedToken!}
          fiatAmount={fiatAmount}
          feePercentage={30}
          sellFiatValue={fiatAmountVal}
          onSubmit={() => settleTrade()}
          loading={loading}
          error={swapError}
        />
      )}

      {/* Token Picker Popup */}
      <PickToken
        open={open}
        onClose={handleClose}
        tokens={tradableTokens}
        onTokenSelect={handleTokenSelect}
      />
    </Box>
  );
};

export default TradeCard;
