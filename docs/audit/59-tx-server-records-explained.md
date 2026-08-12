# 59 — Server transaction records (#27), explained for juniors

Branch: `fix/tx-server-records`. Design: [58-tx-server-records-plan.md](58-tx-server-records-plan.md).

## The problem, in one sentence

Until now, our database only learned about a swap or savings transaction if
the browser remembered to tell it AFTER everything succeeded — so a failed
or interrupted transaction left **no trace at all**, and a successful one
could go unrecorded if the tab closed a second too early.

## Cause and effect, before this fix

- If a swap failed on-chain → no row anywhere → support sees nothing when
  the user asks "where is my money?"
- If you closed the tab right after a deposit confirmed → the "log it"
  request died with the tab → the deposit is missing from Activity and from
  the Dune dashboard.
- The #55 "Your Deposits" fix leans on those rows existing → a lost log
  call quietly weakened it.

## The fix, in one sentence

The server writes the record itself, **before broadcasting anything**, and
then guarantees the record ends up telling the truth.

## How it works now

1. Your browser signs the transactions (nothing submitted — that's #26) and
   hands them to the server in one request.
2. The server writes the DB row first, with status **pending**. If even
   that write fails → the request aborts and nothing was broadcast at all.
3. The server broadcasts, then flips the row: **confirmed** on success,
   **failed** with the chain's error codes on rejection, **submitted** if
   the outcome is temporarily unknown.
4. If the server instance dies mid-way → the every-2-minutes cron finds the
   stuck row, asks the blockchain "did this hash land?", and settles it —
   confirmed, failed, or (after 30 minutes, when no transaction could
   possibly still apply) **abandoned**.
5. Terminal states are never overwritten, so the route, the fee sweeper,
   and the reconciler can all touch the same row in any order without ever
   rewriting settled history.

One subtle rule: if the user's action succeeded but only the FEE leg went
wrong (the #26 escrow expired), the record still says **confirmed** — with
a note — because the user's money really did move. Records describe what
happened to the USER, fee bookkeeping lives in the escrow logs.

## What you will and won't see (do → see)

- Do a normal deposit → the row is created before broadcast and reads
  `confirmed` a second later; Activity looks exactly as before.
- Force a failure (e.g. vault error) → the row exists with `failed` + the
  reason — but Activity, "Your Deposits", and Dune **don't** show it,
  because every reader now filters to confirmed rows only.
- Close the tab right after signing → the row still ends `confirmed`
  within ~2 minutes (cron), and "Your Deposits" updates because a savings
  confirm also fires the #55 cache invalidation.
- Zero-commission withdraw → now also goes through the server funnel (it
  was the last flow the browser submitted directly), so it gets the same
  guarantees.

## Honesty about the fee record

The server does not trust the browser's claimed fee: it reads the actual
payment amount out of the signed fee transaction and rejects the request if
the record claims anything else. A record cannot lie about the fee.

## What changed, by category

**New (2):** `server/tx-records.ts` (records + settlement state machine +
cron reconciler), design/explainer docs. **Rewired (3):** execute-pair (the
funnel now records first), fee-escrow sweeper results carry context, cron
route settles records. **Readers filtered (4 files):** both activity
routes, Dune sync, user-position. **Client (3):** the three fire-and-forget
log calls deleted; `submitFeePair` carries the record. **Deprecated (2):**
the old log-transaction routes (one release of grace for old bundles).
**Schema:** three additive columns + four indexes, applied by Niko in
Supabase BEFORE deploy — old rows default to `confirmed`, which is exactly
what they were.

## Tests

12 new (149 total): the settlement decision table, the escrow-outcome →
record mapping (including "fee failed but action confirmed"), and proof
that pending/failed rows never count into "Your Deposits".
