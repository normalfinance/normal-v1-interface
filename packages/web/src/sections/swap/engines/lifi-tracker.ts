'use client';

import type { ChainId } from '@/lib/chains/registry';

import { buildAuthHeaders } from '@/utils/http';
import { useRef, useState, useEffect } from 'react';
import { ETH_RPC_URL, SOL_RPC_URL } from '@/hooks/use-chain-portfolio';
import { clearSwapOutflow, registerSwapOutflow } from '@/lib/spendable';
import { registerLifiStatusOverride } from '@/lib/lifi/status-overrides';

// ---------------------------------------------------------------------------
// Background tracker for a cross-chain (LI.FI) swap. Runs independently of the
// status modal so closing the dialog ("Continue in background") does NOT stop
// it — it keeps confirming the source tx, recording the swap, refreshing
// balances and reporting the terminal state until the bridge delivers. Lives in
// the swap engine, so it survives for as long as the user stays on the page.
// ---------------------------------------------------------------------------

export type Stage = 'confirming' | 'bridging' | 'done' | 'failed' | 'refunded';

export const isTerminal = (s: Stage): boolean => s === 'done' || s === 'failed' || s === 'refunded';

export interface LifiTrackedTx {
  txHash: string;
  fromChainId: number;
  toChainId: number;
  fromSymbol: string;
  toSymbol: string;
  amountIn: string;
  amountOut: string;
}

const CHAIN = {
  ETH: 1,
  SOL: 1151111081099710,
  BTC: 20000000000001,
};

export function chainName(id: number): string {
  if (id === CHAIN.ETH) return 'Ethereum';
  if (id === CHAIN.SOL) return 'Solana';
  if (id === CHAIN.BTC) return 'Bitcoin';
  return 'source chain';
}

/** LI.FI numeric chain id → our registry ChainId (undefined if unknown). */
export function registryChainOf(id: number): ChainId | undefined {
  if (id === CHAIN.ETH) return 'ethereum';
  if (id === CHAIN.SOL) return 'solana';
  if (id === CHAIN.BTC) return 'bitcoin';
  return undefined;
}

