'use client';

import { enqueueSnackbar } from 'notistack';
import { buildAuthHeaders } from '@/utils/http';

import { getTransaction } from './history';
import { signStellarTxForMgi } from './kit-signer';
import { openMoneyGram, openMoneyGramWindow } from './flow';

const DEFAULT_TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';
// v2: invalidates tokens issued by the legacy adapter platform (retired
// 2026-07-19) — the new Anchor Platform rejects them, and we trust the cache
// before hitting the server, so stale v1 tokens would strand users in errors.
const LS_KEY = 'mgiAuth.v2';
type CacheShape = Record<string, { token: string; exp: number }>;
const NOOP = () => {};

function isTestnet(passphrase?: string) {
  return /test/i.test(passphrase || DEFAULT_TESTNET_PASSPHRASE);
}
function cacheKey(account: string, passphrase?: string) {
  return `${account}:${isTestnet(passphrase) ? 'testnet' : 'public'}`;
}
function readAll(): CacheShape {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch {
    return {};
  }
}
function writeAll(c: CacheShape) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(c));
}
function putToken(key: string, token: string, expMs?: number) {
  const all = readAll();
  const exp = typeof expMs === 'number' ? expMs : Date.now() + 15 * 60_000; // 15 min fallback
  all[key] = { token, exp };
  writeAll(all);
}
function getValidToken(key: string): string | undefined {
  const all = readAll();
  const entry = all[key];
  if (!entry) {
    return undefined;
  }
  if (Date.now() >= entry.exp) {
    return undefined; // expired
  }
  return entry.token;
}

/** True when a still-valid SEP-10 token is cached for this account — the next
 *  MGI call won't need a wallet signature. Callers use this to decide whether
 *  it's safe to pre-open the popup: a passkey ceremony (WebAuthn) requires the
 *  document to stay focused, which a pre-opened popup breaks. */
export function hasCachedMgiToken(account: string, testnet: boolean): boolean {
  return !!getValidToken(`${account}:${testnet ? 'testnet' : 'public'}`);
}

export function clearMgiToken(account?: string) {
  if (typeof window === 'undefined') return;
  if (!account) {
    localStorage.removeItem(LS_KEY);
    return;
  }
  const all = readAll();
  Object.keys(all).forEach((k) => {
    if (k.startsWith(`${account}:`)) delete all[k];
  });
  writeAll(all);
}

function tryParseJwtExpMs(token: string): number | undefined {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) {
      return undefined;
    }
    const json = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json?.exp === 'number' ? json.exp * 1000 : undefined;
  } catch (_err) {
    // Not a JWT (or malformed) — just fall back to default TTL
    return undefined;
  }
}

/* ------------------------ API wrappers ------------------------ */

export async function fetchMgiChallenge(userAccount: string) {
  const headers = await buildAuthHeaders();
  const r = await fetch(`/api/mgi/sep10/challenge?account=${encodeURIComponent(userAccount)}`, {
    headers,
    credentials: 'include',
  });
  if (!r.ok) throw new Error(`challenge failed: ${r.status} ${r.statusText}`);
  return r.json() as Promise<{ transaction: string; network_passphrase?: string }>;
}

export async function completeMgiAuth(userSignedXDR: string): Promise<string> {
  const headers = await buildAuthHeaders();
  const r = await fetch(`/api/mgi/sep10/complete`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ userSignedXDR }),
  });

  const text = await r.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!r.ok) throw new Error(typeof data === 'string' ? data : JSON.stringify(data));

  const token = (typeof data === 'string' ? undefined : data?.token) ?? data?.access_token ?? data;
  if (!token) throw new Error('MGI auth returned no token');
  return token as string;
}

/** Returns a valid SEP-10 token without re-signing if a cached one exists. */
export async function getMgiAuthToken(userAccount: string) {
  // 1) Challenge fetch (no wallet popup)
  const ch = await fetchMgiChallenge(userAccount);
  const passphrase = ch.network_passphrase || DEFAULT_TESTNET_PASSPHRASE;
  const key = cacheKey(userAccount, passphrase);

  // 2) Try cache
  const cached = getValidToken(key);
  if (cached) return cached;

  // 3) Sign (Normal wallet via passkey, or external wallet via kit) & exchange
  const signed = await signStellarTxForMgi(ch.transaction, passphrase, userAccount);
  const token = await completeMgiAuth(signed);

  // 4) Cache with real JWT exp if present
  putToken(key, token, tryParseJwtExpMs(token));
  return token;
}

