# 04 — Workstream B: Data-Fetching Architecture (DESIGN DRAFT)

Status: **draft agreed in principle 2026-07-25** (Niko + audit). Finalized in
Phase 3 after the Phase 1 fetch-graph exists; implemented in Phase 4. Nothing
here is built yet.

## Principle

**API calls must scale with things happening, not with users × time.**

## The three levers (Layer 1 — no Turnkey tier upgrade required)

1. **One fetcher.** Browsers never call Alchemy/Helius/CoinGecko/Horizon/
   mempool.space directly; only our server routes do. All policy (caching,
   budgets, backoff) is enforced in one place.
2. **Cache with a freshness stamp.** Server stores results (Redis/Postgres)
   with timestamps; requests inside the freshness window (~60 s balances,
   ~60 s prices) are served from cache. N tabs/surfaces = 1 upstream call.
3. **Refresh on events, not timers:**
   - surface opened → refresh **if stale**;
   - user action completes (swap/send/deposit) → server refetches that
     user's balances immediately → all surfaces update (this same mechanism
     fixes the "must refresh page after swap" UX bug);
   - receive watcher armed → temporary fast polling, **bounded**: only while
     the receive UI is open, polls our cached route (~10–15 s), auto-stops
     ~30 min.

## The surfaces rule (2026-07-25, raised by Niko)

Refresh-if-stale attaches to the **cache entry, not the page**. Every surface
showing holdings reads the SAME cache: portfolio page, homepage hero card,
account drawer, asset detail pages, swap card balances, savings. First surface
opened triggers at most one refresh; the rest paint from cache; post-action
refresh updates all surfaces at once (also eliminates surface-disagreement
bugs — see the hero-$56 / drawer-$0 auth incident).
**Phase 1 must enumerate EVERY consumer of balance/price data (file:line) so
no surface keeps a private fetch path.**

## Per-data-type plan

| Data | Plan |
|---|---|
| Prices (CoinGecko, keyless) | ONE server fetch per ~60 s serves all users — fixed total cost at any user count |
| Balances (Alchemy/Helius/Horizon/mempool) | server cache; visit-if-stale + post-action refresh |
| Activity feeds | extend the existing Upstash-cached route pattern (ETH/SOL already partial) to BTC; client refresh via existing `nf:activity-updated` event |
| Pending receives (BTC + ETH + SOL — feature KEPT) | watcher polls our cached route, modal-open only, auto-stop; BTC source (mempool.space) is free — the ETH/SOL watchers are the paid-credit burners to rein in |

## Guardrails

- Per-provider daily budget counters in Redis (same tooling as the existing
  rate limiter); on budget exhaustion serve cached values, never stampede.
- Provider dashboard alerts at ~50 % of free tier (Alchemy "Create alert",
  Helius cycle view).

## Layer 2 (deferred — explicit trigger)

Turnkey Balances API + org-wide balance webhooks (EVM+Solana; docs verified
2026-07-24) replace visit-staleness polling with push. Trigger: thousands of
ACTIVE Turnkey wallets / before the 10k push, together with the Turnkey
Enterprise pricing negotiation (signature cost $0.10 → $0.05 → ~$0.0015;
wallet caps 1k/2k below our 10k target). Business track (Justin / SDF
relationship). Current Turnkey wallets: 34.

## Open items before finalization (Phase 3)

- Phase 1 fetch-graph: every balance/price consumer + current poll intervals
  (esp. the ETH/SOL receive watchers — likely the Helius Enhanced-API 94 %
  driver).
- Exact per-method credit costs (Alchemy CU / Helius credits) pinned from
  provider docs → budget arithmetic per active user.
- Freshness-window values per data type (ratify against SLO freshness table
  in 01-slo-targets.md).
