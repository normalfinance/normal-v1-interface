# 38 — What's next on savings, explained and planned

**For agreement before any code is written.** Written to be readable by
someone new to the codebase.

---

## Where we got to

Savings had three problems. Two are fixed:

1. **We were being rate-limited by DeFindex.** Every user's browser asked them
   for the same vault figures (APY, total deposits). Fixed: our server asks
   once and shares one answer with everybody. ✅
2. **Numbers double-counted after a deposit or withdrawal.** An optimistic
   update was applied to a value that a background refresh had already
   updated. Fixed: we snapshot the value before the transaction and write an
   absolute result. ✅
3. **The user's own savings balance is still fetched per browser.** Not fixed.
   That's Step 1 below.

---

## Step 1 — Cache the user's savings position

### What it is now
`/api/savings/user-position` asks DeFindex for *your* balance, deposits and
earnings. Unlike the vault figures, this is different for every user. It runs
on every savings page view, every portfolio load, and on a refresh schedule.

### Why it needs care
This is the one number a user checks to answer *"is my money still there?"*.
Showing a stale value is worse than showing a slow one.

So the rules differ from the vault cache we already shipped:

| | Vault figures (done) | Your position (this step) |
|---|---|---|
| Same for all users? | yes, one cached copy for everyone | no, one per wallet |
| How long we cache | 2 minutes | **30 seconds** |
| If DeFindex fails | show the last known figures | **show nothing cached — never assert a stale balance** |
| After you deposit | nothing needed | **must update immediately** |

That last row is the important one. A 30-second cache would normally mean your
balance looks unchanged for half a minute after depositing, which would feel
broken. The app already announces deposits and withdrawals internally
(`POSITION_SYNC_EVENT`), so we hook into that to force one fresh fetch,
bypassing the cache.

And because that bypass is a way to make our server call DeFindex on demand, it
gets a floor: one forced refresh per wallet per 30 seconds. Otherwise it becomes
a way for anyone to burn our rate limit — the same guard we put on the activity
routes.

### Risk
Low. The cache is skipped for the case that matters (just acted), and a failure
falls through to a live fetch rather than serving something old.

---

## Step 2 — Make the browser and server agree on timing

### What it is
The browser also caches, separately: it won't re-ask for the position more than
once a minute. The server will soon cache for 30 seconds.

### Why it matters
We already hit this exact bug once (finding #22). If the browser waits *exactly*
as long as the server keeps its copy, the browser tends to ask precisely when
the server's copy has just expired, so the cache almost never helps. Two
sensible numbers that cancel each other out.

### The fix
Set the browser's window to match or exceed the server's, so the browser's
requests usually land while the server still has an answer ready.

### Risk
Very low. It's timing configuration, no logic changes.

---

## Step 3 — Retire the persisted token store (the big one)

### What it is
The app currently keeps two separate records of your balances:

- **the server aggregator** — used by the portfolio page, home hero, account
  drawer;
- **the persisted token store** — a copy kept in your browser's local storage,
  used by the savings deposit card and the swap card.

### Why this matters more than it sounds
Every awkward bug this week traces back to having two:

- assets appearing in stages, because each surface waited on a different one;
- XLM and USDC disappearing entirely when one source lost its address;
- **the deposit card showing 2.81 USDC while the drawer showed the correct
  7.81** — two different balances for the same asset, on the same screen, right
  above a Deposit button.

We keep fixing symptoms. This removes the cause.

### What it involves
Point the savings deposit card and the swap card at the same source everything
else uses, then delete the store and the code that refreshes it.

### Why it hasn't been done yet
It touches the swap card, which is money-moving code, and it deserves its own
testing round rather than being bundled with a bug fix. It is the single most
valuable remaining cleanup.

### Risk
Medium — the highest of the three. Mitigated by doing it alone, and by testing
deposit, withdraw and swap flows specifically.

---

## Suggested order

1. **Step 1** (position cache) — finishes the savings work, low risk.
2. **Step 2** (timing) — trivial, and Step 1 is incomplete without it.
3. **Step 3** (retire the token store) — separate session, own test round.

## What is NOT in this plan, and why

- **BTC swaps** — waiting on LI.FI to confirm whether their Bitcoin transaction
  format changed to taproot. No code we write helps until they answer.
- **Country blocking (#35)** — waiting on your team discussion.
- **The unauthenticated write endpoints (Block C)** — still the largest
  untouched security item in the audit. Not forgotten; it just needs a decision
  on whether it comes before or after Step 3.

---

## What we need agreed

1. Steps 1 and 2 as described, in that order?
2. Step 3 as its own session with a dedicated test round?
3. Does Block C (security) come before or after Step 3?
