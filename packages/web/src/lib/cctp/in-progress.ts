'use client';

import { useSyncExternalStore } from 'react';

// ---------------------------------------------------------------------------
// The Circle swaps still under way, as the swap page's recovery keeper sees
// them (sections/swap/cctp-resume-banner.tsx). Niko 2026-11-09: the block above
// the swap card had to move and open a page with every step. The keeper stays
// the ONE place that finishes or brings back a swap (one per page, so a click
// can never run twice); it publishes its rows here, and any part of the page
// shows them: the "In progress" list beside the card, a swap's own page.
// ---------------------------------------------------------------------------

export type InProgressPhase = 'auto' | 'halt-receive' | 'halt-finish';

export interface InProgressItem {
  id: string;
  direction: string;
  srcAsset: string;
  dstAsset: string;
  /** What was put in, in its own coin ("1.1292"); null for a swap out. */
  srcAmount: string | null;
  /** The digital dollars carried, in 6-decimal units. */
  amountWire: string;
  phase: InProgressPhase;
  /** The digital dollars were seen at the person's own Base address. */
  onBase: boolean;
}

interface InProgressState {
  items: InProgressItem[];
  /** The swap the keeper is finishing or bringing back right now. */
  busyId: string | null;
}

const EMPTY: InProgressState = { items: [], busyId: null };
let state: InProgressState = EMPTY;
const listeners = new Set<() => void>();

export function publishInProgress(next: Partial<InProgressState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useInProgress(): InProgressState {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}
