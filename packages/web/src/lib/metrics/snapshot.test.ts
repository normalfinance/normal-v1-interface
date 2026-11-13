import type { ActivityV2Row, HoldingsSnapshotRow } from '@/lib/dune/activity-v2';

import {
  dayOf,
  buildUsers,
  buildYield,
  daysBetween,
  buildRevenue,
  buildActivity,
  buildDistinct,
  buildHoldings,
  toTeamSnapshot,
  buildSavingsTvl,
  toPublicSnapshot,
  buildActivityLog,
  settlesOnStellar,
  PRE_RECORDING_FEES,
  ACTIVITY_LOG_LIMIT,
  buildWalletsByChain,
  buildMetricsSnapshot,
} from './snapshot';

const TODAY = '2026-11-13';

function activity(overrides: Partial<ActivityV2Row> = {}): ActivityV2Row {
  return {
    date: '2026-09-01T10:00:00.000Z',
    wallet_address: 'GWALLET1',
    product: 'soroswap',
    action: 'swap',
    provider: 'soroswap',
    chain: 'stellar',
    asset_in: 'XLM',
    asset_out: 'USDC',
    amount_token: 100,
    amount_usd: 20,
    fee_usd: 0.1,
    status: 'completed',
    tx_hash: 'hash',
    network: 'mainnet',
    ...overrides,
  };
}

function holding(overrides: Partial<HoldingsSnapshotRow>): HoldingsSnapshotRow {
  return {
    snapshot_date: '2026-11-13T05:07:00.000Z',
    chain: 'stellar',
    asset: 'XLM',
    wallets_counted: 1,
    balance_total: 0,
    usd_total: 0,
    network: 'mainnet',
    ...overrides,
  };
}

describe('dates', () => {
  it('reads the UTC day of any parseable timestamp', () => {
    expect(dayOf('2026-09-02T23:59:59.000Z')).toBe('2026-09-02');
    expect(dayOf('2025-10-03T12:34:56.789012+00:00')).toBe('2025-10-03');
    expect(dayOf('not a date')).toBeNull();
  });
  it('lists every day between two days, both included', () => {
    expect(daysBetween('2026-02-27', '2026-03-02')).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
  });
});

describe('users', () => {
  it('counts every account and groups sign-ups by day', () => {
    const rows = ['2026-01-05T10:00:00Z', '2026-01-05T22:00:00Z', '2026-01-07T01:00:00Z'].map(
      (created_at, i) => ({ user_id: `u${i}`, email: '', created_at, network: 'mainnet' })
    );
    expect(buildUsers(rows)).toEqual({
      total: 3,
      signupsByDay: [
        { day: '2026-01-05', value: 2 },
        { day: '2026-01-07', value: 1 },
      ],
    });
  });
});

describe('distinct wallets', () => {
  const entries = [
    { day: '2026-11-02', wallet: 'A' },
    { day: '2026-11-02', wallet: 'A' },
    { day: '2026-11-03', wallet: 'A' },
    { day: '2026-11-03', wallet: 'B' },
    { day: '2026-10-20', wallet: 'C' },
  ];

  it('counts each wallet once per day, week and month', () => {
    const d = buildDistinct(entries, TODAY);
    expect(d.daily.find((p) => p.day === '2026-11-03')?.value).toBe(2);
    expect(d.daily.find((p) => p.day === '2026-11-04')?.value).toBe(0);
    expect(d.daily[d.daily.length - 1].day).toBe(TODAY);
    // 2 and 3 November share the week starting Monday 2 November.
    expect(d.weekly.find((p) => p.day === '2026-11-02')?.value).toBe(2);
    expect(d.monthly).toEqual([
      { day: '2026-10-01', value: 1 },
      { day: '2026-11-01', value: 2 },
    ]);
  });

  it('counts each wallet once inside every period window', () => {
    const { window } = buildDistinct(entries, TODAY);
    expect(window['7d']).toBe(0);
    expect(window['30d']).toBe(3);
    expect(window.all).toBe(3);
  });
});

