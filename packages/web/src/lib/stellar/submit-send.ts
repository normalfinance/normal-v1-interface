'use client';

import type { Horizon } from '@stellar/stellar-sdk';

import { authedFetch } from '@/utils/authed-fetch';
import { awaitOnChain } from '@/lib/stellar/fee-pair';

/**
 * A signed send through /api/send/stellar, for accounts with 2FA. Throws the
 * same shape Horizon does, so the caller's error handling can't tell the paths
 * apart.
 */
export async function submitSendThroughServer(
  server: Horizon.Server,
  signedXdr: string,
  hash: string
): Promise<{ hash: string }> {
  let response: Response | null = null;
  try {
    response = await authedFetch('/api/send/stellar', {
      method: 'POST',
      body: JSON.stringify({ signedXdr }),
    });
  } catch {
    /* the request died, which says nothing about the send */
  }

  if (response && response.status < 500) {
    const data = await response.json().catch(() => null);
    if (response.ok && data?.hash) return { hash: data.hash };
    throw Object.assign(new Error(data?.error ?? 'Transaction submission failed'), {
      response: { data: { extras: { result_codes: data?.resultCodes } } },
    });
  }

  // No verdict, so the chain is the only witness. Retrying blind could send twice.
  const status = await awaitOnChain(server, hash);
  if (status === 'success') return { hash };
  if (status === 'failed') throw new Error('Transaction failed on-chain.');
  throw new Error(
    'Could not confirm the send. Check your activity in a minute — if nothing appears, it is safe to try again.'
  );
}
