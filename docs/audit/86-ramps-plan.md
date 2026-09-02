# 86 — Better ramps: plan

Status: **PROPOSED — awaiting GO.** No code. Branch: `feat/better-ramps`.
Research behind it: doc 85 (rounds 1 and 2).

Answers Niko's six points from 2026-08-25, then proposes the work. The last
section is the part he specifically asked for: **how a successful on/off-ramp
should feel while the money is still in flight.**

---

## 1. Answers to the six points

### 1. "We want MoonPay — can we take a small commission on both sides?"

**Yes, on both.** Two separate mechanisms:

- **Partner fee.** In the MoonPay Partner Dashboard you set your own fee on top
  of MoonPay's, per transaction, configured **separately for On-ramp → Fees and
  Off-ramp → Fees**. It is our number, changeable without a deploy.
- **Affiliate commission**, typically **0.5%–1.25%**, adjustable with a Partner
  Success Manager. Paid out monthly (4th week) once at least **$1,000** has
  accumulated.

Also worth knowing: MoonPay **removed the partner paywall on 16 April 2026**, so
there is no subscription to onboard.

The honest trade-off: our fee lands on top of MoonPay's ~1% bank-transfer fee,
so a 0.5% take makes the user's total ~1.5%. That is still far below Transak's
~2.5% spread, but it is worth deciding deliberately rather than by default.

### 2. "I think we need to implement MoneyGram offramp still"

**It already exists.** `/api/mgi/sep24/withdraw/route.ts`, a cancel route,
client helpers in `lib/mgi/client.ts`, and `offramp-dialog.tsx` already lists
MoneyGram as a provider.

So the question is not "build it" but **"does it work?"** — the same question as
the Coinbase off-ramp in doc 85 §1. Two things we believe exist and have never
verified end to end.

### 3. "We keep Coinbase for both"

Fine, with one caveat to keep in mind rather than argue about: Coinbase
**off-ramp requires an existing Coinbase account with a linked bank, and guest
checkout is not supported for withdrawals**. It will therefore always fail for
users who are not already Coinbase customers.

Keeping it costs nothing and serves the users who *are*. It just cannot be the
default off-ramp, which is why MoonPay is proposed alongside it.

### 4. "Don't understand" — anchors, explained properly

An **anchor** is a regulated local business that connects Stellar to a country's
normal banking system. Think of it as a currency exchange desk that speaks both
languages: it holds real money in a real bank, and it holds USDC on Stellar.

- **Cash out:** you send it USDC on Stellar, it sends the local currency to your
  bank account.
- **Cash in:** you pay it locally, it sends you USDC on Stellar.

The important part for us: **Stellar defined one standard protocol for talking
to all of them — SEP-24.** Every anchor implements the same handful of calls,
and there is an official **Anchor Directory** listing who exists, in which
country, and what they pay out to.

**We already speak SEP-24.** MoneyGram is an anchor, and we have 33 files of
that integration. Adding another anchor is largely a matter of pointing our
existing code at a different anchor's domain — closer to configuration than to a
new vendor integration.

Why it is attractive: an anchor settles on **domestic rails**, so it is usually
cheaper than a global provider's ~1%, and it takes **USDC on Stellar natively**,
so no bridging.

Why it is not the whole answer: each anchor covers **one country or region**. One
anchor is one market served well, not eighty. So the shape of the choice is:

- **MoonPay** = one integration, 80+ countries, ~1%
- **Anchors** = one integration *per market*, likely cheaper, natively Stellar

They are not competitors — the sensible end state is MoonPay as the broad
default with an anchor in whichever markets are big enough to justify one.

### 5. "Will see" — Stripe

Parked. Recorded in doc 85: as written it asks users to paste their own wallet
address and we never learn whether the purchase happened. Whenever we touch it,
the choice is *implement properly* or *remove*, not *leave*.

### 6. "Still interested in Circle Mint — does Circle accept Stellar USDC?"

**Yes.** Circle Mint supports **native USDC on Stellar** (native only, not
bridged versions) — which is exactly the asset our users hold.

So the technical answer is yes, and the answer from doc 85 §2 is unchanged: it
still pays **us**, not the user, and paying users from our own bank account is
money transmission.

**But there is a real use for it that has no licensing question at all:**
**treasury.** Our swap and LI.FI fees accumulate as USDC. Circle Mint converts
*our own* balance to USD in *our own* bank, 1:1, free above the volume
threshold. That is revenue collection, not a user ramp, and it is worth opening
an account for on its own merits.

---

## 2. What the work actually is

Given how much already exists, this is mostly **verification and one new
provider**, not a rebuild.

