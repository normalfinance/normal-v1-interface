# 05 — DB Consolidation Runbook (normal-testing → normal-stellar)

Status: **PLANNED — decision made by Niko 2026-07-26 (option b).** Nothing
executed yet. Cutover happens in a scheduled window after a successful
rehearsal. Scripts land next to this doc when prerequisites are met.

## ⚠️ CRITICAL DISCOVERY during Phase A rehearsal (2026-07-26) — plan revised, awaiting decision

The target `normal-stellar` (vunxamog) is **NOT empty** — it is the **entire OLD
production database**, frozen ~April–May 2026 when the app switched to Turnkey
and a new data DB (gnq/"normal-testing") was created. Verified read-only:

| Table | vunxamog (target) | gnq (source/current) |
|---|---|---|
| users | 400 (last write Apr 18) | 1 |
| linked_wallets | 678 (last write May 3) | 83 |
| referrals | 40 | 1 |
| referral_actions | 7 | 0 |
| user_rsa_keys | 201 | (absent) |
| sponsored_accounts | 162 | (absent, removed in current schema) |
| normal_contract_events | 593 | 0 |
| turnkey/swap/vault/cctp/mgi | ABSENT | current live data |
| _prisma_migrations | old (last Sept 2025) | current |

Consequences that BLOCK the naive copy:
- `prisma db push` vs the target would DROP `sponsored_accounts` + `user_rsa_keys`
  (363 rows) — not in current schema.
- Copying users/linked_wallets COLLIDES with 400/678 existing old rows.
- Current app never references the old-only tables (grep-verified) — they are
  historical, but the OLD-architecture user records live here.

Real architecture (was undocumented): **auth = vunxamog (live), app data = gnq
(live), old app data = vunxamog (frozen).**

### Decision required (Niko) before any execution
- **Option 1 (recommended): archive-then-clean** — rename target's old public
  tables → `old_*` (zero deletion), create current schema fresh, copy gnq live
  data in. One project = auth + current data + labeled archive.
- **Option 2: merge** old 400 users + current into unified tables (complex; only
  if old records are operationally needed).
- **Option 3: reverse direction** — keep gnq (where all current activity is) as
  home, rename it honestly; flips less data.
- Open input: are the 400 old users / 678 old linked_wallets still needed
  (support/reporting/reactivation) or purely archival?

STATUS: rehearsal halted at inspection. Nothing on the target modified. Original
runbook below assumed an empty target — supersede once an option is chosen.

## ✅ PREP MERGE COMPLETE + VERIFIED (2026-07-26) — decision: KEEP old data (merge)

Niko chose to keep the 400 old users (reactivation: old-Stellar-wallet →
Turnkey import; + analytics). Approach = **merge** current data INTO the old
target, additive-only. Executed against `normal-stellar` (target); the live
app was NOT repointed and stays on gnq. Results (every number matched the
pre-flight collision prediction):

| table | source | target before | added | target after |
|---|---|---|---|---|
| users | 1 | 400 | 1 | 401 |
| referrals | 1 | 40 | 1 | 41 |
| referral_actions | 0 | 7 | 0 | 7 |
| linked_wallets | 83 | 678 | 82 (1 dup skipped) | 760 |
| turnkey_wallets | 34 | 0 | 34 | 34 |
| swap_logs | 45 | 0 | 45 | 45 |
| vault_deposits | 184 | 0 | 184 | 184 |
| cctp_transfers | 22 | 0 | 22 | 22 |
| moneygram_transactions | 11 | 0 | 11 | 11 |

