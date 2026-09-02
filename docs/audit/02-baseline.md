# 02 — Baseline (measured 2026-07-24)

All numbers below are dated screenshots/exports provided by Niko on 2026-07-24
or verified in-repo the same day. Context that scales every per-provider
number: current usage comes from **~4–5 active testers** (most registered
users are inactive).

## Traffic (Vercel Analytics, production www.normalfinance.io, last 30 days)

| Metric | Value |
|---|---|
| Visitors / 30d | 968 (~32/day avg, peak day ~90) |
| Page views / 30d | 2,456 |
| Bounce rate | 68 % |
| Top pages | `/` 724 · `/about` 152 · `/savings` 125 · `/portfolio` 87 |
| Referrers | google 189 · t.co 77 · accounts.google 45 · linkedin 17 |

Real-user performance vitals: **none until now** — Speed Insights installed
2026-07-24 (collect-only); first vitals will accumulate over the following
days and get appended here.

On-chain usage: Dune dashboard (source of "total users") —
https://dune.com/normalfinance/normalfinance-analytics (numbers to be
extracted into this doc).

## Third-party providers — plan, usage, headroom

| Provider (role) | Plan | Usage (dated) | Free-tier limit | Notes |
|---|---|---|---|---|
| Alchemy (ETH RPC) | Free | 111.3K CU this month; peak 2.3 CU/s | 30M CU/mo; 500 CU/s | ETH mainnet only; top methods: getBalance, gasPrice, sendRawTransaction, getBlockByNumber, getTransactionCount, maxPriorityFeePerGas |
| Helius (SOL RPC + Enhanced API) | Free | 15,296 credits in cycle Jul 13→Aug 13 | 1M credits/cycle | Enhanced API = 94.1 % of spend, RPC 5.9 % |
| Etherscan (ETH data) | Free | 18 calls/day | 100k calls/day; 5/s | Negligible |
| CoinGecko (prices) | **Keyless** (no account, no `COINGECKO_API_KEY` set) | unmetered | public-API IP limits (exact limit: pull from docs in Phase 2) | Server-side calls come from shared Vercel egress IPs — limit risk is real |
| Horizon (Stellar reads) | **Public horizon.stellar.org** (ValidationCloud is a commented-out leftover, NOT in use) | unmetered | public rate limits | Already caused one wallet-not-loading incident (July) |
| mempool.space (BTC) | Keyless public | unmetered | public limits | |
| LI.FI (cross-chain quotes) | Integrator `normalfinance`, API key, 25 BPS fee | portal shows no usage metrics | per-key limits (docs) | Fees auto-forward since 8 Apr 2026 contract update; $0 collectable shown |
| Upstash Redis (rate limiter) | unknown | unknown | — | **Account ownership unknown to owner — governance flag, see below** |
| Turnkey (custody/signing) | — | not yet examined | — | Research task open (data APIs + billing model) |
| Supabase / Vercel | paid-plan status to confirm | — | — | Platform spend baseline TBC |

## Preliminary extrapolation (finding P0-1 — the cost target is impossible without re-architecture)

Naive per-user math from tester usage (÷5 testers, ×10,000 users), **before**
HAR-based per-session measurement refines it:

| Provider | Per-user/mo (≈) | At 10k users | vs free tier |
|---|---|---|---|
| Alchemy | ~22K CU | ~220M CU/mo | **~7× over** the 30M free tier |
| Helius | ~3K credits | ~30M credits/mo | **~30× over** the 1M free tier |

Even with tester-bias caveats, the shape is unambiguous: the current
architecture (every client fetches balances/prices per view from paid APIs)
**cannot meet the $0-API-spend target at 10k users**. A shared-cache
architecture (workstream B) is *required*, not optional. Decision in Phase 3.

## Platform spend & on-chain actuals (added 2026-07-25)

- **Vercel: Pro plan, upcoming invoice ≈ $40/mo** (seats + add-ons; $4.06 of
  $20 included infra credit used; on-demand budget capped at $200, unused).
- Supabase org billing: screenshot still pending (project badge says FREE).
- **Dune (screenshots 2026-07-25):** 659 registered users · **15 wallets have
  EVER transacted** · daily active wallets 0–5 (peak 5) · TVL $18,543 ·
  all-time volume $22,607 · protocol fees $107.98 · savings yield generated
  $227.28 · signup spike ~100/day (Mar 2026 campaign).
- **Activation ratio: 15/659 ≈ 2.3 % ever-transacted, DAU/registered <1 %.**
  Scale-model consequence: "10k registered" ≠ 10k load unless activation
  improves — but the sponsor-spike scenario must still assume campaign
  cohorts arriving all at once. (Also a product insight outside this audit's
  scope: activation, not infra, is the current growth bottleneck.)

## Supabase spend & quota risk (screenshots 2026-07-26)

