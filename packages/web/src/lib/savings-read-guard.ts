'use client';

// ---------------------------------------------------------------------------
// Discards savings-position reads that started BEFORE the user's latest
// deposit/withdraw (finding #52).
//
// The failure it kills, observed live: rapid deposit → withdraw → deposit.
// Each action launches a fresh position read; network reordering let a read
// launched before action N resolve after it. That read carries pre-action
// data with a GENUINELY lower value — not the "indexer lagging" shape the
// reconciler forgives — so it was accepted, overwrote the correct optimistic
// figure, and was persisted to the position cache. The UI then showed the
// missing deposit as "earnings" until DeFindex's indexer caught up minutes
// later.
//
// Mechanism: every deposit/withdraw bumps an epoch (per address) BEFORE
// announcing itself. A read captures the epoch when it starts; if the epoch
// moved by the time it resolves, the read describes a world that no longer
// exists and must throw — before reconciliation, before any cache write. The
// caller's normal retry then refetches under the current epoch.
// ---------------------------------------------------------------------------

const epochs = new Map<string, number>();

export function savingsReadEpoch(address: string): number {
  return epochs.get(address) ?? 0;
}

/** Call at the moment a deposit/withdraw settles, before announcing it. */
export function bumpSavingsReadEpoch(address: string): void {
  epochs.set(address, savingsReadEpoch(address) + 1);
}

export class StaleSavingsReadError extends Error {
  constructor() {
    super('Savings read started before the latest action — discarded');
    this.name = 'StaleSavingsReadError';
  }
}

/** Throw away a read that predates the latest action. */
export function assertReadStillFresh(address: string, epochAtStart: number): void {
  if (epochAtStart !== savingsReadEpoch(address)) {
    throw new StaleSavingsReadError();
  }
}
