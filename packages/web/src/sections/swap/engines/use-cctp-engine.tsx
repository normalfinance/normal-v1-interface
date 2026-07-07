'use client';

// Composite cross-ecosystem engine: BTC/ETH/SOL → XLM/USDC on Stellar.
//   leg 1  LI.FI: native asset → USDC on Base (delivered to the USER's own
//          Base address — never custodial)
//   leg 2  CCTP: burn on Base (user-signed, relayer gas top-up) → attestation
//          → relayer mint_and_forward on Stellar (server state machine)
//   leg 3  optional Soroswap: USDC → XLM (user-signed)
// The transfer row is created BEFORE anything moves; every completed leg is
// PATCHed onto it, so a closed tab is resumable (banner) and everything after
// the burn completes server-side even with the app closed.
// Outbound (Stellar → BTC/ETH/SOL) ships in the next iteration.

import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { buildAuthHeaders } from '@/utils/http';
import { fCurrency } from '@/utils/format-number';
import { useDebounce } from '@/hooks/use-debounce';
import { useSwap } from '@/hooks/stellar/use-swap';
import { burnUsdcOnEvm } from '@/lib/cctp/burn-evm';
import { executeLifiSwap } from '@/lib/lifi/execute';
import { EVM_USDC, CCTP_DOMAIN } from '@/lib/cctp/config';
import { usdcToWire, wireToUsdc } from '@/lib/cctp/decimals';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import { usePersistStore , useNetworkStore } from '@normalfinance/state';
import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useSnackbar } from '@/components/template/snackbar';

import { type CctpStage, CctpProgressModal } from '../cctp-progress-modal';

import type { StellarSymbol, SwapEngineResult, CrosschainSymbol } from './types';

const MONO = { fontFamily: '"Geist Mono", "Courier New", monospace' } as const;

export interface CctpEngineProps {
  fromSymbol: CrosschainSymbol;
  toSymbol: StellarSymbol;
  addresses: { BTC: string | null; ETH: string | null; SOL: string | null };
  amount: BigNumber;
  fromBalance: BigNumber;
  fromPrice: BigNumber;
  enabled: boolean;
  resetInput: () => void;
}