- **Free Plan, $0/mo, spend cap ENABLED** — at quota exhaustion projects
  "become unresponsive or enter read-only mode": under a sponsor-post spike
  the database would simply STOP rather than bill overage. Must flip to Pro
  (or at minimum disable spend cap) before any push. NANO compute tier on
  both projects (the P0-2 Realtime churn burns this tiny instance).
- Usage: Egress 123 MB/5 GB · DB size 54 MB/500 MB · **MAU 35**/50,000 ·
  storage 0. (MAU 35 corroborates the ~2 % activation picture.)
- Projects: `normal-stellar` (us-east-2) = production auth+DB
  (`vunxamog…`); `normal-testing` (us-west-2, `gnqjbvmx…`).

- **P0-8 (RESOLVED to a naming/architecture finding, 2026-07-26):**
  production, staging AND localhost all run Prisma against the SAME database
  — the project **named `normal-testing`** (`gnqjbvmx…`, us-west-2, NANO,
  free org). Verified two ways: Vercel's Production `DATABASE_MAINNET_URL`
  shows the same ref, and a read-only count found the real production data
  inside: **34 turnkey_wallets (exact match to the Turnkey dashboard),
  45 swap_logs, 11 moneygram_transactions, 83 linked_wallets, incl. the
  owner's own wallet row**. So: the MoneyGram migration DID hit the right
  DB (recording works everywhere — earlier worst-case retracted), but:
  (a) **production data lives in a project whose name says "testing"** — an
  invitation for someone to delete it during cleanup; rename the project
  (cosmetic, zero-risk) → e.g. `normal-app-db`;
  (b) the P0-9 spend-cap/NANO risk applies to THIS database — the real one;
  (c) auth (`normal-stellar`, us-east-2) and data (us-west-2) are in
  different regions — every request pays a cross-region hop somewhere;
  (d) `DATABASE_MAINNET_URL` and `DATABASE_TESTNET_URL` carry IDENTICAL
  values — testnet mode writes into the production tables; the mainnet/
  testnet DB split exists in variable names only.
  Roadmap items, none require immediate action except (b).

## Users & database (added 2026-07-24 evening)

- **Registered users: 659** (Dune); of those, **34 are Turnkey wallets**
  (2026-07-25) — the rest are legacy local-key wallets. Consequence: Turnkey
  Enterprise negotiation stays a before-the-10k-push item; balance webhooks
  are a later bolt-on (Layer 2), not part of the first cache build (Layer 1).
- **Pending-receive watchers exist for BTC, ETH *and* SOL** (2026-07-25) —
  the ETH/SOL watchers poll the PAID providers (Alchemy/Helius) per client;
  likely the main driver of Helius "Enhanced API = 94 %" usage. Layer-1 fix:
  watchers keep the feature but poll our cached server route, modal-open
  only, auto-stop ~30 min. Exact current intervals: pin in Phase 1 map.
- Supabase Query Performance (production `normal-stellar`, FREE plan): 97 slow
  queries · 100 % cache hit rate · 4.4 avg rows/call.
