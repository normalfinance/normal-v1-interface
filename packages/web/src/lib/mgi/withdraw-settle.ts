// ---------------------------------------------------------------------------
// MoneyGram cash-out (SEP-24 withdrawal) — the SEND step the web app never had.
//
// After the user commits on MoneyGram's page the transaction sits at
// `pending_user_transfer_start` with the anchor's Stellar account, a memo and
// the exact USDC amount to send. Nothing moved unless WE send it; until
// 2026-10-14 web showed a snackbar and stopped, so the user got no reference
// number and the row never left 'incomplete' (invisible in Activity).
//
// This module turns the raw SEP-24 transaction into checked send instructions.
// Pure: the dialog and tests call it; it never touches the network.
// ---------------------------------------------------------------------------

export type MgiMemoType = 'MEMO_TEXT' | 'MEMO_ID';

export interface WithdrawInstructions {
  anchorAccount: string;
  memo: string;
  memoType: MgiMemoType;
  /** Exactly what the user sends (amount_in = payout + anchor fee, per SEP-24). */
  amount: string;
}

export type WithdrawVerdict =
  | { kind: 'ready'; instructions: WithdrawInstructions }
  | { kind: 'wait'; reason: string } // not at pending_user_transfer_start yet, or fields missing
  | { kind: 'stop'; reason: string }; // terminal / unsafe — never send

const STELLAR_ACCOUNT = /^G[A-Z2-7]{55}$/;
const SEND_STATUS = 'pending_user_transfer_start';
const TERMINAL = new Set([
  'completed',
  'refunded',
  'expired',
  'error',
  'no_market',
  'too_small',
  'too_large',
]);
/** Tolerance between what the user typed and what the anchor asks for. */
export const AMOUNT_TOLERANCE = 0.01;

export function withdrawVerdict(tx: any, requestedAmount: number): WithdrawVerdict {
  const status = String(tx?.status ?? '');
  if (!status) return { kind: 'wait', reason: 'no status yet' };
  if (TERMINAL.has(status)) return { kind: 'stop', reason: `transaction is ${status}` };
  if (status !== SEND_STATUS) {
    // pending_user_transfer_complete / pending_anchor / … = already sent (by
    // us or elsewhere); never send twice.
    if (status.startsWith('pending_')) return { kind: 'stop', reason: `already ${status}` };
    return { kind: 'wait', reason: status };
  }

  const anchorAccount = String(tx?.withdraw_anchor_account ?? '').trim();
  const memo = tx?.withdraw_memo != null ? String(tx.withdraw_memo).trim() : '';
  const memoTypeRaw = String(tx?.withdraw_memo_type ?? '').toLowerCase();
  const amountRaw = tx?.amount_in?.amount ?? tx?.amount_in;
  const assetRaw = String(tx?.amount_in?.asset ?? tx?.amount_in_asset ?? '');

  if (!anchorAccount || !amountRaw) {
    return { kind: 'wait', reason: 'anchor account or amount not published yet' };
  }
  if (!STELLAR_ACCOUNT.test(anchorAccount)) {
    return { kind: 'stop', reason: 'anchor account is not a Stellar account' };
  }
  if (!memo) return { kind: 'wait', reason: 'memo not published yet' };
  if (memoTypeRaw === 'hash') return { kind: 'stop', reason: 'hash memos are not supported' };
  const memoType: MgiMemoType =
    memoTypeRaw === 'id'
      ? 'MEMO_ID'
      : memoTypeRaw === 'text' || memoTypeRaw === ''
        ? 'MEMO_TEXT'
        : 'MEMO_TEXT';
  if (memoType === 'MEMO_ID' && !/^\d+$/.test(memo)) {
    return { kind: 'stop', reason: 'id memo is not numeric' };
  }
  if (memoType === 'MEMO_TEXT' && Buffer.byteLength(memo, 'utf8') > 28) {
    return { kind: 'stop', reason: 'text memo longer than 28 bytes' };
  }
  // SEP-24 names the asset as "stellar:USDC:G…" or just "USDC"; anything that
  // does not say USDC is not what the user agreed to sell.
  if (assetRaw && !/USDC/i.test(assetRaw)) {
    return { kind: 'stop', reason: `anchor asks for ${assetRaw}, not USDC` };
  }
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) return { kind: 'stop', reason: 'amount unreadable' };
  if (requestedAmount > 0 && amount > requestedAmount * (1 + AMOUNT_TOLERANCE)) {
    return {
      kind: 'stop',
      reason: `anchor asks for ${amount} USDC but you requested ${requestedAmount}`,
    };
  }
  // 7 decimals is Stellar's precision; never send more than asked.
  const amountStr = (Math.floor(amount * 1e7) / 1e7)
    .toFixed(7)
    .replace(/0+$/, '')
    .replace(/\.$/, '');
  return { kind: 'ready', instructions: { anchorAccount, memo, memoType, amount: amountStr } };
}
