'use client';

import type { Token } from '@normalfinance/types';
import type { LifiQuote } from '@/lib/lifi/execute';
import type { TurnkeyChain } from '@/lib/turnkey/add-account';

import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { buildAuthHeaders } from '@/utils/http';
import { fCurrency } from '@/utils/format-number';
import { useDebounce } from '@/hooks/use-debounce';
import { executeLifiSwap } from '@/lib/lifi/execute';
import { useBtcPortfolio } from '@/hooks/use-btc-portfolio';
import React, { useMemo, useState, useEffect } from 'react';
import { MONO, CARD_SX } from '@/sections/portfolio/_shared';
import { cdn , sanitizeAmountInput } from '@normalfinance/utils';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useEthPortfolio, useSolPortfolio } from '@/hooks/use-chain-portfolio';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import SwapVertOutlined from '@mui/icons-material/SwapVertOutlined';

import PickToken from '@/components/_common/pick-token';
import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';
import { ChainSetupDialog } from '@/components/_common/chain-setup-dialog';

import { LifiStatusModal } from './lifi-status-modal';

// ---------------------------------------------------------------------------
// Cross-chain swaps between the user's own Turnkey addresses, routed by
// LI.FI (THORChain / Chainflip / Relay …). Native BTC, ETH, SOL only — the
// Stellar card next door handles XLM/USDC via Soroswap.
// ---------------------------------------------------------------------------

interface LifiAsset {
  symbol: 'BTC' | 'ETH' | 'SOL';
  name: string;
  decimals: number;
  icon: string;
  chain: TurnkeyChain;
  /** kept back from MAX so the source chain can pay its own network fee */
  feeReserve: number;
}

// feeReserve = amount kept back from MAX so the source chain can cover the
// bridge deposit's costs and the swap still validates. Per chain:
//  - BTC: the miner fee for the deposit tx (~2k sat)
//  - ETH: gas for the bridge call (can be sizable)
//  - SOL: must cover the wallet's ~0.00089 rent-exempt minimum AND the
//    ~0.00204 rent to open the USDC token account the SOL→BTC route creates,
//    plus network + 0.5% integrator fee. Under-reserving fails simulation
//    with "insufficient funds for rent" / token-account creation 0x1.
const ASSETS: LifiAsset[] = [
  { symbol: 'BTC', name: 'Bitcoin', decimals: 8, icon: cdn('tokens/bitcoin.webp'), chain: 'bitcoin', feeReserve: 0.00002 },
  { symbol: 'ETH', name: 'Ethereum', decimals: 18, icon: cdn('tokens/ethereum.webp'), chain: 'ethereum', feeReserve: 0.003 },
  { symbol: 'SOL', name: 'Solana', decimals: 9, icon: cdn('tokens/solana.webp'), chain: 'solana', feeReserve: 0.01 },
];

const assetBySymbol = (symbol: string) => ASSETS.find((a) => a.symbol === symbol)!;