- **Finding P0-2 — Supabase Realtime churn:** the top FOUR queries by total
  time are the Realtime engine's WAL-polling internals (`SELECT wal->>… as
  type…` 67.5 % + 22.7 %, `realtime.list_changes` 4.0 %, + 3.8 % — together
  ≈ 98 % of all DB query time, 17M+ calls), yet **the app does not use
  Supabase Realtime at all** (verified: only a coincidentally-named TS type).
  This is the free tier's shared compute being burned polling for subscribers
  that don't exist. Candidate fix (config-only, zero code): disable the
  Realtime API in Supabase project settings. Verify nothing breaks on staging
  first.
- Actual application queries (PostgREST `authenticated` role) are modest:
  ~12k calls, mean 19 ms, max 1.5 s — max latency worth a look in Phase 2.

## HAR measurements (staging, 2026-07-25 — 6 flows captured; swap deferred to localhost)

Per-flow request totals (browser → destination):

| Flow | Total req | Own API | Direct Horizon | Direct mempool | Notes |
|---|---|---|---|---|---|
| 01 cold login→portfolio | 157 / 20 s | 20 | 10 | – | + 10 walletconnect-explorer, 9 cloudflare challenges, 6 Soroban RPC (rpc.lightsail.network) |
| 02 warm home→drawer→portfolio | 326 / 20 s | **90** | **29** | 4 | `/api/turnkey/wallet` **44×** in 20 s |
| 03 asset USDC | 34 | 14 | 8 | – | |
| 05 receive watch (ETH,SOL,BTC ~2 min each) | 392 / 7.4 min | 192 (25.9/min) | 37 | 22 | + one 2-min websocket (mempool) |
| 06 savings | 19 | 17 | – | – | |
| 07 **idle tab, 11.2 min** | 159 | **137 (12.2/min)** | – | – | `/api/cctp/transfers` 44× · `/api/lifi/statuses` 34× · `/api/wallet/portfolio` 25× · `/api/mgi/transactions` 22× · `/api/mgi/info` 12× |

**Findings from the captures:**

- **P0-3 ROOT CAUSE CONFIRMED (2026-07-25, Vercel env screenshot):**
  `UPSTASH_REDIS_MAINNET_REST_URL/TOKEN` are scoped to **Production only**;
  staging deploys from develop as **Preview** in the same project → Preview
  gets `undefined` for both → Redis client boots with empty credentials →
  every `redis.get/set` burns the retry backoff (~20 s) → the measured 22 s
  portfolio, the ~9 s Redis-touching routes, and NO rate limiting on
  staging. FIX (folds into the planned account move): create the new
  company-email Upstash account, two DBs, and set all four vars for **All
  Environments**. Retest: staging portfolio should drop 22 s → ~2 s.
  Original hypothesis for the record: the route's internal work is hard-capped (~5 s source
  timeouts, `allSettled`) — the only unbounded step is **Upstash Redis**. If
  staging's Vercel env lacks/breaks the `UPSTASH_REDIS_MAINNET_*` vars, the
  client boots with empty credentials by design (rateLimiter.ts keeps the app
  alive) and every `redis.get` burns the client's ~5-retry backoff (~20 s)
  before failing → ~20 s + ~2 s real work = the measured 22 s. Corroboration:
  localhost (working Redis) serves the same route in 2–7 s; the ~9 s
  `lifi/statuses`/`activity` routes are also Redis-touching. Consequence if
  confirmed: staging runs with NO response cache and NO rate limiting.
  Verify via: staging env-var screenshot + the `[RateLimiter] Upstash config
  diagnostics` log line (prints hasUrl/hasToken).
  Also noted: the 15 s response-cache TTL vs the client's 30 s poll means
  even a healthy cache misses on every poll — TTL/poll mismatch to fix in
  Layer 1.
- **P0-3 — `/api/wallet/portfolio` takes ~22 s, consistently** (22.03–22.46 s
  across every flow that calls it). A stable ~22 s smells like an internal
  ~20 s timeout + retry inside the route. It is ALSO polled every ~30 s
  (P0-4), meaning near-continuous overlapping 22-second serverless
  executions per open tab. Likely the root of "portfolio/savings loads
  last". Top Phase-2 investigation.
- **P0-4 — idle tab burns 12.2 own-API requests/min (~730/hour/user)** with
  nobody touching it. Each of those serverless invocations fans out to paid
  providers server-side. This is the users × time leak, measured.
- **P0-5 — `/api/turnkey/wallet` dedupe fails in practice**: 44 calls in a
  20-second flow and 50 during receive-watch despite the shared-SWR design
  (60 s dedupe). Investigate why (multiple caches? hard navigations? mutate
  loops?).
- **P0-6 — `/api/mgi/info` is fetched eagerly everywhere** (6–14× per flow,
  incl. homepage) and produces trailing-slash duplicate calls (`info` +
  failing `info/`) — check Next `trailingSlash` redirect behavior + mount
  strategy of the on/off-ramp dialogs.
- **P0-7 — a statuspage.io widget polls 2×/min forever** (even idle) —
  identify which component embeds it; free but noisy.
- Slowest calls: portfolio ~22 s (see P0-3); `/api/lifi/statuses` and
  `/api/activity/solana|ethereum` ~9 s each on first hit.
- Direct-from-browser provider calls confirmed: Horizon (up to 29/flow),
  Soroban RPC (lightsail), mempool.space. Alchemy/Helius/CoinGecko are
  already server-side only — the Layer-1 refactor completes a pattern that
  is half-done, not greenfield.

## Governance flags (found during baselining)

1. **Upstash account ownership unknown** — production rate limiting depends on
   an account nobody can locate. If it lapses or its tokens rotate, behavior
   of every rate-limited route is untested (fail-open vs fail-closed unknown).
   Action: identify owner (previous dev? Justin?), transfer to a company
   account, document fail-mode.
2. **Provider accounts live on personal emails** (Etherscan/Alchemy/Helius on
   niko's gmail) — fine at this stage, but move to a shared company identity
   before the 10k push (bus-factor).
3. **Stellar reads on public infrastructure** — no SLA, already bit us once.

## Still missing for a complete baseline

- Supabase: registered-user count + query-performance export
- Dune: extract current on-chain actives/tx-per-day numbers
- Vercel/Supabase plan spend (the "today's total cost" number)
- Turnkey billing model + any data APIs (research task)
- HAR captures per flow → API-calls-per-session table (replaces the ÷5 math)
- Server route p50/p95 timings (Vercel observability export)
