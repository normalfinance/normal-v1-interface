# 43 — Everything done so far, explained

For a developer new to this work. Covers what was changed, why, and the
reasoning behind the decisions. Companion documents: `40-savings-explained.md`
(savings in depth), `42-tester-guide.html` (the tester-facing version).

---

## The starting point

The app worked, but it wasn't built to work *cheaply or reliably at volume*. An
audit mapped the system and produced a ranked list of findings. The theme:
**every user's browser fetched its own copy of everything**, so cost and load
grew in step with the user count.

Work has run in blocks, each shipped and tested before the next.

---

## 1. Caching — moving fetches onto our server

### The pattern

Before: browser → paid provider, once per user, per tab.
After: browser → our server → provider **once**, result shared.

That difference is the whole point. A limit enforced in the browser is a
*request*; a cache on the server is a *ceiling*. Ten tabs, three devices and an
anonymous caller all share one cached answer.

### What was cached, and the TTLs

| Data | TTL | Why that number |
|---|---|---|
| Solana / Ethereum activity | 300s | metered API keys; cost dominates |
| Stellar activity | 60s | free provider; the win is timeouts + sharing |
| Bitcoin activity | **45s** | carries *pending* transactions — a longer cache would hide an incoming payment |
| Savings vault info | 120s | APY drifts slowly, and this is **one entry for all users** |
| Savings position | 30s | value moves with yield; it's someone's balance |
| Savings history | 300s | append-only — only changes when the user transacts |

**The principle: cache each thing for as long as it actually stays true.** The
Bitcoin TTL is the clearest example — copying Solana's 300s would have been
"consistent" and wrong.

### The freshness escape hatch

A cache makes data stale exactly when it matters most: right after the user
acts. So every cached route accepts `?refresh=1`, used only after a send, swap
or deposit.

That bypass is **floored** — one forced refresh per address per 30s. These
routes are public, so an unbounded bypass would be a way for anyone to make our
server hammer a paid provider on demand. *Whenever you add a way around a
limit, ask what happens if someone loops it.*

### Two opposite failure rules

When the provider fails:

- **Vault info** serves the last known copy. An APY two minutes old beats a
  broken card.
- **A user's balance** never serves a stale copy. An old number is a false
  statement about someone's money. The UI shows a skeleton and retries.

Same system, opposite decisions, because the cost of being wrong differs.

### Rate limiting, and what we chose not to do

DeFindex limits *per second*. A cold savings load fired ~5 calls at once, so we
tripped it every time. Fixed by honouring their `retryAfter` with **exactly one
retry**, and by caching the paginated history separately.

Three constraints on that retry, each deliberate:
- **only 429s** — retrying other errors doubles our traffic during their outage;
- **exactly once, never a loop** — a retry loop under rate limiting is how a
  throttle becomes an outage;
- **their delay, capped** — honour their number, but bounded.

We rejected sequencing the calls: it also stays under the limit, while making
every cold load slower for everyone to avoid an occasional failure.

**Result:** no 429s; the position route went 8112ms → 146ms warm.

---

## 2. Loading — why things appeared in stages

Five components had the same defect: **a loading flag that covered some of the
component's data sources but not all of them.** They stopped waiting once *any*
data arrived, so the rest dropped in seconds later.

The worst example: the activity feed merges eight sources and reported only one
of them as loading.

The fix everywhere: wait for **every** source — but **only on the first paint**.
Once real data has rendered, a background refresh must never flash a skeleton
back over it. A skeleton means "I have nothing yet", never "I'm refreshing".

One structural cause sat underneath: **the portfolio page read balances from a
different source than the drawer and home hero.** Unified onto one. Two sources
for one number is why several of these bugs existed at all.

---

## 3. Correctness bugs found along the way

### Optimistic updates computed from live state

Three separate bugs, one root cause. An optimistic update (showing a change
before the blockchain confirms) was computed from a value that a background
refresh could change underneath it, so the change got applied twice:

- the deposit card's counter was never reset → subtracted the deposit twice;
- deposit and withdraw read the position *at the end* of the flow → 20 → 15 →
  **10** → 15 on a withdrawal.

**Fix: snapshot before the operation, write an absolute result.** Running it
twice now produces the same answer as running it once.

### A deposit displayed as earnings

