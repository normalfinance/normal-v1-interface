# 20 — Findings Register (Phase 2)

Baseline `aabafbd` · started 2026-07-27. Verifies & scores the Phase-1
candidates + P0 carryovers + scope-additions #32/#33. **Priority = Severity ×
Likelihood-at-10k × (6 − Effort)**, each 1–5. Verify status: `code` =
confirmed by reading · `math` = confirmed by arithmetic · `POC?` = code-proven,
live staging proof-of-concept pending Niko's nod · `repro?` = needs runtime
reproduction · `input?` = parked on an open question.

## Ranked findings (Phase 3 walks this list top-down)

| Pri | # | Finding | Cat | S·L·E | Verify | Fix sketch | Free? |
|---|---|---|---|---|---|---|---|
| **80** | **35** | 🔴 **Sanctioned-country blocking is commented out — every blocked country can use the app** | compliance | 5·4·2 | code | Vercel edge geo (`req.geo.country`) + existing list & `/blocked` page | ✅ |
| 64 | 1 | Unauth DB-write routes (swap/savings log-transaction) → fake rows, Dune poisoning, bloat | security | 4·4·2 | code+POC? | require session OR signed-payload verify | ✅ |
| 64 | 22 | SOL/ETH activity: **server cache TTL (30 s) equalled the client dedupe window**, so nearly every revalidation missed and paid ~100 Helius credits | cost | 4·4·2 | code+math | **DONE 2026-07-27**: TTL→300 s + `?refresh=1` bypass (30 s floor) + client dedupe aligned. *Method-swap idea was wrong — see plan §corrections* | ✅ |
| 48 | 10 | Serverless connection exhaustion at spike (session pooler) | reliability | 4·3·2 | math | transaction pooler (6543 + `pgbouncer=true`); test prepared-stmt caveat | ✅ |
| 45 | P0-2 | Supabase Realtime engine burns ~98% DB time — feature UNUSED | cost/perf | 3·3·1 | code | disable Realtime in project settings; verify on staging | ✅ |
| 40 | 13 | `trailingSlash:true` → every API call is 2 round-trips | perf/cost | 2·5·2 | code+HAR | trailing-slash-aware fetch OR drop setting (SEO check) | ✅ |
| ~~40~~ | ~~14~~ | ~~Savings-refresh event has no emitter~~ — **FALSE POSITIVE, withdrawn 2026-07-27**: it *is* dispatched at `use-defindex-savings.tsx:341,538`. The Phase-1 grep searched the string literal; the dispatcher uses the `POSITION_SYNC_EVENT` constant. | — | — | code | none — no code written | — |
| 36 | 2 | Unauth reads of per-user activity/position by address | privacy | 3·3·2 | code+POC? | require session; scope to own data | ✅ |
| 36 | 3 | Unauth quote/price routes let outsiders burn our provider quotas | cost | 3·3·2 | code+POC? | auth or stricter RL on quote routes | ✅ |
| 36 | 27 | Failed/abandoned swaps & deposits leave NO server record | integrity | 3·4·3 | code | CCTP's record-before-broadcast pattern | ✅ |
| 32 | 19 | All 35 authed routes verify session live with NO timeout | reliability | 4·2·2 | code | timeout wrapper + cached verification | ✅ |
| **48** | 16 | Dedupe failure: `wallet-info.ts` has no single-flight guard → cache stampede (~22 calls/session) | perf/cost | 2·4·**1** | **ROOT CAUSE FOUND** | add in-flight promise; unify with the SWR path | ✅ |
| 30 | 30 | Turbo declares 57 env vars, ~55 read-but-undeclared → stale cached builds | hygiene | 3·2·1 | code | declare full list; verify Vercel cache invalidation | ✅ |
| 27 | 26 | Fee-first: fee signed before swap → fee lost if swap fails | correctness | 3·3·3 | code | **ratify** the risk OR bundle fee (see #33) | ✅ |
| 25 | P0-1 | **[STRATEGIC]** Per-client fetching 7–30× over free tiers → the Layer-1 cache re-architecture | cost | 5·5·5 | math | server-fetch-once + event refresh (workstream B) | ✅ |
| 24 | 28 | Savings has no XLM-fee preflight → mid-flow failure (June TODO) | UX/correctness | 2·3·2 | code | preflight XLM balance, warn upfront | ✅ |
| **32** | 29 | ETH/SOL send: hardcoded 21000 gas breaks contract destinations; lost response can cause **double send** | correctness | **4**·2·2 | code | `estimateGas` + record-before-broadcast | ✅ |
| ~~24~~ | ~~21~~ | ~~cctp-advance overlap~~ — **CLEARED**: proper compare-and-swap guards, cannot double-mint | — | — | code | none needed ✅ | — |
| 20 | 23 | dune-sync clear-then-insert → dashboard empty ≤4h on failed insert | integrity | 2·2·1 | code | insert-then-swap, or transactional | ✅ |
| 18 | 8 | CCTP relayer (money-moving) on viem DEFAULT public RPCs | reliability | 3·2·3 | code | pin a dedicated RPC endpoint | ✅ |
| 18 | 32 | **[STRATEGIC]** External Stellar wallets can't do cross-chain/CCTP (gated) | UX/arch | 3·3·4 | code | create-Turnkey CTA and/or outbound hook (#33) | ✅ |
| 16 | 24 | Coinbase off-ramp tracking device-local (localStorage) | UX | 2·2·3 | code | DB-back it (MoneyGram pattern) | ✅ |
| 16 | 7/12 | Two parallel activity systems (wallet/activity vs portfolio/activity) | hygiene | 2·2·3 | code | consolidate | ✅ |
| 15 | 18 | Statuspage widget loaded globally, polls 2×/min forever | perf | 1·3·1 | code | load on-demand / drop | ✅ |
| 12 | 20 | Browser-direct provider calls have inconsistent timeout/fallback | reliability | 2·2·2 | code | apply aggregate's timeout+fallback pattern | ✅ |
| 10 | 5 | Unauth `fees/build-payment` builder | security | 1·2·1 | code | **CLEARED-LOW**: caller-source only, no drain | ✅ |
| 9 | 33 | **[STRATEGIC]** Single-signature goal (CCTP-from-XLM = up to 4 sigs) | UX/arch | 3·3·5 | code | fee-bundle → USDC-first → intent/hook (deep) | ✅ |
| 5 | 31 | Onramper key exposed for a dead (commented-out) service | hygiene | 1·1·1 | code | remove key + config | ✅ |

## The [STRATEGIC] flag

The formula rewards cheap fixes — correct for *ordering the backlog*, but it
under-ranks big-effort **foundational** items (P0-1 Layer-1, #32/#33 arch)
that must happen regardless of their formula score. These are scheduled by
decision in Phase 3, not by raw priority number. Notably, **#22 is the cheap
front-half of P0-1** — switching SOL to the 1-credit method delivers a large
chunk of the cost win without the full re-architecture, so it ranks high on
its own.

## Cleared / non-issues (verified, dropped)

- **#5** build-payment — caller-source only, no drain vector.
- **NEXT_PUBLIC key exposure** (old fear) — audit clean; all provider secrets
  server-side. Only #31 (dead Onramper key) remains as cleanup.
- **Missing DB indexes** — none; all app queries index-backed.
- **Raw SQL / multiple Prisma clients** — none; single client, no raw SQL.

## Open questions — ANSWERED 2026-07-27 (all 5 closed)

| Q | Niko's answer | Code verification | Outcome |
|---|---|---|---|
| ADMIN_SECRET | "if not in code we don't use it" | **IS used** — `wallets/link` admin rate-limit bypass. But `getAuthenticatedUser()` runs FIRST and rejects the secret as a session token → **the bypass is unreachable dead code** (no vulnerability) | → **#36** remove or fix |
| cdn.normalapi.com | Joshua (past dev) owns it; Niko has access | token-icon CDN, non-critical path | ✅ closed — transfer ownership when convenient |
| Statuspage `grmcl3nnw63w` | not sure | loaded globally, polls 2×/min | #18 stands; **recommend removing** the widget (nobody owns it) |
| Onramper | dead — remove | only in `global-config.ts` | ✅ #31 confirmed: delete key + config |
| GeoIP / country blocking | "we were blocking some countries, should be in middleware" | **CONFIRMED — and it is entirely commented out** | → **#35, new top finding** |

## 🔴 #35 — Sanctioned-country blocking is DISABLED (Priority 80 — new #1)

`middleware.ts` still declares `BLOCKED_COUNTRIES` (~30 entries incl. Iran,
Cuba, Russia, Belarus, Myanmar, Syria…) and a full geo-lookup + `/blocked`
redirect — **all of it is commented out**. The live middleware parses the IP,
then unconditionally `return NextResponse.next()`. **Today every sanctioned
country can use the app.** For a financial product this is a compliance
exposure, not a performance nit — and it is invisible: nothing errors.

Sev **5** · Lik **4** · Eff **2** → **Priority 80 — ranks above every existing
finding.** Fix sketch: don't restore the old external-API lookup (it added a
blocking network call to every request — likely why it was disabled). Use
**Vercel's built-in edge geo** (`req.geo.country`, zero latency, no API key,
no cost), keep the same country list and `/blocked` page. Also then delete the
now-dead IP-parsing code left running on every request.
**Recommend pulling this into the quick-wins batch.** Ask for Phase 3: was it
disabled deliberately (a decision) or temporarily during debugging (a
forgotten revert)? Either way it needs an explicit owner decision.

