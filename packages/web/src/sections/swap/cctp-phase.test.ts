import { waitsOn, bannerPhase, autoFinishAhead, exchangeSlowAfterMs } from './cctp-phase';

const row = (over: Partial<Parameters<typeof bannerPhase>[0]>) => ({
  status: 'CREATED',
  direction: 'crosschain_to_stellar',
  srcSwapTxHash: null,
  burnTxHash: null,
  mintTxHash: null,
  dstSwapTxHash: null,
  ...over,
});

describe('bannerPhase — terminal rows are invisible', () => {
  it('hides a FAILED inbound row with a source hash — the live 2026-08-28 ghost', () => {
    // The state machine retired the reverted ETH→USDC row (Activity showed
    // "Failed"), yet the banner still said "finish once it arrives": FAILED
    // was missing from the hidden list, so the row fell through to
    // halt-receive. Two surfaces told two stories about one dead swap.
    expect(bannerPhase(row({ status: 'FAILED', srcSwapTxHash: '0x15b128ad' }))).toBe('hidden');
  });

  it('hides FAILED regardless of direction or hashes', () => {
    expect(
      bannerPhase(
        row({
          status: 'FAILED',
          direction: 'stellar_to_crosschain',
          burnTxHash: '0xburn',
          mintTxHash: '0xmint',
        })
      )
    ).toBe('hidden');
  });

  it('hides REFUNDED and COMPLETED as before', () => {
    expect(bannerPhase(row({ status: 'REFUNDED', srcSwapTxHash: '0xa' }))).toBe('hidden');
    expect(bannerPhase(row({ status: 'COMPLETED', srcSwapTxHash: '0xa' }))).toBe('hidden');
  });
});

describe('bannerPhase — live rows keep their phases', () => {
  it('inbound with a source hash and no burn needs the receive tap', () => {
    expect(bannerPhase(row({ srcSwapTxHash: '0xa' }))).toBe('halt-receive');
  });

  it('inbound mid-bridge is automatic', () => {
    expect(bannerPhase(row({ srcSwapTxHash: '0xa', burnTxHash: '0xb' }))).toBe('auto');
  });

  it('inbound before any transaction has nothing to recover', () => {
    expect(bannerPhase(row({}))).toBe('hidden');
  });

  it('outbound minted-but-unpivoted needs the finish tap', () => {
    expect(
      bannerPhase(row({ direction: 'stellar_to_crosschain', burnTxHash: '0xb', mintTxHash: '0xm' }))
    ).toBe('halt-finish');
  });

  it('outbound settled or pre-burn stays hidden', () => {
    expect(
      bannerPhase(
        row({ direction: 'stellar_to_crosschain', burnTxHash: '0xb', dstSwapTxHash: '0xd' })
      )
    ).toBe('hidden');
    expect(bannerPhase(row({ direction: 'stellar_to_crosschain' }))).toBe('hidden');
  });
});

describe('waitsOn: who a swap under way waits on (Niko 2026-11-10)', () => {
  it('the Bitcoin swap in the report: still with the exchange, nobody is needed', () => {
    // "Your swap needs you" while Bitcoin confirmed the payment, and "Finish
    // the swap" could only answer "not yet".
    expect(waitsOn('halt-receive', { onBase: false, autoFinish: true })).toBe('exchange');
    expect(waitsOn('halt-receive', { onBase: false, autoFinish: false })).toBe('exchange');
  });

  it('at the Base address: auto-finish takes it, or it needs the person', () => {
    expect(waitsOn('halt-receive', { onBase: true, autoFinish: true })).toBe('normal');
    expect(waitsOn('halt-receive', { onBase: true, autoFinish: false })).toBe('person');
    expect(waitsOn('halt-finish', { onBase: true, autoFinish: true })).toBe('normal');
    expect(waitsOn('halt-finish', { onBase: true, autoFinish: false })).toBe('person');
  });

  it('Circle carrying it never needs anyone', () => {
    expect(waitsOn('auto', { onBase: false, autoFinish: false })).toBe('normal');
  });
});

describe("autoFinishAhead: the cron's own clocks per direction", () => {
  const now = Date.parse('2026-11-10T17:30:00Z');
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

  it('a swap in counts from its creation', () => {
    const fresh = {
      direction: 'crosschain_to_stellar',
      createdAt: hoursAgo(0.5),
      updatedAt: hoursAgo(0.5),
    };
    expect(autoFinishAhead(fresh, now)).toBe(true);
    // Touched a minute ago, but created three days ago: too old for the cron.
    const old = {
      direction: 'crosschain_to_stellar',
      createdAt: hoursAgo(72),
      updatedAt: hoursAgo(0.02),
    };
    expect(autoFinishAhead(old, now)).toBe(false);
  });

  it('a swap out counts from its last change', () => {
    const minted = {
      direction: 'stellar_to_crosschain',
      createdAt: hoursAgo(72),
      updatedAt: hoursAgo(1),
    };
    expect(autoFinishAhead(minted, now)).toBe(true);
  });

  it("attempts used up: the person's to finish", () => {
    const tried = {
      direction: 'crosschain_to_stellar',
      createdAt: hoursAgo(1),
      updatedAt: hoursAgo(1),
      retryCount: 12,
    };
    expect(autoFinishAhead(tried, now)).toBe(false);
  });
});

describe('exchangeSlowAfterMs: when an exchange wait is longer than usual', () => {
  it("twice the chain's settlement window from the CHAINS registry", () => {
    expect(exchangeSlowAfterMs('BTC')).toBe(120 * 60_000); // usually 10 to 60 minutes
  });

  it("never under 15 minutes, so a fast chain's slow minute is not called late", () => {
    expect(exchangeSlowAfterMs('SOL')).toBe(15 * 60_000);
    expect(exchangeSlowAfterMs('ETH')).toBe(15 * 60_000);
  });
});
