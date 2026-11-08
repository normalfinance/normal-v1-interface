'use client';

import type { FlowPlan, FlowSummary } from '@/lib/flow/types';

import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { fCurrency } from '@/utils/format-number';
import { useFlowRun } from '@/hooks/use-flow-run';
import { stellarSwapPlan } from '@/lib/flow/plans';
import { useDebounce } from '@/hooks/use-debounce';
import { confirmAction } from '@/lib/auth/action-code';
import { usePersistStore } from '@normalfinance/state';
import { awaitTxRecord } from '@/lib/stellar/await-tx-visible';
import { connectedWalletLabel } from '@/lib/portfolio/display';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import { useAssetActionsContext } from '@/providers/AssetActionsProvider';
import { canPaySorobanFee, maxXlmForSorobanSwap } from '@/utils/stellar-reserve';
import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useSwap, type SoroswapStage, type SoroswapStageInfo } from '@/hooks/stellar/use-swap';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useSnackbar } from '@/components/template/snackbar';
import { formatUsd, formatCoin } from '@/components/_common/app-ui';
import { ChainSetupDialog } from '@/components/_common/chain-setup-dialog';
import {
  ledgerNote,
  stellarTxLink,
  stellarAccountHref,
} from '@/components/_common/flow/flow-links';

import type { SwapFlow, StellarSymbol, SwapEngineResult } from './types';

