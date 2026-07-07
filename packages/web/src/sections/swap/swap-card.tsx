'use client';

import type { Token } from '@normalfinance/types';
import type { TurnkeyChain } from '@/lib/turnkey/add-account';

import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { fCurrency } from '@/utils/format-number';
import { usePersistStore } from '@normalfinance/state';
import { useBtcPortfolio } from '@/hooks/use-btc-portfolio';
import { MONO, CARD_SX } from '@/sections/portfolio/_shared';
import React, { useMemo, useState, useCallback } from 'react';
import { getXlmToken, getSwapUsdcToken } from '@/utils/token-selectors';
import { getCryptoIconUrl, sanitizeAmountInput } from '@normalfinance/utils';
import { useEthPortfolio, useSolPortfolio } from '@/hooks/use-chain-portfolio';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import SwapVertOutlined from '@mui/icons-material/SwapVertOutlined';

import PickToken from '@/components/_common/pick-token';
import { Iconify } from '@/components/template/iconify';

import { CctpResumeBanner } from './cctp-resume-banner';
import { useLifiEngine } from './engines/use-lifi-engine';
import { useCctpEngine } from './engines/use-cctp-engine';
import { useSoroswapEngine } from './engines/use-soroswap-engine';
import { canPair, pairTypeOf, SWAP_ASSETS, assetBySymbol, counterpartOf } from './engines/types';

import type { SwapSymbol, StellarSymbol, CrosschainSymbol } from './engines/types';

// ---------------------------------------------------------------------------
// Unified swap card. One asset picker over all five assets; the source's group
// (stellar = XLM/USDC via Soroswap, crosschain = BTC/ETH/SOL via LI.FI) decides
// the engine and constrains the destination picker — the two groups can't be
// paired because no bridge supports the crossing. The shell owns the amount
// input, USD/token toggle, balances, prices and the picker; each engine owns
// its quote, execution, gating and provider-specific dialogs.
// ---------------------------------------------------------------------------

const ZERO = BigNumber(0);

