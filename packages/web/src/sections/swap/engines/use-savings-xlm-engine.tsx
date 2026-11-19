'use client';

import type { FlowPlan, FlowSummary } from '@/lib/flow/types';
import type { ActionState, CreatedAction } from '@/lib/stellar/run-action';

import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { MUTED } from '@/theme/brand-colors';
import { useFlowRun } from '@/hooks/use-flow-run';
import { useDebounce } from '@/hooks/use-debounce';
import { Asset, Horizon } from '@stellar/stellar-sdk';
import { useNetworkStore } from '@normalfinance/state';
import { confirmAction } from '@/lib/auth/action-code';
import { getSavingsUsdcIssuer } from '@/utils/token-selectors';
import { bumpSavingsReadEpoch } from '@/lib/savings-read-guard';
import { POSITION_SYNC_EVENT } from '@/hooks/use-savings-position';
import { friendlyAppError } from '@/utils/errors/error-classifier';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import { xlmToSavingsPlan, savingsToXlmPlan } from '@/lib/flow/plans';
import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { getYieldCommission, SAVINGS_DEPOSIT_FEE_RATE } from '@/utils/normal-fees';
import { xlmAvailableForFees, MIN_XLM_FOR_SAVINGS_TX } from '@/utils/stellar-reserve';

import Typography from '@mui/material/Typography';

import { formatUsd, formatCoin } from '@/components/_common/app-ui';
import { stellarTxLink } from '@/components/_common/flow/flow-links';

import type { SwapFlow, SwapEngineResult } from './types';

// ---------------------------------------------------------------------------
// Doc 129 Phase 5c: XLM → Savings and Savings → XLM, one signature each.
//
// The price comes from Stellar's own exchange (Horizon path finding), as the
// server's does: Soroswap's direct USDC/XLM pool is shallow (doc 129 §11).
// The fees are what the same steps cost one by one: a swap's 0.5% on the coin
// paid with, then the Savings deposit fee, or the commission on earnings.
// Confirm asks the server to price and build it again (api/stellar/actions),
// refuses noticeably less than reviewed, signs it all with one passkey prompt
// and follows it to the end (lib/stellar/run-action.ts).
// ---------------------------------------------------------------------------

export type SavingsXlmMode = 'xlm_to_savings' | 'savings_to_xlm';

export interface SavingsXlmEngineProps {
  /** null ⇒ off (any other pair or source). */
  mode: SavingsXlmMode | null;
  amount: BigNumber;
  /** XLM the wallet can spend, or what is in Savings. */
  fromBalance: BigNumber;
  fromPrice: BigNumber;
  /** The Normal wallet's Savings position: the commission on earnings. */
  savings: { currentValue: string; earnings: string } | null;
  /** The Normal wallet: every transaction and permission is its own. */
  stellarAddress: string | null;
  resetInput: () => void;
  refreshAggregate?: () => Promise<unknown>;
}

/** A swap's fee (utils/normal-fees getSwapFeeAmount). */
const SWAP_FEE = 0.005;
/** The room the server keeps on a classic swap (server/relayed-actions PATH_SLIPPAGE_BPS). */
const SWAP_ROOM = 0.99;
/** What a Savings withdrawal for a swap guarantees per dollar asked (10 bps). */
const SAVINGS_ROOM = 0.999;
/** The server's price may be this much worse than the review's, no more. */
const DRIFT = 0.995;

type Quote =
  | {
      kind: 'xlm_to_savings';
      swapFee: BigNumber;
      usdc: BigNumber;
      depositFee: BigNumber;
      deposit: BigNumber;
    }
  | {
      kind: 'savings_to_xlm';
      commission: BigNumber;
      swapFee: BigNumber;
      swapIn: BigNumber;
      xlmOut: BigNumber;
      xlmMin: BigNumber;
    };

const down7 = (n: BigNumber) => n.decimalPlaces(7, BigNumber.ROUND_DOWN);

