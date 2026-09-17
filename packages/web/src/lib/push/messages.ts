import { PUSH_PLATFORMS, PUSH_APP_VARIANTS } from './types';

import type { PushPayload, PushPlatform, PushAppVariant } from './types';

// ---------------------------------------------------------------------------
// Push notifications — the PURE parts: which rows count as "tell the user",
// and what the notification says. No I/O, unit-tested.
//
// Amounts on the lock screen are a privacy decision (a notification is
// visible to anyone holding the phone). Default: no amounts. Niko can turn
// them on with PUSH_INCLUDE_AMOUNTS=1; the builders take it as a flag so the
// decision is one line, not scattered copy.
// ---------------------------------------------------------------------------

export interface MessageOptions {
  includeAmounts: boolean;
}

/** Trim a human amount to something a notification can carry ("0.182", not "0.18200000"). */
export function fmtAmount(amount: string | null | undefined): string | null {
  if (!amount) return null;
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  const s = n >= 1 ? n.toFixed(2) : n.toPrecision(3);
  return s.replace(/\.?0+$/, '');
}

// ----- CCTP ---------------------------------------------------------------

export interface CctpRowView {
  id: string;
  direction: string;
  status: string;
  dstAsset: string;
  dstAmount: string | null;
  dstSwapTxHash: string | null;
}

export type CctpTerminalKind = 'completed' | 'refunded' | 'failed';
/** 'delivering' = outbound pivot broadcast; the LI.FI leg decides the real ending. */
export type CctpRowVerdict = CctpTerminalKind | 'delivering';

/**
 * The USER-visible end of a CCTP transfer, or null while it is still moving.
 *
 * Inbound (→ Stellar): COMPLETED is the Stellar mint, i.e. delivery.
 * Outbound (Stellar →): COMPLETED is only the Base mint, and dstSwapTxHash is
 * only the pivot BROADCAST (autopilot-outbound stamps it in onBroadcast; the
 * engine patches it before pollPivotDelivery). The bridged asset lands on the
 * target chain later — up to ~60 min for BTC — and the LI.FI leg can still
 * REFUND. So an outbound row with dstSwapTxHash is 'delivering': the caller
 * asks LI.FI and notifies on DONE/REFUNDED/FAILED only. REFUNDED/FAILED on
 * the row itself are terminal either way. Written as a function of the ROW,
 * not of transitions: FAILED has three writers and REFUNDED one PATCH.
 */
export function cctpTerminalKind(row: CctpRowView): CctpRowVerdict | null {
  if (row.status === 'REFUNDED') return 'refunded';
  if (row.status === 'FAILED') return 'failed';
  const inbound = row.direction === 'crosschain_to_stellar';
  if (inbound) return row.status === 'COMPLETED' ? 'completed' : null;
  return row.dstSwapTxHash ? 'delivering' : null;
}

export function buildCctpPayload(
  row: CctpRowView,
  kind: CctpTerminalKind,
  opts: MessageOptions
): PushPayload {
  const inbound = row.direction === 'crosschain_to_stellar';
  const asset = inbound ? 'USDC' : row.dstAsset;
  const where = inbound ? 'your Stellar wallet' : 'your wallet';
  const amt = opts.includeAmounts ? fmtAmount(row.dstAmount) : null;
  const data = { type: 'cctp' as const, transferId: row.id, status: kind };

  if (kind === 'completed') {
    return {
      title: `${asset} ${inbound ? 'arrived' : 'delivered'}`,
      body: amt
        ? `${amt} ${asset} is in ${where}.`
        : `Your swap finished. ${asset} is in ${where}.`,
      data,
    };
  }
  if (kind === 'refunded') {
    return {
      title: 'Swap returned',
      body: 'Your swap could not complete. Your USDC is safe in your wallet — open Normal to retry or bring it back.',
      data,
    };
  }
  return {
    title: 'Swap needs attention',
    body: 'Your swap did not finish. Open Normal to see what happened and what to do next.',
    data,
  };
}

