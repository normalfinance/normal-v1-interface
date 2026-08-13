'use client';

import type { ChainId } from '@/lib/chains/registry';

// ---------------------------------------------------------------------------
// Ledger of in-flight sends, so a just-broadcast transaction is visible in the
// activity feed before the chain's indexer has it. See
// docs/audit/48-send-visibility-plan.md.
//
// Client state on purpose: a pending send is one user's ephemeral UI state,
// not a shared expensive read, so a server cache is the wrong tool. Persisted
// to localStorage because a Bitcoin send can stay pending for hours — it must
// survive a reload.
//
// This module does NO polling and makes NO requests. Entries are removed when
// the regular activity feed happens to contain their hash (reconcile below),
// or when they expire.
// ---------------------------------------------------------------------------

export interface PendingSend {
  txHash: string;
  chain: ChainId;
  symbol: string;
  /** Display amount in coin units, e.g. "5" for 5 XLM. */
  amount: string;
  destination: string;
  createdAt: number;
  /** Set the moment the CHAIN confirms the send (#66 follow-up). The row
   *  keeps showing in the activity feed until the indexer catches up, but
   *  spendable math must stop subtracting it — the on-chain balance already
   *  reflects the send, and Etherscan's indexing lag (minutes) would
   *  otherwise double-count the amount against MAX. */
  confirmedAt?: number;
}

const STORAGE_KEY = 'nf:pending-sends:v1';

// How long an entry may live if nothing ever reconciles it. Generous on
// purpose — expiry is the backstop for a feed outage, not the normal path.
// Bitcoin's window matches how long a low-fee tx can realistically sit
// unconfirmed; Ethereum's covers Etherscan indexing lag with room to spare.
const EXPIRY_MS: Record<ChainId, number> = {
  stellar: 10 * 60_000,
  solana: 10 * 60_000,
  ethereum: 2 * 3_600_000,
  bitcoin: 48 * 3_600_000,
};

const EMPTY: PendingSend[] = [];

let entries: PendingSend[] | null = null; // hydrated lazily
let snapshot: PendingSend[] = EMPTY; // stable ref for useSyncExternalStore
const listeners = new Set<() => void>();

function hydrate(): PendingSend[] {
  if (entries !== null) return entries;
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    entries = raw ? (JSON.parse(raw) as PendingSend[]) : [];
  } catch {
    entries = [];
  }
  entries = pruneExpired(entries);
  snapshot = entries;
  return entries;
}

function pruneExpired(list: PendingSend[]): PendingSend[] {
  const now = Date.now();
  return list.filter((e) => now - e.createdAt < (EXPIRY_MS[e.chain] ?? 3_600_000));
}

function commit(next: PendingSend[]): void {
  entries = next;
  snapshot = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota — the in-memory copy still works for this session */
  }
  listeners.forEach((l) => l());
}

/** Case-insensitive on purpose: hex hashes (Stellar/BTC/ETH) vary in casing
 *  between our broadcast result and the indexer's response. Solana signatures
 *  are base58 (case-sensitive), but a case-folded collision between two of the
 *  same user's own transactions is not a realistic event. */
const hashKey = (h: string): string => h.toLowerCase();

export function addPendingSend(entry: Omit<PendingSend, 'createdAt'>): void {
  const list = hydrate();
  if (list.some((e) => hashKey(e.txHash) === hashKey(entry.txHash))) return;
  commit([...pruneExpired(list), { ...entry, createdAt: Date.now() }]);
}

/** Mark a send as chain-confirmed (called by the confirmation watcher). The
 *  row stays for activity display until reconciled; only its spendable
 *  contribution ends. */
export function markSendConfirmed(txHash: string): void {
  const list = hydrate();
  const key = hashKey(txHash);
  let changed = false;
  const next = list.map((e) => {
    if (hashKey(e.txHash) === key && !e.confirmedAt) {
      changed = true;
      return { ...e, confirmedAt: Date.now() };
    }
    return e;
  });
  if (changed) commit(next);
}

/** Drop every entry whose hash appears in `knownHashes` (the activity feed has
 *  it now), plus anything expired. Called whenever feed data changes. */
export function reconcilePendingSends(knownHashes: ReadonlySet<string>): void {
  const list = hydrate();
  if (list.length === 0) return;
  const next = pruneExpired(list).filter((e) => !knownHashes.has(hashKey(e.txHash)));
  if (next.length !== list.length) commit(next);
}

/** Build the comparison set for reconcile — lowercased once, here, so callers
 *  cannot forget. */
export function toHashSet(hashes: Iterable<string | null | undefined>): Set<string> {
  const set = new Set<string>();
  for (const h of hashes) if (h) set.add(hashKey(h));
  return set;
}

// --- React subscription (useSyncExternalStore contract) ---------------------

export function getPendingSends(): PendingSend[] {
  // First call hydrates from localStorage (a pending BTC send must survive a
  // reload); after that the snapshot is referentially stable between
  // mutations, as useSyncExternalStore requires.
  if (entries === null) hydrate();
  return snapshot;
}

export function getServerPendingSends(): PendingSend[] {
  return EMPTY;
}

export function subscribePendingSends(listener: () => void): () => void {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Cross-tab: another tab adding/removing a send updates this one too.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    entries = null; // re-hydrate from the new stored value on next read
    hydrate();
    listeners.forEach((l) => l());
  });
}
