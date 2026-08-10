# 57 — "Your Deposits" showed the wrong number (#55), explained for juniors

## What happened (real incident, 2026-08-10, mainnet)

Niko deposited 4.975, withdrew 6.000, and deposited 4.975 again — all within
four minutes. The card then showed Your Deposits **18.4551934** instead of
**23.4301934**, and the missing 4.975 appeared as fake green "earnings"
(+5.25 on a 4.53% APY account — impossible from yield). The numbers match to
the 7th decimal: 18.4551934 is exactly the total *after* the withdraw and
*before* the last deposit.

## Why it happened — cause and effect

- "Current Value" is read **live from the blockchain** → it was correct
  (23.709) the whole time.
- "Your Deposits" is computed from DeFindex's **event history**, and their
  indexer runs **30–120 seconds behind** the chain.
- If you transact and the app immediately re-reads that history → it can
  catch a **half-indexed world** (your withdraw was in, your newest deposit
  was not).
- Our server then **cached that snapshot for 300 seconds** → the wrong
  number was locked on screen.
- "Earnings" is calculated as `value − deposits` → the missing deposit
  showed up as fake earnings of exactly its own amount.

The bitter part: the correct answer was already in **our own database**.
Every deposit/withdraw is logged to the `vault_deposits` table with its
transaction hash within about a second of succeeding. The position route
just ignored those rows unless DeFindex returned nothing at all.

## Why the earlier fix (#52) didn't catch this

#52 discards reads that were **already in flight** when you acted. This
read *started after* the action — the problem wasn't a stale request, it
was a stale **source**. Same symptom family, different organ.

## The fix — a signal, not a timer

`reconcileTotalDeposited` (new, in `server/savings-deposits.ts`):

> total = DeFindex events total **+ the deltas of our own recent rows whose
> transaction hash the indexer has not included yet**.

- If the indexer is behind → our row supplies the missing transaction, so
  the number is right **the instant the transaction completes**.
- The moment the indexer catches up → the hash matches, our row steps
  aside, nothing is counted twice.
- There is nothing to expire and nothing to guess — correctness no longer
  depends on how stale any cache or indexer is.

Two supporting changes:

1. **Logging a transaction now clears the server's position cache** for that
   wallet. The log row *is* the proof the caches are outdated — rapid
   back-to-back actions can no longer be served a pre-action snapshot.
2. The events cache now stores the event **hashes** alongside the total
   (that's what makes the reconciliation exact), and rows without a hash or
   older than 24h are excluded so nothing can skew the figure forever.

## How to test (do → see)

- Deposit, then withdraw, then deposit again as fast as you can → Your
  Deposits tracks every step immediately and ends on the correct total.
- Wait 5+ minutes and refresh → the number does **not** change (before the
  fix, this is when a poisoned cache would finally expire and "heal").
- Current Earnings stays in believable territory (cents, not dollars).

## Tests

9 unit cases pin the reconciler — including the exact incident numbers as a
permanent regression test: events total 18.4551934 + our not-yet-indexed
deposit row 4.975 must equal 23.4301934.
