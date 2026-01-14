import type { CardProps } from '@mui/material';
import type { SwapQueryParams } from '@/types/query-params';
import type { Pair, Token, ButtonConfig, TrustlineState } from '@normalfinance/types';

import { paths } from '@/routes/paths';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { usePersistStore } from '@normalfinance/state';
import { useTrade, useTreasury, useTrustLine } from '@/hooks';
import { getConversionText } from '@/utils/conversion-helpers';
import React, { useState, useEffect, useCallback } from 'react';
import { fPercent, fCurrencyTwoDecimals } from '@/utils/format-number';
import { TokenAmountButtonState as ButtonState } from '@normalfinance/types';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import {
  constants,
  isNormalToken,
  checkTrustline,
  getCryptoIconUrl,
  sanitizeAmountInput,
} from '@normalfinance/utils';

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

import PickToken from './pick-token';
import SwapReview from './swap-review';
import { WalletGate } from './wallet-gate';
import InfoAccordion from './info-accordion';
import SwapSendPopupButton from './swap-send-popup-button';
import SwapSendEmptyPopupButton from './swap-send-empty-popup-button';
import { useSnackbar } from '@/components/template/snackbar';

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
}

const TradeCard: React.FC<TradeCardProps> = ({ queryParams, changeTab, ...other }) => {
  const theme = useTheme();
  const { t } = useTranslate('auto');
  const { enqueueSnackbar } = useSnackbar();

  const router = useRouter();

  const {
    wallet,
    updateTokenInfo,
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
    mintAndSellLong,
    mintAndSellShort,
    buyLongAndRedeem,
    buyShortAndRedeem,
  } = useTrade();

  const { fetchBalances: fetchTreasuryBalances } = useTreasury();

  const tradableTokens = tokens.filter((tkn) => isNormalToken(tkn));
  const usdcToken = tokens.find((tkn) => tkn.contract === constants.StellarConfig.USDC_ADDRESS);

  const [swapError, setSwapError] = useState<string | null>(null);

  const [trustlineState, setTrustlineState] =
    useState<TradeCardTrustlineState>(initialTrustlineState);

  // 1) States for tokens, default sell token is first in the list
  const [selectedToken, setSelectedToken] = useState<Token | null>(
    tradableTokens.length ? tradableTokens[0] : null
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

  // Compute the fiat value for the user's sell input
  const fiatAmountVal = parseFloat(fiatAmount) || 0;

  // const amountFiatValue =
  //   selectedToken && fiatAmountVal > 0
  //     ? BigNumber(selectedToken.price).multipliedBy(fiatAmountVal).toNumber()
  //     : 0;

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
    if (!pair || !selectedToken || !usdcToken) return;

    const availableBalances = await fetchTreasuryBalances(pair.pairAddress);
    if (!availableBalances) return;

    // Update insufficient liquidity
    const longToken = tokensByAddress[pair.tokens.long];
    const shortToken = tokensByAddress[pair.tokens.short];
    const isLong = selectedToken.contract === pair.tokens.long;

    if (tradeDirection === 'buy') {
      // Update the treasury balances
      setAvailableLiquidity(
        isLong ? availableBalances.long.toString() : availableBalances.short.toString()
      );

      const usdcValue = BigNumber(usdcToken.price).multipliedBy(fiatAmountVal);

      const numTokensBuying = usdcValue.dividedBy(isLong ? longToken.price : shortToken.price);

      const treasuryBalance = isLong ? availableBalances.long : availableBalances.short;
      setAvailableLiquidity(treasuryBalance.toString());
      if (treasuryBalance.lt(numTokensBuying)) {
        setInsufficientLiquidity(true);
      }
    } else {
      // Update the treasury balances
      setAvailableLiquidity(availableBalances.quote.toString());

      const tokenValue = BigNumber(isLong ? longToken.price : shortToken.price).multipliedBy(
        fiatAmountVal
      );

      const usdcRequired = tokenValue.dividedBy(usdcToken.price);
      setAvailableLiquidity(availableBalances.quote.toString());
      if (availableBalances.quote.lt(usdcRequired)) {
        setInsufficientLiquidity(true);
      }
    }
  }, [pair, fiatAmountVal, tradeDirection, selectedToken]);

  // 7) Auto-fetch quote whenever relevant fields change: selectedToken, amount
  useEffect(() => {
    // Clear old quote state each time we start a new calculation
    setLoading(false);
    setSwapError(null);

    setInsufficientBalance(false);
    setInsufficientLiquidity(false);

    setTrustlineState(initialTrustlineState);

    setPair(null);

    // Make sure we have a token and the store pairs
    if (!selectedToken || !Object.keys(pairByToken).length) {
      return;
    }

    setLoading(true);

    // Load the pair from the
    const pairFromStore = pairByToken[selectedToken.contract];
    setPair(pairFromStore);

    // If no pair exists for the selected token
    if (!pairFromStore) {
      // setSwapError('No pair found from store');
      return;
    }

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

    setLoading(false);

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

  // Max the token (if selling)
  const handleMaxClick = () => {
    if (selectedToken && usdcToken) {
      const maxFiatValue = BigNumber(selectedToken.balance)
        .multipliedBy(selectedToken.price)
        .dividedBy(usdcToken.price);
      setFiatAmount(maxFiatValue.toString());
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

  // New: settleTrade function for use in onSubmit (simplified - no trustline creation)
  const settleTrade = async (): Promise<void> => {
    // Validate required data before proceeding
    if (!selectedToken || !usdcToken || !pair) {
      const errorMsg = !selectedToken
        ? 'No token selected'
        : !usdcToken
          ? 'USDC token not available'
          : 'Trading pair not found for this token';
      setSwapError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      const allowed = await checkIfTradeAllowed();
      if (!allowed) {
        return;
      }

      // Now call the client-side onSwap (sign and submit)
      const isLong = selectedToken.contract === pair.tokens.long;
      const enoughLiquidity = false; // TODO:

      if (tradeDirection === 'buy') {
        const usdcAmount = BigNumber(fiatAmount).dividedBy(usdcToken.price);

        if (isLong) {
          if (enoughLiquidity) {
            await buyLong({
              pair: pair.pairAddress,
              usdc_in: Number(usdcAmount),
              min_long_out: 0,
            });
          } else {
            await mintAndSellShort({
              pair: pair.pairAddress,
              usdc_in: Number(usdcAmount),
            });
          }
        } else {
          if (enoughLiquidity) {
            await buyShort({
              pair: pair.pairAddress,
              usdc_in: Number(usdcAmount),
              min_short_out: 0,
            });
          } else {
            await mintAndSellLong({
              pair: pair.pairAddress,
              usdc_in: Number(usdcAmount),
            });
          }
        }
      } else {
        if (isLong) {
          const longToken = tokensByAddress[pair.tokens.long];
          const longAmount = BigNumber(fiatAmount).dividedBy(longToken.price);

          if (enoughLiquidity) {
            await sellLong({
              pair: pair.pairAddress,
              long_in: Number(longAmount),
              min_usdc_out: 0,
            });
          } else {
            await buyShortAndRedeem({
              pair: pair.pairAddress,
              long_in: Number(longAmount),
            });
          }
        } else {
          const shortToken = tokensByAddress[pair.tokens.short];
          const shortAmount = BigNumber(fiatAmount).dividedBy(shortToken.price);

          if (enoughLiquidity) {
            await sellShort({
              pair: pair.pairAddress,
              short_in: Number(shortAmount),
              min_usdc_out: 0,
            });
          } else {
            await buyLongAndRedeem({
              pair: pair.pairAddress,
              short_in: Number(shortAmount),
            });
          }
        }
      }

      setTimeout(async () => {
        await updateTokenInfo(selectedToken);
        await updateTokenInfo(usdcToken);
      }, 5000);
    } catch (error) {
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
        title: `Not enough ${tradeDirection === 'buy' ? usdcToken.symbol : selectedToken.symbol} to trade`,
        icon: 'solar:danger-triangle-bold',
      });
    }
    if (insufficientLiquidity && selectedToken && usdcToken) {
      alerts.push({
        title: `Not enough ${tradeDirection === 'buy' ? selectedToken.symbol : usdcToken.symbol} to trade`,
        icon: 'solar:danger-triangle-bold',
      });
    }

    return alerts;
  }, [selectedToken, usdcToken, tradeDirection, insufficientBalance, insufficientLiquidity]);

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
                {tradeDirection === 'sell' && (
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
                        {BigNumber(selectedToken.balance).toFixed(selectedToken.decimals)}{' '}
                        <Box
                          component="span"
                          sx={{
                            color: insufficientBalance
                              ? theme.palette.error.main
                              : theme.palette.text.primary,
                          }}
                        >
                          {selectedToken?.symbol}
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
                )}
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
                    {t('You must fund your account before investing.')}
                  </Alert>
                  <Stack direction="row" spacing={1} width="100%" mt={2}>
                    <Button
                      fullWidth
                      variant="soft"
                      color="info"
                      onClick={() =>
                        changeTab
                          ? changeTab('deposit')
                          : router.push(`${paths.invest}?tab=deposit`)
                      }
                    >
                      {t('Deposit')}
                    </Button>
                  </Stack>
                </>
              )}
            </>
          );
        })()
      ) : (
        <WalletGate buttonText="Login to invest" fullWidth>
          {null}
        </WalletGate>
      )}

      {/* Additional box with info */}
      {!loading && (
        <InfoAccordion
          highlights={[getConversionText(usdcToken!, selectedToken!)]}
          alerts={getInfoAccordionAlerts()}
          rows={[
            {
              title: `Total Fee (${fPercent(30)})`,
              value: fCurrencyTwoDecimals(fiatAmountVal * (30 / 10000)),
            },
            {
              title: 'Available Liquidity',
              value: fCurrencyTwoDecimals(availableLiquidity),
            },
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
