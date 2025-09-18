import type { CardProps } from '@mui/material';
import type { SwapFeeInfo } from '@/types/swap-fee-info';
import type { SwapQueryParams } from '@/types/query-params';
import type { StateToken as Token } from '@normalfinance/types';

import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { getConversionText } from '@/utils/conversion-helpers';
import { isWalletVerifiedForSession } from '@/utils/wallet-proof';
import { useProofDialogStore } from '@/stores/proof-dialog-store';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useSwap, BuyDirection, useTrustLine, SellDirection } from '@/hooks';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
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

enum ButtonState {
  SELECT_TOKEN = 'SELECT_TOKEN',
  ENTER_AMOUNT = 'ENTER_AMOUNT',
  CHECKING_TRUSTLINE = 'CHECKING_TRUSTLINE',
  CREATE_TRUSTLINE = 'CREATE_TRUSTLINE',
  CREATING_TRUSTLINE = 'CREATING_TRUSTLINE',
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
  tokensList?: Token[];
  swapFeeInfo?: SwapFeeInfo;
  queryParams?: SwapQueryParams;
}

const SwapCard: React.FC<SwapCardProps> = ({ tokensList = [], queryParams }) => {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  const appStore = useAppStore();
  const storeTokens = appStore.tokens;

  const storePersist = usePersistStore();
  const { publicKey } = useStellarWalletsKit();

  const { addTrustLine } = useTrustLine();
  const { onEstimateSwap, onSwap } = useSwap();

  const [tokens, setTokens] = useState<Token[]>([]);
  const [sellToken, setSellToken] = useState<Token | null>(null);
  const [buyToken, setBuyToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState<string>('0');

  const [open, setOpen] = useState(false);
  const [activeButton, setActiveButton] = useState<'sell' | 'buy' | ''>('');
  const [reviewOpen, setReviewOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [quoteFetched, setQuoteFetched] = useState(false);
  const [insufficientBalance, setInsufficientBalance] = useState(false);

  const [swapError, setSwapError] = useState<string | null>(null);
  const [creatingTrustline, setCreatingTrustline] = useState<boolean>(false);
  const [needsTrustline, setNeedsTrustline] = useState<boolean>(false);
  const [checkingTrustline, setCheckingTrustline] = useState<boolean>(false);

  const [buyAmount, setBuyAmount] = useState<number>(0);

  const connectedAddress = storePersist.wallet.address || publicKey || null;
  const isVerified = !!connectedAddress && isWalletVerifiedForSession(connectedAddress);
  const isConnected = !!connectedAddress;

  const { ensureOpen, close } = useProofDialogStore();
  const proofOpenedOnceRef = useRef(false);

  // Keep onEstimateSwap stable via ref so effects don't loop
  const estimateRef = useRef(onEstimateSwap);
  useEffect(() => {
    estimateRef.current = onEstimateSwap;
  }, [onEstimateSwap]);

  // constants used by UI
  const maxSlippage = 10_000;
  const priceImpact = 0;
  const networkFee = '0';

  const sellVal = parseFloat(amount) || 0;
  const sellFiatValue = sellToken && sellVal > 0 ? sellVal * sellToken.usdValue : 0;

  // Proof dialog auto-open on connect but not verified
  useEffect(() => {
    if (!connectedAddress) return;
    if (isVerified) {
      proofOpenedOnceRef.current = false;
      return;
    }
    if (!proofOpenedOnceRef.current) {
      ensureOpen('drawer');
      proofOpenedOnceRef.current = true;
    }
  }, [connectedAddress, isVerified, ensureOpen]);

  // Reset everything on disconnect
  useEffect(() => {
    if (isConnected) return;
    proofOpenedOnceRef.current = false;
    close?.();
    setTokens([]);
    setSellToken(null);
    setBuyToken(null);
    setAmount('0');
    setIsLoading(false);
    setQuoteFetched(false);
    setInsufficientBalance(false);
    setBuyAmount(0);
    setSwapError(null);
    setCreatingTrustline(false);
    setNeedsTrustline(false);
    setCheckingTrustline(false);
  }, [isConnected, close]);

  // Refresh tokens after wallet verification
  useEffect(() => {
    const onVerified = (e: any) => {
      if (!connectedAddress || e?.detail?.address !== connectedAddress) return;
      appStore
        .getAllTokens()
        .catch((err) => console.error('[SwapCard] getAllTokens after verify error:', err));
    };
    window.addEventListener('nf:walletVerified', onVerified);
    return () => window.removeEventListener('nf:walletVerified', onVerified);
  }, [connectedAddress, appStore]);

  // Load tokens & set default sell token
  useEffect(() => {
    if (!isVerified) {
      setTokens([]);
      setSellToken(null);
      setBuyToken(null);
      setAmount('0');
      setIsLoading(false);
      setQuoteFetched(false);
      setInsufficientBalance(false);
      setBuyAmount(0);
      setSwapError(null);
      setCreatingTrustline(false);
      setNeedsTrustline(false);
      setCheckingTrustline(false);
      return;
    }
    const source = tokensList && tokensList.length ? tokensList : storeTokens;
    if (!source || source.length === 0) return;

    setTokens(source);

    if (!sellToken) {
      const xlm = source.find((tok) => tok.symbol === 'XLM');
      setSellToken(xlm || source[0]);
    }
  }, [isVerified, tokensList, storeTokens, sellToken]);

  // Apply initial query params (token_in/out & in_amount)
  useEffect(() => {
    if (!queryParams || tokens.length === 0) return;

    if (queryParams.token_in) {
      const sellTokenFromQuery = tokens.find(
        (tok) => tok.symbol.toLowerCase() === queryParams.token_in?.toLowerCase()
      );
      if (sellTokenFromQuery) setSellToken(sellTokenFromQuery);
    }

    if (queryParams.token_out) {
      const buyTokenFromQuery = tokens.find(
        (tok) => tok.symbol.toLowerCase() === queryParams.token_out?.toLowerCase()
      );
      if (buyTokenFromQuery) setBuyToken(buyTokenFromQuery);
    }

    if (queryParams.in_amount) {
      setAmount(queryParams.in_amount);
    }
  }, [queryParams, tokens]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const handleReviewClose = () => setReviewOpen(false);

  // Trustline check (only for non-XLM buy token)
  const checkTrustlineStatus = useCallback(async (): Promise<void> => {
    if (!buyToken || buyToken.symbol === 'XLM' || !connectedAddress) {
      setNeedsTrustline(false);
      return;
    }
    setCheckingTrustline(true);
    try {
      const trustlineStatus = await checkTrustline(
        connectedAddress,
        buyToken.symbol,
        constants.StellarConfig.NORMAL_TOKEN_ISSUER
      );
      setNeedsTrustline(!trustlineStatus.exists);
    } catch {
      setNeedsTrustline(false);
    } finally {
      setCheckingTrustline(false);
    }
  }, [buyToken, connectedAddress]);

  useEffect(() => {
    if (!isVerified) return;
    void checkTrustlineStatus();
  }, [checkTrustlineStatus, isVerified]);

  // Debounced quote calculation WITHOUT depending on unstable functions
  const quoteDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    const val = parseFloat(amount) || 0;
    const hasTokens = Boolean(sellToken && buyToken);

    if (quoteDebounceRef.current) {
      clearTimeout(quoteDebounceRef.current);
      quoteDebounceRef.current = null;
    }

    if (!hasTokens || val <= 0) {
      setIsLoading(false);
      setQuoteFetched(false);
      setInsufficientBalance(false);
      setBuyAmount(0);
      setSwapError(null);
    } else {
      setIsLoading(true);
      setQuoteFetched(false);
      setSwapError(null);

      quoteDebounceRef.current = window.setTimeout(async () => {
        try {
          // Non-null assertions are safe here because of hasTokens branch.
          const asset = buyToken!.symbol === 'XLM' ? sellToken!.symbol : buyToken!.symbol;
          const direction = sellToken!.symbol === 'XLM' ? BuyDirection : SellDirection;

          await estimateRef.current({
            asset: format.formatNormalToken(asset, 'without-n'),
            direction,
            in_amount: amount,
          });

          // temporary display calc
          const potentialBuyAmount = val * (sellToken!.usdValue / buyToken!.usdValue);
          setBuyAmount(potentialBuyAmount);

          setInsufficientBalance(val > (sellToken!.balance ?? 0));
          setQuoteFetched(true);
        } catch {
          setQuoteFetched(false);
        } finally {
          setIsLoading(false);
        }
      }, 400);
    }

    return () => {
      if (quoteDebounceRef.current) {
        clearTimeout(quoteDebounceRef.current);
        quoteDebounceRef.current = null;
      }
    };
  }, [sellToken?.id, buyToken?.id, amount]);

  // Handlers
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

  const handleTokenSelect = (token: Token) => {
    if (activeButton === 'sell') {
      if (buyToken && buyToken.id === token.id) setBuyToken(null);
      setSellToken(token);

      if (token.symbol !== 'XLM') {
        if (!buyToken || buyToken.symbol !== 'XLM') {
          const xlmToken = tokens.find((tok) => tok.symbol === 'XLM');
          if (xlmToken) setBuyToken(xlmToken);
        }
      } else {
        if (buyToken && !buyToken.symbol.startsWith('n')) setBuyToken(null);
      }
    } else if (activeButton === 'buy') {
      if (sellToken && sellToken.id === token.id) setSellToken(null);
      setBuyToken(token);

      if (token.symbol !== 'XLM') {
        if (!sellToken || sellToken.symbol !== 'XLM') {
          const xlmToken = tokens.find((tok) => tok.symbol === 'XLM');
          if (xlmToken) setSellToken(xlmToken);
        }
      } else {
        if (sellToken && !sellToken.symbol.startsWith('n')) setSellToken(null);
      }
    }
    handleClose();
  };

  const handleInvertTokens = () => {
    if (!sellToken || !buyToken) return;

    const oldSellToken = sellToken;
    const oldBuyToken = buyToken;
    const oldBuyAmount = buyAmount;

    setSellToken(oldBuyToken);
    setBuyToken(oldSellToken);

    const newTypedAmount = oldBuyAmount > 0 ? oldBuyAmount.toFixed(6).replace(',', '.') : '0';
    setAmount(newTypedAmount);

    setIsLoading(false);
    setQuoteFetched(false);
    setInsufficientBalance(false);
    setBuyAmount(0);
  };

  const handleMaxClick = () => {
    if (sellToken) {
      setAmount((sellToken.balance ?? 0).toString());
    }
  };

  const handleCreateTrustline = async () => {
    if (!buyToken || buyToken.symbol === 'XLM') return;

    setCreatingTrustline(true);
    setSwapError(null);

    try {
      await addTrustLine(buyToken.symbol, constants.StellarConfig.NORMAL_TOKEN_ISSUER);
      await checkTrustlineStatus();
    } catch (err) {
      setSwapError('Failed to create trustline');
      console.error('Trustline creation error:', err);
    } finally {
      setCreatingTrustline(false);
    }
  };

  const checkIfSwapAllowed = async () => {
    setSwapError(null);
    if (!sellToken || !buyToken) return false;
    if (!isVerified) {
      setSwapError(t('Please verify wallet ownership first.'));
      if (!proofOpenedOnceRef.current) {
        ensureOpen('drawer');
        proofOpenedOnceRef.current = true;
      }
      return false;
    }
    return true;
  };

  const doSwap = async (): Promise<void> => {
    if (!sellToken || !buyToken || !sellToken.id || !buyToken.id) return;

    try {
      const allowed = await checkIfSwapAllowed();
      if (!allowed) return;

      if (buyToken.symbol !== 'XLM') {
        const walletAddress = connectedAddress;
        if (!walletAddress) {
          setSwapError(t('No wallet connected'));
          return;
        }

        const trustlineStatus = await checkTrustline(
          walletAddress,
          buyToken.symbol,
          constants.StellarConfig.NORMAL_TOKEN_ISSUER
        );

        if (!trustlineStatus.exists) {
          setSwapError(t('Trustline required before swap. Please create trustline first.'));
          return;
        }
      }

      const asset = buyToken.symbol === 'XLM' ? sellToken.symbol : buyToken.symbol;
      const direction = sellToken.symbol === 'XLM' ? BuyDirection : SellDirection;

      await onSwap({
        asset: format.formatNormalToken(asset, 'without-n'),
        direction,
        in_amount: Number(amount),
        out_min: Number(0),
      });

      setTimeout(async () => {
        await appStore.fetchNativeTokenInfo();
      }, 7000);
    } catch (_err) {
      setSwapError(t('Error during swap transaction'));
    }
  };

  // Button state machine
  const getButtonState = (): ButtonState => {
    if (!sellToken || !buyToken) return ButtonState.SELECT_TOKEN;
    if (checkingTrustline) return ButtonState.CHECKING_TRUSTLINE;
    if (creatingTrustline) return ButtonState.CREATING_TRUSTLINE;
    if (needsTrustline && buyToken.symbol !== 'XLM') return ButtonState.CREATE_TRUSTLINE;
    if (sellVal <= 0) return ButtonState.ENTER_AMOUNT;
    if (isLoading) return ButtonState.FINALIZING_QUOTE;
    if (quoteFetched) {
      if (insufficientBalance) return ButtonState.INSUFFICIENT_BALANCE;
      return ButtonState.REVIEW;
    }
    return ButtonState.ENTER_AMOUNT;
  };

  const getButtonConfig = (state: ButtonState): ButtonConfig => {
    const noop = () => {};
    switch (state) {
      case ButtonState.SELECT_TOKEN:
        return { label: t('Select a token'), disabled: true, action: noop };
      case ButtonState.ENTER_AMOUNT:
        return { label: t('Enter an amount'), disabled: true, action: noop };
      case ButtonState.CHECKING_TRUSTLINE:
        return { label: t('Checking trustline...'), disabled: true, action: noop };
      case ButtonState.CREATING_TRUSTLINE:
        return { label: t('Creating trustline...'), disabled: true, action: noop };
      case ButtonState.FINALIZING_QUOTE:
        return { label: t('Finalizing quote...'), disabled: true, action: noop };
      case ButtonState.INSUFFICIENT_BALANCE:
        return {
          label: `${t('Insufficient')} ${sellToken?.symbol || ''}`,
          disabled: true,
          action: noop,
          color: 'error',
        };
      case ButtonState.CREATE_TRUSTLINE:
        return {
          label: t('Create Trustline'),
          disabled: false,
          action: handleCreateTrustline,
          variant: 'contained',
        };
      case ButtonState.REVIEW:
        return {
          label: t('Review'),
          disabled: false,
          action: () => setReviewOpen(true),
          variant: 'contained',
        };
      default:
        return { label: t('Enter an amount'), disabled: true, action: noop };
    }
  };

  const handleMainButtonClick = () => {
    const state = getButtonState();
    const config = getButtonConfig(state);
    config.action();
  };

  // Token list filtering with XLM <-> n* pairing rule
  const filteredTokens = useMemo((): Token[] => {
    const onlyAllowed = (tok: Token) => tok.symbol === 'XLM' || tok.symbol.startsWith('n');

    if (activeButton === 'sell') {
      if (!buyToken) return tokens.filter(onlyAllowed);
      if (buyToken.symbol === 'XLM') return tokens.filter((tok) => tok.symbol.startsWith('n'));
      if (buyToken.symbol.startsWith('n')) return tokens.filter((tok) => tok.symbol === 'XLM');
    } else if (activeButton === 'buy') {
      if (!sellToken) return tokens.filter(onlyAllowed);
      if (sellToken.symbol === 'XLM') return tokens.filter((tok) => tok.symbol.startsWith('n'));
      if (sellToken.symbol.startsWith('n')) return tokens.filter((tok) => tok.symbol === 'XLM');
    }
    return tokens.filter(onlyAllowed);
  }, [activeButton, tokens, sellToken, buyToken]);

  const buttonState = getButtonState();
  const buttonConfig = getButtonConfig(buttonState);

  const canReview =
    !!sellToken && !!buyToken && sellVal > 0 && quoteFetched && !isLoading && !insufficientBalance;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {/* invert */}
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

        {/* SELL */}
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
              sx={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, minWidth: 0 }}
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
                {fCurrency(sellFiatValue)}
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
                        {sellToken.symbol}
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
                label={t('Select token')}
                onClick={() => {
                  setActiveButton('sell');
                  handleOpen();
                }}
              />
            )}
          </Box>
        </Box>

        {/* BUY */}
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

            <Box sx={{ maxWidth: '100%', overflowX: 'auto', whiteSpace: 'nowrap' }}>
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
              {buyToken ? fCurrency(buyToken.usdValue * buyAmount) : '$0'}
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
                label={t('Select token')}
                onClick={() => {
                  setActiveButton('buy');
                  handleOpen();
                }}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* error */}
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

      {/* main button / connect gate */}
      {isConnected ? (
        <Button
          fullWidth
          variant={buttonConfig.variant || 'contained'}
          size="large"
          onClick={handleMainButtonClick}
          disabled={!canReview}
          color={buttonConfig.color}
          sx={{
            backgroundColor: buttonConfig.color === 'error' ? undefined : 'rgba(148,123,255,0.29)',
            color: buttonConfig.color === 'error' ? undefined : '#6E4BFF',
            '&:hover': {
              backgroundColor:
                buttonConfig.color === 'error' ? undefined : 'rgba(148,123,255,0.20)',
            },
            borderRadius: '20px',
          }}
        >
          {buttonConfig.label}
        </Button>
      ) : (
        <WalletGate
          buttonText="Connect Wallet to Swap"
          fullWidth
          variant="soft"
          color="secondary"
          size="large"
          sx={{ borderRadius: 2.5 }}
        />
      )}

      {/* fees */}
      {quoteFetched && !isLoading && (
        <FeeInfoAccordion
          conversionText={sellToken && buyToken ? getConversionText(sellToken, buyToken) : ''}
          insufficientBalance={insufficientBalance}
          sellToken={sellToken || undefined}
          poolFee={0.3}
          networkCost={0}
          priceImpact={priceImpact}
          maxSlippage={maxSlippage}
          sellFiatValue={sellFiatValue}
        />
      )}

      {/* review */}
      {reviewOpen && sellToken && buyToken && (
        <SwapReview
          open={reviewOpen}
          onClose={handleReviewClose}
          sellToken={sellToken}
          buyToken={buyToken}
          sellAmount={amount}
          buyAmount={buyAmount}
          feePercentage="0.3"
          networkCost={networkFee}
          priceImpact={priceImpact}
          maxSlippage={maxSlippage}
          sellFiatValue={sellFiatValue}
          onSubmit={() => void doSwap()}
        />
      )}

      {/* token picker */}
      <PickToken
        open={open}
        onClose={handleClose}
        buttonSource={activeButton}
        tokens={filteredTokens}
        onTokenSelect={handleTokenSelect}
      />
    </Box>
  );
};

export default SwapCard;
