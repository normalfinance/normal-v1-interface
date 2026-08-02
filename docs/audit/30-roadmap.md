# 30 — Phase 3: Ranked Roadmap (PROPOSAL for the decision session)

Status: **PROPOSED 2026-07-27 — needs Niko's decisions on the 6 questions at
the end.** Built from `20-findings.md` (36 findings, scored). Sequenced into
waves; each wave is independently shippable. Effort figures are estimates for
one developer, including tests and verification, not just typing.

**Target: ~1,000 users first, then grow toward 10k.** Everything in Waves 0–3
is required for the 1k push. Wave 4 is required before 10k. Wave 5 is
strategic.

---

## Wave 0 — Compliance, ship first (½ day)

| # | Item | Why first |
|---|---|---|
| 35 | Restore sanctioned-country blocking via Vercel edge geo | Legal exposure, live today, cheap to fix. Nothing else outranks a compliance gap. |

Approach: use `req.geo.country` (edge, free, no latency) + the existing
`BLOCKED_COUNTRIES` list + `/blocked` page. Delete the dead IP-parsing and the
commented external-API code. Verify with a VPN or a forced header on staging.
**Blocked on one answer: was it disabled deliberately?** (Q1)

## Wave 1 — Quick wins (~1.5 days, 8 small PRs)

Highest priority-per-hour in the register. Each is independently revertible.

| # | Item | Est. | Impact |
|---|---|---|---|
| 22 | Solana activity: 100-credit Enhanced API → 1-credit RPC method | 3h | **3× over free tier → 20 % of it.** The single best cost fix we have |
| 16 | `wallet-info.ts` single-flight guard (+ unify with the SWR path) | 2h | kills the ~22-call stampede on every session |
| 14 | Emit the savings-updated event on deposit/withdraw success | 30m | fixes "savings looks stale" |
| P0-2 | Disable unused Supabase Realtime | 30m | frees ~98 % of database time |
| 23 | dune-sync: insert-then-swap instead of clear-then-insert | 1h | dashboard can't go blank for 4h |
| 18 | Statuspage widget: remove (nobody owns it) | 30m | drops a global script + 2 polls/min for every visitor |
| 31 | Delete Onramper key + config | 15m | dead code/secret removal |
| 36 | Remove the unreachable ADMIN_SECRET bypass | 15m | before someone "fixes" it into a real one |

**Recommendation: ship Wave 1 as one batch, reviewed as separate commits.**
Measure before/after with a HAR capture + the provider dashboards, so we can
prove the cost drop rather than assume it.

## Wave 2 — Close the open doors (~2 days)

| # | Item | Est. | Note |
|---|---|---|---|
| 1 | Auth on the two `log-transaction` write routes | 4h | proven exploitable on staging |
| 2 | Scope per-user reads to the session owner | 4h | **needs Q3** — is public-by-address intentional? |
| 3 | Auth or rate-limit `lifi/quote` + `swap/quote` | 3h | currently neither |
| 6 | Rate-limit sweep: bring coverage from 14/55 to all public routes | 4h | reuse the existing Upstash limiter |
| 30 | Declare the ~55 missing env vars in turbo.jsonc | 1h | removes the stale-build trap |

## Wave 3 — Money-path correctness (~3 days)

| # | Item | Est. | Note |
|---|---|---|---|
| 27 | Record-before-broadcast for swaps & savings (CCTP's pattern) | 1.5d | makes failures visible to support; prerequisite for #29 |
| 29 | `estimateGas` for ETH sends + idempotent retry (no double-send) | 1d | real funds risk |
| 28 | XLM fee preflight in savings | 3h | June TODO, still open |
| 26 | Fee-first: **ratify or restructure** | — | **needs Q2** |

## Wave 4 — Performance & capacity (before 10k, ~4 days)

| # | Item | Est. | Note |
|---|---|---|---|
| 13 | Kill the double round-trip (trailingSlash) | 4h | **needs Q4** — was it set for SEO? |
| 19 | Timeout + short-lived cache on session verification | 1d | removes the app-wide hang risk |
| 10 | Transaction pooling (free) | 4h | test the prepared-statements caveat first |
| 8 | Pin a dedicated RPC for the CCTP relayer | 2h | money-moving code shouldn't use free public infra |
| 20 | Consistent timeout/fallback on browser-direct provider calls | 1d | apply the aggregator's pattern |
| 24 | DB-back the Coinbase off-ramp tracking | 1d | survives device switch |
| 7/12 | Consolidate the two activity systems | 1d | hygiene, reduces future bugs |

## Wave 5 — Strategic (scheduled by decision, not by score)

| # | Item | Est. | Note |
|---|---|---|---|
| P0-1 | Layer-1 server cache (fetch once, serve all) | 1–2 weeks | mandatory between 1k and 10k; Wave 1's #22 buys the runway |
| 34 | Separate staging database | 1d | **gates Phase 5 load testing** |
| 32 | External wallets: create-Turnkey CTA (tactical) | 2d | full unblock needs #33 |
| 33 | Signature reduction: fee-bundling → USDC-first → intent/hook | 1–3 weeks | 4 sigs → 1; also unblocks #32 |

---

## Proposed schedule against the mid-August deadline

| When | What |
|---|---|
| Week 1 (now) | Wave 0 + Wave 1 + start Wave 2 |
| Week 2 | Finish Wave 2 + Wave 3 |
| Week 3 | Wave 4 + #34 staging DB |
| Week 4 | **Phase 5**: load test to 1k-equivalent, dashboards, alerts |
| After | Wave 5 strategic work, sized with the 10k push |

Waves 0–3 done → **ready for the 1k push**. Wave 4 + P0-1 → ready for 10k.

---

## Decisions needed (the 6 questions)

1. **#35 geo-blocking — deliberate or forgotten revert?** If deliberate, who
   decided and does it stand? If forgotten, I restore it in Wave 0.
   *My recommendation: restore now regardless, since it's cheap; treat a
   deliberate removal as a decision that needs to be re-made explicitly.*
2. **#26 fee-first — ratify or restructure?** Today the user signs the fee
   before the swap; if the swap fails they lose ~0.5 %.
   *My recommendation: ratify short-term (bounded, rare, refundable by
   support), and let #33's fee-bundling remove it structurally later. Cheap to
   ratify, expensive to fix twice.*
3. **#2 — is public activity-by-address intentional?** Blockchain data is
   public anyway, so this may be by design rather than a leak.
   *My recommendation: keep it public but rate-limit it; scope only the
   endpoints that expose non-chain data.*
4. **#13 — why is `trailingSlash: true` set?** If it was for SEO on marketing
   pages, we keep the setting and make the API client slash-aware instead.
   *My recommendation: assume SEO, fix the client — safer either way.*
5. **Wave 1 as one batch, or one PR at a time?**
   *My recommendation: one batch, separate commits — faster review, and the
   before/after measurement is cleaner in a single window.*
6. **Anything you want re-ordered?** The formula ranks by risk-per-effort; it
   doesn't know your business calendar (a campaign date, a partner demo, the
   Stellar relationship). If something must land first, say so and I'll
   re-sequence.
