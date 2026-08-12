import type { Activity } from '@/types/activity';
import type { MgiDbTransaction } from '@/lib/mgi/statuses';
import type { ChainAddresses } from '@/lib/chains/registry';
import type { WalletActivityItem, WalletActivityResponse } from '@/types/wallet-activity';

import useSWR from 'swr';
import { buildAuthHeaders } from '@/utils/http';
import { chainOfActivityEvent } from '@/lib/tx-events';
import { getCryptoIconUrl } from '@normalfinance/utils';
import { CHAINS, getChainAddress } from '@/lib/chains/registry';
import { useMemo, useEffect, useSyncExternalStore } from 'react';
import { useMgiTransactions } from '@/hooks/use-mgi-transactions';
import { getLifiStatusOverride } from '@/lib/lifi/status-overrides';
import { FAILED_MGI_STATUSES, PENDING_MGI_STATUSES } from '@/lib/mgi/statuses';
import {
  toHashSet,
  getPendingSends,
  subscribePendingSends,
  getServerPendingSends,
  reconcilePendingSends,
} from '@/lib/pending-sends';

// Coinbase off-ramp sends are recorded client-side as { coinbaseTxnId: ourTxHash }
// when we broadcast the on-chain transfer (see coinbase-offramp-modal). We join
// that with the live Coinbase status to re-label the matching Sent row as an
// off-ramp and show its real status. (localStorage v1 — DB-backed is the
// hardening follow-up.)
const OFFRAMP_FILLS_KEY = 'nf:cb-offramp-fills';

function readOfframpFills(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(OFFRAMP_FILLS_KEY) || '{}');
  } catch {
    return {};
  }
}

interface OfframpInfo {
  status: 'pending' | 'completed' | 'failed';
  symbol: string;
  amount: number;
}

function mapCoinbaseStatus(s: string): OfframpInfo['status'] {
  if (s === 'TRANSACTION_STATUS_SUCCESS') return 'completed';
  if (s === 'TRANSACTION_STATUS_FAILED' || s === 'TRANSACTION_STATUS_EXPIRED') return 'failed';
  return 'pending';
}

// Returns a map of our on-chain txHash -> off-ramp status, by joining the
// local { coinbaseTxnId: txHash } fills with the Coinbase status API
// (keyed by coinbaseTxnId).
async function fetchOfframpStatuses(): Promise<Record<string, OfframpInfo>> {
  const fills = readOfframpFills();
  const entries = Object.entries(fills).filter(([, h]) => h && h !== 'pending');
  if (!entries.length) return {};
  try {
    const headers = await buildAuthHeaders();
    const res = await fetch('/api/coinbase/offramp-status', { headers });
    if (!res.ok) return {};
    const data = await res.json();
    const byTxn: Record<string, any> = {};
    for (const tx of data.transactions ?? []) byTxn[tx.transactionId] = tx;
    const map: Record<string, OfframpInfo> = {};
    for (const [txnId, txHash] of entries) {
      const tx = byTxn[txnId];
      if (tx) {
        map[txHash] = {
          status: mapCoinbaseStatus(tx.status),
          symbol: String(tx.asset ?? '').toUpperCase(),
          amount: parseFloat(tx.amount ?? '0'),
        };
      }
    }
    return map;
  } catch {
    return {};
  }
}

function fallbackSymbol(address: string, stored: string | null): string {
  if (stored) return stored;
  if (address === 'native') return 'XLM';
  return address.length > 8 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}

function mapWalletActivityItem(item: WalletActivityItem): Activity {
  const timestamp = Date.parse(item.createdAt);

  switch (item.kind) {
    case 'vault_deposit':
      return {
        id: item.id,
        timestamp,
        type: 'Savings Deposit',
        amount: item.amount,
        vaultAddress: item.vaultAddress,
        txHash: item.txHash,
      };
    case 'vault_withdraw':
      return {
        id: item.id,
        timestamp,
        type: 'Savings Withdraw',
        amount: item.amount,
        vaultAddress: item.vaultAddress,
        txHash: item.txHash,
      };
    case 'swap': {
      const symIn = fallbackSymbol(item.tokenInAddress, item.tokenInSymbol);
      const symOut = fallbackSymbol(item.tokenOutAddress, item.tokenOutSymbol);
      const aIn = parseFloat(item.amountIn);
      const aOut = parseFloat(item.amountOut);
      return {
        id: item.id,
        timestamp,
        type: 'Swap',
        txHash: item.txHash,
        tokenIn: {
          address: item.tokenInAddress,
          symbol: symIn,
          iconUrl: getCryptoIconUrl(symIn),
          amount: aIn,
        },
        tokenOut: {
          address: item.tokenOutAddress,
          symbol: symOut,
          iconUrl: getCryptoIconUrl(symOut),
          amount: aOut,
        },
      };
    }
    default:
      throw new Error(`Unhandled activity kind: ${(item as WalletActivityItem).kind}`);
  }
}

