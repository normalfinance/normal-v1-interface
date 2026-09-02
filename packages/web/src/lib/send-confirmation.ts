'use client';

import { ETH_RPC_URL, SOL_RPC_URL } from '@/hooks/use-chain-portfolio';

// ---------------------------------------------------------------------------
// #62: confirmation-driven balance refresh for ETH/SOL sends.
//
// The old timer-guess refreshes (0s/+8s/+45s) raced the chain: the 0s shot
// read the OLD balance and its server-side bypass floor then swallowed the
// +8s shot — so the balance often stayed stale until +45s ("needed a few
// refreshes", Niko 2026-08-12). This watcher polls the chain DIRECTLY
// (public RPC — no server cache, no floor) and reports the moment the
// transaction is confirmed: that is the one moment a refresh is guaranteed
// to read the NEW balance, so one refresh is enough.
//
// Bounded by design: SOL confirms in ~2s (cap 60s), ETH in ~15-30s (cap
// 90s). One watcher per user send, never a background poller. Outcomes past
// the cap are the server reconciler's job (#29 send_logs) — this watcher is
// UX freshness, not record truth.
// ---------------------------------------------------------------------------

export type SendOutcome = 'confirmed' | 'failed' | 'timeout';

const ETH_POLL_MS = 5_000;
const ETH_POLL_MAX = 18; // 90s
const SOL_POLL_MS = 2_000;
const SOL_POLL_MAX = 30; // 60s

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function rpc(url: string, method: string, params: unknown[]): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`rpc ${method} ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message ?? method);
  return data.result;
}

/** Pure — pinned by send-confirmation.test.ts. */
export function interpretEvmReceipt(receipt: { status?: string } | null): SendOutcome | 'pending' {
  if (!receipt) return 'pending';
  return receipt.status === '0x1' ? 'confirmed' : 'failed';
}

/** Pure — pinned by send-confirmation.test.ts. */
export function interpretSolStatus(
  status: { err?: unknown; confirmationStatus?: string } | null | undefined
): SendOutcome | 'pending' {
  if (!status) return 'pending';
  if (status.err != null) return 'failed';
  return status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized'
    ? 'confirmed'
    : 'pending';
}

/**
 * Watch a broadcast send until the chain answers (or the cap). Never throws;
 * RPC hiccups just poll again. Fire-and-forget from the send adapters.
 */
export async function watchSendConfirmation(
  chain: 'ethereum' | 'solana',
  txHash: string,
  onSettled: (outcome: SendOutcome) => void
): Promise<void> {
  const [maxPolls, pollMs] =
    chain === 'ethereum' ? [ETH_POLL_MAX, ETH_POLL_MS] : [SOL_POLL_MAX, SOL_POLL_MS];

  for (let i = 0; i < maxPolls; i++) {
    await sleep(pollMs);
    try {
      const state =
        chain === 'ethereum'
          ? interpretEvmReceipt(await rpc(ETH_RPC_URL, 'eth_getTransactionReceipt', [txHash]))
          : interpretSolStatus(
              (await rpc(SOL_RPC_URL, 'getSignatureStatuses', [[txHash]]))?.value?.[0]
            );
      if (state !== 'pending') {
        onSettled(state);
        return;
      }
    } catch {
      /* transient RPC error — keep polling */
    }
  }
  onSettled('timeout');
}
