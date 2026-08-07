// Fresh module per test — the epoch map is module-level state.
import type * as SavingsGuardModule from '@/lib/savings-read-guard';

import { it, jest, expect, describe } from '@jest/globals';

type Guard = typeof SavingsGuardModule;

function freshGuard(): Guard {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/lib/savings-read-guard');
}

const ADDR = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

describe('savings read guard (finding #52)', () => {
  it('a read that started and resolved under the same epoch passes', () => {
    const g = freshGuard();
    const epochAtStart = g.savingsReadEpoch(ADDR);

    expect(() => g.assertReadStillFresh(ADDR, epochAtStart)).not.toThrow();
  });

  it('a read that started before an action is discarded — the observed bug', () => {
    const g = freshGuard();
    // Read launches…
    const epochAtStart = g.savingsReadEpoch(ADDR);
    // …a deposit settles while it is in flight…
    g.bumpSavingsReadEpoch(ADDR);

    // …so its response describes a world that no longer exists.
    expect(() => g.assertReadStillFresh(ADDR, epochAtStart)).toThrow(g.StaleSavingsReadError);
  });

  it('rapid consecutive actions: only reads from after the LAST action survive', () => {
    const g = freshGuard();
    const beforeAll = g.savingsReadEpoch(ADDR);
    g.bumpSavingsReadEpoch(ADDR); // deposit
    const betweenActions = g.savingsReadEpoch(ADDR);
    g.bumpSavingsReadEpoch(ADDR); // withdraw, right after

    expect(() => g.assertReadStillFresh(ADDR, beforeAll)).toThrow();
    expect(() => g.assertReadStillFresh(ADDR, betweenActions)).toThrow();
    expect(() => g.assertReadStillFresh(ADDR, g.savingsReadEpoch(ADDR))).not.toThrow();
  });

  it('epochs are per address — another wallet is unaffected', () => {
    const g = freshGuard();
    const other = 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
    const otherEpoch = g.savingsReadEpoch(other);

    g.bumpSavingsReadEpoch(ADDR);

    expect(() => g.assertReadStillFresh(other, otherEpoch)).not.toThrow();
  });
});
