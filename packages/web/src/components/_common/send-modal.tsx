'use client';

import type { Token } from '@normalfinance/types';
import type { MemoRequirement } from '@/lib/stellar/memo-required';

import { useSnackbar } from 'notistack';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { Horizon } from '@stellar/stellar-sdk';
import { fCurrency } from '@/utils/format-number';
import { usePendingOutflow } from '@/lib/spendable';
import { usePersistStore } from '@normalfinance/state';
import { useBtcPortfolio } from '@/hooks/use-btc-portfolio';
import { useStellarTokens } from '@/hooks/use-stellar-tokens';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { buildStellarWalletOptions } from '@/lib/wallet-options';
import { useSavingsPosition } from '@/hooks/use-savings-position';
import { buildOwnWalletCandidates } from '@/lib/stellar/own-wallets';
import { useEthPortfolio, useSolPortfolio } from '@/hooks/use-chain-portfolio';
import { getLinkedWallets, type LinkedWallet } from '@/services/linked-wallets';
import { useSendToken, type TransferArgs } from '@/hooks/stellar/use-send-token';
import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { SAVINGS_XLM_BUFFER, spendableXlmForOutflow } from '@/utils/stellar-reserve';
import { connectedWalletLabel, portfolioAssetToToken } from '@/lib/portfolio/display';
import { knownMemoRequirement, fetchMemoRequirement } from '@/lib/stellar/memo-required';
import { getMaxAmount, getCryptoIconUrl, sanitizeAmountInput } from '@normalfinance/utils';

import {
  Box,
  Stack,
  Button,
  Dialog,
  Tooltip,
  Typography,
  DialogTitle,
  DialogContent,
} from '@mui/material';

import WalletChoice from '@/components/_common/wallet-choice';

import PickToken from './pick-token';
import SendReview from './send-review';
import { Iconify } from '../template/iconify';
import OwnWalletChips from './own-wallet-chips';
import PasteIconButton from '../paste-icon-button';
import { BtcTxStatusModal } from './btc-tx-status-modal';
import { createSolanaAdapter } from './send-adapters/solana';
import { createStellarAdapter } from './send-adapters/stellar';
import { createBitcoinAdapter } from './send-adapters/bitcoin';
import { NetworkBadge, getAssetNetwork } from './network-badge';
import { createEthereumAdapter } from './send-adapters/ethereum';

import type { SendAdapter } from './send-adapters';

// ----------------------------------------------------------------------

interface SendModalProps {
  open: boolean;
  onClose: () => void;
  /** Preselect this asset on open (e.g. from the asset detail page). */
  initialSymbol?: string;
}

