'use client';

import { useEffect } from 'react';
import { usePersistStore } from '@normalfinance/state';

// ---------------------------------------------------------------------------
// #75: transitional safety net for the duplicate data path (#7/#12). The
// legacy persist token store only refreshed on certain page/drawer mounts, so
// after any transaction its consumers (swap card balances, and previously the
// send modal and drawer) kept showing PRE-transaction numbers until the next
// mount. Every flow already announces `nf:activity-updated`; this listener
// makes the store follow it, debounced so a burst of announcements costs one
// Horizon read. Delete together with the store once Phase 2 of doc 75
// retires its last consumer.
// ---------------------------------------------------------------------------

export default function TokenStoreRefresher() {
  const { wallet, getAllTokens } = usePersistStore();
  const address = wallet.address;

  useEffect(() => {
    if (!address) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handler = () => {
      clearTimeout(timer);
      // Small delay so the ledger close the event announced is actually
      // readable — same reasoning as the balance hook's 800ms.
      timer = setTimeout(() => {
        getAllTokens(true).catch(() => {});
      }, 1500);
    };
    window.addEventListener('nf:activity-updated', handler);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('nf:activity-updated', handler);
    };
  }, [address, getAllTokens]);

  return null;
}
