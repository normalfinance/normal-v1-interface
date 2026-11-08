'use client';

// Composite cross-ecosystem engine (Circle CCTP + LI.FI + Soroswap).
//
//   INBOUND   BTC/ETH/SOL → XLM/USDC on Stellar
//     LI.FI (native → USDC on the user's own Base address) → relayer gas
//     top-up → user-signed burn → attestation → relayer mint_and_forward on
//     Stellar → optional Soroswap USDC→XLM.
//   OUTBOUND  USDC (Stellar) → BTC/ETH/SOL
//     user-signed approve+deposit_for_burn on Soroban → attestation (~seconds,
//     Stellar finality) → relayer mint on Base → relayer gas top-up →
//     user-signed LI.FI pivot swap (USDC on Base → target asset, delivered to
//     the user's own address on the target chain).
//
// The transfer row is created BEFORE anything moves; each completed leg is
// PATCHed onto it. Post-burn CCTP stages self-complete server-side (cron), so
// a closed tab never loses funds; pre-burn/pivot legs live at the user's own
// addresses at every step.

import type { BridgeProgress } from '@/lib/flow/lifi-status';
import type { FlowPlan, FlowSummary } from '@/lib/flow/types';

import { logger } from '@/utils/logger';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { CHAINS } from '@/lib/chains/registry';
import { buildAuthHeaders } from '@/utils/http';
import { fCurrency } from '@/utils/format-number';
import { runCctpRefund } from '@/lib/cctp/refund';
import { useFlowRun } from '@/hooks/use-flow-run';
import { useDebounce } from '@/hooks/use-debounce';
import { burnUsdcOnEvm } from '@/lib/cctp/burn-evm';
import { executeLifiSwap } from '@/lib/lifi/execute';
import { abortTimeout } from '@/utils/abort-timeout';
import { scopedAmountWire } from '@/lib/cctp/amounts';
import { confirmAction } from '@/lib/auth/action-code';
import { executePivotSwap } from '@/lib/cctp/pivot-swap';
import { evmAddressToBytes } from '@/lib/cctp/addresses';
import { EVM_USDC, CCTP_DOMAIN } from '@/lib/cctp/config';
import { burnUsdcOnStellar } from '@/lib/cctp/burn-stellar';
import { usdcToWire, wireToUsdc } from '@/lib/cctp/decimals';
import { connectedWalletLabel } from '@/lib/portfolio/display';
import { baseFallbackTransport } from '@/lib/chains/rpc-fallback';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { friendlyAppError } from '@/utils/errors/error-classifier';
import { parseDeliveredAmount } from '@/lib/cctp/delivered-amount';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';
import { bridgeName, readBridgeStatus } from '@/lib/flow/lifi-status';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import { usePersistStore, useNetworkStore } from '@normalfinance/state';
import { useAssetActionsContext } from '@/providers/AssetActionsProvider';
import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { cctpRefundPlan, cctpInboundPlan, cctpOutboundPlan } from '@/lib/flow/plans';
import { xlmAvailableForFees, MIN_XLM_FOR_SAVINGS_TX } from '@/utils/stellar-reserve';
import { setActiveCctpTransfer, getActiveCctpTransfer } from '@/lib/cctp/active-transfer';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useSnackbar } from '@/components/template/snackbar';
import { formatUsd, formatCoin } from '@/components/_common/app-ui';
import GasShortfallDialog from '@/components/_common/gas-shortfall-dialog';
import { ChainSetupDialog } from '@/components/_common/chain-setup-dialog';
import { FlowNotice, shareOfSwap, readableRate } from '@/components/_common/flow';
import AutopilotConsentDialog from '@/components/_common/autopilot-consent-dialog';
import {
  baseTxLink,
  chainTxLink,
  lifiTrackLink,
  stellarTxLink,
  baseAddressHref,
  chainAddressHref,
  stellarAccountHref,
} from '@/components/_common/flow/flow-links';

import { groupOf } from './types';
import { createAutopilotGate } from './autopilot-gate';
import { isInsufficientGasError } from './gas-reserve';

import type { SwapFlow, SwapSymbol, SwapEngineResult, CrosschainSymbol } from './types';

/** Where the run is, for this engine's own rules (bring-back, the button). */
type CctpStage =
  | 'funding'
  | 'burn-prepare'
  | 'lifi'
  | 'arriving'
  | 'topup'
  | 'burn'
  | 'bridging'
  | 'pivot-swap'
  | 'delivering'
  | 'done';

const MONO = { fontFamily: '"Geist Mono", ui-monospace, monospace' } as const;

export interface CctpEngineProps {
  fromSymbol: SwapSymbol;
  toSymbol: SwapSymbol;
  addresses: { BTC: string | null; ETH: string | null; SOL: string | null };
  amount: BigNumber;
  fromBalance: BigNumber;
  fromPrice: BigNumber;
  enabled: boolean;
  resetInput: () => void;
  /** Refresh a target chain's balance right after delivery (outbound). */
  refetchChain?: (chain: 'bitcoin' | 'ethereum' | 'solana') => Promise<void>;
  /** Awaitable, cache-bypassing refresh of the portfolio aggregate — the
   *  source every display reads (#75). 'Done' waits on it. */
  refreshAggregate?: () => Promise<unknown>;
  /**
   * #32 chunk 4a: the Stellar address this swap burns from / delivers to —
   * threaded EXPLICITLY (doc 72 §4h). For an external-wallet user this is
   * the companion Normal wallet, never `wallet.address`; the engine must not
   * silently fall back across wallets. Omitted (single-wallet users) →
   * the connected wallet, exactly as before.
   */
  stellarAddressOverride?: string | null;
  /** Opens the guided Normal-wallet setup (create/activate/trustline/fund)
   *  when a preflight fails for an external-wallet user. */
  onNeedsSetup?: () => void;
  /**
   * #32 chunk 4b: the user picked their EXTERNAL wallet as the swap source
   * (doc 72 §4h S2). `execute` moves the typed USDC to the companion Normal
   * wallet (kit-signed, and resolves only once the funds are VISIBLE there),
   * after which the swap continues passkey-only. The CTA and the progress
   * modal both announce the move — never a silent transfer.
   */
  fundFromExternal?: { label: string; execute: (amountUsdc: string) => Promise<boolean> };
  /** Dynamic gas (2026-08-21): writes the affordable amount back into the
   *  card when a gas spike beats the reserve on the ETH source leg. */
  onAmountAdjusted?: (amountEth: string) => void;
}

const NATIVE_DECIMALS: Record<CrosschainSymbol, number> = { BTC: 8, ETH: 18, SOL: 9 };

// Safety valve for the pre-'done' balance refetch (#66, same constant as the
// LI.FI tracker's arrival gate #62): once delivery is chain-confirmed the
// funds ARE there — a hiccuping refetch must not make a successful swap look
// stuck. Sized for swap-card's verify-and-retry (refresh + 5.6s floor wait +
// second refresh) with margin.
const ARRIVAL_CAP_MS = 15_000;

