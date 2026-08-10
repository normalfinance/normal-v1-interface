# 56 — Fee ordering fix (#26), explained for juniors

Branch: `fix/fee-ordering`. Design doc: [55-fee-ordering-plan.md](55-fee-ordering-plan.md).

## The problem, in one story

A coworker deposited savings from a Lobstr wallet. The app charged the
Normal fee (transaction 1), then asked for the second signature (the actual
deposit) — and the wallet bounced it. Result: **fee paid, deposit never
happened.** That could happen in five different ways (rejection, closed tab,
wallet jam, expired session, network drop), because the app made something
irreversible (submitted tx 1) BEFORE it had everything it needed (signature
2).

## The fix, in one sentence

**Nothing is submitted until every signature exists** — and once both
signatures exist, a server process guarantees BOTH transactions complete,
even if you close the tab.

## How it works — cause and effect

- If you start a deposit → you will see TWO signing prompts back to back
  (deposit first, then fee), and during those prompts **nothing has touched
  the blockchain yet**.
- If you reject EITHER prompt → you will see an error, and **nothing
  happened**: no deposit, no fee, wallet untouched. Retrying costs nothing.
- If you approve both → the app sends both signed transactions to our
  server in ONE request. The server saves the signed fee in Redis FIRST,
  then submits the deposit, then the fee.
- If you close the tab right after the second signature → the deposit AND
  the fee still complete within ~2 minutes, because a cron job
  (`fee-escrow-sweep`, every 2 min) finds the saved pair and finishes it.
- If the deposit fails on-chain → the fee is **never** submitted, and it
  couldn't be even by accident (see the sequence trick below).

## The trick that makes it safe: Stellar sequence numbers

Every Stellar account has a counter. A transaction says "I am number N+1"
and can only ever run when the account is exactly at N. We build the pair
as: deposit = N+1, fee = N+2.

- The fee (N+2) **cannot run before** the deposit (N+1) — the chain itself
  refuses it.
- If the deposit never runs, the fee **can never run at all**.
- If a stuck user retries, the NEW pair also uses N+1/N+2 — so whichever
  pair lands first kills the other one (`tx_bad_seq`). **Double-charging is
  impossible by construction**, not by us being careful.
- The fee transaction carries a 15-minute expiry, so a saved pair we fail
  to complete is guaranteed dead after that — the escrow can't haunt anyone.

## What changed, by category (12 files)

**Server — new (3):** `server/fee-escrow.ts` (the Redis escrow + a pure
decision function that says submit/wait/give-up), `api/fees/execute-pair`
(validates the pair — same account, consecutive sequences, fee really pays
OUR address, user owns the wallet — then escrow → submit → submit),
`api/cron/fee-escrow-sweep` (the every-2-min finisher).

**Changed plumbing (3):** `lib/build-fee-payment.ts` (fee can now be built
"behind" a given sequence, with a 15-min window), its route (passes the two
new fields through, validated), `vercel.json` (cron entry).

**Client flows (3):** `use-defindex-savings.tsx` deposit + withdraw and
`use-swap.tsx` — all three now: build service tx → build fee behind it →
sign both → send pair. A new shared helper `lib/stellar/fee-pair.ts` does
the pair submission and, if the network dies mid-request, polls Horizon to
find out what actually happened instead of guessing.

**UI (1):** `savings-card.tsx` — deposit steps are now "sign deposit (1 of
2) → sign fee (2 of 2) → crediting"; withdraw merges its two broadcast
steps into one.

**Tests (2 new files, 12 cases):** the escrow decision table (8 cases —
every combination of "fee/service found/failed/missing × windows
open/closed") and the sequence chaining (fee lands EXACTLY one behind the
service, long window present, garbage sequence rejected).

## Two bugs this quietly kills

1. **Withdraw could forget to log.** The old code threw an error when the
   commission payment failed — BEFORE the line that records the withdrawal
   in our database. So a withdrawal that succeeded on-chain could be missing
   from Activity. Now the log line always runs once the pair is accepted.
2. **Error messages promising doom.** "(Normal fee already charged — tx
   …)" messages are gone from all three flows, because that situation can
   no longer exist.

## What can still go wrong (honestly)

If our server AND the cron are both down for 15+ minutes immediately after
a user's deposit succeeded, the fee window expires unpaid. The server logs
it loudly (`[fee-escrow] RECEIVABLE`) with both hashes, and the Activity
row still records the fee hash — so it's countable, traceable money, not
silent leakage. It requires our whole backend to vanish at the worst
moment, which is lightning-strike territory.

## How to test it (do → see)

See the staging matrix at the end of
[55-fee-ordering-plan.md](55-fee-ordering-plan.md) — 7 scenarios, each in
"do this → you should see this" form.
