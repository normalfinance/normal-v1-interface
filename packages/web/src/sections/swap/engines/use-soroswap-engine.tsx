'use client';

import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { fCurrency } from '@/utils/format-number';
import { useDebounce } from '@/hooks/use-debounce';
import { useSwap } from '@/hooks/stellar/use-swap';
import { usePersistStore } from '@normalfinance/state';
import React, { useMemo, useEffect, useCallback } from 'react';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useSnackbar } from '@/components/template/snackbar';

import type { StellarSymbol, SwapEngineResult } from './types';

const MONO = { fontFamily: '"Geist Mono", "Courier New", monospace' } as const;

export interface SoroswapEngineProps {
  fromSymbol: StellarSymbol;
  toSymbol: StellarSymbol;
  /** gross token amount the user is paying */
  amount: BigNumber;
  fromBalance: BigNumber;
  /** USD price of the source token, for showing the fee in both denominations */
  fromPrice: BigNumber;
  /** true only while this engine's group is the active selection */
  enabled: boolean;
  resetInput: () => void;
}

export function useSoroswapEngine({
  fromSymbol,
  toSymbol,
  amount,
  fromBalance,
  fromPrice,
  enabled,
  resetInput,
}: SoroswapEngineProps): SwapEngineResult {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { wallet, getAllTokens } = usePersistStore();
  const config = useStellarConfig();

  const ADDRESS: Record<StellarSymbol, string> = {
    XLM: config.XLM_ADDRESS || 'native',
    USDC: config.USDC_ADDRESS,
  };

  const { quote, quoteLoading, loading, error, getQuote, executeSwap, clearQuote } = useSwap();
  const {
    isLoading: isCheckingAccount,
    accountExists,
    hasUsdcTrustline,
    refetch: refetchAccountStatus,
  } = useAccountStatus(wallet.address);
  const { addTrustLine, txBroadcasting: isAddingTrustline } = useTrustLine();

  const debouncedAmount = useDebounce(enabled ? amount.toFixed() : '', 500);

  useEffect(() => {
    if (!enabled) {
      clearQuote();
      return;
    }
    if (debouncedAmount && parseFloat(debouncedAmount) > 0) {
      getQuote(ADDRESS[fromSymbol], ADDRESS[toSymbol], debouncedAmount);
    } else {
      clearQuote();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, debouncedAmount, fromSymbol, toSymbol, getQuote, clearQuote]);

  const toAmount = quote?.amountOut ? BigNumber(quote.amountOut) : null;
  const insufficient = amount.gt(0) && amount.gt(fromBalance);
  const needsAccountActivation = toSymbol === 'USDC' && !isCheckingAccount && !accountExists;
  const needsTrustline =
    toSymbol === 'USDC' && !isCheckingAccount && accountExists && !hasUsdcTrustline;

  const exchangeRate =
    quote && parseFloat(quote.amountIn) > 0
      ? BigNumber(quote.amountOut).dividedBy(quote.amountIn).toFixed(6)
      : null;

  // #67: XLM's reserve (network minimum + savings buffer) is already inside
  // the fromBalance the swap card passes in — subtracting an ad-hoc 1 XLM
  // again here would double-count it.
  const getMaxToken = async (): Promise<BigNumber> => fromBalance;

  const handleSwap = useCallback(async () => {
    if (!quote) return;
    // executeSwap surfaces its own success / error toast and returns '' on
    // failure, so only refresh when a hash actually came back.
    const hash = await executeSwap(quote, { tokenInSymbol: fromSymbol, tokenOutSymbol: toSymbol });
    if (!hash) return;
    resetInput();
    // Stellar balances live in the persist store and DON'T auto-refresh on the
    // activity event, so pull them explicitly. A second pass a few seconds later
    // catches Horizon read-replica lag right after the ledger closes.
    getAllTokens(true).catch(() => {});
    setTimeout(() => getAllTokens(true).catch(() => {}), 4000);
    // Refresh the activity feed so the swap appears without a manual reload.
    window.dispatchEvent(new Event('nf:activity-updated'));
  }, [quote, executeSwap, fromSymbol, toSymbol, resetInput, getAllTokens]);

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
  }, [config.USDC_ISSUER, addTrustLine, refetchAccountStatus, enqueueSnackbar, t]);

  const button = useMemo(() => {
    if (!enabled) return { label: t('Enter an amount'), action: null, loading: false };
    if (needsAccountActivation)
      return {
        label: t('Activate account to swap'),
        action: null,
        loading: false,
        helper: (
          <Typography
            sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', textAlign: 'center', px: 1 }}
          >
            {t(
              'Fund this account with at least 1 XLM to activate Stellar before adding a USDC trustline.'
            )}
          </Typography>
        ),
      };
    if (needsTrustline)
      return {
        label: isAddingTrustline ? t('Adding Trustline...') : t('Add USDC Trustline'),
        action: isAddingTrustline ? null : handleAddTrustline,
        loading: isAddingTrustline,
        helper: (
          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', textAlign: 'center' }}>
            {t('A USDC trustline is required before swapping to USDC')}
          </Typography>
        ),
      };
    if (amount.lte(0)) return { label: t('Enter an amount'), action: null, loading: false };
    if (insufficient) return { label: t('Insufficient balance'), action: null, loading: false };
    if (loading) return { label: t('Swapping...'), action: null, loading: true };
    if (isCheckingAccount) return { label: t('Checking account…'), action: null, loading: false };
    if (quoteLoading) return { label: t('Fetching quote…'), action: null, loading: false };
    if (!quote) return { label: t('Fetching quote…'), action: null, loading: false };
    return { label: t('Swap'), action: handleSwap, loading: false };
  }, [
    enabled,
    needsAccountActivation,
    needsTrustline,
    isAddingTrustline,
    handleAddTrustline,
    amount,
    insufficient,
    loading,
    isCheckingAccount,
    quoteLoading,
    quote,
    handleSwap,
    t,
  ]);

  const details =
    quote && parseFloat(quote.amountIn) > 0 ? (
      <Stack spacing={0.75}>
        {exchangeRate && (
          <Stack direction="row" justifyContent="space-between">
            <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
              {t('Rate')}
            </Typography>
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', ...MONO }}>
              1 {fromSymbol} = {exchangeRate} {toSymbol}
            </Typography>
          </Stack>
        )}
        <Stack direction="row" justifyContent="space-between">
          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
            {t('Normal fee (0.5%)')}
          </Typography>
          <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', ...MONO }}>
            −{parseFloat(quote.fee || '0').toFixed(4)} {fromSymbol}
            {fromPrice.gt(0)
              ? ` (${fCurrency(BigNumber(quote.fee || '0').multipliedBy(fromPrice))})`
              : ''}
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: '11px', color: 'rgba(10,10,15,0.4)', lineHeight: 1.5 }}>
          {t("You'll sign two transactions: the Normal fee and your swap.")}
        </Typography>
      </Stack>
    ) : null;

  return {
    toAmount,
    quoteLoading: enabled ? quoteLoading : false,
    quoteError: enabled ? error : null,
    details,
    footer: null,
    button,
    modals: null,
    getMaxToken,
  };
}
