# 48 — Send visibility: plan

**Status: IMPLEMENTED 2026-08-06 (all three phases). 26/26 tests, typecheck,
lint and production build clean. Awaiting the manual matrix in §4.**

As-built deltas from the plan, both small:

- The off-ramp status listener deliberately still reacts to chain-scoped
  events — an off-ramp IS a send, and that fetch is what re-labels the Sent
  row (it no-ops without local fills, so it costs nothing).
- The savings-card listener skips only NON-Stellar scoped events: a Stellar
  send moves XLM, which its low-XLM warning reads.
- **Found on staging within the hour (2026-08-06): the pending row's View
  link sent every hash to stellar.expert** — an ETH pending row opened an
  Ethereum hash in a Stellar explorer (endless spinner). Cause: the activity
  card routes explorers by id prefix and the pending id carried no chain.
  Fixed: pending ids are now `pending-send:<chain>:<hash>` and the card
  resolves ALL explorer links from the chain registry's `explorerTx` (which
  existed but the card predated). Swept every other consumer of activity
  rows: the drawer renders no links, savings history filters sends out —
  the bug lived in exactly one place.
- One bug caught by the new unit suite before it ever ran in a browser:
  `getPendingSends` was too lazy and skipped localStorage hydration on a
  fresh page load — a pending BTC send would have vanished on reload, the
  exact case the ledger exists for. The reload round-trip test failed, the
  fix followed. That is the testing argument made concrete.

Found by live testing on staging (2026-08-06):
sent 5 XLM from the portfolio page to Coinbase. The modal said success, then
nothing — no activity row, no balance change. After a reload the balance was
right, and the activity row appeared only some time later.

Everything below was verified in code, with file references. Nothing is a
guess.

---

## 1. Why it happened — three layers, all confirmed

### Layer 1: the send flow announces nothing

The app has an internal signal for "money just moved": the
`nf:activity-updated` browser event. Every listener already exists —
`use-wallet-balances` refreshes balances on it, `use-user-activity` refreshes
the feed on it, the savings card listens too.

Every money flow fires it — **except sends**:

| Flow | Fires the event? | Where |
|---|---|---|
| Soroswap swap | ✅ | `use-soroswap-engine.tsx:107` |
| LI.FI swap | ✅ | `lifi-tracker.ts` via `onActivity` |
| CCTP swap | ✅ | `use-cctp-engine.tsx:281` |
| On-ramp | ✅ | `onramp-dialog.tsx:176` |
| Off-ramp | ✅ | `coinbase-offramp-modal.tsx` (3 sites) |
| Savings deposit/withdraw log | ✅ | `lib/log-transaction.ts:50` |
| **Send (any asset)** | ❌ | `send-review.tsx:111` — snackbar, `onClose()`, nothing else |

`use-send-token.ts` submits to Horizon and returns the hash (line 157–158).
`send-review.tsx` shows "Transaction sent successfully" and closes. The BTC
path opens `BtcTxStatusModal` — also no event. Nobody tells the rest of the
app anything happened.

### Layer 2: without the event, every cache serves the old answer

The activity routes cache server-side: Stellar 60s, BTC 45s, ETH 300s, SOL
300s. All four support a `?refresh=1` bypass **built exactly for this case** —
the Stellar route's own comment says *"a just-sent payment arrives via
`?refresh=1` anyway"*. The bypass is triggered by the event handler in
`use-user-activity.ts:319-339`… which never ran, because no event was fired.

So after the reload, the feed fetched *without* refresh, got the cached
pre-send copy, and showed the send only once the 60s TTL lapsed. That is the
"did not update for some time" the tester saw.

### Layer 3: the balance route cannot be told to hurry

`/api/wallet/portfolio` caches for 15s (`route.ts:28`) and — unlike all four
activity routes — has **no refresh parameter at all**. The client's
event-triggered `mutate()` (`use-wallet-balances.ts:88-92`) would still be
served the cached copy. The 15s TTL is short so this is the mildest layer,
but the mechanism the other routes have is simply missing here.

### And there is no such thing as a pending send