## #37 — Staggered load: BTC → XLM → savings pop in one at a time (Niko, 2026-07-27)

Each data source is its own SWR resolving independently, so the portfolio
paints in waves instead of once. Wanted: **one skeleton until user data is
ready.** Caveat that shapes the fix: "wait for everything" is only safe once
the slowest source is *bounded* — `fetchStellarPayments` calls Horizon
directly for **100 records with no timeout**, so gating on it today would make
the whole screen hostage to the slowest provider. Correct order: bound the
sources (#20 timeouts), then gate the skeleton on a combined ready-state, with
a deadline after which partial data renders anyway.
Sev 2 · Lik 5 · Eff 2 → **Priority 40.** Pairs with #20; schedule together.

## #38 — BTC + XLM activity bypass our server entirely

`fetchBtcActivity` → `mempool.space` and `fetchStellarPayments` → Horizon are
**browser-direct**, so the Wave-1 cache fix cannot help them: no server cache,
no timeout, no shared answer between tabs/users. XLM additionally pulls **100
payment records** per call. These are the two remaining legs of P0-1 (Layer-1)
— confirms that the re-architecture is where they get fixed, not a config
tweak. Sev 3 · Lik 4 · Eff 4 → Priority 24 (rolls into P0-1).

## #39 — Adding a new chain touches ~28 files (Niko's question, 2026-07-27)

**Measured, not estimated.** `grep -rl bitcoinAddress src/` → **28 files**.
The four chains are modelled as *named fields* (`bitcoinAddress`,
`ethereumAddress`, `solanaAddress`, `stellarAddress`) rather than a keyed map,
so every consumer — Turnkey wallet + import routes, send modal, onramp/offramp
modals, account drawer, portfolio, assets index, asset-details, price history,
CCTP pivot — hardcodes the list. `SendAdapter.network` is a closed union type.

**What's already good:** `send-adapters/index.ts` defines an explicit
`SendAdapter` contract ("add new networks by implementing this interface") —
the right abstraction, just not carried through the rest of the app.

**Cost today of adding Avalanche:** new adapter + activity route + ~28 file
edits, even though Avalanche is **EVM-compatible** and could reuse the
Ethereum adapter — except `ethereum.ts` hardcodes `chain: mainnet` /
`chainId: mainnet.id`. **Cardano** is a bigger question: non-EVM, and Turnkey
signing support for it is **unverified — do not assume**.

**Fix sketch (structural):** (1) chain **registry** — one entry per chain
(id, adapter, decimals, explorer, icon, activity provider, CCTP domain);
(2) addresses as `Record<ChainId, string>` instead of named fields;
(3) parameterise the EVM adapter by chain. Then a new EVM chain ≈ **one
registry entry**, and a new non-EVM chain ≈ registry entry + one adapter.
Sev 2 · Lik 4 · Eff 4 → Priority 16 — but this is a **velocity multiplier**:
worth doing *before* the next 2 chains, not after.

## #40 — Importing a Normal Stellar wallet hides the Turnkey Stellar wallet (Niko, 2026-08-03)

**Reported:** after importing an existing Normal Stellar wallet, the account
drawer shows the imported wallet and the Turnkey XLM wallet no longer appears.
Both should be visible — a user can legitimately hold each.

**Two candidate causes; needs investigation before a fix:**

1. **UI (likely).** The drawer renders a single "connected wallet" from
   `persist.wallet.address`, which the import repoints at the imported wallet.
   The Turnkey address still exists but has nowhere to render — the UI models
   one active wallet where the data model allows several.
2. **Data (must be ruled out first).** `api/turnkey/import` is additive on a
   *genuine* import (`if (addr && !row[col])` — never overwrites), but the
   chain-scoped branch writes unconditionally:
   `data[columnFor[requestedChain]] = addr`. If an import is ever sent with
   `chain: 'stellar'`, it would **overwrite the existing Turnkey stellarAddress**
   — real data loss, not a display bug.

**VERDICT (checked in Supabase 2026-08-03): cause (1) — UI only, no data loss.**
The `turnkey_wallets` row still holds the Turnkey address (`GCBEKVQ…`) while
the drawer displays the imported one (`GDVTNPA2…`). Different values, so the
import did **not** overwrite the column; the chain-scoped write guard is not
needed. Confirms the DB models several wallets per user while the drawer
renders exactly one "connected" wallet.

**Fix (deferred, agreed with Niko):** show both — the drawer needs a wallet
*list* rather than a single `persist.wallet.address`. Pairs naturally with the
`getChainAddress()` migration of `account-drawer.tsx` (19 refs), since that file
is being touched anyway.
Sev 2 (cosmetic, confirmed) · Lik 3 · Eff 3 → **Priority 18.**

## #36 — ADMIN_SECRET bypass is unreachable dead code

`wallets/link` intends an admin rate-limit bypass, but auth rejects the secret
before the check runs. Not exploitable — but a maintainer could "fix" it into
a real bypass. Sev 1 · Lik 2 · Eff 1 → Priority 10. Remove it, or implement
properly with a separate header.

## Scale-target revision (2026-07-27) — 1k first, then slowly to 10k

Niko: **no Supabase Pro for now; optimise first, push to ~1k, then grow toward
10k.** Effect on this register:

- **Priorities do NOT change.** Every top finding is a *per-session* or
  *per-request* problem (#1, #22, #13, #14, P0-2, #35) — they bite at 100 users
  as much as at 10,000. The ranking stands.
- **What relaxes:** the pure *capacity* items — P0-9 (Pro) and partly #10
  (connections) — buy time. **P0-9 formally deferred by decision.**
- **What does NOT relax:** #35 compliance (users, not load), #1/#2/#3 (a
  single attacker, no scale needed), and cost items #22/P0-1 — since we're
  staying on free tiers, *staying under the free ceilings is now more urgent,
  not less.* #22 (100× cheaper Solana calls) is the strongest lever here.
- Capacity table will report **both** the 1k and 10k columns.

## Business track (not formula-scored)

~~P0-9 Supabase Pro~~ **DEFERRED by decision** (revisit before the 10k push) ·
Turnkey Enterprise pricing (before 10k) · #34 staging DB (gates Phase 5).

## Quick-wins shortlist (high priority, low effort — candidates to pull forward)

#14 (wire savings event) · #22 (cheap SOL method) · P0-2 (Realtime toggle) ·
#30 (env declarations) · #23 (dune order) · #18 (statuspage) · #31 (onramper).
Several are 1-liners with real impact — Phase 3 may greenlight a "quick-wins"
PR batch ahead of the big architecture work.

## Staging POC results — EXECUTED 2026-07-27 (all non-destructive)

**Method note (deviation from plan, deliberate):** staging shares the
production database, so the planned "write a marker row" test would have
written into the REAL database. Replaced with a **zero-write proof**: send an
unauthenticated request carrying a deliberately invalid payload. If the reply
is a *validation* error (400) rather than *401 Unauthorized*, the request
reached business logic — which proves no auth gate exists, without creating
any row. No data was written, read, or deleted anywhere.

| Probe | Request (no auth, no cookie) | Result | Verdict |
|---|---|---|---|
| #13 | GET `/api/prices/history?days=1` | **HTTP 308 → same URL + `/`** | **CONFIRMED live** — every API call redirects, 2 round-trips |
| #1 | POST `/api/swap/log-transaction/` | **400** `"Invalid wallet address format"` | **CONFIRMED** — reached validation, so no auth gate (401 never happened) |
| #1 | POST `/api/savings/log-transaction/` | **400** `"Missing required fields"` | **CONFIRMED** — same, no auth gate |
| #2 | GET `/api/wallet/activity/` | **400** `"Invalid wallet address format"` | **CONFIRMED** — no auth gate; a valid address would have been served |
| #3 | GET `/api/prices/history/?symbol=XLM&range=1w` | **200 + real price series** | **CONFIRMED** — an anonymous internet user gets data off our paid provider path |

Rate-limit check (#6) was done **read-only** instead of by burst — a 12-request
burst was correctly blocked by tooling safety, and code inspection answers it
better anyway: `swap/log-transaction`, `savings/log-transaction`,
`wallet/activity` have **no rate limiter**; `prices/history` **does** (its
severity drops accordingly); `lifi/quote` and `swap/quote` have **neither auth
nor rate limit** (worst pair in #3); `cctp/quote` is properly authed ✅.
14 of 55 routes carry a limiter.

**Scoring impact:** #1, #2, #3, #13 move from `code` to **CONFIRMED-LIVE** —
no longer theoretical. Priorities unchanged (they were already scored as real).

## Runtime/root-cause verifications — DONE 2026-07-27

### #16 — ROOT CAUSE FOUND (no runtime repro needed)
There are **two independent fetch paths to `/api/turnkey/wallet`**:
1. `hooks/use-turnkey-wallet.ts` — SWR, `dedupingInterval: 60_000`, keyed by
   user. **Correctly deduped ✅**
2. `lib/turnkey/wallet-info.ts` — module-level cache, 60 s TTL, but **no
   in-flight (single-flight) guard**. Every caller that arrives *before the
   first response returns* sees an empty cache and fires **its own fetch**.

Path 2 has ~9 callers (`use-normal-wallet`, onboarding-wizard, eth/sol send
adapters, cctp burn-evm, pivot-swap, lifi execute, mgi kit-signer,
add-account, import-mnemonic) that mount/run together → **classic cache
stampede**. The two paths also don't share a cache, so SWR's dedupe never
covers path 2. This explains the "22 where 3 expected". Fix: store the
in-flight promise in `wallet-info.ts` (single-flight), then unify both paths
onto one source. **Effort drops 2 → 1** (Priority 32 → **48**).

### #21 — CLEARED ✅ (was: cron overlap risk)
`lib/cctp/state.ts` uses **optimistic concurrency control**: every transition
is `updateMany({ where: { id, status: <expected> } })` and the mint claim
checks `claimed.count === 0` before acting — a proper compare-and-swap. Two
overlapping ticks cannot double-mint; the loser no-ops. There's even a
rollback that returns the row to `ATTESTED` if the mint submit fails. This is
correct concurrent design — **dropped from the register**.

### #29 — CONFIRMED, two concrete defects (Priority 24 → **32**)
- **Hardcoded `gas: 21000n`** (ethereum.ts:65) with no `estimateGas`. Correct
  for wallet-to-wallet, but **fails if the destination is a contract**
  (exchange deposit contracts often are) — the transaction burns gas and
  reverts. User pays for a failure.
- **Broadcast-then-lost-response = possible double send.** Both adapters
  `catch → onError → return ''`. If the network drops *after* the node
  accepted the tx, the UI reports failure while the transaction is live. A
  user retry reads a fresh `pending` nonce (ETH) / new blockhash (SOL) and
  creates a **second valid transaction** — funds sent twice.
- Neither adapter writes any server record (compounds #27: no trace to
  reconcile against). BTC is the exception — it goes through our API ✅.

## Capacity model — 1k and 10k columns (Phase-0 table completed)

Method: measured per-user monthly averages from the live provider dashboards
(`02-baseline.md`), extrapolated. **Caveat, stated honestly:** the average
comes from ~34 registered / 4–5 *active* users, so it reflects **active-user**
behaviour. Real 1k/10k figures depend on the active fraction — treat these as
the *worst case where everyone is active*, which is the right number to design
against.

| Provider | Free ceiling | Per active user/mo | **At 1k** | **At 10k** |
|---|---|---|---|---|
| Alchemy (ETH) | 30M CU | ~22K CU | ~22M CU — **73 % of free, fits but no headroom** | ~220M CU — **7× over** |
| Helius (SOL) | 1M credits | ~3K credits | ~3M — **3× OVER already** 🔴 | ~30M — **30× over** |
| CoinGecko | keyless / shared-IP limits | n/a | 429-risk from shared Vercel IPs | same, worse |

**The decisive number — what #22 alone buys.** The Enhanced API is 94 % of
Helius spend at 100 credits/call; the equivalent plain RPC method costs 1.

| | today | after #22 |
|---|---|---|
| per active user | ~3,000 credits | **~205 credits** |
| at 1k users | 3M — 3× over free 🔴 | **~205K — 20 % of free** ✅ |
| at 10k users | 30M — 30× over 🔴 | ~2M — 2× over (then P0-1 closes it) |

**Conclusion for the 1k-first plan:** Helius is the *only* provider already
past its free ceiling, and **#22 alone fixes it** — one method swap turns a 3×
overage into 20 % utilisation. Alchemy survives 1k without the big
re-architecture (73 %, thin), and P0-1 becomes mandatory between 1k and 10k.
This validates deferring Supabase Pro **and** confirms #22 as the highest-value
cheap fix in the register.

## Phase 2 exit status — COMPLETE 2026-07-27

- [x] Every candidate Confirmed / Cleared / Answered — none left ambiguous
- [x] Capacity table complete (1k + 10k columns)
- [x] #16 root cause identified in code (repro unnecessary)
- [x] Ranked and ready for the Phase 3 session
- [x] Staging POC non-destructive; nothing written; no code/config changed
- **Cleared in Phase 2:** #5 (no drain vector), #21 (correct compare-and-swap)
- **New in Phase 2:** #34 (staging shares prod DB), #35 (geo-blocking disabled
  — new #1), #36 (dead admin bypass)

## #34 — No isolated staging data environment (discovered during POC)

Staging shares the production database, so any destructive or load test would
hit real user data. This is why the POC had to be redesigned mid-flight. It
also blocks Phase 5 (load testing) — we cannot safely load-test against prod
data. Sev 3 · Lik 3 · Eff 3 → **Priority 27**. Fix sketch: a separate staging
Postgres (Supabase project already exists as the 30-day backup) + staging-scoped
`DATABASE_*` vars. Needed **before Phase 5**.

---

## #41 — External wallets cannot log transactions (REGRESSION, 2026-08-05)

Found while checking whether the tester guide holds for Freighter/Lobstr/
Ledger/WalletConnect users. Full analysis: [46-external-wallets.md](46-external-wallets.md).

Connecting an external wallet never writes a `linked_wallets` row — all four
`linkWallet()` call sites are Normal-wallet paths. Commit `245d7ad` (today)
added `userOwnsWallet()`, which accepts only `linked_wallets` OR
`turnkey_wallets`. So `/api/swap/log-transaction` and
`/api/savings/log-transaction` now return **403** for every external-wallet
user. Verified against `245d7ad^` that this worked before today.

Impact: completed swaps do not appear as Swap rows in Activity (that feed is
DB-only); Dune under-counts. Savings positions stay correct — the DeFindex
events API is authoritative and the DB is a third-tier fallback. **Silent to
the user** (one `console.error`).

Sev 3 · Lik 3 · Eff 1 → **Priority 9 (low effort, ship before staging).**
Fix: call `linkWallet(address)` inside the kit store's `connectWallet` after a
successful connect — one place, so a future connect path cannot forget it.
Must tolerate failure (the link route is weekly-rate-limited) and never block
the connection.

## #42 — Wallet self-heal is Turnkey-only and may switch a hybrid user's wallet

Code-path reading, **not yet reproduced**. The self-heal added for the XLM/USDC
data-loss bug (`use-normal-wallet.tsx:114`) restores the missing address from
Turnkey regardless of the connected wallet type. Pure external users get no
protection (no-op). A hybrid user — external Stellar wallet plus a Turnkey
wallet provisioned for BTC/ETH/SOL — whose address is cleared gets the
**Turnkey** Stellar address silently connected on the next load, with a
different XLM/USDC balance and no notification.

Sev 3 · Lik 2 · Eff 2 → **Priority 12.** Reproduce first: connect Freighter,
provision BTC via a swap, disconnect, reload.

## #43 — Dead wallet types (`xbull`, `hana`)

PRE-EXISTING, not from the optimisation batch.

Both modules were deleted in `9a2fff6` (2026-05-14) but survive in the
`walletType` union and in the `getWalletIdFromType` restore switch, where they
resolve to null and force a disconnect. Harmless; it is why the docs and memory
listed six supported wallets when four are connectable. Sev 1 · Lik 2 · Eff 1 →
**Priority 2.** Cleanup.

## Batch attribution for #41–#43 (asked 2026-08-05)

Which of the external-wallet findings the **staging batch** caused, verified in
git rather than assumed:

- **#41 — ours.** `245d7ad`, today. Verified working at `245d7ad^`. The only
  true regression in the set.
- **#42 — ours.** The self-heal effect added for the wallet data-loss fix.
  Behaviour change, not yet reproduced.
- **#43 — not ours.** `9a2fff6`, 2026-05-14.
- **Missing cross-chain gate — not ours.** Committed as `3e1ab40` on
  `feat/advanced-xlm-swaps` (2026-07-11), never an ancestor of HEAD, and absent
  from the PR that merged that work (`d644679`, #466). Lost in that squash,
  before the optimisation work began.
- **`/api/wallet/activity` unauthenticated — not ours.** Already Block C #2.

Cleared on inspection: `postTransactionLog`'s `nf:activity-updated` dispatch
does not fire for external wallets (403), but at `245d7ad^` savings dispatched
nothing at all, so this is a missed improvement rather than a regression. Swaps
are unaffected — `use-soroswap-engine.tsx:107` dispatches independently.

### #41 — FIXED 2026-08-05

`use-stellar-wallets-kit.tsx`: `ensureWalletLinked()` called from
`connectWallet` (covers all three UI connect paths, which all use this hook)
**and** from the session-restore effect (backfills users who connected before
the fix, without asking them to reconnect). Checks `isWalletLinked` before
POSTing, because that route charges the "3 wallets per day" creation quota even
for an already-linked address. Never throws.

Shipped alongside a second change from the same decision: **cross-chain swaps
are now gated off for external wallets** (`swap-card.tsx`), restoring `3e1ab40`
and additionally disabling the LI.FI/CCTP quote fetches so hybrid users don't
burn quota on swaps the CTA cannot execute. Product decision: external wallets
are Stellar-only, so the previous behaviour — silently provisioning a Turnkey
wallet mid-swap — was wrong.

## Fable re-review of the staging push (2026-08-06)

Fresh-eyes pass over the push's touched surface after it went to staging. Two
real issues found, both fixed same-day; everything else checked out.

### #44 — /api/turnkey/broadcast-btc was an open relay (FIXED)

The only Bitcoin route with no auth gate: anyone on the internet could POST a
raw transaction and have our server broadcast it to mempool.space. Not a fund
risk (a signed tx is broadcastable by its holder anyway), but strangers
proxying through our IP means their abuse and rate-limit flags land on us.
Same class as the Block C log-transaction findings; it was simply not in that
sweep's scope. Fixed: `getAuthenticatedUser` gate + auth headers on all three
callers (bitcoin send adapter, LI.FI executeBtc, dev sweep page). Sev 2 · Lik 2
· Eff 1.

### #45 — btc-pubkey matched the wallet account by format, not address (FIXED)

`accounts.find(a => a.addressFormat === …)` returns the FIRST P2WPKH account.
Signing uses `signWith: bitcoinAddress`, so if a wallet ever carries two BTC
accounts the route could return the other account's key and the client-side
verification would refuse with "account mismatch" — a false hard failure.
Fixed: match on `a.address === wallet.bitcoinAddress` with the format kept as a
sanity assertion. Sev 2 · Lik 1 · Eff 1.

### Checked and cleared in the same pass

- **LI.FI swap logging** (`/api/lifi/record`) — authenticated, and the server
  derives the Stellar address from `turnkey_wallets` rather than trusting the
  body. No linked_wallets dependency, so unaffected by #41.
- **CCTP logging** — separate `/api/cctp/transfers` routes, auth headers sent.
- **build-btc-tx / build-btc-sweep** — both authenticated.
- **`ensureWalletLinked` ordering** — deliberately awaited in `connectWallet`
  so the link lands before the first possible log write; the restore-path call
  is fire-and-forget and once per session.
- **The swap gate** — `walletType` undefined (signed in, no wallet) leaves
  engines enabled and the address gates in charge; Normal-wallet users see no
  behaviour change; hybrid users stop fetching quotes they cannot execute.

### Root-cause note (third occurrence)

#44 is the third unauthenticated-route finding (#3 log-transaction, Block C
#2 wallet/activity, now broadcast-btc). Routes are born open because auth is
opt-in per route. The structural fix is a shared `withAuth` route wrapper (or
middleware allowlist) making authentication the default and public routes the
explicit exception. Registered as the recommended follow-up, sized S.

## #48 — Memo-less sends to exchange deposit addresses (FIXED 2026-08-06)

Found by a real loss on staging: 5 XLM sent to Coinbase
(`GDS2WFLI…QTG6`, tx `d6ff2018…f66c`) with no memo. On-chain success; Coinbase
credited nothing. Exchanges pool all customer deposits into one Stellar
account and the memo is the only routing key — without it the funds sit
unattributed in the exchange's omnibus balance.

Root cause in our UI: the memo field was collapsed behind "Add memo
(optional)". The SDK's SEP-29 submit-time check DID run and passed — verified:
Coinbase has never set the `config.memo_required` flag on that account, so the
ecosystem's own guard is empirically insufficient.

**Fix (fail closed, three layers):**
- `lib/stellar/memo-required-list.ts` — seed list of ~33 verified exchange
  deposit accounts (fetched from stellar.expert's directory, incl. all five
  Coinbase accounts — they rotate). Instant, offline.
- `GET /api/stellar/memo-required` — live lookup: stellar.expert directory
  tag, then the SEP-29 account flag. Authenticated (the #44 lesson), Redis
  24h cache, fails open to the seed list.
- Send modal: for a flagged destination the memo field force-opens with a
  warning naming the exchange, the toggle disappears, and Review is disabled
  until a memo is entered. Savings withdraw-card (which has NO memo input)
  hard-blocks exchange destinations and points at the Send dialog.

Unit-tested with the incident address itself as the fixture. Recovery of the
5 XLM: Coinbase support ticket with the tx hash (manual attribution, not
guaranteed).

## #49 — CI red on every run since at least July 25 (FIXED 2026-08-06)

`web-ci.yml` had failed 40/40 recent runs, all at the Prettier step (321
unformatted files) — and GitHub skips subsequent steps, so **ESLint, tsc and
the build had not run in CI at all** in that window. The July gate deletion
(PR #466) and every squash-merge accident happened with no automated witness.
Fix: prettier and build made non-blocking with dated comments (reformat and
CI-secrets are scheduled follow-ups), jest added as a blocking gate, PR
trigger enabled, push trigger narrowed, concurrency added. Every blocking
step verified green locally before flipping. Sev 3 · Lik 3 (it was certain) ·
Eff 1.

## #50 — Unprotected builder/proxy routes (OPEN, scheduled)

Found by the withAuth inventory of all 59 routes: five routes with neither
auth nor rate limiting — `savings/deposit` + `savings/withdraw` (instantiate
the DeFindex SDK with OUR API key for anonymous callers: open proxy for the
quota behind the 429 incident), `fees/build-payment` (builds XDRs for
anyone), `lifi/status` (unthrottled LI.FI proxy; its sibling `statuses` IS
limited), `portfolio/activity` (the old activity system, fully open). No fund
movement — quota-burn and probing surface. Scheduled into the withAuth sweep,
DeFindex pair first. Sev 2 · Lik 2 · Eff 1-2.


## #50 — CLOSED 2026-08-07 (withAuth sweep)

All 37 authed route files migrated onto withAuth (40+ handlers; three shapes:
standard, edge-config composition, custom pair). The naked routes got auth +
per-user rate limits; six client fetch sites gained auth headers. TWO MORE
found during the sweep: `lifi/statuses` (flagged by the new conformance test
on its first run) and `referral/user` POST (fully unauthenticated DB write,
hidden behind an authed sibling handler in the same file). Permanent guard:
`route-auth-conformance.test.ts` — every route must be wrapped or allowlisted
with a written reason; runs in CI. 94/94 tests green.
