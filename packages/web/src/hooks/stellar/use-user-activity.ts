import type { Activity } from '@/types/activity';
import type { WalletActivityItem, WalletActivityResponse } from '@/types/wallet-activity';

import useSWR from 'swr';
import { useEffect } from 'react';
import { Horizon } from '@stellar/stellar-sdk';
import { buildAuthHeaders } from '@/utils/http';
import { listTransactions } from '@/lib/mgi/history';
import { cdn, constants, getCryptoIconUrl } from '@normalfinance/utils';

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
    pending: tr.status !== 'COMPLETED' && tr.status !== 'FAILED',
    failed: tr.status === 'FAILED',
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

const EXCLUDED_MGI_STATUSES = new Set(['incomplete', 'error', 'no_market', 'too_small', 'too_large', 'expired']);
const FEES_WALLET = 'GCVCVOJMNDX7DBYEN3YAJ2VWIHT4ZDUNSUFIRLHRQBKS7PXSTDRB4MWE';

async function fetchMgiActivity(): Promise<Activity[]> {
  try {
    const transactions = await listTransactions();
    return transactions
      .filter((tx) => !EXCLUDED_MGI_STATUSES.has(tx.status))
      .map((tx): Activity => {
        const timestamp = Date.parse(tx.completed_at ?? tx.updated_at ?? tx.started_at);
        const amount = parseFloat(tx.amount_out?.amount ?? tx.amount_in?.amount ?? '0');
        if (tx.kind === 'deposit') {
          return {
            id: `mgi:${tx.id}`,
            timestamp,
            type: 'Buy',
            symbol: 'USDC',
            iconUrl: getCryptoIconUrl('USDC'),
            amount,
            provider: 'MoneyGram',
          };
        }
        return {
          id: `mgi:${tx.id}`,
          timestamp,
          type: 'Sell',
          symbol: 'USDC',
          iconUrl: getCryptoIconUrl('USDC'),
          amount,
          provider: 'MoneyGram',
        };
      });
  } catch {
    return [];
  }
}

async function fetchStellarPayments(walletAddress: string): Promise<Activity[]> {
  try {
    const config = constants.StellarConfig;
    const server = new Horizon.Server(config.HORIZON_URL, {
      allowHttp: config.HORIZON_URL.startsWith('http://'),
    });

    const payments = await server
      .payments()
      .forAccount(walletAddress)
      .order('desc')
      .limit(100)
      .call();

    const activities: Activity[] = [];

    for (const record of payments.records) {
      if (record.type !== 'payment') continue;
      const p = record as Horizon.ServerApi.PaymentOperationRecord;

      const isNative = p.asset_type === 'native';
      const isUsdc = p.asset_code === 'USDC' && p.asset_issuer === config.USDC_ISSUER;
      if (!isNative && !isUsdc) continue;
      if (p.to === FEES_WALLET) continue;

      const symbol = isNative ? 'XLM' : 'USDC';
      const timestamp = Date.parse(p.created_at);
      const amount = parseFloat(p.amount);
      const isReceive = p.to === walletAddress;

      activities.push({
        id: `horizon:${p.id}`,
        timestamp,
        type: isReceive ? 'Receive' : 'Sent',
        address: isReceive ? p.from : p.to,
        txHash: (p as any).transaction_hash ?? null,
        token: {
          address: isNative ? 'native' : (p.asset_code ?? 'USDC'),
          symbol,
          iconUrl: getCryptoIconUrl(symbol),
          amount,
        },
      });
    }

    return activities;
  } catch {
    return [];
  }
}

