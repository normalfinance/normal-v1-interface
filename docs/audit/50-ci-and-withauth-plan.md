# 50 — CI resurrection + withAuth: plan and as-built

**Status: IMPLEMENTED 2026-08-06.** 33/33 tests, typecheck, lint, build clean.
The CI changes take effect on the next push; watch the first run.

Two tasks that are one idea: make the bad thing impossible instead of fixing
its third instance. CI makes broken promises unmergeable; `withAuth` makes
unauthenticated routes unwritable-by-accident.

---

## Part 1 — CI

### What the investigation found (all verified via the public GitHub API)

1. **A CI workflow already existed** (`web-ci.yml`) — running prettier,
   eslint, i18n, tsc and the build on every push. Task 1 was never "create
   CI"; it was "find out why nobody has heard from it".
2. **It had failed 40 out of the last 40 runs**, back to at least July 25 —
   possibly it has *never* passed. Nobody mentioned it once in two weeks of
   work: red that stays red becomes wallpaper.
3. **Every run died at the same step — Prettier** (321 files unformatted),
   and GitHub *skips* the remaining steps after a failure. So ESLint, tsc and
   the build were not failing — they were **never running**. The July
   squash-merge that deleted the external-wallet gate sailed through with no
   net, and the repeated merge-conflict pain had no automated witness.
4. The repo is **public** — which is how all of this was readable without
   credentials, and worth its own conversation (CI logs are public too).

### Scenario analysis → decisions

| Scenario considered | Decision |
|---|---|
| CI must not be born red — every step verified locally before being made blocking | ESLint: exit 0 (87 warnings) ✓ · tsc ✓ · jest 33/33 ✓ · i18n extract/sync: exit 0 ✓ (they mutate locale files; harmless in CI, restored locally) |
| Prettier fails on 321 files; a repo-wide reformat commit NOW would make the ongoing squash-merge conflicts catastrophic | Step made `continue-on-error` with a dated comment; **repo-wide reformat scheduled as its own task** (after the squash policy is fixed), then flip back to blocking |
| The build on a secretless runner: `next build` imports every route module, and `server/rateLimiter.ts` constructs its Redis client from `UPSTASH_*` env **at import time** — a detonation unrelated to code health | Build step `continue-on-error` with instructions in the comment: add the secrets in repo Settings → Actions, then remove the flag. **Vercel builds every push with real env and is the authoritative build gate today** |
| Push trigger on `'**'` + enabling PRs would double-run every branch | PR trigger enabled for develop/master; push narrowed to develop/master (PRs cover feature branches; pushes cover post-merge) |
| Rapid follow-up pushes queue wasteful runs | `concurrency` group with cancel-in-progress |
| A green checkmark nobody is required to respect | **User task:** repo Settings → Branches → protect `develop`, require the `web` check. Until then CI informs but cannot block |

### What "green" means after this change

Blocking: install, internal-package build, ESLint, i18n extract/sync, prisma
generate, **tsc**, **jest**. Non-blocking (visible, annotated): prettier
(until the reformat), next build (until secrets). The gates that catch real
regressions — types and tests — are the ones that now bite.

---

## Part 2 — withAuth

### The wrapper

`lib/with-auth.ts` — routes are written as:

```ts
export const POST = withAuth(async (request, { user }) => { ... });
```

Auth runs before the handler; the verified Supabase user arrives as an
argument; a missing session is a uniform 401 that never reaches route code.
Public routes remain possible as the *visible* exception (a bare
`export async function`), which is what review should have to notice.
Unit-tested (3 cases), including the load-bearing one: the handler is never
invoked without a user.

### Scenario analysis → decisions

| Scenario | Decision |
|---|---|
| Routes with dynamic `[id]` segments receive a params context | Wrapper passes `params` through; tested |
| Routes that did cheap validation before auth now 401 first | Ordering change is desirable (no work for anonymous callers); no client parses 401 bodies beyond `res.ok` |
| Cron routes authenticate by cron secret, not user session | Explicitly out of withAuth's scope; documented below |
| Public-by-design routes (quotes before a wallet exists) must not break | Untouched; inventoried with reasons below |
| **Migrating all 37 authed routes now = a huge mechanical diff while every squash-merge manufactures conflicts** | Wrapper + 3 exemplar routes now (`stellar/memo-required`, `turnkey/btc-pubkey`, `turnkey/broadcast-btc` — behavior-identical, tsc-verified); **the full sweep is scheduled immediately after the merge policy is fixed**, when a 37-file diff stops being a conflict bomb |

### Route inventory — all 59, classified (from grep, 2026-08-06)

**Authed (37)** — already call `getAuthenticatedUser`; migrate mechanically in
the sweep: `cctp/*` (4), `coinbase/*` (2), `crisp`, `lifi/record`,
`marketing/opt-in`, `mgi/*` (9), `referral/*` (5), `savings/log-transaction`,
`send`, `swap/log-transaction`, `transaction`, `turnkey/*` (8, 3 already
migrated), `wallet/portfolio`, `wallets/*` (3), `stellar/memo-required`
(migrated).

**Cron (2)** — `cron/cctp-advance`, `cron/dune-sync`: cron-secret auth, not
sessions. Stay as they are.

**Public by design (7)** — each with a stated reason:
- `activity/{stellar,bitcoin,ethereum,solana}` — address-keyed public chain
  data, rate-limited with refresh floors (Block C #2 scoping decision pending)
- `lifi/quote`, `swap/quote` — prices are shown before a wallet is connected
  (explicit earlier decision); IP rate-limited
- `prices/history` — public market data, rate-limited

**⚠ NEW FINDING #50 — unprotected builder/proxy routes (5).** The inventory's
real yield: routes with **neither auth nor rate limiting** that no earlier
sweep flagged:
- `savings/deposit`, `savings/withdraw` — instantiate the DeFindex SDK **with
  our API key** for any anonymous caller: an open proxy for the exact quota
  behind the 429 incident
- `fees/build-payment` — builds fee-payment XDRs for anyone
- `lifi/status` — proxies LI.FI with our key, unthrottled (its sibling
  `lifi/statuses` IS rate-limited)
- `portfolio/activity` — the old activity system (#16 consolidation pending),
  fully open

None moves funds (unsigned XDRs / status reads), so this is quota-burn and
probing surface, not theft — but all five join the sweep with auth and/or
rate limits, priority on the DeFindex pair.

---

## What lands when

| When | What |
|---|---|
| **This batch** | CI fixed + jest gate · wrapper + tests + 3 exemplar routes · inventory |
| **User, GitHub settings** | Merge method → merge commits (or delete branch after squash) · branch protection requiring the `web` check · CI secrets to unlock the build gate |
| **Next batch (after merge policy)** | Repo-wide prettier reformat → flip step blocking · full 37-route withAuth sweep · #50 five routes get auth/rate limits |