// ----- Sends (ETH / SOL, server-settled) -----------------------------------

export interface SendRowView {
  txHash: string | null;
  chain: string;
  symbol: string | null;
  amount: string;
  status: string;
}

export type SendTerminalKind = 'confirmed' | 'failed';

/** 'failed' covers both an on-chain failure and a send that never reached the network. */
export function sendTerminalKind(status: string): SendTerminalKind | null {
  if (status === 'confirmed') return 'confirmed';
  if (status === 'failed' || status === 'abandoned') return 'failed';
  return null;
}

export function buildSendPayload(
  row: SendRowView,
  kind: SendTerminalKind,
  chainName: string,
  opts: MessageOptions
): PushPayload | null {
  if (!row.txHash) return null;
  const symbol = row.symbol ?? '';
  const amt = opts.includeAmounts ? fmtAmount(row.amount) : null;
  const data = { type: 'send' as const, txHash: row.txHash, chain: row.chain, status: kind };
  if (kind === 'confirmed') {
    return {
      title: 'Send confirmed',
      body: amt
        ? `${amt} ${symbol} sent on ${chainName}.`.replace('  ', ' ')
        : `Your ${symbol} send on ${chainName} was confirmed.`.replace('  ', ' '),
      data,
    };
  }
  return {
    title: 'Send did not go through',
    body: `Your ${symbol} send on ${chainName} failed. Nothing left your wallet except any network fee.`.replace(
      '  ',
      ' '
    ),
    data,
  };
}

// ----- LI.FI native swaps ---------------------------------------------------

export interface LifiRowView {
  txHash: string | null;
  tokenInSymbol: string | null;
  tokenOutSymbol: string | null;
  amountOut: string;
}

export type LifiTerminal = 'DONE' | 'REFUNDED' | 'FAILED';

export function isLifiTerminal(status: string): status is LifiTerminal {
  return status === 'DONE' || status === 'REFUNDED' || status === 'FAILED';
}

export function buildLifiPayload(
  row: LifiRowView,
  status: LifiTerminal,
  opts: MessageOptions
): PushPayload | null {
  if (!row.txHash) return null;
  const to = row.tokenOutSymbol ?? 'your asset';
  const from = row.tokenInSymbol ?? 'your asset';
  const amt = opts.includeAmounts ? fmtAmount(row.amountOut) : null;
  const data = { type: 'lifi' as const, txHash: row.txHash, status };
  if (status === 'DONE') {
    return {
      title: `${to} delivered`,
      body: amt ? `${amt} ${to} is in your wallet.` : `Your swap to ${to} finished.`,
      data,
    };
  }
  if (status === 'REFUNDED') {
    return {
      title: 'Swap refunded',
      body: `Your ${from} → ${to} swap could not complete and was refunded to your wallet.`,
      data,
    };
  }
  return {
    title: 'Swap failed',
    body: `Your ${from} → ${to} swap did not go through. Open Normal for details.`,
    data,
  };
}

// ----- Device registration input ---------------------------------------------

export function isPushPlatform(v: unknown): v is PushPlatform {
  return typeof v === 'string' && (PUSH_PLATFORMS as readonly string[]).includes(v);
}
export function isPushAppVariant(v: unknown): v is PushAppVariant {
  return typeof v === 'string' && (PUSH_APP_VARIANTS as readonly string[]).includes(v);
}
/** APNs tokens are 64 hex chars; FCM tokens are long opaque strings. Bound both. */
export function isPushToken(v: unknown): v is string {
  return typeof v === 'string' && v.length >= 32 && v.length <= 512 && !/\s/.test(v);
}

/** Provider data payloads must be flat string maps (FCM requires it; APNs tolerates it). */
export function flattenData(data: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) out[k] = String(v);
  return out;
}
