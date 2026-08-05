# 39 — DeFindex rate limiting: plan

**Status: plan, then implement in this session.** Sized S.

## The problem, precisely

Caching removed *repeat* load. It did nothing about the **burst on a cold
read**. One cold savings page load fires, near-simultaneously:

| Route | Upstream calls |
|---|---|
| `vault-info` | `getVaultInfo`, `getVaultAPY` |
| `user-position` | `getVaultBalance`, `fetchAllEvents` (**paginated loop — 1..n**), account-position fetch |

That is ~5 requests in the same instant, and DeFindex's own error says the
limit is **per second**:

```
{ statusCode: 429, message: 'Rate limit exceeded', retryAfter: 1 }
```

So we exceed it on the very first load, every time the cache is cold.

Current behaviour is *graceful* but wrong: vault-info serves a stale copy,
user-position returns null and the UI shows a skeleton. Nothing is broken —
but the data is late and we are being throttled by a provider unnecessarily.

## Two changes, addressing different halves

### A. Honour `retryAfter` — one bounded retry

They tell us exactly how long to wait, and it is one second. A single retry
converts most of these failures into successes.

Rules, deliberately strict:

- **Only on 429.** Retrying other errors amplifies load during an outage.
- **Exactly one retry.** Never a loop — a loop under rate limiting is how a
  throttle becomes an outage.
- **Honour their `retryAfter`, capped at 2s.** Their number, not ours, but
  bounded so a large value can't blow the request timeout.
- Applied to the SDK calls *and* the raw `fetch` calls, which surface 429s
  differently (thrown object vs `res.status`).

### B. Cache the events history separately, longer

`fetchAllEvents` is the heaviest call — a **paginated loop**, so one logical
"call" can be several HTTP requests. It exists to compute `totalDeposited`.

That figure is **append-only**: it changes only when the user deposits or
withdraws, and we already force a fresh read on exactly those events via
`?refresh=1`. Re-fetching the entire history on every cold read is waste.

- Cache the **computed number**, not the raw events (smaller, simpler).
- **5 minutes**, far longer than the position's 30s, because history changes
  far less often than value.
- `?refresh=1` bypasses it too, so a deposit is reflected immediately.

## Why not the obvious third option

**Sequencing the calls instead of running them in parallel** would also stay
under a per-second limit — and it is the wrong trade. A cold load already takes
several seconds; serialising five calls would make it materially worse for
every user, to avoid a failure that a one-second retry fixes. We would be
paying a guaranteed cost to avoid an occasional one.

## Files

- **new** `src/server/defindex.ts` — the shared retry helper, used by both
  routes so the policy is defined once.
- `api/savings/vault-info/route.ts` — wrap both SDK calls.
- `api/savings/user-position/route.ts` — wrap the balance and account-position
  calls; add the events cache.

## Verification

- Cold load (restart dev, clear cache): **no 429s** in the terminal, or one
  followed by a successful retry.
- Deposit: figures still update immediately (the bypass must skip the events
  cache too).
- Second load inside 30s: no upstream calls at all.
- Force a failure (block the host): the UI degrades as before — stale vault
  figures, skeleton position — never a wrong number.

## Risk

Low. Both changes are additive and fail open: if Redis is unavailable the
route behaves exactly as today, and the retry only ever fires on a 429.
