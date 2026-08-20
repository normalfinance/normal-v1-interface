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

## Phase 2c — final store retirement (definitive grep, 2026-08-18)

`grep -rl "tokenState" src` (non-test) after all display fixes:
my-balance-section, bitcoin-receive-modal, btc-tx-status-modal,
normal-wallet-setup-dialog, offramp-resume-handler, savings-card,
send-modal (price fallback only), send-review, use-asset-actions,
searchbar. Mostly action-time/price/identity uses; ALL are kept fresh
post-transaction by TokenStoreRefresher, so the staleness class is
mitigated app-wide today. Retiring the store = migrating these ten,
then deleting tokenState + getAllTokens + the refresher. Do as its own
chunk with this list as the checklist — do NOT claim done without
re-running the grep.

## Phase 2c DONE (branch retire-token-store, 2026-08-20) — and the junior explainer

**What we fixed, in plain words.** The app had TWO systems answering
"how much XLM/USDC do I have": the portfolio AGGREGATE (server-side,
covers both wallets, refreshes after every transaction, remembers a
snapshot for instant paint) and the legacy TOKEN STORE (browser-side,
one wallet only, refreshed only when certain pages loaded). Two
answerers = they eventually disagree — and every "my balance is
wrong/stale/empty" bug of the past week was exactly that disagreement:
whichever screen read the store showed old numbers until you happened
to reload the right page.

**Why not just refresh the store more often?** We tried (the
TokenStoreRefresher) — it shrinks the window but the disease remains:
any NEW screen might read the wrong source. The only permanent cure is
for the wrong source to have zero readers.

**How we did it (the two-commit shape, on purpose):**
1. *Commit A — move the readers.* One adapter, `useStellarTokens()`,
   serves the store's exact Token[] shape from the aggregate (issuer
   patched from config so sends/trustlines still build real assets).
   All ELEVEN reader files became a one-line swap. Provable done-state:
   `grep tokenState src` → zero non-test hits. Stale data became
   UNREACHABLE — nobody left to read it.
2. *Commit B — remove the machinery.* With zero readers, the THIRTEEN
   `getAllTokens(...)` refresh calls fed nobody: all removed (post-swap
   refreshes now ride the activity event + aggregate, which they
   already did), the TokenStoreRefresher file deleted, the drawer's
   token-loading flag now derives from the aggregate's own loading
   state. Separate commits so a regression is unambiguous: A broke a
   reader, or B broke a caller — never "somewhere in the middle".

**Deliberately left:** the store's definition inside
@normalfinance/state. It has zero callers (grep-proven) but sits next
to zustand persist versioning — deleting it belongs in a tiny
dedicated change with migration care, not at the tail of this one.

**The rule this enforces forever:** one question, one answerer. If a
new surface needs Stellar tokens, there is exactly one import that
works (`useStellarTokens`) — the easy path IS the correct path.
