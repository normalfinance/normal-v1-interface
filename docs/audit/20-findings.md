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
| 36 | 27 | Failed/abandoned swaps & deposits leave NO server record | integrity | 3·4·3 | code | **FIXED 2026-08-10**: records inside the execute-pair funnel (see §#27 below, doc 58) | ✅ |
| 32 | 19 | All 35 authed routes verify session live with NO timeout | reliability | 4·2·2 | code | timeout wrapper + cached verification | ✅ |
| **48** | 16 | Dedupe failure: `wallet-info.ts` has no single-flight guard → cache stampede (~22 calls/session) | perf/cost | 2·4·**1** | **ROOT CAUSE FOUND** | add in-flight promise; unify with the SWR path | ✅ |
| 30 | 30 | Turbo declares 57 env vars, ~55 read-but-undeclared → stale cached builds | hygiene | 3·2·1 | code | declare full list; verify Vercel cache invalidation | ✅ |
| 27 | 26 | Fee-first: fee signed before swap → fee lost if swap fails | correctness | 3·3·3 | code | **FIXED 2026-08-10**: sign-both-first + server escrow (see §#26 below, doc 55) | ✅ |
| 25 | P0-1 | **[STRATEGIC]** Per-client fetching 7–30× over free tiers → the Layer-1 cache re-architecture | cost | 5·5·5 | math | **COMPLETE 2026-08-12**: last browser-direct paths (swap/send BTC+ETH+SOL) now selectors over the shared aggregate (§P0-1 below, doc 66) | ✅ |
| 24 | 28 | Savings has no XLM-fee preflight → mid-flow failure (June TODO) | UX/correctness | 2·3·2 | code | preflight XLM balance, warn upfront | ✅ |
| **32** | 29 | ETH/SOL send: hardcoded 21000 gas breaks contract destinations; lost response can cause **double send** | correctness | **4**·2·2 | code | **FIXED 2026-08-12**: estimateGas + server funnel + one-unknown-at-a-time guard (§#29 below, doc 60) | ✅ |
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

## #51 — Intermittent passkey NotAllowedError on savings (FIXED 2026-08-07)

The long-watched tester report ("operation either timed out or was not
allowed", cleared by retry) diagnosed and fixed. Cause: savings deposit/
withdraw run TWO WebAuthn ceremonies back-to-back (fee payment, then vault
op); browsers — Chrome + Windows Hello especially — instantly reject a
ceremony that starts during the previous native dialog's teardown or while
another request is pending. NOT a timeout (stamper allows 5 min); the failure
is instant and no prompt is shown, which is why retrying always worked.

Fix: `lib/turnkey/webauthn-guard.ts` — (1) all our ceremonies serialize
through a queue, (2) 350ms settle delay between successive prompts, (3) ONE
silent retry only when the failure was fast (<2s = no human saw a dialog); a
slow failure means the user cancelled, and re-prompting after a deliberate
cancel is hostile. Surviving errors rethrow with a human message + original
as `cause`. Wired into stellar-signer (all Stellar passkey signing: savings,
swap fees, MGI, CCTP burns) and evm-signer (CCTP pivot). 6-case unit suite,
incl. the no-overlap and no-retry-after-cancel invariants. Send adapters can
adopt in a follow-up line each — single-ceremony flows, lower exposure.

## #52 — Rapid savings actions stick a wrong "Your Deposits" (FIXED 2026-08-07)

Observed live: fast deposit/withdraw cycles left totalDeposited missing one
action, with the difference displayed as earnings (+14.46%), stuck for
minutes. Mechanism: each action launches a fresh position read; network
reordering let a read STARTED BEFORE action N resolve AFTER it. Pre-action
data carries a genuinely-lower value — not the indexer-lag shape the
reconciler forgives — so it was accepted AND persisted to the position cache,
poisoning `prev` for every later reconcile until DeFindex's indexer caught up.
(The server events cache was checked and cleared — refresh=1 bypasses it.)

Fix: `lib/savings-read-guard.ts` — deposits/withdraws bump a per-address
epoch BEFORE announcing; every position read snapshots the epoch at start and
throws StaleSavingsReadError at resolve-time if it moved — before
reconciliation, before any cache write. SWR's retry then refetches under the
current epoch. Fourth instance of the "timer/ordering standing in for a real
signal" root cause. 4-case unit suite, incl. per-address isolation.

## #53 — Savings chart is a rescaled simulation, not recorded history (OPEN)

The earnings curve replays deposit/withdraw events, simulates compound
interest at the CURRENT APY, and rescales the whole curve so the endpoint
equals real current earnings. Consequences observed after heavy testing
(2026-08-07): the "past" redraws when new transactions change the inputs, and
the 50-row activity feed cap lets test spam crowd out older events —
shrinking the simulated total, inflating the anchor-rescale multiplier, and
exaggerating the recent slope ~3x vs true accrual (~1.1 c/day shown vs ~0.34
c/day real at $20 / 6.17%). Not a money bug — the anchor value is real.

Fix path: plot RECORDED earnings snapshots once roadmap #27 (durable server
records) lands; interim option: label the curve "estimated". Sev 2 · Lik 3 ·
Eff 2 (proper) / 1 (interim label).

## #43 — CLOSED 2026-08-07 (cleanup batch)

Dead wallet types removed everywhere they lived: the `walletType` union
(types/state/wallet.ts), TWO user-facing onboarding strings that still
advertised "Freighter, Ledger, xBull, Lobstr" — a wallet the picker does not
offer — the mgi preflight probes collecting diagnostics from unconnectable
extensions, and stale comments. Behavior change: none (a legacy persisted
'xbull'/'hana' value already failed restore and disconnected; it still does).
The OP_RETURN report to Turnkey is drafted paste-ready in
[54-turnkey-op-return-report.md](54-turnkey-op-return-report.md) — sending it
is a user action. #42 repro remains scheduled with the user.

## #54 — WalletConnect "request already pending" breaks the second signature (FIXED 2026-08-07)

Hit LIVE on mainnet by a Lobstr user mid savings-deposit: fee signature
succeeded (fee charged, tx c51cdd7…), then the immediately-following deposit
signature bounced off WalletConnect's one-open-request rule — "A request is
already pending." Result: fee paid, deposit never executed. Pre-existing on
mainnet for weeks; the WalletConnect TWIN of #51, whose fix I explicitly
scoped to Turnkey signing only ("external wallets lower exposure") — that
scoping was wrong and this incident is the proof.

Fix: `lib/wallet-kit-guard.ts` — queue (one wallet request in flight), 750ms
settle between requests, ONE retry on the pending bounce (safe: a bounced
request was never queued, retrying cannot double-sign), and a surviving jam
rethrows with instructions (open wallet app / approve or dismiss / or
disconnect-reconnect) instead of jargon. Wired into BOTH external-signing
funnels: signOrReconnect (savings/swap/send/trustline) and
signXDRWithWalletKit (MGI). User rejections and session errors pass through
untouched so the reconnect UX keeps working. 5-case suite. NOTE: needs live
confirmation by the affected coworker (back-to-back deposits).

**Escalates #26 (fee-first):** this is the first real casualty — fee charged,
service not delivered. The restructure (charge fee only after the main
transaction succeeds, or bundle) moves up Block E.

Funds: never at risk — signing was the only thing jammed, only in-session;
stuck WalletConnect requests expire in minutes and disconnect/reconnect
always clears them.

## #26 — Fee ordering: FIXED 2026-08-10 (sign-both-first + server escrow)

The structural fix for the whole failure family (#54 was the live casualty):
no flow submits ANYTHING until both signatures exist. Deposit, withdraw and
swap now build the service tx first, chain the fee tx one sequence number
behind it (fee builder gained `sourceSequence` + a 15-min window), collect
both signatures, and hand the signed pair to `/api/fees/execute-pair` —
which escrows the signed fee in Redis BEFORE submitting, then submits
service → fee. A cron sweeper (`/api/cron/fee-escrow-sweep`, every 2 min)
finishes any pair whose route/tab/network died, idempotently (hash-probe
before every submit). Stellar sequence numbers carry the safety: the fee
cannot apply unless the service applied, and a user retry reuses the same
sequences so the old pair dies with `tx_bad_seq` — double-charge impossible.

Consequences: rejection at either prompt = nothing happened, nothing charged
(v1's "accept and measure leakage" was rejected — rightly); the withdraw
latent bug (commission failure threw BEFORE the log call, so completed
withdrawals could go unrecorded) is structurally gone — log always fires
with both hashes; the residual loss case shrinks to "our infra down 15+ min
right after a success" and is logged loudly as `[fee-escrow] RECEIVABLE`.
Design: [55-fee-ordering-plan.md](55-fee-ordering-plan.md). 12-case test
suite (escrow state machine + sequence chaining). Staging matrix in doc 55.

## #55 — "Your Deposits" stuck wrong after rapid withdraw→deposit (FIXED 2026-08-10)

Reproduced live by Niko on mainnet, proven to the 7th decimal: deposit 4.975
(14:25), withdraw 6.000 (14:28:50), deposit 4.975 (14:29:19). Correct total
23.4301934; screen showed 18.4551934 = 19.4801934 + 4.975 − 6.000 — the
world AFTER the withdraw, BEFORE the last deposit. The missing 4.975
displayed as fake earnings (5.2542851 = 23.7094785 − 18.4551934) because
earnings = live currentValue − stale totalDeposited.

MECHANISM: the post-action `refresh=1` read refetches DeFindex's event
history, whose indexer runs 30-120s behind the chain. Fired seconds after a
transaction it captures a HALF-INDEXED history — and the route then cached
that snapshot for 300s, locking the wrong figure. #52's epoch guard cannot
catch it: the read STARTS after the action; the SOURCE is what's stale.
Sixth instance of the "snapshot/heuristic standing in for a real signal"
root cause. Bitter detail: the correct answer sat in our own vault_deposits
rows (txHash + amount, written within ~1s of success) the whole time — the
route only used them as a fallback when events returned nothing.

FIX (signal-based, no timers): `server/savings-deposits.ts`
`reconcileTotalDeposited` — events total + deltas of our own recent rows
whose txHash the indexer hasn't included yet; the moment the event appears,
the hash matches and the row steps aside. Correct at every instant, immune
to indexer/cache staleness, converges automatically. Events cache v2 stores
{total, txIds} (bare-number legacy key orphaned). log-transaction now
deletes the position cache + refresh floor on write — the row IS the
invalidation signal, so rapid back-to-back actions can't be served a
pre-action snapshot. Also corrected a false comment (live-verified:
withdraw event amounts ARE USDC, not shares). 9-case suite incl. the exact
incident as a regression test (137 total).

## #27 — Record-before-broadcast (FIXED 2026-08-10, branch fix/tx-server-records)

Every Stellar money flow (swap, savings deposit, savings withdraw — including
the zero-commission withdraw, which was the last flow submitted straight from
the browser) now writes its DB row with status 'pending' INSIDE
/api/fees/execute-pair BEFORE anything is broadcast, and the row is settled
to a truthful terminal state (confirmed / failed / abandoned) by three
idempotent actors: the route itself, the fee-escrow sweeper (terminal pair
outcomes mirror onto the row), and a new reconciler step in the same 2-min
cron that probes stuck rows on Horizon by tx hash. Terminal states are never
overwritten. Fee-leg-only failures (expired/fee_failed escrow) CONFIRM the
record with a reason note — the user's action did happen.

Client fire-and-forget logging is GONE from all three flows; the server
cross-checks record.feeAmount against the fee tx's actual payment amount, so
a record cannot lie about the fee. The legacy log-transaction routes stay
one release for in-flight old bundles (rows default 'confirmed'), then die.

Readers filtered to confirmed-only (verified inventory): both activity
routes, Dune prisma-sync (5 queries), and the #55 user-position reconciler
(query + defense-in-depth in the pure fn). Schema: additive-only SQL applied
by Niko in Supabase (status/statusReason/network + 4 indexes) — deploy
ORDER matters: SQL first, code second.

Design doc 58; 12 new tests (149 total). Unlocks #53 (chart from recorded
history) and lays the record-before-broadcast rail #29's ETH double-send
fix rides next.

## #29 — ETH/SOL send safety (FIXED 2026-08-12, branch fix/send-safety)

The last known silent-loss path. Two defects, both live-verified in code:
hardcoded `gas: 21000n` made any send to a CONTRACT destination (exchange
deposit contracts, smart wallets) revert with the fee burned; and a lost
response after node acceptance showed "failed" while the send was live — a
retry read a FRESH pending nonce (ETH) / new blockhash (SOL), producing a
second valid transaction: double send, with no server record to even notice.

FIX (doc 60): (1) `estimateGas` before signing — contracts get real gas,
estimation-reverts block the send BEFORE any fee with an actionable message;
plus an honest amount+fee>balance preflight. (2) New `send_logs` table +
`/api/send/execute`: the client still signs with the passkey (custody
unchanged), the server decodes the SIGNED tx, cross-checks claimed
amount/destination against it, verifies the embedded sender is the user's
turnkey wallet, writes the row (with pre-computed tx hash + EVM nonce)
BEFORE broadcasting — then relays, like broadcast-btc always did. (3) The
structural double-send guard: any non-terminal send on that wallet+chain →
409 "still confirming"; the #27 cron reconciler settles unknowns from the
chain (EVM receipts / SOL signature status; abandon windows 30/10 min) which
releases the guard. Broadcast-error classifier is deliberately conservative:
only definitive rejections mark 'failed'; "already known" counts as
ACCEPTED; ambiguity stays 'unknown' so a live tx is never labeled failed.
Carve-in: LI.FI EVM leg estimates gas if a quote ever omits gasLimit.
9 new tests (158 total). Wave 3 money-correctness: COMPLETE.

## #62 — Balance freshness after sends & swaps (FIXED 2026-08-12, branch fix/balance-freshness)

Niko's live findings: a finished SOL send left the balance stale for "a few
refreshes", and a finished LI.FI swap briefly looked like lost funds. Root
cause: the 7th instance of timer-instead-of-signal — the 0s/+8s/+45s refresh
shots race the chain, and the 0s shot poisons the server bypass floor so the
+8s shot serves stale cache; the LI.FI engine never refetched the
DESTINATION chain on completion (CCTP's finish() did — same prop, unused).

Three fixes, two of them Niko's design corrections:
1. **"Done" gated on arrival** (his rule): lifi-tracker awaits a new
   onArrival handler (engine refetches the destination chain,
   Promise.race-capped at 10s so a refetch hiccup can't make a SUCCESSFUL
   swap look stuck) BEFORE the stage flips to done. Deliberately NOT a
   before/after balance comparison (slippage/fees/concurrent activity lie).
2. **Confirmation-driven refresh for sends**: lib/send-confirmation.ts polls
   the chain DIRECTLY (public RPC, no server cache/floor; ETH receipt 5s×18,
   SOL sig status 2s×30) and fires ONE chain-scoped refresh
   (announceConfirmation) at the exact moment the chain guarantees a fresh
   balance read. Timer shots kept for XLM/BTC + feeds. Success copy now says
   exchanges credit on their own schedule (the Coinbase question, answered
   permanently — on-chain delivery is visible, exchange ledgers are not).
3. **Spendable = balance − pending outflows** (his second catch: send SOL →
   MAX-swap would offer money already gone): lib/spendable.ts derives a pure
   adjustment from the pending-sends ledger + a lifi-tracker in-flight
   registry — NO optimistic store writes (the #52/#55 disease). Wired into
   send-modal spendableBalance and swap-card fromBalance (one line covers
   every engine). CCTP source legs excluded, documented (chain rejection +
   #29 preflight remain the backstop).

13 tests (171 total). No schema, no routes, no cron changes. Doc 62.

### #62 follow-up (same day, Niko's live retest)
1. **Swap row stuck "pending" until manual refresh** — /api/lifi/statuses
   caches PENDING for 30s, so the feed refresh fired at delivery was served
   the stale cache. Fix: session-local status override
   (lib/lifi/status-overrides.ts) — the tracker registers DONE/REFUNDED/
   FAILED before firing the feed refresh; use-user-activity prefers it over
   the server answer. Other tabs converge within the 30s TTL.
2. **409 "previous send still confirming" after a CONFIRMED send** — the #29
   guard only unblocked via the cron reconciler (~2 min on Vercel, NEVER on
   localhost). Fix: probeAndSettleUnsettledSend — the execute route probes
   the chain inline when the guard trips; a confirmed/failed earlier send
   settles on the spot and the new send proceeds; only a genuinely-unknown
   outcome still blocks. 3 more tests (174 total).

## Capacity quick-wins batch (2026-08-12, branch chore/capacity-quickwins, doc 64)

- **#19 — CORRECTION: was already fixed.** Recon for this batch found
  `getAuthenticatedUser` already cached (30s TTL + 5s negative), in-flight
  deduplicated, digest-keyed, size-capped, AND timeout-raced — implemented
  during the withAuth sweep. Register row stands corrected; no new code.
- **#13 — FIXED**: `skipTrailingSlashRedirect: true` next to the existing
  `trailingSlash: true`. Every `/api` fetch (clients call slash-less, config
  canonicalizes to slashed) paid a 308 + second round trip — now served
  directly. Internal page links still generate slashed URLs (canonical
  behavior unchanged); externally-typed slash-less page URLs now serve
  content instead of redirecting (accepted residual). Verified EMPIRICALLY:
  prod-server curl matrix — API 200 on both forms, no 308.
- **Cron heartbeat — NEW**: `server/cron-heartbeat.ts`; all 3 cron routes
  stamp `cron:heartbeat:<name>` in Redis (7d TTL) + echo it in their JSON.
  Silent cron death is now a 5-second Upstash lookup.
- **RPC fallback for send probes — NEW**: probes try the configured RPC
  then a public fallback (deduped). Also fixed a latent probe bug: the EVM
  probe swallowed TRANSPORT errors as "not found", which could have let a
  dead RPC escalate to a false 'abandoned' — transport now rethrows
  (fallback runs), only a real no-receipt answer counts as not-found.
- **#36 — FIXED**: ADMIN_SECRET bypass deleted from wallets/link
  (unreachable behind withAuth; dead security code invites a future
  "fix" into a live backdoor). Stale mention scrubbed from with-auth.ts.
  Niko: delete ADMIN_SECRET from Vercel env.
- **#31 — FIXED**: Onramper config + NEXT_PUBLIC_ONRAMPER_API_KEY +
  utils/checkout.ts deleted (only caller was a commented line). Niko:
  delete the env var from Vercel.
- **#18 — FIXED**: Statuspage loader deleted (ExternalProvider removed from
  the layout tree; module removed from @normalfinance/utils). No more
  2×/min polling for a status account nobody owns.
- **Rider (Niko's console review):** the layout's font link used the raw-HTML
  media="print"+string-onLoad async trick — React never attaches string
  handlers (the repeated dev warning) so it was dead weight; replaced with a
  plain stylesheet link (display=swap already covers no-invisible-text).
- **#34 (separate staging DB): DECLINED by Niko 2026-08-12** — staging stays
  on the production database by his decision; Phase 5 load-testing scope
  must avoid prod-data writes accordingly.

## P0-1 — Layer-1 cache COMPLETE (2026-08-12, branch feat/layer1-cache, doc 66)

The [STRATEGIC] "mandatory between 1k and 10k" item. Recon showed Layer-1
mostly existed (/api/wallet/portfolio aggregator + useWalletBalances shared
SWR — the portfolio page already rode it); the remaining browser-direct gap
was the three per-chain hooks used by swap-card/send-modal: BTC hit
mempool.space and ETH/SOL hit public JSON-RPC from every user's browser on
every mount. Those hooks are now thin selectors over the shared aggregate
(same exported interfaces, zero behavior change for consumers; pure
PortfolioAsset→Token mapper, tested). Cost/rate-limit exposure now scales
with the cache window, not with open views × users.

Kept browser-direct on purpose (action-time exceptions, documented):
fetchEthBalance/fetchSolBalance (off-ramp preflight), RPC URL exports
(tx-confirmation probing), mempool fee quote (send-modal).

LATENT BUG FIXED: swap-card's refetchChain — awaited by the #62 arrival
gate before showing "Done" — called refetch() (Turnkey ADDRESSES), not a
balance refresh. Now calls refetchBalance = the new awaitable
refreshFresh() (server-cache-bypassing shared revalidation), so "Done
waits for real balances" is finally true end to end.

4 new tests (178 total). No routes, no schema, no crons.

### P0-1 follow-up (2026-08-13, Niko's live retest — the drawer SOL lag)
After ETH→SOL "Done", the account drawer showed the old SOL for a few
seconds. Mechanism: the arrival refresh can fire before the server's SOL
RPC reflects the just-delivered funds → under P0-1 that pre-delivery answer
gets CACHED (15s response cache; the 5s bypass floor blocks immediate
retries) → every surface shows it until the next poll. It looked fixed
before P0-1 only because the old drawer hook re-fetched browser-direct on
every mount — luck subsidized by the per-view fetching P0-1 removed. Fix:
verify-and-retry in refetchChain — refresh, and if the destination balance
didn't move, wait past the floor (5.6s) and refresh ONCE more before the
tracker shows Done (arrival cap 10s→15s). refreshFresh now returns the
fresh assets to make the verification possible.

### P0-1 follow-up 2 (2026-08-13, Niko's live retest — send form wiped itself)
Typing an amount (or MAX) in the send dialog snapped back to 0. Mechanism:
the old hooks held the token in React STATE (stable object identity); the
P0-1 selectors rebuilt the Token object EVERY render → the send modal's
open-reset effect (which had the token list as a dependency) saw a "new"
list on every keystroke's render and wiped the form. Two fixes: (1) the
selector hooks memoize the token on the underlying aggregate row — stable
identity between data updates; (2) the modal's reset now fires ONLY on
open (list read via ref), with a separate sync effect that updates the
SELECTED token's row on balance refreshes without touching typed input.
Lesson recorded: replacing fetch-into-state with derive-per-render changes
object identity semantics — every consumer watching identity must be
audited, not assumed.

### P0-1 follow-up 3 (2026-08-13, Niko — fiat toggle vs Available readout)
In the send dialog's fiat mode, "Available" stayed in token units — typing
dollars against an ETH readout gives no way to know what fits (and a
manually typed amount can exceed by fractions of a cent). Audit of all
three fiat-toggle surfaces: send-modal FIXED (Available follows the
toggle, using the SAME ROUND_DOWN-to-cents as the MAX fill so typing the
shown number always passes validation); swap-card already correct
(fCurrency in fiat mode); withdraw-card shows both units simultaneously —
no bug.

### P0-1 follow-up 4 (2026-08-13, Niko — sell Max + double-count + sell modal)
1. Sell "Max" ~$20 vs $25.65 balance: NOT our code — the Max lives on
   COINBASE's hosted page; they keep back their own (generous, ~$4-6 at L1
   rates) Ethereum gas reserve. Our balance math was right ($30 − $5 − fee).
   Our preflight does the equivalent reserve on our side by design.
2. The question exposed a REAL adjacent gap in the #62 spendable ledger:
   after chain confirmation, the balance reflects the send but the pending
   row only clears when Etherscan indexes into the feed (minutes) — our
   send/swap MAX double-subtracted during that window. Fix:
   markSendConfirmed(txHash) from the confirmation watcher; spendable skips
   confirmed rows after a 2.5s grace (covers the bypassed refresh landing);
   the row keeps feeding the activity badge until reconciled. +1 test (179).
3. Sell modal: asset icon + amount now shown in the send-dialog's visual
   language with the dollar equivalent.

### P0-1 follow-up 4 CORRECTION + follow-up 5 (2026-08-13)
CORRECTION to follow-up 4: the ~$20 sell "Max" was OURS, not Coinbase's —
the OffRampDialog amount step (offramp-dialog.tsx) computes
sellMax = balance − reserve (ETH reserve 0.001) and PRESETS it into
Coinbase. I answered from the wrong modal (the post-Coinbase fulfillment
dialog); Niko's screenshot showed the pre-Coinbase amount step. The
double-count fix from follow-up 4 stands on its own merit.
Follow-up 5: that amount step restyled into the house language (labeled
box, mono amount, black CTA) with a $/token toggle — unit-following
Available line, Max fill, and validation all share the same floor-rounding
(the doc-67 rule); fiat→crypto conversion clamps to sellMax so rounding
can never overshoot the reserve. assetPrice wired from both callers.

### P0-1 follow-up 6 (2026-08-13, Niko's UX call — transparent sell fees)
The sell amount step no longer hides the reserve inside a smaller Max.
Now: header shows the FULL balance; a fee-breakdown box above the CTA
shows Balance → "Kept for the network fee" (live per asset: BTC mempool
rate, XLM Horizon reserve, ETH/SOL static, USDC none) → "Max you can
sell", plus the Coinbase-fees expectation line. While the async reserves
resolve, the CTA shows "Calculating fees…" (spinner) and Max is disabled —
no fallback number the breakdown would contradict. All values unit-follow
the $/token toggle with the shared floor-rounding. Also fixed the $ prefix
typography (generic 'monospace' fallback rendered it slanted/oversized —
now the exact send-dialog input pattern, Geist Mono digits, same-size sans $).

## Wave-4 reliability (2026-08-13, branch chore/wave4-reliability, doc 68)

- **#8 FIXED**: relayer rode viem's DEFAULT public RPCs in 4 places
  (mint, receipt check, gas top-up, shortfall calc). relayerTransport()
  uses CCTP_RPC_URL_BASE / CCTP_RPC_URL_ETHEREUM when set, public default
  as fallback — deploy-order free. Niko: set the two env vars in Vercel.
- **#24 FIXED**: off-ramp fills (the "we owe Coinbase a send for sale X"
  memory) moved from localStorage to the new offramp_fills table +
  /api/offramp/fills (withAuth, session-keyed; GET/POST upsert/DELETE
  release — fills with a real txHash are permanent, only unfulfilled
  claims deletable). Both consumers rewired (sell modal via a hydrated
  module cache so call sites stayed sync; activity hook fetches). One-time
  localStorage→DB migration preserves in-flight sales across the deploy.
  Additive SQL for Niko (doc 68). Conformance auto-covers the route.
- **#10 PREPARED (flip is Niko's, deliberately not merged)**: transaction
  pooler runbook (doc 68) + scripts/verify-pooler.mjs — read-only proof of
  the four pooler-sensitive patterns (repeat queries = the
  prepared-statement trap, transaction, 10 concurrent reads). Flip =
  DATABASE_URL swap to :6543 + pgbouncer=true&connection_limit=1 after
  ALL PASS; rollback = env revert.

1 new test surface (route under conformance), 180 total.

## #63 — LIVE CCTP swap failed at first signature: guard-scoping miss, round 3 (FIXED 2026-08-14)

Niko's ETH→USDC(Stellar) test swap (~$24.50) died instantly at the LI.FI
leg with WebAuthn "operation timed out or was not allowed", leaving an
eternal "Pending" row in the activity feed. Two distinct bugs:

**Bug 1 — the #51 guard never covered this path.** `runWebauthnCeremony`
(queue + settle + fast-fail retry) was wired into stellar-signer and
evm-signer only. The LI.FI executor (`lib/lifi/execute.ts` — the exact
signature that failed) and all three send adapters called Turnkey raw.
This is the THIRD casualty of the same scoping decision: #51 scoped to
"savings only", #54 proved external wallets needed it, now the LI.FI path.
Fix: all 6 unguarded sign sites wrapped (execute.ts ETH/SOL/BTC, send
adapters ethereum/solana/bitcoin). Every passkey ceremony in the app now
goes through the guard. Lesson recorded: a ceremony guard is
infrastructure, not a per-feature fix — partial rollouts of it keep
producing live incidents.

**Bug 2 — a pre-broadcast failure left the transfer row CREATED forever.**
The engine creates the CctpTransfer row BEFORE anything moves (correct —
that's #27's record-first rule), but its catch only set the UI error; the
row stayed CREATED, and the activity feed maps every non-terminal status
to "pending". Fix, three layers: (1) engine tracks `broadcastStarted`;
on failure with nothing broadcast it PATCHes `markFailed`; (2) the PATCH
handler accepts it ONLY while status=CREATED with no burn/src hash — once
any hash exists the client cannot bury a real transfer; (3) cron
`advancePendingTransfers` expires CREATED rows >60min old with no hashes
(cleans Niko's existing phantom, and any future one where the client died
before patching). Documented trade-off: a broadcast that succeeded but
whose hash-PATCH failed could be wrongly expired — funds unaffected
(every recipient address is the user's own; the row label is the only lie)
and it requires two independent failures.

Funds: never at risk — the failure was BEFORE any signature completed;
nothing left any wallet. Root cause of the WebAuthn error itself:
environmental (browser/authenticator rejected the ceremony instantly —
the #51 class); with the guard now in path, the same event auto-retries
once and otherwise surfaces a human message instead of a dead swap.

## #64 — CCTP progress modal spins forever at "Bridging to Stellar" after the swap SUCCEEDS (FIXED 2026-08-14)

Observed on Niko's first successful end-to-end inbound swap: the resume
banner correctly disappeared (server row = COMPLETED) while the progress
modal never left the bridging spinner, and the completed activity row
showed VALUE $0.

**Root cause 1 — auth headers frozen at swap start.** `makePatcher`
captured `buildAuthHeaders()` ONCE; a CCTP bridge runs 20-30+ minutes,
longer than the access token's remaining life, so mid-bridge every poll
started returning 401. `pollStatus` swallowed every bad response —
`data.transfer` undefined → neither target nor FAILED → sleep, loop,
forever, silently. The banner rebuilt headers on each poll, which is why
IT knew the swap was done. Fix: headers rebuilt per request (patch,
pollStatus, topUp — Supabase's client hands back the auto-refreshed
token), pollStatus now requires `res.ok` + an actual transfer object to
count a read, and 10 consecutive transfer-less reads surface an honest
"lost connection — the swap continues on our servers, check Activity"
instead of an infinite spinner.

**Root cause 2 — dstAmount was client-only.** The delivered amount was
patched by the client AFTER its poll resolved; the modal's UI explicitly
says "safe to close", so any closed tab (or root cause 1) left dstAmount
null → activity VALUE $0 forever, and the feed's delivery-dedupe (keyed
on dstAmount) let the same USDC also render as a separate Receive row.
Fix: inbound-to-USDC transfers get dstAmount written SERVER-side at the
MINT_SUBMITTED→COMPLETED transition (mint is 1:1 with the burn, the
server knows it exactly); a bounded cron backfill repairs
already-COMPLETED inbound rows with null dstAmount (fixes Niko's $0
row). Outbound stays client-written — its delivered amount comes from
the LI.FI pivot result only the client has.

Funds: unaffected throughout — the USDC was delivered; only the
reporting lied. Same family as #62 (the client's view of a finished
money movement must come from a durable signal, not from one fragile
in-page loop surviving to the end).

## #65 — Stellar mint confirmation used Soroban RPC's bounded history: month-stuck transfer (FIXED 2026-08-14)

Found while running the #63/#64 cleanup cron live: a July 17 SOL→USDC
inbound transfer sat at MINT_SUBMITTED for a MONTH. Horizon showed the
mint tx succeeded within 30 minutes of submission — the ~$11.84 USDC was
delivered on 2026-07-17; only our row never learned it.

Cause: `isStellarTxConfirmed` asks Soroban RPC (`getTransaction`), whose
history retention is roughly a day. NOT_FOUND was treated as "still
pending" — correct within the window, but once a transfer's confirmation
was missed for longer than retention (no cron on localhost during July
testing), every subsequent probe returned NOT_FOUND until the end of
time. The row was unfixable by waiting.

Fix: on RPC NOT_FOUND the checker now falls back to Horizon
(`HORIZON_URL/transactions/<hash>`, full ledger history): successful →
confirmed; failed → error; 404 → genuinely pending. Horizon unreachable →
stay pending, next tick retries. Combined with #64's server-side
dstAmount write, the next cron tick completed the July row with its true
delivered amount (verified live: COMPLETED, 11.839938 USDC).

Class note: this is the retention-window sibling of #62/#64 — an
"absence of evidence" read (cache expiry, token expiry, history expiry)
must never be interpreted as a stable fact.

## #66 — Outbound CCTP said "Done" before the asset existed in the wallet (FIXED 2026-08-14)

Niko's USDC→SOL test: modal reached Done, but the SOL was invisible for a
while — the #62 disease on the CCTP path. Two gaps vs the LI.FI engine's
arrival gate:

1. `executePivotSwap` returns when the pivot tx confirms ON BASE — but the
   bridged asset lands on the TARGET chain later (Base→Solana ≈ 1-3 min).
   'Done' showed while the SOL existed nowhere a wallet could see.
2. `finish()` set stage 'done' FIRST and fired the balance refetch
   fire-and-forget — even delivered funds raced the modal and lost.

Fix (mirrors #62's tracker):
- New visible 'delivering' stage for outbound ETH/SOL: polls
  /api/lifi/status (fresh auth headers per poll — #64's lesson) until the
  bridge reports DONE. FAILED/REFUNDED → honest error (USDC is at the
  user's own Base address). ~10-min timeout → snackbar "on its way"
  and proceed (documented trade-off, Niko's #62 rule: a successful swap
  must never look stuck). dstAmount is now patched only after delivery.
- `finish()` awaits the delivered side's refetch BEFORE flipping to
  'done', capped at ARRIVAL_CAP_MS=15s (same constant as #62): outbound
  awaits swap-card's verify-and-retry refetchChain; inbound awaits the
  Stellar token-store refresh. BTC exempt (many-minute delivery; snackbar
  + activity pending badge own that wait — holding the modal open would
  itself look stuck).

9th instance of the fire-and-forget-refresh-races-the-UI root cause.

**#66 follow-up (same day, Niko's retest):** the retest passed, but the
resume banner above the swap card ("Completing automatically") kept
spinning ~30s after the modal said Done. The banner refreshed only on
mount + a 30s interval; the engine's finish() already dispatches
nf:activity-updated at the exact settle moment, but the banner never
subscribed. Fix: banner now listens for that event and re-reads
immediately — it clears the instant the modal completes. (Timer-instead-
of-signal, again — the event existed; the consumer just didn't listen.)

**#66 follow-up 2 (Niko caught it — incomplete consumer sweep, again):**
watching an in-flight swap from the swap-DETAILS popup (activity row
click): the swap completed, banner cleared instantly (the event fix
worked), but the popup's "Circle attestation" spinner spun forever — it
fetched the transfer ONCE on open, a snapshot pretending to be a live
view. Fix: while the dialog is open and the transfer is non-terminal it
re-reads every 8s (noAdvance fast reads; the banner poke + cron still
drive the machine), stops at COMPLETED/FAILED/REFUNDED, and a transient
read failure never clobbers shown content. Lesson repeated from #47:
when a state has N surfaces, sweep ALL N — this session alone the same
transfer state had FOUR surfaces (progress modal, banner, feed row,
details popup) and each stale one was found by Niko, one at a time.

## #67 — XLM savings guard + fee semaphore (FIXED 2026-08-14, branch fix/xlm-savings-guard)

Niko's requirement: "user never sends out all XLM unless savings don't
work." Verified holes: the 1 XLM MAX buffer keyed on the trustline proxy
(wrong people) and was MAX-only (typing bypassed it); XLM swaps had NO
reserve at all — not even the network minimum, so a true MAX XLM swap
failed on-chain for everyone (latent bug found during this work).

Fix: `spendableXlmForOutflow(balance, subentries, hasActiveSavings)` —
ONE helper feeding send MAX, send typed validation, swap balance/MAX and
the Soroswap engine (whose ad-hoc "−1 XLM" was deleted: double-count).
Trigger = real savings position (shared deduped read), trustline proxy
kept only as MAX's conservative fallback while the position loads.
Decisions locked by Niko: NO override (withdrawing all savings lifts the
guard automatically), buffer stays 1 XLM. Execution-time check in
use-send-token deliberately stays network-only (op_underfunded guard; a
stale position cache must not reject a UI-approved send).

Semaphore: `xlmFeeStatus` → ok/low/blocked from the SAME constants as
the guard and the savings action-block (0.5 / 1.0), always visible on
the savings card (green one-liner; amber/red banner with live number +
3 one-tap fixes incl. /swap?from=USDC deep link) + new "Network fees
(XLM)" explainer card on the savings page. Catches what the guard can't
prevent: external-wallet spending outside the app, fee spikes, pre-guard
drained users. 11 unit tests (boundaries + guard-keeps-green invariant),
191 total. Client-only, no schema/routes/cron. Docs 70 (plan) + 71
(explainer).

## #32 chunk 1 — wallet-slot protection + #42 structural fix (SHIPPED 2026-08-15, branch feat/external-wallet-cctp)

Foundation for dual-wallet support (design: doc 72). Two automatic
slot-writers existed, both correct in a one-wallet world, both
wallet-SWITCHERS in a two-wallet world:

1. The Turnkey self-heal connected the Turnkey Stellar wallet whenever
   the slot was empty — but "empty" also describes an external-wallet
   user who chose to disconnect (finding #42's silent switch). Fix: a
   persisted `lastWalletType` breadcrumb (written on every connect —
   all connect paths verified to funnel through persistStore.connectWallet
   — and deliberately surviving disconnect). Self-heal now runs only when
   the breadcrumb is 'normal-wallet' or ABSENT (fresh device = today's
   new-device login, unchanged); an explicit external breadcrumb means
   "disconnected by choice" → no restore. #42 closed structurally.
2. ChainSetupDialog's stellar branch adopted the new wallet into the slot
   unconditionally. Now: adopt only when the slot is EMPTY (signup /
   onboarding — behavior unchanged there); with an external wallet
   connected, the new Turnkey wallet is linked as a COMPANION and the
   user's chosen wallet stays put.

Decision logic extracted pure (`lib/wallet-slot.ts`) with the doc-72
invariants as named tests (I1 no-steal, I2/I7 external-stays-silent,
I5 signup-adopts, I6 new-device-login-restores). Migration: additive
store field; existing users have no breadcrumb → exact today-behavior
until their next connect. 6 tests (197 total). NOTE: the onboarding
wizard's own create-wallet path still adopts unconditionally — it is
only reachable with an empty slot today except via the drawer's "+"
button, which chunk 3 redesigns; tracked there.

## #32 chunk 2 — companion read model + dual-wallet drawer (SHIPPED 2026-08-15)

The account's wallets now COEXIST on screen (doc 72 §4f-0, Niko's
no-picker model):

- **Server**: /api/wallet/portfolio returns `companionStellar` — the
  Turnkey wallet's XLM/USDC — whenever the connected wallet is external
  (param address ≠ DB stellarAddress). One extra Horizon call via the new
  `aggregateStellarOnly` (shared cached spot prices); rides the existing
  15s response cache; deliberately outside the stale-snapshot machinery
  (fails to empty, self-heals next cycle).
- **Drawer**: dual SPLIT sections — "Normal wallet" (companion XLM/USDC +
  BTC/ETH/SOL) and "Connected wallet" (the external wallet's tokens),
  each with its shortened address; numbers never summed across wallets
  in the lists (the #55 lesson), while the Total-balance row sums the
  whole account. Header gains a labeled "Normal" Stellar address row
  (previously the companion address was invisible — finding #40's core).
  Zero-balance/unactivated companions are NOT shown — the guided flow
  (chunk 3) introduces them properly; single-wallet users see today's
  drawer pixel-identical.
- **Unlink guard**: the settings page offered to unlink the Turnkey
  wallet (observed live 2026-08-15 with all funds on it). Server now
  refuses (400) and the card shows a "Normal wallet" badge with the
  disconnect button replaced by an explanation. Defense in both layers.

197 tests, build clean. Chunks remaining: 3 (guided setup dialog),
4 (engine wiring), 5 (polish).

## #32 chunk 3 — guided Normal-wallet setup (SHIPPED 2026-08-15)

The external-user path to cross-chain swaps, per Niko's UX directive
(doc 72 §3; junior explainer: doc 73). Signup/onboarding untouched.

- **NormalWalletSetupDialog**: opened by the swap gate CTA (now
  "Continue with your Normal wallet" instead of a dead button). Four
  steps — create (passkey) → activate (default 4 XLM from the external
  wallet, editable) → USDC trustline (passkey; the universal signer
  routes by the tx's SOURCE account, so the companion's trustline signs
  with the passkey while the sends sign in the external wallet) → fund
  (pre-filled with the typed swap amount). RESUMABLE BY CONSTRUCTION:
  the step is derived from chain+DB state on every open
  (deriveSetupStep, pure, 6 named kill-the-tab tests), never remembered.
- **Drawer**: "+" becomes "Connect external wallet" for users who
  already have a Normal wallet (opens the kit picker directly); wizard
  only for wallet-less users. ⟳ renamed "All wallets".
- **Chunk-1 leftover closed**: the wizard's create-wallet path now uses
  the same no-steal guard (adopt only into an empty slot) — the last
  automatic slot-writer is guarded.
- **Component test evolved, invariant intact**: the "twice-lost
  decision" suite now asserts the CTA opens the DIALOG (marker mock) and
  the engines stay enabled:false — external users still cannot reach
  engine signing (that unlock is chunk 4).

203 tests, build clean. Note for testers: until chunk 4, completing the
dialog leaves the swap still gated — the engines are wired next.

**#32 chunk 3 follow-up (Niko's live test, 2026-08-15):** connecting the
empty Lobstr made the Normal wallet's XLM/USDC vanish from the PORTFOLIO
PAGE (hero $1.86, chain assets only) and auto-popped "Set up Normal
Savings" for the unactivated Lobstr account — while the drawer (chunk 2)
showed everything correctly. Root cause: the page surfaces read only the
slot wallet's Stellar assets, contradicting doc 72 §4f ("the portfolio
page is the ACCOUNT-WIDE total-wealth view"). Fixes: (1) usePortfolio
folds companionStellar into positions/totals as rows labeled
"· Normal wallet" — no number pretends to be spendable by the connected
wallet; (2) the savings setup dialog no longer AUTO-opens for an
external wallet when the account already owns a Normal wallet (manual
setup unchanged). Remaining slot-reading surfaces (savings position
display across two Stellar wallets, swap balances) are chunk 4/5 scope
as planned.

**#32 field fix round 2 (same day):** the first fix landed in
usePortfolio's `positions`/`walletUsd` — fields NEITHER page hero reads.
The portfolio page hand-rolls its list from `getAsset()` and the home
hero reads `walletPositions`: the register's oldest root cause ("two
sources for the same number") struck again. Proper fix: `walletPositions`
now IS account-wide (slot + labeled companion rows, `companion:` ids),
the portfolio page's walletTokens appends companion tokens (distinct
`__companion_*__` contracts for row identity), and the home hero labels
companion rows "XLM · Normal". Totals include the companion everywhere.

**#32 field fix round 3 (Niko: savings missing + unclear ownership):**
two more slot-readers converted to the account view. (1) Savings: the
shared hook now ALSO reads the companion Normal wallet's position when
the slot is external — exposed as `companionValue`/`companionPosition`,
STRICTLY display-time (deposit/withdraw math stays scoped to the
connected wallet so limits/commissions can never mix wallets). Folded
into: portfolio savings number, drawer savings row, savings-page hero
(deposits/value/earnings), plus a savings-card banner telling a hybrid
user WHERE their savings live when the connected wallet has none.
(2) Ownership labels: on hybrid accounts EVERY asset row is labeled by
its owning wallet — slot Stellar rows carry the external wallet's name
(new `connectedWalletLabel`), BTC/ETH/SOL + companion rows carry
"Normal wallet"; the drawer's external section header now names the
wallet (Lobstr/Freighter/…). Single-wallet users see zero change.

**#32 field fix round 4 (drawer polish):** (1) broken XLM/USDC icons in
the companion section — `portfolioAssetToToken`'s fallback set
`icon: ''` (only BTC/ETH/SOL had display entries) and TokensTab's
`icon ?? fallback` doesn't catch an empty STRING; fixed both layers
(mapper now uses the shared assetDisplay names+icons — rows also gain
proper names like "USD Coin"). (2) Stacked wallet sections replaced
with WALLET TABS inside the Assets tab (Niko: stacked groups read as
one list) — pill per wallet, address shown, per-wallet token list,
"No assets in this wallet yet." empty state. Caching audit for the
companion path came back clean: one extra Horizon call riding the
existing 15s response cache + SWR 30s + localStorage first paint;
savings companion rides the same SWR family + 30s server cache.

## #32 chunk 4a — engine wiring (SHIPPED 2026-08-15)

Design: doc 72 §4h (full asset-location matrix S1-S6, decisions locked:
source picker + MAX per selected wallet, deliver-to selector, transfer-
first confirmed). 4a ships: cctp engine `stellarAddressOverride` (+
`onNeedsSetup`) — companion pinned explicitly, no silent cross-wallet
fallback; preflight ladder CTA (setup/trustline/fee-XLM each open the
guided dialog at the derived step); lowFeeXlm gate (MIN_XLM_FOR_
SAVINGS_TX, same constant as #67); deriveSetupStep low-XLM → activate-
as-top-up (+test); swap-card companion USDC balance labeled "· Normal
wallet" feeding display/validation/MAX; two-level gate (no companion =
chunk-3 CTA; companion = engines LIVE) — which also un-gates LI.FI
BTC↔ETH↔SOL for external users (4d early). Component tests: +2 (hybrid
pinned to companion; normal-wallet no override). 206 tests, build clean.
Remaining: 4b move-and-swap + source picker, 4c deliver-to selector,
4e explainer/testing wrap.

## #32 chunk 4b — source picker + inline move-and-swap (SHIPPED 2026-08-15)

Doc 72 §4h S2/S3 per Niko's decisions (user picks source; everything
visible). Swap card: source pills (Normal wallet / <external>) with
per-wallet balances — balance display, validation and MAX follow the
SELECTION; engine: `fundFromExternal` prop — CTA "Move X USDC from
<wallet> & swap" + helper, new 'funding' stage as the progress modal's
first step, move runs through useSendToken (kit-signed, #29/#54 funnels)
BEFORE the transfer row exists, and `execute` resolves only once the
moved USDC is VISIBLE on the companion (probeCompanion verify-loop —
the #62 verify-before-act rule; burn can never outrun the transfer).
Trustline preflight extended to outbound-with-funding (the move delivers
USDC to the companion). Jest: jsdom suite gained contract-faithful
stubs for the stellar-sdk/wallet-kit graphs (normal-wallet-setup,
use-send-token, cdn in the utils mock). 206 tests, build clean.
Remaining: 4c deliver-to selector, 4e wrap.

## #32 chunk 4c — inbound "Deliver to" selector (SHIPPED 2026-08-15)

Doc 72 §4h S4 + decision 2. Hybrid users get a "Deliver to: Normal
wallet / <external>" pill row on inbound cctp pairs (default Normal);
the engine's stellarAddressOverride follows the selection (mint
recipient + preflight target). External delivery is trustline-gated
inline: missing trustline → pill reads "· add trustline" → kit-signed
changeTrust on the CONNECTED wallet, then selects. jsdom stubs added
for use-trustline / use-account-status / snackbar template graphs.
206 tests, build clean. Chunk 4 functionally complete (4a/4b/4c/4d);
4e wrap remains (live matrix, doc close-out).

## #32 4e — destination-aware Stellar sends (SHIPPED 2026-08-15) + wrap

Niko's scenario ("send XLM/USDC from Normal wallet to my empty Lobstr")
exposed that the send funnel ALWAYS built a plain payment: XLM to a
never-funded address died on-chain with op_no_destination, USDC without
a destination trustline with op_no_trust — both after signing, fee
burned, raw code as the error. Fix in the ONE funnel (use-send-token, so
the send modal, guided-setup funding steps and 4b move-and-swap all
inherit it): the destination is probed BEFORE signing; XLM to a fresh
account auto-switches to createAccount (≥1 XLM enforced with a clear
message); assets to fresh/trustline-less destinations are blocked
pre-signature with instructions. Decision logic pure in
lib/stellar/send-plan.ts (+6 named scenario tests; unknown trustline
state deliberately does NOT block — the chain stays the judge).
212 tests, build clean. Doc 73 carries the full chunk-4 live test
matrix for Niko's sign-off; chunk 5 (activity labels, #40 close-out)
remains after it.

## #32 — savings wallet tabs (SHIPPED 2026-08-17, Niko's report)

Live hybrid test: the savings card showed 0.00 deposits + a setup nag —
it reads the CONNECTED wallet (empty Lobstr), and the earlier "your
savings are elsewhere" banner was swallowed by the setup state. Niko's
direction: savings can run from ANY wallet → the card gets WALLET TABS.

- savings-card: [Normal wallet | <external>] pills (hybrid only; default
  Normal — where a hybrid user's savings usually live and where actions
  are passkey-only). Position, deposit balance (companion USDC from the
  aggregate), account status, fee semaphore, setup state and signing all
  follow the TARGET tab. The obsolete banner removed.
- useDefindexSavings(targetAddress?): full engine retarget — the target
  builds (caller=target everywhere: deposit/withdraw/fee-pair routes,
  balance preflight) AND signs (universal signer routes by the tx's
  source account → passkey for the Turnkey-managed companion; the
  normalCanSign local-key check is skipped under override). userPosition
  = target's position, so withdraw commission math and the #52-style
  optimistic snapshots can never mix wallets. Optimistic cache writes go
  to the ACTING wallet's key (setCachedPosition(target)), the
  POSITION_SYNC handler now refreshes the companion's SWR too, and
  post-op refresh timers hit the companion when overridden.
- Single-wallet users: zero change (no tabs, no override, engine path
  byte-identical).

212 tests, build clean. LIVE-TEST NOTE for the matrix: deposit/withdraw
on the Normal-wallet tab while Lobstr is connected = passkey signatures;
switch to the Lobstr tab = today's kit-signed flow.

**#32 cold-load savings fix (Niko, 2026-08-17):** fresh tab showed
Savings $0.00 until a reload, and savings painted last. Root cause = the
register's OLDEST root cause, 5th occurrence: the savings figure derives
from slot + companion, but every skeleton gate watched only the SLOT
position (empty Lobstr — resolves instantly) while the COMPANION read —
a cold Soroban call, 15-25s — had NO loading flag anywhere. Skeleton
dropped early → confident $0.00. Fixes: (1) `companionPositionLoading`
exposed from the shared hook (covers the address lookup AND the
position read) and included in EVERY savings loading gate — engine
positionFetching, portfolio composer status, drawer, portfolio page
firstPaint, home hero firstPaint; (2) the position localStorage cache
TTL raised 10min → 24h — stale-while-revalidate, the same treatment
every other asset gets from the portfolio cache; write-correctness
never rested on this TTL (reconciler no-clobber + #52 epoch guard
protect writes regardless of cache age). Result: cold tab paints the
last-known savings instantly and revalidates; a true first visit holds
the skeleton until BOTH positions answer. 212 tests, build clean.

**#32 cold-load savings — ACTUAL root cause (Niko, 2026-08-17, second
round):** the loading-gate fix above was correct but downstream of the
real failure. The companion address SWR fetcher used the BEST-EFFORT
`getTurnkeyWalletInfo()`, which returns `null` on any failure. On a
cold tab the first `/api/turnkey/wallet` call routinely dies (dev:
route not yet compiled blows the 10s timeout; prod: slow session
refresh) → the fetcher RESOLVED with null → SWR cached it as a real
answer ("user has no companion wallet") for the 5-min dedupe window →
no position fetch ever fired, the loading flag dropped, Savings showed
a confident $0.00 with zero failed requests in the console. Classic
error-swallowed-as-empty: a failed lookup impersonating a legitimate
"no wallet". Fixes: (1) new `getTurnkeyWalletInfoStrict()` throws
`TurnkeyWalletInfoUnavailableError` instead of degrading — the savings
fetcher now uses it, so SWR RETRIES failures (errorRetryCount 5,
revalidateOnFocus, 60s dedupe matching the module's own TTL);
(2) the companion address is seeded from the portfolio's localStorage
snapshot (`nf:portfolio:v1:*` already carries `companionStellar`) via a
new shared `lib/portfolio/client-cache.ts` module — cold-tab savings
now paint with ZERO network calls, exactly like every other asset;
(3) loading semantics switched from `isLoading` to `data === undefined`
— isLoading drops between error retries, which would flash a wrong $0
during backoff; undefined = "no answer yet", null = a real "no
companion". 7 contract tests pin the cache key format (a drift would
silently orphan every browser's cache). 219 tests, build clean.
Rule for the register: a best-effort helper that maps failure → null
must NEVER feed a cache — callers cache the lie. Strict-vs-lenient is
the callee's contract, not the caller's guess.

**#32 chunk 4f — Stellar-pair source pills (Niko GO, 2026-08-17):**
hybrid account on the swap page saw USDC/XLM balance 0.00 — the doc-72
table locked "Soroswap = active wallet" before the coexistence model
existed, so Stellar↔Stellar pairs read ONLY the slot wallet (empty
Lobstr) while the funds sat in the Normal wallet; the swap card was the
last money surface still silently slot-bound (a picker covering only
SOME engines — same family as the partial-loading-flag root cause).
Fix: the wallet pills now cover Stellar pairs. `useSwap(targetAddress)`
gained the same explicit override contract as
`useDefindexSavings(targetAddress)` — sender, fee-pair caller and BOTH
signatures follow the target; universal signer routes by tx source
account (companion → passkey, lazy kit-signer import for jsdom);
`normalCanSign` skipped under override. Soroswap engine gained
`stellarAddressOverride` + `onNeedsSetup`; account/trustline preflights
probe the SELECTED wallet, and companion gaps route to the setup dialog
(a kit cannot sign the companion's changeTrust). Default source = the
wallet that can pay (pure `defaultStellarSource`, ties → Normal wallet,
4 tests). Balance header, pills, MAX, `insufficient` and the #67 XLM
reserve (companion's OWN savings position decides the buffer) all
follow the selection via one `activeFromBalance`. Amends doc-72 §4g:
"Soroswap = active wallet" → "Soroswap = picked wallet (pills)".
223 tests, build clean.

**#74 trustline notices (Niko GO, 2026-08-17):** "tell the user about a
wallet without a trustline in different places, with an option to set
it up." Root exposure: incoming USDC to a trustline-less wallet BOUNCES
on-chain (op_no_trust) — and the receive modal, the one surface that
hands out the address, was trustline-blind. Foundation first:
`fetchAccount` (utils) swallowed EVERY error into undefined, making a
network failure indistinguishable from "account doesn't exist" — the
same failure→empty defect class as the cold-load savings bug, one layer
deeper. Added `fetchAccountStrict` (404 → null, anything else THROWS);
`useAccountStatus` now uses it, so its `error` field is trustworthy.
On top: ONE pure mapper `deriveWalletReadiness` →
checking/unknown/not-activated/no-trustline/ready (5 tests; checking
and unknown outrank the booleans because the hook resets them to false
while loading/failed), and ONE self-contained `WalletReadinessNotice`
(renders NOTHING on checking/unknown/ready; fix follows the wallet's
signer — slot wallet adds its own trustline inline via kit/normal,
companion routes to the passkey setup dialog; kind is explicit, never
crossed). Surfaces: swap page (slot + companion notices above the
grid), receive modal (USDC-bounce warning next to the QR, activation
suppressed — modal has its own), drawer (per-TAB badge so the fix
always belongs to the wallet shown + single-wallet variant),
post-connect toast (once EVER per address, localStorage; probe failure
→ silent AND not marked seen). Verified-covered, no change: settings
(AddUsdcTrustlineButton self-hides), onramp (delivery target = probed
target = fix signer), send flow, both swap engines. 228 tests.

**#74 follow-up — guided external-wallet setup dialog (Niko,
2026-08-17):** the not-activated notice shipped as guidance TEXT with
no action — breaking the feature's own rule that a notice carries its
fix. New `ExternalWalletSetupDialog`: step 1 = QR + copyable address
("send ≥2 XLM — 1 activates, ~0.5 is the trustline reserve") with a 4s
Horizon poll that advances AUTOMATICALLY when the payment lands (no
"I did it" button; derived-from-chain-state = resumable, same principle
as the Normal-wallet setup dialog); step 2 = kit-signed USDC trustline;
done state. Steps are a pure VIEW over deriveWalletReadiness — a
transient probe failure ('unknown') keeps the QR up and keeps polling,
never claims progress. Mounted INSIDE WalletReadinessNotice (slot
kind), so drawer badge + swap-page notice get the flow for free;
closing re-probes so the badge updates instantly. Slot no-trustline
keeps the one-click inline add (a popup would add a step to a
single-signature fix). Toast copy now points to the drawer. 228 tests.

**#74b — "send to your own wallet" chips (Niko GO "all linked
wallets", 2026-08-17):** the Send dialog's destination was free-text
only; moving money between your OWN wallets (external ↔ Normal) meant
copy-pasting addresses. New quick-pick row under "To" for Stellar
assets: one chip per OTHER wallet the account owns — companion Normal
wallet + ALL linked external wallets (pure buildOwnWalletCandidates:
sender excluded, deduped, name falls back to short address; 4 tests).
Tapping a chip only FILLS the destination — every existing
pre-signature gate (send-plan activation minimum, trustline block,
memo rules) still runs unchanged. Chips are asset-aware via the #74
readiness mapper with per-asset trustline probe (useAccountStatus
assetCode/assetIssuer): XLM → an unactivated target stays selectable
with the hint "sending XLM activates it" (that IS the funding path);
any trustline asset → unready target disabled WITH the reason (that
send could only bounce). Checking/failed probe = plain selectable chip
(asserts nothing; downstream gates protect). BTC/ETH/SOL sends get no
chips — your own wallet is the sender there. Linked-wallets fetch
failure = no chips (missing shortcut, never a wrong claim). 232 tests.

**Send-modal dead "Select an asset" under hybrid (Niko, 2026-08-17):**
the open-time reset picks a token from the list AS OF the open instant;
with an empty external wallet in the slot there are no Stellar tokens
and the BTC/ETH/SOL hooks only START fetching on open → empty list →
sendToken null — and the balance-sync effect explicitly refused to fill
a null selection, so the modal stayed dead. Never seen before because a
normal-wallet slot always has cached XLM/USDC instantly (pre-existing
race, exposed by #32 hybrid). Fix: the sync effect now ADOPTS the
selection when it arrives (same initialSymbol/best-value rules as the
open-time reset). Root-cause family: "snapshot pretending to be a live
view" — a one-shot read of an async list. 232 tests.

**#74c — send FROM the Normal wallet (Niko, 2026-08-17, "why do you
half ass everything"):** with an external wallet connected the Send
picker showed only BTC/ETH/SOL — Stellar sends were slot-signed, the
slot (Lobstr) held nothing, and the companion's XLM/USDC were simply
absent. Deserved the callout: the coexistence rule this whole branch
is built on is "everything in the drawer is actionable", and Send was
the last surface violating it — I had scoped the override out of #74b
and asked permission instead of finishing the pattern. Fix = the third
application of the explicit-override pattern:
`TransferArgs.sourceAddress` — the send is BUILT for the source
account (reserve math, subentries and the #4e destination gates follow
automatically because the hook loads THAT account) and signed via the
universal signer (companion → passkey), normalCanSign skipped under
override. Send modal: companion XLM/USDC join the sendable list as
`__companion_*__` tokens named "· Normal wallet" (issuer set from
config — portfolioAssetToToken is display-only and leaves it empty);
ONE `effectiveSender` drives subentries probe, fresh MAX read, #67
savings buffer (companion's OWN position) and the chip row's sender —
so a companion send offers the connected wallet as a destination
(builder gained slotWallet, deduped against its linked row; 1 new
test). The override is injected in exactly one place (sendWithSource)
so the adapter and every other caller stay untouched. Best-value
preselect now lands on companion USDC for the reported account.
233 tests.

**#74c follow-up — self-send guard misfire (Niko, 2026-08-17):** the
Normal→Lobstr send the chips exist for was blocked with "Cannot send to
your own address". The guard predates the override and compared the
destination against the CONNECTED wallet — under a companion send the
connected wallet IS the legitimate destination. Now compares against
`effectiveSenderAddress` (a true self-send — companion→companion or
slot→slot — is still blocked). Also: the compact asset pill shows only
the symbol, so a hybrid account couldn't see WHOSE XLM was selected —
the Available line now carries "· Normal wallet" / "· Lobstr". Rule
restated: every sender-relative check must read the EFFECTIVE sender,
never wallet.address — grep for persist.wallet.address when adding
override surfaces. 233 tests.

**#75 Phase 1 — hybrid surface audit fixes (Niko's 5-issue report,
2026-08-17, "stop half assing... real scalable solutions"):** after
Lobstr's live activation, store-fed surfaces still showed it empty
while aggregate-fed ones were right — the documented #7/#12 duplicate
data path finally bit visibly. Full audit in doc 75 (every money
surface × hybrid, verdict each). Fixes: (1) send modal's slot Stellar
sendables now built from the AGGREGATE (same mapper as companion rows,
labeled by owning wallet when hybrid; store no longer consulted);
(2) Earnings stat composed slot + companion via new
`companionEarnings` (was slot-only → confident $0.00 for hybrid);
(3) `TokenStoreRefresher` in the layout refreshes the legacy store on
every `nf:activity-updated` (debounced 1.5s) — a class-wide safety net
for remaining store consumers (swap card) until Phase 2 retires the
store; (4) drawer's slot rows + wallet sections read the aggregate;
(5) drawer address list collapsed to "Addresses · N" accordion
(5 rows pushed the balance card below the fold). Verified correct
as-is: composer, home hero rows, /portfolio walletTokens/donut,
savings card, activity. Phase 2 queued (doc 75): retire tokenState
from swap card; asset detail pages per-wallet split. RULE: display
surfaces read exactly ONE source (the aggregate); tokenState must not
gain consumers. 233 tests, isolated build clean.

**#75 round 2C — per-wallet XLM fee semaphore (Niko, 2026-08-17):**
the savings page's "Network fees (XLM)" card showed ONE wallet — the
slot's XLM (0.50 for fresh Lobstr) — while savings runs from either
wallet via the tabs. Now: one row PER wallet (Normal first, same order
as the tabs), each with its own semaphore dot + spendable-for-fees
number; header chip = the BEST wallet's status (alarm only when EVERY
wallet is short — savings can always run via the healthy one);
hasActiveSavings buffer note covers slot OR companion position; and the
card moved off tokenState onto the aggregate (doc 75 rule — it was a
remaining store consumer). Items A (portfolio holdings wallet TABS)
and B (savings chart flat under hybrid — slot-scoped history read,
overlaps queued #53) are RECORDED in doc 75/backlog as next session's
first tasks — deliberately not rushed at end of context. 233 tests,
isolated build clean.

**#75 round 2 complete — A+B+C all shipped (Niko: "why aren't you
fixing things the most optimal way"; fair — I had deferred A+B and
made the chip call without asking):** (A) Holdings TABS on /portfolio:
HoldingsCard gained optional `sections` (drawer-style pills); page
splits by row identity — synthetic `__*__` contracts = Normal-wallet
side (chain assets, companion, savings), real contracts = the external
wallet. (B) flat savings chart: hero stats compose slot+companion but
the CHART+history read wallet.address (Lobstr = zero history) →
savingsHistoryAddress now points at the wallet that HOLDS the savings
(companion when it has the position). (C) fee card round 2: rows show
TOTAL first, "· X for fees" second (fee-only number read as a wrong
balance: 2.00 XLM showed as 0.50), and the header chip is now the
WORST wallet's status per Niko (a red row under "Healthy" reads as a
contradiction — my best-status call reversed). 233 tests, isolated
build clean.

**#75 Phase 2a + chunk 5 activity (Niko GO "whats left", 2026-08-17):**
(1) swap card off the legacy token store — XLM/USDC now from the
portfolio aggregate (issuer patched from config since the 4b funding
move sends that token object); tokenState has ZERO display consumers
left — the TokenStoreRefresher net stays until the store itself is
deleted. (2) Activity feed covers BOTH wallets on hybrid: second
useUserActivity instance for the companion, feeds merged
newest-first, each row tagged with its owning wallet ("Normal wallet"
/ "Lobstr") next to the type chip — previously every companion-side
action (savings deposits, cctp legs) was simply invisible in the feed.
REMAINING for #32 close: asset detail pages per-wallet split; ⟳ "All
wallets" button final fate (decision). 233 tests, build clean.

**Drawer Assets tab — Savings row (Niko, 2026-08-17):** the drawer's
summary showed Savings but the Assets tab never listed it. Added a
"Normal Savings" row: account-wide value (slot + companion), $1-pegged
so TokensTab's USD sort places it among the coins; rides the Normal
wallet tab on hybrid (same placement as the /portfolio Holdings tabs);
absent while loading with nothing cached (never a confident $0 row);
clicking it opens /savings — TokensTab special-cases the __savings__
contract, since /assets/Savings does not exist. 233 tests, build
clean.

**Drawer double-count fix (Niko, 2026-08-17, same hour):** adding the
Savings row into allTokens fed it into assetsBalance too, and the
summary already counts savings in its own line → Total showed $73.52
for a $52.85 account. Fix: assetsBalance skips the __savings__ row —
it is a display row; its value lives in the Savings line only. Same
defect family as #55 (a summed number no action can spend): any
synthetic display row added to a token list must be excluded from
every SUM over that list — check sums when adding rows. 233 tests,
build clean.

**Swap picker slot-scoped values (Niko, 2026-08-18):** the asset picker
showed XLM $0.31 — the Lobstr slot's — while 13 XLM sat in the Normal
wallet, and USDC (slot balance 0) fell into "All assets" as unowned.
The picker answers "do I have this asset?", so its rows now show the
ACCOUNT-WIDE balance (slot + companion) for XLM/USDC on hybrid; the
wallet pills answer "which wallet pays" after picking. tokenBySymbol
itself deliberately stays slot-scoped — every engine computation
(fromBalance, reserve, MAX) depends on per-wallet numbers; only the
display-facing pickerToken widens. 233 tests, build clean.

**#75 Phase 2b + chunk 5 close (Niko GO, 2026-08-18):** (1) asset
detail pages account-wide — they read the LEGACY STORE for Stellar
(the audit table had wrongly marked them aggregate) and showed the
slot balance only; now: slot balance from the aggregate, big number =
slot + companion, split line "Normal wallet X · Lobstr Y" when both
hold some. (2) ⟳ "All wallets" button REMOVED (decision): wallet
visibility = Assets-tab pills, connecting = "+" — one control per job;
it was a duplicate wizard entry point. (3) Swap picker follow-up
(2026-08-18 report): picker rows show account-wide XLM/USDC totals;
tokenBySymbol stays slot-scoped for engine math. Doc 73 gained Part F
(F1-F6). With this, #32's code work is COMPLETE — remaining: Niko's
live matrix (doc 73 A-F) → fallout → merge. 233 tests, build clean.

**Chart "unavailable" flash + slow drawer addresses (Niko,
2026-08-18):** (1) /assets price chart rendered its ERROR state while
SWR was still RETRYING — a cold upstream price cache fails the first
call and succeeds on retry, so users read "unavailable" seconds before
the chart drew. Terminal claims need terminal evidence: the message now
shows only when error && !isValidating && no data; mid-retry keeps the
skeleton (same rule family as deriveWalletReadiness's
checking/unknown). keepPreviousData added so range switches don't
flash. (2) drawer address rows arrived seconds after the assets:
useTurnkeyWallet only STARTS fetching when the drawer opens and had no
persistent seed, while assets paint from the portfolio snapshot. Added
nf:turnkey-addresses:v1 localStorage cache (keyed by user id; Turnkey
addresses are public + append-only, safe to paint stale) as SWR
fallbackData, written on every success. Doc 73 rows F7/F8. 233 tests,
build clean.

**/assets list page account-wide (Niko, 2026-08-18):** the standalone
Assets page still read the legacy slot store — $2.21 total for a $52.85
account (Lobstr's 2 XLM; companion + savings invisible). Now: slot
Stellar rows from the aggregate (labeled by owner on hybrid), companion
rows ("· Normal wallet", __companion_*__ contracts), and a Normal
Savings row (account-wide value, routes to /savings — __savings__
special-cased in the row click). Total sums everything and matches the
drawer/portfolio. This was the fifth surface found on the store AFTER
the audit table claimed completeness — the table was built by reading
consumers I knew of, not by grepping tokenState.tokens; the grep is
now the rule for "done" claims. 233 tests, build clean.

**Inline session-reconnect (Niko, 2026-08-18):** an expired
Lobstr/WalletConnect session mid-flow ABORTED the operation — red
failed step in the cctp modal + a "reconnect" snackbar whose button
only reconnected, leaving the user to redo the swap by hand. Both
external signing paths (signOrReconnect + the mgi kit-signer) now
recover INLINE: info toast explaining why a wallet window is appearing
→ reopen the connect flow → retry the SAME signature once. The
in-flight step pauses and continues; only a declined/failed reconnect
falls back to the old snackbar + WalletSessionExpiredError (callers'
suppression contract unchanged). Session-based wallets = Lobstr/
WalletConnect (sessions do not survive reloads) — that's WHY the
error appeared, not a bug in the swap. Doc 73 row F10. 233 tests,
build clean.

**BTC delivery expectation (Niko live test, 2026-08-19):** Lobstr→BTC
completed its Stellar→Base leg, then LI.FI routed via Layerswap whose
payout is a REAL Bitcoin transaction — 10-40 min is normal (SOL felt
instant, BTC cannot). Funds were never at risk: every leg lands on the
user's own addresses (the engine's core invariant), and the #66
arrival verification refreshes balances when the payout confirms. The
defect was the EXPECTATION: "delivery takes a few minutes" / done-note
copy now says "Bitcoin usually takes 10–40 minutes" + points at
Activity. Doc 73 row F11. 233 tests, build clean.

**BTC delivery parity (Niko, 2026-08-19, reversing the #66 BTC
exemption):** BTC swaps now track to TRUE delivery like SOL/ETH — the
"Delivering" step (honest sub: "Bitcoin confirmations — usually 10–40
minutes") holds until LI.FI reports DONE (poll cap 360×10s ≈ 60 min
for BTC vs 10 min others; #63 fresh-header polling makes the long
window safe), then the #66 arrival gate refetches the BTC balance
before Done — closing the popup shows the BTC already in the wallet.
Timeout past the cap keeps the honest "on its way" close-out. The
early-exit branch now fires only for quotes with no chain ids. Doc 73
F11 rewritten. 233 tests, build clean.

**Inbound BTC ETA + pending $0 (Niko live test, 2026-08-19):**
(1) inbound BTC→USDC's slow leg is Bitcoin confirmations on the SOURCE
(~1h observed) but the "USDC arriving on Base" step said "a few
minutes" unconditionally → now per-chain: BTC → "Bitcoin confirmations
— usually 10–60 minutes". (2) the pending swap's Activity row showed a
confident $0 VALUE while the delivered USDC amount was still unknown →
now shows '—' until the real amount lands (unknown ≠ zero, the
register's oldest rule). Completed-row content verified correct from
the screenshot (USDC→BTC 19.15/$19.15); if more rows misreport after
settlement, needs Niko's expected-vs-actual per row. 233 tests, build
clean.

**Settlement registry (Niko GO, 2026-08-19 — "why wasn't BTC
considered / make adding assets easy"):** chain settlement windows now
live in the chain REGISTRY (`CHAINS[*].settlement = {minMinutes,
maxMinutes}`: BTC 10–60, ETH 1–5, SOL/Stellar 1–3). Every delivery ETA
label (both cctp modal steps) and the pivot-delivery poll budget
(settlement.maxMinutes × 1.5 margin) derive from it; today's `if
(BTC)` ternaries are DELETED. Adding a chain or a bridge change = one
registry entry, nothing else. RULE (memory + register): a value that
differs by chain goes in the registry on day one — a hardcoded value
true for the tested chains is a bug waiting for the untested one.
233 tests, build clean.

**"Done waits for refetch" sweep (Niko, 2026-08-19):** two gaps in the
cctp finish gate: (1) BTC's destination refetch was still
FIRE-AND-FORGET — the old exemption's leftover, wrong since BTC now
tracks to true delivery; (2) both directions awaited only the LEGACY
STORE refresh while displays read the AGGREGATE since #75 — "Done"
could show against stale visible numbers. Fix: finish() awaits
Promise.all of [destination-chain refetch (BTC included), inbound
token-store refresh, AGGREGATE refreshFresh (new refreshAggregate
prop = useWalletBalances.refreshFresh)] raced against the 15s
anti-stuck cap. LI.FI engine verified already gated (#62/#66,
live-tested); Soroswap: Horizon submit is inclusion-synchronous, so
funds are chain-confirmed at toast time and the refresh follows
immediately. 233 tests, build clean.

**Activity row invisible at swap start (Niko live test, 2026-08-19):**
the #27 transfer row IS created before broadcast, but the Activity
CARD only listened to 'nf:savings-position-updated', and the cctp
engine only dispatched 'nf:activity-updated' at Done — so the row
stayed invisible until the swap finished or the feed's own poll. Two
wires: engine dispatches the event right after the row is created;
the card listens to BOTH events. Rule restated: an event-driven
surface must subscribe to every event family that mutates what it
shows — grep the dispatchers when adding a listener. 233 tests,
build clean.

**Activity-at-start sweep, all flows (Niko, 2026-08-19):** verified or
wired per flow — cctp: row pre-broadcast (#27) + announce at creation;
statuses pending→completed, markFailed pre-broadcast, '—' value while
delivered amount unknown. LI.FI: row recorded server-side at source
broadcast; engine now announces right after broadcast (was: first
tracker tick); tracker announces progress + terminal (done/refunded/
failed each with distinct snackbar + row status). Soroswap: server
records before broadcasting inside the fee-pair call (atomic), engine
announces on return — earliest possible. Sends: announceTransaction
primitive dispatches immediately with a pending row + confirmed flip.
Savings: own event family, card subscribed. Activity card listens to
BOTH families. 233 tests, build clean.
