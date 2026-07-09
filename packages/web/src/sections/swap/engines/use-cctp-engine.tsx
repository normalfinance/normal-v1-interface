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

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useSnackbar } from '@/components/template/snackbar';

import { groupOf } from './types';
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
}

const NATIVE_DECIMALS: Record<CrosschainSymbol, number> = { BTC: 8, ETH: 18, SOL: 9 };

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
}: CctpEngineProps): SwapEngineResult {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { wallet, getAllTokens } = usePersistStore();
  const network = useNetworkStore((s) => s.network);

  // 'in': crosschain → stellar; 'out': USDC(stellar) → crosschain.
  const direction: 'in' | 'out' = groupOf(fromSymbol) === 'stellar' ? 'out' : 'in';

  const stellarAddress = wallet.address;
  const {
    isLoading: isCheckingAccount,
    accountExists,
    hasUsdcTrustline,
  } = useAccountStatus(enabled ? stellarAddress : undefined);

  const [quote, setQuote] = useState<any>(null);
  const [feePercent, setFeePercent] = useState(0);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [stage, setStage] = useState<CctpStage | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const cancelled = useRef(false);

  const evmAddress = addresses.ETH; // the Base pivot is always the user's own EVM address
  const nativeAddress = direction === 'in' ? addresses[fromSymbol as CrosschainSymbol] : addresses[toSymbol as CrosschainSymbol];

  // ---- quote ------------------------------------------------------------------
  // in : LI.FI native → USDC_BASE (leg 1); CCTP + optional XLM leg estimated.
  // out: LI.FI USDC_BASE → target (leg 3) quoted directly — CCTP is 1:1/$0, so
  //      the pivot quote IS the swap quote.
  const debouncedAmount = useDebounce(enabled ? amount.toFixed() : '', 600);

  useEffect(() => {
    const value = BigNumber(debouncedAmount || 0);
    const ready =
      enabled && evmAddress && value.gt(0) && (direction === 'in' ? !!nativeAddress : !!nativeAddress);
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

  const usdcOutMin = quote && direction === 'in' ? BigNumber(quote.estimate.toAmountMin).dividedBy(1e6) : null;
  const toAmount =
    direction === 'in'
      ? usdcOutMin // inbound always delivers USDC on Stellar
      : quote
        ? BigNumber(quote.estimate.toAmountMin).dividedBy(
            BigNumber(10).pow(NATIVE_DECIMALS[toSymbol as CrosschainSymbol])
          )
        : null;

  const insufficient = amount.gt(0) && amount.gt(fromBalance);
  const needsTrustline = direction === 'in' && !isCheckingAccount && accountExists && !hasUsdcTrustline;
  const missingStellar = !stellarAddress || (!isCheckingAccount && !accountExists);

  // MAX leaves the source chain's network fee behind. Outbound USDC needs no
  // reserve (Soroban fees are paid in XLM); inbound mirrors the LI.FI engine,
  // with BTC resolved live from the mempool rate.
  const getMaxToken = async (): Promise<BigNumber> => {
    if (direction === 'out') return fromBalance;
    let reserve = { BTC: 0.00003, ETH: 0.003, SOL: 0.01 }[fromSymbol as CrosschainSymbol];
    if (fromSymbol === 'BTC') {
      try {
        const r = await fetch('https://mempool.space/api/v1/fees/recommended');
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
  const makePatcher = useCallback(async (transferId: string) => {
    const headers = await buildAuthHeaders();
    return {
      headers,
      patch: (body: Record<string, string>) =>
        fetch(`/api/cctp/transfers/${transferId}`, {
          method: 'PATCH',
          headers,
          credentials: 'include',
          body: JSON.stringify(body),
        }).catch(() => {}),
      pollStatus: async (target: string, intervalMs: number) => {
        for (;;) {
          if (cancelled.current) throw new Error('cancelled');
          let status: string | undefined;
          let detail: string | undefined;
          try {
            const res = await fetch(`/api/cctp/transfers/${transferId}`, {
              headers,
              credentials: 'include',
              signal: AbortSignal.timeout(20_000),
            });
            const data = await res.json();
            status = data?.transfer?.status;
            detail = data?.transfer?.errorDetail;
          } catch {
            /* transient (timeout / hung server) — the cron keeps advancing it; just retry */
          }
          if (status === target) return;
          if (status === 'FAILED') throw new Error(detail ?? 'transfer failed');
          await new Promise((r) => setTimeout(r, intervalMs));
        }
      },
      topUp: async () => {
        const res = await fetch('/api/cctp/gas-topup', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ transferId }),
          signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok && res.status !== 409) throw new Error(t('Gas top-up failed — try again in a moment.'));
        await new Promise((r) => setTimeout(r, 8_000));
      },
    };
  }, [t]);

  const finish = useCallback(() => {
    setStage('done');
    resetInput();
    getAllTokens(true).catch(() => {});
    window.dispatchEvent(new Event('nf:activity-updated'));
  }, [resetInput, getAllTokens]);

  // ---- INBOUND orchestration -----------------------------------------------------
  const runInbound = useCallback(
    async (transferId: string, lifiQuote: any) => {
      cancelled.current = false;
      const { patch, pollStatus, topUp } = await makePatcher(transferId);
      const baseline = await readBaseUsdc(evmAddress!);
      let arrivedWire = 0n;

      try {
        setStage('lifi');
        const srcTx = await executeLifiSwap(lifiQuote, {
          bitcoinAddress: addresses.BTC,
          ethereumAddress: addresses.ETH,
          solanaAddress: addresses.SOL,
        });
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
        finish();
      } catch (e: any) {
        if (String(e?.message) !== 'cancelled') {
          console.error('[cctp engine] stage failed:', e); // surface stack
          setStageError(String(e?.message ?? e));
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

      try {
        setStage('burn');
        const { burnTxHash } = await burnUsdcOnStellar({
          network,
          stellarAddress: stellarAddress!,
          amountWire,
          destinationDomain: CCTP_DOMAIN.base,
          mintRecipient: evmAddressToBytes(evmAddress!),
        });
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
        await patch({ dstAmount });
        if (toSymbol === 'BTC') {
          enqueueSnackbar(t('BTC is on its way — delivery takes a few minutes.'), { variant: 'info' });
        }
        finish();
      } catch (e: any) {
        if (String(e?.message) !== 'cancelled') {
          console.error('[cctp engine] stage failed:', e); // surface stack
          setStageError(String(e?.message ?? e));
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
  }, [quote, direction, amount, evmAddress, stellarAddress, nativeAddress, fromSymbol, toSymbol, feePercent, runInbound, runOutbound, t]);

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
        label: t('Set up {{sym}} wallet first', { sym: direction === 'in' ? fromSymbol : toSymbol }),
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
            {t('The route travels via your own Base address — create your Ethereum wallet from the Receive menu once.')}
          </Typography>
        ),
      };
    if (missingStellar) return { label: t('Set up Stellar wallet first'), action: null, loading: false };
    if (needsTrustline)
      return {
        label: t('Add USDC Trustline first'),
        action: null,
        loading: false,
        helper: (
          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', textAlign: 'center' }}>
            {t('Your Stellar account needs a USDC trustline to receive the bridged funds — add it from the swap tab (USDC) or savings page.')}
          </Typography>
        ),
      };
    if (amount.lte(0)) return { label: t('Enter an amount'), action: null, loading: false };
    if (insufficient) return { label: t('Insufficient balance'), action: null, loading: false };
    if (stage && stage !== 'done') return { label: t('Swap in progress…'), action: null, loading: true };
    if (quoteError) return { label: t('Try a different amount'), action: null, loading: false };
    if (quoteLoading || !quote) return { label: t('Fetching quote…'), action: null, loading: false };
    return { label: t('Swap'), action: handleExecute, loading: false };
  }, [enabled, network, nativeAddress, evmAddress, missingStellar, needsTrustline, amount, insufficient, stage, quoteError, quoteLoading, quote, handleExecute, t, direction, fromSymbol, toSymbol]);

  const routeLabel =
    direction === 'in'
      ? `${fromSymbol} → USDC (Base) → Stellar`
      : `USDC → Base (Circle) → ${toSymbol}`;

  const details = quote ? (
    <Stack spacing={0.75}>
      <Stack direction="row" justifyContent="space-between">
        <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>{t('Route')}</Typography>
        <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', ...MONO }}>{routeLabel}</Typography>
      </Stack>
      <Stack direction="row" justifyContent="space-between">
        <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>{t('Bridge (Circle CCTP)')}</Typography>
        <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', ...MONO }}>{t('Free')}</Typography>
      </Stack>
      {feePercent > 0 && amount.gt(0) && (
        <Stack direction="row" justifyContent="space-between">
          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
            {t('Normal fee ({{pct}}%)', { pct: +(feePercent * 100).toFixed(2) })}
          </Typography>
          <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', ...MONO }}>
            −{amount.multipliedBy(feePercent).toFixed(6)} {fromSymbol}
            {fromPrice.gt(0) ? ` (${fCurrency(amount.multipliedBy(feePercent).multipliedBy(fromPrice))})` : ''}
          </Typography>
        </Stack>
      )}
      {etaMinutes && (
        <Stack direction="row" justifyContent="space-between">
          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>{t('Estimated time')}</Typography>
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
