# 68 — Wave-4 reliability: plan

**Branch:** `chore/wave4-reliability` · GO given 2026-08-13. Order locked by
Niko: this batch → then `fix/xlm-savings-guard` → #32 (his product
decisions) → #53 → #33 staged → Phase 5 (map in roadmap §"What actually
remains").

## 1. #8 — pin the relayer's RPCs

Verified: `lib/cctp/executor.ts` creates viem clients with `http()` — no
URL — in 4 places (mint, receipt check, gas top-up, top-up shortfall):
the money-moving relayer rides viem's DEFAULT public endpoints (shared,
rate-limited, no SLA).

Fix: `relayerTransport(chain)` helper — `CCTP_RPC_URL_BASE` /
`CCTP_RPC_URL_ETHEREUM` env when set, current default otherwise (nothing
breaks before the env lands). All four sites switch to it. Same vars serve
testnet (relayer-on-testnet is local-dev only; documented).

## 2. #24 — off-ramp fills move to the database

Verified: the "we owe Coinbase a send for sale X" memory lives in
localStorage (`nf:cb-offramp-fills`), read by the sell modal (claim /
complete / release) AND by the activity feed's off-ramp join — two
inline copies. Clearing the browser or switching devices = amnesia →
stuck sale needing manual help.

- **Table `offramp_fills`** (additive SQL, Niko runs BEFORE deploy):
  id, supabaseUid, provider ('coinbase'), providerTxnId, txHash (null =
  claimed/pending), createdAt; UNIQUE(supabaseUid, providerTxnId).
- **Route `/api/offramp/fills`** (withAuth, keyed on the session user —
  no wallet-ownership complexity): GET list · POST upsert (claim or
  complete) · DELETE release.
- **Client lib `lib/offramp-fills.ts`**: async fetch/save/remove + a
  one-time migration that pushes any existing localStorage entries to the
  DB on first load (in-flight sales survive the deploy), then retires the
  key.
- Modal loads fills into state when it opens (its pending-order filter is
  synchronous); activity hook swaps its localStorage read for the fetch.

## 3. #10 — transaction pooler: runbook + verification script (NO flip here)

The switch itself is a `DATABASE_URL` edit in Vercel — deliberately NOT
part of the merge (independent 10-second rollback). This batch ships:

- `scripts/verify-pooler.mjs` — read-only proof run against the pooler
  URL: connect, repeated identical queries (the prepared-statement trap),
  a read transaction, 10 concurrent reads. No writes.
- The runbook (below) with the exact URL shape and rollback.

**Runbook:** in Supabase → Database → connection strings, copy the
*Transaction pooler* URI (port **6543**) and append
`?pgbouncer=true&connection_limit=1`
(`pgbouncer=true` makes Prisma stop using prepared statements — THE known
pooler incompatibility; `connection_limit=1` per serverless instance is
the Vercel-recommended shape). Run the verify script against it locally.
Then in Vercel, replace `DATABASE_URL`, redeploy, watch for a day.
Rollback = restore the old URL + redeploy.

## Scenarios

| Scenario | Behavior |
|---|---|
| RPC env vars not set yet | relayer keeps today's defaults — deploy order free |
| Public RPC bad hour (after env set) | relayer unaffected — keyed endpoint |
| User clears browser mid-sale | fill row in DB → resume works on any device |
| Two tabs claim the same sale | DB upsert on (uid, txnId) — single claim row |
| Old bundle mid-deploy | still writes localStorage; migration sweeps it to DB on next load |
| Pooler flip goes wrong | env revert, seconds, nothing else rides on it |

## Files

executor.ts (+helper) · prisma/schema.prisma (+OfframpFill) · **new**
api/offramp/fills/route.ts · **new** lib/offramp-fills.ts ·
coinbase-offramp-modal.tsx · use-user-activity.ts · **new**
scripts/verify-pooler.mjs · docs/register/memory. Conformance test covers
the new route automatically (withAuth).
