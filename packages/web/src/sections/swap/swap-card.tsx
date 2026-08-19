'use client';

import type { Token } from '@normalfinance/types';
import type { ChainId } from '@/lib/chains/registry';
import type { TurnkeyChain } from '@/lib/turnkey/add-account';

import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { fCurrency } from '@/utils/format-number';
import { usePendingOutflow } from '@/lib/spendable';
import { usePersistStore } from '@normalfinance/state';
import { probeCompanion } from '@/lib/normal-wallet-setup';
import { useBtcPortfolio } from '@/hooks/use-btc-portfolio';
import { MONO, CARD_SX } from '@/sections/portfolio/_shared';
import { useSendToken } from '@/hooks/stellar/use-send-token';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { spendableXlmForOutflow } from '@/utils/stellar-reserve';
import { useSavingsPosition } from '@/hooks/use-savings-position';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import React, { useRef, useMemo, useState, useCallback } from 'react';
import { getCryptoIconUrl, sanitizeAmountInput } from '@normalfinance/utils';
import { useEthPortfolio, useSolPortfolio } from '@/hooks/use-chain-portfolio';
import { connectedWalletLabel, portfolioAssetToToken } from '@/lib/portfolio/display';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import SwapVertOutlined from '@mui/icons-material/SwapVertOutlined';

import PickToken from '@/components/_common/pick-token';
import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';
import NormalWalletSetupDialog from '@/components/_common/normal-wallet-setup-dialog';

import { useEthGasReserve } from './engines/gas-reserve';
import { CctpRecoveryBanner } from './cctp-resume-banner';
import { useLifiEngine } from './engines/use-lifi-engine';
import { useCctpEngine } from './engines/use-cctp-engine';
import { defaultStellarSource } from './engines/stellar-source';
import { useSoroswapEngine } from './engines/use-soroswap-engine';
import { canPair, pairTypeOf, SWAP_ASSETS, assetBySymbol, counterpartOf } from './engines/types';

import type {
  SwapSymbol,
  StellarSymbol,
  CrosschainSymbol,
  SwapEngineButton,
} from './engines/types';

// ---------------------------------------------------------------------------
// Unified swap card. One asset picker over all five assets; the source's group
// (stellar = XLM/USDC via Soroswap, crosschain = BTC/ETH/SOL via LI.FI) decides
// the engine and constrains the destination picker — the two groups can't be
// paired because no bridge supports the crossing. The shell owns the amount
// input, USD/token toggle, balances, prices and the picker; each engine owns
// its quote, execution, gating and provider-specific dialogs.
// ---------------------------------------------------------------------------

const ZERO = BigNumber(0);

// Which chain's pending outflows affect each swappable asset (#62 spendable).
// Partial on purpose: pivot-only symbols (e.g. USDC_BASE) have no send flows.
const CHAIN_OF_SYMBOL: Partial<Record<SwapSymbol, ChainId>> = {
  XLM: 'stellar',
  USDC: 'stellar',
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
};

