'use client';

import type {
  Deliveries,
  PurchaseRead,
  CoinDelivery,
  PurchaseLegRead,
  PurchaseStanding,
} from '@/sections/crypto-index/purchase-journey';

import useSWR from 'swr';
import { buildAuthHeaders } from '@/utils/http';
import { readBridgeStatus } from '@/lib/flow/lifi-status';
import { heldSymbolOf, INDEX_DIRECTION } from '@/lib/index/legs';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { purchaseStatus } from '@/sections/crypto-index/purchase-journey';
import { LIFI_CHAIN_IDS, BASE_LIFI_CHAIN_ID } from '@/lib/lifi/chain-ids';

// ---------------------------------------------------------------------------
// Following an index purchase after its page closed (Niko 2026-11-10): its
// saved row and coins (each read also moves Circle's part forward on the
// server), and each coin's delivery, asked of LI.FI the way the purchase page
// asks it live. Bitcoin's own payment is asked of its network too: it is in
// the wallet's balance only once confirmed (lib/portfolio/btc-balance.ts).
//
// A coin that has settled (arrived and confirmed, or sent back) is kept for the
// tab and never asked about again, so a finished purchase costs nothing.
// ---------------------------------------------------------------------------

type LifiCoin = keyof typeof LIFI_CHAIN_IDS;

const settled = new Map<string, CoinDelivery>();
const finished = new Set<string>();

async function readPurchase(
  id: string,
  headers: HeadersInit
): Promise<PurchaseRead | 'missing' | null> {
  try {
    const res = await fetch(`/api/index/purchases/${id}`, { headers, credentials: 'include' });
    if (res.status === 404) return 'missing';
    return res.ok ? ((await res.json()) as PurchaseRead) : null;
  } catch {
    return null;
  }
}

async function bitcoinConfirmed(txid: string): Promise<boolean | null> {
  try {
    const res = await fetch(`https://mempool.space/api/tx/${txid}/status`);
    if (!res.ok) return null;
    return !!(await res.json())?.confirmed;
  } catch {
    return null;
  }
}

async function readDelivery(
  leg: PurchaseLegRead,
  headers: HeadersInit
): Promise<CoinDelivery | undefined> {
  const hash = leg.dstSwapTxHash;
  const toChain = LIFI_CHAIN_IDS[leg.symbol as LifiCoin];
  if (!hash || leg.status !== 'SENT' || !toChain) return undefined;
  const kept = settled.get(hash);
  if (kept) return kept;
  try {
    const q = new URLSearchParams({
      txHash: hash,
      fromChain: String(BASE_LIFI_CHAIN_ID),
      toChain: String(toChain),
    });
    const res = await fetch(`/api/lifi/status?${q}`, { headers });
    if (!res.ok) return undefined;
    const progress = readBridgeStatus((await res.json())?.status);
    let delivery: CoinDelivery = {
      phase: progress.phase,
      receivingTxHash: progress.receivingTxHash,
    };
    // Bitcoin is in the balance once its network confirms it: until then, or
    // while that can't be asked, it is confirming (and asked again).
    if (delivery.phase === 'delivered' && leg.symbol === 'BTC' && delivery.receivingTxHash) {
      if ((await bitcoinConfirmed(delivery.receivingTxHash)) !== true) {
        delivery = { ...delivery, phase: 'confirming' };
      }
    }
    if (['delivered', 'refunded', 'failed'].includes(delivery.phase)) settled.set(hash, delivery);
    return delivery;
  } catch {
    return undefined;
  }
}

async function readDeliveries(legs: PurchaseLegRead[], headers: HeadersInit): Promise<Deliveries> {
  const entries = await Promise.all(
    legs.map(async (leg) => [leg.symbol, await readDelivery(leg, headers)] as const)
  );
  return Object.fromEntries(entries);
}

/** One purchase, followed while its page is open: every 15 seconds until it ends. */
export function useIndexPurchase(id: string) {
  const { user } = useSupabaseAuth();
  const { data, mutate } = useSWR(
    user ? (['index-purchase', id] as const) : null,
    async () => {
      const headers = await buildAuthHeaders();
      const read = await readPurchase(id, headers);
      if (read === 'missing') return { missing: true as const };
      if (!read) throw new Error('The purchase could not be read');
      return {
        missing: false as const,
        read,
        deliveries: await readDeliveries(read.legs, headers),
      };
    },
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      refreshInterval: (latest) => {
        if (!latest || latest.missing) return 0;
        const { standing } = purchaseStatus(latest.read, latest.deliveries);
        return standing === 'on-its-way' || standing === 'needs-you' ? 15_000 : 0;
      },
    }
  );
  return {
    read: data && !data.missing ? data.read : null,
    deliveries: data && !data.missing ? data.deliveries : {},
    missing: !!data?.missing,
    refresh: () => mutate(),
  };
}

export interface PurchaseInProgress {
  id: string;
  /** Its index (quoteJson.index): which page it belongs to. */
  indexId: string | null;
  amountWire: string;
  standing: PurchaseStanding;
  stage: 'circle' | 'buying' | 'delivering' | null;
  heldCoin: string | null;
  arrived: string[];
}

interface TransferRow {
  id: string;
  direction: string;
  status: string;
  amountWire: string;
  burnTxHash: string | null;
  errorDetail: string | null;
  quoteJson?: string | null;
  createdAt: string;
}

/** Recent purchases are followed; an older one only while a coin waits on the person. */
const FOLLOW_FOR_MS = 2 * 24 * 3_600_000;

const indexIdOf = (row: TransferRow) => {
  try {
    const id = row.quoteJson ? JSON.parse(row.quoteJson)?.index : null;
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
};

/**
 * The person's index purchases still under way, for the Indexes pages' "In
 * progress" list: every 30 seconds while there is one, never otherwise.
 */
export function useIndexPurchasesInProgress(): PurchaseInProgress[] {
  const { user } = useSupabaseAuth();
  const { data } = useSWR(
    user ? (['index-purchases-in-progress', user.id] as const) : null,
    async () => {
      const headers = await buildAuthHeaders();
      const res = await fetch('/api/cctp/transfers?history=1', { headers, credentials: 'include' });
      if (!res.ok) throw new Error('Transfers could not be read');
      const rows: TransferRow[] = (await res.json())?.transfers ?? [];
      const now = Date.now();
      const candidates = rows.filter(
        (row) =>
          row.direction === INDEX_DIRECTION &&
          !!row.burnTxHash &&
          row.status !== 'FAILED' &&
          row.status !== 'REFUNDED' &&
          !finished.has(row.id) &&
          (!!heldSymbolOf(row.errorDetail) || now - Date.parse(row.createdAt) < FOLLOW_FOR_MS)
      );
      const followed = await Promise.all(
        candidates.map(async (row): Promise<PurchaseInProgress | null> => {
          const read = await readPurchase(row.id, headers);
          if (!read || read === 'missing') return null;
          const deliveries = await readDeliveries(read.legs, headers);
          const journey = purchaseStatus(read, deliveries);
          if (journey.standing !== 'on-its-way' && journey.standing !== 'needs-you') {
            finished.add(row.id);
            return null;
          }
          return {
            id: row.id,
            indexId: indexIdOf(row),
            amountWire: row.amountWire,
            standing: journey.standing,
            stage: journey.stage,
            heldCoin: journey.heldCoin,
            arrived: journey.arrived,
          };
        })
      );
      return followed.filter((p): p is PurchaseInProgress => !!p);
    },
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      refreshInterval: (latest) => (latest?.length ? 30_000 : 0),
    }
  );
  return data ?? [];
}
