# 75 — Hybrid-account surface audit (Niko's 5-issue report, 2026-08-17)

Trigger: after activating Lobstr (2 XLM), several surfaces still showed it
empty or slot-only. Root cause for most: the DUPLICATE DATA PATH already
flagged in code (#7/#12) — `persist.tokenState` (legacy store, refreshed only
on certain mounts) vs the portfolio aggregate (server-side, includes slot +
companion, refreshed on every activity event). Aggregate-fed surfaces were
right; store-fed surfaces were stale.

## Audit — every money surface × hybrid

| Surface | Source today | Verdict |
|---|---|---|
| use-portfolio composer | aggregate | ✅ account-wide (slot+companion+savings) |
| Home hero rows | walletPositions | ✅ wired right; looked broken only via stale aggregate cache timing |
| /portfolio walletTokens + donut | aggregate getAsset + companion | ✅ |
| /portfolio Earnings stat | `savings.earnings` = SLOT only | ❌ #4 — companion earnings invisible (slot=Lobstr → $0.00) |
| Send modal sendable list (stellar) | tokenState | ❌ #1 — stale after activation; source unified to aggregate |
| Drawer allTokens + sections externalTokens | tokenState | ❌ same staleness class; unify to aggregate |
| Swap card tokenBySymbol (XLM/USDC) | tokenState | ⚠️ Phase 2 — works via page-mount refresh but same class; retire store |
| Asset detail pages (/assets/[symbol]) | aggregate getAsset (slot) | ⚠️ Phase 2 — companion balance not shown on detail page |
| Savings card / engines | explicit per-wallet | ✅ (#32 4a-4f) |
| Activity | address-keyed | ✅ |
| Drawer address rows | — | ❌ #5 UX — 5 rows push content down → collapse |

## Phase 1 (NOW)

1. **Send modal**: slot Stellar sendables built from the AGGREGATE (same
   mapper as companion rows, labeled by owning wallet when hybrid); store no
   longer consulted for the list. xlmPrice falls back store→aggregate.
2. **Earnings**: `companionEarnings` exposed from use-savings-position;
   /portfolio stat = slot + companion.
3. **Store freshness net**: one layout-level listener refreshes the legacy
   store on `nf:activity-updated`, so every REMAINING store consumer (swap
   card) stops going stale between page mounts.
4. **Drawer**: allTokens + wallet sections read the aggregate; address rows
   collapsed into a compact expandable "Addresses" section.

## Phase 2 (next chunk, after live test)

- Retire tokenState from the swap card (tokenBySymbol from aggregate) → then
  from the app; store remains only as the action-time fresh-read primitive.
- Asset detail pages: show per-wallet split (slot + companion) like the
  drawer tabs.

Rule (register): a display surface may read exactly ONE source — the
portfolio aggregate. tokenState is transitional and must not gain consumers.
