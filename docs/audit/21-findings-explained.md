# 21 — The Findings, Explained (junior-friendly companion)

Plain-language version of `20-findings.md`. Numbers (#1–#34) match, so you can
jump between the two. **Nothing here is fixed yet** — Phase 3 is where we
decide the order, Phase 4 is where we fix.

---

## First: how we decided what matters most

Every finding got three scores from 1 to 5:

- **Severity** — how bad if it happens (1 = ugly, 5 = lost money / outage /
  corrupted data)
- **Likelihood at 10k users** — how often it will actually happen (1 = rare,
  5 = every single session)
- **Effort** — how hard the fix is (1 = one line, 5 = multi-day rebuild)

Then: **Priority = Severity × Likelihood × (6 − Effort).**

Why that shape? Multiplying severity by likelihood is standard risk. The
`(6 − Effort)` part flips effort around so **cheap fixes score higher** — a
one-line fix for a daily problem beats a week-long fix for a rare one. It's
how you get the most safety per day of work. The formula orders the backlog;
it doesn't replace judgment (see "the strategic exception" below).

---

## We tested it live on staging (and what we changed mid-test)

The plan said: prove the "anyone can write to our database" hole by actually
writing a fake row, then delete it.

**We didn't do that** — because we discovered **staging uses the same
database as production**. That fake row would have landed in the *real*
database next to real users. That discovery is itself a finding (**#34**).

So we used a smarter, zero-damage trick instead. Think of it as knocking on
a locked door: send an unauthenticated request with **deliberately broken
data** and watch which complaint comes back.

- If the server says **"401 Unauthorized"** → a guard stopped us at the door.
  Safe.
- If the server says **"400 — that wallet address is invalid"** → nobody
  stopped us; we walked in, and the only thing that complained was the
  paperwork clerk *inside*. **That proves there is no guard** — and because
  our data was invalid, nothing was ever saved.

Results (all real, run 2026-07-27):

| What we tested | What came back | Meaning |
|---|---|---|
| Write to `swap/log-transaction` | **400 "Invalid wallet address"** | 🔴 No guard. Valid fake data would have been saved. |
| Write to `savings/log-transaction` | **400 "Missing required fields"** | 🔴 No guard, same story. |
| Read `wallet/activity` | **400 "Invalid wallet address"** | 🔴 No guard — a real address would have returned that user's data. |
| Price data (paid provider) | **200 + real prices** | 🔴 A total stranger gets data through the path we pay for. |
| Any URL without a trailing `/` | **308 redirect** | 🔴 Confirmed: every API call really is made twice. |

We also wanted to fire 12 rapid requests to see if any rate limiter kicked
in. The tooling blocked it as flood-like behaviour — correct, and we didn't
force it. **We answered the same question by reading the code instead**,
which is more precise: those routes have no rate limiter; `prices/history`
does; `lifi/quote` and `swap/quote` have *neither* login nor rate limit
(the worst combination); `cctp/quote` is properly protected ✅.

**Take-away: four findings moved from "we think" to "we proved."**

---

## 🔴 The biggest finding came from a question, not from code-reading

Niko mentioned "we were blocking some countries, I think it's in the
middleware." It is — and **it's all commented out**.

`middleware.ts` still contains the list of ~30 sanctioned countries (Iran,
Cuba, Russia, Belarus, Myanmar, Syria…), the location lookup, and the
redirect to a `/blocked` page. Every line of it is behind `//`. What actually
runs today: read the visitor's IP address… and then let everyone through.

**So right now anyone in a sanctioned country can use the app.** For a
financial product that's a compliance exposure, and it's completely silent —
nothing errors, nothing logs, no test fails. This is why "ask the humans what
*used* to work" is part of an audit: no amount of code-reading finds a feature
you don't know existed.

Score: Severity 5 × Likelihood 4 × cheap fix → **Priority 80, the new #1**.

The fix is *not* to uncomment it. The old code called an external geo-location
API on **every request** — a blocking network call in front of the whole app,
almost certainly why someone disabled it. Vercel already tells us the visitor's
country at the edge for free (`req.geo.country`) with zero latency. Same list,
same blocked page, none of the cost.

**One thing we need from Niko/Justin in Phase 3:** was this switched off
deliberately, or is it a debugging change someone forgot to revert? That
changes whether it's a bug or a decision.

## The top of the list, and why each is up there

**#1 — Anyone can write into our database** (Priority 64)
Two endpoints accept swap/deposit records from anybody. Nobody can steal
money with this, but they *can* invent thousands of fake swaps — the same
numbers we publish to Dune and report to Stellar. High severity, trivially
easy to exploit, cheap to fix. Top of the list.

**#22 — We're paying 100× more than we need for Solana history** (Priority 64)
Our activity feed asks Solana for history using a "premium" method costing
**100 credits per call**, when the ordinary method costs **1 credit** and
returns what we need. Every open tab does this every 30 seconds. This is the
single best cost-per-effort fix in the whole audit — and it's the cheap half
of the big architecture project, available right now without it.

**#10 — The database runs out of phone lines** (Priority 48)
Each request holds a database connection for its whole life, even while
waiting on some other service. Under a spike, hundreds of requests grab all
the lines and everything fails — *while the database sits idle*. Fix
("transaction pooling") is a connection-string change and **free**.

**P0-2 — We're paying for a feature we never use** (Priority 45)
Supabase's Realtime engine consumes ~98 % of the database's time. We don't
use Realtime anywhere. It's a settings toggle.

**#13 — Every API call is made twice** (Priority 40)
A config option makes every request bounce through a redirect first. It's a
silent tax on every screen, for every user, forever.

**#14 — The savings refresh bell has no ringer** (Priority 40)
The portfolio listens for a "savings changed" signal that **no code ever
sends**. One line to fix, and it's the named cause of "savings looks stale
after I deposit."

Below those sit the correctness ones — failed swaps leaving no record
(#27), the fee charged before the swap that might fail (#26), savings not
checking you have XLM for fees (#28) — plus reliability (#19 login checks
with no timeout, #8 the money-moving relayer on free public infrastructure)
and hygiene (#30 config, #31 dead code).

---

## The strategic exception (important)

The formula loves cheap fixes — which is exactly wrong for the *big*
foundational items. Three findings are marked **[STRATEGIC]** and get
scheduled by decision, not by score:

- **P0-1** — the fetching re-architecture (server fetches once, everyone
  shares it). It's the reason we'd survive 10k users at all.
- **#32** — external wallets (Lobstr, Freighter…) can only sign Stellar, so
  they're locked out of cross-chain swaps.
- **#33** — signature count: a Stellar→BTC swap starting from XLM asks for
  **up to 4 confirmations**. The goal is one.

They score low only because they're expensive. They still have to happen.

---

## What we checked and ruled OUT (equally important)

- Our API keys are **not** leaking to the browser — old fear, disproven.
- **No missing database indexes.** No hand-written SQL. One database client.
- **#5** — the "unauthenticated payment builder" turned out to be harmless:
  it can only build a payment *from you, that you must sign*. Cleared.

A good audit is trusted for what it rules out as much as what it finds.

---

## #34 — The new one we found by accident

**Staging shares production's database.** That's why we redesigned the test
mid-flight. It also means we currently *cannot* safely run the load test in
Phase 5 — we'd be hammering real user data. Fix: give staging its own
database (the old one is already sitting there as a backup). Needed before
Phase 5.

---

## Three mysteries solved by reading, not guessing

**#16 — why one page asks the same question 22 times.** We found *two*
different pieces of code fetching the wallet. One (the SWR hook) is written
correctly and shares a single request. The other (`wallet-info.ts`) has a
60-second cache but **no "someone is already asking" guard** — so when nine
components start at once, all nine look in the cache, all nine find it empty
(the first answer hasn't arrived yet), and all nine send their own request.
It's like nine people checking an empty fridge simultaneously and each driving
to the shop. Fix: remember the *trip in progress*, not just the result. This
made the fix **cheaper** than we'd estimated, so it ranked up.

**#21 — the cron overlap worry: CLEARED ✅.** We suspected two overlapping
robot runs could mint the same transfer twice. They can't: every step updates
the row *only if it's still in the expected state* and checks whether it won
("compare-and-swap"). The loser does nothing. There's even a rollback if the
mint fails. This is textbook-correct concurrent code — **removed from the
list.** Ruling things out is a real result.

**#29 — ETH/SOL sending: two genuine defects.**
- The gas amount is **hardcoded to 21000**, which is only correct when sending
  to a normal wallet. Send to a *contract* address (many exchange deposit
  addresses are contracts) and it runs out of gas — the user pays for a
  failure.
- Worse: if the network drops **after** the transaction was accepted but
  before we hear back, the app shows "failed" while it actually succeeded. The
  user retries, a fresh nonce is used, and **the money goes twice**. Bitcoin
  doesn't have this problem because it goes through our server and gets
  recorded.

## The money question: what happens at 1k vs 10k users

Niko's decision: grow to ~1,000 users first, optimise now, no Supabase
upgrade yet. So we recalculated both columns.

| Provider | Free limit | At 1k users | At 10k users |
|---|---|---|---|
| Alchemy (Ethereum) | 30M units | ~22M — **fits, barely (73 %)** | ~220M — **7× over** |
| Helius (Solana) | 1M credits | ~3M — **3× OVER already** 🔴 | ~30M — **30× over** |

Helius is the only one already broken at our next milestone. And **finding
#22 alone fixes it**: switching that one Solana call from the 100-credit
method to the 1-credit method takes us from **3× over the limit** to **using
20 % of it**. One change, and Solana stops being a problem until well past 1k.

That's the whole argument for the ranking in one number.

## Where this goes next

**26 findings scored · 4 proven live on staging · 4 ruled out · 5 parked on
questions only Niko/Justin can answer.**

Phase 3 is a working session where we walk the ranked list together and
decide the order — including which risks we *accept* (like the fee-first
trade-off) rather than fix. Then Phase 4 fixes them, one small pull request
each, measured before and after.