`earnings = currentValue − totalDeposited`, and those come from different
sources. A guard existed for a lagging deposits figure, using a threshold:
`drop / previousTotal < 0.2`. A 4.24 deposit into a 10.67 position was a 28%
gap — over the cutoff — so the guard missed and the deposit showed as profit.

**Fix: replace the arbitrary percentage with the invariant.** Deposits net of
withdrawals can only fall if the user withdrew, and a withdrawal also lowers
current value. So *deposits falling while value holds* can only mean the source
is lagging. No magic number, and it can't be outgrown.

### A wallet address being silently deleted

A failed Turnkey lookup returned `null`, which read as "this isn't your wallet",
which called `disconnectWallet()` — clearing the address from **persisted**
storage. XLM, USDC and savings vanished until the user signed in again.

**Fix:** a failed lookup now throws instead of answering "no", so `false` only
ever means *confirmed* not-yours. Plus self-healing that restores the address
from Turnkey.

**The general rule: never let "I don't know" collapse into "no".**

---

## 4. Security

Two routes accepted writes from **anyone** — proven on staging, where an
unauthenticated POST reached validation instead of being rejected. Anyone could
fabricate swap and deposit records, which feed the public dashboard and the
`totalDeposited` figure users read as their savings.

**Authentication alone would not have been enough.** The wallet address arrives
in the request body, so a logged-in user could still write rows against someone
else's address. So the rule is: **the claimed address must belong to the
authenticated user**, checked against linked wallets or their Turnkey wallet.

Quote routes stay unauthenticated on purpose — prices are shown before a wallet
is connected — but now carry an IP-based ceiling, since they proxy paid
services.

### What this exposed

Adding auth surfaced two latent problems:

1. **A race.** The engines refreshed the activity feed as soon as a transaction
   returned, racing the fire-and-forget log write. It was hidden by an 800ms
   delay on the listener. Now the refresh fires *after* the write succeeds, and
   the delay is gone.
2. **Latency.** Every authenticated route verified the session with a **live
   network call to Supabase, with no timeout.** Now cached 30s, bounded at 5s,
   and de-duplicated. That last part matters beyond speed: a slow Supabase
   would previously have stalled every route at once.

**Trade-off, stated plainly:** a revoked session stays accepted for up to 30s.
Chosen over verifying the JWT locally, which would drop revocation awareness
until the token expires (~1h).

---

## 5. Structure — the chain registry

Chains were four named fields spread across 28 files, plus a separate
asset→chain map, plus a closed union type. Adding one meant finding every place
that had spelled the list out.

Now one registry describes each chain, and everything derivable derives from it.
**Adding an EVM chain (Avalanche, Base) needs no new address and no database
change** — one secp256k1 address is valid on every EVM chain. A non-EVM chain
(Cardano) needs an adapter, a column, and Turnkey signing support **verified
first**.

---

## Recurring root causes

Three patterns caused almost every bug. Worth checking in review:

1. **A loading flag covering only some of a component's data sources** — 4 bugs.
2. **Optimistic updates computed from live state, not a snapshot** — 3 bugs.
3. **Two sources for the same number** — staggered loading, vanishing XLM/USDC,
   and a wrong balance beside a Deposit button.

A fourth worth naming: **a timer standing in for a real signal.** The 800ms
delay, the retry schedules, the client dedupe windows — each was a guess about
how long something takes. Replacing each with the actual event made the code
simpler *and* faster.

---

## What is deliberately not done

- **P0-1** — swap-card balances and token prices are still browser-direct.
  Required between 1k and 10k users, not before staging.
- **#19b** — the auth cache is per server instance. A shared Redis tier is an
  upgrade with a trigger, not a correction.
- **The persisted token store** still powers the deposit card and swap card, and
  is the *unreliable* source. Retiring it removes a whole category of bug.
- **Tests.** `normalize.ts` is pure, has caused two money-display bugs, and has
  zero coverage — comments claiming otherwise were wrong. Best first suite.

## Known broken

**Bitcoin-source swaps** fail at signing. The PSBT from LI.FI contains a taproot
output and an OP_RETURN, and Turnkey rejects it. This worked before, so an
upstream format change is the leading theory. **Do not rewrite the PSBT** —
Chainflip deposits can become unrefundable. Waiting on LI.FI.
