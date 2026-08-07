'use client';

import type { AddressField } from '@/lib/chains/registry';

import { buildAuthHeaders } from '@/utils/http';

// ---------------------------------------------------------------------------
// Cached lookup of the user's Turnkey wallet (subOrgId + addresses).
// Used by the Stellar signing path to decide whether a wallet address is
// Turnkey-managed (passkey signing) or locally keyed (password signing).
// ---------------------------------------------------------------------------

/**
 * The address fields come from the chain registry rather than being listed
 * here, so a chain added there is automatically part of this shape. Read them
 * with `getChainAddress(info, chainId)` instead of naming a field — that's
 * what keeps a new chain from rippling through every consumer.
 */
export type TurnkeyWalletInfo = {
  subOrgId: string;
  /** Empty string while an import is in progress (sub-org without wallet) */
  walletId: string;
} & Record<AddressField, string | null>;

const CACHE_TTL_MS = 60_000;
// A shared in-flight promise MUST be bounded. Without a deadline, one stalled
// request (a dev-server restart, a dropped connection, a hung session refresh)
// never settles — and because every caller awaits that same promise, the whole
// app waits forever with no way to recover short of a full page reload.
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Thrown when we could not determine the user's Turnkey wallet — network
 * failure, timeout, or a non-OK response. Deliberately distinct from "the user
 * has no Turnkey wallet": callers that disconnect wallets or force a re-import
 * on a `false` answer must not act on a failed lookup.
 */
export class TurnkeyWalletInfoUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Could not determine Turnkey wallet info');
    this.name = 'TurnkeyWalletInfoUnavailableError';
    this.cause = cause;
  }
}

let cache: { value: TurnkeyWalletInfo | null; ts: number } | null = null;
// Caching the *result* alone isn't enough: nine call sites (signing paths,
// send adapters, the wizard) run on the same tick, all miss the still-empty
// cache and each fires its own request. Holding the in-flight promise makes
// concurrent callers await the first request instead of starting new ones.
let inFlight: Promise<TurnkeyWalletInfo | null> | null = null;

export function invalidateTurnkeyWalletInfo(): void {
  cache = null;
  // Drop any in-flight request too: it was started against the pre-import
  // state, so its answer is already stale for the caller that invalidated.
  inFlight = null;
}

/** Throws `TurnkeyWalletInfoUnavailableError` when the answer is unknown. */
async function loadWalletInfo(): Promise<TurnkeyWalletInfo | null> {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.value;
  if (inFlight) return inFlight;

  const request = (async () => {
    try {
      // The timeout covers the session lookup too — `buildAuthHeaders` can
      // itself stall on a token refresh, and an AbortSignal on the fetch alone
      // would not catch that.
      return await Promise.race([
        (async () => {
          const headers = await buildAuthHeaders();
          const res = await fetch('/api/turnkey/wallet', {
            headers,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          });
          if (!res.ok) throw new TurnkeyWalletInfoUnavailableError(`HTTP ${res.status}`);
          const data = await res.json();
          cache = { value: data.wallet ?? null, ts: Date.now() };
          return cache.value;
        })(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new TurnkeyWalletInfoUnavailableError('timeout')),
            REQUEST_TIMEOUT_MS
          )
        ),
      ]);
    } catch (err) {
      throw err instanceof TurnkeyWalletInfoUnavailableError
        ? err
        : new TurnkeyWalletInfoUnavailableError(err);
    }
  })();

  inFlight = request;
  // Release the slot once settled — but only if this is still the current
  // request, since invalidate() during the fetch may already have cleared it.
  return request.finally(() => {
    if (inFlight === request) inFlight = null;
  });
}

/**
 * Best-effort lookup: falls back to the last known value (or null) instead of
 * throwing. Safe for read paths that only need addresses.
 */
export async function getTurnkeyWalletInfo(): Promise<TurnkeyWalletInfo | null> {
  try {
    return await loadWalletInfo();
  } catch {
    return cache?.value ?? null;
  }
}

/** True when the given Stellar address is signed by the user's Turnkey passkey. */
export async function isTurnkeyStellarAddress(
  address: string | null | undefined
): Promise<boolean> {
  if (!address) return false;
  const info = await getTurnkeyWalletInfo();
  return !!info?.stellarAddress && info.stellarAddress === address;
}

/**
 * Same answer, but **throws instead of guessing** when the lookup fails. Use
 * this wherever a `false` would trigger something destructive — disconnecting
 * the wallet, or sending the user to re-import — so a network blip can never
 * be mistaken for "this isn't your wallet".
 */
export async function isTurnkeyStellarAddressStrict(
  address: string | null | undefined
): Promise<boolean> {
  if (!address) return false;
  const info = await loadWalletInfo();
  return !!info?.stellarAddress && info.stellarAddress === address;
}
