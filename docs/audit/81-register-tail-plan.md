# 81 — Register tail: plan

Status: **ITEMS 1 AND 2 SHIPPED; ITEM 3 SPIKED (not fixed).**
Branch: `chore/register-tail`. GO given 2026-08-24, decision A on item 1.
Outcome recorded at the end of this doc.

The audit register's remaining rows, re-verified against the code on
2026-08-24. Several rows the backlog still lists as open are already closed
(Block C #1 and #3, the token-store retirement, `normalize.ts` coverage, and
#53 — `savings-chart.tsx:110` literally reads `#53: REAL history`). What
follows is what is actually left.

---

## Item 1 — `wallet/activity`: the last route with neither auth nor a limit

### What is true today

```
GET /api/wallet/activity?walletAddress=<G…>&limit=50
  → prisma.vaultDeposit.findMany(...)
  → prisma.swapLog.findMany(...)
  no withAuth · no rate limit
```

The backlog waved this away as "chain data is public anyway". That is not
what the route serves: it reads **our Postgres**, not the chain.

Cause and effect: a script iterating Stellar addresses reads other people's
savings deposits and swap history out of our database, and every request is a
query we pay for. Two exposures in one — other users' records, and an
unauthenticated load channel straight into the DB.

### The decision (yours)

- **A. Require auth + ownership** (recommended). The only caller,
  `hooks/stellar/use-user-activity.ts:272`, passes an address the signed-in
  user owns. `userOwnsWallet` already covers both `turnkey_wallets` and
  `linked_wallets`, so the companion wallet and a connected Lobstr wallet
  both pass unchanged.
- **B. Keep it public, rate-limit it hard.** Only worth choosing if a public
  activity view is on the roadmap.

Doing neither is the one state that cannot be defended, which is where it
sits now.

### Change if A

`src/app/api/wallet/activity/route.ts`: wrap in `withAuth`, add the
`userOwnsWallet` 403 (identical shape to the two `log-transaction` routes),
response body unchanged.

### Risk

Any surface calling it for an address the user does not own starts getting
403. Grep shows exactly one caller. **Verification before merge:** load the
drawer, /portfolio and the asset pages as a hybrid user (Normal + Lobstr) and
confirm activity still renders for both wallets.

### Size: S.

---

## Item 2 — #30: 68 environment variables are invisible to the build cache

### Correcting my own earlier statement

I said `turbo.jsonc` declared zero env vars. That was task-level `env`;
`globalEnv` exists and holds 56 entries. The real number is:

```
used by the app : 96
declared        : 56
undeclared      : 68   (some declared entries are unused, hence 68 > 96-56)
```

### Why this is a foot-gun, not tidiness

Turbo decides "did anything change?" by hashing declared inputs. An
undeclared variable is invisible to that hash.

Cause and effect: change `NEXT_PUBLIC_TURNKEY_RP_ID`, rebuild → turbo sees
identical inputs → **cache hit** → you deploy the previous bundle, compiled
with the old value. Nothing in the diff explains it.

It bites hardest on `NEXT_PUBLIC_*`, which Next.js inlines into the
JavaScript at build time. The undeclared list includes exactly the variables
whose silent staleness would be hardest to diagnose:

```
NEXT_PUBLIC_TURNKEY_RP_ID          ← the passkey domain
NEXT_PUBLIC_SUPABASE_URL / ANON_KEY
NEXT_PUBLIC_MAINNET_USDC_ADDRESS / XLM_ADDRESS / DEFINDEX_VAULT
NEXT_PUBLIC_AUTOPILOT_PUBLIC_KEY
TURNKEY_* · AUTOPILOT_* · CCTP_* · LIFI_* · SOROSWAP_* · CRON_SECRET
SUPABASE_SERVICE_ROLE_KEY · HELIUS/ETHERSCAN/COINGECKO/DUNE keys
```

We have already lost a day to a config-versus-bundle disagreement this week
(the rpId/passkey hunt). This is the mechanism that produces that class of
bug on purpose.

### Change

1. Add the 68 names to `globalEnv`, grouped by subsystem with comments, in
   the file's existing style.
2. Delete `MNEMONIC_ENCRYPTION_SECRET` from `globalEnv` — declared but read
   nowhere in source, like `NORMAL_HOT_A_SECRET` and
   `TRANSIT_RSA_PRIVATE_KEY` (those two are not declared, only in `.env`).
3. **The durable part:** a `scripts/check-turbo-env.mjs` that diffs
   `process.env.*` usages against `turbo.jsonc` and exits non-zero on a gap,
   wired into CI. Without it this list rots again the next time someone adds
   a variable, and we would never notice.

Explicit names over a `NEXT_PUBLIC_*` wildcard: the list doubles as an
audit of what the build depends on, and the CI check makes maintaining it
free.

### Risk

Adding names can only *invalidate* cache entries, never serve a wrong one, so
the worst case is one slower build. The CI check could fail a PR that adds a
variable without declaring it — which is the point.

### Tests

Unit-test the diffing function (used-minus-declared, ignore comments, handle
`NEXT_PUBLIC_` prefixes) so the guard itself cannot silently pass.

### Size: S, high leverage.

---

## Item 3 — #40: drawer shows one wallet. Spike before fixing.

### What the backlog says

"Importing a Normal Stellar wallet hides the Turnkey one. VERIFIED cosmetic
(DB keeps both). Fix = wallet list."

### What the code actually shows

`turnkey_wallets.supabaseUid` is **unique** — our DB holds exactly one row
per user, so "DB keeps both" cannot be literally true. Reading
`/api/turnkey/import`:

- `data.walletId` is **always overwritten** with the imported wallet
- address columns are **additive** — on a genuine import they fill only
  columns that are still empty
- the route already logs `Replacing existing wallet reference with imported
  wallet`

So after an import a row can carry **wallet A's `stellarAddress` and wallet
B's `walletId`**. That mismatch matters more than the missing list: `walletId`
is what `addWalletAccounts` derives new chain accounts on, so a later "Set up
BTC wallet" would derive on the imported seed while the Stellar address still
belongs to the original one. Two seeds behind one row.

### Therefore

Item 3 is a **spike, not a fix**: reproduce an import on a staging account
that already has a created wallet, then record what the row, Turnkey and the
drawer each believe. Output is a short findings entry plus a follow-up plan.
Committing to "render a list" before that would be building UI over an
unresolved data question.

### Size: S to investigate. Fix unscoped until the spike lands.

---

## Sequence

1. **Item 2 first.** It protects the correctness of every deploy that follows,
   including the ones that ship items 1 and 3.
2. **Item 1** — needs your A-or-B decision.
3. **Item 3 spike** — report, then plan the fix separately.

## Gates (every item)

`tsc --noEmit`, full `eslint`, full `jest`, isolated production build
(`NEXT_BUILD_DIR=.next-verify`). Doc 80 gains rows only where behaviour a
tester can see changes — item 1 (activity still renders for both wallets in a
hybrid account) and nothing for item 2, which is invisible when correct.

---

## Not in this branch: `feat/autopilot-monitoring`

Removing the value caps (doc 76 §4 reversal) traded prevention for detection,
and the detection does not exist yet:

- rotate `AUTOPILOT_API_PRIVATE_KEY` on a schedule, with a written runbook —
  it is the only key that can move user funds
- alert when a single leg in `autopilot_signatures` exceeds a threshold, and
  when refusals spike

Own branch, own plan, own test round. Flagged here so it is not forgotten:
today it is the largest known gap in the system, and it is one we chose.


---

# Outcome (2026-08-24)

## Item 1 — shipped, decision A
`wallet/activity` is `withAuth` + `userOwnsWallet` (403). Two near-misses
caught before merge: the caller fetched with no session (would have 401'd
every feed, and an empty feed looks like "no activity"), and the
route-auth-conformance allowlist still blessed the route as public. Also
`take: limit` on both queries — the limit had never reached the database.

## Item 2 — shipped
68 undeclared variables added to `globalEnv`, grouped by subsystem;
`MNEMONIC_ENCRYPTION_SECRET` removed as dead. Verified with
`turbo run build --dry=json`. The guard is a unit test that walks the source
tree and fails CI on any future gap, with its pure helpers tested separately.

## Item 3 — spiked, deliberately NOT fixed
The drawer list is the symptom. The real defect: an import into an account
that already has a wallet leaves ONE ROW DESCRIBING TWO SEEDS (walletId =
imported, stellarAddress = original), and the export dialog exports by
walletId — so the recovery phrase we show does not control the Stellar address
we display. Full analysis in `20-findings.md`. Needs a live reproduction and a
product decision (refuse the import / migrate the row / model multiple
wallets) before any code.

## Gates
301 tests across 37 suites, eslint clean, tsc clean, isolated production build
exit 0.