const log = (msg: string, extra?: unknown) =>
  extra !== undefined
    ? console.log(`[lifi-swap] ${msg}`, extra)
    : console.log(`[lifi-swap] ${msg}`);

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function rpc(url: string, method: string, params: unknown[]): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`rpc ${method} ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message ?? method);
  return data.result;
}

/** 'confirmed' | 'reverted' | 'dropped' */
async function confirmSource(
  fromChainId: number,
  txHash: string,
  stop: () => boolean
): Promise<'confirmed' | 'reverted' | 'dropped'> {
  // Bitcoin: broadcast acceptance is enough — the bridge watches the mempool.
  if (fromChainId === CHAIN.BTC) return 'confirmed';

  if (fromChainId === CHAIN.ETH) {
    for (let i = 0; i < 45 && !stop(); i++) {
      try {
        const receipt = await rpc(ETH_RPC_URL, 'eth_getTransactionReceipt', [txHash]);
        if (receipt) {
          log('ETH receipt status', receipt.status);
          return receipt.status === '0x1' ? 'confirmed' : 'reverted';
        }
      } catch (e) {
        log('ETH receipt poll error', (e as Error).message);
      }
      await delay(4000);
    }
    return 'dropped';
  }

  if (fromChainId === CHAIN.SOL) {
    for (let i = 0; i < 30 && !stop(); i++) {
      try {
        const res = await rpc(SOL_RPC_URL, 'getSignatureStatuses', [[txHash]]);
        const st = res?.value?.[0];
        if (st) {
          if (st.err) return 'reverted';
          if (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized') {
            return 'confirmed';
          }
        }
      } catch (e) {
        log('SOL status poll error', (e as Error).message);
      }
      await delay(2000);
    }
    return 'dropped';
  }

  return 'confirmed';
}

async function pollBridge(
  txHash: string,
  fromChainId: number,
  toChainId: number,
  stop: () => boolean
): Promise<'DONE' | 'FAILED' | 'REFUNDED' | null> {
  for (let i = 0; i < 80 && !stop(); i++) {
    try {
      const res = await fetch(
        `/api/lifi/status?txHash=${txHash}&fromChain=${fromChainId}&toChain=${toChainId}`,
        { headers: await buildAuthHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        const s = data?.status?.status as string | undefined;
        const sub = String(data?.status?.substatus ?? '').toUpperCase();
        log('bridge status', `${s} / ${sub}`);
        // A refund is reported as DONE+REFUNDED (or PARTIAL) — funds returned,
        // destination not delivered.
        if (s === 'DONE') return sub === 'REFUNDED' || sub === 'PARTIAL' ? 'REFUNDED' : 'DONE';
        if (s === 'FAILED' || s === 'INVALID') return 'FAILED';
      }
    } catch (e) {
      log('bridge poll error', (e as Error).message);
    }
    await delay(15000);
  }
  return null;
}

export interface LifiTrackerHandlers {
  /** fired on source-confirm and on bridge settle — refresh feeds + balances */
  onActivity: () => void;
  /** fired once when the swap reaches a terminal state — surface a toast */
  onTerminal: (stage: Stage) => void;
  /**
   * Awaited (capped) BETWEEN the bridge reporting DONE and the stage
   * flipping to 'done' (#62): the engine refetches the DESTINATION chain's
   * balances here, so "Done" is never shown against a stale balance that
   * looks like lost funds.
   */
  onArrival?: () => Promise<void> | void;
}

// Safety valve for onArrival: the funds ARE on-chain once the bridge says
// DONE — a hiccuping balance refetch must not make a successful swap look
// stuck, so after this cap "done" shows regardless. Sized to fit the
// verify-and-retry in swap-card's refetchChain (refresh + 5.6s floor wait +
// second refresh) with margin.
const ARRIVAL_CAP_MS = 15_000;

/**
 * Tracks `tx` to completion, independent of any modal. Re-keys on the tx hash,
 * so starting a new swap supersedes the previous one. Handlers are read through
 * a ref so the long-running effect never goes stale and never re-runs on a
 * parent re-render.
 */
export function useLifiTracker(tx: LifiTrackedTx | null, handlers: LifiTrackerHandlers): Stage {
  const [stage, setStage] = useState<Stage>('confirming');
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!tx?.txHash) return undefined;
    let cancelled = false;
    const stop = () => cancelled;
    setStage('confirming');

    // While this swap is in flight its source amount is committed money —
    // register it so MAX buttons stop offering it (#62 spendable).
    const outflowChain = registryChainOf(tx.fromChainId);
    if (outflowChain) {
      registerSwapOutflow(tx.txHash, {
        chain: outflowChain,
        symbol: tx.fromSymbol,
        amount: tx.amountIn,
      });
    }

    (async () => {
      const { txHash, fromChainId, toChainId, fromSymbol, toSymbol, amountIn, amountOut } = tx;
      log(`Submitted ${fromSymbol}→${toSymbol}`, txHash);

      // 1) Confirm the source-chain transaction actually landed.
      const src = await confirmSource(fromChainId, txHash, stop);
      if (cancelled) return;
      if (src !== 'confirmed') {
        log('source not confirmed', src);
        clearSwapOutflow(txHash); // nothing left the wallet — restore spendable
        setStage('failed');
        handlersRef.current.onTerminal('failed');
        return;
      }
      log('source confirmed');

      // 2) Record now (source landed) so it shows as one Swap row, then refresh.
      try {
        const headers = await buildAuthHeaders();
        await fetch('/api/lifi/record', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromSymbol, toSymbol, amountIn, amountOut, txHash }),
        });
        log('recorded swap');
      } catch (e) {
        log('record failed (non-fatal)', (e as Error).message);
      }
      handlersRef.current.onActivity();

      // 3) Track the bridge until it delivers.
      setStage('bridging');
      const bridge = await pollBridge(txHash, fromChainId, toChainId, stop);
      if (cancelled) return;
      const final: Stage =
        bridge === 'DONE'
          ? 'done'
          : bridge === 'REFUNDED'
            ? 'refunded'
            : bridge === 'FAILED'
              ? 'failed'
              : 'bridging';

      // #62: on DONE, refresh the DESTINATION chain's balances BEFORE showing
      // 'done' (capped — see ARRIVAL_CAP_MS). Niko's rule: never display
      // "Done" against a stale balance that looks like lost funds.
      if (final === 'done' && handlersRef.current.onArrival) {
        log('bridge DONE — refreshing destination balances before showing done');
        try {
          await Promise.race([
            Promise.resolve(handlersRef.current.onArrival()),
            delay(ARRIVAL_CAP_MS),
          ]);
        } catch (e) {
          log('arrival refresh failed (showing done anyway)', (e as Error).message);
        }
        if (cancelled) return;
      }

      if (final !== 'bridging') {
        clearSwapOutflow(txHash);
        // Tell the activity feed the truth BEFORE it refetches — the server
        // statuses route caches PENDING for 30s, so without this override the
        // row keeps showing "pending" right after delivery (#62 follow-up).
        registerLifiStatusOverride(
          txHash,
          final === 'done' ? 'DONE' : final === 'refunded' ? 'REFUNDED' : 'FAILED'
        );
      }
      setStage(final);
      handlersRef.current.onActivity();
      if (final !== 'bridging') handlersRef.current.onTerminal(final);
    })();

    return () => {
      cancelled = true;
      clearSwapOutflow(tx.txHash);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx?.txHash]);

  return stage;
}
