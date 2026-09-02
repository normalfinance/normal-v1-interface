import type { NetworkType } from '@normalfinance/utils';

import { parseNetwork } from '@/utils/network-value';
import { getCurrentNetwork } from '@normalfinance/utils';

// ---------------------------------------------------------------------------
// Doc 95 Wave 7 — one answer to "which network is this request on?".
//
// Sixteen routes read the same `normal-network` cookie and each supplied its
// OWN fallback for when it is absent. Three said 'mainnet' (cctp/quote,
// cctp/transfers, send/execute); the rest said 'testnet'. The cookie is only
// written once the client store rehydrates or the user toggles, so on a FIRST
// visit it is missing — and the same user's swap quote was built on testnet
// while their CCTP transfer row was created on mainnet.
//
// The client's own source of truth is `getCurrentNetwork()`, which reads
// NEXT_PUBLIC_NETWORK. Deriving the server fallback from the same function
// makes the two agree by construction instead of by sixteen literals staying
// in step. (Same principle as the chain registry: a deployment-varying value
// lives in one place.)
// ---------------------------------------------------------------------------

type CookieReader = { get(name: string): { value: string } | undefined };

const COOKIE_NAME = 'normal-network';

/**
 * The network for this request: an explicit query override first, then the
 * cookie, then the deployment's own configured network — never a literal.
 */
export function networkFromCookie(
  cookieStore: CookieReader,
  override?: string | null
): NetworkType {
  return (
    parseNetwork(override) ??
    parseNetwork(cookieStore.get(COOKIE_NAME)?.value) ??
    getCurrentNetwork()
  );
}
