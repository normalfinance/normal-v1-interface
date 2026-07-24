'use client';

// Client access to OUR MoneyGram transaction records (/api/mgi/transactions)
// and the report-back that keeps them fresh. MoneyGram is the source of truth;
// these rows exist so views can render MGI history without a SEP-10 ceremony.

import { buildAuthHeaders } from '@/utils/http';

import { getTransaction } from './history';
import { getMgiAuthToken } from './client';

/** Mirror a freshly-fetched MoneyGram status into our DB row. Best-effort —
 *  the mirror failing must never break the flow that fetched the status. */
export async function reportMgiStatus(
  id: string,
  patch: { status?: string; externalTransactionId?: string }
) {
  try {
    const headers = await buildAuthHeaders();
    await fetch(`/api/mgi/transactions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify(patch),
    });
  } catch {
    /* best-effort mirror */
  }
}

/** Fetch fresh state from MoneyGram (SEP-10-gated) and mirror it into our DB.
 *  May prompt a passkey when no token is cached — only call from explicit user
 *  actions or right after a flow that just authenticated. */
export async function refreshMgiStatus(account: string, id: string) {
  const token = await getMgiAuthToken(account);
  const tx = (await getTransaction(id, token)) as any;
  const status = tx?.status ? String(tx.status) : undefined;
  const externalTransactionId = tx?.external_transaction_id
    ? String(tx.external_transaction_id)
    : undefined;
  if (status || externalTransactionId) {
    await reportMgiStatus(id, { status, externalTransactionId });
  }
  return tx;
}
