'use client';

import type { LifiQuote } from '@/lib/lifi/execute';
import type { TurnkeyChain } from '@/lib/turnkey/add-account';
import type { FlowPlan, FlowSummary } from '@/lib/flow/types';

import { logger } from '@/utils/logger';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';
import { useFlowRun } from '@/hooks/use-flow-run';
import { useDebounce } from '@/hooks/use-debounce';
import { BRAND_COLORS } from '@/theme/brand-colors';
import { MONO } from '@/sections/portfolio/_shared';
import { bridgeName } from '@/lib/flow/lifi-status';
import { executeLifiSwap } from '@/lib/lifi/execute';
import { crossChainSwapPlan } from '@/lib/flow/plans';
import { confirmAction } from '@/lib/auth/action-code';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { friendlyAppError } from '@/utils/errors/error-classifier';
import { driftVerdict, isQuoteStale } from '@/lib/lifi/quote-freshness';
import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { isBroadcastUncertain, UNCERTAIN_SEND_MESSAGE } from '@/lib/chains/broadcast-safety';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';
import { formatUsd, formatCoin } from '@/components/_common/app-ui';
import { ChainSetupDialog } from '@/components/_common/chain-setup-dialog';
import GasShortfallDialog from '@/components/_common/gas-shortfall-dialog';
import { FlowNotice, shareOfSwap, readableRate } from '@/components/_common/flow';
import { chainTxLink, lifiTrackLink, chainAddressHref } from '@/components/_common/flow/flow-links';

import { isInsufficientGasError } from './gas-reserve';
import { useLifiTracker, registryChainOf } from './lifi-tracker';

import type { LifiTrackedTx } from './lifi-tracker';
import type { SwapFlow, CrosschainSymbol, SwapEngineResult } from './types';

// ---------------------------------------------------------------------------
// Cross-chain swaps between the user's own Turnkey addresses, routed by LI.FI
// (THORChain / Chainflip / Relay …). Native BTC, ETH, SOL only.
//
// feeReserve = amount kept back from MAX so the source chain can cover the
// bridge deposit's costs and the swap still validates. Per chain:
//  - BTC: the miner fee for the deposit tx (~2k sat)
//  - ETH: gas for the bridge call (computed live in getMaxToken)
//  - SOL: must cover the wallet's ~0.00089 rent-exempt minimum AND the
//    ~0.00204 rent to open the USDC token account the SOL→BTC route creates,
//    plus network + 0.5% integrator fee.
// ---------------------------------------------------------------------------

interface CrosschainAsset {
  name: string;
  decimals: number;
  chain: TurnkeyChain;
  feeReserve: number;
}

const CHAIN_ASSETS: Record<CrosschainSymbol, CrosschainAsset> = {
  BTC: { name: 'Bitcoin', decimals: 8, chain: 'bitcoin', feeReserve: 0.00002 },
  ETH: { name: 'Ethereum', decimals: 18, chain: 'ethereum', feeReserve: 0.003 },
  SOL: { name: 'Solana', decimals: 9, chain: 'solana', feeReserve: 0.01 },
};

// Cross-chain swaps below this USD value have poor route coverage and a high
// stuck/refund rate (LI.FI's own guidance: ~$5+). Enforced client-side so users
// get instant feedback and we don't waste quote calls.
const MIN_SWAP_USD = 5;

export interface LifiEngineProps {
  fromSymbol: CrosschainSymbol;
  toSymbol: CrosschainSymbol;
  addresses: { BTC: string | null; ETH: string | null; SOL: string | null };
  /** gross token amount the user is paying */
  amount: BigNumber;
  fromBalance: BigNumber;
  fromPrice: BigNumber;
  /** true only while this engine's group is the active selection */
  enabled: boolean;
  resetInput: () => void;
  refetchChain: (chain: TurnkeyChain) => Promise<void> | void;
  /** Dynamic gas (2026-08-21): writes the affordable amount back into the
   *  card when a gas spike beats the reserve — the quote then refreshes and
   *  the user confirms the updated numbers with a normal Swap press. */
  onAmountAdjusted?: (amountEth: string) => void;
}