const MONO = { fontFamily: '"Geist Mono", ui-monospace, monospace' } as const;

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
  const { user } = useSupabaseAuth();
  const config = useStellarConfig();
  // Sweep 2026-08-21: a BTC/ETH/SOL-first Turnkey user reaches this DEFAULT
  // /swap view (XLM→USDC) with an EMPTY Stellar slot — the old gates showed
  // "Activate account to swap" with no address to fund. One passkey in
  // ChainSetupDialog derives Stellar on their existing wallet and adopts it
  // into the empty slot.
  const { startAction } = useAssetActionsContext();
  const [stellarSetupOpen, setStellarSetupOpen] = useState(false);

  const ADDRESS: Record<StellarSymbol, string> = {
    XLM: config.XLM_ADDRESS || 'native',
    USDC: config.USDC_ADDRESS,
  };

  // The review page and live journey (components/_common/flow). Nothing runs
  // until the person confirms there; the hook then reports build / sign /
  // submit, and the engine adds the confirmation, the fee and the balances.
  const {
    run: flowState,
    plan: frozenPlan,
    begin: beginRun,
    replan,
    start: startStep,
    done: doneStep,
    fail: failRun,
    finish: finishRun,
    reset: resetRun,
  } = useFlowRun();
  const [confirming, setConfirming] = useState(false);
  // The summary and sentence freeze with the plan: the quote and the amount
  // clear the moment the swap succeeds, and the page must keep its numbers.
  const [frozen, setFrozen] = useState<{ summary: FlowSummary; lede: string } | null>(null);
  // Whether this run is a one-signature (fee inside) swap. The server can
  // degrade it to the two-signature pair before the first prompt (upstream
  // fee-build defect): the plan is rebuilt then, so the page tells the truth
  // from the first prompt (Niko live 2026-08-21: step said one, run took two).
  const embeddedRef = useRef(false);
  const submittedRef = useRef<SoroswapStageInfo | null>(null);
  const rebuildRef = useRef<(embedded: boolean) => void>(() => {});

  const handleStage = useCallback(
    (s: SoroswapStage, info?: SoroswapStageInfo) => {
      switch (s) {
        case 'degraded':
          embeddedRef.current = false;
          rebuildRef.current(false);
          return;
        case 'build':
          startStep('prepare');
          return;
        case 'sign-swap':
          startStep('sign-swap', { waiting: true });
          return;
        case 'sign-fee':
          if (embeddedRef.current) {
            embeddedRef.current = false;
            rebuildRef.current(false);
          }
          startStep('sign-fee', { waiting: true });
          return;
        case 'submit':
          startStep('submit');
          return;
        case 'submitted':
          submittedRef.current = info ?? null;
          return;
        default:
      }
    },
    [startStep]
  );

  const overrideActive = !!stellarAddressOverride;
  const { quote, quoteLoading, loading, error, setError, getQuote, executeSwap, clearQuote } =
    useSwap(stellarAddressOverride ?? undefined, { onStage: handleStage });
  // Preflights probe the wallet the swap will actually run from.
  const {
    isLoading: isCheckingAccount,
    accountExists,
    hasUsdcTrustline,
    xlmBalance,
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
  // ------------------------------------------------------------------------
  // Doc 95 Wave 6: a Soroswap swap is a SOROBAN transaction — its fee is
  // 0.05–0.5+ XLM, not the 0.0002 XLM classic fee that `spendableXlm` holds
  // back. Nothing checked that the account could pay it, so the swap failed
  // ON-CHAIN with tx_insufficient_balance AFTER the user had signed (twice,
  // on the fee-pair path). Both directions are covered: an XLM source also
  // spends the amount itself, so that comes off the balance first.
  // ------------------------------------------------------------------------
  const xlmSpentByThisSwap = fromSymbol === 'XLM' ? amount : BigNumber(0);
  const cannotPayFee =
    amount.gt(0) &&
    !isCheckingAccount &&
    accountExists &&
    !canPaySorobanFee(xlmBalance, 1, xlmSpentByThisSwap);
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
  //
  // Doc 95 Wave 6: what it does NOT contain is the Soroban fee this very swap
  // has to pay. MAX therefore offered an amount that spent the fee money, and
  // the swap was guaranteed to fail on-chain after two signatures.
  const getMaxToken = async (): Promise<BigNumber> =>
    fromSymbol === 'XLM' ? maxXlmForSorobanSwap(fromBalance) : fromBalance;

  // ---- the review page ------------------------------------------------------
  const swapAddress = stellarAddressOverride ?? wallet.address;
  const isExternal = wallet.walletType != null && wallet.walletType !== 'normal-wallet';
  const walletLabel = overrideActive
    ? t('Your Normal wallet')
    : isExternal
      ? t('Your {{wallet}} wallet', { wallet: connectedWalletLabel(wallet.walletType) })
      : undefined;

  const buildPlan = useCallback(
    (embedded: boolean): FlowPlan | null =>
      quote
        ? stellarSwapPlan({
            t,
            from: fromSymbol,
            to: toSymbol,
            amountIn: formatCoin(Number(quote.amountIn), fromSymbol),
            amountOut: `≈ ${formatCoin(Number(quote.amountOut), toSymbol)}`,
            minOut: formatCoin(Number(quote.minAmountOut), toSymbol),
            fee: formatCoin(Number(quote.fee || 0), fromSymbol),
            embedded,
            wallet: {
              address: swapAddress,
              href: stellarAccountHref(swapAddress),
              label: walletLabel,
            },
          })
        : null,
    [quote, t, fromSymbol, toSymbol, swapAddress, walletLabel]
  );

  const buildSummary = useCallback(
    (embedded: boolean): FlowSummary | null => {
      if (!quote) return null;
      const amountIn = Number(quote.amountIn);
      const fee = Number(quote.fee || 0);
      const usd = (n: number) =>
        fromPrice.gt(0) ? formatUsd(fromPrice.multipliedBy(n).toNumber()) : undefined;
      return {
        rows: [
          {
            key: 'pay',
            label: t('You pay'),
            value: formatCoin(amountIn, fromSymbol),
            detail: usd(amountIn),
          },
          {
            key: 'get',
            label: t('You receive'),
            value: `≈ ${formatCoin(Number(quote.amountOut), toSymbol)}`,
          },
          {
            key: 'min',
            label: t('At least'),
            value: formatCoin(Number(quote.minAmountOut), toSymbol),
            detail: t('Or the swap does not happen'),
          },
          ...(exchangeRate
            ? [
                {
                  key: 'rate',
                  label: t('Rate'),
                  value: `1 ${fromSymbol} = ${exchangeRate} ${toSymbol}`,
                },
              ]
            : []),
          {
            key: 'fee',
            label: t('Normal fee (0.5%)'),
            value: formatCoin(fee, fromSymbol),
            detail: usd(fee),
          },
          {
            key: 'network',
            label: t('Network fee'),
            value: t('Usually 0.05 to 0.5 XLM'),
            detail: t('Paid in XLM by your wallet'),
          },
          {
            key: 'signatures',
            label: t('Signatures'),
            value: embedded ? t('One') : t('Two'),
          },
          { key: 'time', label: t('Time'), value: t('About 10 seconds') },
          {
            key: 'wallet',
            label: t('From and to'),
            value: walletLabel ?? t('Your Stellar wallet'),
            detail: swapAddress ? `${swapAddress.slice(0, 4)}…${swapAddress.slice(-4)}` : undefined,
          },
        ],
        note: t(
          'Prices on Stellar move with every trade. You may receive a little more or less than shown, never less than the minimum.'
        ),
      };
    },
    [quote, t, fromSymbol, toSymbol, fromPrice, exchangeRate, walletLabel, swapAddress]
  );

  const lede = quote
    ? t('{{pay}} for about {{get}}, on Stellar.', {
        pay: formatCoin(Number(quote.amountIn), fromSymbol),
        get: formatCoin(Number(quote.amountOut), toSymbol),
      })
    : '';

  rebuildRef.current = (embedded: boolean) => {
    const plan = buildPlan(embedded);
    const summary = buildSummary(embedded);
    if (plan) replan(plan);
    if (summary) setFrozen((f) => (f ? { ...f, summary } : f));
  };

  // A failure reported by the hook ends the run where it stopped.
  useEffect(() => {
    if (error && flowState.phase === 'running') failRun(error);
  }, [error, flowState.phase, failRun]);

  const handleConfirm = useCallback(async () => {
    if (!quote || confirming) return;
    setConfirming(true);
    let approved = false;
    try {
      approved = await confirmAction();
    } finally {
      setConfirming(false);
    }
    if (!approved) return;

    const embedded = !!quote.embedded;
    const plan = buildPlan(embedded);
    const summary = buildSummary(embedded);
    if (!plan || !summary) return;
    embeddedRef.current = embedded;
    submittedRef.current = null;
    setError(null);
    setFrozen({ summary, lede });
    beginRun(plan);

    // '' on failure: the hook set `error`, and the effect above fails the run.
    const hash = await executeSwap(quote, { tokenInSymbol: fromSymbol, tokenOutSymbol: toSymbol });
    if (!hash) return;
    const submitted = submittedRef.current as SoroswapStageInfo | null;
    doneStep('submit', { links: [stellarTxLink(t, hash)] });
    // The feed row appears now; the balances are gated below.
    window.dispatchEvent(new Event('nf:activity-updated'));

    // Wait for the LEDGER before reading balances (Niko, 2026-08-28: the
    // balance still lagged after two rounds of cache fixes). Asking Horizon
    // for the transaction is a definite question, with no cache in the way,
    // so the refresh below runs once the ledger provably has the swap. It
    // also says which ledger, for the step. Bounded: a Horizon blip never
    // holds up a swap that already succeeded.
    startStep('confirmed');
    const record = await awaitTxRecord(config.HORIZON_URL, hash).catch(() => null);
    doneStep('confirmed', { note: ledgerNote(t, record) });

    if (!embeddedRef.current) {
      if (submitted?.feeSubmitted && submitted.feeHash) {
        doneStep('fee', { links: [stellarTxLink(t, submitted.feeHash, t('View the fee'))] });
      } else {
        doneStep('fee', {
          note: t('Normal collects it within a few minutes, as a separate small payment.'),
        });
      }
    }

    // 'Done' only after the awaited balance refresh (#62/#66), capped at 15s
    // so a refresh hiccup can never make a successful swap look stuck.
    startStep('balance');
    await Promise.race([
      refreshAggregate?.().catch(() => {}),
      new Promise((r) => {
        setTimeout(r, 15_000);
      }),
    ]);
    finishRun();
    resetInput();
  }, [
    quote,
    confirming,
    buildPlan,
    buildSummary,
    lede,
    setError,
    beginRun,
    executeSwap,
    fromSymbol,
    toSymbol,
    doneStep,
    startStep,
    t,
    config.HORIZON_URL,
    refreshAggregate,
    finishRun,
    resetInput,
  ]);

  const resetFlow = useCallback(() => {
    resetRun();
    setFrozen(null);
    setError(null);
  }, [resetRun, setError]);

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
    if (!overrideActive && !wallet.address)
      return {
        label: t('Set up Stellar wallet'),
        action: user ? () => setStellarSetupOpen(true) : null,
        loading: false,
        helper: (
          <Typography sx={{ fontSize: '12px', color: '#6B6B76', textAlign: 'center' }}>
            {t('One passkey adds Stellar to your wallet. Swaps run right after.')}
          </Typography>
        ),
      };
    // Companion-wallet gaps route to the guided setup dialog: the inline
    // fixes below sign with the CONNECTED wallet's kit, which cannot add a
    // trustline on the companion (only an account's own key can changeTrust).
    if (overrideActive && (needsAccountActivation || needsTrustline) && onNeedsSetup)
      return {
        label: t('Finish Normal wallet setup'),
        action: onNeedsSetup,
        loading: false,
        helper: (
          <Typography sx={{ fontSize: '12px', color: '#6B6B76', textAlign: 'center' }}>
            {t('Your Normal wallet needs a quick setup step before it can swap.')}
          </Typography>
        ),
      };
    if (needsAccountActivation)
      return {
        label: t('Add XLM to activate'),
        // Was a DEAD BUTTON: it told the user to fund the account and then
        // offered no way to see the address or QR. A gate must offer the
        // action that clears it (sweep 2026-08-22) — Receive is that action.
        action: onNeedsSetup ?? (() => startAction('receive')),
        loading: false,
        helper: (
          <Typography sx={{ fontSize: '12px', color: '#6B6B76', textAlign: 'center', px: 1 }}>
            {t(
              'Your Stellar account activates once it receives at least 1 XLM. Then the USDC trustline can be added.'
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
          <Typography sx={{ fontSize: '12px', color: '#6B6B76', textAlign: 'center' }}>
            {t('A USDC trustline is required before swapping to USDC')}
          </Typography>
        ),
      };
    if (amount.lte(0)) return { label: t('Enter an amount'), action: null, loading: false };
    if (insufficient) return { label: t('Insufficient balance'), action: null, loading: false };
    // Ahead of the quote gates on purpose: this one is knowable immediately
    // and never resolves by waiting.
    if (cannotPayFee)
      return {
        label: t('Add XLM to cover the network fee'),
        action: null,
        loading: false,
      };
    if (loading) return { label: t('Swapping...'), action: null, loading: true };
    if (isCheckingAccount) return { label: t('Checking account…'), action: null, loading: false };
    if (quoteLoading) return { label: t('Fetching quote…'), action: null, loading: false };
    if (!quote) return { label: t('Fetching quote…'), action: null, loading: false };
    // Opens the review page; only its confirm button runs the swap.
    return { label: t('Review swap'), action: handleConfirm, loading: false, review: true };
  }, [
    enabled,
    user,
    wallet.address,
    overrideActive,
    onNeedsSetup,
    needsAccountActivation,
    needsTrustline,
    isAddingTrustline,
    handleAddTrustline,
    amount,
    insufficient,
    cannotPayFee,
    loading,
    isCheckingAccount,
    quoteLoading,
    quote,
    handleConfirm,
    t,
  ]);

  const details =
    quote && parseFloat(quote.amountIn) > 0 ? (
      <Stack spacing={0.75}>
        {exchangeRate && (
          <Stack direction="row" justifyContent="space-between">
            <Typography sx={{ fontSize: '12px', color: '#6B6B76' }}>{t('Rate')}</Typography>
            <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#0A0A0F', ...MONO }}>
              1 {fromSymbol} = {exchangeRate} {toSymbol}
            </Typography>
          </Stack>
        )}
        <Stack direction="row" justifyContent="space-between">
          <Typography sx={{ fontSize: '12px', color: '#6B6B76' }}>
            {t('Normal fee (0.5%)')}
          </Typography>
          <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#0A0A0F', ...MONO }}>
            −{parseFloat(quote.fee || '0').toFixed(4)} {fromSymbol}
            {fromPrice.gt(0)
              ? ` (${fCurrency(BigNumber(quote.fee || '0').multipliedBy(fromPrice))})`
              : ''}
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: '11px', color: '#9A9AA3', lineHeight: 1.5 }}>
          {quote?.embedded
            ? t('One signature: the Normal fee is inside the swap transaction.')
            : t("You'll sign two transactions: the Normal fee and your swap.")}
        </Typography>
      </Stack>
    ) : null;

  // The review page: live from the quote while reviewing, frozen once running.
  const livePlan = useMemo(() => buildPlan(!!quote?.embedded), [buildPlan, quote?.embedded]);
  const liveSummary = useMemo(
    () => buildSummary(!!quote?.embedded),
    [buildSummary, quote?.embedded]
  );
  const shownPlan = flowState.phase === 'review' ? livePlan : (frozenPlan ?? livePlan);
  const shownSummary =
    flowState.phase === 'review' ? liveSummary : (frozen?.summary ?? liveSummary);
  const flow: SwapFlow | null =
    enabled && shownPlan && shownSummary
      ? {
          plan: shownPlan,
          summary: shownSummary,
          run: flowState,
          lede: flowState.phase === 'review' ? lede : (frozen?.lede ?? lede),
          confirm: handleConfirm,
          blocked: quoteLoading
            ? t('Getting a fresh price…')
            : cannotPayFee
              ? t('Add a little XLM first: it pays the network fee.')
              : null,
          busy: confirming,
          // Until it is sent, a prompt could still appear (so stay a few
          // seconds); once sent, Stellar and our server finish it.
          leave: ['prepare', 'sign-swap', 'sign-fee'].includes(flowState.activeId ?? '')
            ? {
                safe: false,
                message: t('Stay a few seconds until it is sent, so no prompt is left open.'),
              }
            : {
                safe: true,
                message: t('Stellar finishes this in seconds, with or without this page.'),
              },
          failActions: [{ label: t('Try again'), primary: true, onClick: resetFlow }],
          doneNote: t('Your {{coin}} is in your wallet.', { coin: toSymbol }),
          reset: resetFlow,
        }
      : null;

  return {
    flow,
    toAmount,
    quoteLoading: enabled ? quoteLoading : false,
    quoteError: enabled ? error : null,
    details,
    footer: null,
    button,
    modals: (
      <>
        {user && stellarSetupOpen && (
          <ChainSetupDialog
            open
            onClose={() => setStellarSetupOpen(false)}
            chain="stellar"
            userId={user.id}
            userEmail={user.email}
            onSuccess={async () => {
              // Adoption fills the persist slot (walletType 'normal-wallet');
              // the aggregate refresh paints the fresh balances.
              await refreshAggregate?.().catch?.(() => {});
              setStellarSetupOpen(false);
            }}
          />
        )}
      </>
    ),
    getMaxToken,
  };
}
