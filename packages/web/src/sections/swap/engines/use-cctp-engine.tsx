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

import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { buildAuthHeaders } from '@/utils/http';
import { fCurrency } from '@/utils/format-number';
import { useDebounce } from '@/hooks/use-debounce';
import { burnUsdcOnEvm } from '@/lib/cctp/burn-evm';
import { executeLifiSwap } from '@/lib/lifi/execute';
import { executePivotSwap } from '@/lib/cctp/pivot-swap';
import { evmAddressToBytes } from '@/lib/cctp/addresses';
import { EVM_USDC, CCTP_DOMAIN } from '@/lib/cctp/config';
import { burnUsdcOnStellar } from '@/lib/cctp/burn-stellar';
import { usdcToWire, wireToUsdc } from '@/lib/cctp/decimals';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import { usePersistStore, useNetworkStore } from '@normalfinance/state';
import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { xlmAvailableForFees, MIN_XLM_FOR_SAVINGS_TX } from '@/utils/stellar-reserve';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useSnackbar } from '@/components/template/snackbar';

import { groupOf } from './types';
import { ethGasReserve } from './gas-reserve';
import { type CctpStage, CctpProgressModal } from '../cctp-progress-modal';

import type { SwapSymbol, SwapEngineResult, CrosschainSymbol } from './types';

