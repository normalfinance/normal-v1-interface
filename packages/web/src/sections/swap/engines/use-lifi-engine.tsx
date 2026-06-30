'use client';

import type { LifiQuote } from '@/lib/lifi/execute';
import type { TurnkeyChain } from '@/lib/turnkey/add-account';

import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';
import { useDebounce } from '@/hooks/use-debounce';
import { MONO } from '@/sections/portfolio/_shared';
import { executeLifiSwap } from '@/lib/lifi/execute';
import { ETH_RPC_URL } from '@/hooks/use-chain-portfolio';
import React, { useMemo, useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';
import { ChainSetupDialog } from '@/components/_common/chain-setup-dialog';

import { LifiStatusModal } from '../lifi-status-modal';
import { isTerminal, useLifiTracker } from './lifi-tracker';

import type { LifiTrackedTx } from './lifi-tracker';
import type { CrosschainSymbol, SwapEngineResult } from './types';

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
}: LifiEngineProps): SwapEngineResult {
  const { t } = useTranslate();
  const { user } = useSupabaseAuth();
  const { enqueueSnackbar } = useSnackbar();

  const from = CHAIN_ASSETS[fromSymbol];
  const to = CHAIN_ASSETS[toSymbol];
  const fromAddress = addresses[fromSymbol];
  const toAddress = addresses[toSymbol];

  const [quote, setQuote] = useState<LifiQuote | null>(null);
  // Integrator fee as a fraction (e.g. 0.005), reported by the quote route — 0
  // when the portal stripped it (1011 fallback), so we never show a phantom fee.
  const [feePercent, setFeePercent] = useState(0);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [setupChain, setSetupChain] = useState<TurnkeyChain | null>(null);
  const [statusTx, setStatusTx] = useState<LifiTrackedTx | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);

  // Tracking runs here (not in the modal) so "Continue in background" actually
  // keeps confirming, refreshing balances and notifying after the dialog closes.
  const stage = useLifiTracker(statusTx, {
    onActivity: () => window.dispatchEvent(new Event('nf:activity-updated')),
    onTerminal: (st) => {
      if (st === 'done')
        enqueueSnackbar(
          t('Swap complete — {{symbol}} delivered to your wallet.', { symbol: statusTx?.toSymbol ?? toSymbol }),
          { variant: 'success' }
        );
      else if (st === 'refunded')
        enqueueSnackbar(
          t('Swap refunded — your {{symbol}} was returned. No funds were lost.', {
            symbol: statusTx?.fromSymbol ?? fromSymbol,
          }),
          { variant: 'warning' }
        );
      else enqueueSnackbar(t('Cross-chain swap failed — no funds were moved.'), { variant: 'error' });
    },
  });

  const amountUsd = fromPrice.gt(0) ? amount.multipliedBy(fromPrice) : null;
  const belowMinimum = amount.gt(0) && amountUsd !== null && amountUsd.lt(MIN_SWAP_USD);
  const insufficient = amount.gt(0) && amount.gt(fromBalance);

  // Debounce the token amount; gated on `enabled` so the inactive engine never
  // fetches. `stale` (not the abort signal) settles the spinner deterministically.
  const debouncedAmount = useDebounce(enabled ? amount.toFixed() : '', 600);

  useEffect(() => {
    const value = BigNumber(debouncedAmount || 0);
    if (!enabled || !fromAddress || !toAddress || value.lte(0) || belowMinimum) {
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
            toSymbol,
            fromAmount: value.multipliedBy(BigNumber(10).pow(from.decimals)).toFixed(0),
            fromAddress,
            toAddress,
          }),
        });
        const data = await res.json();
        if (stale) return;
        if (!res.ok || !data.success) {
          setQuoteError(data.error ?? t('Failed to fetch quote'));
        } else {
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
  // limit × buffer); a flat reserve is either far too large in USD or too small
  // when gas spikes. Returns the max in *token* units; the shell formats it.
  const getMaxToken = async (): Promise<BigNumber> => {
    let reserve = from.feeReserve;
    if (fromSymbol === 'ETH') {
      try {
        const res = await fetch(ETH_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_gasPrice', params: [] }),
        });
        const data = await res.json();
        const gasPriceWei = BigInt(data.result);
        const gasCostEth = Number((gasPriceWei * 250_000n * 16n) / 10n) / 1e18;
        reserve = Math.min(Math.max(gasCostEth, 0.0005), 0.02);
      } catch {
        reserve = 0.003;
      }
    }
    return BigNumber.max(fromBalance.minus(reserve), 0);
  };

  const handleSetupSuccess = async () => {
    if (setupChain) await refetchChain(setupChain);
    setSetupChain(null);
  };

  const handleExecute = async () => {
    if (!quote) return;
    setExecuting(true);
    try {
      const txHash = await executeLifiSwap(quote, {
        bitcoinAddress: addresses.BTC,
        ethereumAddress: addresses.ETH,
        solanaAddress: addresses.SOL,
      });

      // Start the background tracker + open its view. Tracking lives in the
      // engine now, so closing the dialog won't stop it.
      setStatusTx({
        txHash,
        fromChainId: quote.action.fromChainId,
        toChainId: quote.action.toChainId,
        fromSymbol,
        toSymbol,
        amountIn: amount.toFixed(),
        amountOut: (toAmount ?? BigNumber(0)).toFixed(),
      });
      setStatusOpen(true);
      resetInput();
      setQuote(null);
    } catch (err: any) {
      enqueueSnackbar(err?.message ?? t('Swap failed'), { variant: 'error' });
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
      return { label: t('Insufficient {{symbol}} balance', { symbol: fromSymbol }), action: null, loading: false };
    if (belowMinimum)
      return { label: t('Minimum swap is ${{min}}', { min: MIN_SWAP_USD }), action: null, loading: false };
    if (quoteLoading) return { label: t('Fetching quote…'), action: null, loading: false };
    if (quoteError) return { label: t('Quote unavailable'), action: null, loading: false };
    if (!quote) return { label: t('Fetching quote…'), action: null, loading: false };
    if (executing) return { label: t('Confirm in your passkey prompt…'), action: null, loading: true };
    return { label: t('Swap with passkey'), action: handleExecute, loading: false };
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
            <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>{t('Rate')}</Typography>
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', ...MONO }}>
              1 {fromSymbol} ≈ {rate.toFixed(6)} {toSymbol}
            </Typography>
          </Box>
        )}
        {toAmountMin && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
              {t('Minimum received')}
            </Typography>
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', ...MONO }}>
              {toAmountMin.toFixed(6, BigNumber.ROUND_DOWN)} {toSymbol}
            </Typography>
          </Box>
        )}
        {feeToken && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>{feeLabel}</Typography>
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', ...MONO }}>
              −{feeToken.toFixed(6, BigNumber.ROUND_DOWN)} {fromSymbol}
              {feeUsd ? ` (${fCurrency(feeUsd)})` : ''}
            </Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>{t('Route')}</Typography>
          <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F' }}>{quote.tool}</Typography>
        </Box>
        {etaMinutes !== null && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
              {t('Estimated time')}
            </Typography>
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F' }}>
              ~{etaMinutes} {t('min')}
            </Typography>
          </Box>
        )}
      </Stack>
    ) : null;

  const footer = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mt: '12px', justifyContent: 'center' }}>
      <Iconify icon="eva:info-outline" width={13} sx={{ color: 'rgba(10,10,15,0.35)' }} />
      <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)' }}>
        {t('{{symbol}} is delivered to your own Normal wallet address.', { symbol: toSymbol })}
      </Typography>
    </Box>
  );

  const modals = (
    <>
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
      {statusTx && (
        <LifiStatusModal
          open={statusOpen}
          // Closing only hides the view — the tracker keeps running in the
          // background and clears the tx once it has settled.
          onClose={() => {
            setStatusOpen(false);
            if (isTerminal(stage)) setStatusTx(null);
          }}
          stage={stage}
          txHash={statusTx.txHash}
          fromChainId={statusTx.fromChainId}
          toChainId={statusTx.toChainId}
          fromSymbol={statusTx.fromSymbol}
          toSymbol={statusTx.toSymbol}
        />
      )}
    </>
  );

  return {
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
