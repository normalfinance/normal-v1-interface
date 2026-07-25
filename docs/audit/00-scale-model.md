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

| Provider | Limit | Today peak | 10k campaign | 10k spike | Headroom |
|---|---|---|---|---|---|
| Alchemy | 30M CU/mo · 500 CU/s | 2.3 CU/s · 111K CU/mo | | | |
| Helius | 1M credits/cycle | 15.3K/cycle | | | |
| Etherscan | 100k/day · 5/s | 18/day | | | |
| CoinGecko keyless | TBD (docs) | unmetered | | | |
| Horizon public | TBD | unmetered | | | |
| Iris (CCTP) | 35 req/s | negligible | | | |
| MoneyGram | TBD (ask partner) | ~5 tx/day peak | | | |
| Supabase (auth+DB) | plan limits TBD | | | | |
