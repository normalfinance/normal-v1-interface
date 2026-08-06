# 49 — The sends work, explained

Companion to [48-send-visibility-plan.md](48-send-visibility-plan.md) (the
plan and file manifest). This explains the same work from scratch, for someone
new to the codebase.

The whole story starts with one test: **5 XLM sent from the portfolio page to
a Coinbase deposit address.** That single send exposed two completely
independent bugs:

1. **Our app showed nothing.** No pending entry, no activity row, and the
   balance only changed after a reload. (Finding #47)
2. **Coinbase credited nothing.** The XLM left our wallet, arrived on-chain,
   and vanished into Coinbase without ever reaching the user's account.
   (Finding #48)

One tiny transaction, two findings, both fixed. That is what test
transactions are for.

---

## Part 1 — Why our own app showed nothing (#47)

### The one-sentence cause

Sends were the **only money flow in the app that never announced itself** —
so nothing knew to refresh.

### The mechanism, step by step

The app has an internal announcement: the `nf:activity-updated` browser
event. When it fires, every screen showing money re-fetches — balances, the
activity feed, the savings card. And the activity feed's re-fetch carries a
special `refresh=1` flag that bypasses the server's caches, built precisely
so a just-made transaction shows up instantly.

Swaps fire this event. Savings deposits fire it. On-ramp, off-ramp, CCTP —
all fire it. **Sends did not.** The send flow ended with a success toast and
`onClose()`. Nothing else.

So after the 5 XLM send:

- The activity feed kept serving its **server-side cached copy** (60 seconds
  for Stellar) because nothing asked for a bypass. Even a page reload fetched
  *without* the flag — hence "the table did not update for some time".
- The balance route caches for 15 seconds and — unlike every activity route —
  **had no bypass parameter at all**. Hence the balance only moving after a
  reload happened to land past the cache window.
- And there was no such thing as a **pending send** anywhere in the code: the
  feed only renders what chain indexers have already seen. The gap between
  "broadcast" and "indexed" displayed as *nothing happened*.

The machinery to fix all of this already existed. The send flow was simply
never plugged into it.

### The fix, in three pieces

**1. Sends announce themselves** (`lib/tx-events.ts`). One call,
`announceTransaction()`, made from inside each send primitive — the Stellar
send hook and the BTC/ETH/SOL adapters — at the moment the network accepts
the transaction. In the *primitives*, not the UI, so any future button that
sends money inherits the behaviour and cannot forget it.

It fires the refresh event immediately, again at +8s, and again at +45s.
Those three moments are chosen, not guessed: a Stellar transaction is usually
indexed ~5s after submit (so the instant refresh alone can miss it), Bitcoin
appears in the mempool within seconds, and Etherscan can lag minutes. After
the third shot: never again. **This is not a poller** — a send that stays
pending for three hours costs zero further requests.

**2. A pending-sends ledger** (`lib/pending-sends.ts`). A small client-side
list of in-flight sends, shown in the activity feed with the same pending
badge that Bitcoin receives already use (the feed's UI needed *zero* changes
— the rows arrive in a shape it already renders). An entry is removed the
moment any feed contains a row with the same transaction hash — the same
hash-matching idea the feed already used to de-duplicate swap legs.

Two design points worth understanding:

- **It lives in localStorage**, because a Bitcoin send can stay pending for
  hours and must survive a page reload. Each chain has its own expiry
  (Stellar 10 minutes, Bitcoin 48 hours) so an entry that never reconciles
  cannot haunt the feed forever.
- **It makes no network requests of its own.** Reconciliation watches feed
  data the app already fetched. Pending state is one user's ephemeral UI
  state — putting it in a server cache would add load for zero sharing
  benefit. Server caches are for answers many users share; this is the
  opposite case. Knowing which tool NOT to use is part of the design.

**3. The balance route got its bypass.** `/api/wallet/portfolio` now accepts
`refresh=1` like the four activity routes, floored to once per 5 seconds per
user so it cannot be leaned on to hammer the chain sources.

Plus one refinement: the event now carries *which chain* the send was on, so
an ETH send refreshes one feed and one balance instead of all of them. Every
skipped refresh is an Etherscan/Helius request not spent. Old-style events
(swaps, savings) still refresh everything, exactly as before.

### A bug the tests caught before any user could

The first version of the ledger skipped loading from localStorage on a fresh
page — meaning **a pending Bitcoin send would have vanished on reload, the
exact case the ledger exists for.** The unit test simulating a reload failed,
the fix followed, and no user ever saw it. We had argued for tests on
principle two days earlier; this was the argument winning on day one.

---

## Part 2 — Why Coinbase credited nothing (#48)

### The one-sentence cause

Exchanges pool every customer's deposits into **one shared Stellar account**,
and the **memo** is the only thing that says which customer a payment belongs
to — our send went out without one.

### The mechanism

Think of the exchange's deposit address as a hotel's street address, and the
memo as the room number. Coinbase's deposit page shows both. Our send modal
had a memo field, but it was collapsed behind a link literally labelled
**"Add memo (optional)"**. For an exchange deposit, "optional" is exactly
wrong — the payment reached the hotel and no room.

Two details make this worse than a simple UI oversight:

- **The ecosystem's own guard ran, and passed.** Stellar has a standard
  (SEP-29) where an account can declare "I require memos", and our SDK checks
  it automatically at submit time. We verified on the real transaction:
  the check executed — and Coinbase has simply **never set the flag** on that
  account. The official safety net exists and the biggest exchange doesn't
  use it. That is why the fix cannot rely on it.
- The funds are not lost on-chain — they sit unattributed inside Coinbase.
  Recovery is a support ticket with the transaction hash; slow and not
  guaranteed.

### The fix: fail closed, three layers

The moment a pasted destination is recognised as an exchange, the send modal
changes behaviour: an amber warning names the exchange, the memo field
**opens by itself** (the "optional" toggle disappears — it cannot be
dismissed), and the button reads *"Enter the memo from the exchange"* and
stays disabled until one is provided. Ordinary wallet-to-wallet sends are
untouched. A slow lookup can never block a normal send — the gate only
closes on a positive answer.

How the app recognises an exchange:

1. **A seed list** (`lib/stellar/memo-required-list.ts`) of ~33 exchange
   deposit accounts — instant, works offline. Not hand-typed: fetched from
   stellar.expert's public community directory, and it includes **all five**
   Coinbase deposit accounts, because exchanges rotate them. The address
   from our incident is the first entry.
2. **A live server route** (`/api/stellar/memo-required`) for addresses the
   seed list doesn't know: it checks the community directory's
   `memo-required` tag, then the SEP-29 on-chain flag. Authenticated (every
   new route is, after finding #44), cached in Redis for 24 hours — so a
   thousand users asking about the same exchange cost two upstream calls a
   day — and failing open to the seed list if the directory is ever down.
3. **The SDK's submit-time check** stays behind everything, for whatever it
   still catches.

Each layer covers the others' blind spot: the seed list is instant but can go
stale; the directory is current but external; the SDK check is official but
empirically ignored by the exchanges themselves.

One more door closed while there: the **savings withdraw card** also accepts
any destination address — and has **no memo input at all**, so a careful user
couldn't comply even knowingly. It now refuses exchange addresses outright
and points to the Send dialog.

And the regression is pinned permanently: the unit-test fixture for the seed
list **is the literal address that ate the 5 XLM**. If anyone ever trims that
list carelessly, a test named after the incident fails.

---

## Part 3 — What to take away

- **One real transaction beats hours of code reading.** Both findings were
  invisible in review and obvious within seconds of a live test.
- **Wire new flows into existing machinery.** The event, the cache bypass,
  the pending badge all existed; sends just never called them. When adding a
  money flow, the checklist question is "who else needs to know this
  happened?" — it is now literally a checklist line in
  [35-adding-a-chain.md](35-adding-a-chain.md).
- **"Optional" is a design claim, not a default.** The memo field was
  optional for the common case and catastrophic for the exchange case. When
  a field's importance depends on the destination, the UI has to know the
  destination.
- **Verify, then hardcode.** The seed list came from a live directory fetch
  and the incident's own on-chain data — not from memory or guesswork.

### How to test it (staging, tiny amounts)

| # | Do this | Expect |
|---|---|---|
| 1 | Send a little XLM to another wallet | Pending row in Activity **immediately**, confirmed within ~10s, balance updates within ~15s, **no reload at any point** |
| 2 | Send BTC, then reload the page mid-confirmation | The pending row is **still there** after the reload |
| 3 | Paste a Coinbase deposit address into Send, leave the memo empty | Warning names Coinbase, memo field opens itself, button disabled until you paste the memo |
| 4 | Try the same from the savings withdraw form | Refused, with a message pointing to the Send dialog |
