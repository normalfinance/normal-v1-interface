# 85 — On/off ramps: research

Status: **RESEARCH ONLY — no code, no plan yet.** Branch: `feat/better-ramps`.
Date: 2026-08-25.

Question from Niko: our Stripe onramp may not be implemented properly, there is
no Stripe offramp, Coinbase is unreliable ("crypto onramps are not available at
the moment"), and we want cheap ramps where **users can cash out to their bank
accounts**. Is **Circle Mint** the answer?

Short version: **Circle Mint is not a consumer off-ramp and cannot be one
without us becoming a money transmitter.** The cheapest route to bank payouts is
almost certainly the one we have already half-built — and the Stripe integration
is not "not ideal", it is a placeholder that cannot work properly by
construction.

---

## 1. What we actually have today (read from the code, not the roadmap)

| Provider | State | Evidence |
|---|---|---|
| **Coinbase onramp** | Real integration | CDP JWT, session token via `/api/coinbase/session`, `createCoinbasePayOnrampURL` |
| **Coinbase OFFRAMP** | **Already largely built** | `createCoinbasePayOfframpURL` (`v3/sell/input`), `/api/coinbase/offramp-status`, `/api/offramp/fills`, `offrampFill` table, `offramp-dialog.tsx`, `coinbase-offramp-modal.tsx`, `offramp-resume-handler.tsx` |
| **MoneyGram** | Real, cash-based | 33 files, SEP-24 |
| **Stripe onramp** | **Placeholder** | see below |
| Transak / MoonPay / Onramper | **Not integrated** | logos in `BrandMarquee.tsx`, the roadmap page and locale files only |

### The Stripe "integration", in full

```ts
export function createStripeURL(amountUsd, destinationCurrency = 'usdc',
                                destinationNetwork = 'stellar'): string {
  return `https://crypto.link.com?source_amount=${amountUsd}&source_currency=usd`
       + `&destination_currency=${destinationCurrency}&destination_network=${destinationNetwork}`;
}
```

That is the whole thing. Consequences, in order of severity:

1. **No destination address is passed.** The user must paste their own wallet
   address into Stripe's page. On a chain with no address-typo protection, that
   is the single most dangerous thing we ask a user to do — and we ask it of the
   least experienced users, at the moment they are least equipped.
2. **No session, no API key, no webhook.** We never learn whether the purchase
   happened, so it cannot appear in activity, cannot be reconciled, and cannot
   be supported when it goes wrong.
3. **No integrator relationship**, therefore no fee share and no support
   channel — we are sending users to a third party as anonymous traffic.

So Niko's instinct is right, and it is worse than "not implemented as it
should be": this cannot be made good by tuning. It is a link.

### The offramp we appear to have forgotten

`offramp-dialog.tsx` defaults to selling **USDC on Stellar** and offers
**Coinbase + MoneyGram**, with a resume handler and a fills table behind it.
Before choosing any new vendor we should establish whether this path works
today, because "we have no offramp" and "our offramp is unreliable" lead to
completely different decisions.

---

## 2. Circle Mint — the direct answer

**No, not for what we want.** Circle Mint is a *business* account: a verified
company sends USDC to Circle and receives a USD **wire to the company's own
bank account**, 1:1, typically free above a volume threshold, next business day
(same day on the Plus tier).

Two reasons it does not solve "users cash out to their bank":

1. **It pays us, not them.** There is no consumer flow. To use it as a user
   off-ramp we would take custody of the user's USDC, redeem it ourselves, and
   then pay the user from our bank account.
2. **That second step is money transmission.** Receiving a customer's value and
   paying it out to them is regulated activity in essentially every market we
   would care about. It means licensing (US: state-by-state MTLs or a sponsor;
   EU: EMI/PI), a compliance program, and reserve obligations. It is a company
   strategy, not an integration.

Circle Mint is genuinely useful **later**, for treasury: if we hold USDC from
fees, it converts our own balance to our own bank cheaply. Worth having. It is
not an off-ramp for users.

---

## 3. Stripe as an off-ramp

There is **no consumer Stripe off-ramp widget** to integrate. Stripe's off-ramp
capability came from acquiring **Bridge** (announced Oct 2024, ~$1.1bn), which
is a **B2B** stablecoin orchestration API: issuance, custody, fiat↔USDC, and
payouts to local bank accounts, priced around **0.1% at high volume**.

Bridge is a serious option, but it is the same shape as Circle Mint: it settles
to *businesses* and expects us to own the customer relationship, the KYC and the
payout — with the same money-transmission question attached, unless we use it in
a model where Bridge is the payer of record. That is a conversation with their
sales team, not a weekend integration.

---

## 4. The providers that actually match "user cashes out to their bank"

These are consumer ramps: the user's own KYC, the user's own bank, our app just
launches the flow. No licensing burden on us.

| Provider | Sell to bank | Stellar | Notable |
|---|---|---|---|
| **Coinbase Onramp/Offramp** | ACH to bank, or Coinbase balance | Coinbase supports XLM and has integrated USDC on Stellar | **0% fees on all USDC on/off-ramps** for integrated developers. Already in our codebase |
| **MoonPay** | Bank transfer, card, PayPal/Venmo (US), 80+ countries | **XLM** listed in the off-ramp asset set; USDC listed for Ethereum/Polygon | Broad payout methods; strong global card payout |
| **Transak** | Bank transfer + real-time Visa card withdrawal, 64+ countries | **Sells XLM**; 45+ chains | Broadest chain coverage; card withdrawal is unusual and useful |
| **Ramp Network** | SEPA Instant strongest | Not confirmed for Stellar | Best-in-class for EU bank payouts |
| **MoneyGram** | **Cash**, ~475k locations | Native (SEP-24) | We already have it. Cash, not bank — a different need, not a replacement |

**The pattern worth noticing:** mainstream ramps support **XLM** far more often
than they support **USDC *on Stellar***. Our savings and swap product is
USDC-on-Stellar, so a naive "sell USDC" request may be exactly what fails.

---

## 5. The lever we already own

We built **CCTP between Stellar and Base**, and Soroswap on Stellar. So a user's
USDC can already reach:

- **XLM on Stellar** (Soroswap, one hop) — which MoonPay and Transak *do* buy
- **USDC on Base** (CCTP) — which essentially every mainstream ramp supports

That means the question "does this provider support USDC on Stellar?" is not a
constraint on our choice of provider. It is a routing decision we already have
the machinery for. **Normalising before the off-ramp turns a narrow vendor
shortlist into a wide one.**

The cost of that normalisation is real and must be priced honestly: a bridge
leg, its gas, and the extra minutes and failure modes on a flow where the user
is trying to get *out*. It is not free, and it is not the right answer if a
direct Stellar route works.

---

## 6. What I would check next, in order

1. **Does our existing Coinbase off-ramp actually work?** It is built. Run it on
   staging with a real small amount. If it works, the cheapest bank payout in
   the entire market (0% on USDC) is already in our repo and the question
   becomes reliability, not vendor choice.
2. **Capture the real "onramps not available" error.** Right now we have a
   user-reported symptom and no evidence. It could be geography (New York is
   excluded for XLM, for instance), an unsupported asset/network combination, a
   Coinbase account requirement, or our own rate limiting — Coinbase throttles
   the quote APIs at **10 requests/second per app ID** and returns `429
   rate_limit_exceeded`. These have four different fixes, and we cannot pick one
   from a screenshot.
3. **Delete or fix Stripe.** As it stands it asks users to paste a wallet
   address. If we keep Stripe at all it needs the proper hosted-onramp
   integration with the destination address passed and a webhook; if we do not
   want to own that, the honest move is to remove the option rather than leave a
   footgun in the UI.
4. **Then, and only then, consider a second consumer provider** (MoonPay or
   Transak) for the countries Coinbase does not serve — with the
   normalise-to-XLM-or-Base routing above.

---

## 7. What I have NOT verified

Stated so nobody plans against assumptions:

- whether Coinbase Off-ramp accepts **USDC on Stellar** specifically, as opposed
  to XLM or USDC on other chains
- the exact country lists for each provider's *sell* flow (they differ from buy)
- whether MoonPay's "USDC" off-ramp asset includes the Stellar issuance
- current fee schedules beyond Coinbase's advertised 0% USDC and Bridge's ~0.1%
- KYB lead times for MoonPay/Transak partner accounts (previous note in
  `reference_offramp_providers.md` says KYB goes through Justin for production,
  with self-serve sandboxes available)

Each of these is a support-ticket or sandbox question, not a research question,
and each changes the recommendation if the answer is unexpected.

---

## Sources

- [Circle Mint](https://www.circle.com/circle-mint) · [USDC redemption structure](https://help.circle.com/s/article/USDC-redemption-structure)
- [Coinbase Offramp overview](https://docs.cdp.coinbase.com/onramp-&-offramp/offramp-apis/offramp-overview) · [Zero-fee USDC on/off-ramping](https://www.coinbase.com/developer-platform/discover/launches/zero-fee-usdc) · [Onramp API overview](https://docs.cdp.coinbase.com/onramp/docs/api-overview)
- [Coinbase integrates USDC on Stellar](https://stellar.org/blog/ecosystem/coinbase-integrates-with-usdc-on-stellar) · [XLM on Coinbase](https://www.coinbase.com/blog/stellar-lumens-xlm-now-available-on-coinbase)
- [MoonPay off-ramp launch](https://www.moonpay.com/newsroom/moonpay-off-ramp) · [Sell USDC](https://www.moonpay.com/sell/usdc) · [Ramps for business](https://www.moonpay.com/business/ramps)
- [Transak off-ramp docs](https://docs.transak.com/products/off-ramp) · [Sell XLM](https://transak.com/sell/XLM) · [Global coverage](https://transak.com/global-coverage)
- [Stripe stablecoin payments / Bridge](https://eco.com/support/en/articles/15083174-stripe-stablecoin-payments-2026) · [Stablecoin off-ramp APIs compared](https://eco.com/support/en/articles/15699532-best-stablecoin-offramp-apis-for-fintech-2026)
- [Crossmint: stablecoin settlement platforms](https://www.crossmint.com/learn/stablecoin-settlement-platforms-in-2026) · [MoonPay vs Transak](https://www.crossmint.com/learn/moonpay-vs-transak)

Note on sourcing: several comparison pages above are vendor-adjacent content
marketing (eco.com, crossmint.com). Their *directional* claims match the primary
provider docs, but no pricing or coverage number from them should be treated as
contractual — confirm against the provider's own docs or sales team before we
commit to anything.

---

# Round 2 — the account-wall question (2026-08-25)

Niko: *"problem with coinbase is that user has to have its bank already linked
in coinbase to offramp there no?"*

**Correct, and it is decisive.** Verified against Coinbase's own docs:

> A Coinbase account with linked bank details is required for Offramp and ACH
> withdrawals. **Guest checkout is not supported for fiat withdrawal.**

Note the asymmetry: **Onramp** *does* allow guest checkout (US, UK, Canada), so
a stranger can buy. **Offramp** does not, so only existing Coinbase customers
can sell. That reframes finding #2 in §1 completely:

**Coinbase's 0% USDC fee is the price of a door most of our users cannot open.**
It is the cheapest off-ramp in the market *for people who are already Coinbase
customers with a linked bank*. For everyone else it is not expensive, it is
unavailable. A fee comparison that ignores who can reach the flow is the wrong
comparison.

## What MoonPay and Transak are, and why they are structurally different

They are **regulated ramp providers that onboard the end user themselves**. The
user never needs a prior relationship:

1. our app opens their widget with the amount, asset and the user's wallet
2. the user enters an email and completes **one-time KYC inside the flow**
   (minutes, sometimes a day or two if a document needs manual review)
3. the user enters **their own bank details** (IBAN, routing number, or a debit
   card)
4. they send the crypto, the provider pays their bank

The provider is the regulated payer. We never touch the fiat, never hold user
funds, and take on no money-transmission obligation — the same position we hold
with MoneyGram today, and the opposite of the Circle Mint / Bridge model in §2
and §3.

That single difference — *the user's account is created in the flow rather than
required beforehand* — matters more for conversion than any fee number on this
page.

## Cost and reach, side by side

| | Fee to a bank | Account needed first | Reach | Notes |
|---|---|---|---|---|
| **Coinbase** | **0%** on USDC | **Yes** — existing account + linked bank | Coinbase's markets | Unbeatable price, smallest eligible audience |
| **MoonPay** | **~1%** bank transfer (4.5% card) | No — KYC in flow | 80+ countries | Min $20. MoonPay Balance is fee-free in US/UK/EU |
| **Transak** | **~2.5%** spread over the CoinGecko rate | No — one-time KYC in flow | 64+ countries | Instant Visa card payout; standard bank up to 5 working days |
| **MoneyGram** | (cash, already integrated) | No | ~475k locations | Cash, not bank. A different need, not a substitute |

On price *and* coverage, **MoonPay is the strongest general bank off-ramp** of
the three. Transak's differentiator is real-time payout to a debit card, which
is worth something in markets where bank transfers crawl.

## The option we have not considered: Stellar anchors

We are a Stellar app, and Stellar's native answer to this is the **anchor**: a
regulated local business that takes an on-chain asset and pays out through local
rails. Anchors speak **SEP-24** (hosted) and **SEP-6** (programmatic), and the
**Stellar Anchor Directory** lists them by service and region.

Why this deserves a serious look:

- **We already speak SEP-24.** MoneyGram is a SEP-24 anchor and we have 33 files
  of that integration. Adding a second anchor is closer to configuration than to
  a new vendor integration — the protocol work is done.
- **Anchors are usually cheaper and more local** than global card-first
  providers, because they settle on domestic rails.
- **No bridging.** They accept USDC on Stellar natively, so none of the
  normalise-to-Base routing in §5 is needed.

The trade-off is coverage: anchors are **per-corridor**. One anchor does not
give us 80 countries; it gives us one country done well. That is a real cost,
but it is a different shape of cost — a list of integrations we choose, rather
than a single vendor's take rate on every transaction forever.

## Revised recommendation

1. **MoonPay as the primary bank off-ramp.** 1% to a bank, KYC in the flow, 80+
   countries, no prior account. It answers the question Coinbase cannot.
2. **Keep MoneyGram** for cash — it serves people without bank accounts at all,
   which is a genuinely different user.
3. **Keep Coinbase for the ON-ramp only**, where guest checkout works. Stop
   treating it as our off-ramp; it will always fail for most users.
4. **Investigate the Anchor Directory for our top two or three markets.** If a
   bank-payout anchor exists there, it is likely cheaper than 1% and needs no
   bridge — and we already have the protocol.
5. **Fix or delete Stripe.** As written it asks users to paste a wallet address.

## Still unverified — these change the plan if they surprise us

- whether MoonPay and Transak accept **USDC on Stellar** specifically, or only
  XLM (§5's routing lever exists precisely for this)
- the **sell-side country lists**, which differ from the buy-side lists
- KYB lead time for a MoonPay partner account, and whether sandbox access is
  self-serve
- which anchors in the directory actually pay to **banks** (as opposed to cash
  or mobile money) in the countries we care about

## Sources — round 2

- [Coinbase Onramp FAQ (guest checkout / offramp requirements)](https://docs.cdp.coinbase.com/onramp/additional-resources/faq)
- [MoonPay: how to sell crypto](https://support.moonpay.com/en/articles/384277-how-do-i-sell-cryptocurrency-with-moonpay) · [Sell page & fees](https://www.moonpay.com/sell) · [Off-ramp widget docs](https://dev.moonpay.com/widget/off-ramp-overview) · [ACH sell launch](https://www.moonpay.com/learn/blog/ach-sell)
- [Transak fees & pricing](https://support.transak.com/en/articles/7845942-how-does-transak-calculate-prices-and-fees) · [Off-ramp docs](https://docs.transak.com/products/off-ramp) · [KYC for off-ramp](https://support.transak.com/en/articles/7846033-kyc-process-for-offramp)
- [Stellar Anchor Directory guide](https://stellar.org/blog/developers/anchor-directory-guide-finding-interoperable-asset-issuers-on-off-ramps-stellar) · [Anchors explained](https://developers.stellar.org/docs/learn/fundamentals/anchors) · [SEP-6 programmatic deposit/withdrawal](https://developers.stellar.org/docs/build/apps/wallet/sep6)
