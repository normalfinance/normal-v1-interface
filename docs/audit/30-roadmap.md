# 30 — Roadmap (reordered 2026-07-27, v2)

Built from `20-findings.md` (39 findings). **No day estimates** — earlier ones
were unreliable, so work is sized **S / M / L** and, more usefully, *ordered*:
each block is chosen so it makes the next block cheaper or safer.

**Target: ~1,000 users first, then grow toward 10k.** Supabase Pro deferred by
decision.

### What changed in v2 and why
- **User-visible quality moved up.** The staggered-loading fix (#37) and the
  XLM/BTC routes (#38a) were sitting behind big projects. They're now Block B,
  right after the work already in flight. Reason: they're what users actually
  see, and they're small.
- **#38 split.** #38a (two proxy routes) is S and no longer trapped inside the
  L-sized P0-1. #38b (balances/prices) stays with P0-1 where it belongs.
- **Chain registry (#39) promoted out of "strategic"** into its own block with
  a trigger condition — it must land *before* Cardano/Avalanche, not after.
- **Cleanups demoted.** #23/#18/#31/#36 were ordered first because they were
  easy, which is a bad reason. They're now filler, done whenever convenient.

---

## ✅ Block A — Done, awaiting verification

| # | Item | Note |
|---|---|---|
| 22 | SOL/ETH activity cache TTL 30 s → 300 s + `?refresh=1` (30 s floor) | Helius was 3× over free tier at 1k users |
| 16 | Single-flight guard on the Turnkey wallet lookup | ~22 requests/session → 1–2 |
| ~~14~~ | *withdrawn — false positive, no code written* | |

## ▶ Block B — Loading & the two remaining chains (next)

Ordered so each step makes the following one smaller.

| Step | # | Item | Size | Why this position |
|---|---|---|---|---|
| B1 | **38a** | XLM + BTC activity behind our server (plan: `33-xlm-btc-plan.md`) | S | XLM is the primary chain and today it's browser-direct, 100 records, **no timeout**. Includes **XLM *and* USDC** payments (already supported — must not regress) |
| B2 | 20 | Timeouts + fallback on provider calls | M | Far smaller after B1: bounding a server call is trivial, bounding a browser call is not |
| B3 | 37 | One skeleton until user data is ready | S | Only *safe* after B2 — gating on an unbounded call would freeze the whole screen instead of one row |

**Savings needs no work here.** `use-savings-position` is already the
best-behaved hook in the app (5-min vault cache, 60 s position, real
timeouts). It only needs to be *included* in B3's ready-state. Doing the
skeleton after the rest isn't risky — doing it *before* B2 would be.

## Block C — Close the open doors

| # | Item | Size | Note |
|---|---|---|---|
| 1 | Auth on the two `log-transaction` write routes | S | proven exploitable on staging |
| 3 | Auth/rate-limit `lifi/quote` + `swap/quote` | S | currently neither |
| 6 | Rate-limit sweep across public routes | M | 14/55 covered today |
| 2 | Scope per-user reads | S | **needs decision Q3** — chain data is public anyway |
| 30 | Declare missing env vars in turbo.jsonc | S | removes the stale-build trap |

## Block D — Compliance (decision-gated, then immediate)

| # | Item | Size | Note |
|---|---|---|---|
| 35 | Restore sanctioned-country blocking via Vercel edge geo | S | **The work is small; the decision isn't mine.** Kept out of Block B only because restoring it changes who can use the product. The moment Q1 is answered this jumps to the front |

## Block E — Money-path correctness

| # | Item | Size | Note |
|---|---|---|---|
| 27 | Record-before-broadcast for swaps & savings | M | CCTP's proven pattern; prerequisite for #29 |
| 29 | `estimateGas` + idempotent retry (ETH/SOL double-send) | M | real funds risk |
| 28 | XLM fee preflight in savings | S | June TODO |
| 26 | Fee-first: ratify or restructure | — | **decision Q2** |

## Block F — Before new assets (trigger-based, not date-based)

| # | Item | Size | Trigger |
|---|---|---|---|
| 39 | Chain registry + `Record<ChainId,…>` addresses + chain-parameterised EVM adapter | M | **Do this before adding Cardano/Avalanche.** Today each new chain = ~28 file edits (measured). After: an EVM chain ≈ one registry entry. Avalanche is EVM-compatible and would be nearly free; **Cardano needs Turnkey signing support verified first — do not assume it exists** |

## Block G — Capacity (before the 10k push)

| # | Item | Size |
|---|---|---|
| 10 | Transaction pooling (free tier compatible) | S |
| 19 | Timeout + short cache on session verification | M |
| 8 | Pin a dedicated RPC for the CCTP relayer | S |
| 13 | Kill the double round-trip (trailingSlash) | S — **needs decision Q4** |
| 24 | DB-back Coinbase off-ramp tracking | M |
| 7/12 | Consolidate the two activity systems (+ move the misfiled `hooks/stellar/use-user-activity.ts`) | M |

## Block H — Strategic

| # | Item | Size |
|---|---|---|
| P0-1 | Layer-1 cache: balances, prices, portfolio, event-driven refresh (**includes #38b**) | L — mandatory between 1k and 10k |
| 34 | Separate staging database | S — **gates load testing** |
| 32 | External wallets: create-Turnkey CTA | M |
| 33 | Signature reduction: fee-bundling → USDC-first → intent/hook | L — 4 sigs → 1 |

## Filler — do whenever convenient

#23 dune-sync insert-then-swap · #18 remove the unowned Statuspage widget ·
#31 delete Onramper leftovers · #36 delete the unreachable admin bypass.
*(Previously scheduled first purely because they were easy — a bad reason.)*

---

## Open decisions

1. **#35** — was geo-blocking disabled deliberately or forgotten? *(gates Block D)*
2. **#26** — ratify the fee-first risk or restructure it? *(recommend: ratify now, remove structurally via #33)*
3. **#2** — is public activity-by-address intentional? *(recommend: keep public, rate-limit)*
4. **#13** — is `trailingSlash: true` there for SEO? *(recommend: assume yes, fix the client instead)*
5. **New assets** — are Cardano/Avalanche actually planned? If yes, Block F moves up.
