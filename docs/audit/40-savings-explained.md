# 40 — The savings work, explained (junior-friendly)

Plain-language companion covering the whole savings workstream: caching, five
correctness bugs, and the rate-limiting fix. Written to be readable without
knowing the codebase.

---

## Where we started

Two complaints and one hidden problem:

1. Savings figures loaded seconds after everything else.
2. Numbers behaved strangely after depositing or withdrawing.
3. **DeFindex — the service providing our yield vault — had started refusing
   our requests** (`429 Rate limit exceeded`) with only a handful of users.

---

## Part 1 — Caching, and why the two endpoints got opposite rules

We ask DeFindex for two different things.

**`vault-info`** — the vault's name, total deposits, APY, fees. It takes **no
wallet address and no login**: it is *identical for every user on earth*.

**`user-position`** — *your* balance, deposits and earnings. Different for
every user.

That difference drives everything:

| | vault-info | user-position |
|---|---|---|
| Cache entries needed | **one, for everyone** | one per wallet |
| How long | 2 minutes | 30 seconds |
| If DeFindex fails | **serve the old copy** | **never serve an old copy** |

### The ratio that makes vault-info special

Every cache we had built before was per-address: ten thousand users need ten
thousand cached copies, each helping one person. `vault-info` is **one entry
serving 100 % of traffic**. Best cache ratio in the codebase, on the slowest
endpoint.

### Why the failure rules are opposite

For the vault, an APY that's two minutes old is fine — far better than a broken
card. So on failure we serve the last known copy.

For your balance, an old number is **a false statement about your money**. So
we never do that. If we can't get a real answer, the UI shows a loading
skeleton and keeps trying.

> The principle: *"I don't know yet" and "you have zero" are different
> statements, and only one is safe to guess.*

### Keeping it fresh where it matters

A 30-second cache would normally mean your balance looks unchanged for half a
minute after depositing — which looks broken. The app already announces
deposits internally, so we hook that event and force one fresh read that skips
the cache.

That bypass is **floored**: at most one forced refresh per wallet per 30
seconds. Otherwise a public endpoint that triggers an upstream call on demand
becomes a way for anyone to burn our rate limit.

---

## Part 2 — Five correctness bugs

### 1. The deposit card subtracted your deposit twice

The card optimistically subtracts what you just deposited so the figure drops
immediately rather than waiting for the blockchain. Sensible. But the counter
**only ever grew and was never cleared** — so once the real balance refreshed
(already reflecting the deposit), the same amount was subtracted *again*. It
showed 2.81 where the truth was 7.81, until a reload discarded the state.

**Fix:** clear the counter when the underlying balance actually changes.

### 2. Deposits and withdrawals applied twice

Same shape, deeper in. The optimistic update read the position **at the end**
of the flow — after signatures and network calls — and applied a delta. If a
background refresh landed during that window, the value already included the
operation, so applying the delta again double-counted it. Observed on
withdrawal: 20 → 15 → **10** → 15.

**Fix:** snapshot the position *before* the transaction, and write an absolute
result. Running it twice now produces the same answer as running it once.

> The principle: *optimistic updates must be computed from a fixed point, never
> from live state that something else can change underneath you.*

### 3. A failed read showed "0.0"

When DeFindex couldn't be reached, the route returned "no position", assuming
the browser still had a previous value to keep showing. On a **fresh** browser
there is no previous value — so it rendered a confident **0.0**.

**Fix:** if there's no cached value either, treat it as an error so the UI shows
a skeleton. Never claim someone has nothing.

### 4. Your deposit displayed as profit

The sharpest one. Earnings are `currentValue − totalDeposited`. Those two come
from different sources, and the deposits figure can lag. There was already a
guard for that, using a threshold:

```js
drop / previousTotal < 0.2   // "a small drop means the source is lagging"
```

Depositing 4.24 into a 10.67 position made the apparent drop **28 %** — over
the cutoff — so the guard didn't fire and the stale figure was accepted.
Deposits showed 10.67 against a value of 14.91, so **the deposit itself
appeared as 4.24 of earnings**.

**Fix:** replace the arbitrary percentage with the relationship that actually
holds. Deposits (net of withdrawals) can only fall if the user withdrew — and a
withdrawal also lowers the current value. So *deposits falling while value
holds or rises* can only mean the deposits source is behind. No magic number,
and it can't be outgrown by a larger deposit.

### 5. Figures painted at different times

Four components each had a loading flag that covered *some* of their data
sources but not all — so they stopped waiting once any data arrived, and the
rest dropped in seconds later.

**Fix:** wait for every source, but only on the first paint, so background
refreshes never flash a skeleton back over data you can already see.

---

## Part 3 — The rate limiting

Caching fixed *repeat* load. It never touched the **burst**.

One cold savings page load fires about five requests at once: vault info, APY,
vault balance, the account position, and the **transaction history — which is a
paginated loop**, so one logical call can be several HTTP requests. DeFindex's
limit is per *second* — their error literally says `retryAfter: 1`. So we
tripped it on the first load, every time.

### Two changes

**Ask again after the second they requested.** They tell us exactly how long to
wait. A single retry converts most of these failures into successes.

Three deliberate constraints:

- **Only on 429.** Retrying every error means that when DeFindex is genuinely
  down, we *double* our traffic at the worst moment — their bad minute becomes
  ours.
- **Exactly one retry, never a loop.** A retry loop under rate limiting is how
  a throttle turns into an outage.
- **Their delay, capped.** We honour their number, but bounded, so one slow
  call can't consume the whole request.

**Cache the transaction history separately, for longer.** It's the heaviest
call, and it feeds one number: your total deposits. That number is
**append-only** — it changes only when you deposit or withdraw, and those
already force a fresh read. Caching it for 5 minutes removes the biggest part
of the burst.

> The general rule: *cache each thing for as long as it actually stays true.*
> Position 30s (value drifts with yield), history 5 min (only moves when you
> act), vault figures 2 min (APY drifts slowly).

### What we rejected

Running the five calls **one after another** would also stay under a per-second
limit — and it's the wrong trade. A cold load already takes several seconds;
serialising would make it materially worse **for every user**, to avoid a
failure a one-second retry fixes. That's paying a guaranteed cost to avoid an
occasional one.

---

## The result, from the server logs

```
[user-position] totalDeposited from events: 11.63…          ← cold: fetched history
[user-position] totalDeposited from cached events: 11.63…   ← warm: loop skipped

GET /api/savings/user-position/…  200 in 146ms   (was 8112ms)
GET /api/savings/vault-info/…     200 in 178ms   (was 6553ms)
```

No 429s. Roughly 55× faster once warm, and DeFindex now sees a small, bounded
number of requests no matter how many users we have.

---

## Three lessons worth carrying

1. **Cache lifetime should match how long the data stays true** — not one
   global setting.
2. **Optimistic updates need a snapshot**, never live state.
3. **A loading flag must cover every source the component renders from.** This
   one alone caused four separate bugs.

## One honest gap

`normalize.ts` — the file holding the earnings calculation from bug #4 — has
**no tests**, despite comments that claimed otherwise. It's pure logic with no
network calls, which makes it the easiest thing in the codebase to test, and it
has now produced two money-display bugs. It is the strongest candidate for the
first real test suite.
