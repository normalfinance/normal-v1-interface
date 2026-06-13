'use client';

import type { CardProps } from '@mui/material';

import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { useDebounce } from '@/hooks/use-debounce';
import { useSwap } from '@/hooks/stellar/use-swap';
import { usePersistStore } from '@normalfinance/state';
import React, { useState, useEffect, useCallback } from 'react';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import { getXlmToken, getTokenBalance, getSwapUsdcToken } from '@/utils/token-selectors';

import {
  Box,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';

import { useSnackbar } from '@/components/template/snackbar';

import { WalletGate } from './wallet-gate';
import { Iconify } from '../template/iconify';

// ----------------------------------------------------------------------

interface SwapCardProps extends CardProps {
  /** Token to sell on first render (deep link, e.g. /swap?from=USDC). */
  initialTokenIn?: 'XLM' | 'USDC';
}

// ----------------------------------------------------------------------

const TokenRow: React.FC<{
  label: string;
  symbol: string;
  iconKey: string;
  balance: string;
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  onMax?: () => void;
}> = ({ label, symbol, iconKey, balance, value, onChange, disabled, loading, error, onMax }) => (
  <Box
    sx={{
      p: '16px',
      borderRadius: '16px',
      bgcolor: disabled ? '#F4F4F7' : '#FAFAFB',
      border: '1px solid',
      borderColor: error ? 'error.main' : 'rgba(10,10,15,0.08)',
      transition: 'border-color 150ms ease',
      ...(!disabled && { '&:focus-within': { borderColor: 'rgba(10,10,15,0.24)' } }),
    }}
  >
    {/* Top row: label + balance */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '10px' }}>
      <Typography sx={{ fontSize: '12px', fontWeight: 500, color: 'rgba(10,10,15,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)' }}>
        Balance: <Box component="span" sx={{ color: '#0A0A0F', fontWeight: 600 }}>{parseFloat(balance).toFixed(4)}</Box> {symbol}
      </Typography>
    </Box>

    {/* Bottom row: token pill + amount */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          px: '12px',
          py: '8px',
          borderRadius: '100px',
          bgcolor: '#FFFFFF',
          border: '1px solid rgba(10,10,15,0.08)',
          flexShrink: 0,
        }}
      >
        <Iconify icon={iconKey} width={20} />
        <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#0A0A0F', letterSpacing: '-0.01em' }}>
          {symbol}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
        {loading ? (
          <CircularProgress size={18} sx={{ color: 'rgba(10,10,15,0.3)' }} />
        ) : (
          <Box
            component="input"
            type="number"
            value={value}
            onChange={onChange ? (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value) : undefined}
            placeholder="0.00"
            disabled={disabled}
            sx={{
              flex: 1,
              border: 'none',
              outline: 'none',
              bgcolor: 'transparent',
              fontSize: '24px',
              fontWeight: 600,
              color: disabled ? 'rgba(10,10,15,0.35)' : '#0A0A0F',
              letterSpacing: '-0.02em',
              fontFamily: '"Geist Mono", "Courier New", monospace',
              width: '100%',
              minWidth: 0,
              '&::placeholder': { color: 'rgba(10,10,15,0.2)' },
              '&::-webkit-inner-spin-button, &::-webkit-outer-spin-button': { appearance: 'none' },
            }}
          />
        )}
        {onMax && (
          <Box
            component="button"
            onClick={onMax}
            sx={{
              border: 'none',
              bgcolor: 'rgba(10,10,15,0.06)',
              color: '#0A0A0F',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              px: '8px',
              py: '4px',
              borderRadius: '6px',
              cursor: 'pointer',
              flexShrink: 0,
              fontFamily: 'inherit',
              transition: 'bgcolor 150ms ease',
              '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
            }}
          >
            MAX
          </Box>
        )}
      </Box>
    </Box>
  </Box>
);

// ----------------------------------------------------------------------