The feed renders chain-feed rows and DB rows. An in-flight send exists
nowhere, so there is nothing to show between "broadcast" and "indexed by the
chain's API". The feed *can* render pending — BTC receive rows carry
`confirmed: false` and LI.FI swaps show a Pending state — but sends never
produce such a row.

---

## 2. What correct looks like, per asset

The moment the network accepts a send, two things must be true **for every
asset**: a pending row is visible in Activity, and balances/feed refresh
without a reload. The differences between assets are only about *how long*
pending lasts and *what confirms it*:

| Asset | Broadcast via | Indexed by our feed | Time to confirmed | Pending row matters |
|---|---|---|---|---|
| XLM | Horizon submit | Horizon (60s TTL) | ~5s | briefly — bridges the indexing gap |
| USDC (Stellar) | Horizon submit | Horizon | ~5s | same as XLM |
| BTC | mempool.space | mempool.space (45s TTL, **already returns unconfirmed txs**) | 10 min – hours | **essential** — the row is the only feedback for potentially hours |
| ETH | our RPC | Etherscan (300s TTL, refresh floored at ~30s) | ~15s–2 min, but **Etherscan indexing can lag minutes** | essential — covers the indexer lag |
| SOL | our RPC | Helius (300s TTL) | ~5–30s | briefly |

Key asymmetry to design for: **confirmation time is a property of the chain,
but indexing time is a property of the data provider.** ETH confirms fast but
Etherscan may index slowly — the pending row covers indexing lag, not just
chain latency.

---

## 3. The plan

Three phases now, one already-scheduled phase later. Each phase is
independently shippable and testable.

### Phase A — announce the send (S)

One new helper, `announceTransaction()` in a small `lib/tx-events.ts`,
wrapping the event dispatch (single owner for the event name). Called from
the **send primitives**, not the UI, so a future caller cannot forget:

- `use-send-token.ts` — after `submitTransaction` succeeds (covers XLM and
  USDC for every caller: send modal, withdraw card)
- `send-adapters/bitcoin.ts` — after broadcast returns a txid
- `send-adapters/ethereum.ts` — after `sendRawTransaction` returns a hash
- `send-adapters/solana.ts` — after the signature returns

**Audit for double-firing:** `coinbase-offramp-modal` sends via
`useSendToken` *and* dispatches its own event — its dispatch tied to the send
(line ~270) becomes redundant and is removed; its ramp-status dispatches
stay. This audit is part of the phase, not an afterthought.

Phase A alone closes most of the reported incident for XLM: the feed
refetches with `refresh=1` (bypassing both caches) about 800ms after
broadcast, and Horizon has the row within ~5s.

### Phase B — pending sends ledger (M)

A small client-side ledger of in-flight sends, merged into the activity feed.

- **`lib/pending-sends.ts`** — add/list/remove of
  `{txHash, chain, symbol, amount, destination, createdAt}`. Persisted to
  localStorage: a BTC send stays pending across reloads (it can be pending
  for hours — memory-only would vanish on the first reload and reintroduce
  this bug for BTC). Versioned key, per-chain expiry (stellar/sol: 10 min,
  eth: 2 h, btc: 48 h) so an abandoned entry cannot haunt the feed forever.
- **`use-user-activity.ts`** — prepends ledger entries as rows with the
  existing pending visual (the one BTC receives and LI.FI swaps already
  use). **Reconciliation rule: a ledger entry is removed the moment any
  chain-feed row carries its txHash.** The feed already de-duplicates by hash
  for cross-chain swaps (`swapTxHashes`), so this follows an existing
  pattern, not a new invention.
- Send primitives call `addPendingSend(...)` at the same moment they
  announce (Phase A helper takes the row as an argument — one call does
  both).

Per-asset reconciliation, concretely:
- **XLM/USDC**: real row arrives on the first refreshed fetch (~seconds);
  ledger entry lives seconds.
- **BTC**: mempool feed returns the tx as `confirmed: false` almost
  immediately — the optimistic row hands over to the *real* pending row on
  the first refresh, which then flips to confirmed on its own.