const FROM_DECIMALS: Record<CrosschainSymbol, number> = { BTC: 8, ETH: 18, SOL: 9 };

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
  const { wallet, tokenState, getAllTokens } = usePersistStore();
  const network = useNetworkStore((s) => s.network);
  const config = useStellarConfig();
  const soroswap = useSwap();

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

  const fromAddress = addresses[fromSymbol];
  const evmAddress = addresses.ETH; // pivot custodian: user's own Base address
  const xlmPrice = useMemo(() => {
    const xlm = tokenState.tokens.find((tk) => tk.symbol === 'XLM');
    return BigNumber(xlm?.price || 0);
  }, [tokenState.tokens]);

  // ---- quote: LI.FI leg (asset → USDC on Base) + estimated Stellar leg ------
  const debouncedAmount = useDebounce(enabled ? amount.toFixed() : '', 600);

  useEffect(() => {
    const value = BigNumber(debouncedAmount || 0);
    if (!enabled || !fromAddress || !evmAddress || value.lte(0)) {
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
        const res = await fetch('/api/lifi/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            fromSymbol,
            toSymbol: 'USDC_BASE',
            fromAmount: value.multipliedBy(BigNumber(10).pow(FROM_DECIMALS[fromSymbol])).toFixed(0),
            fromAddress,
            toAddress: evmAddress,
          }),
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
  }, [enabled, debouncedAmount, fromSymbol, fromAddress, evmAddress]);

  // USDC that lands on Base (worst case), then on Stellar (CCTP is 1:1, $0).
  const usdcOutMin = quote ? BigNumber(quote.estimate.toAmountMin).dividedBy(1e6) : null;
  const toAmount = usdcOutMin
    ? toSymbol === 'USDC'
      ? usdcOutMin
      : xlmPrice.gt(0)
        ? usdcOutMin.dividedBy(xlmPrice)
        : null
    : null;

  const insufficient = amount.gt(0) && amount.gt(fromBalance);
  const needsTrustline = !isCheckingAccount && accountExists && !hasUsdcTrustline;
  const missingStellar = !stellarAddress || (!isCheckingAccount && !accountExists);

  const getMaxToken = async (): Promise<BigNumber> => fromBalance; // shell reserves handled per-asset in Phase 2b

  // ---- orchestration ---------------------------------------------------------
  const runFromStage = useCallback(
    async (transferId: string, startAt: CctpStage, lifiQuote: any) => {
      cancelled.current = false;
      const headers = await buildAuthHeaders();
      const patch = (body: Record<string, string>) =>
        fetch(`/api/cctp/transfers/${transferId}`, {
          method: 'PATCH',
          headers,
          credentials: 'include',
          body: JSON.stringify(body),
        }).catch(() => {});

      const order: CctpStage[] = ['lifi', 'arriving', 'topup', 'burn', 'bridging', 'final-swap', 'done'];
      const from = order.indexOf(startAt);
      const baseline = await readBaseUsdc(evmAddress!);
      let arrivedWire: bigint = 0n;

      try {
        if (from <= order.indexOf('lifi')) {
          setStage('lifi');
          const txHash = await executeLifiSwap(lifiQuote, {
            bitcoinAddress: addresses.BTC,
            ethereumAddress: addresses.ETH,
            solanaAddress: addresses.SOL,
          });
          await patch({ srcSwapTxHash: txHash });
        }

        setStage('arriving');
        const target = BigInt(lifiQuote.estimate.toAmountMin);
        const started = Date.now();
        for (;;) {
          if (cancelled.current) return;
          const bal = await readBaseUsdc(evmAddress!);
          if (bal >= baseline + (target * 95n) / 100n) {
            arrivedWire = bal - baseline > target ? target : bal - baseline;
            break;
          }
          if (Date.now() - started > 45 * 60_000) throw new Error(t('Bridge leg timed out — funds will arrive; resume from the banner.'));
          await new Promise((res) => setTimeout(res, 10_000));
        }

        setStage('topup');
        const topup = await fetch('/api/cctp/gas-topup', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ transferId }),
        });
        if (!topup.ok && topup.status !== 409) throw new Error(t('Gas top-up failed — try again in a moment.'));
        await new Promise((res) => setTimeout(res, 8_000)); // let the dust confirm

        setStage('burn');
        if (arrivedWire === 0n) {
          const bal = await readBaseUsdc(evmAddress!);
          arrivedWire = bal - baseline > 0n ? bal - baseline : BigInt(lifiQuote.estimate.toAmountMin);
        }
        const { burnTxHash } = await burnUsdcOnEvm({
          network,
          chain: 'base',
          evmAddress: evmAddress!,
          amountWire: arrivedWire,
          stellarRecipient: stellarAddress!,
        });
        await patch({ burnTxHash });

        setStage('bridging');
        for (;;) {
          if (cancelled.current) return;
          const res = await fetch(`/api/cctp/transfers/${transferId}`, { headers, credentials: 'include' });
          const data = await res.json();
          if (data?.transfer?.status === 'COMPLETED') break;
          await new Promise((r) => setTimeout(r, 15_000));
        }

        if (toSymbol === 'XLM') {
          setStage('final-swap');
          const usdcAmount = wireToUsdc(arrivedWire);
          const q = await new Promise<any>((resolve) => {
            // useSwap.getQuote stores state; call the API-style helper directly.
            soroswap.getQuote(config.USDC_ADDRESS, config.XLM_ADDRESS || 'native', usdcAmount);
            // getQuote is async via state — poll the hook's quote briefly.
            const t0 = Date.now();
            const iv = setInterval(() => {
              if (soroswap.quote) {
                clearInterval(iv);
                resolve(soroswap.quote);
              } else if (Date.now() - t0 > 20_000) {
                clearInterval(iv);
                resolve(null);
              }
            }, 500);
          });
          if (q) {
            const hash = await soroswap.executeSwap(q, { tokenInSymbol: 'USDC', tokenOutSymbol: 'XLM' });
            if (hash) await patch({ dstSwapTxHash: hash });
          } else {
            enqueueSnackbar(t('USDC arrived on Stellar — the XLM conversion can be done from the swap tab.'), { variant: 'info' });
          }
        }

        setStage('done');
        resetInput();
        getAllTokens(true).catch(() => {});
        window.dispatchEvent(new Event('nf:activity-updated'));
      } catch (e: any) {
        setStageError(String(e?.message ?? e));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [evmAddress, stellarAddress, network, addresses, toSymbol, executeLifiSwap, soroswap, config, t]
  );

  const handleExecute = useCallback(async () => {
    if (!quote || !evmAddress || !stellarAddress || !usdcOutMin) return;
    setStageError(null);
    setModalOpen(true);
    setStage('lifi');
    try {
      const headers = await buildAuthHeaders();
      const res = await fetch('/api/cctp/transfers', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          direction: 'crosschain_to_stellar',
          sourceDomain: CCTP_DOMAIN.base,
          destDomain: CCTP_DOMAIN.stellar,
          amountWire: usdcToWire(usdcOutMin.toFixed(6, BigNumber.ROUND_DOWN)).toString(),
          srcAsset: fromSymbol,
          dstAsset: toSymbol,
          srcAddress: evmAddress,
          destAddress: stellarAddress,
          quoteJson: { feePercent, lifiTool: quote?.tool ?? null },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.id) throw new Error(data.error ?? t('Could not start the swap'));
      await runFromStage(data.id, 'lifi', quote);
    } catch (e: any) {
      setStageError(String(e?.message ?? e));
    }
  }, [quote, evmAddress, stellarAddress, usdcOutMin, fromSymbol, toSymbol, feePercent, runFromStage, t]);

  // ---- UI contract -------------------------------------------------------------
  const etaMinutes = quote
    ? Math.max(1, Math.round(quote.estimate.executionDuration / 60)) + 20 // + Base finality
    : null;

  const button = useMemo(() => {
    if (!enabled) return { label: t('Enter an amount'), action: null, loading: false };
    if (network !== 'mainnet')
      return { label: t('Mainnet only'), action: null, loading: false, helper: (
        <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', textAlign: 'center' }}>
          {t('Cross-ecosystem swaps route through LI.FI, which has no testnet liquidity.')}
        </Typography>
      ) };
    if (!fromAddress)
      return { label: t('Set up {{sym}} wallet first', { sym: fromSymbol }), action: null, loading: false };
    if (!evmAddress)
      return { label: t('Set up Ethereum wallet first', {}), action: null, loading: false, helper: (
        <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', textAlign: 'center' }}>
          {t('The route travels via your own Base address — create your Ethereum wallet from the Receive menu once.')}
        </Typography>
      ) };
    if (missingStellar)
      return { label: t('Set up Stellar wallet first'), action: null, loading: false };
    if (needsTrustline)
      return { label: t('Add USDC Trustline first'), action: null, loading: false, helper: (
        <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', textAlign: 'center' }}>
          {t('Your Stellar account needs a USDC trustline to receive the bridged funds — add it from the swap tab (USDC) or savings page.')}
        </Typography>
      ) };
    if (amount.lte(0)) return { label: t('Enter an amount'), action: null, loading: false };
    if (insufficient) return { label: t('Insufficient balance'), action: null, loading: false };
    if (stage && stage !== 'done') return { label: t('Swap in progress…'), action: null, loading: true };
    if (quoteLoading || !quote) return { label: t('Fetching quote…'), action: null, loading: false };
    return { label: t('Swap'), action: handleExecute, loading: false };
  }, [enabled, network, fromAddress, evmAddress, missingStellar, needsTrustline, amount, insufficient, stage, quoteLoading, quote, handleExecute, t, fromSymbol]);

  const details = quote ? (
    <Stack spacing={0.75}>
      <Stack direction="row" justifyContent="space-between">
        <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>{t('Route')}</Typography>
        <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', ...MONO }}>
          {fromSymbol} → USDC (Base) → Stellar{toSymbol === 'XLM' ? ' → XLM' : ''}
        </Typography>
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
        {t('Funds travel via your own addresses at every step. You can close the app after the burn step — delivery completes automatically.')}
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
        stage={stage}
        error={stageError}
        fromSymbol={fromSymbol}
        toSymbol={toSymbol}
        onClose={() => {
          // Post-burn stages complete server-side; pre-burn shows the resume banner.
          cancelled.current = true;
          setModalOpen(false);
          if (stage === 'done') setStage(null);
        }}
      />
    ),
    getMaxToken,
  };
}