const MONO = { fontFamily: '"Geist Mono", "Courier New", monospace' } as const;

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
  maxPolls = 60
): Promise<'DONE' | 'REFUNDED' | 'FAILED' | null> {
  for (let i = 0; i < maxPolls; i++) {
    if (cancelledRef.current) throw new Error('cancelled');
    try {
      const res = await fetch(
        `/api/lifi/status?txHash=${txHash}&fromChain=${fromChainId}&toChain=${toChainId}`,
        { headers: await buildAuthHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        const s = data?.status?.status as string | undefined;
        const sub = String(data?.status?.substatus ?? '').toUpperCase();
        // A refund is reported as DONE+REFUNDED (or PARTIAL) — funds returned,
        // destination not delivered.
        if (s === 'DONE') return sub === 'REFUNDED' || sub === 'PARTIAL' ? 'REFUNDED' : 'DONE';
        if (s === 'FAILED' || s === 'INVALID') return 'FAILED';
      }
    } catch {
      /* transient — retry next interval */
    }
    await new Promise((r) => setTimeout(r, 10_000));
  }
  return null;
}

async function readBaseUsdc(address: string): Promise<bigint> {
  const { http, erc20Abi, createPublicClient } = await import('viem');
  const { base } = await import('viem/chains');
  const client = createPublicClient({ chain: base, transport: http() });
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
  stellarAddressOverride,
  onNeedsSetup,
  fundFromExternal,
}: CctpEngineProps): SwapEngineResult {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { wallet, getAllTokens } = usePersistStore();
  const network = useNetworkStore((s) => s.network);

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
  const [stageError, setStageError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  // #32 chunk 4b: whether THIS run started with the external→Normal funding
  // move (drives the extra step in the progress modal).
  const [usedFunding, setUsedFunding] = useState(false);
  const cancelled = useRef(false);

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
        const res = await fetch('/api/lifi/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (stale) return;
        if (!res.ok || !data.success) setQuoteError(data.error ?? t('Failed to fetch quote'));
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
      reserve = await ethGasReserve(400_000n);
    } else if (fromSymbol === 'BTC') {
      try {
        const r = await fetch('https://mempool.space/api/v1/fees/recommended', {
          signal: AbortSignal.timeout(6000),
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
      patch: async (body: Record<string, string | boolean>) =>
        fetch(`/api/cctp/transfers/${transferId}`, {
          method: 'PATCH',
          headers: await buildAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify(body),
        }).catch(() => {}),
      pollStatus: async (target: string, intervalMs: number) => {
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
              signal: AbortSignal.timeout(20_000),
            });
            if (res.ok) {
              const data = await res.json();
              status = data?.transfer?.status;
              detail = data?.transfer?.errorDetail;
              sawTransfer = typeof status === 'string';
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
                'Lost connection while tracking this swap — it continues on our servers. Check Activity in a few minutes.'
              )
            );
          await new Promise((r) => setTimeout(r, intervalMs));
        }
      },
      topUp: async () => {
        const res = await fetch('/api/cctp/gas-topup', {
          method: 'POST',
          headers: await buildAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({ transferId }),
          signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok && res.status !== 409)
          throw new Error(t('Gas top-up failed — try again in a moment.'));
        await new Promise((r) => setTimeout(r, 8_000));
      },
    }),
    [t]
  );

  // #66: 'Done' must mean the wallet ALREADY shows the result — the LI.FI
  // engine's arrival rule (#62) applied here. The delivered side's balance
  // refetch is AWAITED (capped) before the stage flips; fire-and-forget
  // refreshes raced the modal and lost, so "Done" showed against a stale
  // balance that looked like missing funds.
  //   out (ETH/SOL): runOutbound has chain-confirmed delivery before calling
  //     this — await the destination chain's verify-and-retry refetch.
  //   out (BTC): delivery takes many minutes; the snackbar + activity pending
  //     badge own that wait, so the refetch stays fire-and-forget (documented
  //     trade-off: holding the modal open that long would itself look stuck).
  //   in: USDC lands on Stellar, mint already chain-confirmed — await the
  //     token-store refresh.
  const finish = useCallback(async () => {
    const cap = new Promise<void>((resolve) => {
      setTimeout(resolve, ARRIVAL_CAP_MS);
    });
    if (direction === 'out') {
      const chain = ({ BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana' } as const)[
        toSymbol as CrosschainSymbol
      ];
      getAllTokens(true).catch(() => {}); // source side: USDC left Stellar
      if (chain === 'bitcoin') {
        refetchChain?.(chain).catch(() => {});
      } else if (chain && refetchChain) {
        await Promise.race([refetchChain(chain).catch(() => {}), cap]);
      }
    } else {
      await Promise.race([getAllTokens(true).catch(() => {}), cap]);
    }
    setStage('done');
    resetInput();
    window.dispatchEvent(new Event('nf:activity-updated'));
  }, [direction, toSymbol, resetInput, getAllTokens, refetchChain]);

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

      try {
        setStage('lifi');
        const srcTx = await executeLifiSwap(lifiQuote, {
          bitcoinAddress: addresses.BTC,
          ethereumAddress: addresses.ETH,
          solanaAddress: addresses.SOL,
        });
        broadcastStarted = true;
        await patch({ srcSwapTxHash: srcTx });

        setStage('arriving');
        const target = BigInt(lifiQuote.estimate.toAmountMin);
        const started = Date.now();
        for (;;) {
          if (cancelled.current) return;
          let bal = baseline;
          try {
            bal = await readBaseUsdc(evmAddress!);
          } catch {
            /* transient RPC hiccup — retry next interval */
          }
          if (bal >= baseline + (target * 95n) / 100n) {
            arrivedWire = bal - baseline > target ? target : bal - baseline;
            break;
          }
          if (Date.now() - started > 45 * 60_000)
            throw new Error(t('Bridge leg timed out — funds will arrive; resume from the banner.'));
          await new Promise((res) => setTimeout(res, 10_000));
        }

        setStage('topup');
        await topUp();

        setStage('burn');
        const { burnTxHash } = await burnUsdcOnEvm({
          network,
          chain: 'base',
          evmAddress: evmAddress!,
          amountWire: arrivedWire,
          stellarRecipient: stellarAddress!,
        });
        await patch({ burnTxHash });

        setStage('bridging');
        await pollStatus('COMPLETED', 15_000);

        // Delivered amount for the activity feed — the USDC that landed on Stellar.
        const dstAmount = wireToUsdc(arrivedWire);
        await patch({ dstAmount });
        await finish();
      } catch (e: any) {
        if (String(e?.message) !== 'cancelled') {
          console.error('[cctp engine] stage failed:', e); // surface stack
          setStageError(String(e?.message ?? e));
        }
        if (!broadcastStarted) {
          // Server re-checks the precondition (CREATED + no tx hashes), so a
          // race can only leave the row pending — never bury a real transfer.
          await patch({ markFailed: true }).catch(() => {});
          window.dispatchEvent(new Event('nf:activity-updated'));
        }
      }
    },
    [evmAddress, stellarAddress, network, addresses, makePatcher, finish, t]
  );

  // ---- OUTBOUND orchestration -----------------------------------------------------
  const runOutbound = useCallback(
    async (transferId: string, amountWire: bigint) => {
      cancelled.current = false;
      const { patch, pollStatus, topUp } = await makePatcher(transferId);
      // Same contract as runInbound: false ⇒ nothing reached a chain yet.
      let broadcastStarted = false;

      try {
        setStage('burn');
        const { burnTxHash } = await burnUsdcOnStellar({
          network,
          stellarAddress: stellarAddress!,
          amountWire,
          destinationDomain: CCTP_DOMAIN.base,
          mintRecipient: evmAddressToBytes(evmAddress!),
        });
        broadcastStarted = true;
        await patch({ burnTxHash });

        setStage('bridging');
        await pollStatus('COMPLETED', 5_000); // Stellar-source attestation ≈ seconds

        setStage('topup');
        await topUp();

        setStage('pivot-swap');
        const result = await executePivotSwap({
          evmAddress: evmAddress!,
          toSymbol: toSymbol as CrosschainSymbol,
          toAddress: nativeAddress!,
          amountWire,
        });
        await patch({ dstSwapTxHash: result.txHash });
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
        const delivery = await pollPivotDelivery(
          result.txHash,
          result.fromChainId,
          result.toChainId,
          cancelled,
          toSymbol === 'BTC' ? 360 : 60
        );
        if (delivery === 'FAILED' || delivery === 'REFUNDED') {
          throw new Error(
            t(
              'The final swap leg did not deliver — your USDC is at your own Base address, untouched by anyone else. Contact support to recover it.'
            )
          );
        }
        await patch({ dstAmount });
        if (delivery === null) {
          // Timed out (~10 min) still bridging: rare, and the funds are in
          // flight to the user's own address. Documented trade-off (Niko's
          // #62 rule — a successful swap must never look stuck): close out
          // with an honest heads-up instead of an error.
          enqueueSnackbar(
            t('{{sym}} is on its way — delivery is taking longer than usual.', { sym: toSymbol }),
            { variant: 'info' }
          );
        }
        await finish();
      } catch (e: any) {
        if (String(e?.message) !== 'cancelled') {
          console.error('[cctp engine] stage failed:', e); // surface stack
          setStageError(String(e?.message ?? e));
        }
        if (!broadcastStarted) {
          await patch({ markFailed: true }).catch(() => {});
          window.dispatchEvent(new Event('nf:activity-updated'));
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [evmAddress, stellarAddress, nativeAddress, network, toSymbol, makePatcher, finish, t]
  );

  const handleExecute = useCallback(async () => {
    if (!quote || !evmAddress || !stellarAddress || !nativeAddress) return;
    setStageError(null);
    setModalOpen(true);
    try {
      // #32 chunk 4b: source = external wallet → move the USDC to the Normal
      // wallet FIRST (kit-signed; execute resolves only once the funds are
      // visible on the companion — the #62 verify-before-act rule, so a burn
      // can never fire against a balance that hasn't arrived). The move runs
      // BEFORE the transfer row is created: it is a plain send, recorded by
      // the send funnel, not a CCTP leg.
      if (direction === 'out' && fundFromExternal) {
        setUsedFunding(true);
        setStage('funding');
        const funded = await fundFromExternal.execute(amount.toFixed(7, BigNumber.ROUND_DOWN));
        if (!funded) {
          throw new Error(
            t('The USDC transfer from {{wallet}} was not completed — nothing was swapped.', {
              wallet: fundFromExternal.label,
            })
          );
        }
      } else {
        setUsedFunding(false);
      }

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
          quoteJson: { feePercent, lifiTool: quote?.tool ?? null },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.id) throw new Error(data.error ?? t('Could not start the swap'));
      if (direction === 'in') await runInbound(data.id, quote);
      else await runOutbound(data.id, amountWire);
    } catch (e: any) {
      console.error('[cctp engine] execute failed:', e); // surface stack
      setStageError(String(e?.message ?? e));
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
    runInbound,
    runOutbound,
    t,
  ]);

  // ---- UI contract ------------------------------------------------------------------
  const etaMinutes = quote
    ? direction === 'in'
      ? Math.max(1, Math.round(quote.estimate.executionDuration / 60)) + 20 // + Base finality
      : Math.max(2, Math.round(quote.estimate.executionDuration / 60)) + 2 // Stellar attests in seconds
    : null;

  const button = useMemo(() => {
    if (!enabled) return { label: t('Enter an amount'), action: null, loading: false };
    if (network !== 'mainnet')
      return {
        label: t('Mainnet only'),
        action: null,
        loading: false,
        helper: (
          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', textAlign: 'center' }}>
            {t('Cross-ecosystem swaps route through LI.FI, which has no testnet liquidity.')}
          </Typography>
        ),
      };
    if (!nativeAddress)
      return {
        label: t('Set up {{sym}} wallet first', {
          sym: direction === 'in' ? fromSymbol : toSymbol,
        }),
        action: null,
        loading: false,
      };
    if (!evmAddress)
      return {
        label: t('Set up Ethereum wallet first'),
        action: null,
        loading: false,
        helper: (
          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', textAlign: 'center' }}>
            {t(
              'The route travels via your own Base address — create your Ethereum wallet from the Receive menu once.'
            )}
          </Typography>
        ),
      };
    // #32 chunk 4a: for external-wallet users every Stellar-side preflight
    // failure routes into the guided setup dialog, which derives the exact
    // step to resume at (create / activate / trustline / top-up).
    if (missingStellar)
      return onNeedsSetup
        ? { label: t('Set up your Normal wallet'), action: onNeedsSetup, loading: false }
        : { label: t('Set up Stellar wallet first'), action: null, loading: false };
    if (needsTrustline)
      return onNeedsSetup
        ? { label: t('Add USDC to your Normal wallet'), action: onNeedsSetup, loading: false }
        : {
            label: t('Add USDC Trustline first'),
            action: null,
            loading: false,
            helper: (
              <Typography
                sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', textAlign: 'center' }}
              >
                {t(
                  'Your Stellar account needs a USDC trustline to receive the bridged funds — add it from the swap tab (USDC) or savings page.'
                )}
              </Typography>
            ),
          };
    if (lowFeeXlm)
      return {
        label: t('Top up XLM to swap'),
        action: onNeedsSetup ?? null,
        loading: false,
        helper: (
          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', textAlign: 'center' }}>
            {t(
              'The swap pays its Stellar network fee in XLM from {{which}} — a little XLM is needed there.',
              { which: onNeedsSetup ? t('your Normal wallet') : t('your wallet') }
            )}
          </Typography>
        ),
      };
    if (amount.lte(0)) return { label: t('Enter an amount'), action: null, loading: false };
    if (insufficient) return { label: t('Insufficient balance'), action: null, loading: false };
    if (stage && stage !== 'done')
      return { label: t('Swap in progress…'), action: null, loading: true };
    if (quoteError) return { label: t('Try a different amount'), action: null, loading: false };
    if (quoteLoading || !quote)
      return { label: t('Fetching quote…'), action: null, loading: false };
    // #32 chunk 4b: swapping FROM the external wallet — the CTA names the
    // move before any signature, never a silent transfer.
    if (direction === 'out' && fundFromExternal)
      return {
        label: t('Move {{amt}} USDC from {{wallet}} & swap', {
          amt: amount.toFixed(2, BigNumber.ROUND_DOWN),
          wallet: fundFromExternal.label,
        }),
        action: handleExecute,
        loading: false,
        helper: (
          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', textAlign: 'center' }}>
            {t(
              'Your USDC moves to your Normal wallet first (one approval in {{wallet}}), then the swap runs with your passkey.',
              { wallet: fundFromExternal.label }
            )}
          </Typography>
        ),
      };
    return { label: t('Swap'), action: handleExecute, loading: false };
  }, [
    enabled,
    network,
    nativeAddress,
    evmAddress,
    missingStellar,
    needsTrustline,
    lowFeeXlm,
    onNeedsSetup,
    fundFromExternal,
    amount,
    insufficient,
    stage,
    quoteError,
    quoteLoading,
    quote,
    handleExecute,
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
        <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>{t('Route')}</Typography>
        <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', ...MONO }}>
          {routeLabel}
        </Typography>
      </Stack>
      <Stack direction="row" justifyContent="space-between">
        <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
          {t('Bridge (Circle CCTP)')}
        </Typography>
        <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', ...MONO }}>
          {t('Free')}
        </Typography>
      </Stack>
      {feePercent > 0 && amount.gt(0) && (
        <Stack direction="row" justifyContent="space-between">
          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
            {t('Normal fee ({{pct}}%)', { pct: +(feePercent * 100).toFixed(2) })}
          </Typography>
          <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', ...MONO }}>
            −{amount.multipliedBy(feePercent).toFixed(6)} {fromSymbol}
            {fromPrice.gt(0)
              ? ` (${fCurrency(amount.multipliedBy(feePercent).multipliedBy(fromPrice))})`
              : ''}
          </Typography>
        </Stack>
      )}
      {etaMinutes && (
        <Stack direction="row" justifyContent="space-between">
          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
            {t('Estimated time')}
          </Typography>
          <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', ...MONO }}>
            ~{etaMinutes} {t('min')}
          </Typography>
        </Stack>
      )}
      <Typography sx={{ fontSize: '11px', color: 'rgba(10,10,15,0.4)', lineHeight: 1.5 }}>
        {t('Funds travel via your own addresses at every step.')}
      </Typography>
    </Stack>
  ) : null;

  return {
    toAmount,
    quoteLoading: enabled ? quoteLoading : false,
    quoteError: enabled ? quoteError : null,
    details,
    footer: null,
    button,
    modals: (
      <CctpProgressModal
        open={modalOpen}
        direction={direction}
        stage={stage}
        error={stageError}
        fromSymbol={fromSymbol}
        toSymbol={toSymbol}
        includeFunding={usedFunding}
        fundingWalletLabel={fundFromExternal?.label}
        onClose={() => {
          cancelled.current = true;
          setModalOpen(false);
          if (stage === 'done') setStage(null);
        }}
      />
    ),
    getMaxToken,
  };
}