export default function SendModal({ open, onClose, initialSymbol }: SendModalProps) {
  const { t } = useTranslate('auto');
  const { enqueueSnackbar } = useSnackbar();

  const persist = usePersistStore();
  const config = useStellarConfig();
  const tokens = useStellarTokens(open);

  const { send: stellarSend } = useSendToken();
  const { btcToken, bitcoinAddress } = useBtcPortfolio(open);
  const { ethToken, ethereumAddress } = useEthPortfolio(open);
  const { solToken, solanaAddress } = useSolPortfolio(open);

  // #67: an active savings position holds SAVINGS_XLM_BUFFER back from every
  // XLM outflow (MAX and typed). Shared deduped read, fetched only while the
  // dialog is open; localStorage fallback answers instantly on reopen.
  const { position: savingsPosition, companionPosition } = useSavingsPosition(open);
  const hasActiveSavings =
    BigNumber(savingsPosition?.currentValue || 0).gt(0) ||
    BigNumber(savingsPosition?.shares || 0).gt(0);
  const savingsPositionKnown = savingsPosition != null;
  const companionHasActiveSavings =
    BigNumber(companionPosition?.currentValue || 0).gt(0) ||
    BigNumber(companionPosition?.shares || 0).gt(0);
  const companionSavingsKnown = companionPosition != null;

  // #74c: with an external wallet connected, the companion Normal wallet's
  // XLM/USDC are SENDABLE — built for and signed by the companion (passkey)
  // via the sourceAddress override, never the connected wallet. Marked with a
  // __companion_*__ contract so the two wallets' same-symbol tokens stay
  // distinct rows, and named so the picker says whose money it is.
  const isExternalSlot =
    persist.wallet.walletType != null && persist.wallet.walletType !== 'normal-wallet';
  const { companionStellar, assets: aggregateAssets } = useWalletBalances(open);
  const companionSendable = useMemo(() => {
    if (!isExternalSlot || !companionStellar) return [] as Token[];
    return companionStellar.assets
      .filter((a) => (a.symbol === 'XLM' || a.symbol === 'USDC') && BigNumber(a.balance ?? 0).gt(0))
      .map((a) => {
        const tk = portfolioAssetToToken(a);
        return {
          ...tk,
          contract: `__companion_${tk.symbol.toLowerCase()}__`,
          name: `${tk.name} · Normal wallet`,
          // portfolioAssetToToken is display-oriented and leaves issuer empty;
          // a SEND builds the asset from it, so set the real issuer here.
          issuer: tk.symbol === 'USDC' ? config.USDC_ISSUER : '',
        } as Token;
      });
  }, [isExternalSlot, companionStellar, config.USDC_ISSUER]);

  // Build the full sendable list: Stellar tokens + native chains with balance.
  // #75: the SLOT wallet's Stellar assets come from the portfolio AGGREGATE —
  // the same source as every display surface, refreshed on every activity
  // event. The legacy token store only refreshes on certain mounts, so it
  // still said "empty" after the just-sent activation XLM landed (observed
  // live 2026-08-17: freshly activated Lobstr unselectable in Send).
  const sendableTokens = useMemo(() => {
    const hybrid = isExternalSlot && !!companionStellar;
    const stellar = aggregateAssets
      .filter((a) => a.chain === 'stellar' && BigNumber(a.balance ?? 0).gt(0))
      .map((a) => {
        const tk = portfolioAssetToToken(a);
        return {
          ...tk,
          issuer: tk.symbol === 'USDC' ? config.USDC_ISSUER : '',
          name: hybrid
            ? `${tk.name} · ${connectedWalletLabel(persist.wallet.walletType)}`
            : tk.name,
        } as Token;
      });
    const natives = [btcToken, ethToken, solToken].filter(
      (tkn): tkn is Token => !!tkn && BigNumber(tkn.balance).gt(0)
    );
    return [...stellar, ...companionSendable, ...natives];
  }, [
    aggregateAssets,
    isExternalSlot,
    companionStellar,
    config.USDC_ISSUER,
    persist.wallet.walletType,
    companionSendable,
    btcToken,
    ethToken,
    solToken,
  ]);

  // ONE picker row per Stellar asset (Niko 2026-08-25 — same rule as the
  // assets page). DISPLAY-ONLY merge: sendToken always stays a REAL
  // per-wallet token, because the __companion_*__ contract is what routes
  // signing, reserves, savings buffers and MAX. The combined row resolves
  // back to those same objects on selection, and the source tabs below swap
  // between them. Natives and single-wallet accounts pass through untouched.
  const pickerTokens = useMemo(() => {
    if (!(isExternalSlot && companionStellar)) return sendableTokens;
    const fmtBal = (n: number) =>
      n.toLocaleString('en-US', { maximumFractionDigits: n < 1 ? 4 : 2 });
    const out: Token[] = [];
    const seen = new Set<string>();
    for (const tk of sendableTokens) {
      const isCompanion = tk.contract.startsWith('__companion_');
      if (tk.contract.startsWith('__') && !isCompanion) {
        out.push(tk); // native chains: one wallet, nothing to combine
        continue;
      }
      if (seen.has(tk.symbol)) continue;
      seen.add(tk.symbol);
      const slotTk = sendableTokens.find(
        (o) => o.symbol === tk.symbol && !o.contract.startsWith('__')
      );
      const compTk = sendableTokens.find(
        (o) => o.symbol === tk.symbol && o.contract.startsWith('__companion_')
      );
      if (slotTk && compTk) {
        const slotBal = Number(slotTk.balance);
        const compBal = Number(compTk.balance);
        out.push({
          ...slotTk,
          balance: BigNumber(slotBal).plus(compBal).toString(),
          name: `${slotTk.name.split(' · ')[0]} · Normal wallet ${fmtBal(compBal)} · ${connectedWalletLabel(persist.wallet.walletType)} ${fmtBal(slotBal)}`,
        } as Token);
      } else {
        out.push(tk);
      }
    }
    return out;
  }, [sendableTokens, isExternalSlot, companionStellar, persist.wallet.walletType]);

  const xlmPrice = useMemo(
    () =>
      BigNumber(
        tokens.find((tok) => tok.symbol === 'XLM')?.price ??
          aggregateAssets.find((a) => a.symbol === 'XLM')?.price ??
          0
      ).toNumber(),
    [tokens, aggregateAssets]
  );

  const [sendToken, setSendToken] = useState<Token | null>(null);
  const [destination, setDestination] = useState('');
  const [memo, setMemo] = useState('');
  const [amount, setAmount] = useState('');
  const [isFiatMode, setIsFiatMode] = useState(false);
  const [showMemo, setShowMemo] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [xlmSubentries, setXlmSubentries] = useState<number | null>(null);
  const [maxLoading, setMaxLoading] = useState(false);
  // BTC fee estimate — fetched when BTC is selected
  const [btcFeeRateSatPerVbyte, setBtcFeeRateSatPerVbyte] = useState<number | null>(null);
  // Post-send BTC transaction status
  const [btcTxInfo, setBtcTxInfo] = useState<{
    txid: string;
    amountBtc: number;
    destination: string;
    estimatedFeeSat?: number;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const isBtc = sendToken?.contract === '__btc__';
  const isEth = sendToken?.contract === '__eth__';
  const isSol = sendToken?.contract === '__sol__';
  const isNative = isBtc || isEth || isSol;

  // #74c: which wallet THIS send runs from — the companion when a
  // __companion_*__ token is selected, the connected wallet otherwise. Every
  // sender-side number (subentries, MAX, savings buffer) follows it.
  const isCompanionToken = !!sendToken?.contract?.startsWith('__companion_');
  const effectiveSenderAddress = isCompanionToken
    ? (companionStellar?.address ?? null)
    : (persist.wallet.address ?? null);
  const effectiveHasActiveSavings = isCompanionToken ? companionHasActiveSavings : hasActiveSavings;
  const effectiveSavingsKnown = isCompanionToken ? companionSavingsKnown : savingsPositionKnown;

  // #74c: the one place the override is injected — a companion token routes
  // the send through the companion (sourceAddress → passkey signs); anything
  // else is exactly the send we've always had.
  const sendWithSource = useCallback(
    (args: TransferArgs) =>
      stellarSend(
        isCompanionToken && companionStellar
          ? { ...args, sourceAddress: companionStellar.address }
          : args
      ),
    [stellarSend, isCompanionToken, companionStellar]
  );

  // Source tabs (Niko 2026-08-25): when BOTH wallets hold the selected
  // Stellar asset, the send's source is an explicit choice. Switching swaps
  // sendToken to the sibling token — every sender-side number (spendable,
  // MAX, XLM reserve, savings buffer, signer) follows it for free, because
  // they all already key off sendToken.
  const sourceSiblings = useMemo(() => {
    if (!sendToken || isNative) return null;
    const slotTk = sendableTokens.find(
      (o) => o.symbol === sendToken.symbol && !o.contract.startsWith('__')
    );
    const compTk = sendableTokens.find(
      (o) => o.symbol === sendToken.symbol && o.contract.startsWith('__companion_')
    );
    return slotTk && compTk ? { slotTk, compTk } : null;
  }, [sendToken, isNative, sendableTokens]);
  const sourceOptions = useMemo(() => {
    if (!sourceSiblings) return [];
    return buildStellarWalletOptions({
      slotAddress: persist.wallet.address,
      slotWalletType: persist.wallet.walletType,
      slotLabel: connectedWalletLabel(persist.wallet.walletType),
      companionAddress: companionStellar?.address ?? null,
      slotBalance: Number(sourceSiblings.slotTk.balance),
      companionBalance: Number(sourceSiblings.compTk.balance),
    });
  }, [sourceSiblings, persist.wallet.address, persist.wallet.walletType, companionStellar]);

  // #74b: "send to your own wallet" quick-pick (Stellar assets only — for
  // BTC/ETH/SOL your own wallet IS the sender). Companion address rides the
  // portfolio's cached payload; linked wallets are fetched once per open.
  // A failed fetch just means no chips — a missing shortcut, never a wrong
  // claim.
  const [linkedWallets, setLinkedWallets] = useState<LinkedWallet[]>([]);
  useEffect(() => {
    if (!open) return;
    getLinkedWallets()
      .then(setLinkedWallets)
      .catch(() => setLinkedWallets([]));
  }, [open]);
  const ownWalletCandidates = useMemo(
    () =>
      buildOwnWalletCandidates({
        // The EFFECTIVE sender: a companion send offers the connected wallet
        // as a destination, and vice versa — never the sender itself.
        senderAddress: effectiveSenderAddress,
        companionAddress: companionStellar?.address,
        slotWallet:
          isExternalSlot && persist.wallet.address
            ? {
                address: persist.wallet.address,
                label: connectedWalletLabel(persist.wallet.walletType),
              }
            : null,
        linkedWallets,
      }),
    [
      effectiveSenderAddress,
      companionStellar?.address,
      isExternalSlot,
      persist.wallet.address,
      persist.wallet.walletType,
      linkedWallets,
    ]
  );

  // Reset form each time the dialog opens — and ONLY then. sendableTokens is
  // read through a ref: with the P0-1 shared-cache hooks, the token list's
  // identity refreshes with the data, and having it as an effect dependency
  // made every background refresh (and, before the hooks memoized, every
  // keystroke's render) wipe the amount the user was typing (observed live
  // 2026-08-13: "input glitches back to 0").
  const sendableTokensRef = useRef(sendableTokens);
  sendableTokensRef.current = sendableTokens;
  useEffect(() => {
    if (!open) return;
    const list = sendableTokensRef.current;
    setDestination('');
    setMemo('');
    setAmount('');
    setIsFiatMode(false);
    setShowMemo(false);
    setXlmSubentries(null);
    setBtcFeeRateSatPerVbyte(null);
    const preselected = initialSymbol
      ? list.find((tkn) => tkn.symbol === initialSymbol)
      : undefined;
    const best = [...list].sort(
      (a, b) =>
        BigNumber(b.balance)
          .multipliedBy(b.price)
          .comparedTo(BigNumber(a.balance).multipliedBy(a.price)) ?? 0
    )[0];
    setSendToken(preselected ?? best ?? list[0] ?? null);
  }, [open, initialSymbol]);

  // Keep the SELECTED token's row in sync when balances refresh while the
  // dialog is open (so MAX and the header amount stay truthful) — without
  // touching the typed amount or destination.
  useEffect(() => {
    setSendToken((prev) => {
      if (!prev) {
        // The open-time reset saw an EMPTY list (observed live 2026-08-17:
        // empty external wallet in the slot → no Stellar tokens, and the
        // BTC/ETH/SOL hooks only START fetching when the modal opens) — so
        // adopt the selection when the list arrives, same rules as on open.
        if (!open || sendableTokens.length === 0) return prev;
        const preselected = initialSymbol
          ? sendableTokens.find((tkn) => tkn.symbol === initialSymbol)
          : undefined;
        const best = [...sendableTokens].sort(
          (a, b) =>
            BigNumber(b.balance)
              .multipliedBy(b.price)
              .comparedTo(BigNumber(a.balance).multipliedBy(a.price)) ?? 0
        )[0];
        return preselected ?? best ?? null;
      }
      const updated = sendableTokens.find(
        (tkn) => tkn.symbol === prev.symbol && tkn.contract === prev.contract
      );
      return updated ?? prev;
    });
  }, [sendableTokens, open, initialSymbol]);

  // Fetch XLM subentry count for accurate reserve calculation — from the
  // EFFECTIVE sender (#74c: the companion's reserve when its XLM is selected).
  useEffect(() => {
    if (!open || sendToken?.symbol !== 'XLM' || !effectiveSenderAddress) return;
    setXlmSubentries(null);
    const horizonServer = new Horizon.Server(config.HORIZON_URL, {
      allowHttp: config.HORIZON_URL.startsWith('http://'),
    });
    horizonServer
      .loadAccount(effectiveSenderAddress)
      .then((acc) => setXlmSubentries(acc.subentry_count))
      .catch(() => setXlmSubentries(null));
  }, [open, sendToken?.symbol, effectiveSenderAddress, config.HORIZON_URL]);

  // Fetch BTC fee rate when BTC is selected
  useEffect(() => {
    if (!isBtc) return;
    fetch('https://mempool.space/api/v1/fees/recommended')
      .then((r) => r.json())
      .then((data) => setBtcFeeRateSatPerVbyte(data.halfHourFee ?? null))
      .catch(() => setBtcFeeRateSatPerVbyte(null));
  }, [isBtc]);

  // Build the active adapter based on selected token
  const adapter = useMemo((): SendAdapter | null => {
    if (!sendToken) return null;
    const onError = (msg: string) => {
      enqueueSnackbar(msg, { variant: 'error' });
    };
    if (isBtc) {
      if (!bitcoinAddress) return null;
      return createBitcoinAdapter(bitcoinAddress, onError);
    }
    if (isEth) {
      if (!ethereumAddress) return null;
      return createEthereumAdapter(ethereumAddress, onError);
    }
    if (isSol) {
      if (!solanaAddress) return null;
      return createSolanaAdapter(solanaAddress, onError);
    }
    return createStellarAdapter(sendWithSource, xlmPrice, effectiveHasActiveSavings);
  }, [
    sendToken,
    isBtc,
    isEth,
    isSol,
    bitcoinAddress,
    ethereumAddress,
    solanaAddress,
    sendWithSource,
    xlmPrice,
    effectiveHasActiveSavings,
    enqueueSnackbar,
  ]);

  const xlmSubentriesForAdapter = xlmSubentries ?? undefined;

  // #62: money committed to in-flight sends/swaps is not offerable, even
  // while the displayed balance still includes it (it lags the chain by a
  // few seconds). Derived live from the pending ledgers — never a store write.
  const pendingOutflow = usePendingOutflow(adapter?.network, sendToken?.symbol);

  const spendableBalance = useMemo(() => {
    if (!sendToken || !adapter) return BigNumber(0);
    const base = adapter.getSpendableBalance(sendToken, xlmSubentriesForAdapter);
    const net = base.minus(pendingOutflow);
    return net.gt(0) ? net : BigNumber(0);
  }, [sendToken, adapter, xlmSubentriesForAdapter, pendingOutflow]);

  const coinAmount = useMemo(() => {
    if (!sendToken || !amount) return BigNumber(0);
    const n = BigNumber(amount);
    if (n.isNaN()) return BigNumber(0);
    return isFiatMode ? n.dividedBy(sendToken.price) : n;
  }, [amount, sendToken, isFiatMode]);

  const fiatAmount = useMemo(() => {
    if (!sendToken) return BigNumber(0);
    return coinAmount.multipliedBy(sendToken.price);
  }, [coinAmount, sendToken]);

  const insufficientBalance = coinAmount.gt(0) && spendableBalance.lt(coinAmount);

  // Fee display for the info row
  const feeDisplay = useMemo(() => {
    if (!adapter) return null;
    if (adapter.feeInfo) return adapter.feeInfo;
    // BTC: dynamic estimate
    if (isBtc && btcFeeRateSatPerVbyte !== null) {
      const feeSat = Math.ceil(btcFeeRateSatPerVbyte * 141);
      const feeBtc = feeSat / 1e8;
      const feeFiat = feeBtc * (sendToken ? parseFloat(sendToken.price) : 0);
      return {
        label: `~${feeSat.toLocaleString()} sat`,
        fiatLabel: `(${fCurrency(feeFiat)})`,
        tooltip: `Estimated Bitcoin miner fee at ${btcFeeRateSatPerVbyte} sat/vbyte. Actual fee may vary.`,
      };
    }
    return null;
  }, [adapter, isBtc, btcFeeRateSatPerVbyte, sendToken]);

  // Address validation via adapter
  const isAddressValid = useMemo(
    () => (destination ? (adapter?.validateAddress(destination) ?? false) : true),
    [destination, adapter]
  );

  // Exchange deposit addresses pool every customer's funds into one account;
  // the memo routes the payment to the right customer. A memo-less send to
  // one succeeds on-chain and vanishes into the exchange's omnibus balance
  // (finding #48 — it happened, with Coinbase). Seed list answers instantly;
  // the route adds the live directory + SEP-29 flag for addresses we don't
  // know. null = not required / still checking, and the Review gate below
  // fails CLOSED only on a positive answer, so a slow check can never block
  // an ordinary send.
  const [memoRequirement, setMemoRequirement] = useState<MemoRequirement | null>(null);
  useEffect(() => {
    setMemoRequirement(null);
    if (adapter?.network !== 'stellar' || !destination || !isAddressValid) return undefined;

    const known = knownMemoRequirement(destination);
    if (known) {
      setMemoRequirement(known);
      setShowMemo(true);
      return undefined;
    }

    let cancelled = false;
    fetchMemoRequirement(destination).then((req) => {
      if (cancelled || !req.required) return;
      setMemoRequirement(req);
      setShowMemo(true);
    });
    return () => {
      cancelled = true;
    };
  }, [destination, isAddressValid, adapter?.network]);

  const memoMissing = !!memoRequirement?.required && !memo.trim();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(sanitizeAmountInput(e.target.value));
  };

  const handleMaxClick = async () => {
    if (!sendToken) return;
    if (isFiatMode) {
      setAmount(spendableBalance.multipliedBy(sendToken.price).toFixed(2, BigNumber.ROUND_DOWN));
      return;
    }
    if (isNative) {
      setAmount(spendableBalance.toFixed(8, BigNumber.ROUND_DOWN));
      return;
    }
    if (sendToken.symbol === 'XLM' && effectiveSenderAddress) {
      // Fresh on-chain read so MAX exactly matches what the send will accept —
      // the cached store balance/subentry count can lag, and the send execution
      // does its own fresh read. Same spendableXlm helper on both sides.
      // #74c: reads the EFFECTIVE sender — the companion's balance, reserve
      // and savings buffer when its XLM is selected.
      setMaxLoading(true);
      try {
        const server = new Horizon.Server(config.HORIZON_URL, {
          allowHttp: config.HORIZON_URL.startsWith('http://'),
        });
        const acc = await server.loadAccount(effectiveSenderAddress);
        setXlmSubentries(acc.subentry_count);
        const nativeBal = acc.balances.find((b) => b.asset_type === 'native')?.balance ?? '0';
        // #67: the buffer applies when the user HAS savings (confirmed) — or,
        // while the position is still loading, falls back to the conservative
        // trustline proxy so MAX never over-offers in the gap. Same helper as
        // the typed-amount validation, so the two can never disagree.
        const holdBuffer =
          effectiveHasActiveSavings || (!effectiveSavingsKnown && acc.subentry_count > 0);
        const max = spendableXlmForOutflow(nativeBal, acc.subentry_count, holdBuffer);
        setAmount(max.toFixed(7, BigNumber.ROUND_DOWN));
      } catch {
        setAmount(spendableBalance.toFixed(7, BigNumber.ROUND_DOWN));
      } finally {
        setMaxLoading(false);
      }
      return;
    }
    // Other Stellar tokens (e.g. USDC): full balance.
    setAmount(getMaxAmount(sendToken, false));
  };

  // Whether MAX kept the extra savings buffer (drives the info note below).
  // #67: the hint (and the buffer itself) keys on an ACTIVE savings position,
  // with the old trustline proxy only as the conservative fallback while the
  // position is still loading.
  const savingsBufferApplies =
    sendToken?.symbol === 'XLM' &&
    (effectiveHasActiveSavings || (!effectiveSavingsKnown && (xlmSubentries ?? 0) > 0));

  const toggleMode = () => {
    if (!sendToken || !amount) {
      setIsFiatMode((p) => !p);
      return;
    }
    const n = BigNumber(amount);
    if (n.isNaN() || n.isZero()) {
      setIsFiatMode((p) => !p);
      return;
    }
    if (isFiatMode) {
      setAmount(coinAmount.toFixed(sendToken.decimals));
    } else {
      setAmount(fiatAmount.toFixed(2));
    }
    setIsFiatMode((p) => !p);
  };

  const getButtonLabel = (): string => {
    if (!sendToken) return t('Select an asset');
    if (!destination) return t('Enter destination address');
    if (!isAddressValid) {
      return t('Invalid destination address');
    }
    if (!amount || coinAmount.isZero()) return t('Enter an amount');
    if (insufficientBalance)
      return t('Insufficient {{symbol}} balance', { symbol: sendToken.symbol });
    // Fail closed for exchange destinations: without the memo the funds
    // arrive at the exchange but are never credited to the user's account.
    if (memoMissing) return t('Enter the memo from the exchange');
    return t('Review transaction');
  };

  const isReviewReady = getButtonLabel() === t('Review transaction');

  const handleReviewClick = () => {
    if (!sendToken || !isReviewReady) return;
    // Self-send = destination equals the wallet the send RUNS FROM (#74c:
    // the companion under an override). Comparing against the connected
    // wallet blocked the legitimate Normal→Lobstr transfer the own-wallet
    // chips exist for (observed live 2026-08-17).
    if (adapter?.network === 'stellar' && destination === effectiveSenderAddress) {
      enqueueSnackbar(t('Cannot send to your own address'), { variant: 'error' });
      return;
    }
    setReviewOpen(true);
  };

  const handleReviewClose = () => {
    setReviewOpen(false);
    onClose();
  };

  const handleBtcSendSuccess = (txid: string) => {
    setBtcTxInfo({
      txid,
      amountBtc: coinAmount.toNumber(),
      destination,
      estimatedFeeSat: btcEstimatedFeeSat,
    });
    setReviewOpen(false);
    // Keep SendModal mounted — BtcTxStatusModal renders in its place
  };

  // Estimate fee in sats for the review dialog (BTC only)
  const btcEstimatedFeeSat = useMemo(() => {
    if (!isBtc || btcFeeRateSatPerVbyte === null) return undefined;
    return Math.ceil(btcFeeRateSatPerVbyte * 141);
  }, [isBtc, btcFeeRateSatPerVbyte]);

  return (
    <>
      <Dialog
        open={open && !btcTxInfo}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '22px' } } }}
      >
        <DialogTitle sx={{ px: '22px', pt: '22px', pb: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography
              sx={{ fontSize: '15px', fontWeight: 600, color: '#0A0A0F', letterSpacing: '-0.01em' }}
            >
              {t('Send')}
            </Typography>
            <Box
              component="button"
              onClick={onClose}
              sx={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                border: 'none',
                bgcolor: 'rgba(10,10,15,0.06)',
                color: '#0A0A0F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 150ms ease',
                '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
              }}
            >
              <Iconify icon="mingcute:close-line" width={16} />
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: '22px', pt: '16px', pb: '22px' }}>
          <Stack spacing={1.5}>
            {/* Asset selector */}
            <Box
              onClick={() => setPickerOpen(true)}
              sx={{
                p: '16px',
                borderRadius: '16px',
                bgcolor: '#FAFAFB',
                border: '1px solid rgba(10,10,15,0.08)',
                cursor: 'pointer',
                transition: 'border-color 150ms ease',
                '&:hover': { borderColor: 'rgba(10,10,15,0.16)' },
              }}
            >
              {sendToken ? (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '10px' }}>
                    <Typography
                      sx={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'rgba(10,10,15,0.45)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {t('Asset')}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)' }}>
                      {t('Available:')}{' '}
                      <Box component="span" sx={{ color: '#0A0A0F', fontWeight: 600 }}>
                        {/* Follow the amount toggle (Niko, 2026-08-13): typing
                            dollars against a token-unit readout gives no way
                            to know what fits. Same ROUND_DOWN cents as the
                            MAX fill, so typing exactly the shown number can
                            never trip "Exceeds available balance". */}
                        {isFiatMode && BigNumber(sendToken.price).gt(0)
                          ? `$${spendableBalance
                              .multipliedBy(sendToken.price)
                              .toFixed(2, BigNumber.ROUND_DOWN)}`
                          : `${spendableBalance.toFixed(
                              Math.min(sendToken.decimals, isBtc ? 6 : 4),
                              BigNumber.ROUND_DOWN
                            )} ${sendToken.symbol}`}
                      </Box>
                      {/* #74c: name the wallet this balance belongs to — the
                          compact pill shows only the symbol, and a hybrid
                          account has two wallets holding the same asset. */}
                      {isExternalSlot && !isNative && (
                        <Box component="span" sx={{ color: 'rgba(10,10,15,0.4)' }}>
                          {isCompanionToken
                            ? ` · ${t('Normal wallet')}`
                            : ` · ${connectedWalletLabel(persist.wallet.walletType)}`}
                        </Box>
                      )}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        px: '12px',
                        py: '8px',
                        borderRadius: '100px',
                        bgcolor: '#FFFFFF',
                        border: '1px solid rgba(10,10,15,0.08)',
                      }}
                    >
                      <Box
                        component="img"
                        src={sendToken.icon || getCryptoIconUrl(sendToken.symbol)}
                        sx={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <Typography
                        sx={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#0A0A0F',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {sendToken.symbol}
                      </Typography>
                      <NetworkBadge network={getAssetNetwork(sendToken)} />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Box
                        component="button"
                        disabled={maxLoading}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleMaxClick();
                        }}
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
                          cursor: maxLoading ? 'default' : 'pointer',
                          opacity: maxLoading ? 0.5 : 1,
                          flexShrink: 0,
                          fontFamily: 'inherit',
                          '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
                        }}
                      >
                        {maxLoading ? '…' : 'MAX'}
                      </Box>
                      <Iconify
                        icon="eva:chevron-down-fill"
                        width={18}
                        sx={{ color: 'rgba(10,10,15,0.4)' }}
                      />
                    </Box>
                  </Box>
                </>
              ) : (
                <Typography sx={{ fontSize: '14px', color: 'rgba(10,10,15,0.4)' }}>
                  {t('Select asset')}
                </Typography>
              )}
            </Box>

            {sourceOptions.length > 1 && sourceSiblings && (
              <WalletChoice
                options={sourceOptions}
                selectedKey={isCompanionToken ? 'normal' : 'external'}
                onSelect={(o) =>
                  setSendToken(o.key === 'normal' ? sourceSiblings.compTk : sourceSiblings.slotTk)
                }
                flow="send"
                symbol={sendToken?.symbol}
              />
            )}

            {/* Amount input */}
            <Box
              sx={{
                p: '16px',
                borderRadius: '16px',
                bgcolor: '#FAFAFB',
                border: '1px solid',
                borderColor: insufficientBalance ? 'error.main' : 'rgba(10,10,15,0.08)',
                transition: 'border-color 150ms ease',
                '&:focus-within': {
                  borderColor: insufficientBalance ? 'error.main' : 'rgba(10,10,15,0.24)',
                },
              }}
            >
              <Typography
                sx={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'rgba(10,10,15,0.45)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  mb: '10px',
                }}
              >
                {t('Amount')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isFiatMode && (
                  <Typography
                    sx={{
                      fontSize: '24px',
                      fontWeight: 600,
                      color: 'rgba(10,10,15,0.35)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                    }}
                  >
                    $
                  </Typography>
                )}
                <Box
                  ref={inputRef}
                  component="input"
                  type="number"
                  value={amount}
                  onChange={handleInputChange}
                  placeholder="0"
                  onKeyDown={(e: React.KeyboardEvent) => e.key === '-' && e.preventDefault()}
                  sx={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    bgcolor: 'transparent',
                    fontSize: '24px',
                    fontWeight: 600,
                    color: insufficientBalance ? 'error.main' : '#0A0A0F',
                    letterSpacing: '-0.02em',
                    fontFamily: '"Geist Mono", "Courier New", monospace',
                    width: '100%',
                    minWidth: 0,
                    '&::placeholder': { color: 'rgba(10,10,15,0.2)' },
                    '&::-webkit-inner-spin-button, &::-webkit-outer-spin-button': {
                      appearance: 'none',
                    },
                  }}
                />
                {!isFiatMode && sendToken && (
                  <Typography
                    sx={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'rgba(10,10,15,0.45)',
                      flexShrink: 0,
                    }}
                  >
                    {sendToken.symbol}
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
                  color: insufficientBalance ? 'error.main' : 'rgba(10,10,15,0.45)',
                  mt: '6px',
                }}
              >
                {insufficientBalance
                  ? t('Exceeds available balance')
                  : sendToken && coinAmount.gt(0)
                    ? isFiatMode
                      ? `≈ ${coinAmount.toFixed(isBtc ? 6 : 4)} ${sendToken.symbol}`
                      : `≈ ${fCurrency(fiatAmount)}`
                    : t('Enter amount above')}
              </Typography>
            </Box>

            {/* Destination address */}
            <Box
              sx={{
                p: '16px',
                borderRadius: '16px',
                bgcolor: '#FAFAFB',
                border: '1px solid',
                borderColor: destination && !isAddressValid ? 'error.main' : 'rgba(10,10,15,0.08)',
                transition: 'border-color 150ms ease',
                '&:focus-within': {
                  borderColor:
                    destination && !isAddressValid ? 'error.main' : 'rgba(10,10,15,0.24)',
                },
              }}
            >
              <Typography
                sx={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'rgba(10,10,15,0.45)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  mb: '10px',
                }}
              >
                {t('To')}
              </Typography>
              {!isNative && sendToken && (
                <OwnWalletChips
                  open={open}
                  candidates={ownWalletCandidates}
                  assetSymbol={sendToken.symbol}
                  assetIssuer={sendToken.issuer || undefined}
                  selectedAddress={destination}
                  onSelect={setDestination}
                />
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box
                  component="input"
                  type="text"
                  value={destination}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDestination(e.target.value.trim())
                  }
                  placeholder={adapter?.addressPlaceholder ?? 'G…'}
                  sx={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    bgcolor: 'transparent',
                    fontSize: '13px',
                    color: '#0A0A0F',
                    fontFamily: '"Geist Mono", "Courier New", monospace',
                    width: '100%',
                    minWidth: 0,
                    '&::placeholder': { color: 'rgba(10,10,15,0.25)' },
                  }}
                />
                <PasteIconButton
                  alert="Destination pasted"
                  onSubmit={(v) => {
                    setDestination(v.trim());
                    return true;
                  }}
                />
              </Box>
              {destination && !isAddressValid && (
                <Typography sx={{ fontSize: '12px', color: 'error.main', mt: '6px' }}>
                  {t('Not a valid {{network}} address', {
                    network:
                      adapter?.network === 'stellar'
                        ? 'Stellar'
                        : adapter
                          ? adapter.network.charAt(0).toUpperCase() + adapter.network.slice(1)
                          : '',
                  })}
                </Typography>
              )}
            </Box>

            {/* Memo — Stellar only. When the destination is a known exchange
                the field is forced open and required: the toggle disappears so
                it cannot be dismissed, and Review stays disabled without it. */}
            {adapter?.hasMemo && (
              <Box>
                {memoRequirement?.required ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      p: '12px 14px',
                      borderRadius: '12px',
                      bgcolor: 'rgba(245,158,11,0.08)',
                      border: '1px solid rgba(245,158,11,0.35)',
                    }}
                  >
                    <Iconify
                      icon="eva:alert-triangle-outline"
                      width={18}
                      sx={{ color: '#B45309', mt: '1px', flexShrink: 0 }}
                    />
                    <Typography sx={{ fontSize: '12.5px', color: '#78350F', lineHeight: 1.5 }}>
                      {memoRequirement.name
                        ? t(
                            '{{name}} requires a memo. It is shown next to the deposit address in your {{name}} account. Without it your funds will not be credited.',
                            { name: memoRequirement.name }
                          )
                        : t(
                            'This address requires a memo. It is shown next to the deposit address at the receiving service. Without it your funds will not be credited.'
                          )}
                    </Typography>
                  </Box>
                ) : (
                  <Box
                    component="button"
                    onClick={() => setShowMemo((p) => !p)}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: 'none',
                      bgcolor: 'transparent',
                      color: 'rgba(10,10,15,0.5)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      p: 0,
                      transition: 'color 150ms ease',
                      '&:hover': { color: '#0A0A0F' },
                    }}
                  >
                    <Iconify
                      icon={showMemo ? 'eva:minus-circle-outline' : 'eva:plus-circle-outline'}
                      width={16}
                    />
                    {showMemo ? t('Remove memo') : t('Add memo (optional)')}
                  </Box>
                )}
                {showMemo && (
                  <Box
                    sx={{
                      mt: '10px',
                      p: '16px',
                      borderRadius: '16px',
                      bgcolor: '#FAFAFB',
                      border: '1px solid rgba(10,10,15,0.08)',
                      transition: 'border-color 150ms ease',
                      '&:focus-within': { borderColor: 'rgba(10,10,15,0.24)' },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'rgba(10,10,15,0.45)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        mb: '10px',
                      }}
                    >
                      {memoRequirement?.required ? t('Memo (required)') : t('Memo')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Box
                        component="input"
                        type="text"
                        value={memo}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setMemo(e.target.value)
                        }
                        placeholder={t('Exchange ID, note…')}
                        sx={{
                          flex: 1,
                          border: 'none',
                          outline: 'none',
                          bgcolor: 'transparent',
                          fontSize: '14px',
                          color: '#0A0A0F',
                          fontFamily: 'inherit',
                          width: '100%',
                          minWidth: 0,
                          '&::placeholder': { color: 'rgba(10,10,15,0.25)' },
                        }}
                      />
                      <PasteIconButton
                        alert="Memo pasted"
                        onSubmit={(v) => {
                          setMemo(v);
                          return true;
                        }}
                      />
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {/* Fee + reserve info */}
            {feeDisplay && (
              <Box
                sx={{
                  p: '12px 14px',
                  borderRadius: '12px',
                  bgcolor: '#FAFAFB',
                  border: '1px solid rgba(10,10,15,0.06)',
                }}
              >
                <Stack spacing={0.75}>
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
                        {t('Network fee')}
                      </Typography>
                      <Tooltip title={feeDisplay.tooltip}>
                        <Box sx={{ display: 'flex', color: 'rgba(10,10,15,0.3)', cursor: 'help' }}>
                          <Iconify icon="eva:info-outline" width={13} />
                        </Box>
                      </Tooltip>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#0A0A0F',
                        fontFamily: '"Geist Mono", "Courier New", monospace',
                      }}
                    >
                      {feeDisplay.label}{' '}
                      <Box component="span" sx={{ color: 'rgba(10,10,15,0.45)', fontWeight: 400 }}>
                        {feeDisplay.fiatLabel}
                      </Box>
                    </Typography>
                  </Box>

                  {/* XLM minimum reserve info */}
                  {sendToken?.symbol === 'XLM' && xlmSubentries !== null && (
                    <>
                      <Box sx={{ height: '1px', bgcolor: 'rgba(10,10,15,0.06)' }} />
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
                            {t('Minimum reserve')}
                          </Typography>
                          <Tooltip
                            title={t(
                              'Stellar requires every account to keep a minimum XLM balance (2 XLM base + 0.5 XLM per trustline/offer). This amount stays in your account and is not sent.'
                            )}
                          >
                            <Box
                              sx={{ display: 'flex', color: 'rgba(10,10,15,0.3)', cursor: 'help' }}
                            >
                              <Iconify icon="eva:info-outline" width={13} />
                            </Box>
                          </Tooltip>
                        </Box>
                        <Typography
                          sx={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#0A0A0F',
                            fontFamily: '"Geist Mono", "Courier New", monospace',
                          }}
                        >
                          {((2 + xlmSubentries) * 0.5).toFixed(1)} XLM
                        </Typography>
                      </Box>
                      {savingsBufferApplies && (
                        <Typography
                          sx={{ fontSize: '11px', color: 'rgba(10,10,15,0.4)', lineHeight: 1.4 }}
                        >
                          {t(
                            'MAX keeps ~{{buffer}} XLM extra so you can always pay savings deposit & withdrawal fees.',
                            { buffer: SAVINGS_XLM_BUFFER }
                          )}
                        </Typography>
                      )}
                    </>
                  )}
                </Stack>
              </Box>
            )}

            {/* BTC fee loading indicator */}
            {isBtc && !feeDisplay && (
              <Box
                sx={{
                  p: '12px 14px',
                  borderRadius: '12px',
                  bgcolor: '#FAFAFB',
                  border: '1px solid rgba(10,10,15,0.06)',
                }}
              >
                <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.4)' }}>
                  {t('Fetching fee estimate…')}
                </Typography>
              </Box>
            )}

            {/* CTA */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={!isReviewReady}
              onClick={handleReviewClick}
              sx={{
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
              {getButtonLabel()}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <PickToken
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        buttonSource="send"
        tokens={pickerTokens}
        onTokenSelect={(token) => {
          // A combined display row resolves to the REAL per-wallet token.
          // Default = the slot wallet when it holds any (the old list order's
          // first row), else the companion; the tabs swap afterwards.
          const slotTk = sendableTokens.find(
            (o) => o.symbol === token.symbol && !o.contract.startsWith('__')
          );
          const compTk = sendableTokens.find(
            (o) => o.symbol === token.symbol && o.contract.startsWith('__companion_')
          );
          const real =
            slotTk && compTk
              ? Number(slotTk.balance) > 0
                ? slotTk
                : compTk
              : (sendableTokens.find(
                  (o) => o.symbol === token.symbol && o.contract === token.contract
                ) ?? token);
          setSendToken(real);
          setPickerOpen(false);
        }}
      />

      {reviewOpen && sendToken && adapter && (
        <SendReview
          open={reviewOpen}
          onClose={handleReviewClose}
          sendToken={sendToken}
          tokenValue={coinAmount.toNumber()}
          fiatValue={fiatAmount.toNumber()}
          address={destination}
          memo={memo}
          sendFn={adapter.send.bind(adapter)}
          estimatedFeeSat={btcEstimatedFeeSat}
          onBtcSendSuccess={handleBtcSendSuccess}
        />
      )}

      {btcTxInfo && (
        <BtcTxStatusModal
          open
          onClose={() => {
            setBtcTxInfo(null);
            onClose();
          }}
          txid={btcTxInfo.txid}
          amountBtc={btcTxInfo.amountBtc}
          destination={btcTxInfo.destination}
          estimatedFeeSat={btcTxInfo.estimatedFeeSat}
        />
      )}
    </>
  );
}
