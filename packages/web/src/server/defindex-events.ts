// ---------------------------------------------------------------------------
// Shared DeFindex vault-events access (#53). Extracted from the user-position
// route so the earnings-history route reads the SAME source the reconciler
// trusts — one fetcher, one normalizer, no drift.
// ---------------------------------------------------------------------------

const DEFINDEX_API_BASE = 'https://api.defindex.io';

export async function fetchAllVaultEvents(
  walletAddress: string,
  vaultAddress: string,
  network: string,
  apiKey: string | undefined
): Promise<any[]> {
  const PAGE_SIZE = 200;
  const allEvents: any[] = [];
  let offset = 0;

  while (true) {
    const url = new URL(
      `${DEFINDEX_API_BASE}/account/${walletAddress}/vault/${vaultAddress}/events`
    );
    url.searchParams.set('network', network);
    url.searchParams.set('limit', String(PAGE_SIZE));
    url.searchParams.set('offset', String(offset));

    const res = await fetch(url.toString(), {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`DeFindex events API ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const events: any[] = data.events ?? [];
    allEvents.push(...events);

    const total: number = data.pagination?.total ?? events.length;
    offset += events.length;

    if (offset >= total || events.length < PAGE_SIZE) break;
  }

  return allEvents;
}

export interface SavingsHistoryEvent {
  type: 'deposit' | 'withdraw';
  /** Human USDC units. */
  amount: number;
  /** ms epoch. */
  timestamp: number;
}

const DECIMALS = 1e7;

/** Normalize raw upstream events into the chart's shape. Field names vary
 *  across API versions — every candidate is tried; events with no usable
 *  timestamp or amount are DROPPED (an unplottable event must not become a
 *  fabricated point). */
export function normalizeVaultEvents(raw: any[]): SavingsHistoryEvent[] {
  const out: SavingsHistoryEvent[] = [];
  for (const e of raw) {
    const typeRaw = String(e.eventType ?? e.type ?? '').toLowerCase();
    if (typeRaw !== 'deposit' && typeRaw !== 'withdraw') continue;
    const amountRaw = Number(
      e.amount ?? e.assetAmount ?? e.assets?.[0]?.amount ?? e.underlyingAmount ?? NaN
    );
    if (!Number.isFinite(amountRaw) || amountRaw <= 0) continue;
    const tsRaw = e.date ?? e.createdAt ?? e.timestamp ?? e.ledgerCloseTime ?? null;
    const ts =
      typeof tsRaw === 'number' ? (tsRaw < 1e12 ? tsRaw * 1000 : tsRaw) : Date.parse(String(tsRaw));
    if (!Number.isFinite(ts)) continue;
    out.push({ type: typeRaw, amount: amountRaw / DECIMALS, timestamp: ts });
  }
  return out.sort((a, b) => a.timestamp - b.timestamp);
}
