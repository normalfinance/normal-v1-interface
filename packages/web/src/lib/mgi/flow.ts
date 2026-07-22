'use client';

// open moneygram

import { createElement } from 'react';
import { closeSnackbar, enqueueSnackbar } from 'notistack';

import Button from '@mui/material/Button';

const POPUP_FEATURES = 'width=420,height=800';

/**
 * Open a placeholder popup synchronously, INSIDE the click handler, before any
 * async work. Browsers only allow window.open while the click's transient user
 * activation is alive — network round-trips consume it, so opening after them
 * gets blocked by the popup blocker.
 *
 * IMPORTANT: only pre-open this when NO wallet signature will be needed
 * (cached SEP-10 token). Opening a popup moves OS focus away from the page,
 * and a WebAuthn passkey ceremony (Turnkey Normal wallets) then throws
 * "The document is not focused." Callers that still need a signature must
 * sign first and rely on openMoneyGramWindow's blocked-popup fallback.
 */
export function openMoneyGramPlaceholder(): Window | null {
  const w = window.open('', '_blank', POPUP_FEATURES);
  if (w) {
    try {
      w.document.write(
        '<!doctype html><title>MoneyGram</title><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui,sans-serif;color:#6B6B76;font-size:15px">Connecting to MoneyGram…</body>'
      );
    } catch {
      /* already navigated/closed — ignore */
    }
  }
  return w;
}

/**
 * Open the MoneyGram window directly. When window.open is blocked (no live
 * user activation — e.g. it was consumed by a passkey ceremony, or a strict
 * popup blocker), fall back to a persistent snackbar whose button click
 * provides fresh activation. `onOpen` fires with the window once it actually
 * opens (immediately, or later from the snackbar click).
 */
export function openMoneyGramWindow(
  url: string,
  onOpen?: (w: Window | null) => void
): Window | null {
  const w = window.open(url, '_blank', POPUP_FEATURES);
  if (w) {
    onOpen?.(w);
    return w;
  }
  const key = enqueueSnackbar('MoneyGram is ready.', {
    variant: 'info',
    persist: true,
    action: () =>
      createElement(
        Button,
        {
          size: 'small',
          variant: 'contained',
          onClick: () => {
            closeSnackbar(key);
            onOpen?.(window.open(url, '_blank', POPUP_FEATURES));
          },
          sx: { ml: 1, fontWeight: 600 },
        },
        'Open MoneyGram'
      ),
  });
  return null;
}

export function openMoneyGram(
  url: string,
  onReadyToTransfer: (tx: any) => void,
  existingWindow?: Window | null
) {
  // Reuse the pre-opened placeholder when we have one (navigation needs no user
  // activation); otherwise open directly, with the blocked-popup fallback.
  let w: Window | null;
  if (existingWindow && !existingWindow.closed) {
    existingWindow.location.href = url;
    w = existingWindow;
  } else {
    w = openMoneyGramWindow(url, (win) => {
      w = win;
    });
  }
  function onMsg(e: MessageEvent) {
    // Two message shapes: the legacy adapter posted the SEP-24 transaction
    // object directly; the new Anchor Platform posts
    // { type: 'COMMIT_RESULT', payload: { transaction }, timestamp }.
    const data = e?.data as any;
    const tx =
      data?.transaction ??
      (data?.type === 'COMMIT_RESULT' ? data?.payload?.transaction : undefined);
    if (!tx) return;
    // MoneyGram signals it's safe to close when status === "pending_user_transfer_start"
    if (tx.status === 'pending_user_transfer_start') {
      window.removeEventListener('message', onMsg);
      try {
        w?.close();
      } catch (err) {
        // ignore
      }
      onReadyToTransfer(tx);
    }
  }
  window.addEventListener('message', onMsg);
}
