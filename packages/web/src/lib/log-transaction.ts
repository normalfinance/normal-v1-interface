'use client';

import { buildAuthHeaders } from '@/utils/http';

// ---------------------------------------------------------------------------
// Posts a completed swap/savings transaction to our own log routes.
//
// Two things this centralises:
//
// 1. **Auth headers.** Those routes used to accept writes from anyone; they now
//    require a session and verify the wallet belongs to it. Every caller must
//    send credentials, and doing that in one place stops a future call site
//    from quietly forgetting.
//
// 2. **Loud failures.** Logging is deliberately fire-and-forget — a failed log
//    must never break a swap the user already completed on-chain. But silent
//    was wrong: with `.catch(console.error)` on a bare fetch, a 401 resolves
//    normally and vanishes, so logging could stop entirely and we'd only find
//    out when analytics went quiet. A non-OK response is now reported.
// ---------------------------------------------------------------------------

export function postTransactionLog(path: string, payload: unknown): void {
  void (async () => {
    try {
      const headers = await buildAuthHeaders();
      const res = await fetch(path, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        // 401 = the session wasn't sent or expired; 403 = the wallet isn't
        // linked to this account. Both mean the record was NOT written.
        console.error(`[log-transaction] ${path} failed with ${res.status} — record not saved`);
        return;
      }

      // Tell the activity feed the row now EXISTS.
      //
      // The swap engines dispatch this event as soon as the transaction
      // returns, which races this write — the feed would refetch before the row
      // was saved and show nothing until a manual reload. That race was only
      // ever hidden by an 800ms delay on the listener, and adding the session
      // lookup above made it more likely to lose.
      //
      // Firing here keys the refresh off the real event (the row is written)
      // instead of a guess about how long writing takes. The engines keep their
      // immediate dispatch too: that one refreshes on-chain activity quickly,
      // this one guarantees the database row appears.
      window.dispatchEvent(new Event('nf:activity-updated'));
    } catch (error) {
      console.error(`[log-transaction] ${path} error — record not saved`, error);
    }
  })();
}