describe('activity (3.1, 3.6 to 3.9)', () => {
  const rows = [
    activity({ amount_usd: 20, date: '2026-11-01T10:00:00Z' }),
    activity({ amount_usd: 30, asset_in: 'USDC', asset_out: 'XLM', date: '2026-11-02T10:00:00Z' }),
    activity({
      product: 'savings',
      action: 'deposit',
      amount_usd: 100,
      date: '2026-11-02T11:00:00Z',
    }),
    activity({ product: 'cctp', amount_usd: 1_000, status: 'failed' }),
    activity({
      product: 'lifi',
      chain: 'solana',
      asset_in: 'SOL',
      asset_out: 'ETH',
      amount_usd: 7,
      wallet_address: 'SOLWALLET',
      date: '2026-11-02T12:00:00Z',
    }),
  ];
  const { activity: built } = buildActivity(rows, TODAY);
  const total = (data: { days: string[]; series: { name: string; data: number[] }[] }) =>
    Object.fromEntries(data.series.map((s) => [s.name, s.data.reduce((a, b) => a + b, 0)]));

  it('keeps completed actions only, per day', () => {
    expect(built.actionsByDay).toEqual([
      { day: '2026-11-01', value: 1 },
      { day: '2026-11-02', value: 3 },
    ]);
  });

  it('splits volume by product and by the chain each action started on', () => {
    expect(total(built.volumeByProduct)).toEqual({ savings: 100, soroswap: 50, lifi: 7 });
    expect(total(built.volumeByChain)).toEqual({ solana: 7, stellar: 150 });
    expect(built.volumeByChain.series.map((s) => s.name)).toEqual(['solana', 'stellar']);
  });

  it('keeps every swap route per day, largest first', () => {
    expect(built.volumeByRoute.series.map((s) => s.name)).toEqual([
      'USDC → XLM',
      'XLM → USDC',
      'SOL → ETH',
    ]);
  });

  it('counts active wallets across every product', () => {
    expect(built.activeWallets.window['30d']).toBe(2);
  });
});

describe('Stellar', () => {
  it('counts what settles on Stellar, including CCTP bridges into it', () => {
    expect(settlesOnStellar(activity({ product: 'savings' }))).toBe(true);
    expect(settlesOnStellar(activity({ product: 'cctp', chain: 'solana' }))).toBe(true);
    expect(settlesOnStellar(activity({ product: 'lifi', chain: 'solana' }))).toBe(false);
    expect(settlesOnStellar(activity({ product: 'send', chain: 'ethereum' }))).toBe(false);
  });

  it('separates bridges in and out of Stellar and MoneyGram cash in and out', () => {
    const { stellar } = buildActivity(
      [
        activity({ product: 'cctp', chain: 'solana', asset_in: 'SOL', amount_usd: 40 }),
        activity({ product: 'cctp', chain: 'stellar', asset_in: 'USDC', amount_usd: 15 }),
        activity({ product: 'ramp', provider: 'moneygram', action: 'onramp', amount_usd: 60 }),
        activity({ product: 'ramp', provider: 'moneygram', action: 'offramp', amount_usd: 25 }),
        activity({ product: 'ramp', provider: 'coinbase', action: 'onramp', chain: 'solana' }),
      ],
      TODAY
    );
    expect(stellar.cctpInByDay).toEqual([{ day: '2026-09-01', value: 40 }]);
    expect(stellar.cctpOutByDay).toEqual([{ day: '2026-09-01', value: 15 }]);
    expect(stellar.moneygramInByDay).toEqual([{ day: '2026-09-01', value: 60 }]);
    expect(stellar.moneygramOutByDay).toEqual([{ day: '2026-09-01', value: 25 }]);
    // Everything but the Coinbase buy on Solana settles on Stellar.
    expect(stellar.actionsByDay).toEqual([{ day: '2026-09-01', value: 4 }]);
    expect(stellar.volumeByDay).toEqual([{ day: '2026-09-01', value: 140 }]);
  });
});

