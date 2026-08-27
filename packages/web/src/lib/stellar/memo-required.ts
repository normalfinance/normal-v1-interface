'use client';

import type { MemoRequirement } from '@/lib/stellar/memo-required-list';

import { buildAuthHeaders } from '@/utils/http';
import { knownMemoRequirement } from '@/lib/stellar/memo-required-list';

// ---------------------------------------------------------------------------
// Is this Stellar destination an exchange that needs a deposit memo?
//
// Exchanges pool every customer's deposits into one Stellar account; the memo
// is the only thing that routes an incoming payment to the right customer. A
// memo-less send to such an address succeeds on-chain and then sits
// unattributed in the exchange's omnibus balance — which is precisely what
// happened with a real 5 XLM send to Coinbase (finding #48; the tx confirmed,
// Coinbase credited nothing).
//
// Three layers, because each covers the others' blind spot:
//   1. The seed list below — instant, works offline, catches the major
//      exchanges the moment the address is pasted.
//   2. /api/stellar/memo-required — live lookup against stellar.expert's
//      community directory + the SEP-29 `config.memo_required` account flag,
//      Redis-cached server-side. Catches exchanges the seed list doesn't and
//      addresses added after we shipped.
//   3. The SDK's own SEP-29 check at submit time (it already runs inside
//      Horizon.Server.submitTransaction). PROVEN insufficient alone: Coinbase
//      never set the flag, so the incident sailed straight through it.
// ---------------------------------------------------------------------------

export {
  KNOWN_MEMO_REQUIRED,
  knownMemoRequirement,
  type MemoRequirement,
} from '@/lib/stellar/memo-required-list';

// One live answer per address per session — the server route holds the longer
// (Redis) cache; this just stops re-asking while the modal re-renders.
const sessionCache = new Map<string, MemoRequirement>();

/**
 * Full check: seed list, then the live route (directory + SEP-29 flag).
 * Fails OPEN to the seed list — if the route is unreachable the big exchanges
 * are still blocked, and the SDK's submit-time check remains behind us.
 */
export async function fetchMemoRequirement(address: string): Promise<MemoRequirement> {
  const known = knownMemoRequirement(address);
  if (known) return known;

  const key = address.trim().toUpperCase();
  const cached = sessionCache.get(key);
  if (cached) return cached;

  try {
    const headers = await buildAuthHeaders();
    const res = await fetch(`/api/stellar/memo-required?address=${encodeURIComponent(key)}`, {
      headers,
    });
    if (!res.ok) return { required: false, unknown: true };
    const data = (await res.json()) as MemoRequirement & { success?: boolean };
    const result: MemoRequirement = { required: !!data.required, name: data.name };
    sessionCache.set(key, result);
    return result;
  } catch {
    return { required: false, unknown: true };
  }
}
