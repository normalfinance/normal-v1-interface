// Iris — Circle's CCTP attestation API. Public/permissionless, but hard rate
// limit: 35 req/s shared; exceeding it blocks ALL requests for 5 minutes with
// HTTP 429. Every Iris call in the app MUST go through this client: it spaces
// requests globally (module-level queue) so concurrent pollers can never trip
// the limit. Server-side only.

import type { NetworkType } from '@normalfinance/utils';

import { IRIS_URL } from './config';

export interface IrisMessage {
  message: `0x${string}`;
  attestation: `0x${string}` | 'PENDING';
  eventNonce: `0x${string}`;
  status: 'complete' | 'pending_confirmations' | string;
  cctpVersion?: number;
}

const MIN_SPACING_MS = 150; // ≤ ~6.6 req/s — far under the 35 req/s ceiling
let lastRequestAt = 0;
let chain: Promise<unknown> = Promise.resolve();

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(async () => {
    const wait = lastRequestAt + MIN_SPACING_MS - Date.now();
    if (wait > 0) await new Promise((res) => setTimeout(res, wait));
    lastRequestAt = Date.now();
    return fn();
  });
  chain = next.catch(() => undefined); // keep the queue alive after failures
  return next;
}

export class IrisClient {
  private base: string;

  constructor(network: NetworkType) {
    this.base = IRIS_URL[network];
  }

  /** Fetch the message + attestation for a source-chain burn tx. Returns null
   *  while Iris hasn't indexed the tx yet (404). */
  async getMessageByTxHash(sourceDomain: number, txHash: string): Promise<IrisMessage | null> {
    return throttled(async () => {
      const r = await fetch(`${this.base}/v2/messages/${sourceDomain}?transactionHash=${txHash}`, {
        cache: 'no-store',
      });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`iris ${r.status}: ${(await r.text()).slice(0, 200)}`);
      const data = await r.json();
      return (data?.messages?.[0] as IrisMessage) ?? null;
    });
  }

  /** True once the attestation is usable for the destination mint. */
  static isComplete(msg: IrisMessage | null): msg is IrisMessage & { attestation: `0x${string}` } {
    return !!msg && msg.status === 'complete' && msg.attestation !== 'PENDING';
  }

  /** Attestations expire ~24h after signing; re-attest refreshes them (no
   *  deadline — a burned message is recoverable indefinitely). */
  async reattest(eventNonce: string): Promise<void> {
    return throttled(async () => {
      const r = await fetch(`${this.base}/v2/reattest/${eventNonce}`, { method: 'POST' });
      if (!r.ok) throw new Error(`iris reattest ${r.status}: ${(await r.text()).slice(0, 200)}`);
    });
  }

  /** Fast-transfer fee schedule (unused for standard transfers, which are free). */
  async getBurnFees(sourceDomain: number, destDomain: number): Promise<unknown> {
    return throttled(async () => {
      const r = await fetch(`${this.base}/v2/burn/USDC/fees/${sourceDomain}/${destDomain}`);
      if (!r.ok) throw new Error(`iris fees ${r.status}`);
      return r.json();
    });
  }
}