| Phase | Work | Size |
|---|---|---|
| **0. Verify** | Run the existing Coinbase off-ramp and MoneyGram off-ramp end to end on staging with small real amounts. Capture the real Coinbase "not available" error | S |
| **1. In-flight UX** | One shared "money is on the way" state for every ramp (below) | M |
| **2. MoonPay** | Partner account + KYB, then on-ramp and off-ramp with our fee configured | M |
| **3. Anchors** | Pick one market, integrate one bank-payout anchor through existing SEP-24 | M |
| **4. Circle Mint** | Treasury account for our own fee revenue | S, independent |

Phase 0 comes first because it can change everything after it. If the Coinbase
off-ramp works for Coinbase customers and MoneyGram withdraw works for cash,
then MoonPay is an *addition* to a working system rather than a rescue.

---

## 3. The in-flight problem — the part Niko asked for

> "in coinbase onramp when its successful it takes few seconds for assets to
> appear they are not instant so we need some indicators if assets are on the
> way"

### Why it happens

Every ramp has the same shape, and the gap is unavoidable:

```
user leaves our app  →  pays at the provider  →  provider sends the crypto
                     →  the chain confirms it  →  our balance query sees it
```

The provider says "done" the moment *it* has done its part. The asset appears in
our UI only after the chain confirms and our balance cache refreshes. Seconds
usually; minutes when a chain is busy. **In that window the user is looking at a
balance that has not changed, having just spent real money.** That is the single
most alarming moment in the whole product, and today we show them nothing.

### What we already have to build on

MoneyGram already solves this properly: the deposit is committed, its status is
polled against the anchor, mirrored into our database, and a pending banner plus
the activity feed take over when the dialog closes. **That pattern is the
answer** — it just only exists for one provider.

We also already have the balance machinery from doc 67: a shared portfolio
subscription with a **cache-bypassing refresh** used after a send or swap
confirms.

### The design

**One record, one poller, one banner, many providers.**

1. **On commit, write an `incoming_funds` row** the moment the user is handed off
   to any provider: provider, asset, amount, our reference, status `pending`.
   Written *before* they leave, so a closed tab or a dead phone cannot lose it.
2. **Show it immediately** as an "on the way" row in activity and as a banner on
   the asset page — the same places MoneyGram already appears. The user sees
   their money represented somewhere the instant they pay.
3. **Two independent completion signals**, because either one alone is wrong:
   - **the provider says done** — MoneyGram SEP-24 status, Coinbase's status
     endpoint (we already have `/api/coinbase/offramp-status`), MoonPay webhooks
   - **the balance actually moves** — the definitive signal, since only the chain
     can prove the asset arrived
   Treat provider-complete as *"expect it any second"* and the balance change as
   *"it is here"*. When the provider reports done, fire the existing
   cache-bypassing refresh rather than waiting for the next poll.
4. **Terminal states are explicit.** Arrived, failed, or expired — never a row
   that quietly stays "pending" forever. A stuck row must eventually say so and
   tell the user what to do.
5. **Off-ramp is the mirror image and matters more.** The user's crypto leaves
   immediately and the money lands in their bank hours or days later. The row
   must say **"sold, payout on the way — arrives by <date>"**, because otherwise
   they have watched their balance vanish with nothing to show for it.

### Why one shared model rather than per-provider code

We have three ramps today and want two more. Without a shared model, each one
invents its own pending state, and each is a separate chance to leave a user
staring at an unchanged balance. It is also the same shape as the swap progress
work: **the user should never be left guessing whether their money is safe.**

---

## 4. Decisions I need before Phase 2

1. **Our fee.** MoonPay lets us set it per side. Suggested: start at **0%** on
   the on-ramp (make deposits as cheap as possible — this is the growth
   surface), and **0.5%** on the off-ramp, where the user is already paying ~1%
   and has decided to leave. Easy to change later; hard to un-charge.
2. **Which markets matter most?** Determines whether Phase 3 is worth doing at
   all, and which anchor to look at.
3. **Who owns the MoonPay KYB?** Lead time is unknown and it gates Phase 2
   entirely. Worth starting the paperwork before writing any code.

---

## 5. Open questions I could not settle from documentation

- whether MoonPay's off-ramp accepts **USDC on Stellar** specifically, or only
  XLM — if only XLM, we route through Soroswap first (doc 85 §5)
- MoonPay **sell-side country list** (differs from the buy-side list)
- MoonPay KYB lead time and whether sandbox access is self-serve
- which Anchor Directory entries pay to **banks** in our priority markets

All four are support tickets or a sandbox signup, not research. The first one
changes Phase 2's shape, so it should be asked before Phase 2 starts.