const SwapCard: React.FC<SwapCardProps> = ({ initialTokenIn, ...other }) => {
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

  const [tokenIn, setTokenIn] = useState<'XLM' | 'USDC'>(initialTokenIn ?? 'XLM');
  const [tokenOut, setTokenOut] = useState<'XLM' | 'USDC'>(initialTokenIn === 'USDC' ? 'XLM' : 'USDC');
  const [amountIn, setAmountIn] = useState('');
  const debouncedAmountIn = useDebounce(amountIn, 500);

  const xlmBalance = getTokenBalance(getXlmToken(tokenState.tokens));
  const usdcBalance = getTokenBalance(getSwapUsdcToken(tokenState.tokens, config));

  const inputBalance = tokenIn === 'XLM' ? xlmBalance : usdcBalance;
  const outputBalance = tokenOut === 'XLM' ? xlmBalance : usdcBalance;

  useEffect(() => {
    if (debouncedAmountIn && parseFloat(debouncedAmountIn) > 0) {
      getQuote(TOKENS[tokenIn].address, TOKENS[tokenOut].address, debouncedAmountIn);
    } else {
      clearQuote();
    }
  }, [debouncedAmountIn, tokenIn, tokenOut, getQuote, clearQuote]);

  const handleSwapDirection = useCallback(() => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn(quote?.amountOut || '');
  }, [tokenIn, tokenOut, quote]);

  const handleMax = useCallback(() => {
    const maxAmount =
      tokenIn === 'XLM'
        ? Math.max(0, parseFloat(inputBalance) - 1).toFixed(7)
        : parseFloat(inputBalance).toFixed(7);
    setAmountIn(maxAmount);
  }, [tokenIn, inputBalance]);

  const handleSwap = useCallback(async () => {
    if (!quote) return;
    await executeSwap(quote, {
      tokenInSymbol: TOKENS[tokenIn].symbol,
      tokenOutSymbol: TOKENS[tokenOut].symbol,
    });
    setAmountIn('');
  }, [quote, executeSwap, tokenIn, tokenOut]);

  const exchangeRate =
    quote && parseFloat(quote.amountIn) > 0
      ? (parseFloat(quote.amountOut) / parseFloat(quote.amountIn)).toFixed(6)
      : null;

  const isInsufficientBalance = parseFloat(amountIn) > parseFloat(inputBalance);
  const needsAccountActivation = tokenOut === 'USDC' && !isCheckingAccount && !accountExists;
  const needsTrustline =
    tokenOut === 'USDC' && !isCheckingAccount && accountExists && !hasUsdcTrustline;

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
    <Box
      sx={{
        p: '22px',
        borderRadius: '22px',
        border: '1px solid rgba(10,10,15,0.08)',
        bgcolor: '#FFFFFF',
        boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 4px 16px rgba(10,10,15,0.04)',
        ...other.sx,
      }}
    >
      {/* Header */}
      <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#0A0A0F', mb: '4px' }}>
        {t('Swap tokens')}
      </Typography>
      <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)', mb: '20px' }}>
        {t('Exchange XLM and USDC instantly with the best rates.')}
      </Typography>

      {/* You pay */}
      <TokenRow
        label={t('You pay')}
        symbol={tokenIn}
        iconKey={TOKENS[tokenIn].icon}
        balance={inputBalance}
        value={amountIn}
        onChange={setAmountIn}
        error={isInsufficientBalance}
        onMax={handleMax}
      />

      {/* Swap direction button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', my: '8px' }}>
        <Box
          component="button"
          onClick={handleSwapDirection}
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            border: '1px solid rgba(10,10,15,0.08)',
            bgcolor: '#FAFAFB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#0A0A0F',
            transition: 'all 150ms ease',
            '&:hover': { bgcolor: '#F4F4F7', borderColor: 'rgba(10,10,15,0.16)' },
          }}
        >
          <Iconify icon="solar:transfer-vertical-bold" width={18} />
        </Box>
      </Box>

      {/* You receive */}
      <TokenRow
        label={t('You receive')}
        symbol={tokenOut}
        iconKey={TOKENS[tokenOut].icon}
        balance={outputBalance}
        value={quoteLoading ? '' : quote?.amountOut || ''}
        disabled
        loading={quoteLoading}
      />

      {/* Rate + fee info */}
      {quote && parseFloat(quote.amountIn) > 0 && (
        <Box
          sx={{
            mt: '12px',
            p: '12px 14px',
            borderRadius: '12px',
            bgcolor: '#FAFAFB',
            border: '1px solid rgba(10,10,15,0.06)',
          }}
        >
          {exchangeRate && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '6px' }}>
              <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
                {t('Rate')}
              </Typography>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', fontFamily: '"Geist Mono", "Courier New", monospace' }}>
                1 {tokenIn} = {exchangeRate} {tokenOut}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '6px' }}>
            <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
              {t('Normal fee (0.5%)')}
            </Typography>
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', fontFamily: '"Geist Mono", "Courier New", monospace' }}>
              -{parseFloat(quote.fee || '0').toFixed(4)} {tokenIn}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '11px', color: 'rgba(10,10,15,0.4)', lineHeight: 1.5 }}>
            {t("You'll sign two transactions: the Normal fee and your swap.")}
          </Typography>
        </Box>
      )}

      {/* Error */}
      {error && (
        <Typography sx={{ fontSize: '12px', color: 'error.main', mt: '8px' }}>
          {error}
        </Typography>
      )}

      {/* Action */}
      <Box sx={{ mt: '16px' }}>
        <WalletGate buttonText={t('Connect wallet to swap')} fullWidth variant="contained">
          {needsAccountActivation ? (
            <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', textAlign: 'center', px: 1 }}>
              {t('Fund this account with at least 1 XLM to activate Stellar before adding a USDC trustline.')}
            </Typography>
          ) : needsTrustline ? (
            <Box>
              <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', textAlign: 'center', mb: '10px' }}>
                {t('A USDC trustline is required before swapping to USDC')}
              </Typography>
              <Button
                variant="contained"
                fullWidth
                size="large"
                disabled={isAddingTrustline}
                onClick={handleAddTrustline}
                startIcon={isAddingTrustline ? <CircularProgress size={18} color="inherit" /> : null}
                sx={{
                  borderRadius: '12px',
                  bgcolor: '#0A0A0F',
                  fontWeight: 700,
                  fontSize: '15px',
                  py: '13px',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#1a1a25' },
                  '&.Mui-disabled': { bgcolor: 'rgba(10,10,15,0.08)', color: 'rgba(10,10,15,0.3)' },
                }}
              >
                {isAddingTrustline ? t('Adding Trustline...') : t('Add USDC Trustline')}
              </Button>
            </Box>
          ) : (
            <Button
              variant="contained"
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
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{
                borderRadius: '12px',
                bgcolor: '#0A0A0F',
                fontWeight: 700,
                fontSize: '15px',
                py: '13px',
                textTransform: 'none',
                letterSpacing: '-0.01em',
                '&:hover': { bgcolor: '#1a1a25' },
                '&.Mui-disabled': { bgcolor: 'rgba(10,10,15,0.08)', color: 'rgba(10,10,15,0.3)' },
              }}
            >
              {loading
                ? t('Swapping...')
                : isInsufficientBalance
                  ? t('Insufficient balance')
                  : !amountIn || parseFloat(amountIn) <= 0
                    ? t('Enter an amount')
                    : t('Swap')}
            </Button>
          )}
        </WalletGate>
      </Box>
    </Box>
  );
};

export default SwapCard;
