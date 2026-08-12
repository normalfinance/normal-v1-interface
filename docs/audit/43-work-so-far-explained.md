# 43 — Everything done so far, explained

For a developer new to this work. Covers what was changed, why, and the
reasoning behind the decisions.

**This is the entry point for the staging push.** Read it first, then go
deeper only where you need to:

| Document | When to read it |
|---|---|
| `40-savings-explained.md` | savings in depth (section 3 here summarises it) |
| `45-btc-swap-explained.md` | the Bitcoin signing fix, from first principles |
| `46-external-wallets.md` | external wallets, the full capability matrix |
| `49-sends-explained.md` | the sends work: pending rows + the exchange-memo guard |
| `51-ci-quality-explained.md` | CI, withAuth, lint zero, the merge-commit story |
| `52-withauth-sweep-explained.md` | every route authed by default + the test that enforces it |
| `53-component-tests-explained.md` | the first UI test: the swap gate pinned, and the pattern to copy |
| `56-fee-ordering-explained.md` | #26: sign-both-first + server escrow — no fee without service, ever |
| `57-your-deposits-explained.md` | #55: "Your Deposits" reconciled by tx hash — right the instant you act |
| `59-tx-server-records-explained.md` | #27: every money tx recorded server-side BEFORE broadcast, settled truthfully |
| `61-send-safety-explained.md` | #29: real gas estimation + one-send-at-a-time — double sends impossible |
| `63-balance-freshness-explained.md` | #62: refresh on chain confirmation, Done gated on arrival, MAX never offers committed money |
| `65-capacity-quickwins-explained.md` | #13/#36/#31/#18 + heartbeats + RPC fallback — cheaper per user, provably-alive crons |
| `20-findings.md` | the ranked register, every finding with severity |
| `30-roadmap.md` | what is scheduled next, and why in that order |
| `42-tester-guide.html` | the tester-facing version, printable to PDF |

Everything in sections 1 to 8 below is in the staging push.

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

---

## 6. Bitcoin-source swaps, fixed

Full detail in [45-btc-swap-explained.md](45-btc-swap-explained.md).

Swapping *from* Bitcoin failed at signing with `UnrecognizedScript`. Two
theories were written down early and both turned out to be wrong, which is
worth recording because ruling them out is what produced the real answer:

- *"The PSBT is base64 and we send hex."* The magic bytes said it was already
  valid hex. Disproven.
- *"There is a taproot output."* The hex contained `5120`, the taproot prefix,
  but a proper decode showed it was a coincidental substring in the middle of
  other data. There is no taproot. Disproven.

The actual cause: Turnkey's PSBT parser derives an address from **every**
script, and LI.FI's PSBT contains an **OP_RETURN** output, which by definition
has no address. Their docs list what they reject and OP_RETURN is not on it, so
it is an undocumented limitation on their side, not a malformed PSBT and not a
bug in our code.

The fix is Turnkey's own documented alternative. Rather than handing them the
PSBT to parse, we compute the signature hashes locally with bitcoinjs-lib and
ask Turnkey to sign those raw 32-byte digests. It never sees the OP_RETURN.

Three things worth carrying forward:

- **The transaction is never modified.** Only signatures are added. The
  standing "never rewrite a Chainflip PSBT" rule is about changing outputs and
  is fully respected.
- **All inputs are signed in one Turnkey activity**, so a multi-input swap
  still costs one passkey prompt rather than one per input.
- **Low-S normalisation.** A high-S signature is valid cryptography but
  non-standard, so relays silently drop it. That failure looks like "broadcast
  succeeded and nothing happened", which is the worst kind to debug. Four lines
  removed the whole category.

Also worth knowing before anyone edits that file: it is the first client-side
use of `bitcoinjs-lib` in the app, Next does not polyfill the `Buffer` global
for browser bundles, and bitcoinjs v7 is `Uint8Array`-only. Do not add
`Buffer.from` there. And it is imported with `await import(...)`, because a
static import put 45 kB of Bitcoin library into the bundle of everyone who
opens the swap page.