// --- CCTP cross-ecosystem swaps ---------------------------------------------
// One CctpTransfer row = one coherent "Swap" entry (BTC/ETH/SOL ⇄ XLM/USDC via
// Circle CCTP + LI.FI). Reuses SwapActivity's pending/failed flags, so the feed
// and UI render it exactly like a LI.FI cross-chain swap — no UI changes.
interface CctpTransferRow {
  id: string;
  direction: string;
  status: string;
  srcAsset: string;
  dstAsset: string;
  srcAmount: string | null;
  dstAmount: string | null;
  burnTxHash: string | null;
  mintTxHash: string | null;
  srcSwapTxHash: string | null;
  dstSwapTxHash: string | null;
  createdAt: string;
}

function mapCctpTransfer(tr: CctpTransferRow): Extract<Activity, { type: 'Swap' }> {
  // Outbound (USDC → BTC/ETH/SOL) isn't truly done at COMPLETED — that only marks
  // the CCTP bridge (mint on Base); the target asset arrives after the LI.FI
  // pivot (dstSwapTxHash). Inbound (→ USDC on Stellar) is done at COMPLETED.
  const outbound = tr.direction === 'stellar_to_crosschain';
  const refunded = tr.status === 'REFUNDED';
  const failed = tr.status === 'FAILED';
  const succeeded = outbound
    ? tr.status === 'COMPLETED' && !!tr.dstSwapTxHash
    : tr.status === 'COMPLETED';
  return {
    id: `cctp:${tr.id}`,
    timestamp: Date.parse(tr.createdAt),
    type: 'Swap',
    txHash: tr.burnTxHash ?? null,
    tokenIn: {
      address: `cctp:${tr.srcAsset}`,
      symbol: tr.srcAsset,
      iconUrl: getCryptoIconUrl(tr.srcAsset),
      amount: parseFloat(tr.srcAmount ?? '0'),
    },
    tokenOut: {
      address: `cctp:${tr.dstAsset}`,
      symbol: tr.dstAsset,
      iconUrl: getCryptoIconUrl(tr.dstAsset),
      amount: parseFloat(tr.dstAmount ?? '0'),
    },
    pending: !succeeded && !failed && !refunded,
    failed,
    refunded,
  };
}

async function fetchCctpTransfers(): Promise<CctpTransferRow[]> {
  try {
    const headers = await buildAuthHeaders();
    const res = await fetch('/api/cctp/transfers?history=1', { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.transfers ?? []) as CctpTransferRow[];
  } catch {
    return [];
  }
}

// MoneyGram rows come from OUR database (written at initiation, statuses
// reported back after clients fetch them) — never from MoneyGram's SEP-24 API
// here, which would need a SEP-10 passkey ceremony just to render history.
// 'incomplete' = the user never committed in MoneyGram's UI; hide those.
function mapMgiDbToActivity(rows: MgiDbTransaction[]): Activity[] {
  return rows
    .filter((tx) => tx.status !== 'incomplete')
    .map((tx): Activity => {
      const base = {
        id: `mgi:${tx.id}`,
        timestamp: Date.parse(tx.createdAt),
        symbol: 'USDC',
        iconUrl: getCryptoIconUrl('USDC'),
        amount: parseFloat(tx.amount ?? '0'),
        provider: 'MoneyGram',
        pending: PENDING_MGI_STATUSES.has(tx.status),
        failed: FAILED_MGI_STATUSES.has(tx.status),
      };
      return tx.kind === 'deposit' ? { ...base, type: 'Buy' } : { ...base, type: 'Sell' };
    });
}

async function fetchWalletActivity(url: string): Promise<Activity[]> {
  const res = await fetch(url);
  const data: WalletActivityResponse = await res.json();
  if (!data.success || !data.items) {
    return [];
  }
  return data.items.map(mapWalletActivityItem);
}

// ETH/SOL history come pre-normalized to Activity[] from our server routes
// (the API keys stay server-side).
async function fetchChainActivity(url: string): Promise<Activity[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.success && Array.isArray(data.items) ? (data.items as Activity[]) : [];
  } catch {
    return [];
  }
}

