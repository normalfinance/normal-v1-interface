import { buildAuthHeaders } from '@/utils/http';

import type { Sep24ListResponse, Sep24SingleResponse } from './types';

export async function listTransactions(opts?: {
  account?: string;
  kind?: 'deposit' | 'withdrawal';
  status?: string;
  authToken?: string;
}) {
  const params = new URLSearchParams();
  if (opts?.account) params.set('account', opts.account);
  if (opts?.kind) params.set('kind', opts.kind);
  if (opts?.status) params.set('status', opts.status);

  const url = `/api/mgi/sep24/transactions/proxy?${params.toString()}`;

  const headers = { ...(await buildAuthHeaders()) } as Record<string, string>;
  // SEP-10 token rides in its own header — Authorization stays the Supabase
  // token. (This was missing: the proxy used to forward the Supabase JWT to
  // MoneyGram as the SEP-10 Bearer, so every list call 502'd.)
  if (opts?.authToken) headers['x-mgi-token'] = opts.authToken;
  const r = await fetch(url, {
    headers,
    credentials: 'include',
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`history list failed: ${r.status}`);
  const data = (await r.json()) as Sep24ListResponse;
  return data.transactions;
}

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
  if (!r.ok) throw new Error(`history get failed: ${r.status}`);
  const data = (await r.json()) as Sep24SingleResponse;
  return data.transaction;
}
