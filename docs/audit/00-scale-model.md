# 00 — Scale Model (v1, 2026-07-24)

## Growth shape (per Niko, 2026-07-24)

- **Baseline growth**: paid marketing campaigns + manual onboarding by the team
  → a controllable ramp.
- **Spikes**: Stellar (biggest sponsor) or other chains posting about Normal →
  sudden influxes with no advance load-shedding possible.

**Design consequence:** the app must survive a *sponsor-post spike*, modeled
as compressing many days of campaign traffic into hours. Working spike
assumption (to refine when the first such post happens): **10–50× the daily
average arriving within a few hours**, mostly cold-start users (worst case:
every one triggers signup + wallet provisioning + first portfolio load).

## Milestones

| Milestone | When | Registered users |
|---|---|---|
| Today | Jul 2026 | (Supabase/Dune count pending; ~4–5 *active*) |
| Push 1 | end of 2026 | 10,000 |
| Push 2 | later | 100,000 |

## Load derivation (to be completed with HAR measurements)

Chain: registered → DAU (ratio TBD from Dune/Vercel once user count lands) →
sessions/day (Vercel: currently ~1.1 pageviews/visitor-day) → per-session API
calls per provider (HAR captures, pending) → peak RPS per provider under (a)
campaign-ramp and (b) sponsor-spike shapes → headroom vs each provider limit.

Current placeholders marked ASSUMPTION are not to be used for decisions until
replaced by measurement.

## Capacity table (fills as measurements land)

**First real arithmetic (2026-07-25, from HAR + Alchemy CU table
[eth_getBalance = 20 CU], free tier 30M CU/mo):** an idle tab full-aggregates
the portfolio ~134×/hour (25 calls/11.2 min, each missing the 15 s cache) →
~2,680 CU/hour/tab on Alchemy alone. At 10k users × 1 idle-tab-hour/day ≈
**800M CU/mo ≈ 27× the free tier — from one hook.** Under Layer 1
(visit+action refresh, ~2 aggregates/user/day): 10k users ≈ **12M CU/mo —
comfortably inside the free tier.** The architecture decision is therefore
load-bearing, not optional; matching Helius arithmetic lands when its credit
table is pinned.

| Provider | Limit | Today peak | 10k campaign | 10k spike | Headroom |
|---|---|---|---|---|---|
| Alchemy | 30M CU/mo · 500 CU/s | 2.3 CU/s · 111K CU/mo | ~800M CU/mo (today's arch) / ~12M (Layer 1) | | 0.04× today / 2.5× Layer 1 |
| Helius | 1M credits/cycle · 10 req/s | 15.3K/cycle | ~60M/mo (today's arch: SOL history = **100 credits/call**, polled) / ~2M (Layer 1) | | 0.017× today / ~0.5× Layer 1 → SOL history caching is mandatory, maybe paid tier at 10k |
| Etherscan | 100k/day · 5/s | 18/day | | | |
| CoinGecko keyless | TBD (docs) | unmetered | | | |
| Horizon public | TBD | unmetered | | | |
| Iris (CCTP) | 35 req/s | negligible | | | |
| MoneyGram | TBD (ask partner) | ~5 tx/day peak | | | |
| Supabase (auth+DB) | plan limits TBD | | | | |
