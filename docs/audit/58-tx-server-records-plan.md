# 58 — #27 Record-before-broadcast: implementation plan

**Branch:** `fix/tx-server-records` · **Status: IMPLEMENTED 2026-08-10**
(GO given; junior explainer: [59-tx-server-records-explained.md](59-tx-server-records-explained.md)).
Built on the merged #26/#55 work (`/api/fees/execute-pair`, PR #488).

## The invariant

> **Every money transaction has a durable server record BEFORE anything is
> broadcast, and that record always reaches a truthful terminal state** —
> confirmed, failed, or abandoned — even if the client, the server instance,
> or the network dies mid-flight.

## Why (cause → effect, today's behavior)

- If a swap/deposit/withdraw fails on-chain or the tab closes before our
  fire-and-forget log call → **no row exists at all** → support sees
  nothing, Dune undercounts, and the #55 reconciliation has no row to work
  with (it leans on that same fire-and-forget log arriving).
- If the log call succeeds → a row exists, but it asserts success with no
  status — a row and reality can silently disagree.

CCTP already does this right in our codebase (row created before the burn is
broadcast, resumable state machine). This batch brings the same guarantee to
the Stellar money flows.

## Architecture decision: records live in the server submit funnel

#26 gave us the perfect place: `/api/fees/execute-pair` now sees every
swap/deposit/withdraw-with-commission BEFORE submission, server-side. So the
record is written **by the server, inside the funnel** — not by a client
call that can die:

1. validate pair → **create DB row `status='pending'`** →
2. escrow fee (existing) → submit service tx →
3. success → `status='confirmed'` (+ #55 cache invalidation) ·
   rejected → `status='failed'` + result codes ·
   timeout → `status='submitted'` (outcome unknown, resolver owns it).

The rejected alternative — a client-called "create intent" route before
signing — was considered and dropped: it reintroduces exactly the
fire-and-forget unreliability we are eliminating, and a pre-signature
abandonment has zero on-chain effect (nothing moved, nothing charged), so a
guaranteed record of it protects no money. Explicitly out of scope; a
funnel-analytics beacon can be a later, optional nicety.

**Zero-commission withdraw joins the funnel.** Today it is the one flow the
client still submits straight to Horizon. `feeXdr` becomes optional
(allowed only for `savings_withdraw`): one server funnel, one record path,
no exceptions.

## Schema — additive only, applied by Niko (HARD RULE: no prisma migrate)

Run in the Supabase SQL editor (staging = prod = same project) **BEFORE the
code deploys** — new code inserts a `status` column; deploying first would
make every insert fail:

```sql
ALTER TABLE swap_logs
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS "statusReason" TEXT,
  ADD COLUMN IF NOT EXISTS network TEXT;
ALTER TABLE vault_deposits
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS "statusReason" TEXT,
  ADD COLUMN IF NOT EXISTS network TEXT;
CREATE INDEX IF NOT EXISTS swap_logs_status_idx ON swap_logs (status);
CREATE INDEX IF NOT EXISTS vault_deposits_status_idx ON vault_deposits (status);
CREATE INDEX IF NOT EXISTS swap_logs_tx_hash_idx ON swap_logs ("txHash");
CREATE INDEX IF NOT EXISTS vault_deposits_tx_hash_idx ON vault_deposits ("txHash");
```

- `DEFAULT 'confirmed'` backfills every existing row correctly (they were
  only ever written after success) and keeps the two legacy log routes
  working unchanged during the transition.
- `network` (nullable) is set by new writes from the request cookie —
  future-proofs Dune/debugging; old rows stay null.
- `schema.prisma` is updated to match + `prisma generate` (local only —
  never `db push`/`migrate`).

## Status model

`pending` → row exists, nothing broadcast yet ·
`submitted` → broadcast, outcome unknown (Horizon timeout) ·
`confirmed` / `failed` / `abandoned` (terminal).

Transitions are owned by exactly three actors, all server-side:
- **execute-pair route**: pending → confirmed | failed | submitted.
- **fee-escrow sweeper** (existing cron): when it completes/kills a dead
  pair, it now also flips the row found by `txHash` — and invalidates the
  #55 position cache on a late confirm (the tab-death deposit must still
  update "Your Deposits").
