# 32 — What We Fixed in Wave 1, Explained (junior-friendly)

Plain-language companion to `31-implementation-plan.md`. Covers the first
batch of actual code changes from the optimisation project — what was broken,
why it mattered, what we changed, and why we chose that fix over the
alternatives.

**Where this sits:** Phase 0 measured, Phase 1 mapped, Phase 2 verified and
ranked, Phase 3 decided the order. This is **Phase 4 — fixing**, first batch.

---

## The background: why these two fixes, first

We ranked 36 findings by `Severity × Likelihood × (6 − Effort)`. Two of the
highest scores were both about **the same underlying disease**: the app asks
outside services for the same information over and over.

That matters because those services are metered:

- **Helius** (Solana data) gives us 1,000,000 credits/month free. We measured
  ~3,000 credits per active user per month → at 1,000 users that's 3,000,000.
  **We were already 3× over the free limit at our very next milestone.**
- **Etherscan** (Ethereum data) has request-rate limits on the same principle.

So the goal wasn't "make it feel faster" — it was **stop paying for the same
answer twice**, before growth makes it a bill.

---

## Fix 1 — The cache that expired exactly when it was needed (#22)

### The problem

Our server keeps a short-term copy ("cache") of each user's transaction
history so it doesn't have to re-ask Helius every time. That copy was set to
live for **30 seconds**.

Meanwhile, the browser was told: *"don't re-ask for the same thing more often
than every 30 seconds."*

Read those two numbers again — **they're identical**. That's the bug.

Think of a shop that throws away its stock every 30 minutes, and customers who
come in every 30 minutes. Almost every customer arrives just after the stock
was binned, so the shop re-orders from the supplier *every single time*. The
shelf exists, it's just always empty at the exact moment someone looks.

That's what was happening: the browser waited its 30 seconds, asked again, and
the cached copy had *just* expired — so the server paid Helius ~100 credits
for a fresh answer. Nearly every request went to the supplier.

### What we changed