type QuoteFetch =
  | { ok: true; quote: LifiQuote; feePercent: number }
  | { ok: false; error: unknown };

/**
 * Doc 95 Wave 6: pulled out of the card's effect so the EXECUTE path can ask
 * for a fresh quote with exactly the same request. When the two drifted apart
 * there was no way to re-price at the moment of signing, which is the only
 * moment the price actually matters.
 */
async function requestLifiQuote(
  body: Record<string, unknown>,
  opts: { signal?: AbortSignal; cancelled?: () => boolean } = {}
): Promise<QuoteFetch> {
  let res: Response | null = null;
  let data: any = null;
  // Doc 90 W4: 429/5xx quote failures are transient — one quiet retry before
  // parking an error in the card.
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch('/api/lifi/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: opts.signal,
      body: JSON.stringify(body),
    }).catch(() => null);
    data = res ? await res.json().catch(() => null) : null;
    if (opts.cancelled?.()) return { ok: false, error: null };
    if (res && res.ok && data?.success) break;
    const transient = !res || res.status === 429 || res.status >= 500;
    if (!transient || attempt === 1) break;
    await new Promise((r) => setTimeout(r, 6_000));
    if (opts.cancelled?.()) return { ok: false, error: null };
  }
  if (!res || !res.ok || !data?.success) return { ok: false, error: data?.error ?? null };
  return {
    ok: true,
    quote: data.quote as LifiQuote,
    feePercent: typeof data.feePercent === 'number' ? data.feePercent : 0,
  };
}

