# 87 — MoonPay + which wallet the ramps use: plan

Status: **PROPOSED — awaiting GO.** No code. Branch: `feat/better-ramps`.
Follows doc 85 (research) and doc 86 (answers + phasing).

Two things, and the first is more urgent than the second:

1. **The ramps do not ask which wallet.** Niko: *"when I went for offramp on
   MoneyGram it automatically went for Lobstr wallet."*
2. **Add MoonPay** on both sides, with our commission (~1%).

---

## 1. The wallet problem — confirmed in code

Both dialogs take the same line:

```ts
// onramp-dialog.tsx:119   and   offramp-dialog.tsx:119
const userAddress = persist.wallet.address;
```

`persist.wallet.address` is **the slot** — the one wallet the app treats as
"connected". If Lobstr is connected, the slot is Lobstr. So:

- **Off-ramp** sells from Lobstr, silently, even if the user's USDC is in their
  Normal wallet
- **On-ramp** deposits *into* Lobstr, silently, even if the user is buying to
  fund savings, which live on the Normal wallet

Neither dialog offers a choice, and neither says which wallet it picked. That is
the bug Niko hit, and the on-ramp half is worse: **money arrives somewhere the
user did not choose**, and the next thing they try to do with it may be on the
other wallet.

### Why this exists

It predates the hybrid model. When there was one wallet, "the slot" was the only
possible answer. Since then we added the companion Normal wallet, and doc 83
adds the possibility of a second imported Turnkey wallet — so "which wallet" now
has up to three real answers and the ramps still assume one.

### We already solved this once

`swap-card.tsx` has exactly this picker: `cctpSource: 'normal' | 'external'`,
shown only when a choice actually exists (`showCctpSourcePicker`,
`showStellarSourcePicker`), with balance, MAX and validation all following the
selection.

It is **inline in swap-card**, not reusable. So the work is: lift that pattern
into one component and use it in three places instead of one.

### The design

**A `WalletChoice` component: one list, one selected address, shown only when
there is more than one option.**

| Flow | Question it asks | Default |
|---|---|---|
| On-ramp | "Where should the money arrive?" | The wallet the user is acting from — the asset page's wallet, else the slot |
| Off-ramp | "Which wallet are you selling from?" | The wallet holding enough of the asset; if several do, the slot |
| Swap | (already works) | unchanged |

Rules that make it honest rather than just present:

- **Never silently pick when a choice exists.** With one option, show the wallet
  name as a plain line — no picker, but still *named*. Today it is not even named.
- **Show the balance next to each option**, exactly as the swap card does. "Which
  wallet" is unanswerable without "how much is in it".
- **Options come from one source**: the connected external wallet, the Normal
  wallet, and — once doc 83 phase 2 lands — any additional Turnkey wallets. That
  is why this should be one component and not three copies.
- **Off-ramp filters to wallets that can actually do it.** MoneyGram is
  Stellar/USDC-only; a wallet with no USDC is not an option, and if only one
  wallet qualifies the picker collapses to a named line.
- **On-ramp should warn when the destination is not where the user is standing.**
  Buying USDC into Lobstr from the savings page is a legitimate choice and a
  common mistake; naming it prevents the "where did my money go" ticket.

### Multiple Normal wallets (doc 83)

Doc 83 phase 2 lists every Turnkey wallet in settings. Once `WalletChoice`
exists, those wallets appear in the ramp picker for free, because the option
list has one source. Worth building the component with that in mind now rather
than retrofitting later — but it does **not** need doc 83 to ship first.

---

## 2. MoonPay — what to set up

### Before any code (this gates everything, start now)

1. **Create a MoonPay partner account.** The paywall was removed on 2026-04-16,
   so there is no subscription.
2. **Complete KYB.** Business verification. **Lead time is unknown to us and is
   the single biggest schedule risk in this plan** — it is paperwork, not
   engineering, and it should start before we write a line.