describe('revenue (3.2 to 3.5)', () => {
  const rows = [
    activity({ product: 'soroswap', fee_usd: 1, date: '2026-09-01T10:00:00Z' }),
    activity({ product: 'lifi', fee_usd: 2, date: '2026-09-01T11:00:00Z' }),
    activity({ product: 'cctp', fee_usd: 3, date: '2026-09-03T11:00:00Z' }),
    activity({ product: 'savings', fee_usd: 4, date: '2026-09-03T12:00:00Z' }),
    activity({ product: 'cctp', fee_usd: 50, status: 'refunded' }),
  ];

  it('counts the fee wallets when they hold more than the recorded LI.FI and CCTP fees', () => {
    const revenue = buildRevenue(rows, 12);
    // soroswap 1 + savings 4 + max(lifi 2 + cctp 3, wallets 12)
    expect(revenue.totalUsd).toBe(17);
    expect(revenue.byProduct).toContainEqual({ label: PRE_RECORDING_FEES, value: 7 });
  });

  it('counts the recorded fees when the fee wallets hold less', () => {
    const revenue = buildRevenue(rows, 1);
    expect(revenue.totalUsd).toBe(10);
    expect(revenue.byProduct.map((s) => s.label)).not.toContain(PRE_RECORDING_FEES);
  });

  it('stacks daily fees per product on one shared list of days', () => {
    const { dailyByProduct } = buildRevenue(rows, 0);
    expect(dailyByProduct.days).toEqual(['2026-09-01', '2026-09-03']);
    const byName = Object.fromEntries(dailyByProduct.series.map((s) => [s.name, s.data]));
    expect(byName).toEqual({ savings: [0, 4], cctp: [0, 3], lifi: [2, 0], soroswap: [1, 0] });
  });

  it('ends the cumulative line at the recorded total, below the headline by the pre-recording slice', () => {
    const revenue = buildRevenue(rows, 12);
    expect(revenue.cumulative).toEqual([
      { day: '2026-09-01', value: 3 },
      { day: '2026-09-03', value: 10 },
    ]);
    expect(revenue.totalUsd - revenue.cumulative[1].value).toBe(7);
  });
});

describe('wallets by chain (3.10)', () => {
  it('carries each running total across every day, in fixed chain order', () => {
    const series = buildWalletsByChain(
      [
        {
          date: '2026-06-07T00:00:00.000Z',
          chain: 'stellar',
          wallets_added: 2,
          network: 'mainnet',
        },
        {
          date: '2026-06-07T00:00:00.000Z',
          chain: 'bitcoin',
          wallets_added: 1,
          network: 'mainnet',
        },
        {
          date: '2026-06-09T00:00:00.000Z',
          chain: 'stellar',
          wallets_added: 3,
          network: 'mainnet',
        },
      ],
      '2026-06-10'
    );
    expect(series.days).toEqual(['2026-06-07', '2026-06-08', '2026-06-09', '2026-06-10']);
    expect(series.series).toEqual([
      { name: 'bitcoin', data: [1, 1, 1, 1] },
      { name: 'stellar', data: [2, 2, 5, 5] },
    ]);
  });
});

describe('savings TVL', () => {
  it('keeps the last reading of each day and reports the latest as now', () => {
    const row = (date: string, tvl_usd: number) => ({
      date,
      vault_address: 'V',
      network: 'mainnet',
      tvl_usd,
      pps: 1,
      total_supply: 1,
    });
    expect(
      buildSavingsTvl([
        row('2026-09-02T00:00:00Z', 50),
        row('2026-09-01T08:00:00Z', 10),
        row('2026-09-01T20:00:00Z', 12),
      ])
    ).toEqual({
      tvlUsd: 50,
      tvlByDay: [
        { day: '2026-09-01', value: 12 },
        { day: '2026-09-02', value: 50 },
      ],
    });
  });
});

