# 62 — Balance freshness after sends & swaps: plan (CONFIRMED)

**Branch:** `fix/balance-freshness` · confirmed by Niko 2026-08-12 after two
design corrections of his: (1) "Done" must not display before the funds are
verified refreshed, (2) stale balances must not let a user MAX-spend money
already committed. Both are in this design.

## The root cause (verified)

- Send flow refreshes balances on a TIMER (0s / +8s / +45s,
  `lib/tx-events.ts`). The 0s shot runs BEFORE the chain confirms → caches
  the OLD balance AND starts the server bypass floor → the +8s shot gets the
  stale cache → truth often waits for +45s. Timer-instead-of-signal, the 6th
  occurrence of this root-cause family.
- LI.FI engine shows "done" the moment the bridge reports it, but never
  refetches the DESTINATION chain (the CCTP engine does — `refetchChain` on
  finish; LI.FI receives the same prop and only uses it for setup).

## Design

**A — gate "Done" on arrival refresh (LI.FI).** In `lifi-tracker`, when the
bridge reports DONE: run a new `onArrival` handler (the engine passes a
cache-bypassed `refetchChain(destinationChain)`), capped at 10s
(`Promise.race`), and only THEN set stage 'done' + fire the snackbar. The
modal keeps showing the bridging/arriving state until balances are real. The
cap is the safety valve: a hiccuping refetch must not make a SUCCESSFUL swap
look stuck — after 10s we show done regardless (funds ARE on-chain).
Deliberately NOT comparing before/after balance numbers — slippage, fees,
and concurrent activity make that comparison lie.

**B — confirmation-driven refresh for sends (ETH/SOL).** New client lib
`lib/send-confirmation.ts`: after broadcast, poll the chain DIRECTLY (public
RPC — no server cache, no floor): ETH receipt every 5s (cap 90s), SOL
signature status every 2s (cap 60s). On settle → ONE chain-scoped refresh
(`announceConfirmation` in tx-events — single dispatch, no follow-ups, no
pending-row re-add). The refresh now fires exactly when the chain guarantees
the new balance is readable. Existing timer shots stay (XLM/BTC and the
activity feed rely on them). Success copy gains the honest exchange note:
on-chain delivery is visible; an exchange crediting its internal ledger
never is.

**C — spendable = balance − pending outflows.** New `lib/spendable.ts`:
- NO optimistic writes to any store (the #52/#55 disease). A pure, derived
  adjustment recomputed per render from ledgers that already exist:
  pending-send rows (chain+symbol+amount, localStorage, cross-tab) plus a
  module registry of in-flight LI.FI swap source amounts (registered by the
  tracker on start, cleared on terminal).
- `usePendingOutflow(chain, symbol)` hook (useSyncExternalStore over both
  sources) wired into: send-modal's `spendableBalance` memo and swap-card's
  `fromBalance` (one line each — every engine inherits it).
- Effect: displays may lag seconds; the app can never OFFER committed money.
  Self-healing: rows clear on activity reconcile/expiry → adjustment
  vanishes, no reconciliation code.
- CCTP source legs excluded (source tx confirms before a user could act;
  chain rejection + #29 preflight remain the backstop) — documented, not
  silent.

## Scenario table

As presented and confirmed in chat (10 scenarios) — the load-bearing ones:
reject "Done before funds visible" (A), reject "MAX on stale balance" (C),
double-sends already impossible (#29 guard), money never at risk in any
missed exotic race (chain rejects overspends).

## Files

- `sections/swap/engines/lifi-tracker.ts` — `onArrival` gate + outflow
  register/clear; `use-lifi-engine.tsx` — pass arrival refetch
- **new** `lib/send-confirmation.ts`; `lib/tx-events.ts` —
  `announceConfirmation`; both send adapters — start watcher;
  `send-review.tsx` — exchange copy
- **new** `lib/spendable.ts`; `send-modal.tsx` + `swap-card.tsx` — wire
- tests: spendable summation/filtering; confirmation interpreters (pure)

No schema change, no new routes, no cron change.
