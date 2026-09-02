# 33 — XLM + BTC activity behind our server (#38a): implementation plan

Written after reading `fetchStellarPayments` and `fetchBtcActivity` in full.
No estimates in days — tasks are sized **S / M / L** and ordered.

## What we're doing and why

Today the browser calls **Horizon** (Stellar) and **mempool.space** (Bitcoin)
directly. That means: no shared cache, no timeout, no failure handling we
control, and every tab/device repeats the work. Solana and Ethereum already go
through our server, which is the only reason the Wave-1 cache fix could help
them at all.

Four wins, in the order they actually matter here:

1. **Timeout control** — we can bound a call made from our server. We cannot
   bound one made from a stranger's browser.
2. **Enables the single skeleton** (#37) — gating the UI on "everything ready"
   is only safe once every source has a deadline.
3. **Shared cache** — one answer serves every tab, device and view.
4. **Cost** — smallest factor here, unlike Solana: Horizon and mempool.space
   are free public infrastructure, not metered keys.

## ⚠️ The risk this introduces (and the mitigation)

**Concentration risk.** Today these calls come from thousands of *user* IPs.
Routing them through our server concentrates them onto a handful of Vercel
egress IPs — the same shared-IP exposure already flagged for CoinGecko. A
provider rate-limits per IP, so we could hit limits we never saw before.

Mitigations, in the build:
- the cache is the primary defence (fewer upstream calls per address);
- a **short-circuit on cache miss storms** is unnecessary if TTLs are sane, so
  we pick TTLs deliberately rather than copying Solana's 300 s;
- we keep the client's existing `catch → return []` behaviour, so a rate-limit
  response degrades to "no rows" exactly as a network error does today —
  never a crash;
- if limits are hit in practice, the escalation path is a paid/self-hosted
  Horizon, which is a config change, not a rewrite.

## Per-chain TTLs — deliberately different, and why

| Chain | TTL | Reasoning |
|---|---|---|
| **XLM** | **60 s** | Horizon is free, so cost isn't the driver — protection and timeouts are. 60 s keeps the feed feeling live while collapsing tab/device duplication. |
| **BTC** | **45 s** | **Pending transactions are the constraint.** `fetchBtcActivity` reads `/txs/mempool` as ground truth for unconfirmed txs and renders them with `confirmed: false`. A 5-minute cache would hide an incoming payment for 5 minutes — a UX regression disguised as an optimisation. |
| *(SOL/ETH)* | *300 s* | *already shipped — those are metered keys, so cost dominates* |

Both keep the `?refresh=1` bypass with a 30 s floor, same as Wave 1, so a
just-sent transaction still appears instantly.

**This is the key design decision: copying Solana's 300 s to BTC would have
been the "consistent" choice and the wrong one.**

## Behaviour that must survive the move (verified in the current code)

Stellar (`fetchStellarPayments`):
- **XLM *and* USDC** are both included — `asset_type === 'native'` OR
  (`asset_code === 'USDC'` AND issuer matches config). ✅ Niko's "USDC as
  well" is already covered; the move must not drop it.
- Only `record.type === 'payment'` rows.
- **Payments to `FEES_WALLET` are filtered out** — our own fee collection must
  not appear as user activity. Easy to lose in a port; explicitly preserved.
- `limit(100)`, newest first.
- Failure → `[]` (never throws into the UI).

Bitcoin (`fetchBtcActivity`):
- **Two** upstream calls in parallel: `/txs` and `/txs/mempool`.
- Mempool is the **authority** for unconfirmed status; `/txs` alone can drop
  older unconfirmed txs.
- Sent vs received computed from inputs/outputs; self-transfers handled.
- `confirmed: false` + `timestamp: Date.now()` for pending.
- Failure → `[]`.

## The build

**Step 1 (S).** `GET /api/activity/stellar?address=…&refresh=1`
Move `fetchStellarPayments` server-side verbatim (same filters, same
normalisation), resolve config with `getStellarConfigForNetwork` like other
server routes, add Redis cache (60 s) + refresh floor (30 s), add an
`AbortSignal.timeout` on the Horizon call.

**Step 2 (S).** `GET /api/activity/bitcoin?address=…&refresh=1`
Same shape; keeps both upstream calls and the mempool-authority logic; 45 s
cache; timeout on both fetches.

**Step 3 (S).** Client: point the two SWRs at the new routes via the existing
`fetchChainActivity`, delete the two browser-side fetchers, and extend the
`nf:activity-updated` handler to refresh all four chains.

**Step 4 (S).** Address validation on both routes (reject malformed input
before spending an upstream call), mirroring the SOL/ETH routes.

## Verification

- Feed shows the same XLM, **USDC** and BTC rows as before (same amounts,
  directions, dates); fee-wallet payments still absent.
- Send XLM → appears immediately (refresh bypass).
- **Receive BTC → pending row appears within ~45 s and flips to confirmed.**
- Two tabs → one upstream call.
- Kill network to a provider → empty rows, no crash, no hang.

## Rollback

Each step is independent. The client change is the only user-visible one; the
old fetchers are removed in the same commit, so rollback = revert that commit.
