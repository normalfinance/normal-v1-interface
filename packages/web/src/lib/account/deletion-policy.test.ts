import {
  DUST,
  hasInFlight,
  fundsVerdict,
  anonymousOwnerKey,
  turnkeyTimestampMs,
  EXPORT_FRESHNESS_MS,
  walletsMissingExport,
} from './deletion-policy';

describe('walletsMissingExport', () => {
  const now = Date.parse('2026-10-12T12:00:00Z');
  const fresh = now - 60_000;
  it('is satisfied only by a COMPLETED export per wallet within the freshness window', () => {
    expect(
      walletsMissingExport(
        ['w1', 'w2'],
        [
          { walletId: 'w1', status: 'ACTIVITY_STATUS_COMPLETED', createdAtMs: fresh },
          { walletId: 'w2', status: 'ACTIVITY_STATUS_COMPLETED', createdAtMs: fresh },
        ],
        now
      )
    ).toEqual([]);
  });
  it('reports wallets with no export, a failed export, or a stale one', () => {
    expect(
      walletsMissingExport(
        ['w1', 'w2', 'w3'],
        [
          { walletId: 'w1', status: 'ACTIVITY_STATUS_FAILED', createdAtMs: fresh },
          {
            walletId: 'w2',
            status: 'ACTIVITY_STATUS_COMPLETED',
            createdAtMs: now - EXPORT_FRESHNESS_MS - 1,
          },
        ],
        now
      )
    ).toEqual(['w1', 'w2', 'w3']);
  });
  it('ignores future-dated or unparseable timestamps', () => {
    expect(
      walletsMissingExport(
        ['w1'],
        [
          { walletId: 'w1', status: 'ACTIVITY_STATUS_COMPLETED', createdAtMs: now + 3_600_000 },
          { walletId: 'w1', status: 'ACTIVITY_STATUS_COMPLETED', createdAtMs: NaN },
        ],
        now
      )
    ).toEqual(['w1']);
  });
  it('no wallets means nothing to export', () => {
    expect(walletsMissingExport([], [], now)).toEqual([]);
  });
});

describe('turnkeyTimestampMs', () => {
  it('converts seconds + nanos', () => {
    expect(turnkeyTimestampMs({ seconds: '1760000000', nanos: '500000000' })).toBe(
      1_760_000_000_500
    );
  });
  it('is NaN for missing input', () => {
    expect(turnkeyTimestampMs(null)).toBeNaN();
    expect(turnkeyTimestampMs({ seconds: 'x' })).toBeNaN();
  });
});

describe('fundsVerdict', () => {
  it('flags balances above dust and ignores dust', () => {
    const v = fundsVerdict([
      { symbol: 'XLM', chain: 'stellar', balance: 1.5 },
      { symbol: 'USDC', chain: 'stellar', balance: 12 },
      { symbol: 'BTC', chain: 'bitcoin', balance: 0.00001 },
      { symbol: 'SAVINGS_USDC', chain: 'stellar', balance: 0 },
    ]);
    expect(v.present.map((b) => b.symbol)).toEqual(['USDC']);
    expect(v.unreadable).toEqual([]);
  });
  it('treats an unreadable balance as blocking, separately', () => {
    const v = fundsVerdict([{ symbol: 'ETH', chain: 'ethereum', balance: null }]);
    expect(v.present).toEqual([]);
    expect(v.unreadable.map((b) => b.symbol)).toEqual(['ETH']);
  });
  it('keeps the XLM reserve out of the way', () => {
    expect(DUST.XLM).toBeGreaterThanOrEqual(1.5);
  });
});

describe('hasInFlight', () => {
  it('any non-zero count blocks', () => {
    expect(hasInFlight({ cctp: 0, ramp: 0, moneygram: 0 })).toBe(false);
    expect(hasInFlight({ cctp: 0, ramp: 1, moneygram: 0 })).toBe(true);
  });
});

describe('anonymousOwnerKey', () => {
  it('is stable, prefixed, and does not contain the uid', () => {
    const k = anonymousOwnerKey('user-123', 'abcdef0123456789deadbeef');
    expect(k).toBe('deleted:abcdef0123456789');
    expect(k).not.toContain('user-123');
  });
});
