# 66 — P0-1 Layer-1 cache: plan

**Branch:** `feat/layer1-cache` · GO given 2026-08-12. The [STRATEGIC]
register item marked "mandatory between 1k and 10k users."

## Verified starting point (recon, not assumption)

Layer-1 largely EXISTS: `/api/wallet/portfolio` (server aggregator, 15s
response cache + 1h stale snapshot + refresh=1 bypass with 5s floor) and
`useWalletBalances` (ONE deduped SWR over it, localStorage first-paint,
event-driven bypassed refresh, 30s poll). The portfolio page rides it.

The remaining browser-direct gap — what P0-1 actually is:

- `use-btc-portfolio`: every mount fetches mempool.space (balance + price)
  from the BROWSER, per user, per view.
- `use-chain-portfolio` (ETH/SOL): every mount fetches public JSON-RPC
  `eth_getBalance` / `getBalance` from the browser.
- Consumers: swap-card (mounts all three, always), send-modal, #62's
  `refetchChain`.

Cause → effect at scale: cost and rate-limit exposure grow linearly with
OPEN VIEWS, not users — the swap page alone fires 3 provider calls per
mount per user. After this batch, those views share the one server
aggregate everyone else already uses: cost grows with the CACHE WINDOW,
not the user count.

**Latent bug found during recon (fixed here):** swap-card's `refetchChain`
— which #62's arrival gate AWAITS before showing "Done" — calls
`refetch()`, which refreshes Turnkey ADDRESSES, not balances. The balance
only updated via the background activity event, so the await guaranteed
less than designed.

## Design

1. **`useWalletBalances` gains `refreshFresh(): Promise<void>`** — an
   awaitable, `refresh=1` (server-cache-bypassing) revalidation of the one
   shared key. This is what arrival gates and post-action refreshes need.
2. **The three per-chain hooks become thin selectors** over
   `useWalletBalances` + `useTurnkeyWallet` (addresses/hasWallet keep their
   source): same exported interfaces (`btcToken`, `ethereumAddress`,
   `loading`, `error`, `refetch`, `refetchBalance`, …) so swap-card,
   send-modal, and #62 wiring keep working — but zero browser-direct
   provider calls and zero per-hook event listeners (the shared hook
   already refreshes on `nf:activity-updated` with the bypass).
   - Token shape preserved via a pure mapper (`PortfolioAsset` → `Token`),
     unit-tested: sentinel contracts (`__btc__` …), icons, decimals,
     `change24h` → `percentageChange`.
   - `error` maps from the aggregate's per-asset `status === 'error'`;
     `stale` values still display (server stale-snapshot ≥ the old
     keep-last-known behavior).
3. **`refetchChain` rewired to `refetchBalance`** (now = `refreshFresh`) —
   the #62 "Done waits for real balances" guarantee becomes true end to
   end: bridge DONE → awaited bypassed aggregate refresh → Done shown.
4. **Deliberately KEPT browser-direct** (documented exceptions):
   - `fetchEthBalance`/`fetchSolBalance` exports — coinbase-offramp-modal's
     ACTION-TIME preflight (the data-layer rule: display reads share the
     cache; action-time freshness keeps its own live read).
   - `ETH_RPC_URL`/`SOL_RPC_URL` exports — tx-confirmation probing
     (lifi-tracker, send-confirmation): per-action, chain-truth reads.
   - mempool.space FEE quote in send-modal — a per-action fee estimate.
   - BTC balance loses its browser path entirely (server aggregate covers
     it; no action-time BTC preflight exists).

## Every scenario

| Scenario | Behavior after |
|---|---|
| Swap page + send modal + portfolio open at once | ONE portfolio request (shared SWR), previously 1 + up to 4 browser-direct calls |
| Send/swap settles | confirmation event → one bypassed refresh of the shared aggregate (floored server-side) |
| LI.FI swap DONE (#62 gate) | awaits the bypassed refresh — now genuinely balances, not addresses |
| Provider down for one chain | server stale-snapshot serves last-good marked `stale`; UI keeps numbers (old BTC behavior, now for all chains) |
| RPC error on one chain | `error` flag per asset; ETH/SOL hooks expose it exactly as before |
| External (Lobstr) user | authed route works off the session; no Turnkey row → native tokens null (unchanged) |
| Off-ramp MAX preflight | still a live direct read (action-time exception) |
| Testnet | network in the SWR key and route param (unchanged) |
| Signed-out edge | hooks `enabled` gating unchanged; route 401 → SWR keeps previous data, no confident zeros |

## Files

- `hooks/use-wallet-balances.ts` — `refreshFresh`
- `hooks/use-btc-portfolio.ts`, `hooks/use-chain-portfolio.ts` — selector
  rewrite (RPC-URL + action-time exports kept)
- **new** `lib/portfolio/native-token.ts` + tests
- `sections/swap/swap-card.tsx` — `refetchChain` → `refetchBalance`
- docs/register/memory

No routes, no schema, no cron changes.
