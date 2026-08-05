# 30 — Roadmap (v3, 2026-08-05)

**This file is the schedule. `20-findings.md` is the evidence register.**
A finding recorded there is NOT scheduled until it appears here.

Sized **S / M / L**, not days. Ordered so each block makes the next cheaper or
safer. Target: ~1,000 users first, then toward 10k.

> **Working rule (added after this drifted twice):** anything discovered while
> working gets added to this file in the same session it is found, with a
> status. "Recorded in the findings register" is not the same as "scheduled".

---

## ✅ DONE — shipped and verified by Niko

| # | Item |
|---|---|
| 22 | SOL/ETH activity cache 30s → 300s + `?refresh=1` (30s floor) |
| 16 | Single-flight guard on the Turnkey wallet lookup (~22 req/session → 1–2) |
| 38a | XLM + BTC activity behind our own routes (60s / 45s TTL) |
| 20* | Timeouts on BTC balance calls + no-clobber on failure (*partial — see G*) |
| 37 | Loading states: activity feed, drawer token list, portfolio holdings, home hero, savings page |
| 39 | Chain registry + full migration (add-account 24→4, turnkey/wallet 13→0, turnkey/import 20→5, drawer 19→2, activity hook, lifi/execute, aggregator 9→1) |
| — | **Wallet data-loss fix**: a failed Turnkey lookup was read as "not your wallet" and wiped the persisted Stellar address |
| — | **Portfolio page unified** onto usePortfolio (was reading the token store) |
| — | **Savings caching**: vault-info 120s + 1h stale fallback; user-position 30s + refresh bypass + floor, never stale; client dedupe 60s → 20s |
| — | **Savings correctness (4 bugs)**: spentOnDeposits never reset; optimistic writes from live state; null position rendering 0.0; reconcile threshold letting a deposit display as earnings |

## ▶ NEXT — in order

### 1. DeFindex 429 burst (S) — *found 2026-08-05, unfixed*
Caching removed repeat load but not the **burst**: a cold savings load fires ~5
upstream calls at once (vault-info 2; user-position: getVaultBalance +
fetchAllEvents **paginated loop** + accountPosition). Their limit is per-second
(`retryAfter: 1`). Currently *handled* (stale vault figures, skeleton for
position) but still exceeded.
**Fix:** honour `retryAfter` with one backoff retry + cache the events history
separately with a longer TTL (append-only; `refresh=1` covers changes).
**Not:** sequencing the calls — trades a rare failure for a guaranteed slowdown.

### 2. Block C — close the open doors (M)
| # | Item | Note |
|---|---|---|
| 1 | Auth on `swap/log-transaction` + `savings/log-transaction` | proven exploitable on staging. **Now also a money-correctness issue**: these feed `vault_deposits` → `totalDeposited` |
| 3 | Auth/rate-limit `lifi/quote` + `swap/quote` | currently neither |
| 6 | Rate-limit sweep | 14/55 routes covered |
| 30 | Declare ~55 missing env vars in turbo.jsonc | stale-build trap |
| 2 | Scope per-user reads | **needs decision** — chain data is public anyway |

### 3. Retire the persisted token store (M) — *own session, own test round*
The deposit card and swap card still read it, and it is the **unreliable**
source (showed 2.81 against the correct 7.81). Root cause behind the staggered
loading, the XLM/USDC disappearance and a wrong balance beside a Deposit button.
Unblocks the send-modal registry migration. **Removes a category of bug, not an
instance.**

### 4. Test infrastructure (S–M) — *found 2026-08-05*
`normalize.ts` is pure, has caused **two** money-display bugs, and has **zero**
coverage. Comments claiming it was unit-tested were false; no runner is
configured (jest sits in root devDeps only). Best first suite in the codebase.

### 5. #40 — drawer shows one wallet (S–M)
Importing a Normal Stellar wallet hides the Turnkey one. **Verified cosmetic**
(DB keeps both). Fix = a wallet list; pairs with account-drawer work.

## Block E — money-path correctness (M–L)
| # | Item |
|---|---|
| 27 | Record-before-broadcast for swaps & savings (failed swaps leave no server trace) |
| 29 | ETH `estimateGas` (hardcoded 21000 breaks contract destinations) + idempotent retry (lost response can **double send**) |
| 28 | XLM fee preflight in savings |
| 26 | Fee-first: **ratify or restructure** — decision |

## Block G — capacity (before the 10k push)
| # | Item |
|---|---|
| 13 | Kill the double round-trip (`trailingSlash`) — **needs decision** |
| 19 | Timeout + short cache on session verification (35 routes, no timeout today) |
| 10 | Transaction pooling (free tier compatible) |
| 8 | Pin a dedicated RPC for the CCTP relayer |
| 20 | Finish timeouts/fallback on remaining browser-direct calls |
| 24 | DB-back Coinbase off-ramp tracking (device-local today) |
| 7/12 | Consolidate the two activity systems (+ move the misfiled `hooks/stellar/use-user-activity.ts`) |

## Block H — strategic
| # | Item |
|---|---|
| P0-1 | Layer-1 cache: swap-card balances + token prices still browser-direct (**#38b**). Mandatory between 1k and 10k |
| 34 | Separate staging database — **staging currently uses PRODUCTION**; gates load testing |
| 32 | External wallets: create-Turnkey CTA |
| 33 | Signature reduction: fee-bundling → USDC-first → intent/hook (4 sigs → 1) |

## ⏸ BLOCKED on other people
| Item | Waiting on |
|---|---|
| **BTC swaps (regression)** — worked before; PSBT valid but contains taproot (5120) + OP_RETURN; Turnkey returns `UnrecognizedScript`. **Ask LI.FI first.** NEVER rewrite the PSBT | LI.FI |
| **#35 geo-blocking** — `BLOCKED_COUNTRIES`, geo lookup and `/blocked` are ALL commented out; sanctioned countries can use the app today. Fix = Vercel edge `req.geo.country` | Niko's team |
| RPC provider recommendations / partner pricing | Turnkey |
| ~~P0-9 Supabase Pro~~ | **deferred by decision** until closer to 10k |

## Filler — whenever convenient
#23 dune-sync insert-then-swap · #18 remove the unowned Statuspage widget ·
#31 delete Onramper leftovers · #36 delete the unreachable ADMIN_SECRET bypass ·
`pino-pretty` dev warning noise.

## Recurring root causes — check these in review
1. **A loading flag covering only some of a component's data sources** → 4 bugs.
2. **Optimistic updates computed from live state, not a snapshot** → 3 bugs.
3. **Two sources for the same number** → staggered loading, vanishing XLM/USDC,
   wrong balance next to a Deposit button.
