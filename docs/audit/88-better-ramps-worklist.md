# 88 — `feat/better-ramps`: the worklist

Status: **the branch's single to-do list.** Everything this branch must solve,
in order, with its source. Research: doc 85. Answers/phasing: doc 86. MoonPay +
wallet-choice design: doc 87. Tick items off here as they land.

Decisions already taken (Niko):
- MoonPay on both sides, **our fee ~1% on-ramp and off-ramp** ("good for now,
  we may change" — it is dashboard config, no deploy needed to change it)
- Coinbase stays for both sides
- Stripe: parked ("will see")
- Circle Mint: treasury interest confirmed

---

## Bugs to fix on this branch

### B1 — Ramps use the slot wallet with no choice and no label  ⬅ FIXED (F1 shipped 2026-08-25)
- `onramp-dialog.tsx:119` and `offramp-dialog.tsx:119`:
  `const userAddress = persist.wallet.address` — always the slot.
- Symptom: MoneyGram off-ramp "automatically went for lobstr wallet".
- The on-ramp half is worse: bought crypto lands in whichever wallet is
  connected, unnamed — buying USDC to fund savings puts it on Lobstr.
- Fix: the `WalletChoice` component (doc 87 §1) used by on-ramp, off-ramp and
  swap. Never silently pick when a choice exists; with one option, show a
  **named** line; balances beside options; off-ramp filters to wallets that can
  actually perform the sale; on-ramp warns when the destination is not where
  the user is standing.
- Must also cover **multiple Turnkey wallets** (doc 83 phase 2) — options come
  from one source so those rows appear in the picker for free.

### B2 — Nothing tracks money in flight for Coinbase (and future MoonPay)
- After the user leaves for the provider, our UI shows nothing until the
  balance happens to refresh. Niko: "it takes a few seconds for assets to
  appear… we need some indicators if assets are on the way".
- MoneyGram already does this right (commit → poll → mirror to DB → pending
  banner). Generalise that pattern: one `incoming_funds` record written
  **before** handoff, one poller, one banner, two completion signals
  (provider-done ⇒ fire the doc-67 cache-bypassing refresh; balance-moved ⇒
  arrived). Explicit terminal states — no row pends forever.
- Off-ramp mirror image: "sold, payout on the way — arrives by <date>".

### B3 — Stripe on-ramp is a bare link (decision parked, bug stands)
- `createStripeURL` passes no destination address — the user pastes their own
  wallet address; no session, no webhook, invisible to activity.
- Parked by Niko ("will see") — but while it stands, every Stripe purchase is
  untracked and mistypable. When picked up: implement properly or remove.
  It must NOT survive this branch unchanged.

### B4 — Coinbase "onramps not available" error, cause unknown
- User-reported, never captured. Candidates: geography (e.g. New York excluded
  for XLM), asset/network pair, Coinbase account requirement, or our own 429
  (Coinbase quote APIs: 10 req/s per app ID).
- Task: reproduce with DevTools open, capture the actual response, then fix the
  right one of the four.

---

## Features to build

### F1 — `WalletChoice` — ✅ SHIPPED 2026-08-25
- `lib/wallet-options.ts` (pure rules, 12 tests): options from slot+companion;
  external balance = aggregate − companion, clamped at 0; offramp filters
  wallets that cannot sell (but never filters on UNKNOWN balances — unknown is
  not zero); defaults: onramp → Normal wallet, offramp → the holder, ties →
  external-first (= old behaviour, so hybrid defaults do not shift underfoot).
- `components/_common/wallet-choice.tsx`: pill row (swap-card look); exactly
  one option renders as a NAMED line, not a control.
- Both dialogs wired: MoneyGram withdraw + Coinbase sell use the SELECTED
  address; onramp trustline check follows the DESTINATION wallet; XLM reserve
  probe follows the selling wallet. BTC/ETH/SOL unchanged (single address).
- Deliberately unchanged: the Coinbase amount cap still uses the aggregate
  `assetBalance` prop (conservative; Coinbase re-validates). QA rows R1–R7.
### F2 — In-flight tracking (fixes B2) — second, provider-agnostic
### F3 — MoonPay integration — gated on KYB (setup guide below)
- signed widget URL (same shape as our Coinbase CDP JWT)
- address from `WalletChoice`, never the slot
- webhook endpoint → feeds F2
- add to both dialogs; fees configured at 1%/1% in their dashboard
### F4 — Circle Mint treasury account — independent, small
- converts OUR fee revenue (USDC, native Stellar supported) to USD in OUR bank.
  Not a user ramp (see §Circle below).

## Open questions that shape F3

- **Does MoonPay's off-ramp take USDC on Stellar, or only XLM?** Niko's
  dashboard already shows **XLM off-ramps available** — good. If USDC-on-Stellar
  is not offered, the off-ramp path becomes: Soroswap USDC→XLM (machinery
  exists), then sell XLM. That is a modest extra leg, not a blocker, but it
  must be decided before F3's UI copy is written (the user sells "USDC" and
  MoonPay pays out from XLM — the quote math must include the swap).
