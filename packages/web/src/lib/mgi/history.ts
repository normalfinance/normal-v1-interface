import type { Sep24ListResponse, Sep24SingleResponse } from './types';

const isMock = process.env.NEXT_PUBLIC_MGI_MOCK === '1';

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

  const url = isMock
    ? `/api/mgi/sep24/transactions?${params.toString()}`
    : `/api/mgi/sep24/transactions/proxy?${params.toString()}`;

  const r = await fetch(url, {
    headers: !isMock && opts?.authToken ? { Authorization: `Bearer ${opts.authToken}` } : {},
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`history list failed: ${r.status}`);
  const data = (await r.json()) as Sep24ListResponse;
  return data.transactions;
}

export async function getTransaction(id: string, authToken?: string) {
  const url = isMock
    ? `/api/mgi/sep24/transaction/${encodeURIComponent(id)}`
    : `/api/mgi/sep24/transaction/proxy/${encodeURIComponent(id)}`;

  const r = await fetch(url, {
    headers: !isMock && authToken ? { Authorization: `Bearer ${authToken}` } : {},
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`history get failed: ${r.status}`);
  const data = (await r.json()) as Sep24SingleResponse;
  return data.transaction;
}
