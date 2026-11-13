import {
  addDays,
  periodOf,
  sumSince,
  bucketOf,
  aggregate,
  bucketKeys,
  windowStart,
  stackedTotals,
  lastOnOrBefore,
  aggregateStacked,
} from './periods';

const TODAY = '2026-11-13'; // a Friday

describe('windows', () => {
  it('counts today as the last day of the window', () => {
    expect(windowStart(periodOf('7d'), TODAY)).toBe('2026-11-07');
    expect(windowStart(periodOf('30d'), TODAY)).toBe('2026-10-15');
    expect(windowStart(periodOf('all'), TODAY)).toBeNull();
  });

  it('falls back to the last 30 days for an unknown period', () => {
    expect(periodOf('nonsense').key).toBe('30d');
    expect(periodOf(null).key).toBe('30d');
  });

  it('crosses month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('buckets', () => {
  it('starts weeks on Monday and months on the 1st', () => {
    expect(bucketOf('2026-11-13', 'week')).toBe('2026-11-09');
    expect(bucketOf('2026-11-09', 'week')).toBe('2026-11-09');
    expect(bucketOf('2026-11-15', 'week')).toBe('2026-11-09'); // Sunday
    expect(bucketOf('2026-11-13', 'month')).toBe('2026-11-01');
  });

  it('lists consecutive buckets, across a year end', () => {
    expect(bucketKeys('2026-11-20', '2027-01-03', 'month')).toEqual([
      '2026-11-01',
      '2026-12-01',
      '2027-01-01',
    ]);
    expect(bucketKeys('2026-11-13', '2026-11-24', 'week')).toEqual([
      '2026-11-09',
      '2026-11-16',
      '2026-11-23',
    ]);
  });
});

describe('aggregate', () => {
  const signups = [
    { day: '2026-11-08', value: 2 },
    { day: '2026-11-10', value: 3 },
    { day: '2026-11-13', value: 1 },
    { day: '2026-10-01', value: 50 },
  ];

  it('adds flows per bucket inside the window and shows empty days as 0', () => {
    const days = aggregate(signups, periodOf('7d'), TODAY, 'sum');
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ day: '2026-11-07', value: 0 });
    expect(days.find((p) => p.day === '2026-11-10')).toEqual({ day: '2026-11-10', value: 3 });
    expect(days.reduce((sum, p) => sum + p.value, 0)).toBe(6);
  });

  it('groups all time into months from the first data', () => {
    expect(aggregate(signups, periodOf('all'), TODAY, 'sum')).toEqual([
      { day: '2026-10-01', value: 50 },
      { day: '2026-11-01', value: 6 },
    ]);
  });

  it('carries a level across buckets without a reading, starting from before the window', () => {
    const tvl = [
      { day: '2026-11-01', value: 100 },
      { day: '2026-11-11', value: 140 },
    ];
    expect(aggregate(tvl, periodOf('7d'), TODAY, 'last').map((p) => p.value)).toEqual([
      100, 100, 100, 100, 140, 140, 140,
    ]);
  });

  it('keeps stacked series on one set of buckets and drops empty ones', () => {
    const stacked = aggregateStacked(
      {
        days: ['2026-11-09', '2026-11-12'],
        series: [
          { name: 'savings', data: [1, 2] },
          { name: 'send', data: [0, 0] },
        ],
      },
      periodOf('7d'),
      TODAY,
      'sum'
    );
    expect(stacked.days).toHaveLength(7);
    expect(stacked.series).toEqual([{ name: 'savings', data: [0, 0, 1, 0, 0, 2, 0] }]);
  });
});

describe('totals', () => {
  it('adds a window and reads a level before a day', () => {
    const points = [
      { day: '2026-11-01', value: 5 },
      { day: '2026-11-12', value: 7 },
    ];
    expect(sumSince(points, '2026-11-07')).toBe(7);
    expect(sumSince(points, null)).toBe(12);
    expect(lastOnOrBefore(points, '2026-11-11')).toBe(5);
    expect(lastOnOrBefore(points, '2026-10-01')).toBeNull();
  });

  it('ranks stacked totals over a window', () => {
    expect(
      stackedTotals(
        {
          days: ['2026-11-01', '2026-11-12'],
          series: [
            { name: 'a', data: [9, 1] },
            { name: 'b', data: [0, 4] },
          ],
        },
        '2026-11-07'
      )
    ).toEqual([
      { label: 'b', value: 4 },
      { label: 'a', value: 1 },
    ]);
  });
});
