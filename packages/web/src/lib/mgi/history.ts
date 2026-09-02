import { buildAuthHeaders } from '@/utils/http';

import type { Sep24SingleResponse } from './types';

// Single-transaction lookup against MoneyGram (via our [id] proxy). History
// LISTS render from our own DB (/api/mgi/transactions) — MoneyGram's list API
// returns every abandoned 'incomplete' attempt and needs a SEP-10 ceremony,
// so we stopped consuming it when the /rewards page was removed.

export async function getTransaction(id: string, authToken?: string) {
  const url = `/api/mgi/sep24/transactions/proxy/${encodeURIComponent(id)}`;

  const headers = { ...(await buildAuthHeaders()) } as Record<string, string>;
  // SEP-10 token rides in its own header — Authorization stays the Supabase token.
  if (authToken) headers['x-mgi-token'] = authToken;

  const r = await fetch(url, {
    headers,
    credentials: 'include',
    cache: 'no-store',
  });
  if (!r.ok) {
    if (r.status === 401) {
      // SEP-10 token expired — drop it so the NEXT attempt re-authenticates
      // instead of failing every poll forever (doc 90 W2).
      const { clearMgiToken } = await import('./client');
      clearMgiToken();
    }
    throw new Error(`history get failed: ${r.status}`);
  }
  const data = (await r.json()) as Sep24SingleResponse;
  return data.transaction;
}