Verified: current data present (owner's turnkey wallet ✓); old data intact
(400 pre-May users, user_rsa_keys=201, sponsored_accounts=162 untouched, 211
encrypted-mnemonic wallets preserved). ZERO deletions/overwrites.

Artifacts (committed): `prisma/migrations-manual/2026-07-26_add_current_tables.sql`
(reviewed additive DDL — the 5 current tables, no drops) and
`scripts/db-consolidation/copy-data.cjs` (idempotent merge copy — re-run for
the cutover delta sync). NOTE: schema now has old-only tables
(sponsored_accounts, user_rsa_keys) + linked_wallets extra columns that are
NOT in prisma/schema.prisma — Prisma ignores them; leave as-is (kept on
purpose). Do NOT ever run `prisma db push`/`migrate` against this DB (would
drop them).

## FINALIZED CUTOVER (scheduled window, ~10 min, Niko-triggered)

1. Get `normal-stellar` **Session pooler** URI (Supabase → Connect → Session
   pooler; host `aws-0-us-east-2.pooler.supabase.com:5432`, user
   `postgres.vunxamogbkphzzdzxjut`, the reset password). App needs the POOLER
   URL, not the direct one used for the migration script.
2. Delta sync: re-run `node ../../scripts/db-consolidation/copy-data.cjs` from
   packages/web (idempotent — copies only rows created since the prep).
3. In Vercel set `DATABASE_MAINNET_URL` **and** `DATABASE_TESTNET_URL` (All
   Environments) to the pooler URI; update local `.env` the same moment.
4. Redeploy prod + staging.
5. Smoke test: login, portfolio loads, activity shows swaps/MGI, do one small
   savings or swap and confirm the new row lands in normal-stellar.
6. ROLLBACK (if anything is wrong): revert the two env vars to the gnq values
   + redeploy. gnq is untouched and fully live throughout, so rollback is
   instant and lossless.
7. Aftercare: keep gnq as 30-day backup; rename projects honestly
   (normal-stellar = the real app DB; repurpose gnq as the genuine testnet DB
   later); org → Pro before the 10k push (P0-9).

## Goal

All Prisma app data (currently in the project named `normal-testing`,
`gnqjbvmx…`, us-west-2) moves into `normal-stellar` (`vunxamog…`, us-east-2)
— the project that already holds auth. End state: one project, one region,
honest naming, and a real (separate) testnet database afterwards.

## Why this is low-risk if done in order

- All app tables use string IDs (cuid) — no sequences to fix; plain copy.
- Total data is tiny — full copy runs in seconds, so the freeze window is
  minutes, and with 0–5 DAU a low-traffic window has ~zero write traffic.
- The source database is never modified — rollback = revert two env vars.

## Plan

### Phase A — Rehearsal (no user impact, app untouched)
1. Create the schema in `normal-stellar` via `prisma db push` pointed at a
   `MIGRATION_TARGET_DATABASE_URL` (new, temporary env var — never touching
   `DATABASE_MAINNET_URL`).
2. Copy all app tables source→target with a Node script (SELECT → INSERT,
   dependency order: users → referrals → referral_actions; the rest are
   independent).
3. Verify: row counts per table match; spot-check owner's wallet row; app
   NOT repointed — production still runs on the old DB throughout.
   Rehearsal can be repeated any number of times (script truncates target
   app tables first).

### Phase B — Cutover (scheduled low-traffic window, ~15 min)
1. Pre-stage new values for `DATABASE_MAINNET_URL` + `DATABASE_TESTNET_URL`
   in Vercel (typed in, not yet redeployed).
2. Final copy run (truncate target app tables → full recopy → verify counts).
3. Trigger redeploy (prod + staging) → app now writes to normal-stellar.
   Update local .env the same moment.
4. Smoke test: login, portfolio, one swap log write, MGI history visible.
5. Accepted risk: writes landing on the old DB during the ~2–3 min build gap
   are lost — at current traffic effectively zero; window chosen at night.
   (Optional hardening if ever repeated at scale: maintenance flag.)

### Phase C — Aftercare
1. Old DB kept untouched as a 30-day backup (do NOT delete).
2. Rename projects to honest names (`normal-testing` → e.g.
   `normal-db-backup-2026-07`, or repurpose as the REAL testnet DB with a
   wipe once comfortable; then `DATABASE_TESTNET_URL` points there and the
   fake mainnet/testnet split becomes real).
3. Check Vercel Functions region vs us-east-2 (align later if mismatched).
4. P0-9: upgrade the Supabase org to Pro / disable spend cap — ideally
   BEFORE cutover so the real data lands on a plan that can't freeze.

## Open questions (must be answered before Phase A)

1. **Does anything besides the app write to this database?** Specifically
   `normal_contract_events` looks like an indexer-fed table (Goldsky?). If a
   pipeline streams into the old DB, it must be repointed at cutover too —
   or that table dropped from scope if it's rebuildable.
2. Supabase org Pro decision (Justin) — before or after cutover.

## Prerequisites checklist

- [ ] Niko: `normal-stellar` connection string (session pooler URI) provided
      into local `.env` as `MIGRATION_TARGET_DATABASE_URL`
- [ ] Niko/Justin: answer the Goldsky/external-writers question
- [ ] Niko: pick the cutover window (suggest a weekday ~06:00 CET)
- [ ] Rehearsal (Phase A) executed + verified
- [ ] Cutover scheduled