export default function SwapCard({ initial }: { initial?: SwapSymbol }) {
  const { t } = useTranslate();
  const { wallet } = usePersistStore();
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
  // #32 chunk 3: guided Normal-wallet setup (external-wallet users, cctp pairs)
  const [setupOpen, setSetupOpen] = useState(false);
  // #32 chunk 4b: which wallet funds a cctp swap (decision: the user picks).
  const [cctpSource, setCctpSource] = useState<'normal' | 'external'>('normal');
  // #32 chunk 4c: where inbound USDC lands (decision: the user picks).
  const [cctpDeliverTo, setCctpDeliverTo] = useState<'normal' | 'external'>('normal');
  // #32 chunk 4f: which wallet a Stellar↔Stellar (Soroswap) swap runs from.
  // null = not picked yet → defaults to the wallet that can pay (pure rule in
  // engines/stellar-source.ts).
  const [stellarSource, setStellarSource] = useState<'normal' | 'external' | null>(null);

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
  // #75 Phase 2: XLM/USDC come from the portfolio AGGREGATE — the last legacy
  // token-store consumer is gone; balances here now update seconds after any
  // transaction like every other surface. Issuer is patched from config (the
  // aggregate mapper is display-oriented and leaves it empty; the 4b funding
  // move sends this token, so it must carry the real issuer).
  const { companionStellar, assets: aggAssets, refreshFresh } = useWalletBalances(true);
  const aggStellarToken = useCallback(
    (sym: 'XLM' | 'USDC'): Token | null => {
      const a = aggAssets?.find((x) => x.symbol === sym && x.chain === 'stellar');
      if (!a) return null;
      const tk = portfolioAssetToToken(a);
      return { ...tk, issuer: sym === 'USDC' ? config.USDC_ISSUER : '' } as Token;
    },
    [aggAssets, config.USDC_ISSUER]
  );
  const xlmToken = aggStellarToken('XLM');
  const usdcToken = aggStellarToken('USDC');
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
  // #62: subtract money committed to in-flight sends/swaps — the displayed
  // balance lags the chain by seconds, and MAX must never offer funds that
  // already left. One subtraction here covers every engine.
  const pendingOutflow = usePendingOutflow(CHAIN_OF_SYMBOL[fromSymbol], fromSymbol);
  // #67: XLM leaving via a swap obeys the same reserve as a send — the network
  // minimum (which swaps previously ignored: a true MAX XLM swap offered the
  // locked reserve and failed on-chain) plus the 1 XLM savings buffer while
  // the user has an active position. Subentries assumed 1 (the USDC trustline
  // — the common case; same assumption as the send adapter). Shared deduped
  // position read; while it loads, only the network reserve applies.
  const { position: savingsPosition, companionPosition } = useSavingsPosition();
  const hasActiveSavings =
    BigNumber(savingsPosition?.currentValue || 0).gt(0) ||
    BigNumber(savingsPosition?.shares || 0).gt(0);
  const grossFromBalance = BigNumber.max(
    BigNumber(fromToken.balance || 0).minus(pendingOutflow),
    0
  );
  // ETH gas reserve lives INSIDE spendable balance (same pattern as the XLM
  // reserve below): typed amounts, MAX, display and validation all inherit
  // it. Before this, a typed amount could pass "amount <= balance" and still
  // fail on-chain with "insufficient funds for gas" (observed live
  // 2026-08-19: 0.00499 of 0.00787 ETH + ~0.0039 gas). Sized live; cctp's
  // ETH leg is a bridge, so it reserves against a larger gas limit.
  // Gas limits from OBSERVED route reality, not protocol minimums: LI.FI's
  // bridge deposits (relaydepository, near) ran ~538k gas live on 2026-08-19
  // — the old 250k assumption under-reserved and MAX still failed on-chain.
  // Over-reserving only shrinks MAX; under-reserving fails swaps.
  const ethReserve = useEthGasReserve(
    fromSymbol === 'ETH',
    pairTypeOf(fromSymbol, toSymbol) === 'cctp' ? 400_000n : 550_000n
  );
  const fromBalance =
    fromSymbol === 'XLM'
      ? BigNumber.max(
          spendableXlmForOutflow(fromToken.balance || 0, 1, hasActiveSavings).minus(pendingOutflow),
          0
        )
      : fromSymbol === 'ETH'
        ? BigNumber.max(grossFromBalance.minus(ethReserve), 0)
        : grossFromBalance;
  // XLM held out of this swap (network reserve + savings buffer) — names the
  // amount when an "insufficient" is really the guard, not a missing balance.
  const xlmHeldBack = fromSymbol === 'XLM' ? grossFromBalance.minus(fromBalance) : ZERO;
  const fromDecimals = assetBySymbol(fromSymbol).decimals;
  const fromLoading = (
    { XLM: false, USDC: false, BTC: btc.loading, ETH: eth.loading, SOL: sol.loading } as Record<
      SwapSymbol,
      boolean
    >
  )[fromSymbol];

  // 'stellar' | 'crosschain' (same-group) or 'cctp' (cross-ecosystem composite).
  const pairType = pairTypeOf(fromSymbol, toSymbol);

  // External Stellar wallets (Freighter/Lobstr/Ledger/WalletConnect) are
  // deliberately Stellar-only. LI.FI and CCTP both need Base/EVM signing, which
  // only the Normal (Turnkey passkey) wallet can do, so those pairs are blocked
  // — computed here, above the engines, so the block reaches both the quote
  // fetch and the CTA.
  //
  // Two reasons this has to be a gate rather than an error at signing time:
  //
  // 1. Without it the engines offer to provision a Turnkey wallet mid-swap
  //    (ChainSetupDialog), which contradicts "external wallets are
  //    Stellar-only" and hands the user a second wallet they never asked for.
  // 2. `action: null` below means no signature ever fires. Outbound CCTP burns
  //    on Stellar FIRST and only then needs the passkey for the Base pivot, so
  //    a half-executed route would strand USDC on Base awaiting recovery.
  //
  // XLM ↔ USDC stays fully enabled. Restores the gate from 3e1ab40, which was
  // lost in the squash that produced PR #466 — see docs/audit/46-external-wallets.md.
  //
  // #32 chunk 4a: the gate now has TWO levels. With NO companion Normal
  // wallet the engines stay fully off (setup dialog owns the CTA — chunk 3).
  // WITH a companion, cross-chain pairs run FOR REAL: the cctp engine's
  // Stellar side is pinned to the companion (never the connected external
  // wallet — no silent cross-wallet fallback), and remaining preflights
  // (trustline, fee-XLM) route back into the setup dialog per-step.
  const isExternalWallet = wallet.walletType != null && wallet.walletType !== 'normal-wallet';
  // (companionStellar + aggregate assets destructured once, above tokenBySymbol)
  const needsNormalWallet = isExternalWallet && pairType !== 'stellar' && !companionStellar;
  // #32 chunk 4c: inbound delivery choice. The external option requires the
  // EXTERNAL wallet's USDC trustline (checked live below; selecting offers a
  // kit-signed changeTrust when missing).
  const showCctpDeliverPicker =
    pairType === 'cctp' && isExternalWallet && !!companionStellar && toSymbol === 'USDC';
  const externalStatus = useAccountStatus(showCctpDeliverPicker ? wallet.address : undefined);
  const deliverToExternal = showCctpDeliverPicker && cctpDeliverTo === 'external';
  // The engine's Stellar side: inbound-with-external-delivery targets the
  // connected wallet's address; every other hybrid case is the companion
  // (burn source outbound / default delivery inbound).
  const cctpStellarAddress = isExternalWallet
    ? deliverToExternal
      ? (wallet.address ?? null)
      : (companionStellar?.address ?? null)
    : undefined;
  const companionUsdcBalance = BigNumber(
    companionStellar?.assets.find((a) => a.symbol === 'USDC')?.balance ?? 0
  );
  // #32 chunk 4b: outbound hybrid swaps let the user PICK the source wallet
  // (doc 72 §4h). Normal wallet (default) = plain passkey swap (S1); the
  // external wallet = inline move-and-swap (S2): one kit-signed transfer to
  // the Normal wallet — named in the CTA and shown in the progress modal —
  // then the swap continues passkey-only. Balance, validation and MAX all
  // follow the SELECTED wallet, so every number is spendable by exactly it.
  const showCctpSourcePicker =
    pairType === 'cctp' && isExternalWallet && !!companionStellar && fromSymbol === 'USDC';
  const cctpSourceActive: 'normal' | 'external' = showCctpSourcePicker ? cctpSource : 'normal';
  const cctpFromBalance = showCctpSourcePicker
    ? cctpSourceActive === 'normal'
      ? companionUsdcBalance
      : grossFromBalance
    : fromBalance;

  // #32 chunk 4f: Stellar↔Stellar swaps get the same wallet choice. Soroswap
  // is ONE transaction from whichever wallet is picked — no funding move, no
  // bridge: Normal wallet → passkey signs, external → kit signs (the useSwap
  // override routes by the tx's source account). Balance, MAX, the #67 XLM
  // reserve and validation all follow the SELECTED wallet.
  const showStellarSourcePicker = pairType === 'stellar' && isExternalWallet && !!companionStellar;
  const companionFromRaw = BigNumber(
    companionStellar?.assets.find((a) => a.symbol === fromSymbol)?.balance ?? 0
  );
  const companionHasActiveSavings =
    BigNumber(companionPosition?.currentValue || 0).gt(0) ||
    BigNumber(companionPosition?.shares || 0).gt(0);
  // The #67 reserve guards whichever wallet's XLM actually leaves — the
  // COMPANION's savings position decides the buffer here, never the slot's.
  // (Pending-outflow subtraction stays slot-scoped, same as chunk 4b's
  // companionUsdcBalance: pending sends are recorded against the slot wallet.)
  const companionSpendableFrom =
    fromSymbol === 'XLM'
      ? BigNumber.max(spendableXlmForOutflow(companionFromRaw, 1, companionHasActiveSavings), 0)
      : companionFromRaw;
  const stellarSourceActive: 'normal' | 'external' = showStellarSourcePicker
    ? (stellarSource ?? defaultStellarSource(companionSpendableFrom, fromBalance))
    : 'external';
  const stellarSwapAddress =
    showStellarSourcePicker && stellarSourceActive === 'normal'
      ? (companionStellar?.address ?? null)
      : null;
  const stellarFromBalance =
    showStellarSourcePicker && stellarSourceActive === 'normal'
      ? companionSpendableFrom
      : fromBalance;

  // `amount` is always the canonical token amount; in fiat mode the typed value
  // is USD, divided by the live price (0 until the price loads).
  const rawInput = BigNumber(amountIn || 0);
  const amount = isFiatMode
    ? fromPrice.gt(0) && rawInput.gt(0)
      ? rawInput.dividedBy(fromPrice)
      : ZERO
    : rawInput;
  const fiatAmount = fromPrice.gt(0) ? amount.multipliedBy(fromPrice) : ZERO;
  // The balance of whichever wallet the ACTIVE pair's swap will spend from —
  // the one number the header, the red states and validation must agree on.
  const activeFromBalance =
    pairType === 'cctp'
      ? cctpFromBalance
      : pairType === 'stellar'
        ? stellarFromBalance
        : fromBalance;
  const insufficient = amount.gt(0) && amount.gt(activeFromBalance);

  const addresses = useMemo(
    () => ({ BTC: btc.bitcoinAddress, ETH: eth.ethereumAddress, SOL: sol.solanaAddress }),
    [btc.bitcoinAddress, eth.ethereumAddress, sol.solanaAddress]
  );
  // #66: refetchBalance, not refetch — refetch reloads Turnkey ADDRESSES,
  // which is what the #62 arrival gate was accidentally awaiting before.
  // refetchBalance is the awaitable, server-cache-bypassing refresh of the
  // shared aggregate, so "Done waits for real balances" is now true.
  //
  // Verify-and-retry (#66 arrival race, observed live 2026-08-13): a refresh
  // fired the instant the bridge reports DONE can read the PRE-delivery
  // balance from the chain RPC — and the aggregate then caches that stale
  // answer for 15s (the bypass floor blocks immediate retries). If the
  // destination balance didn't move, wait just past the floor and refresh
  // ONCE more, so Done displays against the delivered balance everywhere
  // (drawer included — every surface shares this cache). One bounded retry;
  // an unchanged balance after that defers to the background poll.
  const balancesRef = useRef(tokenBySymbol);
  balancesRef.current = tokenBySymbol;
  const refetchChain = useCallback(
    async (chain: TurnkeyChain) => {
      const hook = chain === 'bitcoin' ? btc : chain === 'ethereum' ? eth : sol;
      const symbol = chain === 'bitcoin' ? 'BTC' : chain === 'ethereum' ? 'ETH' : 'SOL';
      const before = balancesRef.current[symbol as SwapSymbol]?.balance;
      const fresh = await hook.refetchBalance();
      const after = fresh?.find((a) => a.symbol === symbol)?.balance;
      if (after !== undefined && after === before) {
        await new Promise((resolve) => setTimeout(resolve, 5_600)); // past the 5s server floor
        await hook.refetchBalance();
      }
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
    fromBalance: pairType === 'stellar' ? stellarFromBalance : ZERO,
    fromPrice: pairType === 'stellar' ? fromPrice : ZERO,
    enabled: pairType === 'stellar',
    resetInput,
    // #32 chunk 4f: Normal-wallet source — build + sign from the companion.
    stellarAddressOverride: pairType === 'stellar' ? stellarSwapAddress : null,
    onNeedsSetup: isExternalWallet ? () => setSetupOpen(true) : undefined,
  });
  const lifi = useLifiEngine({
    fromSymbol: (pairType === 'crosschain' ? fromSymbol : 'ETH') as CrosschainSymbol,
    toSymbol: (pairType === 'crosschain' ? toSymbol : 'BTC') as CrosschainSymbol,
    addresses,
    amount: pairType === 'crosschain' ? amount : ZERO,
    fromBalance: pairType === 'crosschain' ? fromBalance : ZERO,
    fromPrice: pairType === 'crosschain' ? fromPrice : ZERO,
    // Not just `pairType === 'crosschain'`: a hybrid user (external Stellar
    // wallet plus Turnkey chain addresses) would otherwise pass the address
    // checks and burn LI.FI quota on quotes the gate below can never execute.
    enabled: pairType === 'crosschain' && !needsNormalWallet,
    resetInput,
    refetchChain,
  });
  // #32 chunk 4c: selecting external delivery adds the missing USDC
  // trustline on the CONNECTED wallet first (kit signs its own changeTrust).
  const { enqueueSnackbar } = useSnackbar();
  const { addTrustLine, loading: trustlineBusy } = useTrustLine();
  const handleDeliverExternal = useCallback(async () => {
    if (externalStatus.hasUsdcTrustline) {
      setCctpDeliverTo('external');
      return;
    }
    try {
      await addTrustLine('USDC', config.USDC_ISSUER);
      await externalStatus.refetch();
      setCctpDeliverTo('external');
    } catch (e: any) {
      enqueueSnackbar(e?.message || t('Could not add the USDC trustline.'), { variant: 'error' });
    }
  }, [externalStatus, addTrustLine, config.USDC_ISSUER, enqueueSnackbar, t]);

  // #32 chunk 4b: the external-source funding move. `execute` sends the
  // typed USDC to the companion via the connected wallet (kit signs) and
  // resolves only once the moved funds are VISIBLE on the companion — the
  // #62 verify-before-act rule, so the burn can never outrun the transfer.
  const { send: stellarSend } = useSendToken();
  const fundFromExternal = useMemo(
    () =>
      showCctpSourcePicker && cctpSourceActive === 'external' && companionStellar
        ? {
            label: connectedWalletLabel(wallet.walletType),
            execute: async (amountUsdc: string) => {
              const hash = await stellarSend({
                destination: companionStellar.address,
                token: tokenBySymbol.USDC,
                amount: amountUsdc,
              });
              if (!hash) return false;
              for (let i = 0; i < 10; i += 1) {
                try {
                  const probe = await probeCompanion(companionStellar.address, config);
                  if (BigNumber(probe.usdcBalance).gte(amountUsdc)) return true;
                } catch {
                  /* transient Horizon hiccup — retry */
                }
                await new Promise((r) => {
                  setTimeout(r, 3000);
                });
              }
              return false;
            },
          }
        : undefined,
    [
      showCctpSourcePicker,
      cctpSourceActive,
      companionStellar,
      wallet.walletType,
      tokenBySymbol,
      stellarSend,
      config,
    ]
  );

  const cctp = useCctpEngine({
    fromSymbol: pairType === 'cctp' ? fromSymbol : 'ETH',
    toSymbol: pairType === 'cctp' ? toSymbol : 'USDC',
    addresses,
    amount: pairType === 'cctp' ? amount : ZERO,
    fromBalance: pairType === 'cctp' ? cctpFromBalance : ZERO,
    fromPrice: pairType === 'cctp' ? fromPrice : ZERO,
    enabled: pairType === 'cctp' && !needsNormalWallet,
    resetInput,
    refetchChain,
    stellarAddressOverride: cctpStellarAddress,
    refreshAggregate: refreshFresh,
    onNeedsSetup: isExternalWallet ? () => setSetupOpen(true) : undefined,
    fundFromExternal,
  });
  const engine = pairType === 'stellar' ? soroswap : pairType === 'crosschain' ? lifi : cctp;
  const { toAmount, quoteLoading, quoteError } = engine;

  // The gate CTA (#32 chunk 3): instead of a dead button, external-wallet
  // users get the guided Normal-wallet setup. The invariant survives — the
  // action opens a DIALOG, never an engine; the engines themselves stay
  // enabled:false for these pairs until chunk 4 wires them.
  const button: SwapEngineButton = needsNormalWallet
    ? {
        label: t('Continue with your Normal wallet'),
        action: () => setSetupOpen(true),
        loading: false,
        helper: (
          <Typography
            sx={{
              fontSize: '12px',
              color: 'rgba(10,10,15,0.5)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            {t(
              'Cross-chain swaps run through your Normal wallet — a passkey-secured wallet that can hold BTC, ETH and SOL.'
            )}
          </Typography>
        ),
      }
    : engine.button;

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

  // Picker rows show the ACCOUNT-WIDE value for XLM/USDC on hybrid accounts
  // (slot + companion): the picker answers "do I have this asset?", and the
  // wallet pills answer "which wallet pays" AFTER picking. tokenBySymbol
  // itself stays slot-scoped — every engine/balance computation depends on
  // per-wallet numbers (observed live 2026-08-17: picker said XLM $0.31 —
  // the empty-ish Lobstr — while 13 XLM sat in the Normal wallet).
  const pickerToken = useCallback(
    (sym: SwapSymbol): Token => {
      const tk = tokenBySymbol[sym];
      if ((sym !== 'XLM' && sym !== 'USDC') || !companionStellar) return tk;
      const comp = companionStellar.assets.find((a) => a.symbol === sym)?.balance ?? 0;
      if (!BigNumber(comp).gt(0)) return tk;
      return { ...tk, balance: BigNumber(tk.balance).plus(comp).toString() } as Token;
    },
    [tokenBySymbol, companionStellar]
  );
  const fromPickerTokens = useMemo(
    () => SWAP_ASSETS.map((a) => pickerToken(a.symbol)),
    [pickerToken]
  );
  const toPickerTokens = useMemo(
    () =>
      SWAP_ASSETS.filter((a) => a.symbol !== fromSymbol && canPair(fromSymbol, a.symbol)).map((a) =>
        pickerToken(a.symbol)
      ),
    [pickerToken, fromSymbol]
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
        <Typography
          sx={{ fontSize: '14px', fontWeight: 700, color: '#0A0A0F', letterSpacing: '-0.01em' }}
        >
          {sym}
        </Typography>
        <Iconify icon="eva:chevron-down-fill" width={18} sx={{ color: 'rgba(10,10,15,0.4)' }} />
      </Box>
    );
  };

  return (
    <Box sx={{ minWidth: 0 }}>
      <CctpRecoveryBanner addresses={addresses} />
      <Box sx={{ ...CARD_SX, minWidth: 0 }}>
        {/* From */}
        <Box
          sx={{
            p: '16px',
            borderRadius: '16px',
            bgcolor: '#FAFAFB',
            border: '1px solid rgba(10,10,15,0.08)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: '12px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <Typography
              sx={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'rgba(10,10,15,0.45)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {t('You pay')}
            </Typography>
            <Typography
              component="div"
              sx={{
                fontSize: '12px',
                color: 'rgba(10,10,15,0.45)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {t('Balance:')}
              {fromLoading ? (
                <Skeleton variant="text" width={64} sx={{ fontSize: '12px' }} />
              ) : (
                <Box component="span" sx={{ color: '#0A0A0F', fontWeight: 600 }}>
                  {isFiatMode && fromPrice.gt(0)
                    ? fCurrency(activeFromBalance.multipliedBy(fromPrice))
                    : `${activeFromBalance.toFixed(6, BigNumber.ROUND_DOWN)} ${fromSymbol}`}
                </Box>
              )}
              {/* #32 chunk 4a/4b/4f: name the wallet this number belongs to —
                  the swap spends exactly the SELECTED wallet's balance. */}
              {(showCctpSourcePicker || showStellarSourcePicker) && (
                <Box component="span" sx={{ color: 'rgba(10,10,15,0.4)' }}>
                  {(pairType === 'cctp' ? cctpSourceActive : stellarSourceActive) === 'normal'
                    ? t('· Normal wallet')
                    : `· ${connectedWalletLabel(wallet.walletType)}`}
                </Box>
              )}
            </Typography>
          </Box>

          {/* #32 chunk 4b/4f: pick the wallet this swap runs from. CCTP
              external source = the CTA and progress modal show the move
              explicitly; Stellar pairs swap directly from the picked wallet
              (Normal → passkey, external → its own kit prompt). */}
          {(showCctpSourcePicker || showStellarSourcePicker) && (
            <Box sx={{ display: 'flex', gap: '6px', mb: '10px', flexWrap: 'wrap' }}>
              {(
                [
                  {
                    key: 'normal',
                    label: t('Normal wallet'),
                    bal: pairType === 'cctp' ? companionUsdcBalance : companionSpendableFrom,
                  },
                  {
                    key: 'external',
                    label: connectedWalletLabel(wallet.walletType),
                    bal: pairType === 'cctp' ? grossFromBalance : fromBalance,
                  },
                ] as const
              ).map((opt) => {
                const selected =
                  (pairType === 'cctp' ? cctpSourceActive : stellarSourceActive) === opt.key;
                return (
                  <Box
                    key={opt.key}
                    component="button"
                    onClick={() =>
                      pairType === 'cctp' ? setCctpSource(opt.key) : setStellarSource(opt.key)
                    }
                    sx={{
                      appearance: 'none',
                      border: selected
                        ? '1px solid rgba(10,10,15,0.9)'
                        : '1px solid rgba(10,10,15,0.12)',
                      borderRadius: '999px',
                      px: '11px',
                      py: '5px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      bgcolor: selected ? '#0A0A0F' : 'transparent',
                      color: selected ? '#fff' : '#6B6B76',
                      transition: 'all .15s ease',
                      '&:hover': selected ? {} : { borderColor: 'rgba(10,10,15,0.3)' },
                    }}
                  >
                    {`${opt.label} · ${opt.bal.toFixed(2, BigNumber.ROUND_DOWN)}`}
                  </Box>
                );
              })}
            </Box>
          )}

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
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
              <Typography
                sx={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: insufficient ? '#DC2626' : 'rgba(10,10,15,0.35)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  ...MONO,
                }}
              >
                $
              </Typography>
            )}
            <Box
              component="input"
              type="number"
              value={amountIn}
              placeholder="0"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAmountIn(sanitizeAmountInput(e.target.value))
              }
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
                '&::-webkit-inner-spin-button, &::-webkit-outer-spin-button': {
                  appearance: 'none',
                },
              }}
            />
            {!isFiatMode && (
              <Typography
                sx={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'rgba(10,10,15,0.45)',
                  flexShrink: 0,
                }}
              >
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
          <Typography
            sx={{
              fontSize: '12px',
              color: insufficient ? '#DC2626' : 'rgba(10,10,15,0.45)',
              mt: '4px',
            }}
          >
            {insufficient
              ? fromSymbol === 'XLM' && amount.lte(grossFromBalance) && xlmHeldBack.gt(0)
                ? hasActiveSavings
                  ? t('Keeps {{n}} XLM for network & savings fees', {
                      n: xlmHeldBack.toFixed(1),
                    })
                  : t('Keeps {{n}} XLM network reserve', { n: xlmHeldBack.toFixed(1) })
                : t('Exceeds available balance')
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
        <Box
          sx={{
            p: '16px',
            borderRadius: '16px',
            bgcolor: '#FAFAFB',
            border: '1px solid rgba(10,10,15,0.08)',
          }}
        >
          <Typography
            sx={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'rgba(10,10,15,0.45)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              mb: '12px',
            }}
          >
            {t('You receive')}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <AssetSelector side="to" />
          </Box>

          {/* #32 chunk 4c: where the swapped USDC lands — the user picks.
              External delivery needs the connected wallet's USDC trustline;
              picking it offers the kit-signed add when missing. */}
          {showCctpDeliverPicker && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                mt: '10px',
                flexWrap: 'wrap',
              }}
            >
              <Typography sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.45)' }}>
                {t('Deliver to:')}
              </Typography>
              {(
                [
                  {
                    key: 'normal',
                    label: t('Normal wallet'),
                    onPick: () => setCctpDeliverTo('normal'),
                  },
                  {
                    key: 'external',
                    label: externalStatus.hasUsdcTrustline
                      ? connectedWalletLabel(wallet.walletType)
                      : `${connectedWalletLabel(wallet.walletType)} · ${t('add trustline')}`,
                    onPick: handleDeliverExternal,
                  },
                ] as const
              ).map((opt) => {
                const selected = cctpDeliverTo === opt.key;
                return (
                  <Box
                    key={opt.key}
                    component="button"
                    onClick={opt.onPick}
                    disabled={trustlineBusy}
                    sx={{
                      appearance: 'none',
                      border: selected
                        ? '1px solid rgba(10,10,15,0.9)'
                        : '1px solid rgba(10,10,15,0.12)',
                      borderRadius: '999px',
                      px: '11px',
                      py: '5px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      cursor: trustlineBusy ? 'wait' : 'pointer',
                      bgcolor: selected ? '#0A0A0F' : 'transparent',
                      color: selected ? '#fff' : '#6B6B76',
                      transition: 'all .15s ease',
                      '&:hover': selected ? {} : { borderColor: 'rgba(10,10,15,0.3)' },
                    }}
                  >
                    {opt.label}
                  </Box>
                );
              })}
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '8px', mt: '12px' }}>
            {quoteLoading ? (
              <Skeleton variant="text" width={150} sx={{ fontSize: '24px', borderRadius: '6px' }} />
            ) : (
              <Typography
                sx={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: toAmount ? '#0A0A0F' : 'rgba(10,10,15,0.25)',
                  letterSpacing: '-0.02em',
                  ...MONO,
                }}
              >
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
            toAmount &&
            toPrice.gt(0) && (
              <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)', mt: '4px' }}>
                ≈ {fCurrency(toAmount.multipliedBy(toPrice))}
              </Typography>
            )
          )}
        </Box>

        {/* Quote details */}
        {engine.details && !quoteLoading && (
          <Box
            sx={{
              mt: '12px',
              p: '12px 14px',
              borderRadius: '12px',
              bgcolor: '#FAFAFB',
              border: '1px solid rgba(10,10,15,0.06)',
            }}
          >
            {engine.details}
          </Box>
        )}

        {/* Quote error */}
        {quoteError && !quoteLoading && (
          <Box
            sx={{
              mt: '12px',
              px: '12px',
              py: '10px',
              borderRadius: '10px',
              bgcolor: 'rgba(220,38,38,0.05)',
              border: '1px solid rgba(220,38,38,0.15)',
            }}
          >
            <Typography sx={{ fontSize: '12.5px', color: 'rgba(10,10,15,0.65)', lineHeight: 1.5 }}>
              {quoteError}
            </Typography>
          </Box>
        )}

        {/* Gating notice (trustline / activation / external-wallet block) */}
        {button.helper && <Box sx={{ mt: '14px' }}>{button.helper}</Box>}

        {/* CTA — `button`, never `engine.button`: the external-wallet gate above
          overrides the engine's own state machine and must win. */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          disabled={!button.action || button.loading}
          onClick={() => button.action?.()}
          startIcon={button.loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{
            mt: button.helper ? '10px' : '14px',
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
          {button.label}
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

        {/* #32 chunk 3: guided Normal-wallet setup for external-wallet users */}
        <NormalWalletSetupDialog
          open={setupOpen}
          onClose={() => setSetupOpen(false)}
          neededUsdc={pairType === 'cctp' && fromSymbol === 'USDC' ? amount.toNumber() : 0}
        />
      </Box>
    </Box>
  );
}
