'use client';

import useSWR from 'swr';

export interface MgiLimits {
  deposit: { min: number; max: number };
  withdraw: { min: number; max: number };
}

// Last-verified live values (2026-07-23) — used until /api/mgi/info answers,
// so the amount dialogs always have sane bounds even if the fetch fails.
const FALLBACK: MgiLimits = {
  deposit: { min: 15, max: 950 },
  withdraw: { min: 15, max: 2500 },
};

/** MoneyGram's live USDC deposit/withdraw limits, shared via one SWR. */
export function useMgiLimits(): MgiLimits {
  const { data } = useSWR<MgiLimits>(
    'mgi-limits',
    async () => {
      const r = await fetch('/api/mgi/info');
      if (!r.ok) throw new Error(`mgi info failed: ${r.status}`);
      return (await r.json()) as MgiLimits;
    },
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 }
  );
  return data ?? FALLBACK;
}