- Sell-side country list (differs from buy-side).
- Does the affiliate commission stack with the partner fee, or replace it?
  (Ask the Partner Success Manager.)

---

# MoonPay setup — the concrete guide

Everything happens at **dashboard.moonpay.com**. There is a **Get started
checklist** in the dashboard that tracks these steps; no paywall, no
subscription.

**Step 1 — Create the partner account.**
Go to dashboard.moonpay.com → sign up with the company email. This is the
partner dashboard, not a normal MoonPay user account.

**Step 2 — Account review.**
MoonPay reviews the account/use-case first; the checklist shows progress.

**Step 3 — Business verification (KYB).** The gating step. Upload happens
through a SumSub portal linked from "Step 3: Verify your business" on the
checklist. Have ready:

- **Certificate of Incorporation/Registration** (name, reg. number, date)
- **Shareholder Registry** and **Director Registry** — or one **Certificate of
  Incumbency** covering both
- If a parent company owns Normal: the same documents for it
- Documents must be **dated within 12 months** (unless on a public government
  register), **signed by a director**, **original scans/photos** (no
  screenshots), **English** (or certified translation), and the company name +
  registration number must **match exactly** across application, documents and
  website
- **Personal KYC** for: every director, every shareholder ≥25% (if none, every
  shareholder ≥10%) — each needs a government photo ID + proof of address from
  the last 90 days

Timeline is not published. The dashboard has an assistant ("Nova") that
escalates to partner support.

**Step 4 — Test keys immediately.**
Developers → API Keys → **Test** keys are available right away, before KYB
completes. So F3's build can start in sandbox in parallel with the paperwork.

**Step 5 — After approval, configure:**
- **On-ramp → Enabled assets** and **Off-ramp → Enabled assets** — enable what
  we sell (this is where the USDC-on-Stellar question gets its definitive
  answer: it is either in this list or it is not)
- **On-ramp → Fees** and **Off-ramp → Fees** — set our 1% on each
- **Developers → API Keys → Production** — live keys appear here once approved
- **Developers → Webhooks** — register our endpoint (F2/F3)

---

# Transak — do we need paperwork there too?

**Yes for production, no for building.** Their model:

- Sign up at **dashboard.transak.com** with a corporate email — the **staging
  API key is available immediately, with no KYB**
- Production key unlocks only after KYB, submitted at **forms.transak.com/kyb**
  (same info shape as MoonPay: company details + IDs for directors, officers,
  UBOs)

But note: we ruled Transak out on price (~2.5% spread vs MoonPay ~1% + our 1%).
This answer matters only if we later add Transak for card-payout markets — in
which case the KYB is the same kind of paperwork, at a different URL.

---

# Circle Mint — clearing up "you said no offramps"

Precision matters here, so restated:

- Circle Mint **does** have redemption — USDC in, **USD wire out, 1:1** — and it
  **does support native Stellar USDC** (only the native issuance, not bridged).
- What it does **not** have is a **consumer** off-ramp: the wire goes to the
  **account holder's own bank**, i.e. Normal's bank. There is no flow where a
  user's USDC becomes money in the *user's* bank.
- Using it to pay users ourselves = money transmission (licensing). That is the
  reason it is not our user off-ramp — regulatory, not technical.
- What it IS for us: **treasury** (F4). Our fee revenue accumulates as USDC;
  Circle Mint converts our own balance to our own bank at 1:1, free above the
  volume threshold.

---

## Sequence for the branch

