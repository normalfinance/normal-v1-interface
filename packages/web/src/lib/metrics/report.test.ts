import type { ActivityV2Row } from '@/lib/dune/activity-v2';

import { toPublicSnapshot, buildMetricsSnapshot } from './snapshot';
import { toCsv, MONTHLY_COLUMNS, monthlyReportCsv, buildMonthlyReport } from './report';

function activity(overrides: Partial<ActivityV2Row>): ActivityV2Row {
  return {
    date: '2026-10-05T10:00:00.000Z',
    wallet_address: 'GA',
    product: 'soroswap',
    action: 'swap',
    provider: 'soroswap',
    chain: 'stellar',
    asset_in: 'XLM',
    asset_out: 'USDC',
    amount_token: 1,
    amount_usd: 10,
    fee_usd: 0.05,
    status: 'completed',
    tx_hash: '',
    network: 'mainnet',
    ...overrides,
  };
}

const NOW = new Date('2026-11-13T05:08:00.000Z');

const snapshot = toPublicSnapshot(
  buildMetricsSnapshot(
    {
      users: [
        { user_id: '1', email: '', created_at: '2026-10-02T00:00:00Z', network: 'mainnet' },
        { user_id: '2', email: '', created_at: '2026-11-02T00:00:00Z', network: 'mainnet' },
        { user_id: '3', email: '', created_at: '2026-11-03T00:00:00Z', network: 'mainnet' },
      ],
      activity: [
        activity({}),
        activity({ wallet_address: 'GB', date: '2026-10-20T10:00:00Z', amount_usd: 30 }),
        activity({
          product: 'cctp',
          chain: 'solana',
          asset_in: 'SOL',
          wallet_address: 'SOL1',
          date: '2026-11-04T10:00:00Z',
          amount_usd: 100,
          fee_usd: 0.5,
        }),
      ],
      walletChains: [
        {
          date: '2026-10-02T00:00:00.000Z',
          chain: 'stellar',
          wallets_added: 1,
          network: 'mainnet',
        },
        {
          date: '2026-11-02T00:00:00.000Z',
          chain: 'stellar',
          wallets_added: 2,
          network: 'mainnet',
        },
        { date: '2026-11-02T00:00:00.000Z', chain: 'solana', wallets_added: 1, network: 'mainnet' },
      ],
      vaultSnapshots: [
        {
          date: '2026-10-31T00:00:00Z',
          vault_address: 'V',
          network: 'mainnet',
          tvl_usd: 500,
          pps: 1,
          total_supply: 1,
        },
        {
          date: '2026-11-12T00:00:00Z',
          vault_address: 'V',
          network: 'mainnet',
          tvl_usd: 650,
          pps: 1,
          total_supply: 1,
        },
      ],
    },
    {},
    null,
    NOW
  )
)!;

describe('monthly report', () => {
  const rows = buildMonthlyReport(snapshot, '2026-11-13');
  const byMonth = Object.fromEntries(rows.map((r) => [r.month, r]));

  it('has one row per month from the first data to this month', () => {
    expect(rows.map((r) => r.month)).toEqual(['2026-10', '2026-11']);
  });

  it('adds flows within each month', () => {
    expect(byMonth['2026-10']).toMatchObject({
      newUsers: 1,
      actions: 2,
      volumeUsd: 40,
      activeWallets: 2,
      stellarActions: 2,
      stellarVolumeUsd: 40,
    });
    expect(byMonth['2026-11']).toMatchObject({
      newUsers: 2,
      actions: 1,
      volumeUsd: 100,
      cctpIntoStellarUsd: 100,
      stellarActiveWallets: 1,
    });
    expect(byMonth['2026-11'].revenueUsd).toBeCloseTo(0.5);
  });

  it('reads savings at month end and new wallets as growth', () => {
    expect(byMonth['2026-10'].savingsEndUsd).toBe(500);
    expect(byMonth['2026-11'].savingsEndUsd).toBe(650);
    expect(byMonth['2026-10']).toMatchObject({ newWallets: 1, newStellarWallets: 1 });
    expect(byMonth['2026-11']).toMatchObject({ newWallets: 3, newStellarWallets: 2 });
  });

  it('writes a CSV with one header and money in cents', () => {
    const csv = monthlyReportCsv(rows).split('\r\n');
    expect(csv).toHaveLength(3);
    expect(csv[0].split(',')).toHaveLength(MONTHLY_COLUMNS.length);
    expect(csv[1].startsWith('2026-10,1,2,2,40.00,')).toBe(true);
  });
});

describe('csv', () => {
  it('quotes cells that hold a comma, a quote or a line break', () => {
    expect(toCsv(['a', 'b'], [['x,y', 'say "hi"']])).toBe('a,b\r\n"x,y","say ""hi"""');
  });
});
