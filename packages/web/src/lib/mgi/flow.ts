//open moneygram

export function openMoneyGram(url: string, onReadyToTransfer: (tx: any) => void) {
  const w = window.open(url, '_blank', 'width=420,height=800');
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