1. **Start MoonPay KYB** (paperwork, gates F3's production keys — start today)
2. **F1 `WalletChoice`** (fixes the bug Niko hit; no dependencies)
3. **F2 in-flight tracking** (provider-agnostic; makes F3 land complete)
4. **F3 MoonPay** in sandbox with Test keys → production once KYB clears
5. **B4** capture the Coinbase error when convenient (independent)
6. **F4 Circle Mint** treasury (independent)
7. **B3 Stripe** — when Niko decides: proper build or removal

---

# MoonPay — handoff instructions for Justin (owner) · 2026-08-25

Context: Niko is a developer, Justin owns the company. The KYB verifies the
COMPANY and the people who own/run it, so Justin is the right person to open
the account. The dashboard has role-based team access ("Setting up your
partner account & team" under Getting started & onboarding), so he can invite
Niko afterwards for all technical work.

## What Justin does

1. **Sign up** at **https://dashboard.moonpay.com** with his company email.
   This creates the PARTNER account (not a consumer MoonPay account). No
   payment — the partner paywall was removed 2026-04-16.
2. **Submit project details** when prompted (what Normal is, what we are
   building) and pass the account review.
3. On the **Get started checklist**, open **"Step 3: Verify your business"**
   — it links to a SumSub upload portal. He uploads:
   - Certificate of Incorporation/Registration
   - Shareholder Registry + Director Registry (or ONE Certificate of
     Incumbency covering both)
   - if a parent company owns Normal: the same documents for it
   - rules: dated <12 months (unless on a public register), signed by a
     director, ORIGINAL scans/photos (no screenshots), English or certified
     translation, company name + reg. number matching EXACTLY across the
     application, the documents and the website
4. **Personal ID checks** in the same portal for: every director, and every
   shareholder holding ≥25% (if nobody holds ≥25%, everyone ≥10%). Each
   person: government photo ID + proof of address from the last 90 days.
   This is why the owner runs this step — it is his ID and his cap table.
5. **Invite Niko to the dashboard** (team settings — role-based access) so
   the technical setup does not depend on Justin being online.

## What Niko does once invited (no KYB needed on his side)

- **Developers → API Keys → Test** — available IMMEDIATELY, before KYB
  finishes → sandbox build starts in parallel with the paperwork
- after approval: **On-ramp/Off-ramp → Enabled assets** (check whether
  **USDC on Stellar** is in the sell list — XLM already shows as available;
  if USDC-on-Stellar is absent we add the Soroswap USDC→XLM hop),
  **Fees** (set 1% on each, per Niko's decision), **Developers → Webhooks**
  (our status endpoint), **API Keys → Production**.

## If anything stalls

The dashboard's assistant ("Nova") escalates to partner support. Reference
articles: "How to go live with MoonPay as a partner" and "Business
Verification (KYB) for partners" in the MoonPay Help Center.

---

# Circle Mint — handoff instructions for Justin (owner) · 2026-08-25

One clarification kept ON the record so nobody plans against it: Circle Mint is
NOT a user on/off-ramp. It converts between OUR company bank account and USDC —
both directions (wire in → mint USDC to us; send USDC → wire out to us). Users
never touch it. Its jobs for Normal: (a) treasury — fee revenue USDC → USD in
our bank at 1:1; (b) cheap company-side minting if we ever pre-fund anything.
Native Stellar USDC is supported.

## What Justin does

1. **Apply** at **https://www.circle.com/mint-contact** ("Apply for access" —
   every button on circle.com/circle-mint leads there). It is a
   talk-to-our-team form, not self-serve signup: Circle Mint is
   institutional-only, so the application opens a review, and sales may reach
   out with questions.
2. **Have ready** (mostly the same folder he is assembling for MoonPay):
   - Certificate of Incorporation
   - **Beneficial-owner disclosures** (who owns the company)
   - **Source-of-funds documentation**
   - description of the legal entity, its operations, and the intended use of
     the account
   - AML/CFT program documentation — only if we are a money transmitter (we
     are not; that is the whole reason Circle Mint is treasury-only for us)
3. **Expect a review**: background checks, ID verification, KYC, sanctions
   screening. Circle's own page says days; independent write-ups say **2–8
   weeks** is typical for onboarding, longer for complex structures. Plan on
   weeks, be pleased if it is days.
4. **After approval**: link the company bank account (details vary by
   country; wires supported in 185+ countries, some jurisdictions excluded),
   then **invite Niko** — the account supports additional users with roles
   (Administrator/Agent), invited by email, each with 2FA.

## What Niko can do right now, without Justin

**Sandbox is self-serve**: **https://app-sandbox.circle.com/signup** — email
signup, no KYB. API keys and the mint/redeem flows can be explored there while
the application runs. Production login later is at app.circle.com.

## Fees

Not published on the marketing page ("pricing and fees may vary"). Prior
research (doc 85): redemption is typically free above a volume threshold
(~$100k tier noted); confirm the real schedule during the sales conversation —
ASK EXPLICITLY for the fee table in writing.
