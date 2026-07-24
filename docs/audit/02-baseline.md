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