export function useLifiEngine({
  fromSymbol,
  toSymbol,
  addresses,
  amount,
  fromBalance,
  fromPrice,
  enabled,
  resetInput,
  refetchChain,
  onAmountAdjusted,
}: LifiEngineProps): SwapEngineResult {
  const { t } = useTranslate();
  const { user } = useSupabaseAuth();
  const { enqueueSnackbar } = useSnackbar();

  const from = CHAIN_ASSETS[fromSymbol];
  const to = CHAIN_ASSETS[toSymbol];
  const fromAddress = addresses[fromSymbol];
  const toAddress = addresses[toSymbol];

  const [quote, setQuote] = useState<LifiQuote | null>(null);
  /** When the quote on screen was built (ms). Null = none. */
  const [quoteAt, setQuoteAt] = useState<number | null>(null);
  // Integrator fee as a fraction (e.g. 0.005), reported by the quote route — 0
  // when the portal stripped it (1011 fallback), so we never show a phantom fee.
  const [feePercent, setFeePercent] = useState(0);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [setupChain, setSetupChain] = useState<TurnkeyChain | null>(null);
  const [statusTx, setStatusTx] = useState<LifiTrackedTx | null>(null);

  // The review page and live journey (components/_common/flow). Nothing runs
  // until the person confirms there; then each step reports in, and the
  // page follows the coin to the other wallet.
  const {
    run: flowState,
    plan: frozenPlan,
    begin: beginRun,
    start: startStep,
    update: updateStep,
    done: doneStep,
    fail: failRun,
    finish: finishRun,
    stop: stopRun,
    reset: resetRun,
  } = useFlowRun();
  const [frozen, setFrozen] = useState<{ summary: FlowSummary; lede: string; tool: string } | null>(
    null
  );
  const [confirming, setConfirming] = useState(false);
  // The price moved materially while the review was open: the new numbers are
  // on screen and the person confirms again (never executed silently).
  const [priceNotice, setPriceNotice] = useState<string | null>(null);
  // Once the transaction is out, "Try again" would start a second swap: the
  // bridge returns the coins by itself, so the page offers only the way back.
  const broadcastRef = useRef(false);

  // Tracking runs in the engine, not the page: it keeps confirming the source,
  // recording the swap and following the bridge until the coin arrives.
  const runTool = frozen?.tool ?? 'LI.FI';
  useLifiTracker(statusTx, {
    onActivity: () => window.dispatchEvent(new Event('nf:activity-updated')),
    // The sending chain has it: the money is with the bridge now.
    onSourceConfirmed: () => startStep('source-confirm'),
    onBridge: (p) => {
      if (p.phase === 'source') startStep('source-confirm');
      else if (p.phase === 'sending') startStep('bridge-send');
      else if (p.phase === 'refunding' && flowState.activeId)
        updateStep(flowState.activeId, {
          note: t('{{tool}} is sending it back to your wallet.', { tool: runTool }),
        });
      else if (p.phase === 'waiting' && flowState.activeId)
        updateStep(flowState.activeId, {
          note: t('{{tool}} is waiting on its network. It carries on by itself.', {
            tool: runTool,
          }),
        });
      else if (p.phase === 'delivered') {
        const destChain = registryChainOf(statusTx?.toChainId ?? -1);
        const link =
          p.receivingTxHash && destChain && destChain !== 'stellar'
            ? [chainTxLink(t, destChain, p.receivingTxHash)]
            : undefined;
        doneStep('bridge-send');
        doneStep('arrived', {
          note: p.deliveredAmount
            ? t('{{amount}} arrived.', {
                amount: formatCoin(Number(p.deliveredAmount), statusTx?.toSymbol ?? toSymbol),
              })
            : undefined,
          links: link,
        });
      }
    },
    // #62: awaited (capped) before the tracker shows 'done': the destination
    // chain's balances refresh FIRST, so "Done" never appears against a stale
    // balance that looks like lost funds. Same pattern as CCTP's finish().
    onArrival: async () => {
      startStep('balance');
      const destChain = registryChainOf(statusTx?.toChainId ?? -1);
      if (destChain && destChain !== 'stellar') await refetchChain(destChain);
    },
    onTerminal: (st) => {
      if (st === 'done') finishRun();
      else if (st === 'refunded')
        stopRun(
          t(
            '{{tool}} could not complete the swap and sent your {{coin}} back to your wallet. Nothing was lost.',
            { tool: runTool, coin: statusTx?.fromSymbol ?? fromSymbol }
          )
        );
      else
        failRun(
          t(
            'The swap did not complete. If your {{coin}} left your wallet, the bridge returns it by itself; Activity shows the final state.',
            { coin: statusTx?.fromSymbol ?? fromSymbol }
          )
        );
    },
  });

  const amountUsd = fromPrice.gt(0) ? amount.multipliedBy(fromPrice) : null;
  const belowMinimum = amount.gt(0) && amountUsd !== null && amountUsd.lt(MIN_SWAP_USD);
  // Doc 95 Wave 6: the fee reserve was applied by MAX only, so TYPING the
  // full balance walked straight past it and produced a swap with nothing
  // left to pay the miner/validator. ETH is exempt because its live gas
  // reserve already sits inside `fromBalance` (subtracting here would
  // double-reserve). One expression, used by the guard AND by MAX, so the
  // two cannot disagree.
  const spendable =
    fromSymbol === 'ETH' ? fromBalance : BigNumber.max(fromBalance.minus(from.feeReserve), 0);
  const insufficient = amount.gt(0) && amount.gt(spendable);
  // Gas honesty (Niko GO 2026-08-20): the quote carries the route's OWN gas
  // cost — surface it, warn when it eats >20% of the swap, block >50% (at
  // that point it's a donation to validators, not a swap). Percentage rule,
  // not a flat minimum: right on every chain at every gas price.
  const gasUsd = (quote?.estimate?.gasCosts ?? []).reduce(
    (acc, g) => acc + Number(g?.amountUSD ?? 0),
    0
  );
  const swapUsdIn = fromPrice.gt(0) ? amount.multipliedBy(fromPrice).toNumber() : 0;
  const gasShare = swapUsdIn > 0 && gasUsd > 0 ? gasUsd / swapUsdIn : 0;

  // One request shape for both callers. ROUND_DOWN, not BigNumber's default
  // ROUND_HALF_UP (doc 95 Wave 6): rounding a typed amount UP can ask to swap
  // one wire unit more than the wallet holds, which fails at execution for a
  // reason the user cannot see anywhere on screen.
  const quoteBody = (value: BigNumber) => ({
    fromSymbol,
    toSymbol,
    fromAmount: value
      .multipliedBy(BigNumber(10).pow(from.decimals))
      .toFixed(0, BigNumber.ROUND_DOWN),
    fromAddress,
    toAddress,
  });

  // Debounce the token amount; gated on `enabled` so the inactive engine never
  // fetches. `stale` (not the abort signal) settles the spinner deterministically.
  const debouncedAmount = useDebounce(enabled ? amount.toFixed() : '', 600);

  useEffect(() => {
    const value = BigNumber(debouncedAmount || 0);
    if (!enabled || !fromAddress || !toAddress || value.lte(0) || belowMinimum) {
      setQuote(null);
      setQuoteAt(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return undefined;
    }

    let stale = false;
    const controller = new AbortController();
    setQuote(null);
    setQuoteAt(null);
    setQuoteError(null);
    setQuoteLoading(true);

    (async () => {
      try {
        const result = await requestLifiQuote(quoteBody(value), {
          signal: controller.signal,
          cancelled: () => stale,
        });
        if (stale) return;
        if (!result.ok) {
          setQuoteError(friendlyAppError(result.error ?? t('Failed to fetch quote')));
        } else {
          setQuote(result.quote);
          // Doc 95 Wave 6: a quote is only usable for a while — stamp it so
          // the execute path can tell how old the one on screen is.
          setQuoteAt(Date.now());
          setFeePercent(result.feePercent);
        }
      } catch {
        if (!stale) setQuoteError(t('Failed to fetch quote'));
      } finally {
        if (!stale) setQuoteLoading(false);
      }
    })();

    return () => {
      stale = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, debouncedAmount, fromSymbol, toSymbol, fromAddress, toAddress, belowMinimum]);

  const toAmount = quote
    ? BigNumber(quote.estimate.toAmount).dividedBy(BigNumber(10).pow(to.decimals))
    : null;
  const toAmountMin = quote
    ? BigNumber(quote.estimate.toAmountMin).dividedBy(BigNumber(10).pow(to.decimals))
    : null;
  const rate = quote && amount.gt(0) && toAmount ? toAmount.dividedBy(amount) : null;
  const etaMinutes = quote ? Math.max(1, Math.round(quote.estimate.executionDuration / 60)) : null;

  // Normal's integrator fee — a fraction of the amount paid, taken by LI.FI on
  // our behalf (already reflected in the quoted output). Shown for transparency.
  const feeToken = quote && feePercent > 0 && amount.gt(0) ? amount.multipliedBy(feePercent) : null;
  const feeUsd = feeToken && fromPrice.gt(0) ? feeToken.multipliedBy(fromPrice) : null;
  const feeLabel = t('Normal fee ({{pct}}%)', { pct: +(feePercent * 100).toFixed(2) });

  // Reserve only what gas actually costs right now for ETH (live gas price ×
  // limit × buffer) — a flat reserve is either far too large in USD or too small
  // when gas spikes. Shared with the CCTP engine (gas-reserve.ts) so the two
  // can't drift. Returns the max in *token* units; the shell formats it.
  const getMaxToken = async (): Promise<BigNumber> =>
    // ETH's gas reserve now lives INSIDE fromBalance (the card holds it back
    // so TYPED amounts are gas-safe too, not just MAX) — subtracting again
    // here would double-reserve.
    spendable;
  const handleSetupSuccess = async () => {
    // The account EXISTS by the time this runs — the dialog reported success.
    // Closing must therefore not depend on the refresh succeeding: an
    // unguarded await left the "Set up Bitcoin wallet" dialog on screen after
    // the wallet was created, so the user could not tell it had worked (live
    // 2026-08-22). Refresh is best-effort; the close is not.
    try {
      if (setupChain) await refetchChain(setupChain);
    } catch {
      /* stale read only — the next render re-fetches */
    } finally {
      setSetupChain(null);
    }
  };

  // Gas spike between quote and send → the structured shortfall becomes a
  // choice dialog, never an error (nothing was signed when it fires).
  const [shortfall, setShortfall] = useState<{ tried: string; affordable: string } | null>(null);

  // ---- the review page -------------------------------------------------------
  const toolName = quote ? bridgeName(quote) : 'LI.FI';
  const livePlan: FlowPlan | null =
    quote && toAmount
      ? crossChainSwapPlan({
          t,
          from: fromSymbol,
          to: toSymbol,
          amountIn: formatCoin(amount.toNumber(), fromSymbol),
          amountOut: `≈ ${formatCoin(toAmount.toNumber(), toSymbol)}`,
          tool: toolName,
          fromWallet: { address: fromAddress, href: chainAddressHref(from.chain, fromAddress) },
          toWallet: { address: toAddress, href: chainAddressHref(to.chain, toAddress) },
          etaMinutes,
        })
      : null;
  const liveSummary: FlowSummary | null =
    quote && toAmount
      ? {
          rows: [
            {
              key: 'pay',
              label: t('You pay'),
              value: formatCoin(amount.toNumber(), fromSymbol),
              detail: amountUsd ? formatUsd(amountUsd.toNumber()) : undefined,
            },
            {
              key: 'get',
              label: t('You receive'),
              value: `≈ ${formatCoin(toAmount.toNumber(), toSymbol)}`,
            },
            ...(toAmountMin
              ? [
                  {
                    key: 'min',
                    label: t('At least'),
                    value: formatCoin(toAmountMin.toNumber(), toSymbol),
                    detail: t('Or the bridge sends your {{coin}} back', { coin: fromSymbol }),
                  },
                ]
              : []),
            ...(rate && readableRate(fromSymbol, toSymbol, rate.toNumber())
              ? [
                  {
                    key: 'rate',
                    label: t('Rate'),
                    value: readableRate(fromSymbol, toSymbol, rate.toNumber())!,
                  },
                ]
              : []),
            ...(feeToken
              ? [
                  {
                    key: 'fee',
                    label: feeLabel,
                    value: formatCoin(feeToken.toNumber(), fromSymbol),
                    detail: feeUsd ? formatUsd(feeUsd.toNumber()) : undefined,
                  },
                ]
              : []),
            ...(gasUsd > 0
              ? [
                  {
                    key: 'gas',
                    label: t('Network fees'),
                    value: `≈ ${formatUsd(gasUsd)}`,
                    detail: swapUsdIn > 0 ? shareOfSwap(t, gasShare) : undefined,
                    caution: gasShare > 0.2,
                  },
                ]
              : []),
            { key: 'route', label: t('Exchange'), value: toolName, detail: t('Picked by LI.FI') },
            ...(etaMinutes
              ? [{ key: 'time', label: t('Time'), value: t('About {{n}} min', { n: etaMinutes }) }]
              : []),
            { key: 'signatures', label: t('Signatures'), value: t('One') },
          ],
          note: t(
            'Exchanges move with the market. You receive at least the minimum above, or the bridge sends your coins back.'
          ),
        }
      : null;
  const liveLede =
    quote && toAmount
      ? t('{{pay}} for about {{get}}, through {{tool}}.', {
          pay: formatCoin(amount.toNumber(), fromSymbol),
          get: formatCoin(toAmount.toNumber(), toSymbol),
          tool: toolName,
        })
      : '';

  const resetFlow = useCallback(() => {
    resetRun();
    setFrozen(null);
    setPriceNotice(null);
    broadcastRef.current = false;
  }, [resetRun]);

  const handleConfirm = async () => {
    if (!quote || !livePlan || !liveSummary || confirming || executing) return;
    setConfirming(true);
    let approved = false;
    try {
      approved = await confirmAction();
    } finally {
      setConfirming(false);
    }
    if (!approved) return;

    setPriceNotice(null);
    setFrozen({ summary: liveSummary, lede: liveLede, tool: toolName });
    broadcastRef.current = false;
    beginRun(livePlan);
    startStep('price');
    setExecuting(true);
    try {
      // ------------------------------------------------------------------
      // Doc 95 Wave 6: a LI.FI quote carries a BUILT transaction. For Bitcoin
      // that is a Chainflip deposit CHANNEL, which expires — so executing a
      // quote the card fetched half an hour ago can mean sending coins to an
      // address that no longer routes anywhere. There is no bridge to fail
      // over from and nothing to refund; the only fix is to not send it.
      // ------------------------------------------------------------------
      let live = quote;
      if (isQuoteStale(Date.now() - (quoteAt ?? NaN))) {
        const shownOut = toAmount ? toAmount.toFixed() : null;
        const fresh = await requestLifiQuote(quoteBody(amount));
        if (!fresh.ok) {
          // Nothing has been signed at this point — say exactly that.
          failRun(
            t(
              'This price expired and a new one could not be fetched. Nothing was sent. Please try again.'
            )
          );
          return;
        }
        const freshOut = BigNumber(fresh.quote.estimate.toAmount)
          .dividedBy(BigNumber(10).pow(to.decimals))
          .toFixed();
        setQuote(fresh.quote);
        setQuoteAt(Date.now());
        setFeePercent(fresh.feePercent);
        if (driftVerdict(shownOut, freshOut) === 'worse') {
          // The deal on screen is no longer the deal on offer. Back to the
          // review with the new numbers: confirming again is the consent. We
          // never execute silently at a materially worse price.
          resetRun();
          setFrozen(null);
          setPriceNotice(
            t(
              'The price moved while this was open, so the amounts below are new. Confirm again if they work for you.'
            )
          );
          return;
        }
        live = fresh.quote;
      }
      doneStep('price');

      const txHash = await executeLifiSwap(
        live,
        {
          bitcoinAddress: addresses.BTC,
          ethereumAddress: addresses.ETH,
          solanaAddress: addresses.SOL,
        },
        {
          onStage: (stage) =>
            stage === 'sign' ? startStep('sign', { waiting: true }) : startStep('send'),
        }
      );
      broadcastRef.current = true;
      updateStep('send', {
        links: [chainTxLink(t, from.chain, txHash), lifiTrackLink(t, txHash)],
      });

      // Start the background tracker; the page follows it.
      setStatusTx({
        txHash,
        fromChainId: live.action.fromChainId,
        toChainId: live.action.toChainId,
        fromSymbol,
        toSymbol,
        amountIn: amount.toFixed(),
        amountOut: (toAmount ?? BigNumber(0)).toFixed(),
        // The applied integrator fee (doc 123) — undefined when the quote
        // carried none (1011 fallback), so the record stores null, not a lie.
        feeAmount: feePercent > 0 ? amount.times(feePercent).toFixed() : undefined,
      });
      // Source tx is broadcast and recorded — surface the row NOW, not at
      // the first tracker tick (same rule as cctp, 2026-08-19).
      window.dispatchEvent(new Event('nf:activity-updated'));
      resetInput();
      setQuote(null);
      setQuoteAt(null);
    } catch (err: any) {
      const { GasShortfallError, maxAffordableEth } = await import('@/lib/lifi/gas-shortfall');
      if (err instanceof GasShortfallError) {
        // Pre-sign shortfall: nothing was signed. Back to the review, and
        // offer the affordable amount instead of an error.
        resetRun();
        setFrozen(null);
        setShortfall({ tried: amount.toFixed(), affordable: maxAffordableEth(err) });
        return;
      }
      logger.error('[lifi engine] execute failed:', err); // surface stack
      if (isBroadcastUncertain(err)) {
        // It may have gone out: no "Try again", which could be a second swap.
        // The page says so and links the transaction where its id is known.
        broadcastRef.current = true;
        if (err.hash) updateStep('send', { links: [chainTxLink(t, from.chain, err.hash)] });
        failRun(t(UNCERTAIN_SEND_MESSAGE));
        return;
      }
      failRun(
        isInsufficientGasError(err)
          ? t('Not enough ETH left to pay the network fee. Try a slightly smaller amount.')
          : friendlyAppError(err)
      );
    } finally {
      setExecuting(false);
    }
  };

  // Button state machine — the gates implement lazy wallet setup explicitly.
  const button = useMemo(() => {
    if (!enabled) return { label: t('Enter an amount'), action: null, loading: false };
    if (!user)
      return {
        label: t('Sign in to swap'),
        action: () => window.dispatchEvent(new CustomEvent('nf:open-login')),
        loading: false,
      };
    if (!fromAddress)
      return {
        label: t('Set up {{chain}} wallet', { chain: from.name }),
        action: () => setSetupChain(from.chain),
        loading: false,
      };
    if (!toAddress)
      return {
        label: t('Set up {{chain}} wallet', { chain: to.name }),
        action: () => setSetupChain(to.chain),
        loading: false,
      };
    if (amount.lte(0)) return { label: t('Enter an amount'), action: null, loading: false };
    if (insufficient)
      return {
        label: t('Insufficient {{symbol}} balance', { symbol: fromSymbol }),
        action: null,
        loading: false,
      };
    if (gasShare > 0.5)
      return {
        label: t('Network fees exceed half this swap: try a larger amount'),
        action: null,
        loading: false,
        helper: (
          <Typography sx={{ fontSize: '12px', color: '#6B6B76', textAlign: 'center', px: 1 }}>
            {t('This route costs ~${{gas}} in network gas regardless of size.', {
              gas: gasUsd.toFixed(2),
            })}
          </Typography>
        ),
      };
    if (belowMinimum)
      return {
        label: t('Minimum swap is ${{min}}', { min: MIN_SWAP_USD }),
        action: null,
        loading: false,
      };
    if (quoteLoading) return { label: t('Fetching quote…'), action: null, loading: false };
    if (quoteError) return { label: t('Quote unavailable'), action: null, loading: false };
    if (!quote) return { label: t('Fetching quote…'), action: null, loading: false };
    if (executing)
      return { label: t('Confirm in your passkey prompt…'), action: null, loading: true };
    // Opens the review page; only its confirm button runs the swap.
    return { label: t('Review swap'), action: handleConfirm, loading: false, review: true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    user,
    fromAddress,
    toAddress,
    amount,
    insufficient,
    belowMinimum,
    quoteLoading,
    quoteError,
    quote,
    executing,
    fromSymbol,
    from,
    to,
    t,
  ]);

  const details =
    quote && !quoteLoading ? (
      <Stack spacing={0.75}>
        {rate && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: '12px', color: '#6B6B76' }}>{t('Rate')}</Typography>
            <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#0A0A0F', ...MONO }}>
              1 {fromSymbol} ≈ {rate.toFixed(6)} {toSymbol}
            </Typography>
          </Box>
        )}
        {gasUsd > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: '12px', color: '#6B6B76' }}>{t('Network gas')}</Typography>
            <Typography
              sx={{
                fontSize: '12px',
                fontWeight: 500,
                color: gasShare > 0.2 ? BRAND_COLORS.yellow.deep : '#0A0A0F',
                ...MONO,
              }}
            >
              {`≈ $${gasUsd.toFixed(2)}`}
              {swapUsdIn > 0 ? ` (${Math.round(gasShare * 100)}%)` : ''}
            </Typography>
          </Box>
        )}
        {gasShare > 0.2 && gasShare <= 0.5 && (
          <Typography sx={{ fontSize: '11px', color: BRAND_COLORS.yellow.deep, lineHeight: 1.5 }}>
            {t('Network fees take {{pct}}% of this swap. A larger amount gets a better deal.', {
              pct: Math.round(gasShare * 100),
            })}
          </Typography>
        )}
        {toAmountMin && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: '12px', color: '#6B6B76' }}>
              {t('Minimum received')}
            </Typography>
            <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#0A0A0F', ...MONO }}>
              {toAmountMin.toFixed(6, BigNumber.ROUND_DOWN)} {toSymbol}
            </Typography>
          </Box>
        )}
        {feeToken && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: '12px', color: '#6B6B76' }}>{feeLabel}</Typography>
            <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#0A0A0F', ...MONO }}>
              −{feeToken.toFixed(6, BigNumber.ROUND_DOWN)} {fromSymbol}
              {feeUsd ? ` (${fCurrency(feeUsd)})` : ''}
            </Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: '12px', color: '#6B6B76' }}>{t('Route')}</Typography>
          <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#0A0A0F' }}>
            {quote.tool}
          </Typography>
        </Box>
        {etaMinutes !== null && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: '12px', color: '#6B6B76' }}>
              {t('Estimated time')}
            </Typography>
            <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#0A0A0F' }}>
              ~{etaMinutes} {t('min')}
            </Typography>
          </Box>
        )}
      </Stack>
    ) : null;

  const footer = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        mt: '12px',
        justifyContent: 'center',
      }}
    >
      <Iconify icon="eva:info-outline" width={13} sx={{ color: '#9A9AA3' }} />
      <Typography sx={{ fontSize: '12px', color: '#9A9AA3' }}>
        {t('{{symbol}} is delivered to your own Normal wallet address.', { symbol: toSymbol })}
      </Typography>
    </Box>
  );

  const modals = (
    <>
      {shortfall && (
        <GasShortfallDialog
          open
          triedAmountEth={shortfall.tried}
          affordableEth={shortfall.affordable}
          onUseAffordable={() => {
            onAmountAdjusted?.(shortfall.affordable);
            setShortfall(null);
            enqueueSnackbar(t('Amount updated. Look over the new quote, then confirm.'), {
              variant: 'info',
            });
          }}
          onCancel={() => setShortfall(null)}
        />
      )}
      {user && setupChain && (
        <ChainSetupDialog
          open
          onClose={() => setSetupChain(null)}
          chain={setupChain}
          userId={user.id}
          userEmail={user.email}
          onSuccess={handleSetupSuccess}
        />
      )}
    </>
  );

  // While a fresh price loads under an open review (a new amount after a gas
  // spike), the review keeps the last numbers and holds its confirm button.
  const lastLiveRef = useRef<{ plan: FlowPlan; summary: FlowSummary; lede: string } | null>(null);
  if (livePlan && liveSummary)
    lastLiveRef.current = { plan: livePlan, summary: liveSummary, lede: liveLede };
  const reviewPlan = livePlan ?? (quoteLoading ? (lastLiveRef.current?.plan ?? null) : null);
  const reviewSummary =
    liveSummary ?? (quoteLoading ? (lastLiveRef.current?.summary ?? null) : null);
  const reviewLede = livePlan ? liveLede : (lastLiveRef.current?.lede ?? liveLede);
  const shownPlan = flowState.phase === 'review' ? reviewPlan : (frozenPlan ?? reviewPlan);
  const shownSummary =
    flowState.phase === 'review' ? reviewSummary : (frozen?.summary ?? reviewSummary);
  // Before the payment is confirmed on its own chain, the tab records the
  // swap; after that, the bridge delivers whether or not the page is open.
  const beforeSource = ['price', 'sign', 'send'].includes(flowState.activeId ?? '');
  const flow: SwapFlow | null =
    enabled && shownPlan && shownSummary
      ? {
          plan: shownPlan,
          summary: shownSummary,
          run: flowState,
          lede: flowState.phase === 'review' ? reviewLede : (frozen?.lede ?? reviewLede),
          confirm: handleConfirm,
          blocked:
            quoteLoading || !quote ? t('Getting a fresh price…') : quoteError ? quoteError : null,
          busy: confirming,
          leave: beforeSource
            ? {
                safe: false,
                message: t(
                  'Keep this page open until {{chain}} confirms the payment, usually within a minute. After that it finishes on its own.',
                  { chain: from.name }
                ),
              }
            : {
                safe: true,
                message: t(
                  '{{tool}} delivers it whether or not this page is open. You can follow it in Activity.',
                  { tool: runTool }
                ),
              },
          failActions: broadcastRef.current
            ? []
            : [{ label: t('Try again'), primary: true, onClick: resetFlow }],
          notice: priceNotice ? <FlowNotice>{priceNotice}</FlowNotice> : undefined,
          doneNote: t('Your {{coin}} is in your {{chain}} wallet.', {
            coin: toSymbol,
            chain: to.name,
          }),
          reset: resetFlow,
        }
      : null;

  return {
    flow,
    toAmount,
    quoteLoading: enabled ? quoteLoading : false,
    quoteError: enabled ? quoteError : null,
    details,
    footer,
    button,
    modals,
    getMaxToken,
  };
}