**The cached copy now lives 5 minutes instead of 30 seconds**, and the browser
was told to match (don't re-ask within 5 minutes). Now roughly 1 request in 10
reaches Helius; the other 9 are served instantly from our own cache.

### Why the cache and not the browser

We could have just told the browser to ask less often. We didn't, because **a
browser setting only controls our own app**. Open a second tab, use a phone as
well as a laptop, or be a stranger calling the URL directly (this endpoint is
public), and the browser setting protects nothing.

The cache lives **on our server**, so the limit is *per wallet address*, not
per visitor. Ten tabs, three devices and a stranger all share the same cached
answer. **That's the difference between a polite request and an actual
ceiling** — always prefer the ceiling.

### The problem that created, and how we solved it

Longer cache = staler data. If you send SOL and your history is cached for 5
minutes, your own transaction doesn't show up. Unacceptable.

So we added a "skip the cache, get me a fresh answer" flag (`?refresh=1`)
that's used **only right after you do something** — a send, a swap. Result:

- **99 % of requests** (just looking at the screen) → cheap cached copy
- **1 % of requests** (you just acted) → fresh, instant

### The security detail that matters

That flag lives on a **public** endpoint — no login required (that's a
separate finding, #2). So anyone could call `?refresh=1` in a loop and force
us to pay Helius repeatedly. A cost-saving fix would have opened a
cost-*attack*.

So the flag has a **floor**: after a forced refresh, that address can't force
another for 30 seconds. Worst case is now exactly what it was before the
change — we made the normal path 10× cheaper and the abuse path no worse.

> **Principle worth keeping:** when you add a way to bypass a limit, always
> ask "what happens if someone does this in a loop?" Then bound it.

---

## Fix 2 — Nine people driving to the shop at once (#16)

### The problem

One function, `getTurnkeyWalletInfo()`, tells the app which wallet you have.
Nine different parts of the app call it: the signing paths, the send screens
for Ethereum and Solana, the CCTP swap engine, LI.FI, MoneyGram, the
onboarding wizard, and the import flow.

It already had a cache: *"if I asked in the last 60 seconds, reuse the
answer."* Sensible — but it remembered **the answer**, not **the question in
progress**.

So when a page loads and all nine callers run in the same instant: caller 1
checks the cache — empty — and sends a request. Caller 2 checks a
millisecond later — **still empty, because caller 1's answer hasn't come back
yet** — and sends its own. And so on. Nine requests for one piece of
information.

The fridge analogy: nine flatmates open the fridge at the same moment, all see
no milk, and all nine drive to the shop. Nobody was wrong; nobody knew someone
else had already left.

This is called a **cache stampede**, and it's why one page load was making
~22 requests where 3 were expected.

### What we changed

We now remember **the trip in progress**, not just the milk. The first caller
starts the request and puts a note on the fridge: *"I'm at the shop."* Callers
2–9 see the note and wait for that same trip to return. One request, nine
happy callers.

In code this is the **single-flight** pattern: store the in-flight promise and
hand the same one to every concurrent caller. About ten lines.

### Why we didn't do the "proper" refactor

There's a tidier end-state: make all nine callers use the existing SWR hook,
which already handles this correctly. We deliberately didn't — those nine
callers sit in **money-moving code** (signing, swaps, bridging). Rewriting all
of them to fix a *performance* problem risks a *funds* problem.

> **Principle:** match the blast radius of the fix to the severity of the bug.
> A performance issue doesn't earn the right to touch signing code.

The unification stays on the roadmap as its own task, where it gets reviewed
on its own merits.

Two small details in the fix that are easy to miss:

- When something invalidates the cache (e.g. you just imported a wallet), we
  also **cancel the in-flight request** — it was asked before the import, so
  its answer is already wrong.
- When a request finishes, it only clears the "someone's at the shop" note
  **if it's still the current one**. Otherwise a slow old request could wipe a
  newer one's note and restart the stampede.

---

## The two things we were wrong about (and caught before writing code)

This is the part worth internalising as a junior: **the audit note is not the
truth — the code is.** Both fixes changed shape once we opened the files.

### Wrong #1: the Solana fix we planned would have made things worse

The audit said: *"we use a 100-credit premium method; the ordinary one costs 1
credit — swap it."* Reading the actual code, that was wrong. The cheap method
returns only transaction **IDs**. To show what the UI shows (amount, sender,
direction) you'd then need one more call per transaction — 25 more calls,
~26 credits, not 1 — **plus** writing our own parser for raw Solana
transactions. More code, more bugs, a quarter of the benefit.

The real waste was never the method. It was the 30-second cache.

### Wrong #2: a "bug" that didn't exist

The audit said the savings screen dispatches no refresh event, so savings look
stale after a deposit. **It does dispatch it** — twice, on both the deposit
and withdraw success paths.

Why did the audit miss it? The search looked for the text
`'nf:savings-position-updated'`. The listeners write it that way, but the
sender uses a **named constant**, `POSITION_SYNC_EVENT`. A text search for the
one never finds the other.

Had we "fixed" it, we'd have added a second dispatch to a working feature —
a bug introduced by fixing a bug that wasn't there. **We wrote no code for it
and withdrew the finding.**

> **Lesson:** when searching for whether something is used, search for the
> constant *and* the string. And always open the file before believing the
> grep.

---

## How to verify this yourself

| Check | Expected result |
|---|---|
| Open activity, wait 1 min, reload | Helius dashboard shows **no new call** (served from cache) |
| Send SOL, watch the list | Appears **immediately** (the refresh flag) |
| Call `?refresh=1` twice quickly | Second one is served from cache (the floor works) |
| Cold-load portfolio with DevTools open | `turnkey/wallet` drops from ~22 requests to **1–2** |

---

## The files we changed

| File | Change |
|---|---|
| `api/activity/solana/route.ts` | cache 30 s → 300 s, refresh flag + floor |
| `api/activity/ethereum/route.ts` | same treatment |
| `hooks/stellar/use-user-activity.ts` | match the dedupe window; re-fetch fresh after a user action |
| `lib/turnkey/wallet-info.ts` | single-flight guard |

Four files, +103 / −22 lines. TypeScript and ESLint both clean. (TypeScript
caught a genuine mistake in the first version of the single-flight code — the
cleanup referred to the request before it existed — which is exactly the kind
of thing a type checker is for.)

---

## The takeaways

1. **Two identical numbers in different places** (30 s cache, 30 s dedupe) can
   silently cancel out a whole optimisation. Look for coincidences like that.
2. **A server-side cache is a ceiling; a client-side setting is a request.**
   Prefer ceilings.
3. **Every bypass needs a bound.** Ask "what if this runs in a loop?"
4. **Match the fix's blast radius to the bug's severity.** Don't refactor
   signing code to save a network request.
5. **Verify the finding before you fix it.** Two of our own notes were wrong,
   and finding that out cost minutes — while "fixing" them would have cost
   real quality.