export function useSavingsXlmEngine({
  mode,
  amount,
  fromBalance,
  fromPrice,
  savings,
  stellarAddress,
  resetInput,
  refreshAggregate,
}: SavingsXlmEngineProps): SwapEngineResult {
  const { t } = useTranslate();
  const config = useStellarConfig();
  const network = useNetworkStore((s) => s.network);
  const {
    xlmBalance,
    accountExists,
    isLoading: isCheckingAccount,
    hasUsdcTrustline,
  } = useAccountStatus(mode ? (stellarAddress ?? undefined) : undefined);
  const {
    run: flowState,
    plan: frozenPlan,
    begin: beginRun,
    start: startStep,
    done: doneStep,
    fail: failRun,
    finish: finishRun,
    handOff,
    reset: resetRun,
  } = useFlowRun();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [frozen, setFrozen] = useState<{ summary: FlowSummary; lede: string } | null>(null);
  const runningRef = useRef(false);

  const usdcAsset = useMemo(() => {
    const issuer = getSavingsUsdcIssuer(config);
    return issuer ? new Asset('USDC', issuer) : null;
  }, [config]);
  const commissionOf = useCallback(
    (value: BigNumber) =>
      savings && value.gt(0)
        ? down7(
            BigNumber(
              getYieldCommission({
                withdrawAmount: value.toNumber(),
                currentValue: Number(savings.currentValue),
                earnings: Number(savings.earnings),
              })
            )
          )
        : BigNumber(0),
    [savings]
  );

  // ---- the quote: Stellar's own exchange ----------------------------------------------
  const debounced = useDebounce(mode ? amount.toFixed() : '', 600);
  useEffect(() => {
    const value = BigNumber(debounced || 0);
    if (!mode || !usdcAsset || value.lte(0) || runningRef.current) {
      if (!runningRef.current) {
        setQuote(null);
        setQuoteError(null);
        setQuoteLoading(false);
      }
      return undefined;
    }
    let stale = false;
    setQuoteLoading(true);
    setQuoteError(null);
    (async () => {
      try {
        const horizon = new Horizon.Server(config.HORIZON_URL, {
          allowHttp: config.HORIZON_URL.startsWith('http://'),
        });
        const best = async (send: Asset, units: BigNumber, dest: Asset) => {
          const page = await horizon
            .strictSendPaths(send, units.toFixed(7, BigNumber.ROUND_DOWN), [dest])
            .call();
          return page.records.reduce<BigNumber | null>((top, r) => {
            const out = BigNumber(r.destination_amount);
            return !top || out.gt(top) ? out : top;
          }, null);
        };
        if (mode === 'xlm_to_savings') {
          const swapFee = down7(value.multipliedBy(SWAP_FEE));
          const out = await best(Asset.native(), value.minus(swapFee), usdcAsset);
          if (stale) return;
          if (!out) throw new Error(t('There is no XLM to USDC route right now.'));
          const usdc = down7(out.multipliedBy(SWAP_ROOM));
          const depositFee = down7(usdc.multipliedBy(SAVINGS_DEPOSIT_FEE_RATE));
          setQuote({ kind: mode, swapFee, usdc, depositFee, deposit: usdc.minus(depositFee) });
        } else {
          const commission = commissionOf(value);
          const available = down7(value.multipliedBy(SAVINGS_ROOM)).minus(commission);
          const swapFee = down7(available.multipliedBy(SWAP_FEE));
          const swapIn = available.minus(swapFee);
          if (swapIn.lte(0)) throw new Error(t('Swap at least 1 USDC from Savings.'));
          const out = await best(usdcAsset, swapIn, Asset.native());
          if (stale) return;
          if (!out) throw new Error(t('There is no USDC to XLM route right now.'));
          setQuote({
            kind: mode,
            commission,
            swapFee,
            swapIn,
            xlmOut: out,
            xlmMin: down7(out.multipliedBy(SWAP_ROOM)),
          });
        }
      } catch (e) {
        if (!stale) {
          setQuote(null);
          setQuoteError(friendlyAppError(e));
        }
      } finally {
        if (!stale) setQuoteLoading(false);
      }
    })();
    return () => {
      stale = true;
    };
  }, [mode, debounced, usdcAsset, config.HORIZON_URL, commissionOf, t]);

  const toAmount = !quote ? null : quote.kind === 'xlm_to_savings' ? quote.deposit : quote.xlmOut;

  // ---- the review --------------------------------------------------------------------
  const walletRef = useMemo(() => ({ address: stellarAddress ?? undefined }), [stellarAddress]);
  const coin = (n: BigNumber, symbol: string) => formatCoin(n.toNumber(), symbol);
  const buildPlan = (): FlowPlan | null => {
    if (!quote) return null;
    return quote.kind === 'xlm_to_savings'
      ? xlmToSavingsPlan({
          t,
          amountXlm: coin(amount, 'XLM'),
          swapFee: coin(quote.swapFee, 'XLM'),
          usdc: coin(quote.usdc, 'USDC'),
          depositFee: quote.depositFee.gt(0) ? coin(quote.depositFee, 'USDC') : null,
          deposit: coin(quote.deposit, 'USDC'),
          wallet: walletRef,
        })
      : savingsToXlmPlan({
          t,
          amount: coin(amount, 'USDC'),
          commission: quote.commission.gt(0) ? coin(quote.commission, 'USDC') : null,
          swapIn: coin(quote.swapIn, 'USDC'),
          swapFee: coin(quote.swapFee, 'USDC'),
          xlmOut: `≈ ${coin(quote.xlmOut, 'XLM')}`,
          xlmMin: coin(quote.xlmMin, 'XLM'),
          wallet: walletRef,
        });
  };
  const buildSummary = (): FlowSummary | null => {
    if (!quote) return null;
    const pay = {
      key: 'pay',
      label: t('You pay'),
      value: coin(amount, quote.kind === 'xlm_to_savings' ? 'XLM' : 'USDC'),
      detail:
        quote.kind === 'savings_to_xlm'
          ? t('From Savings')
          : fromPrice.gt(0)
            ? formatUsd(amount.multipliedBy(fromPrice).toNumber())
            : undefined,
    };
    const signatures = {
      key: 'signatures',
      label: t('Signatures'),
      value: t('One'),
      detail: t('Your passkey signs it all at once.'),
    };
    return quote.kind === 'xlm_to_savings'
      ? {
          rows: [
            pay,
            {
              key: 'fee',
              label: t('Normal fee (0.5%)'),
              value: coin(quote.swapFee, 'XLM'),
              detail: t('In the swap’s own transaction'),
            },
            {
              key: 'usdc',
              label: t('Swapped to USDC'),
              value: coin(quote.usdc, 'USDC'),
              detail: t('Exactly this, on Stellar’s own exchange'),
            },
            ...(quote.depositFee.gt(0)
              ? [
                  {
                    key: 'deposit-fee',
                    label: t('Savings fee'),
                    value: coin(quote.depositFee, 'USDC'),
                    detail: t('As with any deposit'),
                  },
                ]
              : []),
            { key: 'get', label: t('Into Savings'), value: coin(quote.deposit, 'USDC') },
            signatures,
          ],
          note: t(
            'Your money is only ever in your own wallet or your own Savings. Normal sends the deposit you signed and pays its network fee.'
          ),
        }
      : {
          rows: [
            pay,
            ...(quote.commission.gt(0)
              ? [
                  {
                    key: 'commission',
                    label: t('Commission on earnings'),
                    value: coin(quote.commission, 'USDC'),
                    detail: t('Normal’s share of what Savings earned, as with any withdrawal'),
                  },
                ]
              : []),
            {
              key: 'fee',
              label: t('Normal fee (0.5%)'),
              value: coin(quote.swapFee, 'USDC'),
              detail: t('In the swap’s own transaction'),
            },
            { key: 'get', label: t('You receive'), value: `≈ ${coin(quote.xlmOut, 'XLM')}` },
            {
              key: 'min',
              label: t('At least'),
              value: coin(quote.xlmMin, 'XLM'),
              detail: t('Or the swap does not happen, and your money stays as digital dollars'),
            },
            signatures,
          ],
          note: t(
            'Your money is only ever in your own Savings or your own wallet. Each step is sent after the one before it has landed.'
          ),
        };
  };
  const lede = !quote
    ? ''
    : quote.kind === 'xlm_to_savings'
      ? t('{{pay}} into Savings as {{get}}, over Stellar’s own exchange.', {
          pay: coin(amount, 'XLM'),
          get: coin(quote.deposit, 'USDC'),
        })
      : t('{{pay}} from Savings for about {{get}}, over Stellar’s own exchange.', {
          pay: coin(amount, 'USDC'),
          get: coin(quote.xlmOut, 'XLM'),
        });

  // ---- confirm: price again, sign once, follow ------------------------------------------
  const handleConfirm = async () => {
    if (!quote || !mode || !stellarAddress || confirming || runningRef.current) return;
    setConfirming(true);
    let approved = false;
    try {
      approved = await confirmAction();
    } finally {
      setConfirming(false);
    }
    if (!approved) return;
    const plan = buildPlan();
    const summary = buildSummary();
    if (!plan || !summary) return;
    setFrozen({ summary, lede });
    runningRef.current = true;
    beginRun(plan);
    try {
      startStep('record');
      let created: CreatedAction;
      let firstXdr: string;
      const asked = amount.toFixed(7, BigNumber.ROUND_DOWN);
      if (quote.kind === 'savings_to_xlm') {
        const { buildAuthHeaders } = await import('@/utils/http');
        const res = await fetch('/api/savings/withdraw', {
          method: 'POST',
          headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: asked, caller: stellarAddress, slippageBps: 10 }),
        });
        const built = await res.json().catch(() => null);
        if (!res.ok || !built?.success || !built.xdr || !built.minOut) {
          throw new Error(
            built?.error ??
              t(
                'Savings could not prepare this withdrawal, so nothing moved. Try again in a moment.'
              )
          );
        }
        firstXdr = built.xdr;
        created = await (
          await import('@/lib/stellar/run-action')
        ).createAction({
          kind: mode,
          amount: asked,
          withdrawXdr: built.xdr,
          commission: quote.commission.toFixed(7, BigNumber.ROUND_DOWN),
        });
      } else {
        created = await (
          await import('@/lib/stellar/run-action')
        ).createAction({ kind: mode, amountXlm: asked });
        firstXdr = created.ownTxs[0];
      }
      doneStep('record');
      startStep('prepare');
      // The server priced it again: never take noticeably less than reviewed.
      const worse =
        quote.kind === 'xlm_to_savings'
          ? BigNumber(created.plan.deposit ?? 0).lt(quote.deposit.multipliedBy(DRIFT))
          : BigNumber(created.plan.xlmMin ?? 0).lt(quote.xlmMin.multipliedBy(DRIFT));
      if (worse) {
        throw new Error(
          t('The price moved while this was open, so nothing was sent. Review the swap again.')
        );
      }
      doneStep('prepare');

      // The relayed steps, in order, as the server reports them.
      const ids =
        quote.kind === 'xlm_to_savings'
          ? created.steps.map((s) => (s.kind === 'deposit' ? 'deposit' : 'deposit-fee'))
          : created.steps.length > 1
            ? ['commission', 'swap']
            : ['swap'];
      const follow = (state: ActionState) => {
        state.steps.forEach((s, i) => {
          if (!ids[i] || (s.status !== 'SUBMITTED' && s.status !== 'DONE')) return;
          startStep(ids[i], s.txHash ? { links: [stellarTxLink(t, s.txHash)] } : {});
          if (s.status === 'DONE') {
            doneStep(ids[i], s.txHash ? { links: [stellarTxLink(t, s.txHash)] } : {});
          }
        });
      };
      const { signAndRunAction } = await import('@/lib/stellar/run-action');
      const finalState = await signAndRunAction({
        network: network === 'mainnet' ? 'mainnet' : 'testnet',
        account: stellarAddress,
        created,
        firstXdr,
        onSigning: () => startStep('sign', { waiting: true }),
        onCommitted: (hash, state) => {
          startStep(quote.kind === 'xlm_to_savings' ? 'swap' : 'withdraw', {
            links: [stellarTxLink(t, hash)],
          });
          window.dispatchEvent(new Event('nf:activity-updated'));
          follow(state);
        },
        onState: follow,
      });
      if (finalState.failed) throw new Error(finalState.failed);
      if (!finalState.done) {
        handOff(t('This finishes on its own in a moment. You can follow it in Activity.'));
        return;
      }
      // Savings changed: re-read it everywhere.
      bumpSavingsReadEpoch(stellarAddress);
      window.dispatchEvent(new CustomEvent(POSITION_SYNC_EVENT));
      window.dispatchEvent(new Event('nf:activity-updated'));
      startStep('balance');
      await Promise.race([
        refreshAggregate?.().catch(() => {}),
        new Promise((r) => {
          setTimeout(r, 15_000);
        }),
      ]);
      finishRun();
      resetInput();
    } catch (e) {
      failRun(friendlyAppError(e));
    } finally {
      runningRef.current = false;
    }
  };

  const resetFlow = useCallback(() => {
    resetRun();
    setFrozen(null);
  }, [resetRun]);

  // ---- the button ------------------------------------------------------------------------
  const insufficient = amount.gt(0) && amount.gt(fromBalance);
  const lowFeeXlm =
    mode === 'savings_to_xlm' &&
    !isCheckingAccount &&
    accountExists &&
    xlmAvailableForFees(xlmBalance).lt(MIN_XLM_FOR_SAVINGS_TX);
  const tooSmall =
    !!quote && (quote.kind === 'xlm_to_savings' ? quote.deposit.lt(1) : quote.swapIn.lt(1));
  const noUsdcLine =
    mode === 'xlm_to_savings' && !isCheckingAccount && accountExists && !hasUsdcTrustline;
  const button = (() => {
    if (!mode || amount.lte(0))
      return { label: t('Enter an amount'), action: null, loading: false };
    if (insufficient) return { label: t('Insufficient balance'), action: null, loading: false };
    if (!stellarAddress) {
      return { label: t('Set up your Normal wallet first'), action: null, loading: false };
    }
    if (noUsdcLine) {
      return {
        label: t('Add digital dollars to your wallet first'),
        action: null,
        loading: false,
        helper: (
          <Typography sx={{ fontSize: '12px', color: MUTED, textAlign: 'center' }}>
            {t('Your wallet needs USDC switched on before Savings can take it.')}
          </Typography>
        ),
      };
    }
    if (lowFeeXlm) {
      return {
        label: t('Top up XLM to swap'),
        action: null,
        loading: false,
        helper: (
          <Typography sx={{ fontSize: '12px', color: MUTED, textAlign: 'center' }}>
            {t('Taking money out of Savings pays a small Stellar network fee in XLM.')}
          </Typography>
        ),
      };
    }
    if (quoteError) return { label: t('Try a different amount'), action: null, loading: false };
    if (quoteLoading || !quote) {
      return { label: t('Fetching quote…'), action: null, loading: false };
    }
    if (tooSmall) {
      return {
        label:
          mode === 'xlm_to_savings'
            ? t('Savings takes at least 1 USDC')
            : t('Swap at least 1 USDC from Savings'),
        action: null,
        loading: false,
      };
    }
    // Opens the review page; only its confirm button runs it.
    return { label: t('Review swap'), action: () => {}, loading: false, review: true };
  })();

  const livePlan = buildPlan();
  const liveSummary = buildSummary();
  const shownPlan = flowState.phase === 'review' ? livePlan : (frozenPlan ?? livePlan);
  const shownSummary =
    flowState.phase === 'review' ? liveSummary : (frozen?.summary ?? liveSummary);
  const flow: SwapFlow | null =
    mode && shownPlan && shownSummary
      ? {
          plan: shownPlan,
          summary: shownSummary,
          run: flowState,
          lede: flowState.phase === 'review' ? lede : (frozen?.lede ?? lede),
          confirm: () => {
            void handleConfirm();
          },
          blocked: quoteLoading ? t('Getting a fresh price…') : null,
          busy: confirming,
          leave: ['record', 'prepare', 'sign'].includes(flowState.activeId ?? '')
            ? {
                safe: false,
                message: t('Stay a few seconds until it is sent, so no prompt is left open.'),
              }
            : {
                safe: true,
                message: t('Normal finishes this in seconds, with or without this page.'),
              },
          failActions: [{ label: t('Try again'), primary: true, onClick: resetFlow }],
          doneNote:
            mode === 'xlm_to_savings'
              ? t('Your money is in Savings.')
              : t('Your XLM is in your wallet.'),
          reset: resetFlow,
        }
      : null;

  const getMaxToken = useCallback(
    async (): Promise<BigNumber> =>
      // From XLM, leave a little for the swap's own network fee.
      mode === 'xlm_to_savings' ? BigNumber.max(fromBalance.minus(0.01), 0) : fromBalance,
    [mode, fromBalance]
  );

  return {
    toAmount,
    quoteLoading,
    quoteError,
    details: null,
    footer: null,
    button,
    modals: null,
    getMaxToken,
    flow,
  };
}
