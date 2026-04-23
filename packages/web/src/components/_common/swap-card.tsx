'use client';

import type { CardProps } from '@mui/material';

import { useTranslate } from '@/locales';
import { useDebounce } from '@/hooks/use-debounce';
import { useStellarConfig } from '@/hooks';
import { useSwap } from '@/hooks/stellar/use-swap';
import { usePersistStore } from '@normalfinance/state';
import React, { useState, useEffect, useCallback } from 'react';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import { getXlmToken, getTokenBalance, getSwapUsdcToken } from '@/utils/token-selectors';

import {
  Box,
  Card,
  Stack,
  Button,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material';

import { useSnackbar } from '@/components/template/snackbar';

import { WalletGate } from './wallet-gate';
import { Iconify } from '../template/iconify';

// ----------------------------------------------------------------------

interface SwapCardProps extends CardProps {}

// ----------------------------------------------------------------------

const SwapCard: React.FC<SwapCardProps> = ({ ...other }) => {
  const { t } = useTranslate();
  const { wallet, tokenState } = usePersistStore();
  const config = useStellarConfig();

  const TOKENS = {
    XLM: {
      symbol: 'XLM',
      name: 'Stellar Lumens',
      address: config.XLM_ADDRESS || 'native',
      decimals: 7,
      icon: 'cryptocurrency:xlm',
    },
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      address: config.USDC_ADDRESS,
      decimals: 7,
      icon: 'cryptocurrency-color:usdc',
    },
  };

  const { quote, quoteLoading, loading, error, getQuote, executeSwap, clearQuote } = useSwap();
  const { enqueueSnackbar } = useSnackbar();
  const {
    isLoading: isCheckingAccount,
    accountExists,
    hasUsdcTrustline,
    refetch: refetchAccountStatus,
  } = useAccountStatus(wallet.address);
  const { addTrustLine, txBroadcasting: isAddingTrustline } = useTrustLine();

  const [tokenIn, setTokenIn] = useState<'XLM' | 'USDC'>('XLM');
  const [tokenOut, setTokenOut] = useState<'XLM' | 'USDC'>('USDC');
  const [amountIn, setAmountIn] = useState('');
  const debouncedAmountIn = useDebounce(amountIn, 500);

  // Swap uses canonical Stellar USDC from StellarConfig.USDC_ADDRESS, not Blend USDC.
  const xlmBalance = getTokenBalance(getXlmToken(tokenState.tokens));
  const usdcBalance = getTokenBalance(getSwapUsdcToken(tokenState.tokens));

  const inputBalance = tokenIn === 'XLM' ? xlmBalance : usdcBalance;
  const outputBalance = tokenOut === 'XLM' ? xlmBalance : usdcBalance;

  // Fetch quote when amount changes
  useEffect(() => {
    if (debouncedAmountIn && parseFloat(debouncedAmountIn) > 0) {
      getQuote(TOKENS[tokenIn].address, TOKENS[tokenOut].address, debouncedAmountIn);
    } else {
      clearQuote();
    }
  }, [debouncedAmountIn, tokenIn, tokenOut, getQuote, clearQuote]);

  // Handle token swap direction
  const handleSwapDirection = useCallback(() => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn(quote?.amountOut || '');
  }, [tokenIn, tokenOut, quote]);

  // Handle max button
  const handleMax = useCallback(() => {
    // Leave some XLM for fees if swapping XLM
    const maxAmount =
      tokenIn === 'XLM'
        ? Math.max(0, parseFloat(inputBalance) - 1).toFixed(7)
        : parseFloat(inputBalance).toFixed(7);
    setAmountIn(maxAmount);
  }, [tokenIn, inputBalance]);

  // Handle swap execution
  const handleSwap = useCallback(async () => {
    if (!quote) return;
    await executeSwap(quote, {
      tokenInSymbol: TOKENS[tokenIn].symbol,
      tokenOutSymbol: TOKENS[tokenOut].symbol,
    });
    setAmountIn('');
  }, [quote, executeSwap, tokenIn, tokenOut]);

  // Calculate exchange rate
  const exchangeRate =
    quote && parseFloat(quote.amountIn) > 0
      ? (parseFloat(quote.amountOut) / parseFloat(quote.amountIn)).toFixed(6)
      : null;

  const isInsufficientBalance = parseFloat(amountIn) > parseFloat(inputBalance);
  const needsAccountActivation = tokenOut === 'USDC' && !isCheckingAccount && !accountExists;
  const needsTrustline = tokenOut === 'USDC' && !isCheckingAccount && accountExists && !hasUsdcTrustline;

  const handleAddTrustline = useCallback(async () => {
    const usdcIssuer = config.USDC_ISSUER;
    if (!usdcIssuer) return;
    try {
      await addTrustLine('USDC', usdcIssuer);
      enqueueSnackbar(t('USDC trustline added successfully!'), { variant: 'success' });
      await refetchAccountStatus();
    } catch (err: any) {
      enqueueSnackbar(err.message || t('Failed to add USDC trustline'), { variant: 'error' });
    }
  }, [addTrustLine, refetchAccountStatus, enqueueSnackbar, t]);

  return (
    <Card
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: 'background.paper',
        ...other.sx,
      }}
      {...other}
    >
      <Typography variant="h6" sx={{ mb: 3 }}>
        {t('Swap')}
      </Typography>

      <Stack spacing={2}>
        {/* Input Token */}
        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {t('From')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('Balance')}: {parseFloat(inputBalance).toFixed(4)} {tokenIn}
            </Typography>
          </Stack>
          <TextField
            fullWidth
            type="number"
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            placeholder="0.00"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Iconify icon={TOKENS[tokenIn].icon} width={24} />
                    <Typography variant="subtitle2">{tokenIn}</Typography>
                  </Stack>
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Button size="small" onClick={handleMax} sx={{ minWidth: 'auto' }}>
                    {t('MAX')}
                  </Button>
                </InputAdornment>
              ),
            }}
            error={isInsufficientBalance}
            helperText={isInsufficientBalance ? t('Insufficient balance') : ''}
          />
        </Box>

        {/* Swap Direction Button */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <IconButton
            onClick={handleSwapDirection}
            sx={{
              bgcolor: 'action.hover',
              '&:hover': { bgcolor: 'action.selected' },
            }}
          >
            <Iconify icon="solar:transfer-vertical-bold" />
          </IconButton>
        </Box>

        {/* Output Token */}
        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {t('To')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('Balance')}: {parseFloat(outputBalance).toFixed(4)} {tokenOut}
            </Typography>
          </Stack>
          <TextField
            fullWidth
            type="number"
            value={quoteLoading ? '...' : quote?.amountOut || ''}
            placeholder="0.00"
            disabled
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Iconify icon={TOKENS[tokenOut].icon} width={24} />
                    <Typography variant="subtitle2">{tokenOut}</Typography>
                  </Stack>
                </InputAdornment>
              ),
              endAdornment: quoteLoading ? (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              ) : null,
            }}
          />
        </Box>

        {/* Exchange Rate + Fee Breakdown */}
        {quote && parseFloat(quote.amountIn) > 0 && (
          <Box
            sx={{
              px: 1.5,
              py: 1,
              borderRadius: 1,
              bgcolor: 'action.hover',
            }}
          >
            <Stack spacing={0.5}>
              {exchangeRate && (
                <Typography variant="caption" color="text.secondary">
                  1 {tokenIn} = {exchangeRate} {tokenOut}
                </Typography>
              )}
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  {t('Normal fee (0.5%)')}
                </Typography>
                <Typography variant="caption" fontWeight="medium">
                  -{parseFloat(quote.fee || '0').toFixed(4)} {tokenIn}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {t("You'll sign two transactions: the Normal fee and your swap.")}
              </Typography>
            </Stack>
          </Box>
        )}

        {/* Error Display */}
        {error && (
          <Typography variant="caption" color="error.main">
            {error}
          </Typography>
        )}

        {/* Swap Button */}
        <WalletGate buttonText={t('Connect wallet to swap')} fullWidth variant="contained">
          {needsAccountActivation ? (
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              {t(
                'Fund this account with at least 1 XLM to activate Stellar before adding a USDC trustline.'
              )}
            </Typography>
          ) : needsTrustline ? (
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                {t('A USDC trustline is required before swapping to USDC')}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                disabled={isAddingTrustline}
                onClick={handleAddTrustline}
                startIcon={
                  isAddingTrustline ? <CircularProgress size={20} color="inherit" /> : null
                }
              >
                {isAddingTrustline ? t('Adding Trustline...') : t('Add USDC Trustline')}
              </Button>
            </Stack>
          ) : (
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={
                !quote ||
                loading ||
                quoteLoading ||
                isCheckingAccount ||
                isInsufficientBalance ||
                !amountIn ||
                parseFloat(amountIn) <= 0
              }
              onClick={handleSwap}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading
                ? t('Swapping...')
                : isInsufficientBalance
                  ? t('Insufficient balance')
                  : !amountIn || parseFloat(amountIn) <= 0
                    ? t('Enter amount')
                    : t('Swap')}
            </Button>
          )}
        </WalletGate>
      </Stack>
    </Card>
  );
};

export default SwapCard;
