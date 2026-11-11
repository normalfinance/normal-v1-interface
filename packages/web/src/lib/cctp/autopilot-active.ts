'use client';

import { buildAuthHeaders } from '@/utils/http';

// ---------------------------------------------------------------------------
// Is auto-finish on for this person? For the words on the swap pages: a swap
// that auto-finish takes forward does not "need you" (Niko 2026-11-10).
//
// The status route makes two Turnkey reads (server/autopilot-status.ts: "call
// it on a person's action, never in a loop"), so the answer is kept for the
// tab: the swap page's In progress list and a swap's own page share one read,
// and moving between them asks again only after a few minutes. Turning it on
// or off forgets the answer at once (forgetAutopilotActive), so a page never
// keeps saying the old one. The swap engine keeps its own read, taken right
// before each Base leg: that one decides how a leg is signed, this one only
// what the page says.
// ---------------------------------------------------------------------------

const KEEP_MS = 5 * 60_000;

export const AUTOPILOT_CHANGED_EVENT = 'nf:autopilot-changed';

let kept: { userId: string; at: number; answer: Promise<boolean> } | null = null;

/** True when auto-finish is on. A failed read answers false: the person's own path stays open. */
export function autopilotActiveFor(userId: string): Promise<boolean> {
  if (kept && kept.userId === userId && Date.now() - kept.at < KEEP_MS) return kept.answer;
  const answer = (async () => {
    try {
      const res = await fetch('/api/autopilot/status', {
        headers: await buildAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) return false;
      return (await res.json())?.active === true;
    } catch {
      return false;
    }
  })();
  kept = { userId, at: Date.now(), answer };
  return answer;
}

/** Auto-finish was just turned on or off: the next read asks again, and pages that show it re-read. */
export function forgetAutopilotActive() {
  kept = null;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTOPILOT_CHANGED_EVENT));
}
