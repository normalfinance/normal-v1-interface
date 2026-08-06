import type { SavingsPosition } from '@/types/savings';

// Explicit imports rather than jest's ambient globals: this monorepo (Yarn 3)
// hoists @types/jest to the root node_modules, which command-line tsc resolves
// but editor TS servers reliably do not — the file would typecheck in CI and
// show phantom "Cannot find name 'describe'" errors in the IDE. @jest/globals
// carries its own types, so the file is self-contained everywhere.
import { it, expect, describe } from '@jest/globals';
import { buildAsset, applyStaleFallback, reconcileSavingsPosition } from '@/lib/portfolio/normalize';

// ---------------------------------------------------------------------------
// First real test suite in the app, and deliberately on this module: it is
// pure logic with no I/O, and it has already produced two money-display bugs.
// Each test is anchored either to a bug that actually happened (named as such)
// or to a rule the module's comments promise. If a refactor breaks one of
// these, it is re-introducing a bug users have already seen once.
// ---------------------------------------------------------------------------

const pos = (totalDeposited: number, currentValue: number, earnings = 0): SavingsPosition => ({
  shares: '1',
  currentValue: String(currentValue),
  totalDeposited: String(totalDeposited),
  earnings: String(earnings),
});

describe('reconcileSavingsPosition', () => {
  // BUG (2026-08): depositing 4.24 into a 10.67 position. The optimistic cache
  // knew totalDeposited=14.91; the next API read still said 10.67 (DeFindex's
  // events indexer lags 30-120s) while currentValue was already 14.91. The old
  // 20%-threshold heuristic accepted the stale read, so the deposit itself was
  // displayed as 4.24 of earnings.
  it('keeps the cached totalDeposited when the deposits feed lags a deposit', () => {
    const prev = pos(14.91, 14.91); // optimistic cache after the deposit
    const api = pos(10.67, 14.91); // indexer still missing the deposit

    const out = reconcileSavingsPosition(api, prev);

    expect(out.totalDeposited).toBe('14.91');
    expect(parseFloat(out.earnings)).toBe(0); // NOT 4.24
  });

  it('accepts a genuine withdrawal (deposits and value fall together)', () => {
    const prev = pos(20, 22);
    const api = pos(15, 16.5);

    // A real withdrawal lowers both figures, so it must pass through
    // untouched — treating it as lag would freeze the display.
    expect(reconcileSavingsPosition(api, prev)).toEqual(api);
  });

  it('accepts a genuine deposit (deposits and value rise together)', () => {
    const prev = pos(10, 11);
    const api = pos(15, 16);

    expect(reconcileSavingsPosition(api, prev)).toEqual(api);
  });

  // Rule: deposits exceeding current value means the deposits figure ran ahead
  // of a value that has not caught up — also a stale read.
  it('keeps the cached totalDeposited when deposits exceed current value', () => {
    const prev = pos(10, 15);
    const api = pos(20, 15);

    const out = reconcileSavingsPosition(api, prev);

    expect(out.totalDeposited).toBe('10');
    expect(parseFloat(out.earnings)).toBe(5); // 15 - 10, from real figures
  });

  // BUG-CLASS (2026-07): the Soroban RPC / events indexer transiently returns
  // nothing; the read is shared via SWR, so accepting a zero would blank the
  // user's savings on every screen at once and stick until the next read.
  it('never clobbers a real position with a zero read', () => {
    const prev = pos(100, 105, 5);

    expect(reconcileSavingsPosition(pos(0, 0), prev)).toBe(prev);
    expect(reconcileSavingsPosition(null, prev)).toBe(prev);
    expect(reconcileSavingsPosition(undefined, prev)).toBe(prev);
  });

  it('returns a zero position when there is nothing cached and nothing read', () => {
    const out = reconcileSavingsPosition(null, null);

    expect(out.currentValue).toBe('0');
    expect(out.totalDeposited).toBe('0');
  });

  it('passes a first read through when there is no cache to reconcile against', () => {
    const api = pos(10, 12, 2);

    expect(reconcileSavingsPosition(api, null)).toEqual(api);
  });

  it('ignores sub-cent noise instead of flagging it as lag', () => {
    // Float jitter far below a cent must not trigger the lag path.
    const prev = pos(10.0000005, 10.5);
    const api = pos(10, 10.5);

    expect(reconcileSavingsPosition(api, prev)).toEqual(api);
  });
});

describe('buildAsset', () => {
  it('treats a missing address as holding zero, not as an error', () => {
    // No address = the user never set this chain up. That is a fact, not a
    // failure — an error state here would show a red row to every new user.
    const a = buildAsset('BTC', null, null, 50_000);

    expect(a.balance).toBe('0');
    expect(a.status).toBe('ok');
    expect(a.usdValue).toBe('0');
  });

  it('treats a null balance on an existing address as an error', () => {
    const a = buildAsset('ETH', '0xabc', null, 3000);

    expect(a.status).toBe('error');
    expect(a.balance).toBeNull();
    expect(a.usdValue).toBeNull();
  });

  it('computes usdValue only when both balance and price exist', () => {
    expect(buildAsset('SOL', 'addr', 2, 150).usdValue).toBe('300');
    expect(buildAsset('SOL', 'addr', 2, null).usdValue).toBeNull();
  });

  it('carries chain and decimals from the registry', () => {
    const a = buildAsset('USDC', 'GABC', 5, 1);

    expect(a.chain).toBe('stellar');
    expect(a.decimals).toBe(7);
  });
});

describe('applyStaleFallback', () => {
  const ok = (symbol: string, balance: string): ReturnType<typeof buildAsset> =>
    ({ ...buildAsset(symbol, 'addr', parseFloat(balance), 1), balance }) as any;

  it('serves the last good value, marked stale, when a source errors', () => {
    const prior = ok('ETH', '2');
    const errored = buildAsset('ETH', '0xabc', null, 3000);

    const { merged } = applyStaleFallback(
      { updatedAt: 2, assets: [errored] },
      { ETH: prior }
    );

    expect(merged.assets[0].balance).toBe('2');
    expect(merged.assets[0].status).toBe('stale');
  });

  it('prefers the fresh price on a stale asset when one is available', () => {
    const prior = { ...ok('ETH', '2'), price: '1000' };
    const errored = buildAsset('ETH', '0xabc', null, 3000);

    const { merged } = applyStaleFallback(
      { updatedAt: 2, assets: [errored] },
      { ETH: prior }
    );

    expect(merged.assets[0].price).toBe('3000');
  });

  it('lets an error through when there is no last good value to fall back on', () => {
    const errored = buildAsset('ETH', '0xabc', null, null);

    const { merged } = applyStaleFallback({ updatedAt: 1, assets: [errored] }, null);

    expect(merged.assets[0].status).toBe('error');
  });

  it('refreshes the snapshot from ok assets only', () => {
    const prior = ok('ETH', '2');
    const freshOk = ok('BTC', '1');
    const errored = buildAsset('ETH', '0xabc', null, null);

    const { snapshot } = applyStaleFallback(
      { updatedAt: 2, assets: [freshOk, errored] },
      { ETH: prior }
    );

    expect(snapshot.BTC.balance).toBe('1'); // learned
    expect(snapshot.ETH).toBe(prior); // NOT overwritten by the error
  });
});
