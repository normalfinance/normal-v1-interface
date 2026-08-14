'use client';

import { buildAuthHeaders } from '@/utils/http';

// ---------------------------------------------------------------------------
// #24 — client access to DB-backed off-ramp fills (see api/offramp/fills).
//
// Replaces the localStorage map ('nf:cb-offramp-fills'). Semantics preserved:
//   fills[providerTxnId] === 'pending' → claimed, send in progress
//   fills[providerTxnId] === <hash>    → fulfilled on-chain
//   absent                             → not ours / not started
//
// One-time migration: any entries still in localStorage (in-flight sales from
// before this deploy, or written by an old bundle mid-rollout) are pushed to
// the DB on first fetch, then the local key is retired.
// ---------------------------------------------------------------------------

const LEGACY_KEY = 'nf:cb-offramp-fills';

export type OfframpFills = Record<string, string>;

let migrated = false;

async function migrateLegacy(): Promise<void> {
  if (migrated || typeof window === 'undefined') return;
  migrated = true;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const legacy = JSON.parse(raw) as Record<string, string>;
    const headers = await buildAuthHeaders();
    for (const [providerTxnId, value] of Object.entries(legacy)) {
      await fetch('/api/offramp/fills', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerTxnId,
          ...(value && value !== 'pending' ? { txHash: value } : {}),
        }),
      });
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Migration is best-effort; the entries stay local and retry next load.
    migrated = false;
  }
}

/** All of this user's fills. Network failure → {} (callers already treat an
 *  absent entry as "not ours", which is the safe direction: worst case the
 *  modal re-offers a sale the user can decline). */
export async function fetchOfframpFills(): Promise<OfframpFills> {
  try {
    await migrateLegacy();
    const headers = await buildAuthHeaders();
    const res = await fetch('/api/offramp/fills', { headers });
    if (!res.ok) return {};
    const data = await res.json();
    const map: OfframpFills = {};
    for (const f of data.fills ?? []) {
      map[f.providerTxnId] = f.txHash ?? 'pending';
    }
    return map;
  } catch {
    return {};
  }
}

/** Claim ('pending') or complete (real hash) a fill. */
export async function saveOfframpFill(providerTxnId: string, value: string): Promise<void> {
  try {
    const headers = await buildAuthHeaders();
    await fetch('/api/offramp/fills', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerTxnId,
        ...(value && value !== 'pending' ? { txHash: value } : {}),
      }),
    });
  } catch {
    /* claim is re-attempted on the next open; the DB upsert is idempotent */
  }
}

/** Release an unfulfilled claim (the send failed — user can retry). */
export async function removeOfframpFill(providerTxnId: string): Promise<void> {
  try {
    const headers = await buildAuthHeaders();
    await fetch('/api/offramp/fills', {
      method: 'DELETE',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerTxnId }),
    });
  } catch {
    /* worst case the claim lingers; the modal's balance filter still guards */
  }
}
