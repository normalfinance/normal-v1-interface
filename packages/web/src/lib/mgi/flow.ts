//open moneygram

const POPUP_FEATURES = 'width=420,height=800';

/**
 * Open a placeholder popup synchronously, INSIDE the click handler, before any
 * async work. Browsers only allow window.open while the click's transient user
 * activation is alive — the SEP-10 passkey ceremony and network round-trips
 * consume it, so opening after them gets blocked by the popup blocker.
 * Navigate the returned window via openMoneyGram once the interactive URL is
 * known; close it if the flow fails first.
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

export function openMoneyGram(
  url: string,
  onReadyToTransfer: (tx: any) => void,
  existingWindow?: Window | null
) {
  // Reuse the pre-opened placeholder when we have one (navigation needs no user
  // activation); fall back to a direct open for callers that never made one.
  let w: Window | null;
  if (existingWindow && !existingWindow.closed) {
    existingWindow.location.href = url;
    w = existingWindow;
  } else {
    w = window.open(url, '_blank', POPUP_FEATURES);
  }
  function onMsg(e: MessageEvent) {
    const tx = (e?.data as any)?.transaction;
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