- **record reconciler** (new step in the SAME cron route, no new vercel
  entry): every 2 min, rows in `pending`/`submitted` older than 60s are
  probed on Horizon by hash (reusing `probeTransaction` from fee-escrow):
  found+success → confirmed · found+failed → failed · not found and older
  than the tx window (30 min) → abandoned. Bounded work: only broken flows
  ever linger in these states.

## Every scenario, and what the record says

| Scenario | Record outcome | Who ensures it |
|---|---|---|
| Happy path | pending → confirmed, same request | route |
| Tx rejected by network | pending → failed + result codes | route |
| Horizon timeout, tx landed | submitted → confirmed | client poll returns success; cron confirms row |
| Horizon timeout, tx died | submitted → abandoned after window | reconciler |
| Server dies after DB write, before submit | pending; escrow sweeper submits the pair; row → confirmed | sweeper + reconciler |
| DB write itself fails | request aborts with 500 BEFORE any broadcast — nothing moved, signed pair still valid, retry clean | route (record-before-broadcast, literally) |
| User rejects a signature | no record (nothing reached the server funnel; nothing on-chain) | scope decision, documented |
| User retries a stuck flow | old row → failed/abandoned via `tx_bad_seq`; new row → confirmed; both truthful | sequence numbers + reconciler |

## Readers must not present non-confirmed rows as money that moved

Verified inventory of every reader of these two tables; all get
`status: 'confirmed'` filters:

- `api/wallet/activity` + `api/portfolio/activity` (activity feeds — a
  failed swap must not render as a normal transaction)
- `services/prisma-sync.ts` (Dune upload — failed rows would poison public
  metrics)
- `api/savings/user-position` (#55 reconciler + DB fallback — a pending
  deposit must not count into "Your Deposits" until it actually confirmed)

`api/lifi/record` (LI.FI cross-chain logs into swap_logs after success)
keeps writing rows that default to confirmed — unchanged, correct.

Recommendation, not in this batch: a follow-up can surface `pending` rows
in Activity with the #47 pending-badge pattern (users liked it for BTC
sends). This batch is correctness; that one is presentation.

## Client changes (small)

- `submitFeePair` gains a `record` field (typed per kind: vault + amounts /
  token pair + amounts); hooks pass it; the server cross-checks
  `record.feeAmount` against the fee XDR's actual payment amount and
  rejects mismatches — the record cannot lie about the fee.
- The three `postTransactionLog` calls in use-defindex-savings / use-swap
  are REMOVED (the funnel records server-side now).
- Zero-commission withdraw switches from direct Horizon submit to
  execute-pair single mode.
- Legacy `swap/log-transaction` + `savings/log-transaction` routes stay one
  release (bundles already open in browsers still call them), marked
  deprecated, deleted in a later cleanup batch.

## Out of scope (explicit)

BTC/ETH/SOL sends (#29 rides this pattern next — its fix sketch is
estimateGas + record-before-broadcast); LI.FI leg tracking (own status
system); CCTP (already has this); pre-signature abandonment analytics.

## Tests

- Unit: pure status-transition helper (submit outcome/probe result →
  status), reconciler decision incl. the 30-min abandonment cutoff, and
  extended #55 reconciler cases proving pending/failed rows are excluded
  from totalDeposited.
- Manual matrix (staging): happy deposit/swap/withdraw rows land confirmed;
  kill the tab after signing → row appears and reaches confirmed via cron;
  force a vault error → row failed with reason, invisible in Activity and
  in "Your Deposits".

## Deployment order (violating it breaks inserts)

1. Niko runs the SQL above in Supabase (one project — one run).
2. Merge + deploy this branch.
3. Verify: one deposit on staging → row shows `status='confirmed'`,
   `network` set; Activity and Dune unchanged.
