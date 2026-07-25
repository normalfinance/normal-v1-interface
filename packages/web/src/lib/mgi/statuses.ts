// Shared SEP-24 status buckets for MoneyGram transactions, used by the
// activity feed, the pending banner, and the detail modal so they never
// disagree on what counts as "in flight".

/** Our DB row for a MoneyGram transaction (see prisma MoneyGramTransaction). */
export interface MgiDbTransaction {
  id: string;
  walletAddress: string;
  kind: 'deposit' | 'withdrawal';
  status: string;
  amount: string | null;
  externalTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Statuses MoneyGram can report that we accept on report-back. */
export const KNOWN_MGI_STATUSES = new Set([
  'incomplete',
  'pending_user_transfer_start',
  'pending_user_transfer_complete',
  'pending_anchor',
  'pending_stellar',
  'pending_external',
  'completed',
  'refunded',
  'expired',
  'no_market',
  'too_small',
  'too_large',
  'error',
]);

/** In flight — the user (or MoneyGram) still has something to do. */
export const PENDING_MGI_STATUSES = new Set([
  'pending_user_transfer_start',
  'pending_user_transfer_complete',
  'pending_anchor',
  'pending_stellar',
  'pending_external',
]);

/** Terminal and unsuccessful. */
export const FAILED_MGI_STATUSES = new Set([
  'error',
  'expired',
  'no_market',
  'too_small',
  'too_large',
]);

/** Nothing will change anymore — stop polling these. */
export const TERMINAL_MGI_STATUSES = new Set([
  'completed',
  'refunded',
  ...FAILED_MGI_STATUSES,
]);