/**
 * Takes the user's chain addresses as one object rather than a positional
 * argument per chain: adding a chain no longer changes this signature, and
 * callers stop threading three separate props around just to reach it.
 *
 * Note the per-chain SWRs below stay written out one by one — React's rules of
 * hooks forbid calling hooks in a loop, so this file keeps a block per chain by
 * necessity, not by oversight.
 */
export function useUserActivity(
  walletAddress: string | null | undefined,
  addresses?: ChainAddresses | null
): {
  recentActivity: Activity[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
} {
  const bitcoinAddress = getChainAddress(addresses, 'bitcoin');
  const ethereumAddress = getChainAddress(addresses, 'ethereum');
  const solanaAddress = getChainAddress(addresses, 'solana');

  const key =
    walletAddress && /^[GC][A-Z2-7]{55}$/.test(walletAddress)
      ? `/api/wallet/activity?walletAddress=${encodeURIComponent(walletAddress)}&limit=50`
      : null;

  const { data, error, isLoading, mutate } = useSWR<Activity[]>(key, fetchWalletActivity, {
    revalidateOnFocus: true,
    dedupingInterval: 10_000,
  });

  // Refresh the feed immediately when a swap/deposit just completed, instead
  // of waiting for focus/interval revalidation. Dispatched by the swap cards.
  useEffect(() => {
    // No delay: the log write now dispatches this event only AFTER the row is
    // saved, so there is nothing left to wait for. The 800ms here was a
    // workaround for the refresh racing the write — with the race removed at
    // its source, the wait is pure latency on every refresh.
    //
    // Chain-scoped events are plain wallet sends (see lib/tx-events.ts); those
    // never write to this DB-backed feed, so skip the refetch for them.
    const handler = (e: Event) => {
      if (chainOfActivityEvent(e)) return;
      mutate();
    };
    window.addEventListener('nf:activity-updated', handler);
    return () => window.removeEventListener('nf:activity-updated', handler);
  }, [mutate]);

  const { transactions: mgiTxs } = useMgiTransactions(!!walletAddress);
  const mgiData = useMemo(() => mapMgiDbToActivity(mgiTxs), [mgiTxs]);

  // XLM (incl. USDC) and BTC now come through our own routes, so they share a
  // cache across tabs and — critically — have a server-side timeout. The
  // dedupe windows match each route's TTL: 60s for Stellar, 45s for Bitcoin
  // (shorter because that feed carries pending transactions).
  const {
    data: stellarData,
    isLoading: stellarLoading,
    mutate: mutateStellar,
  } = useSWR<Activity[]>(
    walletAddress ? `${CHAINS.stellar.activityPath}?address=${walletAddress}` : null,
    fetchChainActivity,
    { revalidateOnFocus: true, dedupingInterval: 60_000 }
  );

  const {
    data: btcData,
    isLoading: btcLoading,
    mutate: mutateBtc,
  } = useSWR<Activity[]>(
    bitcoinAddress ? `${CHAINS.bitcoin.activityPath}?address=${bitcoinAddress}` : null,
    fetchChainActivity,
    { revalidateOnFocus: true, dedupingInterval: 45_000 }
  );

  // ETH/SOL history is served from a 5-minute server-side cache (each miss
  // costs ~100 Helius credits / 2 Etherscan calls), so re-asking sooner than
  // that only produces round-trips that return the same bytes. The dedupe
  // window matches the TTL; freshness after a user action comes from the
  // `nf:activity-updated` handler below, which re-fetches with `refresh=1`.
  const {
    data: ethData,
    isLoading: ethLoading,
    mutate: mutateEth,
  } = useSWR<Activity[]>(
    ethereumAddress ? `${CHAINS.ethereum.activityPath}?address=${ethereumAddress}` : null,
    fetchChainActivity,
    { revalidateOnFocus: true, dedupingInterval: 300_000 }
  );

  const {
    data: solData,
    isLoading: solLoading,
    mutate: mutateSol,
  } = useSWR<Activity[]>(
    solanaAddress ? `${CHAINS.solana.activityPath}?address=${solanaAddress}` : null,
    fetchChainActivity,
    { revalidateOnFocus: true, dedupingInterval: 300_000 }
  );

  // A send/swap the user just made must appear at once. Bypass both caches
  // (SWR's and the server's) for that one fetch, then seed the result back
  // into SWR so the longer dedupe window applies again from here.
  //
  // A chain-scoped event (a plain send — see lib/tx-events.ts) refreshes ONLY
  // that chain's feed: the send cannot have changed the other three, and each
  // skipped refresh is an upstream call (Etherscan/Helius) not spent.
  // Detail-less events keep the original refresh-everything behaviour.
  useEffect(() => {
    const refresh = (
      url: string,
      mutateFn: (data: Promise<Activity[]>, opts: { revalidate: boolean }) => unknown
    ) => mutateFn(fetchChainActivity(`${url}&refresh=1`), { revalidate: false });

    const handler = (e: Event) => {
      const only = chainOfActivityEvent(e);
      setTimeout(() => {
        if (ethereumAddress && (!only || only === 'ethereum'))
          refresh(`${CHAINS.ethereum.activityPath}?address=${ethereumAddress}`, mutateEth);
        if (solanaAddress && (!only || only === 'solana'))
          refresh(`${CHAINS.solana.activityPath}?address=${solanaAddress}`, mutateSol);
        if (walletAddress && (!only || only === 'stellar'))
          refresh(`${CHAINS.stellar.activityPath}?address=${walletAddress}`, mutateStellar);
        if (bitcoinAddress && (!only || only === 'bitcoin'))
          refresh(`${CHAINS.bitcoin.activityPath}?address=${bitcoinAddress}`, mutateBtc);
      }, 800);
    };
    window.addEventListener('nf:activity-updated', handler);
    return () => window.removeEventListener('nf:activity-updated', handler);
  }, [
    ethereumAddress,
    solanaAddress,
    walletAddress,
    bitcoinAddress,
    mutateEth,
    mutateSol,
    mutateStellar,
    mutateBtc,
  ]);

  // CCTP cross-ecosystem swaps (any signed-in user with a wallet). Refetches on
  // focus/interval so an in-flight swap flips from Pending to done on its own.
  const {
    data: cctpTransfers,
    isLoading: cctpLoading,
    mutate: mutateCctp,
  } = useSWR<CctpTransferRow[]>(
    walletAddress || solanaAddress || ethereumAddress || bitcoinAddress ? 'cctp-activity' : null,
    fetchCctpTransfers,
    { revalidateOnFocus: true, dedupingInterval: 20_000, refreshInterval: 30_000 }
  );
  useEffect(() => {
    // A plain send (chain-scoped event) cannot create or advance a CCTP
    // transfer — skip the refetch for those.
    const handler = (e: Event) => {
      if (chainOfActivityEvent(e)) return;
      setTimeout(() => mutateCctp(), 800);
    };
    window.addEventListener('nf:activity-updated', handler);
    return () => window.removeEventListener('nf:activity-updated', handler);
  }, [mutateCctp]);

  // Coinbase off-ramp statuses: keyed by our on-chain txHash so we can re-label
  // the matching native Sent row as an off-ramp with its real status.
  const { data: offrampStatuses, mutate: mutateOfframp } = useSWR<Record<string, OfframpInfo>>(
    // Any wallet (incl. Stellar for USDC/XLM off-ramps) — fetcher is a no-op
    // when there are no local off-ramp fills, so this is cheap.
    walletAddress || ethereumAddress || solanaAddress || bitcoinAddress
      ? 'coinbase-offramp-statuses'
      : null,
    fetchOfframpStatuses,
    { revalidateOnFocus: true, dedupingInterval: 20_000, refreshInterval: 30_000 }
  );

  // Refresh off-ramp statuses too when a send/settle just happened. This one
  // deliberately reacts to chain-scoped events as well: an off-ramp IS a plain
  // send (the modal marks the fill, the primitive announces it), and this
  // fetch is what re-labels the Sent row. Cheap — the fetcher is a no-op with
  // no local fills.
  useEffect(() => {
    const handler = () => setTimeout(() => mutateOfframp(), 800);
    window.addEventListener('nf:activity-updated', handler);
    return () => window.removeEventListener('nf:activity-updated', handler);
  }, [mutateOfframp]);

  // Cross-chain (LI.FI) swaps recorded under `lifi:` token refs stay pending
  // until the bridge delivers — fetch their live status so the feed can show
  // a Pending badge and flip to done on its own.
  const lifiSwaps = (data ?? []).filter(
    (a): a is Extract<Activity, { type: 'Swap' }> =>
      a.type === 'Swap' &&
      !!a.txHash &&
      (a.tokenIn.address?.startsWith('lifi:') || a.tokenOut.address?.startsWith('lifi:'))
  );
  const lifiKey = lifiSwaps.map((s) => s.txHash).join(',');

  const { data: swapStatuses } = useSWR<Record<string, string>>(
    lifiKey ? ['lifi-statuses', lifiKey] : null,
    async () => {
      const res = await fetch('/api/lifi/statuses', {
        method: 'POST',
        headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          swaps: lifiSwaps.map((s) => ({
            txHash: s.txHash,
            fromSymbol: s.tokenIn.symbol,
            toSymbol: s.tokenOut.symbol,
          })),
        }),
      });
      if (!res.ok) return {};
      const d = await res.json();
      return d?.statuses ?? {};
    },
    { revalidateOnFocus: true, dedupingInterval: 20_000, refreshInterval: 30_000 }
  );

  // A cross-chain swap is recorded as one "Swap" row (from SwapLog) whose
  // txHash is the SOURCE-chain transaction. The same tx also surfaces as a
  // raw "Sent" leg from that chain's history — suppress it so the swap shows
  // once, as a swap, not as a send.
  const swapTxHashes = new Set(
    (data ?? [])
      .filter((a): a is Extract<Activity, { type: 'Swap' }> => a.type === 'Swap' && !!a.txHash)
      .map((a) => a.txHash as string)
  );

  // Mark cross-chain swaps pending: pending unless LI.FI reports DONE. Before
  // a status comes back, treat recent (<1h) ones as pending (they just fired).
  const enrich = (a: Activity): Activity => {
    if (
      a.type === 'Swap' &&
      a.txHash &&
      (a.tokenIn.address?.startsWith('lifi:') || a.tokenOut.address?.startsWith('lifi:'))
    ) {
      // The tab that ran the swap knows the terminal state before the server
      // statuses cache (PENDING, 30s TTL) catches up — prefer its answer
      // (#62 follow-up: rows stayed "pending" right after delivery).
      const status = getLifiStatusOverride(a.txHash) ?? swapStatuses?.[a.txHash];
      const ageMs = Date.now() - a.timestamp;
      let pending = false;
      let failed = false;
      let refunded = false;
      if (status === 'DONE') {
        // settled
      } else if (status === 'REFUNDED') {
        refunded = true;
      } else if (status === 'FAILED') {
        failed = true;
      } else if (status === 'NOTFOUND') {
        // Source tx not on-chain: dead if it's had time to index, else new.
        if (ageMs > 600_000) failed = true;
        else pending = true;
      } else {
        // PENDING/unknown: in flight, unless stuck for hours.
        if (ageMs > 6 * 3_600_000) failed = true;
        else pending = true;
      }
      return { ...a, pending, failed, refunded };
    }
    return a;
  };

  // Re-label a native send to Coinbase as an off-ramp ("Sell") with its live
  // status, when our local fill maps this txHash to a Coinbase sell.
  const enrichOfframp = (a: Activity): Activity => {
    if (a.type === 'Sent' && a.txHash && offrampStatuses?.[a.txHash]) {
      const info = offrampStatuses[a.txHash];
      return { ...a, offramp: true, offrampStatus: info.status, offrampProvider: 'Coinbase' };
    }
    return a;
  };

  // CCTP swaps become coherent Swap rows; the raw on-chain delivery leg is
  // suppressed so each swap shows once. Two tiers:
  //  1. hashes we signed (burn / mint / src+dst swap) → exact txHash match.
  //  2. the destination-chain receive delivered by LI.FI's bridge (we have no
  //     hash for it) → heuristic: same asset + amount≈dstAmount within a window.
  // Skip transfers created before amount-tracking existed (null srcAmount) —
  // they'd render as a "0 → 0" swap; they remain as their historical raw leg.
  const cctpActivities = (cctpTransfers ?? []).filter((tr) => tr.srcAmount).map(mapCctpTransfer);
  const cctpLegHashes = new Set<string>();
  for (const tr of cctpTransfers ?? []) {
    for (const h of [tr.burnTxHash, tr.mintTxHash, tr.srcSwapTxHash, tr.dstSwapTxHash]) {
      if (h) cctpLegHashes.add(h);
    }
  }
  const cctpDeliveries = (cctpTransfers ?? [])
    .filter((tr) => tr.dstAmount)
    .map((tr) => ({
      symbol: tr.dstAsset.toUpperCase(),
      amount: parseFloat(tr.dstAmount as string),
      start: Date.parse(tr.createdAt),
    }));
  const isCctpDelivery = (a: Activity): boolean => {
    if (a.type !== 'Receive') return false;
    const sym = a.token.symbol.toUpperCase();
    const amt = a.token.amount;
    return cctpDeliveries.some(
      (d) =>
        d.symbol === sym &&
        Math.abs(d.amount - amt) <= Math.max(d.amount * 0.02, 1e-6) &&
        a.timestamp >= d.start - 5 * 60_000 &&
        a.timestamp <= d.start + 60 * 60_000
    );
  };

  // --- Pending sends (docs/audit/48-send-visibility-plan.md) ----------------
  // A just-broadcast send, visible before the chain's indexer has it. The
  // ledger row is dropped the moment any feed carries its hash — same
  // hash-dedupe idea as `swapTxHashes` above. Zero requests of its own: it
  // only watches data these SWRs already fetched.
  const pendingSends = useSyncExternalStore(
    subscribePendingSends,
    getPendingSends,
    getServerPendingSends
  );

  // Every hash the feeds know about this render, lowercased once.
  const knownFeedHashes = useMemo(
    () =>
      toHashSet(
        [
          ...(data ?? []),
          ...(stellarData ?? []),
          ...(btcData ?? []),
          ...(ethData ?? []),
          ...(solData ?? []),
        ].map((a) => ('txHash' in a ? a.txHash : null))
      ),
    [data, stellarData, btcData, ethData, solData]
  );

  // Retire reconciled/expired entries. In an effect, not in render — this
  // mutates the shared store and re-notifies subscribers.
  useEffect(() => {
    reconcilePendingSends(knownFeedHashes);
  }, [knownFeedHashes]);

  // Same-render defence: a hash that is already in a feed must not show twice
  // while the effect above is still queued.
  const pendingRows: Activity[] = pendingSends
    .filter((p) => !knownFeedHashes.has(p.txHash.toLowerCase()))
    .map((p) => ({
      // Chain is part of the id: the activity card derives the explorer link
      // from id prefixes, and an ETH hash opening in stellar.expert renders
      // an endless spinner (real bug, caught on staging within the hour).
      id: `pending-send:${p.chain}:${p.txHash}`,
      timestamp: p.createdAt,
      type: 'Sent',
      address: p.destination,
      token: {
        address: '',
        symbol: p.symbol,
        iconUrl: getCryptoIconUrl(p.symbol),
        amount: parseFloat(p.amount) || 0,
      },
      txHash: p.txHash,
      // The exact shape the card already renders with a Pending badge.
      confirmed: false,
    }));

  const recentActivity = [
    ...pendingRows,
    ...(data ?? []),
    ...cctpActivities,
    ...(mgiData ?? []),
    ...(stellarData ?? []),
    ...(btcData ?? []),
    ...(ethData ?? []),
    ...(solData ?? []),
  ]
    .filter(
      (a) =>
        !(
          (a.type === 'Sent' || a.type === 'Receive') &&
          a.txHash &&
          (swapTxHashes.has(a.txHash) || cctpLegHashes.has(a.txHash))
        )
    )
    .filter((a) => !isCctpDelivery(a))
    .map(enrich)
    .map(enrichOfframp)
    .sort((a, b) => b.timestamp - a.timestamp);

  // The feed merges eight sources that resolve independently. Reporting only
  // the wallet-activity call as "loading" is what makes rows pop in one chain
  // at a time (BTC/ETH/SOL first, XLM/USDC after) — consumers drop their
  // skeleton while half the sources are still in flight. Report loading until
  // every source we actually asked for has produced its first result; SWR also
  // clears these on error, so a failing provider can't pin the skeleton open.
  const anySourceLoading =
    (Boolean(key) && isLoading) ||
    stellarLoading ||
    btcLoading ||
    ethLoading ||
    solLoading ||
    cctpLoading;

  return {
    recentActivity,
    isLoading: anySourceLoading,
    error,
    mutate,
  };
}