// Follow the outbound pivot's Base→destination bridge to delivery — the
// mirror of lifi-tracker's pollBridge. Fresh auth headers per poll (#64).
// Returns null on timeout (~10 min): the bridge is merely slow, not failed.
async function pollPivotDelivery(
  txHash: string,
  fromChainId: number,
  toChainId: number,
  cancelledRef: React.MutableRefObject<boolean>,
  // BTC payouts are mined Bitcoin txs — allow up to ~60 min (Niko 2026-08-19:
  // the modal now tracks BTC to true delivery like SOL/ETH).
  maxPolls = 60,
  /** Every reading, for the review page: where the exchange has the money. */
  onProgress?: (progress: BridgeProgress) => void
): Promise<{ verdict: 'DONE' | 'REFUNDED' | 'FAILED' | null; deliveredAmount: string | null }> {
  for (let i = 0; i < maxPolls; i++) {
    if (cancelledRef.current) throw new Error('cancelled');
    try {
      const res = await fetch(
        `/api/lifi/status?txHash=${txHash}&fromChain=${fromChainId}&toChain=${toChainId}`,
        { headers: await buildAuthHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        onProgress?.(readBridgeStatus(data?.status));
        const s = data?.status?.status as string | undefined;
        const sub = String(data?.status?.substatus ?? '').toUpperCase();
        // Doc 95 Wave 5: LI.FI reports what the destination ACTUALLY received.
        // We used to record the quoted MINIMUM and guard it against being
        // replaced, so every swap under-reported delivery by its slippage in
        // Activity and in the Dune dashboard.
        // Pure + tested (lib/cctp/delivered-amount): returns null rather than
        // a guess, so a bad payload leaves the quoted figure in place instead
        // of writing junk into the activity feed.
        const deliveredAmount = parseDeliveredAmount(data?.status?.receiving);
        // A refund is reported as DONE+REFUNDED (or PARTIAL) — funds returned,
        // destination not delivered.
        if (s === 'DONE') {
          return {
            verdict: sub === 'REFUNDED' || sub === 'PARTIAL' ? 'REFUNDED' : 'DONE',
            deliveredAmount,
          };
        }
        if (s === 'FAILED' || s === 'INVALID') return { verdict: 'FAILED', deliveredAmount: null };
      }
    } catch {
      /* transient — retry next interval */
    }
    await new Promise((r) => setTimeout(r, 10_000));
  }
  return { verdict: null, deliveredAmount: null };
}

async function readBaseUsdc(address: string): Promise<bigint> {
  const { erc20Abi, createPublicClient } = await import('viem');
  const { base } = await import('viem/chains');
  const client = createPublicClient({ chain: base, transport: await baseFallbackTransport() });
  return client.readContract({
    address: EVM_USDC.base.mainnet,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });
}

export function useCctpEngine({
  fromSymbol,
  toSymbol,
  addresses,
  amount,
  fromBalance,
  fromPrice,
  enabled,
  resetInput,
  refetchChain,
  refreshAggregate,
  stellarAddressOverride,
  onNeedsSetup,
  fundFromExternal,
  onAmountAdjusted,
}: CctpEngineProps): SwapEngineResult {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { wallet } = usePersistStore();
  const { user } = useSupabaseAuth();
  // Single-wallet users had DEAD buttons on two gates below (no action at
  // all): they can sign their own trustline, and they can receive XLM — both
  // are real, available actions, so offer them instead of a dead end.
  const config = useStellarConfig();
  const { addTrustLine, txBroadcasting: isAddingTrustline } = useTrustLine();
  const { startAction } = useAssetActionsContext();
  const network = useNetworkStore((s) => s.network);
  // Fresh-account path (Niko scenario trace 2026-08-21): after the guided
  // STELLAR setup, the ETH (Base pivot) and BTC/SOL (source/delivery)
  // addresses may still not exist — the gates below used to be DEAD buttons
  // ("Set up SOL wallet first", action: null). Same fix as the lifi engine:
  // one passkey in ChainSetupDialog creates the missing chain account
  // in-place, then the original swap resumes.
  const [setupChain, setSetupChain] = useState<
    'bitcoin' | 'ethereum' | 'solana' | 'stellar' | null
  >(null);

  // 'in': crosschain → stellar; 'out': USDC(stellar) → crosschain.
  const direction: 'in' | 'out' = groupOf(fromSymbol) === 'stellar' ? 'out' : 'in';

  // undefined = no override (single-wallet user → connected wallet);
  // null = external user whose companion doesn't exist yet (gated below).
  const stellarAddress =
    stellarAddressOverride === undefined ? wallet.address : (stellarAddressOverride ?? undefined);
  const {
    isLoading: isCheckingAccount,
    accountExists,
    xlmBalance,
    hasUsdcTrustline,
  } = useAccountStatus(enabled ? stellarAddress : undefined);

  const [quote, setQuote] = useState<any>(null);
  const [feePercent, setFeePercent] = useState(0);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [stage, setStage] = useState<CctpStage | null>(null);
  // The review page and live journey (components/_common/flow): nothing runs
  // until the person confirms there; then every leg reports in.
  const {
    run: flowState,
    plan: frozenPlan,
    begin: beginRun,
    replan,
    start: startStep,
    update: updateStep,
    done: doneStep,
    fail: failRun,
    finish: finishRun,
    stop: stopRun,
    handOff,
    reset: resetRun,
  } = useFlowRun();
  const [frozen, setFrozen] = useState<{ summary: FlowSummary; lede: string; tool: string } | null>(
    null
  );
  const [confirming, setConfirming] = useState(false);
  // Money has left the source (a transaction reached a chain) in this run.
  const movedRef = useRef(false);
  // Which plan the run follows: the swap, or bringing the USDC back.
  const [refundPlanActive, setRefundPlanActive] = useState(false);
  // Read by callbacks created before the review section below.
  const flowStateRef = useRef(flowState);
  flowStateRef.current = flowState;
  const handleConfirmRef = useRef<() => void>(() => {});
  // Niko 2026-08-28: a swap whose SOURCE leg ended without moving anything
  // (on-chain revert / bridge refund) is not an error to act on: the page
  // ends calmly (stopRun), never in red. Bring-back (Niko 2026-08-27) runs
  // on the same page as its own journey (runRefund).
  // Doc 93 0b: WHY a refund started by itself, shown above the steps.
  const [refundNotice, setRefundNotice] = useState<string | null>(null);
  const cancelled = useRef(false);
  // The transfer id of the last FAILED run: the failure popup's buttons need
  // it, but the catch clears the active-transfer marker before they render —
  // reading only getActiveCctpTransfer() there resolved null and left both
  // buttons dead (live 2026-08-26).
  const lastFailedRunIdRef = useRef<string | null>(null);
  // #33 Stage 3: the inline consent moment (D2). Offered once per mount, only
  // when the delegation isn't active and the user hasn't declined before.
  const [consentOpen, setConsentOpen] = useState(false);
  const consentResolver = useRef<(() => void) | null>(null);
  const consentHandled = useRef(false);
  // Gas spike between quote and the ETH source leg → choice dialog, never an
  // error (fires pre-sign; the transfer row closes as failed-before-broadcast).
  const [shortfall, setShortfall] = useState<{ tried: string; affordable: string } | null>(null);
  // Live autopilot state for the progress modal's copy + in-wait Enable
  // offer. null = not checked yet; refreshed when a run starts and flipped
  // by a successful grant. The RUN itself re-checks live at the branch —
  // this state is display truth, not signing truth.
  const [autopilotOn, setAutopilotOn] = useState<boolean | null>(null);

  const evmAddress = addresses.ETH; // the Base pivot is always the user's own EVM address
  const nativeAddress =
    direction === 'in'
      ? addresses[fromSymbol as CrosschainSymbol]
      : addresses[toSymbol as CrosschainSymbol];

  // ---- quote ------------------------------------------------------------------
  // in : LI.FI native → USDC_BASE (leg 1); CCTP + optional XLM leg estimated.
  // out: LI.FI USDC_BASE → target (leg 3) quoted directly — CCTP is 1:1/$0, so
  //      the pivot quote IS the swap quote.
  const debouncedAmount = useDebounce(enabled ? amount.toFixed() : '', 600);

  useEffect(() => () => setActiveCctpTransfer(null), []); // tab/modal gone → banner owns recovery
  useEffect(
    () => () => {
      cancelled.current = true;
    },
    []
  );

  useEffect(() => {
    const value = BigNumber(debouncedAmount || 0);
    const ready =
      enabled &&
      evmAddress &&
      value.gt(0) &&
      (direction === 'in' ? !!nativeAddress : !!nativeAddress);
    if (!ready) {
      setQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return undefined;
    }
    let stale = false;
    const controller = new AbortController();
    setQuote(null);
    setQuoteError(null);
    setQuoteLoading(true);
    (async () => {
      try {
        const body =
          direction === 'in'
            ? {
                fromSymbol,
                toSymbol: 'USDC_BASE',
                fromAmount: value
                  .multipliedBy(BigNumber(10).pow(NATIVE_DECIMALS[fromSymbol as CrosschainSymbol]))
                  .toFixed(0),
                fromAddress: nativeAddress,
                toAddress: evmAddress,
              }
            : {
                fromSymbol: 'USDC_BASE',
                toSymbol,
                fromAmount: usdcToWire(value.toFixed(6, BigNumber.ROUND_DOWN)).toString(),
                fromAddress: evmAddress,
                toAddress: nativeAddress,
              };
        // Doc 90 W4: 429/5xx quote failures are transient — one quiet retry
        // before parking an error in the card.
        let res: Response | null = null;
        let data: any = null;
        for (let qAttempt = 0; qAttempt < 2; qAttempt++) {
          res = await fetch('/api/lifi/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify(body),
          }).catch(() => null);
          data = res ? await res.json().catch(() => null) : null;
          if (stale) return;
          if (res && res.ok && data?.success) break;
          const transient = !res || res.status === 429 || res.status >= 500;
          if (!transient || qAttempt === 1) break;
          await new Promise((r) => setTimeout(r, 6_000));
          if (stale) return;
        }
        if (!res || !res.ok || !data?.success)
          setQuoteError(friendlyAppError(data?.error ?? t('Failed to fetch quote')));
        else {
          setQuote(data.quote);
          setFeePercent(typeof data.feePercent === 'number' ? data.feePercent : 0);
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
  }, [enabled, debouncedAmount, direction, fromSymbol, toSymbol, nativeAddress, evmAddress]);

  const usdcOutMin =
    quote && direction === 'in' ? BigNumber(quote.estimate.toAmountMin).dividedBy(1e6) : null;
  const toAmount =
    direction === 'in'
      ? usdcOutMin // inbound always delivers USDC on Stellar
      : quote
        ? BigNumber(quote.estimate.toAmountMin).dividedBy(
            BigNumber(10).pow(NATIVE_DECIMALS[toSymbol as CrosschainSymbol])
          )
        : null;

  const insufficient = amount.gt(0) && amount.gt(fromBalance);
  // Inbound delivery AND the 4b funding move both land USDC on the Stellar
  // side — either way the account needs the trustline first.
  const needsTrustline =
    (direction === 'in' || !!fundFromExternal) &&
    !isCheckingAccount &&
    accountExists &&
    !hasUsdcTrustline;
  const missingStellar = !stellarAddress || (!isCheckingAccount && !accountExists);
  // #32 chunk 4a: the outbound burn's Soroban fees are paid in XLM from the
  // BURN SOURCE — for hybrid users that's the companion Normal wallet, whose
  // XLM the user may never have topped up. Same threshold as the savings
  // action-block (#67), so the light and the gate can't disagree.
  const lowFeeXlm =
    direction === 'out' &&
    !isCheckingAccount &&
    accountExists &&
    xlmAvailableForFees(xlmBalance).lt(MIN_XLM_FOR_SAVINGS_TX);

  // MAX leaves the source chain's network fee behind. Outbound USDC needs no
  // reserve (Soroban fees are paid in XLM); inbound mirrors the LI.FI engine,
  // with BTC resolved live from the mempool rate.
  const getMaxToken = async (): Promise<BigNumber> => {
    if (direction === 'out') return fromBalance;
    // Leave the source-chain swap's gas behind. ETH: sized to live gas via the
    // shared helper, with a generous 400k bridge gas limit — the CCTP ETH leg is
    // a bridge, and under-reserving would fail the swap for gas. BTC: live from
    // mempool. SOL: a small static reserve (Solana fees + ATA rent).
    let reserve = 0.01; // SOL
    if (fromSymbol === 'ETH') {
      // Reserve already inside fromBalance (card holds it back for typed
      // amounts too) — don't double-subtract.
      return fromBalance;
    } else if (fromSymbol === 'BTC') {
      try {
        const r = await fetch('https://mempool.space/api/v1/fees/recommended', {
          signal: abortTimeout(6000),
        });
        const f = await r.json();
        const feeSat = (f.halfHourFee || 15) * 210 * 1.4;
        reserve = Math.min(Math.max(feeSat / 1e8, 0.00003), 0.0005);
      } catch {
        reserve = 0.0001;
      }
    }
    return BigNumber.max(fromBalance.minus(reserve), 0);
  };

  // ---- shared helpers -----------------------------------------------------------
  const makePatcher = useCallback(
    // Auth headers are rebuilt PER REQUEST, never captured: a CCTP bridge
    // runs 20-30+ minutes, longer than an access token's remaining life.
    // Headers frozen at swap start went 401 mid-bridge, and the old poll
    // loop swallowed that as "not finished yet" — the modal spun forever
    // at "Bridging to Stellar" while the banner (fresh headers each poll)
    // already knew the swap was COMPLETED (finding #64).
    async (transferId: string) => ({
      patch: async (body: Record<string, string | boolean>) => {
        // Money-state writes never swallow (doc 90 W2): a lost burn hash
        // strands funds invisibly — the cron can't advance the row and the
        // recovery banner can't see it. Three attempts with backoff; the
        // permanent-failure case returns undefined so critical call sites
        // can SAY it instead of hiding it.
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await fetch(`/api/cctp/transfers/${transferId}`, {
              method: 'PATCH',
              headers: await buildAuthHeaders(),
              credentials: 'include',
              body: JSON.stringify(body),
            });
            if (res.ok) return res;
          } catch {
            /* retry below */
          }
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        }
        logger.error('[cctp] PATCH permanently failed:', Object.keys(body).join(','));
        return undefined;
      },
      pollStatus: async (
        target: string,
        intervalMs: number,
        onRead?: (transfer: { status?: string; mintTxHash?: string | null }) => void
      ) => {
        let misses = 0;
        for (;;) {
          if (cancelled.current) throw new Error('cancelled');
          let sawTransfer = false;
          let status: string | undefined;
          let detail: string | undefined;
          try {
            const res = await fetch(`/api/cctp/transfers/${transferId}`, {
              headers: await buildAuthHeaders(),
              credentials: 'include',
              signal: abortTimeout(20_000),
            });
            if (res.ok) {
              const data = await res.json();
              status = data?.transfer?.status;
              detail = data?.transfer?.errorDetail;
              sawTransfer = typeof status === 'string';
              if (sawTransfer) onRead?.(data.transfer);
            }
          } catch {
            /* transient (timeout / hung server) — the cron keeps advancing it; just retry */
          }
          if (status === target) return;
          if (status === 'FAILED') throw new Error(detail ?? 'transfer failed');
          // A read that came back without a transfer (401/404/parse) is NOT
          // "still bridging". Tolerate a transient run of them, then say the
          // truth instead of spinning forever — the bridge itself continues
          // server-side either way.
          misses = sawTransfer ? 0 : misses + 1;
          if (misses >= 10)
            throw new Error(
              t(
                'Lost connection while following this swap. It carries on on our servers: check Activity in a few minutes.'
              )
            );
          await new Promise((r) => setTimeout(r, intervalMs));
        }
      },
      topUp: async () => {
        // Doc 90 W4: the relayer call is idempotent by design (409 = already
        // running) — retry transients instead of failing a swap whose money
        // is already mid-route, and verify by BALANCE instead of the blind
        // 8-second guess.
        let ok = false;
        for (let attempt = 0; attempt < 3 && !ok; attempt++) {
          try {
            const res = await fetch('/api/cctp/gas-topup', {
              method: 'POST',
              headers: await buildAuthHeaders(),
              credentials: 'include',
              body: JSON.stringify({ transferId }),
              signal: abortTimeout(30_000),
            });
            ok = res.ok || res.status === 409;
          } catch {
            /* transient — retry below */
          }
          if (!ok) await new Promise((r) => setTimeout(r, 2_000 * (attempt + 1)));
        }
        if (!ok)
          throw new Error(t('The network fee top-up did not go through. Try again in a moment.'));
        try {
          const { createPublicClient } = await import('viem');
          const { base } = await import('viem/chains');
          const client = createPublicClient({
            chain: base,
            transport: await baseFallbackTransport(),
          });
          for (let i = 0; i < 10; i++) {
            const bal = await client.getBalance({ address: evmAddress as `0x${string}` });
            if (bal > 0n) return;
            await new Promise((r) => setTimeout(r, 2_000));
          }
        } catch {
          /* balance probe unavailable — proceed; the tx itself will tell */
        }
      },
    }),

    [t, evmAddress]
  );

  // #33 Stage 3: is the server-side signing delegation live for this user?
  // A failed check means "no autopilot for this run" (interactive prompts),
  // NEVER a revocation — the status route 502s on Turnkey trouble by design.
  const autopilotActive = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/autopilot/status', {
        headers: await buildAuthHeaders(),
        credentials: 'include',
        signal: abortTimeout(10_000),
      });
      if (!res.ok) return false;
      return (await res.json())?.active === true;
    } catch {
      return false;
    }
  }, []);

  // Sticky for the run: a grant made mid-swap (start dialog OR the in-modal
  // "this swap finishes by itself" box) must count for THIS swap, not just
  // the next one. See autopilot-gate.ts.
  const autopilotGate = useRef(createAutopilotGate(() => autopilotActive()));

  // Stages at which the outbound USDC has actually reached the Base address,
  // i.e. the only ones where bringing it back is a thing that can happen.
  // Before 'topup' the money is still in Stellar or mid-bridge; a failure
  // there is recovered by Try again / the banner, not by a refund.
  const BRING_BACK_STAGES: CctpStage[] = ['topup', 'pivot-swap', 'delivering'];

  const runRefund = useCallback(
    async (transferId: string) => {
      setRefundPlanActive(true);
      beginRun(
        cctpRefundPlan({
          t,
          baseWallet: { address: evmAddress, href: baseAddressHref(evmAddress) },
          stellarWallet: { address: stellarAddress, href: stellarAccountHref(stellarAddress) },
        })
      );
      try {
        const { burnTxHash } = await runCctpRefund({
          transferId,
          network,
          baseAddress: evmAddress!,
          stellarAddress: stellarAddress!,
          tryAutopilotFirst: true,
          onStage: (s) => {
            if (s === 'topup') startStep('refund-gas');
            else startStep('refund-sign', { waiting: true });
          },
        });
        doneStep('refund-burn', { links: [baseTxLink(t, burnTxHash)] });
        startStep('refund-attest');
        // Circle's wait on Base finality and the mint run on our servers.
        handOff(
          t(
            'Your USDC is on its way back to your Stellar wallet. It arrives in about 20 minutes, and Normal finishes it on its own.'
          )
        );
        window.dispatchEvent(new Event('nf:activity-updated'));
      } catch (e: any) {
        logger.error('[cctp refund] failed:', e);
        const message = friendlyAppError(e);
        failRun(message);
      }
    },
    [network, evmAddress, stellarAddress, beginRun, startStep, doneStep, handOff, failRun, t]
  );

  // The consent offer itself — at swap start (Niko's final call 2026-08-21;
  // the earlier post-swap move was reacting to the ceremony BREAKING, not
  // the placement). Also fired as a no-op backstop after Done. Resolves when
  // the user chooses either way; "Not now" is remembered so the dialog never
  // nags — Settings and the in-wait modal box keep the enable doors.
  const maybeOfferConsent = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AUTOPILOT_PUBLIC_KEY) return; // feature dark
    if (consentHandled.current) return; // one offer per mount
    consentHandled.current = true;
    try {
      if (localStorage.getItem('nf:autopilot-declined:v1')) return;
    } catch {
      /* storage unavailable → just offer */
    }
    if (await autopilotActive()) return; // already granted
    await new Promise<void>((resolve) => {
      consentResolver.current = resolve;
      setConsentOpen(true);
    });
  }, [autopilotActive]);

  const handleConsentChoice = useCallback((granted: boolean) => {
    setConsentOpen(false);
    if (granted) {
      setAutopilotOn(true);
      // The ceremony verified the Turnkey policy before resolving, so this is
      // fact, not optimism — and it must outrank any later status snapshot.
      autopilotGate.current.markGranted();
    }
    if (!granted) {
      try {
        localStorage.setItem('nf:autopilot-declined:v1', String(Date.now()));
      } catch {
        /* fine — they'll simply be asked again next session */
      }
    }
    consentResolver.current?.();
    consentResolver.current = null;
  }, []);

  // Hand a mid-flow EVM leg to the server-side autopilot (gas top-up + sign +
  // broadcast + row patch all happen there). null = failed / rejected / timed
  // out → the caller runs the interactive path instead. The server re-checks
  // everything (ownership, transfer state, addresses, the Turnkey policy) —
  // this call is a convenience, not a trust boundary.
  const tryAutopilot = useCallback(
    async (
      leg: 'burn' | 'pivot',
      transferId: string,
      extra?: Record<string, unknown>
    ): Promise<any | null> => {
      try {
        const res = await fetch(`/api/cctp/autopilot/${leg}`, {
          method: 'POST',
          headers: await buildAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({ transferId, ...extra }),
          signal: abortTimeout(300_000),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) return data;
        // Failure CLASS (Niko 2026-08-26 GO): 'reverted' means the autopilot
        // DID sign and broadcast, and the chain rejected the route — not a
        // signing problem, so the caller must NOT fall back to an interactive
        // prompt (the live incident's "biometrics then failure" loop). The
        // failed bridge rides along for the failover retry.
        if (data?.failureClass === 'reverted') {
          return {
            __reverted: true,
            tool: data.tool ?? null,
            txHash: data.txHash ?? null,
            exchanges: Array.isArray(data.exchanges) ? data.exchanges : [],
          };
        }
        return null;
      } catch {
        return null;
      }
    },
    []
  );

  // #66: 'Done' must mean the wallet ALREADY shows the result — the LI.FI
  // engine's arrival rule (#62) applied here. The delivered side's balance
  // refetch is AWAITED (capped) before the stage flips; fire-and-forget
  // refreshes raced the modal and lost, so "Done" showed against a stale
  // balance that looked like missing funds.
  //   out: delivery is chain-confirmed before this runs (BTC included since
  //     2026-08-19 — it tracks to true delivery, so its refetch is AWAITED
  //     like every other chain; the old fire-and-forget exemption is gone).
  //   in: USDC lands on Stellar, mint already chain-confirmed.
  //   BOTH: the portfolio AGGREGATE refresh is awaited too — since #75 the
  //     drawer/swap displays read the aggregate, so gating only the legacy
  //     store let "Done" show against stale visible numbers.
  const finish = useCallback(async () => {
    startStep('balance');
    const cap = new Promise<void>((resolve) => {
      setTimeout(resolve, ARRIVAL_CAP_MS);
    });
    const waits: Promise<unknown>[] = [];
    if (direction === 'out') {
      const chain = ({ BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana' } as const)[
        toSymbol as CrosschainSymbol
      ];
      if (chain && refetchChain) waits.push(refetchChain(chain).catch(() => {}));
    } else {
      // Stellar-side freshness rides refreshAggregate below (one source);
      // the SOURCE chain (BTC/ETH/SOL just spent) refreshes too so its
      // balance isn't stale at Done (sweep 2026-08-21).
      const chain = ({ BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana' } as const)[
        fromSymbol as CrosschainSymbol
      ];
      if (chain && refetchChain) waits.push(refetchChain(chain).catch(() => {}));
    }
    if (refreshAggregate) waits.push(refreshAggregate().catch(() => {}));
    await Promise.race([Promise.all(waits), cap]);
    setStage('done');
    finishRun();
    setActiveCctpTransfer(null); // settled — nothing left to recover
    resetInput();
    window.dispatchEvent(new Event('nf:activity-updated'));
    // #33 consent moment, AFTER the swap (Niko 2026-08-21: the pre-swap
    // dialog interrupted a Lobstr-funded swap — the swap must just run).
    // The user has just lived the multi-signature flow; the offer is for
    // NEXT time, blocks nothing, and is skipped forever on "Not now".
    void maybeOfferConsent();
  }, [
    direction,
    toSymbol,
    fromSymbol,
    resetInput,
    refetchChain,
    refreshAggregate,
    maybeOfferConsent,
    startStep,
    finishRun,
  ]);

  // ---- INBOUND orchestration -----------------------------------------------------
  const runInbound = useCallback(
    async (transferId: string, lifiQuote: any) => {
      cancelled.current = false;
      const { patch, pollStatus, topUp } = await makePatcher(transferId);
      const baseline = await readBaseUsdc(evmAddress!);
      let arrivedWire = 0n;
      // Flips the moment the first transaction reaches a chain. While false, a
      // failure (declined passkey, build error) means no money moved — the
      // CREATED row would otherwise render as eternally "pending" in the
      // activity feed, so we mark it FAILED instead.
      let broadcastStarted = false;

      const srcChain = ({ BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana' } as const)[
        fromSymbol as CrosschainSymbol
      ];
      try {
        setStage('lifi');
        const srcTx = await executeLifiSwap(
          lifiQuote,
          {
            bitcoinAddress: addresses.BTC,
            ethereumAddress: addresses.ETH,
            solanaAddress: addresses.SOL,
          },
          {
            onStage: (st) =>
              st === 'sign' ? startStep('sign', { waiting: true }) : startStep('send'),
          }
        );
        broadcastStarted = true;
        movedRef.current = true;
        updateStep('send', {
          links: [chainTxLink(t, srcChain, srcTx), lifiTrackLink(t, srcTx)],
        });
        if (!(await patch({ srcSwapTxHash: srcTx }))) {
          enqueueSnackbar(
            t(
              'We could not record this step. Your money is safe: keep this page open until the swap completes.'
            ),
            { variant: 'warning' }
          );
        }

        setStage('arriving');
        const target = BigInt(lifiQuote.estimate.toAmountMin);
        const started = Date.now();
        let arrivalPoll = 0;
        for (;;) {
          if (cancelled.current) return;
          let bal = baseline;
          try {
            bal = await readBaseUsdc(evmAddress!);
          } catch {
            /* transient RPC hiccup — retry next interval */
          }
          if (bal >= baseline + (target * 95n) / 100n) {
            // Doc 95 Wave 3: one shared rule. The old clamp to `target`
            // stranded positive slippage on Base forever; the server's
            // whole-balance read swept siblings. scopedAmountWire does both
            // correctly: own share + slippage headroom, never more.
            arrivedWire = scopedAmountWire(bal - baseline, target);
            doneStep('bridge-send');
            doneStep('arrived-base', {
              note: t('{{amount}} at your Base address.', {
                amount: formatCoin(Number(wireToUsdc(arrivedWire)), 'USDC'),
              }),
            });
            break;
          }
          // Refund honesty (live 2026-08-20: a refunded bridge leg polled a
          // Base balance that would never arrive, then reported a TIMEOUT —
          // the user pieced the refund together from three explorers). Ask
          // LI.FI for the leg's VERDICT alongside the balance: a refund is
          // its own calm ending, marked on the row, with the returned funds
          // refetched before we say a word.
          arrivalPoll += 1;
          // The first reading comes early, so the steps move as soon as the
          // exchange picks the payment up; then every third poll (~30s).
          if (arrivalPoll === 1 || arrivalPoll % 3 === 0) {
            let verdict: 'REFUNDED' | 'FAILED' | null = null;
            try {
              const r = await fetch(
                `/api/lifi/status?txHash=${srcTx}&fromChain=${lifiQuote.action.fromChainId}&toChain=${lifiQuote.action.toChainId}`,
                { headers: await buildAuthHeaders() }
              );
              if (r.ok) {
                const d = await r.json();
                const st = d?.status?.status as string | undefined;
                const sub = String(d?.status?.substatus ?? '').toUpperCase();
                if (st === 'DONE' && (sub === 'REFUNDED' || sub === 'PARTIAL'))
                  verdict = 'REFUNDED';
                else if (st === 'FAILED' || st === 'INVALID') verdict = 'FAILED';
                // Where the exchange has the money now, for the steps.
                const progress = readBridgeStatus(d?.status);
                if (progress.phase === 'source') startStep('source-confirm');
                else if (progress.phase === 'sending' || progress.phase === 'delivered')
                  startStep('bridge-send');
              }
            } catch {
              /* transient — next interval */
            }
            if (verdict) {
              // srcSwapTxHash is already on the row, so plain markFailed is
              // (rightly) refused — this op has the SERVER re-verify the
              // refund against LI.FI before retiring the row (sweep 2026-08-21:
              // without it the row sat "pending" forever).
              await patch({ markSourceRefunded: true }).catch(() => {});
              const chain = ({ BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana' } as const)[
                fromSymbol as CrosschainSymbol
              ];
              if (chain && refetchChain)
                await Promise.race([
                  refetchChain(chain).catch(() => {}),
                  new Promise((r2) => {
                    setTimeout(r2, ARRIVAL_CAP_MS);
                  }),
                ]);
              // Niko 2026-08-28: this is a CALM ending, not an alarm. The
              // funds never moved (FAILED = the source tx reverted on-chain,
              // REFUNDED = the bridge returned them), so the modal states the
              // truth quietly — no red box, no Try again — and the retirement
              // above makes the banner drop the row.
              const calm: Error & { __calmEnd?: boolean } = new Error(
                verdict === 'REFUNDED'
                  ? t(
                      'The exchange could not complete and returned your {{sym}}: it is back in your wallet. Nothing was lost, and you can simply start a new swap.',
                      { sym: fromSymbol }
                    )
                  : t(
                      'The exchange turned this swap down on-chain. That usually means the price moved past its protection while it was being processed. Your {{sym}} never left your wallet; only the small network fee was spent. Get a fresh quote and swap again whenever you like.',
                      { sym: fromSymbol }
                    )
              );
              calm.__calmEnd = true;
              throw calm;
            }
          }
          if (Date.now() - started > 45 * 60_000)
            throw new Error(
              t(
                'This is taking unusually long. Your money is safe at your own addresses: finish or follow it from the bar above the swap card.'
              )
            );
          await new Promise((res) => setTimeout(res, 10_000));
        }

        // #33 Stage 3: with the delegation active, gas top-up + approve + burn
        // run SERVER-side — no mid-flow passkey ~20 min after the user clicked
        // Swap. ANY autopilot failure (no consent, revoked, kill-switch, policy
        // rejection, timeout) falls through to the interactive path below;
        // autopilot never blocks a swap, it only removes prompts.
        setStage('topup');
        startStep('gas');
        const burnGateOn = await autopilotGate.current.isActive();
        const autoBurn = burnGateOn ? await tryAutopilot('burn', transferId) : null;
        if (autoBurn) {
          setStage('burn'); // server patched burnTxHash + BURN_SUBMITTED already
          // Auto-finish covered the fee, the permission and the signature.
          doneStep('burn-approve', { note: t('Handled by auto-finish.') });
          doneStep('burn-sign', { note: t('Done by auto-finish.') });
          doneStep('burn', {
            links: autoBurn.burnTxHash ? [baseTxLink(t, autoBurn.burnTxHash)] : undefined,
          });
        } else {
          if (burnGateOn) {
            // Doc 90 W4: the silent downgrade broke the "no signature needed"
            // promise without a word — say it before the passkey appears.
            enqueueSnackbar(
              t('Auto-finish could not do this step, so your passkey confirms it instead.'),
              { variant: 'info' }
            );
          }
          await topUp();
          doneStep('gas');

          setStage('burn');
          const { burnTxHash } = await burnUsdcOnEvm({
            network,
            chain: 'base',
            evmAddress: evmAddress!,
            amountWire: arrivedWire,
            stellarRecipient: stellarAddress!,
            onStep: (st) =>
              st === 'approve'
                ? startStep('burn-approve', { waiting: true })
                : startStep('burn-sign', { waiting: true }),
            onSent: (st, hash) => {
              if (st === 'approve')
                updateStep('burn-approve', {
                  waiting: false,
                  links: [baseTxLink(t, hash)],
                  note: t('Sent. Waiting for Base to confirm it.'),
                });
              else startStep('burn', { links: [baseTxLink(t, hash)] });
            },
          });
          doneStep('burn', { links: [baseTxLink(t, burnTxHash)] });
          if (!(await patch({ burnTxHash }))) {
            enqueueSnackbar(
              t(
                'We could not record this step. Your money is safe: keep this page open until the swap completes.'
              ),
              { variant: 'warning' }
            );
          }
        }

        setStage('bridging');
        startStep('attest');
        await pollStatus('COMPLETED', 15_000, (tr) => {
          if (tr.status === 'ATTESTED') {
            doneStep('attest');
            startStep('mint');
          } else if (tr.status === 'MINT_SUBMITTED') {
            startStep('mint', tr.mintTxHash ? { links: [stellarTxLink(t, tr.mintTxHash)] } : {});
          } else if (tr.status === 'COMPLETED' && tr.mintTxHash) {
            doneStep('mint', { links: [stellarTxLink(t, tr.mintTxHash)] });
          }
        });
        doneStep('arrived', {
          note: t('{{amount}} arrived.', {
            amount: formatCoin(Number(wireToUsdc(arrivedWire)), 'USDC'),
          }),
        });

        // Delivered amount for the activity feed — the USDC that landed on Stellar.
        const dstAmount = wireToUsdc(arrivedWire);
        await patch({ dstAmount });
        await finish();
      } catch (e: any) {
        const { GasShortfallError, maxAffordableEth } = await import('@/lib/lifi/gas-shortfall');
        if (e instanceof GasShortfallError && !broadcastStarted) {
          // Pre-sign shortfall: back to the review, close the row honestly
          // (nothing moved), and offer the affordable amount.
          resetRun();
          setFrozen(null);
          setStage(null);
          setActiveCctpTransfer(null);
          setShortfall({ tried: amount.toFixed(), affordable: maxAffordableEth(e) });
          await patch({ markFailed: true }).catch(() => {});
          window.dispatchEvent(new Event('nf:activity-updated'));
          return;
        }
        if (e?.__calmEnd) {
          // Quiet truth, not alarm (Niko 2026-08-28): the source leg ended
          // without moving anything onward (refunded or reverted) and the
          // row is retired server-side. This used to fall into the error
          // path below and show in red; the calm ending was unreachable.
          const ending = String(e?.message ?? '');
          stopRun(ending);
          setActiveCctpTransfer(null);
          window.dispatchEvent(new Event('nf:activity-updated'));
          return;
        }
        if (String(e?.message) !== 'cancelled') {
          logger.error('[cctp engine] stage failed:', e); // surface stack
          // Stash the run's transfer id BEFORE the active marker is cleared —
          // the failure popup's buttons resolve their id from this ref (the
          // marker is already null by the time they render; live 2026-08-26).
          lastFailedRunIdRef.current = getActiveCctpTransfer();
          // A timed-out Stellar submit may still land on-chain — keep the
          // hash on the row so the cron/banner can finish it instead of the
          // run stranding an invisible burn (doc 90 W2).
          if (e?.mayStillLand && e?.txHash) {
            await patch({ burnTxHash: String(e.txHash) });
          }
          // A classified revert records WHICH bridge failed on the row, so a
          // later "Try again" (banner recover) excludes that bridge.
          if (e?.__pivotRevert) {
            await patch({
              pivotRevertTool: e.tool ?? '',
              pivotRevertTxHash: e.txHash ?? '',
              pivotRevertExchanges: Array.isArray(e.exchanges) ? e.exchanges.join('+') : '',
            }).catch(() => {});
          }
          const message = isInsufficientGasError(e)
            ? t('Not enough ETH left to pay the network fee. Try a slightly smaller amount.')
            : friendlyAppError(e);
          failRun(message);
          setActiveCctpTransfer(null); // something went wrong → recovery banner returns
          if (e?.__optionsExhausted) {
            // Doc 93 0b: no dead-end errors — options are exhausted, so the
            // refund starts ITSELF and the modal explains why. Autopilot
            // users see zero prompts; others get the one burn confirmation.
            const exhaustedId = lastFailedRunIdRef.current;
            if (exhaustedId) {
              setRefundNotice(
                t(
                  'The exchange kept failing, so your USDC is coming back to your Stellar wallet by itself.'
                )
              );
              void runRefund(exhaustedId);
            }
          }
        }
        if (!broadcastStarted) {
          // Server re-checks the precondition (CREATED + no tx hashes), so a
          // race can only leave the row pending — never bury a real transfer.
          await patch({ markFailed: true }).catch(() => {});
          window.dispatchEvent(new Event('nf:activity-updated'));
        }
      }
    },
    [
      evmAddress,
      enqueueSnackbar,
      stellarAddress,
      network,
      addresses,
      amount,
      makePatcher,
      // Doc 95 Wave 3: runRefund closes over the wallet addresses. Omitting
      // it here let a stale copy be captured, so an auto-refund could target
      // a previous session's addresses — a money path, so it is a real dep.
      runRefund,
      autopilotActive,
      tryAutopilot,
      finish,
      t,
      fromSymbol,
      refetchChain,
      startStep,
      updateStep,
      doneStep,
      failRun,
      stopRun,
      resetRun,
    ]
  );

  // ---- OUTBOUND orchestration -----------------------------------------------------
  const runOutbound = useCallback(
    async (transferId: string, amountWire: bigint) => {
      cancelled.current = false;
      const { patch, pollStatus, topUp } = await makePatcher(transferId);
      // Same contract as runInbound: false ⇒ nothing reached a chain yet.
      let broadcastStarted = false;

      try {
        // Doc 93 0a: 'burn-prepare' covers the silent prepare/simulate window;
        // onSigning flips to 'burn' the moment the prompt actually appears.
        setStage('burn-prepare');
        startStep('prepare');
        const { approveTxHash, burnTxHash } = await burnUsdcOnStellar({
          network,
          stellarAddress: stellarAddress!,
          amountWire,
          destinationDomain: CCTP_DOMAIN.base,
          mintRecipient: evmAddressToBytes(evmAddress!),
          onStep: (st) => startStep(st === 'approve' ? 'approve' : 'burn-sign'),
          onSigning: () => {
            setStage('burn');
            updateStep(flowStateRef.current.activeId ?? 'burn-sign', { waiting: true });
          },
          onSubmitted: (st, hash) => {
            if (st === 'approve')
              updateStep('approve', {
                waiting: false,
                links: [stellarTxLink(t, hash, t('View the permission'))],
                note: t('Sent. Waiting for Stellar to confirm it.'),
              });
            else startStep('burn', { links: [stellarTxLink(t, hash)] });
          },
        });
        broadcastStarted = true;
        movedRef.current = true;
        if (approveTxHash && approveTxHash !== 'skipped')
          doneStep('approve', { note: t('Done. Later swaps skip this.') });
        doneStep('burn', { links: [stellarTxLink(t, burnTxHash)] });
        if (!(await patch({ burnTxHash }))) {
          enqueueSnackbar(
            t(
              'We could not record this step. Your money is safe: keep this page open until the swap completes.'
            ),
            { variant: 'warning' }
          );
        }

        setStage('bridging');
        startStep('attest');
        await pollStatus('COMPLETED', 5_000, (tr) => {
          if (tr.status === 'ATTESTED') {
            doneStep('attest');
            startStep('mint');
          } else if (tr.status === 'MINT_SUBMITTED') {
            startStep('mint', tr.mintTxHash ? { links: [baseTxLink(t, tr.mintTxHash)] } : {});
          } else if (tr.status === 'COMPLETED') {
            doneStep('mint', tr.mintTxHash ? { links: [baseTxLink(t, tr.mintTxHash)] } : {});
          }
        }); // Stellar-source attestation ≈ seconds

        // #33 Stage 3: same server-side hand-off as the inbound burn — the
        // pivot is THE prompt Niko banned ("sign, wait 20–50 min, sign again").
        // The route resolves the delivery address from the user's own wallet
        // row and patches dstSwapTxHash itself; any failure falls back to the
        // interactive top-up + passkey pivot below.
        setStage('topup');
        startStep('gas');
        let result: {
          txHash: `0x${string}`;
          toAmountMin: string;
          fromChainId?: number;
          toChainId?: number;
        };
        const pivotGateOn = await autopilotGate.current.isActive();
        let autoPivot = pivotGateOn ? await tryAutopilot('pivot', transferId) : null;
        if (autoPivot?.__reverted) {
          // AUTOMATIC BRIDGE FAILOVER (Niko 2026-08-26): the tx reverted
          // on-chain INSIDE the quoted bridge — one silent autopilot retry
          // with that bridge excluded from the quote. The bridge itself stays
          // in routing for every other swap; the exclusion lives only inside
          // this retry ("i dont want to remove the bridge" — this is not
          // removal).
          const firstFail = autoPivot;
          autoPivot =
            firstFail.tool || firstFail.exchanges?.length
              ? await tryAutopilot('pivot', transferId, {
                  denyBridges: firstFail.tool ? [firstFail.tool] : undefined,
                  // 2026-08-26 forensic: the poisoned element was a fake token
                  // pool inside the DEX step ("fly"), not the bridge — deny
                  // the swap tools too, or "a different bridge" still gets the
                  // same broken swap path.
                  denyExchanges: firstFail.exchanges?.length ? firstFail.exchanges : undefined,
                })
              : null;
          if (!autoPivot || autoPivot.__reverted) {
            // Two on-chain reverts (or no alternative route): STOP. Falling
            // back to a passkey prompt would sign the same reverting route —
            // that is the live incident's "biometrics then identical failure"
            // loop. Straight to the failure popup instead.
            const last = autoPivot?.__reverted ? autoPivot : firstFail;
            const err: any = new Error(
              `transaction reverted (${last.txHash ?? firstFail.txHash ?? 'no hash'})`
            );
            err.__pivotRevert = true;
            err.tool = last.tool ?? firstFail.tool ?? null;
            err.txHash = last.txHash ?? firstFail.txHash ?? null;
            err.exchanges = [
              ...new Set([...(firstFail.exchanges ?? []), ...(last.exchanges ?? [])]),
            ];
            // Doc 93 0b: both automatic attempts failed — no options left
            // that don't need the user; the catch auto-starts the refund.
            err.__optionsExhausted = true;
            // Paint the failure on the step that actually failed — the swap —
            // not on "Covering network fees" (stage was still 'topup' here;
            // live 2026-08-26 screenshot showed the red icon one step early).
            setStage('pivot-swap');
            throw err;
          }
        }
        if (autoPivot) {
          setStage('pivot-swap');
          result = autoPivot;
          // Auto-finish covered the fee, the permission and the signature,
          // and the exchange transaction is out.
          doneStep('pivot-approve', { note: t('Handled by auto-finish.') });
          doneStep('pivot-sign', { note: t('Done by auto-finish.') });
          doneStep('pivot-send', {
            links: [baseTxLink(t, autoPivot.txHash), lifiTrackLink(t, autoPivot.txHash)],
          });
        } else {
          if (pivotGateOn) {
            enqueueSnackbar(
              t('Auto-finish could not do this step, so your passkey confirms it instead.'),
              { variant: 'info' }
            );
          }
          await topUp();
          doneStep('gas');

          setStage('pivot-swap');
          result = await executePivotSwap({
            evmAddress: evmAddress!,
            toSymbol: toSymbol as CrosschainSymbol,
            toAddress: nativeAddress!,
            amountWire,
            onStep: (st) => {
              if (st === 'approve') startStep('pivot-approve', { waiting: true });
              else if (st === 'swap') startStep('pivot-sign', { waiting: true });
            },
            onSent: (st, hash) => {
              if (st === 'approve')
                updateStep('pivot-approve', {
                  waiting: false,
                  links: [baseTxLink(t, hash)],
                  note: t('Sent. Waiting for Base to confirm it.'),
                });
              else
                startStep('pivot-send', { links: [baseTxLink(t, hash), lifiTrackLink(t, hash)] });
            },
          });
          doneStep('pivot-send');
          await patch({ dstSwapTxHash: result.txHash });
        }
        // human delivered amount for the activity feed
        const dstAmount = BigNumber(result.toAmountMin)
          .dividedBy(BigNumber(10).pow(NATIVE_DECIMALS[toSymbol as CrosschainSymbol]))
          .toFixed();

        // #66: the pivot tx confirming on BASE is not delivery — the bridged
        // asset lands on the TARGET chain later. 'Done' used to show here,
        // before the asset existed anywhere the wallet could see it. BTC now
        // tracks to TRUE delivery like SOL/ETH (Niko 2026-08-19) — just with
        // a ~60 min cap instead of ~10, since its payout is a mined Bitcoin
        // tx. Only a quote with no chain ids skips (can't poll).
        if (!result.fromChainId || !result.toChainId) {
          await patch({ dstAmount });
          await finish();
          return;
        }

        setStage('delivering');
        startStep('bridge-receive');
        const destChain = ({ BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana' } as const)[
          toSymbol as CrosschainSymbol
        ];
        const delivery = await pollPivotDelivery(
          result.txHash,
          result.fromChainId,
          result.toChainId,
          cancelled,
          // Poll budget derives from the destination chain's settlement
          // window (registry) + margin — never a hardcoded per-chain number.
          Math.ceil(
            ((CHAINS[
              ({ BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana' } as const)[
                toSymbol as CrosschainSymbol
              ]
            ]?.settlement.maxMinutes ?? 10) *
              60 *
              1.5) /
              10
          ),
          (progress) => {
            if (progress.phase === 'source') startStep('bridge-receive');
            else if (progress.phase === 'sending') startStep('bridge-send');
            else if (progress.phase === 'refunding')
              updateStep(flowStateRef.current.activeId ?? 'bridge-send', {
                note: t('The exchange is sending it back to your Base address.'),
              });
            else if (progress.phase === 'delivered') {
              doneStep('bridge-send');
              doneStep('arrived', {
                note: progress.deliveredAmount
                  ? t('{{amount}} arrived.', {
                      amount: formatCoin(Number(progress.deliveredAmount), toSymbol),
                    })
                  : undefined,
                links: progress.receivingTxHash
                  ? [chainTxLink(t, destChain, progress.receivingTxHash)]
                  : undefined,
              });
            }
          }
        );
        if (delivery.verdict === 'FAILED' || delivery.verdict === 'REFUNDED') {
          throw new Error(
            t(
              'The last leg did not deliver, so your USDC is back at your own Base address, where nobody else can touch it. Bring it back as USDC, or contact support.'
            )
          );
        }
        // Doc 95 Wave 5: prefer the amount the destination actually received
        // over the quote's guaranteed minimum. `dstAmountFinal` is allowed to
        // OVERWRITE, unlike the set-once `dstAmount`.
        if (delivery.deliveredAmount) {
          await patch({ dstAmountFinal: delivery.deliveredAmount });
        } else {
          await patch({ dstAmount });
        }
        if (delivery.verdict === null) {
          // Timed out (~10 min) still bridging: rare, and the funds are in
          // flight to the user's own address. Documented trade-off (Niko's
          // #62 rule — a successful swap must never look stuck): close out
          // with an honest heads-up instead of an error.
          enqueueSnackbar(
            t('{{sym}} is on its way. Delivery is taking longer than usual.', { sym: toSymbol }),
            { variant: 'info' }
          );
        }
        await finish();
      } catch (e: any) {
        if (e?.__calmEnd) {
          // Quiet truth, not alarm (Niko 2026-08-28): the source leg ended
          // without moving anything onward (refunded or reverted) and the
          // row is retired server-side. This used to fall into the error
          // path below and show in red; the calm ending was unreachable.
          const ending = String(e?.message ?? '');
          stopRun(ending);
          setActiveCctpTransfer(null);
          window.dispatchEvent(new Event('nf:activity-updated'));
          return;
        }
        if (String(e?.message) !== 'cancelled') {
          logger.error('[cctp engine] stage failed:', e); // surface stack
          // Stash the run's transfer id BEFORE the active marker is cleared —
          // the failure popup's buttons resolve their id from this ref (the
          // marker is already null by the time they render; live 2026-08-26).
          lastFailedRunIdRef.current = getActiveCctpTransfer();
          // A timed-out Stellar submit may still land on-chain — keep the
          // hash on the row so the cron/banner can finish it instead of the
          // run stranding an invisible burn (doc 90 W2).
          if (e?.mayStillLand && e?.txHash) {
            await patch({ burnTxHash: String(e.txHash) });
          }
          // A classified revert records WHICH bridge failed on the row, so a
          // later "Try again" (banner recover) excludes that bridge.
          if (e?.__pivotRevert) {
            await patch({
              pivotRevertTool: e.tool ?? '',
              pivotRevertTxHash: e.txHash ?? '',
              pivotRevertExchanges: Array.isArray(e.exchanges) ? e.exchanges.join('+') : '',
            }).catch(() => {});
          }
          const message = isInsufficientGasError(e)
            ? t('Not enough ETH left to pay the network fee. Try a slightly smaller amount.')
            : friendlyAppError(e);
          failRun(message);
          setActiveCctpTransfer(null); // something went wrong → recovery banner returns
          if (e?.__optionsExhausted) {
            // Doc 93 0b: no dead-end errors — options are exhausted, so the
            // refund starts ITSELF and the modal explains why. Autopilot
            // users see zero prompts; others get the one burn confirmation.
            const exhaustedId = lastFailedRunIdRef.current;
            if (exhaustedId) {
              setRefundNotice(
                t(
                  'The exchange kept failing, so your USDC is coming back to your Stellar wallet by itself.'
                )
              );
              void runRefund(exhaustedId);
            }
          }
        }
        if (!broadcastStarted) {
          await patch({ markFailed: true }).catch(() => {});
          window.dispatchEvent(new Event('nf:activity-updated'));
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      evmAddress,
      stellarAddress,
      nativeAddress,
      network,
      toSymbol,
      makePatcher,
      finish,
      t,
      startStep,
      updateStep,
      doneStep,
      failRun,
      stopRun,
    ]
  );

  const handleExecute = useCallback(async () => {
    if (!quote || !evmAddress || !stellarAddress || !nativeAddress) return;
    setRefundNotice(null);
    // Display-truth refresh for the modal (copy + in-wait Enable offer);
    // never blocks the run — the signing branch re-checks live.
    void autopilotActive()
      // A just-granted delegation can lag the status read — never downgrade
      // an optimistic true mid-run (display only; signing re-checks live).
      .then((v) => setAutopilotOn((prev) => (prev === true ? true : v)))
      .catch(() => setAutopilotOn((prev) => (prev === true ? true : false)));
    try {
      // #32 chunk 4b: source = external wallet → move the USDC to the Normal
      // wallet FIRST (kit-signed; execute resolves only once the funds are
      // visible on the companion — the #62 verify-before-act rule, so a burn
      // can never fire against a balance that hasn't arrived). The move runs
      // BEFORE the transfer row is created: it is a plain send, recorded by
      // the send funnel, not a CCTP leg.
      if (direction === 'out' && fundFromExternal) {
        setStage('funding');
        startStep('funding', { waiting: true });
        // Doc 95 Wave 5: move exactly what the burn will spend. The move used
        // to send 7 decimals (Stellar precision) while the burn takes 6 (CCTP
        // wire units), so the 7th decimal was carried to the Normal wallet and
        // then never swapped — a silent dust leak on every MAX-style amount.
        const funded = await fundFromExternal.execute(amount.toFixed(6, BigNumber.ROUND_DOWN));
        if (!funded) {
          throw new Error(
            t('The USDC transfer from {{wallet}} did not complete, so nothing was swapped.', {
              wallet: fundFromExternal.label,
            })
          );
        }
        // Doc 95 Wave 7: the stage used to stay on 'funding' through the row
        // creation below, so ANY later failure (a 403, a dropped request)
        // put the red error marker on the funding step — the one step that
        // had genuinely SUCCEEDED. The user was told the move from their
        // wallet failed while their USDC had, in fact, moved. Advance the
        // moment it is done, so the marker lands where the failure is.
        setStage('burn-prepare');
        doneStep('funding');
      }
      startStep('record');

      const headers = await buildAuthHeaders();
      const amountWire =
        direction === 'in'
          ? BigInt(quote.estimate.toAmountMin) // USDC that will reach Base
          : usdcToWire(amount.toFixed(6, BigNumber.ROUND_DOWN));
      const res = await fetch('/api/cctp/transfers', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          direction: direction === 'in' ? 'crosschain_to_stellar' : 'stellar_to_crosschain',
          sourceDomain: direction === 'in' ? CCTP_DOMAIN.base : CCTP_DOMAIN.stellar,
          destDomain: direction === 'in' ? CCTP_DOMAIN.stellar : CCTP_DOMAIN.base,
          amountWire: amountWire.toString(),
          srcAsset: fromSymbol,
          dstAsset: toSymbol,
          srcAmount: amount.toFixed(), // human input amount for the activity feed
          // The EVM pivot address is what the gas top-up route needs to reach:
          // inbound it's the (EVM) source, outbound the (EVM) destination.
          srcAddress: direction === 'in' ? evmAddress : stellarAddress,
          destAddress: direction === 'in' ? stellarAddress : evmAddress,
          quoteJson: {
            feePercent,
            lifiTool: quote?.tool ?? null,
            // Which wallet actually PAID (live incident 2026-08-22: the
            // activity row said "Lobstr" for a swap funded by the Normal
            // wallet, because rows were tagged by feed, not by source).
            // Inbound always spends the Normal wallet's chain address.
            fundedFrom: direction === 'out' && fundFromExternal ? 'external' : 'normal',
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.id) throw new Error(data.error ?? t('Could not start the swap'));
      doneStep('record');
      // #27's row exists NOW — tell the activity feed so it appears the
      // moment the swap starts, not at Done (Niko live test 2026-08-19).
      window.dispatchEvent(new Event('nf:activity-updated'));
      // This tab now owns the transfer — the recovery banner steps aside
      // until we clear the signal (done / error / unmount).
      setActiveCctpTransfer(data.id);
      if (direction === 'in') await runInbound(data.id, quote);
      else await runOutbound(data.id, amountWire);
    } catch (e: any) {
      logger.error('[cctp engine] execute failed:', e); // surface stack
      if (e?.__calmEnd) {
        // Quiet truth, not alarm: funds are where they were and the row is
        // retired server-side — tell the banner and the feed to re-read so
        // the dead entry disappears without any user action.
        stopRun(String(e?.message ?? ''));
        setActiveCctpTransfer(null);
        window.dispatchEvent(new Event('nf:activity-updated'));
        return;
      }
      const message = isInsufficientGasError(e)
        ? t('Not enough ETH left to pay the network fee. Try a slightly smaller amount.')
        : friendlyAppError(e);
      failRun(message);
      setActiveCctpTransfer(null); // something went wrong → recovery banner returns
    }
  }, [
    quote,
    direction,
    amount,
    evmAddress,
    stellarAddress,
    nativeAddress,
    fromSymbol,
    toSymbol,
    feePercent,
    fundFromExternal,
    autopilotActive,
    runInbound,
    runOutbound,
    startStep,
    doneStep,
    failRun,
    stopRun,
    t,
  ]);

  // ---- UI contract ------------------------------------------------------------------
  const etaMinutes = quote
    ? direction === 'in'
      ? Math.max(1, Math.round(quote.estimate.executionDuration / 60)) + 20 // + Base finality
      : Math.max(2, Math.round(quote.estimate.executionDuration / 60)) + 2 // Stellar attests in seconds
    : null;

  // Gas + minimum honesty (Niko GO 2026-08-20; mirrors the LI.FI engine).
  const gasUsd = (
    (quote as { estimate?: { gasCosts?: { amountUSD?: string }[] } } | null)?.estimate?.gasCosts ??
    []
  ).reduce((acc, g) => acc + Number(g?.amountUSD ?? 0), 0);
  const swapUsdIn = fromPrice.gt(0) ? amount.multipliedBy(fromPrice).toNumber() : 0;
  const gasShare = swapUsdIn > 0 && gasUsd > 0 ? gasUsd / swapUsdIn : 0;
  // Inbound: the wire amount the server checks is the USDC reaching Base.
  const minUsdShort =
    direction === 'in'
      ? !!quote && BigNumber(quote.estimate.toAmountMin).dividedBy(1e6).lt(10)
      : amount.gt(0) && fromPrice.gt(0) && amount.multipliedBy(fromPrice).lt(10);

  const button = useMemo(() => {
    if (!enabled) return { label: t('Enter an amount'), action: null, loading: false };
    if (network !== 'mainnet')
      return {
        label: t('Mainnet only'),
        action: null,
        loading: false,
        helper: (
          <Typography sx={{ fontSize: '12px', color: '#6B6B76', textAlign: 'center' }}>
            {t('Cross-ecosystem swaps route through LI.FI, which has no testnet liquidity.')}
          </Typography>
        ),
      };
    // ORDER MATTERS (Niko staging 2026-08-22: the page banner said "Normal
    // wallet is not active" while this button said "Set up SOL wallet" — two
    // competing instructions, and the swap never reached the Stellar step).
    // Stellar-side setup comes FIRST because it is the slow, money-dependent
    // one: activation needs ~1 XLM to arrive from outside and can take
    // minutes. The chain addresses below are instant one-passkey formalities,
    // so they are asked for last — the user starts the long pole earliest and
    // the CTA always agrees with the banner.
    if (missingStellar) {
      // Hybrid users get the guided dialog, which covers BOTH halves.
      if (onNeedsSetup)
        return { label: t('Set up your Normal wallet'), action: onNeedsSetup, loading: false };
      // Single-wallet users: an address that EXISTS but is unfunded is not a
      // setup problem — Stellar activates on receiving XLM, and no passkey
      // can do it. Sending them to ChainSetupDialog re-derived the address
      // they already had, changed nothing, and re-armed this very gate: a
      // loop with no exit, while the banner above already said "send it at
      // least 1 XLM" (sweep 2026-08-22).
      if (stellarAddress)
        return {
          label: t('Add XLM to activate'),
          action: () => startAction('receive'),
          loading: false,
          helper: (
            <Typography sx={{ fontSize: '12px', color: '#6B6B76', textAlign: 'center' }}>
              {t('Your Stellar account activates once it receives at least 1 XLM.')}
            </Typography>
          ),
        };
      return {
        // Sweep 2026-08-21: a BTC/ETH/SOL-first Turnkey user has NO
        // Stellar slot — this was a dead button. ChainSetupDialog's
        // stellar branch derives the account on the EXISTING wallet and
        // adopts it into the empty slot (guarded by shouldAdoptIntoSlot).
        label: t('Set up Stellar wallet'),
        action: user ? () => setSetupChain('stellar') : null,
        loading: false,
        helper: (
          <Typography sx={{ fontSize: '12px', color: '#6B6B76', textAlign: 'center' }}>
            {t('One passkey adds Stellar to your wallet. The swap continues right after.')}
          </Typography>
        ),
      };
    }
    if (needsTrustline)
      // The companion dialog can only fix the COMPANION — when the probed
      // address is the connected external wallet (deliver-to-external), fall
      // through to the generic copy instead of a dialog that loops (sweep
      // 2026-08-21; the deliver pill itself offers the kit-signed add).
      return onNeedsSetup && stellarAddress !== wallet.address
        ? { label: t('Add USDC to your Normal wallet'), action: onNeedsSetup, loading: false }
        : {
            label: isAddingTrustline ? t('Adding trustline…') : t('Add USDC trustline'),
            action: isAddingTrustline
              ? null
              : async () => {
                  try {
                    await addTrustLine('USDC', config.USDC_ISSUER);
                    enqueueSnackbar(t('USDC trustline added.'), { variant: 'success' });
                  } catch (e: any) {
                    enqueueSnackbar(e?.message ?? t('Could not add the USDC trustline.'), {
                      variant: 'error',
                    });
                  }
                },
            loading: false,
            helper: (
              <Typography sx={{ fontSize: '12px', color: '#6B6B76', textAlign: 'center' }}>
                {t(
                  'Your Stellar account needs a USDC trustline to receive the money. Add it from the swap tab (USDC) or the savings page.'
                )}
              </Typography>
            ),
          };
    if (lowFeeXlm)
      return {
        label: t('Top up XLM to swap'),
        // Hybrid → the guided dialog; single-wallet → the app's own Receive
        // flow (asset picker → address + QR), never a dead button.
        action: onNeedsSetup ?? (() => startAction('receive')),
        loading: false,
        helper: (
          <Typography sx={{ fontSize: '12px', color: '#6B6B76', textAlign: 'center' }}>
            {t(
              'The swap pays its Stellar network fee in XLM from {{which}}, so a little XLM is needed there.',
              { which: onNeedsSetup ? t('your Normal wallet') : t('your wallet') }
            )}
          </Typography>
        ),
      };
    if (!nativeAddress) {
      const sym = (direction === 'in' ? fromSymbol : toSymbol) as CrosschainSymbol;
      const chain = ({ BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana' } as const)[sym];
      return {
        label: t('Set up {{sym}} wallet', { sym }),
        action: user ? () => setSetupChain(chain) : null,
        loading: false,
        helper: (
          <Typography sx={{ fontSize: '12px', color: '#6B6B76', textAlign: 'center' }}>
            {t('One passkey creates your {{sym}} address. The swap continues right after.', {
              sym,
            })}
          </Typography>
        ),
      };
    }
    if (!evmAddress)
      return {
        label: t('Set up Ethereum wallet'),
        action: user ? () => setSetupChain('ethereum') : null,
        loading: false,
        helper: (
          <Typography sx={{ fontSize: '12px', color: '#6B6B76', textAlign: 'center' }}>
            {t(
              'The route travels through your own Base address. One passkey creates it, then the swap continues.'
            )}
          </Typography>
        ),
      };
    // #32 chunk 4a: for external-wallet users every Stellar-side preflight
    // failure routes into the guided setup dialog, which derives the exact
    // step to resume at (create / activate / trustline / top-up).
    if (amount.lte(0)) return { label: t('Enter an amount'), action: null, loading: false };
    if (insufficient) return { label: t('Insufficient balance'), action: null, loading: false };
    if (stage && stage !== 'done')
      return { label: t('Swap in progress…'), action: null, loading: true };
    if (quoteError) return { label: t('Try a different amount'), action: null, loading: false };
    if (quoteLoading || !quote)
      return { label: t('Fetching quote…'), action: null, loading: false };
    // Server enforces the $10 minimum (relayer gas economics) — surface it
    // BEFORE the click, not as a 400 after (Niko, 2026-08-20: a $5.75 swap
    // showed a live Swap button, then bounced).
    if (minUsdShort)
      return {
        label: t('Minimum swap is $10'),
        action: null,
        loading: false,
        helper: (
          <Typography sx={{ fontSize: '12px', color: '#6B6B76', textAlign: 'center' }}>
            {t(
              'Each swap between networks has fixed bridge costs. Under $10 they outweigh the swap.'
            )}
          </Typography>
        ),
      };
    // Gas honesty (same %-rule as the LI.FI engine): the inbound leg's quote
    // carries its own gasCosts — block when gas eats >half the swap.
    if (gasShare > 0.5)
      return {
        label: t('Network fees exceed half this swap: try a larger amount'),
        action: null,
        loading: false,
        helper: (
          <Typography sx={{ fontSize: '12px', color: '#6B6B76', textAlign: 'center' }}>
            {t('This route costs ~${{gas}} in network gas regardless of size.', {
              gas: gasUsd.toFixed(2),
            })}
          </Typography>
        ),
      };
    // #32 chunk 4b: swapping FROM the external wallet — the CTA names the
    // move before any signature, never a silent transfer.
    if (direction === 'out' && fundFromExternal)
      return {
        label: t('Review swap'),
        action: () => handleConfirmRef.current(),
        loading: false,
        review: true,
        helper: (
          <Typography sx={{ fontSize: '12px', color: '#6B6B76', textAlign: 'center' }}>
            {t(
              'Your USDC moves to your Normal wallet first (one approval in {{wallet}}), then the swap runs with your passkey.',
              { wallet: fundFromExternal.label }
            )}
          </Typography>
        ),
      };
    // Opens the review page; only its confirm button runs the swap.
    return {
      label: t('Review swap'),
      action: () => handleConfirmRef.current(),
      loading: false,
      review: true,
    };
  }, [
    gasShare,
    gasUsd,
    minUsdShort,
    stellarAddress,
    wallet.address,
    addTrustLine,
    isAddingTrustline,
    startAction,
    config.USDC_ISSUER,
    enqueueSnackbar,
    enabled,
    network,
    nativeAddress,
    evmAddress,
    missingStellar,
    needsTrustline,
    lowFeeXlm,
    user,
    onNeedsSetup,
    fundFromExternal,
    amount,
    insufficient,
    stage,
    quoteError,
    quoteLoading,
    quote,
    t,
    direction,
    fromSymbol,
    toSymbol,
  ]);

  const routeLabel =
    direction === 'in'
      ? `${fromSymbol} → USDC (Base) → Stellar`
      : `USDC → Base (Circle) → ${toSymbol}`;

  const details = quote ? (
    <Stack spacing={0.75}>
      <Stack direction="row" justifyContent="space-between">
        <Typography sx={{ fontSize: '12px', color: '#6B6B76' }}>{t('Route')}</Typography>
        <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#0A0A0F', ...MONO }}>
          {routeLabel}
        </Typography>
      </Stack>
      <Stack direction="row" justifyContent="space-between">
        <Typography sx={{ fontSize: '12px', color: '#6B6B76' }}>
          {t('Bridge (Circle CCTP)')}
        </Typography>
        <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#0A0A0F', ...MONO }}>
          {t('Free')}
        </Typography>
      </Stack>
      {/* Gas honesty item 1 (Niko): "Free" bridge next to invisible mainnet
          gas misled — the leg's REAL gas from the quote, always visible. */}
      {gasUsd > 0 && (
        <Stack direction="row" justifyContent="space-between">
          <Typography sx={{ fontSize: '12px', color: '#6B6B76' }}>{t('Network gas')}</Typography>
          <Typography
            sx={{
              fontSize: '12px',
              fontWeight: 500,
              color: gasShare > 0.2 ? '#B45309' : '#0A0A0F',
              ...MONO,
            }}
          >
            {`≈ $${gasUsd.toFixed(2)}`}
            {gasShare > 0 ? ` (${Math.round(gasShare * 100)}%)` : ''}
          </Typography>
        </Stack>
      )}
      {gasShare > 0.2 && gasShare <= 0.5 && (
        <Typography sx={{ fontSize: '11px', color: '#B45309', lineHeight: 1.5 }}>
          {t('Network fees take {{pct}}% of this swap. A larger amount gets a better deal.', {
            pct: Math.round(gasShare * 100),
          })}
        </Typography>
      )}
      {feePercent > 0 && amount.gt(0) && (
        <Stack direction="row" justifyContent="space-between">
          <Typography sx={{ fontSize: '12px', color: '#6B6B76' }}>
            {t('Normal fee ({{pct}}%)', { pct: +(feePercent * 100).toFixed(2) })}
          </Typography>
          <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#0A0A0F', ...MONO }}>
            −{amount.multipliedBy(feePercent).toFixed(6)} {fromSymbol}
            {fromPrice.gt(0)
              ? ` (${fCurrency(amount.multipliedBy(feePercent).multipliedBy(fromPrice))})`
              : ''}
          </Typography>
        </Stack>
      )}
      {etaMinutes && (
        <Stack direction="row" justifyContent="space-between">
          <Typography sx={{ fontSize: '12px', color: '#6B6B76' }}>{t('Estimated time')}</Typography>
          <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#0A0A0F', ...MONO }}>
            ~{etaMinutes} {t('min')}
          </Typography>
        </Stack>
      )}
      <Typography sx={{ fontSize: '11px', color: '#9A9AA3', lineHeight: 1.5 }}>
        {t('Funds travel via your own addresses at every step.')}
      </Typography>
    </Stack>
  ) : null;

  // ---- the review page ---------------------------------------------------------
  const toolName = quote ? bridgeName(quote) : 'LI.FI';
  const nativeChain = ({ BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana' } as const)[
    (direction === 'in' ? fromSymbol : toSymbol) as CrosschainSymbol
  ];
  const stellarLabel =
    stellarAddressOverride === undefined
      ? undefined
      : stellarAddress && stellarAddress === wallet.address
        ? t('Your {{wallet}} wallet', { wallet: connectedWalletLabel(wallet.walletType) })
        : t('Your Normal wallet');
  const stellarRef = {
    address: stellarAddress,
    href: stellarAccountHref(stellarAddress),
    label: stellarLabel,
  };
  const baseRef = { address: evmAddress, href: baseAddressHref(evmAddress) };
  const nativeRef = { address: nativeAddress, href: chainAddressHref(nativeChain, nativeAddress) };
  // What the person can expect: the quote's estimate; the minimum is shown
  // as "at least" beside it.
  const outDecimals = direction === 'in' ? 6 : NATIVE_DECIMALS[toSymbol as CrosschainSymbol];
  const expectedOut = quote
    ? BigNumber(quote.estimate.toAmount).dividedBy(BigNumber(10).pow(outDecimals))
    : null;
  const minimumOut = quote
    ? BigNumber(quote.estimate.toAmountMin).dividedBy(BigNumber(10).pow(outDecimals))
    : null;
  const outSymbol = direction === 'in' ? 'USDC' : toSymbol;

  const buildPlan = (autopilot: boolean): FlowPlan | null => {
    if (!quote || !expectedOut) return null;
    return direction === 'out'
      ? cctpOutboundPlan({
          t,
          to: toSymbol as CrosschainSymbol,
          amountUsdc: formatCoin(amount.toNumber(), 'USDC'),
          amountOut: `≈ ${formatCoin(expectedOut.toNumber(), toSymbol)}`,
          tool: toolName,
          stellarWallet: stellarRef,
          baseWallet: baseRef,
          destWallet: nativeRef,
          autopilot,
          funding: fundFromExternal
            ? {
                walletName: fundFromExternal.label,
                wallet: { address: wallet.address, href: stellarAccountHref(wallet.address) },
              }
            : null,
        })
      : cctpInboundPlan({
          t,
          from: fromSymbol as CrosschainSymbol,
          amountIn: formatCoin(amount.toNumber(), fromSymbol),
          usdcOut: `≈ ${formatCoin(expectedOut.toNumber(), 'USDC')}`,
          tool: toolName,
          srcWallet: nativeRef,
          baseWallet: baseRef,
          stellarWallet: stellarRef,
          autopilot,
        });
  };

  // A rate people can read: "1 BTC ≈ 87,100 USDC", never "1 USDC ≈ 0.0000114 BTC".
  const rateRow =
    expectedOut && amount.gt(0)
      ? readableRate(
          direction === 'in' ? fromSymbol : 'USDC',
          outSymbol,
          expectedOut.dividedBy(amount).toNumber()
        )
      : null;

  const buildSummary = (autopilot: boolean): FlowSummary | null => {
    if (!quote || !expectedOut || !minimumOut) return null;
    const payUsd = fromPrice.gt(0)
      ? formatUsd(amount.multipliedBy(fromPrice).toNumber())
      : undefined;
    return {
      rows: [
        {
          key: 'pay',
          label: t('You pay'),
          value: formatCoin(amount.toNumber(), fromSymbol),
          detail: payUsd,
        },
        {
          key: 'get',
          label: t('You receive'),
          value: `≈ ${formatCoin(expectedOut.toNumber(), outSymbol)}`,
          detail: direction === 'in' ? t('In your Stellar wallet') : undefined,
        },
        {
          key: 'min',
          label: t('At least'),
          value: formatCoin(minimumOut.toNumber(), outSymbol),
          detail: t('The exchange’s price protection'),
        },
        ...(rateRow ? [{ key: 'rate', label: t('Rate'), value: rateRow }] : []),
        ...(feePercent > 0 && amount.gt(0)
          ? [
              {
                key: 'fee',
                label: t('Normal fee ({{pct}}%)', { pct: +(feePercent * 100).toFixed(2) }),
                value: formatCoin(amount.multipliedBy(feePercent).toNumber(), fromSymbol),
                detail: fromPrice.gt(0)
                  ? formatUsd(amount.multipliedBy(feePercent).multipliedBy(fromPrice).toNumber())
                  : undefined,
              },
            ]
          : []),
        {
          key: 'bridge',
          label: t('Circle bridge'),
          value: t('Free'),
          detail: t('Normal pays its network fees'),
        },
        ...(gasUsd > 0
          ? [
              {
                key: 'gas',
                label: t('Exchange network fees'),
                value: `≈ ${formatUsd(gasUsd)}`,
                detail: shareOfSwap(t, gasShare),
                caution: gasShare > 0.2,
              },
            ]
          : []),
        { key: 'route', label: t('Exchange'), value: toolName, detail: t('Picked by LI.FI') },
        ...(etaMinutes
          ? [{ key: 'time', label: t('Time'), value: t('About {{n}} min', { n: etaMinutes }) }]
          : []),
        direction === 'out'
          ? {
              key: 'signatures',
              label: t('Signatures'),
              value: autopilot ? t('One, sometimes two') : t('Two, sometimes four'),
              detail: autopilot
                ? t('On Stellar only. Auto-finish signs on Base.')
                : t(
                    'On Stellar now, then on Base after the bridge. A first swap adds a one-time permission on each.'
                  ),
            }
          : {
              key: 'signatures',
              label: t('Signatures'),
              value: autopilot ? t('One') : t('One now, one or two later'),
              detail: autopilot
                ? t('On {{chain}} only. Auto-finish signs on Base.', {
                    chain: CHAINS[nativeChain].name,
                  })
                : t('On {{chain}} now, then on Base when the money gets there.', {
                    chain: CHAINS[nativeChain].name,
                  }),
            },
      ],
      note: t(
        'Your money is only ever at your own addresses, with Circle, or with the exchange while it works. Normal never holds it.'
      ),
    };
  };

  const liveLede =
    quote && expectedOut
      ? direction === 'out'
        ? t('{{pay}} for about {{get}}, over Circle and {{tool}}.', {
            pay: formatCoin(amount.toNumber(), 'USDC'),
            get: formatCoin(expectedOut.toNumber(), toSymbol),
            tool: toolName,
          })
        : t('{{pay}} for about {{get}} in your Stellar wallet, over {{tool}} and Circle.', {
            pay: formatCoin(amount.toNumber(), fromSymbol),
            get: formatCoin(expectedOut.toNumber(), 'USDC'),
            tool: toolName,
          })
      : '';

  const handleConfirm = async () => {
    if (!quote || confirming || (stage && stage !== 'done')) return;
    setConfirming(true);
    let approved = false;
    let auto = false;
    try {
      // #33 consent moment AT SWAP START (Niko 2026-08-21: "it should pop up
      // for user to enable one signature when swapping"). Safe now that the
      // ceremony is idempotent; "Not now" is remembered and never re-asks.
      await maybeOfferConsent();
      approved = await confirmAction();
      // The plan's words follow the delegation this run will really use.
      if (approved) auto = await autopilotGate.current.isActive().catch(() => false);
    } finally {
      setConfirming(false);
    }
    if (!approved) return;
    const plan = buildPlan(auto);
    const summary = buildSummary(auto);
    if (!plan || !summary) return;
    setAutopilotOn((prev) => (prev === true ? true : auto));
    setFrozen({ summary, lede: liveLede, tool: toolName });
    setRefundPlanActive(false);
    movedRef.current = false;
    beginRun(plan);
    await handleExecute();
  };
  handleConfirmRef.current = () => {
    void handleConfirm();
  };

  // Auto-finish switched on mid-run (the offer above the steps): the steps on
  // Base now say they sign themselves. Same ids, new words.
  useEffect(() => {
    if (autopilotOn && flowState.phase === 'running' && !refundPlanActive) {
      const next = buildPlan(true);
      if (next) replan(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autopilotOn]);

  const resetFlow = () => {
    resetRun();
    setFrozen(null);
    setRefundPlanActive(false);
    setStage(null);
    movedRef.current = false;
  };

  // Doc 95 Wave 7: two conditions, both required — the USDC must have reached
  // Base, AND a transfer row must exist for the refund to act on. Without the
  // second, the handler returned early and the button did nothing at all.
  const canBringBack =
    !!stage &&
    BRING_BACK_STAGES.includes(stage) &&
    !!(getActiveCctpTransfer() ?? lastFailedRunIdRef.current);

  const livePlan = buildPlan(autopilotOn === true);
  const liveSummary = buildSummary(autopilotOn === true);
  // While a fresh price loads under an open review (a new amount after a gas
  // spike), the review keeps the last numbers and holds its confirm button.
  const lastLiveRef = useRef<{ plan: FlowPlan; summary: FlowSummary; lede: string } | null>(null);
  if (livePlan && liveSummary)
    lastLiveRef.current = { plan: livePlan, summary: liveSummary, lede: liveLede };
  const reviewPlan = livePlan ?? (quoteLoading ? (lastLiveRef.current?.plan ?? null) : null);
  const reviewSummary =
    liveSummary ?? (quoteLoading ? (lastLiveRef.current?.summary ?? null) : null);
  const shownPlan = flowState.phase === 'review' ? reviewPlan : (frozenPlan ?? reviewPlan);
  const shownSummary =
    flowState.phase === 'review' ? reviewSummary : (frozen?.summary ?? reviewSummary);
  const shownLede =
    flowState.phase === 'review'
      ? livePlan
        ? liveLede
        : (lastLiveRef.current?.lede ?? liveLede)
      : (frozen?.lede ?? liveLede);

  // Can the person leave now? Before anything moved, yes (nothing happens).
  // Once money is on its way to Base and the next leg needs this page (no
  // auto-finish), leaving parks it there until they finish from Swap. Once
  // the last leg is out, the bridge or Normal finishes it.
  const active = flowState.activeId ?? '';
  const legNeedsPage =
    !autopilotOn &&
    (direction === 'out'
      ? ['burn', 'attest', 'mint', 'gas', 'pivot-approve', 'pivot-sign'].includes(active)
      : [
          'send',
          'source-confirm',
          'bridge-send',
          'arrived-base',
          'gas',
          'burn-approve',
          'burn-sign',
        ].includes(active));
  const signingNow = [
    'funding',
    'approve',
    'burn-sign',
    'sign',
    'pivot-approve',
    'pivot-sign',
    'burn-approve',
    'refund-sign',
  ].includes(active);
  const leave = refundPlanActive
    ? signingNow
      ? {
          safe: false,
          message: t('Approve the return first. After that Normal finishes it on its own.'),
        }
      : { safe: true, message: t('Normal finishes the return on its own.') }
    : flowState.phase === 'running' && !movedRef.current
      ? {
          // Work already in flight carries on after the page closes, so a
          // prompt could appear on another page: stay until it is sent.
          safe: false,
          message: t(
            'Your swap is being prepared and signed. Stay until it is sent, so no prompt is left open.'
          ),
        }
      : legNeedsPage
        ? {
            safe: false,
            message:
              direction === 'out'
                ? t(
                    'Your USDC is on its way to your Base address. If you leave now, the swap waits there, and you finish it from the Swap page when you come back.'
                  )
                : t(
                    'Your money is on its way to your Base address. If you leave now, the swap waits there, and you finish it from the Swap page when you come back.'
                  ),
          }
        : {
            safe: true,
            message: movedRef.current
              ? t('This finishes on its own. You can close this page and follow it in Activity.')
              : t('Nothing has moved yet. Leaving now simply cancels it.'),
          };

  const resumeFailed = () => {
    // Hand the transfer to the recovery banner's ONE handler on the Swap
    // page — a bare reset read as "nothing happened" when the failure was
    // mid-flight (funds already on Base, live 2026-08-26).
    const failedId = getActiveCctpTransfer() ?? lastFailedRunIdRef.current;
    resetFlow();
    if (failedId) {
      setActiveCctpTransfer(null);
      window.dispatchEvent(new CustomEvent('nf:cctp-resume', { detail: { id: failedId } }));
    }
  };
  const bringBack = () => {
    // Niko 2026-08-27: the refund runs IN this page, its own steps in place.
    const failedId = getActiveCctpTransfer() ?? lastFailedRunIdRef.current;
    if (!failedId) return;
    setActiveCctpTransfer(null);
    setRefundNotice(null); // chosen by the person: no explanation needed
    void runRefund(failedId);
  };

  const failActions = refundPlanActive
    ? [
        {
          label: t('Try again'),
          primary: true,
          onClick: () => {
            const failedId = lastFailedRunIdRef.current;
            if (failedId) void runRefund(failedId);
          },
        },
      ]
    : !movedRef.current
      ? [{ label: t('Try again'), primary: true, onClick: resetFlow }]
      : [
          { label: t('Finish the swap'), primary: true, onClick: resumeFailed, leave: true },
          ...(direction === 'out' && canBringBack
            ? [{ label: t('Bring back as USDC'), onClick: bringBack }]
            : []),
        ];

  // Above the steps: why a refund started by itself, or the offer to finish
  // without the next signature (shown only while it can still help this run).
  const baseSignStep = direction === 'in' ? 'burn-sign' : 'pivot-sign';
  const beforeBaseSign =
    !!shownPlan &&
    flowState.phase === 'running' &&
    !['done', 'skipped', 'failed', 'active'].includes(flowState.steps[baseSignStep]?.status ?? '');
  const notice = refundNotice ? (
    <FlowNotice>{refundNotice}</FlowNotice>
  ) : !refundPlanActive &&
    autopilotOn === false &&
    beforeBaseSign &&
    !!process.env.NEXT_PUBLIC_AUTOPILOT_PUBLIC_KEY ? (
    <FlowNotice action={{ label: t('Turn on auto-finish'), onClick: () => setConsentOpen(true) }}>
      {t(
        'The next signature comes when the money reaches Base, which can take a while. Turn on auto-finish and this swap completes by itself.'
      )}
    </FlowNotice>
  ) : undefined;

  const flow: SwapFlow | null =
    enabled && shownPlan && shownSummary
      ? {
          plan: shownPlan,
          summary: shownSummary,
          run: flowState,
          lede: shownLede,
          confirm: () => {
            void handleConfirm();
          },
          blocked:
            quoteLoading || !quote ? t('Getting a fresh price…') : quoteError ? quoteError : null,
          busy: confirming,
          leave,
          failActions,
          notice,
          doneNote:
            direction === 'out'
              ? t('Your {{coin}} is in your {{chain}} wallet.', {
                  coin: toSymbol,
                  chain: CHAINS[nativeChain].name,
                })
              : t('Your digital dollars are in your Stellar wallet.'),
          reset: resetFlow,
        }
      : null;

  return {
    flow,
    toAmount,
    quoteLoading: enabled ? quoteLoading : false,
    quoteError: enabled ? quoteError : null,
    details,
    footer: null,
    button,
    modals: (
      <>
        <AutopilotConsentDialog open={consentOpen} onChoose={handleConsentChoice} />
        {user && setupChain && (
          <ChainSetupDialog
            open
            onClose={() => setSetupChain(null)}
            chain={setupChain}
            userId={user.id}
            userEmail={user.email}
            onSuccess={async () => {
              // stellar → the slot adoption updates the persist store and the
              // aggregate carries balances; chain wallets refresh their hook.
              // The close is in `finally`: the account already exists, so a
              // failed refresh must not leave the dialog stuck open over a
              // wallet that was created successfully (live 2026-08-22).
              try {
                if (setupChain === 'stellar') await refreshAggregate?.().catch(() => {});
                else if (refetchChain) await refetchChain(setupChain);
              } catch {
                /* stale read only — the next render re-fetches */
              } finally {
                setSetupChain(null);
              }
            }}
          />
        )}
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
      </>
    ),
    getMaxToken,
  };
}