export async function startMgiDeposit(token: string, userAccount: string, amount: number) {
  const headers = await buildAuthHeaders();
  const r = await fetch(`/api/mgi/sep24/deposit`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ token, account: userAccount, amount }),
  });

  const raw = await r.text();
  let data: any = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }

  if (!r.ok || !data?.url) {
    const pretty = JSON.stringify(data ?? { raw }, null, 2);
    throw new Error(`Deposit start failed (HTTP ${r.status}): ${pretty}`);
  }

  return data as { url: string; id: string | null };
}

export async function runDepositFlow(
  userAccount: string,
  amount: string | number,
  onReady?: (tx: any) => void,
  popup?: Window | null
) {
  try {
    const token = await getMgiAuthToken(userAccount);
    const { url } = await startMgiDeposit(token, userAccount, Number(amount));
    openMoneyGram(url, (tx) => onReady?.(tx), popup);
  } catch (e) {
    popup?.close();
    throw e;
  }
}

export async function startMgiWithdraw(token: string, userAccount: string, amount: number) {
  const headers = await buildAuthHeaders();
  const r = await fetch(`/api/mgi/sep24/withdraw`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ token, account: userAccount, amount }),
  });

  const raw = await r.text();
  let data: any = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }

  if (!r.ok || !data?.url) {
    const pretty = JSON.stringify(data ?? { raw }, null, 2);
    throw new Error(`Withdraw start failed (HTTP ${r.status}): ${pretty}`);
  }

  return data as { url: string; id: string | null };
}

export async function runWithdrawFlow(
  userAccount: string,
  amount: string | number,
  onReady?: (tx: any) => void,
  popup?: Window | null
) {
  try {
    const token = await getMgiAuthToken(userAccount);
    const { url } = await startMgiWithdraw(token, userAccount, Number(amount));
    openMoneyGram(url, (tx) => onReady?.(tx), popup);
  } catch (e) {
    popup?.close();
    throw e;
  }
}

export async function startWithdrawCancel(token: string, txId: string) {
  const headers = await buildAuthHeaders();
  const r = await fetch(`/api/mgi/sep24/withdraw/cancel`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ token, id: txId, lang: 'en' }),
  });

  const text = await r.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!r.ok || !data?.url) {
    throw new Error(
      `Cancel start failed (HTTP ${r.status}): ${JSON.stringify(
        typeof data === 'string' ? { error: data } : data
      )}`
    );
  }
  return data as { url: string; id: string };
}

export async function runWithdrawCancelFlow(
  userAccount: string,
  txId: string,
  onClosed?: (tx: any) => void
) {
  const token = await getMgiAuthToken(userAccount);
  const { url } = await startWithdrawCancel(token, txId);

  openMoneyGram(url, (tx) => {
    onClosed?.(tx);
  });
}

/* ------------------------------------------------------------------ */
/* Anchor UI + polling                                                 */
/* ------------------------------------------------------------------ */

async function fetchMoreInfoUrlWithSep10(token: string, txId: string): Promise<string> {
  const headers = await buildAuthHeaders();
  const r = await fetch(`/api/mgi/sep24/transactions/moreinfo`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ token, id: txId }),
  });
  const data = await r.json();
  if (!r.ok || !data?.more_info_url) {
    throw new Error(
      `more_info_url fetch failed (HTTP ${r.status}): ${JSON.stringify(data ?? {}, null, 2)}`
    );
  }
  return data.more_info_url as string;
}

/**
 * Open MoneyGram transaction details UI (cancel/refund actions are inside their UI)
 * and poll until terminal status is reached, then notify via onUpdate(tx).
 */
export async function openTxInAnchorUI(
  userAccount: string,
  txId: string,
  onUpdate?: (tx: any) => void
) {
  const token = await getMgiAuthToken(userAccount);
  const url = await fetchMoreInfoUrlWithSep10(token, txId);

  // The token fetch above may have run a passkey ceremony, consuming the user
  // activation — openMoneyGramWindow recovers from a blocked popup via its
  // snackbar fallback.
  openMoneyGramWindow(url);

  const terminal: string[] = [
    'completed',
    'refunded',
    'expired',
    'no_market',
    'too_small',
    'too_large',
    'error',
  ];

  let tries = 0;
  const maxTries = 45; // ~3 minutes at 4s interval
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  while (tries < maxTries) {
    await sleep(4000);
    tries += 1;

    try {
      const tx = await getTransaction(txId, token);
      const status = (tx?.status || '').toLowerCase();

      if (terminal.includes(status)) {
        onUpdate?.(tx);
        enqueueSnackbar?.(`MoneyGram: transaction is ${status}`, { variant: 'success' });
        break;
      }
    } catch (_e) {
      // Some browsers block programmatic focus; safe to ignore.
      NOOP();
    }
  }
}
