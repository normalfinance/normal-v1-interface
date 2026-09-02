// ---------------------------------------------------------------------------
// Legacy `normal_transaction_log` rows, derived from the SAME activity rows
// that feed activity_v2 (doc 125). The old builder read swap_logs +
// vault_deposits directly, so the table never saw CCTP, sends or ramps, and
// its fee_usd column carried raw token units (1 XLM counted as $1 — the same
// defect doc 122 fixed in the volume table).
//
// The Dune table's schema is fixed, so the mapping is deliberately lossy:
// product/status/chain/amount_usd exist only in activity_v2. Existing
// action_type values ('swap', 'savings_deposit', 'savings_withdraw') keep
// their exact meaning so old dashboard widgets that filter on them still work.
// ---------------------------------------------------------------------------

import type { TransactionLogRow } from './tables';
import type { ActivityV2Row } from './activity-v2';

export function transactionActionType(row: ActivityV2Row): string {
  switch (row.product) {
    case 'soroswap':
      return 'swap'; // unchanged: what this table has always meant by 'swap'
    case 'lifi':
      return 'swap_lifi';
    case 'cctp':
      return 'swap_cctp';
    case 'savings':
      return row.action === 'deposit' ? 'savings_deposit' : 'savings_withdraw';
    case 'send':
      return 'send';
    case 'ramp':
      return row.action === 'offramp' ? 'offramp' : 'onramp';
    default:
      return row.action;
  }
}

export function buildTransactionLogRows(rows: ActivityV2Row[]): TransactionLogRow[] {
  // Completed only — this table has always been a log of things that happened,
  // never of attempts (failed/refunded CCTP rows live in activity_v2).
  return rows
    .filter((r) => r.status === 'completed')
    .map((r) => ({
      date: r.date,
      wallet_address: r.wallet_address,
      action_type: transactionActionType(r),
      asset_in: r.asset_in,
      asset_out: r.asset_out,
      amount: r.amount_token,
      fee_usd: r.fee_usd, // real USD now, not source-token units
      tx_hash: r.tx_hash,
      network: r.network,
    }));
}