- **ETH**: the row may be the only visible evidence for minutes (Etherscan
  lag + its 30s refresh floor). This is where the ledger earns its keep.
- **SOL**: Helius indexes in seconds; same lifecycle as Stellar.

### Phase C — balance refresh bypass (S)

Give `/api/wallet/portfolio` the same `?refresh=1` the four activity routes
have, with the same abuse floor pattern (honoured at most once per short
window per user, exactly like the ETH route's floor). The
`use-wallet-balances` event handler passes `refresh=1` on that one
event-triggered fetch, then normal caching resumes.

**Deliberately not doing optimistic balance subtraction.** A send changes the
balance by amount *plus fee*, fees differ per chain, and BTC's UTXO model
makes the interim number genuinely unknowable client-side. A fabricated
figure that is wrong by the fee violates the project's no-invented-money-
numbers rule; a fast real read (sub-second once the bypass exists, against
a ~5s Stellar confirmation) is honest and nearly as quick.

### Phase D — durable send records (already scheduled, not this work)

Roadmap #27 (Block E, "record-before-broadcast") will write swaps and savings
to the DB before broadcast; sends should join it. That gives sends a
server-side record (analytics, support, surviving any chain-feed outage) and
lets the pending ledger seed from the server instead of localStorage. Phases
A–C do not depend on it and nothing here will need reworking when it lands.

---

## 3b. File manifest — every file touched, and why

| File | Change | Why |
|---|---|---|
| **new** `lib/tx-events.ts` | `announceTransaction({chain, pendingSend})` | Single owner of the event name, the pending-ledger insert, and the bounded follow-up schedule (below). Callers make ONE call; they cannot half-do it |
| **new** `lib/pending-sends.ts` | the ledger | add / list / remove-by-hash / expire, versioned localStorage (`nf:pending-sends:v1`), subscribe hook for React. Pure logic — unit-testable |
| `hooks/stellar/use-send-token.ts` | +1 call after `submitTransaction` succeeds | covers XLM **and** USDC for every caller (send modal, withdraw card) at the primitive, where a future caller cannot forget |
| `send-adapters/bitcoin.ts` | +1 call after broadcast returns the txid | same rule, BTC |
| `send-adapters/ethereum.ts` | +1 call after the hash returns | same rule, ETH |
| `send-adapters/solana.ts` | +1 call after the signature returns | same rule, SOL |
| `components/_common/coinbase-offramp-modal.tsx` | remove ONE dispatch | its send-completion dispatch becomes redundant once `use-send-token` announces; leaving it would double-refresh. Its ramp-status dispatches stay |
| `hooks/stellar/use-user-activity.ts` | merge ledger rows; reconcile on hash match; honour `detail.chain` | pending rows enter the feed here; an entry dies the moment a real row carries its hash (the feed already dedupes by hash for cross-chain swaps — same pattern). Chain-scoped refresh below |
| `app/api/wallet/portfolio/route.ts` | accept `refresh=1`, floored | the one cached money route without a bypass; same guard pattern as the activity routes |
| `hooks/use-wallet-balances.ts` | event handler fetches once with `refresh=1` | mirrors how the activity hook already does its bypass fetch, seeded back into SWR |
| **new** `src/lib/pending-sends.test.ts` | unit suite | reconcile / expire / localStorage round-trip — this is wave-T2 material written alongside the code |
| `docs/audit/35-adding-a-chain.md` | +1 checklist line | a future chain's send adapter must announce + add its pending entry |

**Deliberately untouched:** `portfolio-activity-card.tsx` — verified: it already
renders the pending badge for `type: 'Sent', confirmed: false`
(line 525-527), which is exactly the shape ledger rows take. Also untouched:
`send-review.tsx`, `send-modal.tsx`, `BtcTxStatusModal` — the announce lives
below them, in the primitives.

## 3c. Cost at scale — why this does not burn provider credits

The question that matters: does "pending" mean polling? **No. There is no
poller anywhere in this design.** Three principles keep it cheap:

**1. Pending state is client state, not a server cache.** A pending send is
one user's ephemeral UI state. Server caching (the asset-loading work) exists
to share one expensive upstream answer among many readers — the opposite
situation. Putting per-user pending state on the server would ADD load for
zero sharing benefit. localStorage costs nothing and survives reloads.

**2. Reconciliation piggybacks on fetches that already happen.** The ledger
row is removed when the regular activity feed — with its existing TTLs, SWR
dedupe and focus revalidation — happens to contain the hash. Watching data we
already paid for costs zero extra requests. BTC needs nothing special: the
mempool feed already carries unconfirmed transactions.

**3. The only new upstream calls are bounded per send action, never per
pending item.** On broadcast, the announce helper fires the refresh event at
+0.8s, and again at +8s and +45s (a Stellar transaction is usually indexed
by +5s, so the +0.8s fetch alone can miss it; the +8s one catches it and the
+45s one covers BTC's mempool appearance and ETH's floor). After that:
nothing. A send that stays pending for 3 hours (BTC) causes **zero further
requests** — its row flips when a normal feed refresh sees it. Worst case per
send: ≤3 activity fetches + 1 portfolio fetch, and the per-route floors
(ETH/SOL honour refresh at most once per ~30s) cap it below even that.

**Plus one refinement that makes sends cheaper than swaps are today:** the
event gains an optional `detail.chain`. A send knows its chain, so its
refreshes hit ONE activity route instead of all four (today's blanket event
refreshes every feed). Dispatchers that send no detail keep the current
all-feeds behaviour, so nothing existing changes. Swap engines can adopt the
scoped form later as a free optimisation.

Arithmetic at 1k users: assume a generous 2 sends/user/day = 2,000 sends.
≤4 bounded fetches each = ≤8,000 requests/day *spread across four providers*,
of which Horizon and mempool.space are free and Etherscan/Helius take only
their share, floored. Compare: ONE user leaving a naive 10s confirmation
poller open for an hour would cost 360 requests alone. Bounded-per-action vs
open-ended-per-pending is the entire cost story.

## 4. Testing

**Unit (jest, wave T2 extends):** the ledger is pure logic — add/reconcile/
expire. Cases: entry removed on hash match from any chain; survives a
simulated reload (localStorage round-trip); expiry per chain; no removal on a
different chain's identical-prefix hash.

**Component (T3 pattern):** feed renders a ledger entry as a pending row;
row disappears when the same hash arrives in feed data.

**Manual matrix (staging, tiny amounts):**

| # | Action | Expected |
|---|---|---|
| 1 | Send XLM (the original repro) | Pending row appears **immediately**; flips to confirmed within ~10s; balance updates within ~15s; **no reload at any point** |
| 2 | Send USDC (Stellar) | Same as 1 |
| 3 | Send BTC | Pending row immediately; still there (pending) after a **page reload**; confirms when the chain does |
| 4 | Send ETH | Pending row immediately; survives Etherscan's indexing lag; confirms |
| 5 | Send SOL | Same as 1, slightly slower confirm |
| 6 | Swap XLM↔USDC | Unchanged (regression — swaps already announce) |
| 7 | Savings deposit | Unchanged (regression) |
| 8 | Off-ramp | Exactly ONE feed refresh (double-dispatch removed), status flow unchanged |

## 5. Risks

| Risk | Handling |
|---|---|
| Double event dispatch → duplicate refreshes | The Phase A audit removes the redundant off-ramp dispatch; test 8 verifies |
| Ledger entry never reconciles (feed outage) | Per-chain expiry caps its lifetime; BTC's long expiry matches its real confirmation window |
| localStorage schema drift later | Versioned key from day one (`nf:pending-sends:v1`) |
| Refresh bypass abused to hammer providers | Same floor pattern the activity routes already ship |
| A future new chain forgets all this | The announce+ledger call lives in the send primitive each adapter must implement — and `35-adding-a-chain.md` gains a checklist line |

## 6. Sizing

Phase A: **S** · Phase B: **M** · Phase C: **S**. Ship A+C together (they
close the reported incident), B immediately after (it is what makes BTC and
ETH sends honest). Scheduled in the roadmap as #47, ahead of the hygiene
items in Block F2 — it is user-visible money feedback found by real testing.