3. **Get sandbox keys** and confirm whether sandbox access is self-serve or
   gated behind KYB. This determines whether we can build in parallel with the
   paperwork or only after it.
4. **Ask the two questions documentation cannot answer:**
   - does the **off-ramp accept USDC on Stellar**, or only XLM?
   - what is the **sell-side country list** (it differs from the buy-side)?

   The first one decides the shape of the integration: if MoonPay does not take
   Stellar USDC, every off-ramp needs a Soroswap hop to XLM or a CCTP hop to
   Base first, and that is a materially bigger feature.

### Configuration in their dashboard

- **On-ramp → Fees** and **Off-ramp → Fees** are configured **separately**. Our
  fee is our number and changes without a deploy.
- **Niko's decision: ~1% on both sides.** Recorded, with one observation: on the
  off-ramp our 1% stacks on MoonPay's ~1%, so the user pays ~2% to cash out —
  close to Transak's 2.5% spread, which was the reason we ruled Transak out on
  price. Worth deciding with that in view rather than discovering it later. A
  lower off-ramp fee is also easy to raise; a fee users have seen is awkward to
  raise.
- **Affiliate commission** (0.5–1.25%) is a separate mechanism, paid monthly
  once $1,000 accrues. Confirm with the Partner Success Manager whether it
  stacks with the partner fee or replaces it.

### What we build

- a signed widget URL builder (their integration requires signing the URL with
  our secret — the same shape as the Coinbase CDP JWT we already have)
- **the destination/source address comes from `WalletChoice`**, passed
  explicitly — never from the slot, which is the bug in §1
- a **webhook endpoint** for transaction status, which is what makes the
  in-flight tracking in doc 86 §3 possible for MoonPay
- MoonPay added to the provider list in both dialogs

### What we deliberately do not build

Custody, KYC, or payouts. MoonPay is the regulated payer; the user's account is
created inside their flow. That is the whole reason to choose them over Circle
Mint or Bridge (doc 85 §2, §3).

---

## 3. Sequence

| Step | Why this order | Size |
|---|---|---|
| **0. Start MoonPay KYB** | Paperwork with unknown lead time gates step 3 | — |
| **1. `WalletChoice`** | Fixes a live bug, needed by MoonPay anyway, and independent of MoonPay's paperwork | M |
| **2. In-flight tracking** (doc 86 §3) | Every provider needs it; building it before MoonPay means MoonPay lands complete instead of needing a second pass | M |
| **3. MoonPay** | Once keys exist | M |
| **4. Circle Mint treasury** | Independent of all of the above | S |

Steps 1 and 2 are worth doing regardless of what MoonPay's KYB says, which is
exactly why they go first.

---

## 4. Decisions

1. **Off-ramp fee: 1%, or lower?** Noted above — 1% + MoonPay's ~1% puts the
   user near the Transak pricing we rejected. My suggestion: **1% on-ramp, 0.5%
   off-ramp**, on the grounds that cashing out is when a user is most likely to
   compare and most likely to leave. Your call.
2. **On-ramp default destination.** I suggest the **Normal wallet** when one
   exists, because it is where savings and cross-chain swaps live, with the
   picker always visible so nothing is hidden. The alternative — default to the
   slot — matches today's behaviour but keeps funding the confusion.
3. **Does the picker also appear for MoneyGram cash?** It should, since that is
   exactly where Niko hit it. Confirming the answer is yes.

---

## 5. Risks

| Risk | Handling |
|---|---|
| MoonPay does not accept USDC on Stellar | Ask before step 3. If so, the off-ramp needs a Soroswap or CCTP hop and grows by a phase |
| KYB takes weeks | Steps 1 and 2 are independent; the schedule absorbs it |
| The picker adds a step to a working flow | It only renders when a choice exists; with one wallet the user sees a named line, not an extra decision |
| Our 1% makes cashing out feel expensive | Decision #1 above — and the fee is dashboard config, changeable without a deploy |
