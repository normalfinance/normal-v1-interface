# 37 — Savings data caching: plan

**No code yet.** Written against the two savings routes and their hook. Sizes
are S/M/L, not days.

## The evidence

From Niko's dev logs, unprompted, with a handful of users:

```
[vault-info] error: { statusCode: 429, message: 'Rate limit exceeded',
                      error: 'Too Many Requests', retryAfter: 1 }
GET /api/savings/vault-info/?network=mainnet 500 in 193ms   ← twice in one session
GET /api/savings/vault-info/?network=mainnet 200 in 7993ms  ← cold
```

Three separate problems in those four lines:

1. **DeFindex is already rate-limiting us.** Not a projection — live failures today.
2. **A 429 becomes a 500 to our users.** We have no fallback; the savings card
   simply fails.
3. **~8 s cold** (part dev-compile, but two live SDK calls underneath).

## Why this is the highest-ratio cache in the app

`vault-info` takes **no wallet address and no auth**. It returns vault name,
symbol, total deposits, APY and fees — **identical for every user**.

| Endpoint | Cache entries at 10k users | Users served per entry |
|---|---|---|
| activity (per address) | 10,000 | 1 |
| portfolio (per address) | 10,000 | 1 |
| **vault-info** | **1 per network** | **all of them** |

Every cache we've shipped so far is per-address. This one entry serves 100 % of
traffic, on the slowest endpoint, on the critical path of both the savings page
and the portfolio total. With a 60 s TTL, DeFindex sees **at most 60 call-pairs
per hour globally, at any user count**.

## The two endpoints are NOT the same problem

Treating them alike would be the mistake — same lesson as BTC needing a shorter
TTL than Solana because it carries pending transactions.

| | `vault-info` | `user-position` |
|---|---|---|
| Scope | global | per wallet |
| Changes | APY/TVL drift slowly (hourly at most) | **the instant the user deposits or withdraws** |
| Cache key | `savings:vault:<network>` | `savings:pos:<address>:<network>` |
| TTL | **120 s** | **30 s** |
| Staleness risk | cosmetic | **shows the wrong balance after a deposit — unacceptable** |
| Invalidation | none needed | **must bust on deposit/withdraw success** |

## Task 1 (S) — cache `vault-info`

- Redis key includes **network** — a testnet value must never serve mainnet.
- TTL 120 s.
- **Serve stale on upstream failure** instead of a 500. This alone fixes the
  user-visible bug: a DeFindex 429 becomes "slightly old APY", not a broken card.
- Keep the existing 10 s SDK timeouts.
- Log cache hit/miss so we can prove the 429s stopped.

**Why not longer?** APY is a headline number users compare against competitors;
2 minutes is conservative while still cutting upstream calls by ~99 %.

## Task 2 (S) — cache `user-position`, carefully

- Key per address + network. TTL 30 s.
- **A `?refresh=1` bypass with a 30 s floor**, same guard as the activity
  routes, called on deposit/withdraw success — the app already dispatches
  `POSITION_SYNC_EVENT` at both sites, so the hook has the hook point.
- **Never serve stale on failure here.** A wrong savings balance reads as lost
  money; better to show the previous client-side value than assert a stale
  server number. (This is the opposite decision to Task 1 — deliberately.)

## Task 3 (S) — stop the double-fetch

`use-savings-position` already caches client-side (5 min vault / 60 s
position). Once the server caches, the client dedupe windows should **match the
server TTLs**, or we repeat the exact bug from #22: the client re-asks precisely
as the server copy expires, so the cache never absorbs anything.

## Risks, and how each is handled

| Risk | Handling |
|---|---|
| Stale balance after a deposit | refresh bypass on the existing success event; short TTL |
| Redis down | every read is already `try/catch → fall through to upstream`; cache is an optimisation, never a dependency |
| Wrong-network data served | network in the cache key |
| Masking a real DeFindex outage | serve-stale is logged and flagged `stale: true` in the response, as the activity routes do |
| APY looks "stuck" to a user | 120 s is well under how often it moves |

## Verification

- Load savings twice inside the TTL → **one** upstream call (server log).
- Two browsers / two users → still one upstream call. *This is the proof of the
  global-cache win.*
- Force a 429 (or block DeFindex) → card shows slightly stale data, **not** a
  500.
- Deposit → balance updates **immediately** (bypass), not after 30 s.
- Switch network → no cross-contamination.

## Rollback

Both are additive: revert the TTL constants and the routes behave exactly as
today. No schema, no client contract change.

## Out of scope (deliberate)

`user-position` computes from a DeFindex events feed and does its own
reconciliation (`[user-position] computed:` in the logs). That logic is
untouched here — this plan is caching only, no maths changes.
