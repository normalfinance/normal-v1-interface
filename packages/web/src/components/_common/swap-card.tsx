'use client';

import type { CardProps } from '@mui/material';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';
import { constants } from '@normalfinance/utils';
import { useDebounce } from '@/hooks/use-debounce';

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

import { WalletGate } from './wallet-gate';
import { Iconify } from '../template/iconify';
import { useAquaSwap } from '@/hooks/stellar/use-aqua-swap';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';
import { useSnackbar } from '@/components/template/snackbar';

// ----------------------------------------------------------------------

interface SwapCardProps extends CardProps {}

// Token definitions for XLM and USDC
const TOKENS = {
  XLM: {
    symbol: 'XLM',
    name: 'Stellar Lumens',
    address: constants.StellarConfig.XLM_ADDRESS || 'native',
    decimals: 7,
    icon: 'cryptocurrency:xlm',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: constants.StellarConfig.USDC_ADDRESS,
    decimals: 7,
    icon: 'cryptocurrency-color:usdc',
  },
};

// ----------------------------------------------------------------------

const SwapCard: React.FC<SwapCardProps> = ({ ...other }) => {
  const { t } = useTranslate();
  const { wallet, tokenState } = usePersistStore();

  const { quote, quoteLoading, loading, error, getQuote, executeSwap, clearQuote } = useAquaSwap();
  const { enqueueSnackbar } = useSnackbar();
  const { hasUsdcTrustline, refetch: refetchAccountStatus } = useAccountStatus(wallet.address);
  const { addTrustLine, txBroadcasting: isAddingTrustline } = useTrustLine();

  const [tokenIn, setTokenIn] = useState<'XLM' | 'USDC'>('XLM');
  const [tokenOut, setTokenOut] = useState<'XLM' | 'USDC'>('USDC');
  const [amountIn, setAmountIn] = useState('');
  const debouncedAmountIn = useDebounce(amountIn, 500);

  // Get user balances by looking up tokens in the array by symbol
  const xlmBalance = tokenState.tokens.find((t) => t.symbol === 'XLM')?.balance || '0';
  const usdcBalance = tokenState.tokens.find((t) => t.symbol === 'USDC')?.balance || '0';

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
    await executeSwap(quote);
    setAmountIn('');
  }, [quote, executeSwap]);

  // Calculate exchange rate
  const exchangeRate =
    quote && parseFloat(quote.amountIn) > 0
      ? (parseFloat(quote.amountOut) / parseFloat(quote.amountIn)).toFixed(6)
      : null;

  const isInsufficientBalance = parseFloat(amountIn) > parseFloat(inputBalance);
  const needsTrustline = tokenOut === 'USDC' && !hasUsdcTrustline;

  const handleAddTrustline = useCallback(async () => {
    const usdcIssuer = constants.StellarConfig.USDC_ISSUER;
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

        {/* Exchange Rate */}
        {exchangeRate && (
          <Box sx={{ px: 1 }}>
            <Typography variant="caption" color="text.secondary">
              1 {tokenIn} = {exchangeRate} {tokenOut}
            </Typography>
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
          {needsTrustline ? (
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
