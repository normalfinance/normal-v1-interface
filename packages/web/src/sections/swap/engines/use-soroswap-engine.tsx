'use client';

import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { fCurrency } from '@/utils/format-number';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistStore } from '@normalfinance/state';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import { useSwap, type SoroswapStage } from '@/hooks/stellar/use-swap';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useSnackbar } from '@/components/template/snackbar';

import { SoroswapProgressModal } from '../soroswap-progress-modal';

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
  /**
   * #32 chunk 4f: run the swap FROM this wallet instead of the connected slot
   * wallet (hybrid: external wallet connected, user picked the Normal wallet
   * as source). Build, balance checks and both signatures all follow it —
   * explicit, never a silent fallback.
   */
  stellarAddressOverride?: string | null;
  /** Routes companion-wallet preflight gaps (activation/trustline) into the
   *  guided setup dialog — the kit-signed inline fixes below only work for
   *  the CONNECTED wallet, which can sign its own changeTrust. */
  onNeedsSetup?: () => void;
  /** Awaitable, cache-bypassing refresh of the portfolio aggregate — 'Done'
   *  in the progress modal waits on it (#62/#66: Done must mean the wallet
   *  already shows the result), capped so a hiccup can't stick the modal. */
  refreshAggregate?: () => Promise<unknown>;
}

export function useSoroswapEngine({
  fromSymbol,
  toSymbol,
  amount,
  fromBalance,
  fromPrice,
  enabled,
  resetInput,
  stellarAddressOverride,
  onNeedsSetup,
  refreshAggregate,
}: SoroswapEngineProps): SwapEngineResult {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { wallet } = usePersistStore();
  const config = useStellarConfig();

  const ADDRESS: Record<StellarSymbol, string> = {
    XLM: config.XLM_ADDRESS || 'native',
    USDC: config.USDC_ADDRESS,
  };

  // Progress modal (Niko 2026-08-21: Stellar swaps were the last flow with
  // no status popup and no refetch-gated Done). The hook drives
  // build/sign/submit; the engine adds 'refetch' + 'done' after the hash.
  const [swapStage, setSwapStage] = useState<SoroswapStage | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [doneHash, setDoneHash] = useState<string | null>(null);

  // Embedded flag captured at swap time; flipped OFF the moment a fee
  // signature stage arrives — the server degrade (upstream fee-build defect)
  // turns a promised 1-signature run into a fee-pair run mid-flight, and the
  // modal's copy must follow the truth, not the quote's promise (Niko live
  // 2026-08-21: step said "One signature", run took two).
  const [wasEmbedded, setWasEmbedded] = useState(false);
  const handleStage = useCallback((s: SoroswapStage) => {
    setSwapStage(s);
    if (s === 'sign-fee') setWasEmbedded(false);
  }, []);

  const overrideActive = !!stellarAddressOverride;
  const { quote, quoteLoading, loading, error, setError, getQuote, executeSwap, clearQuote } =
    useSwap(stellarAddressOverride ?? undefined, { onStage: handleStage });
  // Preflights probe the wallet the swap will actually run from.
  const {
    isLoading: isCheckingAccount,
    accountExists,
    hasUsdcTrustline,
    refetch: refetchAccountStatus,
  } = useAccountStatus(stellarAddressOverride ?? wallet.address);
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
    setError(null);
    setDoneHash(null);
    setWasEmbedded(!!quote.embedded);
    setSwapStage('build');
    setModalOpen(true);
    // '' on failure — the hook set `error`, which the modal shows with Try
    // again (its snackbar also fired; the modal is the primary surface).
    const hash = await executeSwap(quote, { tokenInSymbol: fromSymbol, tokenOutSymbol: toSymbol });
    if (!hash) return;
    // Feed row appears immediately; BALANCES are gated below — 'Done' only
    // shows after the awaited aggregate refresh (#62/#66), capped at 15s so
    // a refresh hiccup can never make a successful swap look stuck.
    window.dispatchEvent(new Event('nf:activity-updated'));
    setSwapStage('refetch');
    await Promise.race([
      refreshAggregate?.().catch(() => {}),
      new Promise((r) => {
        setTimeout(r, 15_000);
      }),
    ]);
    setDoneHash(hash);
    setSwapStage('done');
    resetInput();
  }, [quote, executeSwap, fromSymbol, toSymbol, resetInput, refreshAggregate, setError]);

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
    // Companion-wallet gaps route to the guided setup dialog: the inline
    // fixes below sign with the CONNECTED wallet's kit, which cannot add a
    // trustline on the companion (only an account's own key can changeTrust).
    if (overrideActive && (needsAccountActivation || needsTrustline) && onNeedsSetup)
      return {
        label: t('Finish Normal wallet setup'),
        action: onNeedsSetup,
        loading: false,
        helper: (
          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', textAlign: 'center' }}>
            {t('Your Normal wallet needs a quick setup step before it can swap.')}
          </Typography>
        ),
      };
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
    overrideActive,
    onNeedsSetup,
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
          {quote?.embedded
            ? t('One signature — the Normal fee is included in the swap transaction.')
            : t("You'll sign two transactions: the Normal fee and your swap.")}
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
    modals: (
      <SoroswapProgressModal
        open={modalOpen}
        stage={swapStage}
        error={modalOpen ? error : null}
        fromSymbol={fromSymbol}
        toSymbol={toSymbol}
        embedded={wasEmbedded}
        txHash={doneHash}
        onTryAgain={
          error
            ? () => {
                // Back to a clean, retryable card — quote + amount stay filled.
                setModalOpen(false);
                setSwapStage(null);
                setError(null);
              }
            : undefined
        }
        onClose={() => {
          setModalOpen(false);
          setSwapStage(null);
          if (error) setError(null);
        }}
      />
    ),
    getMaxToken,
  };
}
