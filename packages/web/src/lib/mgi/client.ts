'use client';

import { enqueueSnackbar } from 'notistack';
import { openMoneyGram } from './flow';
import { getTransaction } from './history';
import { signXDRWithWalletKit } from './kit-signer';

const DEFAULT_TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';

/* ------------------------------------------------------------------ */
/* Wallet signing via Stellar Wallets Kit                              */
/* ------------------------------------------------------------------ */

export async function signXDRWithConnectedWallet(
  challengeXdr: string,
  networkPassphrase: string,
  userPublicKey: string
): Promise<string> {
  // Delegates to your kit-signer (Zustand store .getState())
  return await signXDRWithWalletKit(challengeXdr, networkPassphrase, userPublicKey);
}

/* ------------------------------------------------------------------ */
/* MGI API wrappers (SEP-10 + SEP-24)                                  */
/* ------------------------------------------------------------------ */

export async function fetchMgiChallenge(userAccount: string) {
  const r = await fetch(`/api/mgi/sep10/challenge?account=${encodeURIComponent(userAccount)}`);
  if (!r.ok) throw new Error(`challenge failed: ${r.status} ${r.statusText}`);
  return r.json(); // { transaction, network_passphrase, ... }
}

export async function completeMgiAuth(userSignedXDR: string): Promise<string> {
  const r = await fetch(`/api/mgi/sep10/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userSignedXDR }),
  });

  const text = await r.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!r.ok) {
    // surface the exact server/MGI error
    throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
  }

  const token = (typeof data === 'string' ? undefined : data?.token) ?? data?.access_token ?? data;
  if (!token) throw new Error('MGI auth returned no token');
  return token as string;
}

export async function getMgiAuthToken(userAccount: string) {
  const ch = await fetchMgiChallenge(userAccount);
  const userSignedXDR = await signXDRWithConnectedWallet(
    ch.transaction,
    ch.network_passphrase || DEFAULT_TESTNET_PASSPHRASE,
    userAccount
  );
  return await completeMgiAuth(userSignedXDR);
}

export async function startMgiDeposit(token: string, userAccount: string, amount: number) {
  const r = await fetch(`/api/mgi/sep24/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  onReady?: (tx: any) => void
) {
  const token = await getMgiAuthToken(userAccount);
  const { url } = await startMgiDeposit(token, userAccount, Number(amount));
  openMoneyGram(url, (tx) => onReady?.(tx));
}

export async function startMgiWithdraw(token: string, userAccount: string, amount: number) {
  const r = await fetch(`/api/mgi/sep24/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  onReady?: (tx: any) => void
) {
  const token = await getMgiAuthToken(userAccount);
  const { url } = await startMgiWithdraw(token, userAccount, Number(amount));
  openMoneyGram(url, (tx) => onReady?.(tx));
}

export async function startWithdrawCancel(token: string, txId: string) {
  const r = await fetch(`/api/mgi/sep24/withdraw/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const r = await fetch(`/api/mgi/sep24/transactions/moreinfo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  const w = window.open(url, '_blank', 'width=420,height=800');
  try {
    w?.focus();
  } catch {}

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
      const tx = await getTransaction(txId /* , token if your proxy needs it */);
      const status = (tx?.status || '').toLowerCase();

      if (terminal.includes(status)) {
        onUpdate?.(tx);
        enqueueSnackbar?.(`MoneyGram: transaction is ${status}`, { variant: 'success' });
        break;
      }
    } catch {
      // ignore intermittent errors while polling
    }
  }
}