describe('yield earned', () => {
  const row = (wallet_address: string, total_interest_earned: number) => ({
    snapshot_date: '2026-11-13T05:07:00Z',
    wallet_address,
    vault_address: 'V',
    network: 'mainnet',
    total_interest_earned,
    total_deposited: 100,
    current_position: 100,
    roi: 0,
  });

  it('keeps savers who withdrew everything and updates the ones still saving', () => {
    const result = buildYield([row('A', 5)], { A: 3, GONE: 2 });
    expect(result.yieldByWallet).toEqual({ A: 5, GONE: 2 });
    expect(result.yieldEarnedUsd).toBe(7);
  });
});

describe('holdings, fee wallets and relayer gas (3.13 to 3.15)', () => {
  const rows = [
    holding({ chain: 'stellar', asset: 'USDC', balance_total: 900, usd_total: 900 }),
    holding({ chain: 'stellar', asset: 'XLM', balance_total: 1000, usd_total: 200 }),
    holding({ chain: 'stellar', asset: 'SAVINGS', balance_total: 5000, usd_total: 5000 }),
    holding({ chain: 'treasury', asset: 'FEES', balance_total: 40, usd_total: 40 }),
    holding({ chain: 'treasury', asset: 'GAS_BASE', balance_total: 0.0058, usd_total: 26.8 }),
    holding({ chain: 'treasury', asset: 'GAS_STELLAR', balance_total: 12, usd_total: 2.2 }),
    holding({ chain: 'treasury', asset: 'GAS_ETHEREUM', balance_total: 0, usd_total: 0 }),
  ];
  const addresses = { evm: '0xEVM', stellar: 'GSTELLAR' };

  it('counts user money only, largest first', () => {
    expect(buildHoldings(rows, addresses).byAsset.map((h) => h.asset)).toEqual([
      'SAVINGS',
      'USDC',
      'XLM',
    ]);
  });

  it('reads the fee wallets apart from user holdings', () => {
    expect(buildHoldings(rows, addresses).feesInWalletsUsd).toBe(40);
  });

  it('gives each relayer a verdict and its top-up address', () => {
    const gas = Object.fromEntries(
      buildHoldings(rows, addresses).gasFloat.map((g) => [g.asset, g])
    );
    expect(gas.GAS_BASE).toMatchObject({ status: 'ok', address: '0xEVM' });
    expect(gas.GAS_STELLAR).toMatchObject({
      status: 'top-up',
      verdict: 'Top up: under ~40 mints left',
      address: 'GSTELLAR',
    });
    expect(gas.GAS_ETHEREUM).toMatchObject({ status: 'ignore', address: '0xEVM' });
  });

  it('asks for a Base top-up under 0.002 ETH', () => {
    const low = buildHoldings(
      [holding({ chain: 'treasury', asset: 'GAS_BASE', balance_total: 0.0019, usd_total: 8 })],
      addresses
    );
    expect(low.gasFloat[0].status).toBe('top-up');
  });
});

describe('activity log', () => {
  it('lists completed actions newest first', () => {
    const log = buildActivityLog([
      activity({ date: '2026-09-01T10:00:00Z', tx_hash: 'old' }),
      activity({ date: '2026-09-02T10:00:00Z', tx_hash: 'new', product: 'cctp' }),
      activity({ date: '2026-09-03T10:00:00Z', status: 'failed' }),
    ]);
    expect(log.total).toBe(2);
    expect(log.rows.map((r) => [r.txHash, r.action])).toEqual([
      ['new', 'swap_cctp'],
      ['old', 'swap'],
    ]);
  });

  it(`keeps the newest ${ACTIVITY_LOG_LIMIT} and still counts them all`, () => {
    const many = Array.from({ length: ACTIVITY_LOG_LIMIT + 20 }, (_, i) =>
      activity({ date: new Date(Date.UTC(2026, 0, 1) + i * 60_000).toISOString() })
    );
    const log = buildActivityLog(many);
    expect(log.rows).toHaveLength(ACTIVITY_LOG_LIMIT);
    expect(log.total).toBe(ACTIVITY_LOG_LIMIT + 20);
  });
});

