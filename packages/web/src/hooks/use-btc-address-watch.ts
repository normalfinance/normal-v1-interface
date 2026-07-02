'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

// ----------------------------------------------------------------------

export interface BtcWatchTx {
  txid: string;
  fee: number;
  status: { confirmed: boolean };
  vout: Array<{ scriptpubkey_address: string; value: number }>;
  vin: Array<{ prevout?: { scriptpubkey_address: string; value: number } }>;
}

export interface UseBtcAddressWatchResult {
  /** Unconfirmed incoming transactions (outputs to our address) */
  incomingTxs: BtcWatchTx[];
  /** True once the WebSocket handshake is complete and we're actively tracking */
  isConnected: boolean;
}

const WS_URL = 'wss://mempool.space/api/v1/ws';
const RECONNECT_DELAY_MS = 5_000;
const POLL_INTERVAL_MS = 20_000;

/**
 * Watches a Bitcoin address for incoming unconfirmed transactions.
 *
 * Strategy:
 * 1. Immediately fetch existing mempool txs via HTTP on mount — catches any
 *    payment that was already in the mempool before the modal opened.
 * 2. Connect to mempool.space WebSocket for real-time new-tx notifications.
 * 3. Poll every 20s as a safety net (handles WS gaps / reconnects).
 *
 * State resets each time `enabled` flips false → true.
 */
export function useBtcAddressWatch(
  address: string | null | undefined,
  enabled: boolean,
): UseBtcAddressWatchResult {
  const [incomingTxs, setIncomingTxs] = useState<BtcWatchTx[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const cancelledRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Merge a batch of txs into state, deduplicating by txid
  const mergeIncoming = useCallback(
    (txs: BtcWatchTx[]) => {
      if (!address) return;
      const incoming = txs.filter((tx) =>
        tx.vout?.some((o) => o.scriptpubkey_address === address),
      );
      if (incoming.length === 0) return;
      setIncomingTxs((prev) => {
        const seen = new Set(prev.map((t) => t.txid));
        const fresh = incoming.filter((t) => !seen.has(t.txid));
        return fresh.length > 0 ? [...prev, ...fresh] : prev;
      });
    },
    [address],
  );

  // HTTP fetch of current mempool txs for the address
  const fetchMempool = useCallback(async () => {
    if (cancelledRef.current || !address) return;
    try {
      const res = await fetch(
        `https://mempool.space/api/address/${address}/txs/mempool`,
      );
      if (!res.ok || cancelledRef.current) return;
      const txs: BtcWatchTx[] = await res.json();
      mergeIncoming(txs);
    } catch {
      // network error — next poll will retry
    }
  }, [address, mergeIncoming]);

  // Periodic poll (runs every POLL_INTERVAL_MS while enabled)
  const schedulePoll = useCallback(() => {
    if (cancelledRef.current) return;
    pollTimerRef.current = setTimeout(async () => {
      await fetchMempool();
      schedulePoll();
    }, POLL_INTERVAL_MS);
  }, [fetchMempool]);

  // WebSocket connect with auto-reconnect
  const connect = useCallback(() => {
    if (cancelledRef.current) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (cancelledRef.current) { ws.close(); return; }
      setIsConnected(true);
      ws.send(JSON.stringify({ action: 'init' }));
      ws.send(JSON.stringify({ action: 'track-address', data: address }));
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      if (cancelledRef.current) return;
      try {
        const msg = JSON.parse(event.data) as Record<string, unknown>;
        const newTxs =
          (msg['address-transactions'] as BtcWatchTx[] | undefined) ?? [];
        const blockTxs =
          (msg['address-block-transactions'] as BtcWatchTx[] | undefined) ?? [];
        mergeIncoming([...newTxs, ...blockTxs]);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (!cancelledRef.current) {
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [address, mergeIncoming]);

  useEffect(() => {
    if (!enabled || !address) {
      setIncomingTxs([]);
      setIsConnected(false);
      return undefined;
    }

    cancelledRef.current = false;

    // 1. Immediate HTTP check for already-pending txs
    fetchMempool();

    // 2. WebSocket for real-time new txs
    connect();

    // 3. Periodic poll as safety net
    schedulePoll();

    return () => {
      cancelledRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [address, enabled, fetchMempool, connect, schedulePoll]);

  return { incomingTxs, isConnected };
}
