# 01 — SLO Targets (PROPOSED — awaiting ratification)

Status: **DRAFT for Niko to mark up.** Every number below is a proposal. Edit any
of them, then mark this file ratified. If Phase 0 baselining shows a target is
wildly off from today's reality, we renegotiate it with the measurement in hand
— targets are commitments, not wishes.

Scale context these targets must hold at: **10,000 registered users (end of
2026)**. The 100k column of the capacity model is roadmap input, not an SLO.

## 1. Speed — how fast key flows must feel

"p95" = 95 of 100 sessions must be at least this fast, measured on production.

| # | Flow | Proposed target (p95) | Notes |
|---|------|----------------------|-------|
| S1 | App first paint (any page) | LCP ≤ 2.5 s (p75) | Web-vitals "good" threshold |
| S2 | Login → portfolio **fully painted, savings included** | ≤ 4 s warm · ≤ 6 s cold | "Complete" = every balance widget settled — no savings-loads-last straggler |
| S3 | Asset page interactive | ≤ 3 s | |
| S4 | Swap quote shown (Soroswap XLM↔USDC) | ≤ 2 s | |
| S5 | Swap quote shown (LI.FI / CCTP composite) | ≤ 5 s | Multi-provider quote fan-out |
| S6 | MoneyGram start → their UI open | ≤ 6 s | Excludes passkey-signing time (user-paced) |
| S7 | Savings deposit/withdraw app-time | ≤ 15 s | Excludes user signing + chain finality |

## 2. Freshness — when the UI must reflect reality (no manual refresh, ever)

| # | After the user… | The UI must show it within |
|---|-----------------|---------------------------|
| F1 | Completes a swap (any engine) | new balances ≤ 5 s, no page refresh |
| F2 | Sends / receives on any chain | balance + activity row ≤ 10 s of confirmation |
| F3 | Savings deposit/withdraw settles | position + balance ≤ 10 s |
| F4 | MoneyGram deposit completes | USDC balance ≤ 30 s |
| F5 | Reopens the app next day | balances current within one visible refresh cycle, never a stale cache presented as live |

## 3. Reliability

| Metric | Proposed target |
|--------|----------------|
| API route error rate (5xx, 7-day) | < 0.5 % |
| Uptime (monthly, user-facing) | 99.9 % |
| Money-flow failure honesty | 100 % — a failed swap/deposit is always visibly failed, never silently stuck |

## 4. Capacity headroom (at 10k users, from the scale model)

| Metric | Proposed target |
|--------|----------------|
| Every third-party provider (Horizon, RPCs, Iris, MoneyGram, prices) | ≥ 3× headroom between our peak load and its rate limit / quota |
| Database connections at peak | ≤ 50 % of pool |

## 5. Cost

Owner's stated goal: **"ideally we don't want to pay anything monthly."**
Interpreted as ratifiable targets:

| Metric | Proposed target |
|--------|----------------|
| Third-party API spend at 10k users | $0/mo — every provider on a free tier, proven by the usage math |
| Total infra spend at 10k users | ≤ today's spend (Vercel/Supabase plans + relayer gas floats are already real costs — literal $0 total is not achievable; the baseline will state today's number) |
| Cost growth | sub-linear in users (shared caches, not per-user API calls) |

## Ratification

- [x] Numbers reviewed by Niko — accepted as proposed ("agree with all")
- [x] Ratified on: 2026-07-25