describe('the whole snapshot', () => {
  const NOW = new Date('2026-11-13T05:08:00.000Z');
  const LATER = new Date('2026-11-14T05:08:00.000Z');
  const yieldRow = (wallet_address: string, total_interest_earned: number) => ({
    snapshot_date: NOW.toISOString(),
    wallet_address,
    vault_address: 'V',
    network: 'mainnet',
    total_interest_earned,
    total_deposited: 10,
    current_position: 10,
    roi: 0,
  });

  it('marks every source it refreshed', () => {
    const snapshot = buildMetricsSnapshot(
      {
        users: [],
        activity: [],
        walletChains: [],
        vaultSnapshots: [],
        yieldRows: [],
        holdings: [],
      },
      {},
      null,
      NOW
    );
    expect(Object.values(snapshot.sections)).toEqual(
      Array(6).fill({ updatedAt: NOW.toISOString(), error: null })
    );
  });

  it('keeps the previous numbers for a source that failed, and says so', () => {
    const first = buildMetricsSnapshot(
      {
        users: [
          { user_id: 'u', email: '', created_at: '2026-01-01T00:00:00Z', network: 'mainnet' },
        ],
        activity: [activity({ amount_usd: 20 })],
      },
      {},
      null,
      NOW
    );
    const second = buildMetricsSnapshot(
      { users: [] },
      { activity: 'Prisma timed out' },
      first,
      LATER
    );
    expect(second.users.total).toBe(0);
    expect(second.activity.actionsByDay).toEqual([{ day: '2026-09-01', value: 1 }]);
    expect(second.sections.activity).toEqual({
      updatedAt: NOW.toISOString(),
      error: 'Prisma timed out',
    });
    expect(first.generatedAt).toBe(NOW.toISOString());
  });

  it('records the yield total once a day and keeps the ledger off every page', () => {
    const first = buildMetricsSnapshot({ yieldRows: [yieldRow('GONE', 2)] }, {}, null, NOW);
    const second = buildMetricsSnapshot({ yieldRows: [yieldRow('A', 3)] }, {}, first, LATER);
    expect(second.savings.yieldEarnedUsd).toBe(5);
    expect(second.savings.yieldByDay).toEqual([
      { day: '2026-11-13', value: 2 },
      { day: '2026-11-14', value: 5 },
    ]);
    expect(toPublicSnapshot(second)).not.toHaveProperty('internal');
    expect(toTeamSnapshot(second)).not.toHaveProperty('internal');
  });

  it('keeps the gas table and the per-wallet log off the public page only', () => {
    const snapshot = buildMetricsSnapshot(
      {
        activity: [activity()],
        holdings: [
          holding({ chain: 'treasury', asset: 'GAS_BASE', balance_total: 1, usd_total: 3 }),
        ],
      },
      {},
      null,
      NOW
    );
    expect(toPublicSnapshot(snapshot)).not.toHaveProperty('private');
    expect(toTeamSnapshot(snapshot)?.private.gasFloat).toHaveLength(1);
    expect(toTeamSnapshot(snapshot)?.private.activityLog.total).toBe(1);
  });

  it('carries the yield ledger over from the previous snapshot format', () => {
    const snapshot = buildMetricsSnapshot({ yieldRows: [] }, {}, null, NOW, { OLD: 4 });
    expect(snapshot.savings.yieldEarnedUsd).toBe(4);
  });
});
