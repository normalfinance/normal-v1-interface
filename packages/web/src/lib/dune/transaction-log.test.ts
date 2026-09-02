import { transactionActionType, buildTransactionLogRows } from './transaction-log';

import type { ActivityV2Row } from './activity-v2';

function row(over: Partial<ActivityV2Row> = {}): ActivityV2Row {
  return {
    date: '2026-08-28T12:00:00.000Z',
    wallet_address: 'G1',
    product: 'soroswap',
    action: 'swap',
    provider: 'soroswap',
    chain: 'stellar',
    asset_in: 'XLM',
    asset_out: 'USDC',
    amount_token: 100,
    amount_usd: 17.6,
    fee_usd: 0.088,
    status: 'completed',
    tx_hash: 'h1',
    network: 'mainnet',
    ...over,
  };
}

describe('transactionActionType — old values keep their exact meaning', () => {
  it('a Soroswap swap is still plain "swap" so existing widgets keep working', () => {
    expect(transactionActionType(row())).toBe('swap');
  });

  it('the products the old table never saw get their own labels', () => {
    expect(transactionActionType(row({ product: 'lifi' }))).toBe('swap_lifi');
    expect(transactionActionType(row({ product: 'cctp' }))).toBe('swap_cctp');
    expect(transactionActionType(row({ product: 'send', action: 'send' }))).toBe('send');
    expect(transactionActionType(row({ product: 'ramp', action: 'onramp' }))).toBe('onramp');
    expect(transactionActionType(row({ product: 'ramp', action: 'offramp' }))).toBe('offramp');
  });

  it('savings keeps its deposit/withdraw split', () => {
    expect(transactionActionType(row({ product: 'savings', action: 'deposit' }))).toBe(
      'savings_deposit'
    );
    expect(transactionActionType(row({ product: 'savings', action: 'withdraw' }))).toBe(
      'savings_withdraw'
    );
  });
});

describe('buildTransactionLogRows', () => {
  it('carries USD fees, not source-token units', () => {
    const [out] = buildTransactionLogRows([row()]);
    expect(out.fee_usd).toBe(0.088); // 0.5 XLM would have been logged as "0.5" before
    expect(out.amount).toBe(100); // amount stays in asset_in units
  });

  it('logs only what happened — failed and refunded rows are left out', () => {
    const rows = buildTransactionLogRows([
      row(),
      row({ product: 'cctp', status: 'failed' }),
      row({ product: 'cctp', status: 'refunded' }),
    ]);
    expect(rows).toHaveLength(1);
  });
});