async function fetchBtcActivity(bitcoinAddress: string): Promise<Activity[]> {
  try {
    // Fetch confirmed+recent txs AND mempool-only txs in parallel.
    // /txs returns up to 25 recent transactions and can drop older unconfirmed
    // ones as new confirmed txs come in. /txs/mempool always contains every
    // current unconfirmed tx — use it as the authoritative pending source.
    const [txsRes, mempoolRes] = await Promise.all([
      fetch(`https://mempool.space/api/address/${bitcoinAddress}/txs`),
      fetch(`https://mempool.space/api/address/${bitcoinAddress}/txs/mempool`),
    ]);
    if (!txsRes.ok) return [];
    const txs: any[] = await txsRes.json();
    const mempoolTxs: any[] = mempoolRes.ok ? await mempoolRes.json() : [];

    // Authoritative set of txids that are currently unconfirmed
    const mempoolIds = new Set<string>(mempoolTxs.map((t: any) => t.txid as string));

    // Merge: /txs results first, then any mempool txs not already included
    const txMap = new Map<string, any>();
    for (const tx of txs) txMap.set(tx.txid, tx);
    for (const tx of mempoolTxs) {
      if (!txMap.has(tx.txid)) txMap.set(tx.txid, tx);
    }
    const allTxs = Array.from(txMap.values());

    const activities: Activity[] = [];

    for (const tx of allTxs) {
      const txid: string = tx.txid;
      // Use mempool endpoint as ground-truth for unconfirmed status
      const isConfirmed = mempoolIds.has(txid) ? false : (tx.status?.confirmed ?? false);
      const timestamp: number = isConfirmed
        ? (tx.status?.block_time as number) * 1000
        : Date.now();

      const userInputs: any[] = tx.vin.filter(
        (v: any) => v.prevout?.scriptpubkey_address === bitcoinAddress
      );
      const nonUserOutputs: any[] = tx.vout.filter(
        (v: any) => v.scriptpubkey_address !== bitcoinAddress
      );
      const userOutputs: any[] = tx.vout.filter(
        (v: any) => v.scriptpubkey_address === bitcoinAddress
      );

      const isFromUser = userInputs.length > 0;
      const sentToOthers: number = nonUserOutputs.reduce((s: number, v: any) => s + v.value, 0);
      const receivedByUser: number = userOutputs.reduce((s: number, v: any) => s + v.value, 0);
      const btcIcon = cdn('tokens/bitcoin.webp');

      if (isFromUser && sentToOthers > 0) {
        activities.push({
          id: `btc:${txid}`,
          timestamp,
          type: 'Sent',
          address: nonUserOutputs[0]?.scriptpubkey_address ?? txid,
          txHash: txid,
          confirmed: isConfirmed,
          token: {
            address: '__btc__',
            symbol: 'BTC',
            iconUrl: btcIcon,
            amount: sentToOthers / 1e8,
          },
        });
      } else if (receivedByUser > 0) {
        const senderAddress = isFromUser
          ? bitcoinAddress
          : (tx.vin[0]?.prevout?.scriptpubkey_address ?? txid);
        activities.push({
          id: `btc:${txid}`,
          timestamp,
          type: 'Receive',
          address: senderAddress,
          txHash: txid,
          confirmed: isConfirmed,
          token: {
            address: '__btc__',
            symbol: 'BTC',
            iconUrl: btcIcon,
            amount: receivedByUser / 1e8,
          },
        });
      }
    }

    return activities;
  } catch {
    return [];
  }
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

export function useUserActivity(
  walletAddress: string | null | undefined,
  bitcoinAddress?: string | null,
  ethereumAddress?: string | null,
  solanaAddress?: string | null
): {
  recentActivity: Activity[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
} {
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
    const handler = () => {
      setTimeout(() => {
        mutate();
      }, 800);
    };
    window.addEventListener('nf:activity-updated', handler);
    return () => window.removeEventListener('nf:activity-updated', handler);
  }, [mutate]);

  const { data: mgiData } = useSWR<Activity[]>(
    walletAddress ? 'mgi-activity' : null,
    fetchMgiActivity,
    { revalidateOnFocus: true, dedupingInterval: 30_000 }
  );

  const { data: stellarData } = useSWR<Activity[]>(
    walletAddress ? ['stellar-payments', walletAddress] : null,
    ([, addr]) => fetchStellarPayments(addr as string),
    { revalidateOnFocus: true, dedupingInterval: 60_000 }
  );

  const { data: btcData } = useSWR<Activity[]>(
    bitcoinAddress ? ['btc-activity', bitcoinAddress] : null,
    ([, addr]) => fetchBtcActivity(addr as string),
    { revalidateOnFocus: true, dedupingInterval: 15_000 }
  );

  const { data: ethData } = useSWR<Activity[]>(
    ethereumAddress ? `/api/activity/ethereum?address=${ethereumAddress}` : null,
    fetchChainActivity,
    { revalidateOnFocus: true, dedupingInterval: 30_000 }
  );

  const { data: solData } = useSWR<Activity[]>(
    solanaAddress ? `/api/activity/solana?address=${solanaAddress}` : null,
    fetchChainActivity,
    { revalidateOnFocus: true, dedupingInterval: 30_000 }
  );

  // CCTP cross-ecosystem swaps (any signed-in user with a wallet). Refetches on
  // focus/interval so an in-flight swap flips from Pending to done on its own.
  const { data: cctpTransfers, mutate: mutateCctp } = useSWR<CctpTransferRow[]>(
    walletAddress || solanaAddress || ethereumAddress || bitcoinAddress ? 'cctp-activity' : null,
    fetchCctpTransfers,
    { revalidateOnFocus: true, dedupingInterval: 20_000, refreshInterval: 30_000 }
  );
  useEffect(() => {
    const handler = () => setTimeout(() => mutateCctp(), 800);
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

  // Refresh off-ramp statuses too when a send/settle just happened.
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
        headers: { 'Content-Type': 'application/json' },
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
      const status = swapStatuses?.[a.txHash];
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

  const recentActivity = [
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

  return {
    recentActivity,
    isLoading: Boolean(key) && isLoading,
    error,
    mutate,
  };
}