---

## 7. External wallets

Full detail in [46-external-wallets.md](46-external-wallets.md).

Checking whether the tester guide held for someone signed in with Freighter or
Lobstr turned up two things in this batch and corrected two stale beliefs.

**The product rule, now explicit: external wallets are Stellar-only.** They can
hold and move XLM and USDC, swap between them, use savings and MoneyGram.
Bitcoin, Ethereum and Solana need the Turnkey passkey, because a Stellar wallet
physically cannot produce those signatures.

**The regression.** Section 4 above closed the transaction-log routes by
checking that the wallet belongs to the signed-in account. That check reads
`linked_wallets` or `turnkey_wallets`, and connecting an external wallet never
wrote a `linked_wallets` row. So the security fix silently 403'd every external
wallet: their swaps stopped reaching the database and vanished from Activity.

Fixed with one `ensureWalletLinked()` helper called from two places. On connect,
where all three UI paths share the same hook so a fourth cannot forget. And on
session restore, which backfills people who connected before the fix without
asking them to reconnect. It checks before writing, because that route charges
a "3 wallets per day" quota even for an address that is already linked.

**The gate that came back.** Cross-chain swaps were reachable from an external
wallet, and offered to provision a Turnkey wallet mid-swap. That contradicts
the Stellar-only rule and hands someone a second wallet they never asked for.
A gate for exactly this was written in July, committed to a feature branch, and
lost in the squash that produced its PR. Restored, and improved: it now also
switches the quote fetches off, so a user with both wallet types does not burn
LI.FI quota on swaps the button will not run.

`action: null` on that button is the load-bearing part. Outbound CCTP burns on
Stellar first and only then needs the passkey, so a half-executed route would
leave USDC on Base awaiting recovery.

**Two beliefs corrected.** The system map said cross-chain was gated to Normal
wallets; it was not, and the file it named did not contain the check. And we
had six external wallets recorded as supported when only four are connectable,
xBull and HANA having been removed in May.

---

## 8. Sends

Full walkthrough in [49-sends-explained.md](49-sends-explained.md).

One live test — 5 XLM sent to Coinbase — exposed two independent bugs, both
now fixed:

**Our app showed nothing (#47).** Sends were the only money flow that never
fired the app's "money moved" event, so no screen refreshed and no pending
state existed. Now every send announces itself from the send primitive,
appears in the feed immediately as a pending row (persisted, so a
pending Bitcoin send survives reloads), and the balance route gained the same
cache bypass the activity routes had. No polling anywhere: three bounded
refreshes per send action, then reconciliation rides on fetches the app
already makes.

**Coinbase credited nothing (#48).** The send had no memo, and Coinbase pools
all customer deposits into one account where the memo is the routing key.
The ecosystem's official guard (SEP-29) ran and passed, because Coinbase
never set the flag — so the fix cannot rely on it. Exchange destinations are
now recognised (seed list of ~33 verified addresses + a live directory
lookup, Redis-cached) and the modal fails closed: memo field forces open,
button disabled until it is filled. The savings withdraw form, which has no
memo input at all, refuses exchange addresses outright.

Also worth noting from this work: the new unit tests caught a real bug before
staging (the pending ledger skipped localStorage on a fresh load — a pending
BTC send would have vanished on reload), and the memo test fixture is the
literal address from the incident.

---

## Known broken

Nothing known-broken is shipping in this push.

Two items are open but neither blocks it:

- **#42** — the self-heal that restores a missing Stellar address reads it from
  Turnkey regardless of wallet type. For someone using an external wallet *and*
  a Turnkey wallet, that could silently swap which Stellar address is active.
  Not yet reproduced, and deliberately not "fixed" first: when the address is
  wiped the wallet type is wiped with it, so the obvious guard would not
  actually work. Needs the repro.
- **#43** — `xbull` and `hana` linger in the wallet-type union after the
  modules were deleted. Cosmetic.