export default function SwapCard({ initial }: { initial?: SwapSymbol }) {
  const { t } = useTranslate();
  const { tokenState } = usePersistStore();
  const config = useStellarConfig();
  const btc = useBtcPortfolio(true);
  const eth = useEthPortfolio(true);
  const sol = useSolPortfolio(true);

  const initialFrom: SwapSymbol = initial ?? 'XLM';
  const [fromSymbol, setFromSymbol] = useState<SwapSymbol>(initialFrom);
  const [toSymbol, setToSymbol] = useState<SwapSymbol>(counterpartOf(initialFrom));
  const [amountIn, setAmountIn] = useState('');
  const [isFiatMode, setIsFiatMode] = useState(false);
  const [pickerSide, setPickerSide] = useState<'from' | 'to' | null>(null);

  // Zero-balance stand-in so an asset stays selectable before its balance loads.
  const placeholder = useCallback((symbol: SwapSymbol): Token => {
    const a = assetBySymbol(symbol);
    return {
      symbol,
      contract: `__${symbol.toLowerCase()}__`,
      name: a.name,
      issuer: '',
      org: '',
      domain: '',
      icon: getCryptoIconUrl(symbol),
      decimals: a.decimals,
      featured: false,
      balance: '0',
      price: '0',
      percentageChange: 0,
    } as Token;
  }, []);

  // Single source of truth for balances / prices / icons across both engines.
  const xlmToken = getXlmToken(tokenState.tokens);
  const usdcToken = getSwapUsdcToken(tokenState.tokens, config);
  const tokenBySymbol = useMemo(
    () =>
      ({
        XLM: xlmToken ?? placeholder('XLM'),
        USDC: usdcToken ?? placeholder('USDC'),
        BTC: btc.btcToken ?? placeholder('BTC'),
        ETH: eth.ethToken ?? placeholder('ETH'),
        SOL: sol.solToken ?? placeholder('SOL'),
      }) as Record<SwapSymbol, Token>,
    [xlmToken, usdcToken, btc.btcToken, eth.ethToken, sol.solToken, placeholder]
  );

  const fromToken = tokenBySymbol[fromSymbol];
  const toToken = tokenBySymbol[toSymbol];
  const fromPrice = BigNumber(fromToken.price || 0);
  const toPrice = BigNumber(toToken.price || 0);
  const fromBalance = BigNumber(fromToken.balance || 0);
  const fromDecimals = assetBySymbol(fromSymbol).decimals;
  const fromLoading = (
    { XLM: false, USDC: false, BTC: btc.loading, ETH: eth.loading, SOL: sol.loading } as Record<
      SwapSymbol,
      boolean
    >
  )[fromSymbol];

  // 'stellar' | 'crosschain' (same-group) or 'cctp' (cross-ecosystem composite).
  const pairType = pairTypeOf(fromSymbol, toSymbol);

  // `amount` is always the canonical token amount; in fiat mode the typed value
  // is USD, divided by the live price (0 until the price loads).
  const rawInput = BigNumber(amountIn || 0);
  const amount = isFiatMode
    ? fromPrice.gt(0) && rawInput.gt(0)
      ? rawInput.dividedBy(fromPrice)
      : ZERO
    : rawInput;
  const fiatAmount = fromPrice.gt(0) ? amount.multipliedBy(fromPrice) : ZERO;
  const insufficient = amount.gt(0) && amount.gt(fromBalance);

  const addresses = useMemo(
    () => ({ BTC: btc.bitcoinAddress, ETH: eth.ethereumAddress, SOL: sol.solanaAddress }),
    [btc.bitcoinAddress, eth.ethereumAddress, sol.solanaAddress]
  );
  const refetchChain = useCallback(
    async (chain: TurnkeyChain) => {
      if (chain === 'bitcoin') await btc.refetch();
      else if (chain === 'ethereum') await eth.refetch();
      else if (chain === 'solana') await sol.refetch();
    },
    [btc, eth, sol]
  );
  const resetInput = useCallback(() => setAmountIn(''), []);

  // All engines are always mounted (React hook rules); only the active one is
  // fed the live amount, so the others never fetch a quote.
  const soroswap = useSoroswapEngine({
    fromSymbol: (pairType === 'stellar' ? fromSymbol : 'XLM') as StellarSymbol,
    toSymbol: (pairType === 'stellar' ? toSymbol : 'USDC') as StellarSymbol,
    amount: pairType === 'stellar' ? amount : ZERO,
    fromBalance: pairType === 'stellar' ? fromBalance : ZERO,
    fromPrice: pairType === 'stellar' ? fromPrice : ZERO,
    enabled: pairType === 'stellar',
    resetInput,
  });
  const lifi = useLifiEngine({
    fromSymbol: (pairType === 'crosschain' ? fromSymbol : 'ETH') as CrosschainSymbol,
    toSymbol: (pairType === 'crosschain' ? toSymbol : 'BTC') as CrosschainSymbol,
    addresses,
    amount: pairType === 'crosschain' ? amount : ZERO,
    fromBalance: pairType === 'crosschain' ? fromBalance : ZERO,
    fromPrice: pairType === 'crosschain' ? fromPrice : ZERO,
    enabled: pairType === 'crosschain',
    resetInput,
    refetchChain,
  });
  const cctp = useCctpEngine({
    fromSymbol: pairType === 'cctp' ? fromSymbol : 'ETH',
    toSymbol: pairType === 'cctp' ? toSymbol : 'USDC',
    addresses,
    amount: pairType === 'cctp' ? amount : ZERO,
    fromBalance: pairType === 'cctp' ? fromBalance : ZERO,
    fromPrice: pairType === 'cctp' ? fromPrice : ZERO,
    enabled: pairType === 'cctp',
    resetInput,
  });
  const engine = pairType === 'stellar' ? soroswap : pairType === 'crosschain' ? lifi : cctp;
  const { toAmount, quoteLoading, quoteError } = engine;

  // --- selection (destination constrained to pairable assets) ---
  const selectFrom = (sym: SwapSymbol) => {
    if (sym === fromSymbol) return;
    if (!canPair(sym, toSymbol) || sym === toSymbol) {
      setToSymbol(sym === toSymbol ? fromSymbol : counterpartOf(sym));
    }
    setFromSymbol(sym);
    setAmountIn('');
  };
  const selectTo = (sym: SwapSymbol) => {
    if (sym === toSymbol) return;
    if (sym === fromSymbol) setFromSymbol(toSymbol); // picker is pair-filtered, so swap is safe
    setToSymbol(sym);
  };
  const handleFlip = () => {
    // Cross-ecosystem pairs only run inbound (crosschain → stellar) for now.
    if (!canPair(toSymbol, fromSymbol)) return;
    setFromSymbol(toSymbol);
    setToSymbol(fromSymbol);
    setAmountIn('');
  };

  const handleMax = async () => {
    const maxToken = await engine.getMaxToken();
    if (isFiatMode && fromPrice.gt(0)) {
      setAmountIn(maxToken.multipliedBy(fromPrice).toFixed(2, BigNumber.ROUND_DOWN));
    } else {
      setAmountIn(maxToken.toFixed(Math.min(fromDecimals, 8), BigNumber.ROUND_DOWN));
    }
  };

  // Flip the input between token units and USD, rewriting the typed value so the
  // underlying token amount (and any in-flight quote) stays the same.
  const toggleMode = () => {
    if (!amountIn || amount.lte(0) || fromPrice.lte(0)) {
      setIsFiatMode((p) => !p);
      return;
    }
    if (isFiatMode) setAmountIn(amount.toFixed(Math.min(fromDecimals, 8), BigNumber.ROUND_DOWN));
    else setAmountIn(fiatAmount.toFixed(2));
    setIsFiatMode((p) => !p);
  };

  const fromPickerTokens = useMemo(
    () => SWAP_ASSETS.map((a) => tokenBySymbol[a.symbol]),
    [tokenBySymbol]
  );
  const toPickerTokens = useMemo(
    () =>
      SWAP_ASSETS.filter((a) => a.symbol !== fromSymbol && canPair(fromSymbol, a.symbol)).map(
        (a) => tokenBySymbol[a.symbol]
      ),
    [tokenBySymbol, fromSymbol]
  );

  const AssetSelector = ({ side }: { side: 'from' | 'to' }) => {
    const sym = side === 'from' ? fromSymbol : toSymbol;
    const tk = tokenBySymbol[sym];
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
        <Box
          component="img"
          src={tk.icon ?? getCryptoIconUrl(sym)}
          sx={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }}
        />
        <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#0A0A0F', letterSpacing: '-0.01em' }}>
          {sym}
        </Typography>
        <Iconify icon="eva:chevron-down-fill" width={18} sx={{ color: 'rgba(10,10,15,0.4)' }} />
      </Box>
    );
  };

  return (
    <Box sx={{ minWidth: 0 }}>
      <CctpResumeBanner />
      <Box sx={{ ...CARD_SX, minWidth: 0 }}>
      {/* From */}
      <Box sx={{ p: '16px', borderRadius: '16px', bgcolor: '#FAFAFB', border: '1px solid rgba(10,10,15,0.08)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <Typography sx={{ fontSize: '12px', fontWeight: 500, color: 'rgba(10,10,15,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {t('You pay')}
          </Typography>
          <Typography component="div" sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {t('Balance:')}
            {fromLoading ? (
              <Skeleton variant="text" width={64} sx={{ fontSize: '12px' }} />
            ) : (
              <Box component="span" sx={{ color: '#0A0A0F', fontWeight: 600 }}>
                {isFiatMode && fromPrice.gt(0)
                  ? fCurrency(fromBalance.multipliedBy(fromPrice))
                  : `${fromBalance.toFixed(6, BigNumber.ROUND_DOWN)} ${fromSymbol}`}
              </Box>
            )}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <AssetSelector side="from" />
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
          {isFiatMode && (
            <Typography sx={{ fontSize: '24px', fontWeight: 600, color: insufficient ? '#DC2626' : 'rgba(10,10,15,0.35)', letterSpacing: '-0.02em', lineHeight: 1, ...MONO }}>
              $
            </Typography>
          )}
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
          {!isFiatMode && (
            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'rgba(10,10,15,0.45)', flexShrink: 0 }}>
              {fromSymbol}
            </Typography>
          )}
          <Tooltip title={t('Toggle USD / crypto')}>
            <Box
              component="button"
              onClick={toggleMode}
              sx={{
                width: 28,
                height: 28,
                border: 'none',
                bgcolor: 'rgba(10,10,15,0.06)',
                color: '#0A0A0F',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                fontFamily: 'inherit',
                '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
              }}
            >
              <Iconify icon="solar:transfer-vertical-bold-duotone" width={16} />
            </Box>
          </Tooltip>
        </Box>
        <Typography sx={{ fontSize: '12px', color: insufficient ? '#DC2626' : 'rgba(10,10,15,0.45)', mt: '4px' }}>
          {insufficient
            ? t('Exceeds available balance')
            : amount.gt(0) && fromPrice.gt(0)
              ? isFiatMode
                ? `≈ ${amount.toFixed(Math.min(fromDecimals, 6), BigNumber.ROUND_DOWN)} ${fromSymbol}`
                : `≈ ${fCurrency(fiatAmount)}`
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
          <AssetSelector side="to" />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '8px', mt: '12px' }}>
          {quoteLoading ? (
            <Skeleton variant="text" width={150} sx={{ fontSize: '24px', borderRadius: '6px' }} />
          ) : (
            <Typography sx={{ fontSize: '24px', fontWeight: 600, color: toAmount ? '#0A0A0F' : 'rgba(10,10,15,0.25)', letterSpacing: '-0.02em', ...MONO }}>
              {toAmount ? toAmount.toFixed(6, BigNumber.ROUND_DOWN) : '0'}
            </Typography>
          )}
          <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'rgba(10,10,15,0.45)' }}>
            {toSymbol}
          </Typography>
        </Box>
        {quoteLoading ? (
          <Skeleton variant="text" width={70} sx={{ fontSize: '12px', mt: '4px' }} />
        ) : (
          toAmount && toPrice.gt(0) && (
            <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)', mt: '4px' }}>
              ≈ {fCurrency(toAmount.multipliedBy(toPrice))}
            </Typography>
          )
        )}
      </Box>

      {/* Quote details */}
      {engine.details && !quoteLoading && (
        <Box sx={{ mt: '12px', p: '12px 14px', borderRadius: '12px', bgcolor: '#FAFAFB', border: '1px solid rgba(10,10,15,0.06)' }}>
          {engine.details}
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

      {/* Gating notice (trustline / activation) */}
      {engine.button.helper && <Box sx={{ mt: '14px' }}>{engine.button.helper}</Box>}

      {/* CTA */}
      <Button
        fullWidth
        variant="contained"
        size="large"
        disabled={!engine.button.action || engine.button.loading}
        onClick={() => engine.button.action?.()}
        startIcon={engine.button.loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        sx={{
          mt: engine.button.helper ? '10px' : '14px',
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
        {engine.button.label}
      </Button>

      {engine.footer}

      <PickToken
        open={pickerSide !== null}
        onClose={() => setPickerSide(null)}
        buttonSource="unified-swap"
        tokens={pickerSide === 'to' ? toPickerTokens : fromPickerTokens}
        onTokenSelect={(tk) => {
          const sym = tk.symbol as SwapSymbol;
          if (pickerSide === 'from') selectFrom(sym);
          else selectTo(sym);
          setPickerSide(null);
        }}
      />

      {engine.modals}
      </Box>
    </Box>
  );
}
