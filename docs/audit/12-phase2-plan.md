# 12 — Phase 2 Plan: Audit (verify & score)

Status: **PROPOSED — awaiting Niko's go.** Phase 2 turns the 31 raw
candidates from the system map (`10-system-map.md`) into a **ranked, verified
findings register** ready for the Phase 3 decision session. Still mostly
read-only; the one new capability is *controlled proof-of-concept probing*
against **staging only** (never production), under strict rules below.

## Objective

For every candidate: (1) **confirm it's real** with evidence, (2) **measure
its blast radius at 10k users**, (3) **score it**, (4) **sketch the fix + its
effort**. Output: `20-findings.md` — one row per confirmed finding, sorted,
that we walk through together in Phase 3.

## The scoring model (so ranking is objective, not vibes)

Each finding gets three 1–5 scores; **Priority = Severity × Likelihood ×
(6 − Effort)** so cheap high-impact fixes float to the top.

- **Severity** (1 cosmetic → 5 funds-loss / outage / data-integrity)
- **Likelihood at 10k** (1 rare → 5 happens every spike / every session)
- **Effort** (1 one-line → 5 multi-day / migration / needs a window)

Each row also carries: category (security / cost / performance / correctness
/ data-integrity / UX / hygiene), the file:line evidence, the verification
result, a one-line fix sketch, and whether it's free-tier-compatible.

## How each candidate gets verified (grouped by method)

### Group A — Controlled staging proof-of-concept (highest-value confirmations)
Rules: **staging only**, my own test account, tiny/no amounts, no destructive
calls, each probe logged in the findings row with exact request + response.
Nothing run against production. Ever.
- **#1 unauth DB writes** — POST a marked test row (e.g. `walletAddress:
  "AUDIT-POC"`) to `swap/log-transaction` with no auth header; confirm it
  persists; then delete the marker row. Proves exploitability + that it
  pollutes Dune. (Cleanup is the only write; done via the migration client.)
- **#2 unauth per-user reads** — GET `wallet/activity?walletAddress=<a real
  staging address>` with no session; record exactly what fields leak.
- **#3 quota-theft** — one unauthenticated call each to `lifi/quote`,
  `swap/quote`, `prices/history`; confirm they execute + hit upstream. No
  loops (we're demonstrating, not attacking our own quota).
- **#6** rate-limit coverage falls out of A automatically (did the probe get
  a 429 or sail through?).

### Group B — Runtime reproduction (needs the app running, not grep)
- **#16 / P0-5** — the dedupe failure: instrument locally, load portfolio,
  count actual `/api/turnkey/wallet` calls, and identify the trigger
  (hard-nav cache reset vs multi-mount vs retry storm). This is the one
  Phase 1 explicitly deferred.
- **#21 cron overlap** — force two `cctp-advance` ticks to overlap on
  staging (or simulate) with a test transfer; confirm the state machine's
  idempotency lock holds (no double-mint, no double-gas-topup).
- **#13 trailingSlash** — already HAR-confirmed; quantify the % latency tax
  by timing one route with/without the redirect.
- **#15 savings-card poll bounds** — drive a deposit, watch whether the
  2.5s/4s loops actually stop at terminal state.

### Group C — Cost arithmetic (finish the capacity model)
- **#22** — plug the measured 30s SOL-activity poll × 100 credits into the
  10k-user / spike model → exact projected Helius bill, today vs Layer-1.
- **P0-1/#4-style** — complete the Alchemy+Helius+CoinGecko capacity table
  rows (campaign + spike columns) using the HAR per-session counts. This
  finishes the one table Phase 0 left partial.
- **#10** — look up the free-tier Supabase session-connection limit; compute
  at what concurrent-request count it exhausts; confirm transaction-pooling
  is free-tier compatible (it is) and note the prepared-statements caveat.

### Group D — Code-confirmation (read-only, already mostly proven)
Fast desk-checks that finalize severity for: #5 (unauth builders — trace for
any fee-wallet/resource abuse), #8 (relayer default RPC — confirm no pinned
endpoint), #14 (dead savings event — already proven; score UX impact), #19
(auth no-timeout — confirm blast radius across 35 routes), #20 (browser-direct
failure handling per call-site), #23 (dune clear-then-insert atomicity), #26
(fee-first — write up the exact loss scenario for ratification), #27 (invisible
failures — confirm no server record path), #28 (savings XLM preflight — confirm
still absent), #29 (ETH/SOL send retry semantics), #30 (turbo env list —
mechanical diff), #31 (Onramper dead — confirm), #24/#25 (storage items),
#11/#12/#7 (vestigial table + dual activity systems), #18 (statuspage global).

### Group E — Blocked on the 5 open questions (park until answered)
#`ADMIN_SECRET` usage, cdn.normalapi ownership, statuspage account, Onramper
status, GEOIP usage. Recorded as "pending input", not guessed.

## Deliverable: `20-findings.md`

The ranked register (all confirmed findings, scored, sorted by Priority),
plus: a "confirmed non-issues" section (candidates that verification cleared
— honesty about what we checked and dropped), and the parked/open-questions
list. This is the single document the Phase 3 session runs on.

## Rules & guardrails

1. **No production probing** — staging only, my test account, marker rows
   cleaned up. Any candidate that can only be confirmed on prod is marked
   "unverified — prod-only" rather than tested.
2. **Read-only on code/config** — Phase 2 writes findings, not fixes (same
   discipline as Phase 1). `git status` clean over `src/`.
3. **Every score is defended** — a row without evidence doesn't get a
   severity number; it stays a candidate.
4. **No fixes leak forward** — even an obvious one-liner waits for the
   Phase 3 ranking, so we choose order deliberately.

## Timeline & what I need

~3–4 days: Group A+B (day 1–2), C (day 2), D (day 3), write-up/scoring (day
3–4). From Niko during execution: nothing required (staging + my test
account). When convenient: the 5 open-question answers (unblocks Group E) and
a nod that staging POC probing under the above rules is OK. Phase 3 (joint
ranking) begins the moment `20-findings.md` is delivered.

## Exit criteria

- [ ] Every candidate is either Confirmed (scored) / Cleared (non-issue) /
      Parked (needs input) / Unverified-prod-only — none left ambiguous
- [ ] Capacity table complete (all provider rows, both spike columns)
- [ ] P0-5 dedupe trigger identified
- [ ] `20-findings.md` ranked by Priority, ready for Phase 3
- [ ] Any staging POC marker data cleaned up; no code/config changed