export function LifiSwapCard() {
  const { t } = useTranslate();
  const { user } = useSupabaseAuth();
  const { enqueueSnackbar } = useSnackbar();

  const btc = useBtcPortfolio(true);
  const eth = useEthPortfolio(true);
  const sol = useSolPortfolio(true);

  const [fromSymbol, setFromSymbol] = useState<'BTC' | 'ETH' | 'SOL'>('ETH');
  const [toSymbol, setToSymbol] = useState<'BTC' | 'ETH' | 'SOL'>('BTC');
  const [amountIn, setAmountIn] = useState('');
  const debouncedAmountIn = useDebounce(amountIn, 600);

  const [quote, setQuote] = useState<LifiQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [setupChain, setSetupChain] = useState<TurnkeyChain | null>(null);
  const [pickerSide, setPickerSide] = useState<'from' | 'to' | null>(null);
  const [statusTx, setStatusTx] = useState<{
    txHash: string;
    fromChainId: number;
    toChainId: number;
    fromSymbol: string;
    toSymbol: string;
  } | null>(null);

  const addresses = useMemo(
    () => ({
      BTC: btc.bitcoinAddress,
      ETH: eth.ethereumAddress,
      SOL: sol.solanaAddress,
    }),
    [btc.bitcoinAddress, eth.ethereumAddress, sol.solanaAddress]
  );

  const tokens = useMemo(
    () => ({ BTC: btc.btcToken, ETH: eth.ethToken, SOL: sol.solToken }),
    [btc.btcToken, eth.ethToken, sol.solToken]
  );

  // Token objects for the picker popup (real balances where available,
  // otherwise a zero-balance placeholder so the asset is still selectable).
  const pickerTokens = useMemo<Token[]>(
    () =>
      ASSETS.map((a) => {
        const tk = tokens[a.symbol];
        if (tk) return tk;
        return {
          symbol: a.symbol,
          contract: `__${a.symbol.toLowerCase()}__`,
          name: a.name,
          issuer: '',
          org: '',
          domain: '',
          icon: a.icon,
          decimals: a.decimals,
          featured: false,
          balance: '0',
          price: '0',
          percentageChange: 0,
        } as Token;
      }),
    [tokens]
  );

  const from = assetBySymbol(fromSymbol);
  const to = assetBySymbol(toSymbol);
  const fromAddress = addresses[fromSymbol];
  const toAddress = addresses[toSymbol];
  const fromBalance = BigNumber(tokens[fromSymbol]?.balance ?? 0);
  const fromPrice = BigNumber(tokens[fromSymbol]?.price ?? 0);
  const toPrice = BigNumber(tokens[toSymbol]?.price ?? 0);

  const amount = BigNumber(amountIn || 0);
  const insufficient = amount.gt(0) && amount.gt(fromBalance);

  // Fetch a quote whenever the pair/amount/addresses are complete.
  // `stale` (not the abort signal) gates state writes, so a superseded request
  // can never leave the spinner stuck — the latest request always settles it.
  useEffect(() => {
    const value = BigNumber(debouncedAmountIn || 0);
    if (!fromAddress || !toAddress || value.lte(0)) {
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
  }, [debouncedAmountIn, fromSymbol, toSymbol, fromAddress, toAddress]);

  const handleFlip = () => {
    setFromSymbol(toSymbol);
    setToSymbol(fromSymbol);
    setAmountIn('');
  };

  const handleSelectFrom = (symbol: 'BTC' | 'ETH' | 'SOL') => {
    if (symbol === toSymbol) setToSymbol(fromSymbol);
    setFromSymbol(symbol);
    setAmountIn('');
  };

  const handleSelectTo = (symbol: 'BTC' | 'ETH' | 'SOL') => {
    if (symbol === fromSymbol) setFromSymbol(toSymbol);
    setToSymbol(symbol);
  };

  const handleMax = () => {
    const max = BigNumber.max(fromBalance.minus(from.feeReserve), 0);
    setAmountIn(max.toFixed(Math.min(from.decimals, 8), BigNumber.ROUND_DOWN));
  };

  const refetchChain = async (chain: TurnkeyChain) => {
    if (chain === 'bitcoin') await btc.refetch();
    else if (chain === 'ethereum') await eth.refetch();
    else if (chain === 'solana') await sol.refetch();
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

      // Record it so the feed shows one "Swap A → B" row (not two legs).
      // Non-blocking: the swap already succeeded regardless of this.
      try {
        const headers = await buildAuthHeaders();
        await fetch('/api/lifi/record', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromSymbol,
            toSymbol,
            amountIn: amount.toFixed(),
            amountOut: (toAmount ?? BigNumber(0)).toFixed(),
            txHash,
          }),
        });
      } catch {
        /* recording is best-effort */
      }

      setStatusTx({
        txHash,
        fromChainId: quote.action.fromChainId,
        toChainId: quote.action.toChainId,
        fromSymbol,
        toSymbol,
      });
      setAmountIn('');
      setQuote(null);
    } catch (err: any) {
      enqueueSnackbar(err?.message ?? t('Swap failed'), { variant: 'error' });
    } finally {
      setExecuting(false);
    }
  };

  // Button state machine — the gates implement lazy wallet setup explicitly
  const buttonState = useMemo((): { label: string; action: (() => void) | null } => {
    if (!user)
      return {
        label: t('Sign in to swap'),
        action: () => window.dispatchEvent(new CustomEvent('nf:open-login')),
      };
    if (!fromAddress)
      return { label: t('Set up {{chain}} wallet', { chain: from.name }), action: () => setSetupChain(from.chain) };
    if (!toAddress)
      return { label: t('Set up {{chain}} wallet', { chain: to.name }), action: () => setSetupChain(to.chain) };
    if (!amountIn || amount.lte(0)) return { label: t('Enter an amount'), action: null };
    if (insufficient) return { label: t('Insufficient {{symbol}} balance', { symbol: fromSymbol }), action: null };
    if (quoteLoading) return { label: t('Fetching quote…'), action: null };
    if (quoteError) return { label: t('Quote unavailable'), action: null };
    if (!quote) return { label: t('Fetching quote…'), action: null };
    if (executing) return { label: t('Confirm in your passkey prompt…'), action: null };
    return { label: t('Swap with passkey'), action: handleExecute };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, fromAddress, toAddress, amountIn, amount, insufficient, quoteLoading, quoteError, quote, executing, fromSymbol, from, to, t]);

  const toAmount = quote ? BigNumber(quote.estimate.toAmount).dividedBy(BigNumber(10).pow(to.decimals)) : null;
  const toAmountMin = quote ? BigNumber(quote.estimate.toAmountMin).dividedBy(BigNumber(10).pow(to.decimals)) : null;
  const rate = quote && amount.gt(0) && toAmount ? toAmount.dividedBy(amount) : null;
  const etaMinutes = quote ? Math.max(1, Math.round(quote.estimate.executionDuration / 60)) : null;

  // Tappable asset chip that opens the shared PickToken popup (same UX as the
  // send modal's asset selector).
  const AssetSelector = ({ symbol, side }: { symbol: 'BTC' | 'ETH' | 'SOL'; side: 'from' | 'to' }) => {
    const asset = assetBySymbol(symbol);
    return (
      <Box
        component="button"
        onClick={() => setPickerSide(side)}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          px: '12px',
          py: '8px',
          borderRadius: '100px',
          bgcolor: '#FFFFFF',
          border: '1px solid rgba(10,10,15,0.08)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'border-color 150ms ease',
          '&:hover': { borderColor: 'rgba(10,10,15,0.24)' },
        }}
      >
        <Box component="img" src={asset.icon} sx={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
        <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#0A0A0F', letterSpacing: '-0.01em' }}>
          {symbol}
        </Typography>
        <Iconify icon="eva:chevron-down-fill" width={18} sx={{ color: 'rgba(10,10,15,0.4)' }} />
      </Box>
    );
  };

  return (
    <Box sx={{ ...CARD_SX, minWidth: 0 }}>
      {/* From */}
      <Box sx={{ p: '16px', borderRadius: '16px', bgcolor: '#FAFAFB', border: '1px solid rgba(10,10,15,0.08)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <Typography sx={{ fontSize: '12px', fontWeight: 500, color: 'rgba(10,10,15,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {t('You pay')}
          </Typography>
          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)' }}>
            {t('Balance:')}{' '}
            <Box component="span" sx={{ color: '#0A0A0F', fontWeight: 600 }}>
              {fromBalance.toFixed(6, BigNumber.ROUND_DOWN)} {fromSymbol}
            </Box>
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <AssetSelector symbol={fromSymbol} side="from" />
          <Box
            component="button"
            onClick={handleMax}
            sx={{
              border: 'none',
              bgcolor: 'rgba(10,10,15,0.06)',
              color: '#0A0A0F',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              px: '8px',
              py: '4px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
            }}
          >
            MAX
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mt: '12px' }}>
          <Box
            component="input"
            type="number"
            value={amountIn}
            placeholder="0"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmountIn(sanitizeAmountInput(e.target.value))}
            onKeyDown={(e: React.KeyboardEvent) => e.key === '-' && e.preventDefault()}
            sx={{
              flex: 1,
              border: 'none',
              outline: 'none',
              bgcolor: 'transparent',
              fontSize: '24px',
              fontWeight: 600,
              color: insufficient ? '#DC2626' : '#0A0A0F',
              letterSpacing: '-0.02em',
              ...MONO,
              width: '100%',
              minWidth: 0,
              '&::placeholder': { color: 'rgba(10,10,15,0.2)' },
              '&::-webkit-inner-spin-button, &::-webkit-outer-spin-button': { appearance: 'none' },
            }}
          />
          <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'rgba(10,10,15,0.45)', flexShrink: 0 }}>
            {fromSymbol}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '12px', color: insufficient ? '#DC2626' : 'rgba(10,10,15,0.45)', mt: '4px' }}>
          {insufficient
            ? t('Exceeds available balance')
            : amount.gt(0) && fromPrice.gt(0)
              ? `≈ ${fCurrency(amount.multipliedBy(fromPrice))}`
              : t('Enter amount above')}
        </Typography>
      </Box>

      {/* Flip */}
      <Box sx={{ display: 'flex', justifyContent: 'center', my: '10px' }}>
        <Box
          component="button"
          onClick={handleFlip}
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            border: '1px solid rgba(10,10,15,0.1)',
            bgcolor: '#FFFFFF',
            color: '#0A0A0F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 150ms ease',
            '&:hover': { bgcolor: '#F4F4F7' },
          }}
        >
          <SwapVertOutlined sx={{ fontSize: 18 }} />
        </Box>
      </Box>

      {/* To */}
      <Box sx={{ p: '16px', borderRadius: '16px', bgcolor: '#FAFAFB', border: '1px solid rgba(10,10,15,0.08)' }}>
        <Typography sx={{ fontSize: '12px', fontWeight: 500, color: 'rgba(10,10,15,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', mb: '12px' }}>
          {t('You receive')}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <AssetSelector symbol={toSymbol} side="to" />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '8px', mt: '12px' }}>
          <Typography sx={{ fontSize: '24px', fontWeight: 600, color: toAmount ? '#0A0A0F' : 'rgba(10,10,15,0.25)', letterSpacing: '-0.02em', ...MONO }}>
            {quoteLoading ? '…' : toAmount ? toAmount.toFixed(6, BigNumber.ROUND_DOWN) : '0'}
          </Typography>
          <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'rgba(10,10,15,0.45)' }}>
            {toSymbol}
          </Typography>
        </Box>
        {toAmount && toPrice.gt(0) && (
          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)', mt: '4px' }}>
            ≈ {fCurrency(toAmount.multipliedBy(toPrice))}
          </Typography>
        )}
      </Box>

      {/* Quote details */}
      {quote && !quoteLoading && (
        <Box sx={{ mt: '12px', p: '12px 14px', borderRadius: '12px', bgcolor: '#FAFAFB', border: '1px solid rgba(10,10,15,0.06)' }}>
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
                <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>{t('Minimum received')}</Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', ...MONO }}>
                  {toAmountMin.toFixed(6, BigNumber.ROUND_DOWN)} {toSymbol}
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>{t('Route')}</Typography>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F' }}>
                {quote.tool}
              </Typography>
            </Box>
            {etaMinutes !== null && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>{t('Estimated time')}</Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F' }}>
                  ~{etaMinutes} {t('min')}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      )}

      {/* Quote error */}
      {quoteError && !quoteLoading && (
        <Box sx={{ mt: '12px', px: '12px', py: '10px', borderRadius: '10px', bgcolor: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)' }}>
          <Typography sx={{ fontSize: '12.5px', color: 'rgba(10,10,15,0.65)', lineHeight: 1.5 }}>
            {quoteError}
          </Typography>
        </Box>
      )}

      {/* CTA */}
      <Button
        fullWidth
        variant="contained"
        size="large"
        disabled={!buttonState.action || executing}
        onClick={() => buttonState.action?.()}
        startIcon={executing ? <CircularProgress size={16} color="inherit" /> : undefined}
        sx={{
          mt: '14px',
          borderRadius: '12px',
          bgcolor: '#0A0A0F',
          fontWeight: 700,
          fontSize: '15px',
          py: '13px',
          textTransform: 'none',
          letterSpacing: '-0.01em',
          '&:hover': { bgcolor: '#1a1a25' },
          '&.Mui-disabled': { bgcolor: 'rgba(10,10,15,0.08)', color: 'rgba(10,10,15,0.3)' },
        }}
      >
        {buttonState.label}
      </Button>

      {/* Destination note */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mt: '12px', justifyContent: 'center' }}>
        <Iconify icon="eva:info-outline" width={13} sx={{ color: 'rgba(10,10,15,0.35)' }} />
        <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)' }}>
          {t('{{symbol}} is delivered to your own Normal wallet address.', { symbol: toSymbol })}
        </Typography>
      </Box>

      <PickToken
        open={pickerSide !== null}
        onClose={() => setPickerSide(null)}
        buttonSource="lifi-swap"
        tokens={pickerTokens}
        onTokenSelect={(tk) => {
          const sym = tk.symbol as 'BTC' | 'ETH' | 'SOL';
          if (pickerSide === 'from') handleSelectFrom(sym);
          else handleSelectTo(sym);
          setPickerSide(null);
        }}
      />

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
          open
          onClose={() => setStatusTx(null)}
          txHash={statusTx.txHash}
          fromChainId={statusTx.fromChainId}
          toChainId={statusTx.toChainId}
          fromSymbol={statusTx.fromSymbol}
          toSymbol={statusTx.toSymbol}
        />
      )}
    </Box>
  );
}
