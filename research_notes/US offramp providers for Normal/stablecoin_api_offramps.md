# Stablecoin-native, API-first off-ramp providers for a self-custody wallet (USDC → US bank payout to the END USER), as of 2026-10-08

Scope: Crossmint, Bridge (Stripe), Sphere, Beam, Coinflow, Zero Hash, Paxos, BlindPay, Borderless, Stellar anchors (SEP-24/SEP-6). Method: primary docs fetched directly (docs.crossmint.com, apidocs.bridge.xyz, docs.spherepay.co, docs.coinflow.cash, docs.zerohash.com, blindpay.com/docs, docs.borderless.xyz, anchors.stellar.org) plus a handful of news/third-party pages where flagged. Many vendor doc pages 404'd or are JS-rendered; every "not stated" below means the fetched docs were silent, not that the feature is absent.

Headline (details and citations in the sections below):
- Only TWO of the API providers document native USDC-on-Stellar intake today: **Bridge** (liquidation address on chain `stellar`, returns a `blockchain_memo`) and **BlindPay** (dedicated `/payouts/stellar` endpoints, Stellar mainnet treasury address). **Zero Hash** custodies/accepts USDC on Stellar (USDC.XLM) but is a B2B2C brokerage stack, not a drop-in "deposit address → bank" off-ramp. **Crossmint's** offramp create-order enum lists only `solana`, `base`, `polygon` in production ("additional chains on request") — the "40+ chains" marketing claim does NOT translate to Stellar offramp in docs, and Crossmint's own chain table says Stellar onramp is "not the US". **Sphere**, **Coinflow**, **Borderless** do not list Stellar.
- **Beam is gone as a standalone product**: ansiblelabs.xyz → getbeam.cash → redirects to moderntreasury.com; Modern Treasury acquired Beam on 2025-10-22 for $40M stock.
- **Stellar Anchor Directory returns "No ramp assets available for this location" for the United States** — I found no SEP-24 anchor paying USD to US bank accounts.

---

## Key Question 1: Which providers can take USDC on Stellar directly (no bridge) and pay a US consumer's bank?

### Takeaway
Bridge and BlindPay are the only providers whose public docs show a native Stellar USDC intake that terminates in a US bank payout (ACH/wire/RTP-FedNow). Crossmint's offramp is documented for Solana/Base/Polygon only (Stellar "on request"); Sphere/Coinflow/Borderless list no Stellar; Zero Hash supports USDC.XLM but as brokerage/custody infrastructure, not a consumer deposit-address off-ramp.

### Cited Findings

#### Crossmint (Offramp API)
- Positioning: "Crossmint Offramp lets your users convert USDC into fiat and withdraw it to their own bank account without leaving your app, with Crossmint handling compliance, conversion, and the bank payout." — [Crossmint docs: How it works](https://docs.crossmint.com/offramp/concepts/how-it-works)
- First-party only: "The destination bank account must belong to the same user who owns the wallet and completed verification"; it "pays users out to **their own** bank accounts, never to third parties." — [Crossmint docs: How it works (md)](https://docs.crossmint.com/offramp/concepts/how-it-works.md)
- **Chains accepted by Create Offramp Order**: Staging `solana`, `base-sepolia`, `polygon-amoy`; Production `solana`, `base`, `polygon`. "Additional chains are available on request. Contact Crossmint support to enable them." Stellar is NOT in the enum. — [Crossmint API ref: Create order](https://docs.crossmint.com/offramp/api-reference/create-order.md)
- Crossmint's chain matrix (Wallets/Checkout/Onramp/Tokenization — no Offramp column) lists Stellar with Onramp ✅ but states: "Stellar is supported in the EU and Rest of World, but not the US." — [Crossmint docs: Supported chains](https://docs.crossmint.com/introduction/supported-chains.md)
- Marketing page claims "40+ chains", "Support for most major EVM chains, Solana, and more", "13+ rails incl. ACH, RTP, SEPA", "150+ countries"; Stellar is not named on that page. — [crossmint.com/products/offramps](https://www.crossmint.com/products/offramps)
- Input asset: only USDC appears in the offramp docs (`payment.currency: "usdc"`); marketing says "Stablecoins (USDC, USDT)". — [Create order](https://docs.crossmint.com/offramp/api-reference/create-order.md); [crossmint.com/products/offramps](https://www.crossmint.com/products/offramps)
- Fiat currencies accepted in `currencyLocator`: "USD, EUR, GBP, MXN, COP (core); AUD, SGD, HKD, KRW, INR, VND, JPY (subject to availability)". — [Create order](https://docs.crossmint.com/offramp/api-reference/create-order.md)
- US payout rails and limits: ACH "1 business day", "$50,000 per transaction"; Same-day ACH "Same day", "$50,000 per transaction"; RTP "Instant", "24/7", "$1,000,000 per transaction"; Wire "Same day", "No limit". EU: SEPA Instant "€500,000 per transaction", SEPA "1 to 2 business days"; SWIFT "Q4 launch". UK Faster Payments "Q4 launch", "£1,000,000 per transaction". LatAm: SPEI, Bre-B, COP bank transfer, Pix "Q4 launch". — [Crossmint docs: Payment methods](https://docs.crossmint.com/offramp/payment-methods.md)
- KYC: "US residents always complete Full KYC" (ID document + selfee + dueDiligence); Light KYC (<$1,000/yr) "is available to non-US residents". Hosted: "The user completes KYC inside secure embedded components"; or import: "You pass user data to Crossmint via API (Sumsub token-sharing coming soon)". Eligibility flags `offramp` / `offramp-light`. — [Crossmint docs: KYC and compliance](https://docs.crossmint.com/offramp/concepts/kyc-and-compliance.md)
- Flow endpoints: `GET /api/2025-06-09/users/<USER_LOCATOR>/identity-verification`; `POST /api/unstable/payment-methods` (type `bank-account-us`, on vault.staging.crossmint.com); `PUT /api/2025-06-09/users/<USER_LOCATOR>/linked-wallets/<ADDRESS>`; `POST /api/2022-06-09/orders`; `GET /api/2022-06-09/orders/<ORDER_ID>`. — [Crossmint REST quickstart](https://docs.crossmint.com/offramp/quickstarts/rest-api.md)
- Payout timing: "Stablecoin receipt and conversion are typically near real time. Fiat delivery timelines depend on the selected payout method and recipient bank, and may range from same-day to several business days." — [crossmint.com/products/offramps](https://www.crossmint.com/products/offramps)

#### Bridge (Stripe-owned)
- Supported source blockchains for payment routes include "Arbitrum, Avalanche C-Chain, Base, Celo, Ethereum, HyperEVM, Linea, Monad, Optimism, Polygon, Solana, **Stellar**, Tempo, Tron, XDC, World Chain, Sui, and Aptos"; source currencies "USDC, USDT, USDB, OUSD, PYUSD, EURC, CASH, PATHUSD, USDP, USDG, USDSUI, USDCBL". — [Bridge docs: Payment routes](https://apidocs.bridge.xyz/get-started/introduction/what-we-support/payment-routes)
- Fiat destinations: "ACH (USD), FedNow (USD), Wire (USD)", "SEPA (EUR)", "Faster Payments (GBP)", "SPEI (MXN)", "Pix (BRL)", "Bre-B & Bank Transfer (COP)". — [Bridge docs: Payment routes](https://apidocs.bridge.xyz/get-started/introduction/what-we-support/payment-routes)
- Stellar memo: for a Stellar liquidation address, "blockchain_memo will be provided as part of the response. This must be included in the crypto deposit memo." (example memo "12345"). — [Bridge docs: Liquidation address](https://apidocs.bridge.xyz/platform/orchestration/liquidation_address/liquidation_address)
- Liquidation address definition: "a permanent payment route which ties a blockchain address to either a fiat or blockchain address"; "Bridge will automatically send funds to the destination." Duplicate (same customer + chain + currency + destination) not allowed. — [Bridge docs: Liquidation address](https://apidocs.bridge.xyz/platform/orchestration/liquidation_address/liquidation_address)
- Offramp guide: register `POST /v0/customers/<id>/external_accounts` (US bank, SEPA IBAN, MXN CLABE), then `POST /v0/customers/<id>/liquidation_addresses` with `currency`, `chain`, `destination_payment_rail`, `return_address`; monitor `GET .../liquidation_addresses/<id>/drains`. "Real-time rails (e.g. wire, sepa, blockchains): funds are sent instantly" vs "Batch rails (e.g. ach): funds are queued and processed daily." — [Bridge guide: Offramp via liquidation address](https://apidocs.bridge.xyz/get-started/guides/move-money/offramp_liquidation)
- ACH batch: "transactions are queued and processed as part of Bridge's daily ACH batch submission, which occurs at 1:00 pm EST/EDT" (from search summary of Bridge docs; not re-verified on page). — [Bridge docs search result](https://apidocs.bridge.xyz/docs/liquidation-address)
- Minimums: "USD routes (ACH/Wire/FedNow): mostly minimum of $1"; SEPA €1–€2; SPEI 50 MXN; Pix 10 BRL. Warning: "Deposits sent to unsupported asset/blockchain pairs or to incorrect addresses may be irretrievable and permanently lost." EEA: "USDC & EURC are the only stablecoins supported for users in the EEA". — [Bridge docs: Payment routes](https://apidocs.bridge.xyz/get-started/introduction/what-we-support/payment-routes)
- US individual KYC data: "Social Security number (required only for Usa residents)", "ID verification (optional for US residents with minimal payment activity)"; database-verified US customers without photo ID can transact "$10,000 per transaction or $100,000 lifetime. Once those thresholds are exceeded, photo ID verification will be required." Accepted IDs "ssn", "itin". — [Bridge docs: Individuals compliance](https://apidocs.bridge.xyz/platform/customers/compliance/individuals.md)
- Hosted KYC: `kyc_link` "a hosted KYC/B flow with our partner", `tos_link` to Bridge ToS; statuses `not_started`, `incomplete`, `awaiting_ubo`, `under_review`, `approved`, `rejected`, `paused`, `offboarded`; "average decision time for KYC is typically less than one minute", manual reviews may run to next business day; `redirect_uri` and iframe embedding supported. — [Bridge docs: KYC links](https://apidocs.bridge.xyz/platform/customers/customers/kyclinks.md)

#### Sphere (spherepay)
- Supported networks for wallets/transfers: "Solana, Ethereum, Tron, Polygon, Base, Arbitrum, Avalanche, and Starknet" — Stellar not listed (search summary of docs.spherepay.co/platform/wallets; the page itself 404'd on direct fetch). — [Sphere docs: Wallets (via search)](https://docs.spherepay.co/platform/wallets)
- Off-ramp: "Each incoming transfer to an off-loader wallet automatically triggers an instant conversion from a supported stablecoin (USDC or USDT) into fiat (USD), which is then immediately delivered to the linked bank account." (search summary). — [Sphere docs: Off-ramp](https://docs.spherepay.co/guide/transfer/automating-transfer/off-ramp)
- Rails/fee claim: "USD and EUR transfers via Wire, ACH, and SEPA, with transfer times ranging from instant to 2–3 days depending on the method used, and a 0.01% conversion fee applies to each transaction" (Sphere's knowledge-base FAQ; vendor-stated). — [Sphere FAQ](https://spherepay-knowledge-base.help.usepylon.com/articles/4410192956-frequently-asked-questions-faq-ramp-on-ramp-off-ramp)
- Model: Customer = "An individual or business on whose behalf transfers are executed. Must be KYC/KYB verified before any transfer can be initiated." Wallet = "A crypto wallet address linked to a customer"; Transfer = "A single money movement event between a customer's bank account and wallet, in either direction." — [Sphere docs: How it works](https://docs.spherepay.co/get-started/how-it-works)
- KYC: via Sumsub, "either directly via the SpherePay API or through a hosted KYC/KYB link"; "KYC review typically takes 0–2 business days after all required documents and data are submitted." Data: email, phone, residence country, address, tax ID, name, DOB, government ID, proof of address, face liveness; EEA+ adds `accountPurpose`, `countryOfBirth`, `nationality`. — [Sphere docs: Individual KYC](https://docs.spherepay.co/concepts/onboarding/individual-kyc); [How it works](https://docs.spherepay.co/get-started/how-it-works)

#### Beam (Ansible Labs)
- https://www.ansiblelabs.xyz/ 301-redirects to https://www.getbeam.cash/, which 301-redirects to https://www.moderntreasury.com/?utm_source=beam... (observed 2026-10-08). — [ansiblelabs.xyz redirect](https://www.ansiblelabs.xyz/)
- "Modern Treasury acquires Beam stablecoin startup for $40 million all-stock", dated October 22, 2025; Beam described as "a software development firm building a plug-and-play solution for banks and corporations to adopt stablecoins"; founder Dan Mottice joins Modern Treasury. — [The Block](https://www.theblock.co/post/375689/salesforce-backed-paytech-firm-modern-treasury-acquires-beam-stablecoin-startup-40-million-all-stock-fortune)
- Historical (older info, 2023–2024): Beam partnered with Zero Hash as its regulated rail ("Beam leverages Zero Hash's API infrastructure"); API v2 (March 2024) targeted "programmatic stablecoin & crypto off-ramp to corporate / SMB checking accounts"; chains "Ethereum, Solana, Polygon, Bitcoin, Dogecoin, Avalanche". — [FinancialContent press release 2023](https://markets.financialcontent.com/ms.intelvalue/article/gnwcq-2023-4-18-ansible-labs-the-payments-company-bridging-crypto-and-the-traditional-economy-has-partnered-with-zero-hash-to-facilitate-a-seamless-crypto-off-ramp); [gen.xyz blog](https://gen.xyz/blog/ansiblelabsxyz)

#### Coinflow
- US coverage: "Withdraws are available to all US bank accounts and permanent residents in all 50 US States + Territories"; "Instant Withdrawals via RTP: ~80% of US banks"; "ACH (Same Day & standard): 100% of US banks"; "Push to Card: Eligible Visa/Mastercard debit cards". Also "Coinflow Withdraw is only available to US Bank Accounts and US citizens/residents with Social Security Numbers/Tax ID Numbers." UK Faster Payments (GBP), SEPA Instant/standard (33 countries, EUR IBAN only), Brazil PIX. — [Coinflow docs: Available countries](https://docs.coinflow.cash/guides/payouts/payout-methods/available-countries)
- Three funding models: "Merchant Coinflow Balance" (Coinflow managed), "Merchant BYO Wallet" (you pay gas), "Direct User Withdrawal" ("User managed" — "User's wallet" signs). Endpoints: Create Withdrawer (KYC/KYB), Add Bank Account, Tokenize Debit Card, Initiate Withdrawal, Get Withdrawal Status. — [Coinflow docs: API integration](https://docs.coinflow.cash/guides/payouts/implementation-methods/api-integration)
- KYC options: prebuilt (US: email, name, address, country, DOB, last-4 SSN; "Instant database verification for US"), KYC Attestation ("2-4 weeks (compliance review required)"), External KYC Data Passing, Sumsub token sharing ("1-2 weeks (tri-party agreement)"), Persona token sharing ("1-2 weeks"). — [Coinflow docs: What is KYC](https://docs.coinflow.cash/guides/payouts/kyc-verification/what-is-kyc)
- Supported chains/tokens: not stated in any fetched Coinflow page; Stellar not mentioned anywhere. — [Coinflow docs](https://docs.coinflow.cash/guides/payouts/payout-methods/available-countries)

#### Zero Hash
- Production stablecoin table: USDC in 21 variants including "Stellar" (USDC.XLM), Base, Solana, Ethereum; all with Custody "Yes", Deposit "Full support", Liquidity "Yes". New York support limited to a list that includes "USDC (Stellar)". — [Zero Hash docs: Production stablecoins](https://docs.zerohash.com/page/production-environment-stablecoins)
- Business model: "zerohash is a digital asset infrastructure provider that enables financial institutions and fintech companies to integrate crypto trading, stablecoin payments, and tokenized assets into their platforms." Products: On & Off Ramp, Payouts, Payins; "100+ assets", "7M+ end customers across partners". — [zerohash.com](https://zerohash.com/)
- Licensing: FinCEN MSB; state money transmitter licenses in 51 U.S. jurisdictions; NY BitLicense via affiliate; NMLS ID# 1699379; FINTRAC MSB (Canada). — [zerohash.com](https://zerohash.com/); [Zero Hash FAQ (license list)](https://docs.zerohash.com/page/faq)
- Pricing disclosure (ZHEU/RFQ): spread parameter "100 - 400 bps"; commission "either a fixed amount (e.g., $10 per trade) or percentage (e.g., 0.5% of the notional value of each trade)", "negotiated between ZHEU and applicable Platform Operators"; blockchain fees may apply to withdrawals. — [Zero Hash pricing disclosures](https://zerohash.com/disclosures/pricing-and-fees)
- "Stablecoin Payouts" product (fiat→stablecoin direction): USDC across 10+/15 networks, `POST /payouts`. This is the reverse direction of what we need. — [Zero Hash changelog: Stablecoin payouts](https://docs.zerohash.com/changelog/stablecoin-payouts)

#### Paxos
- Paxos exposes "stablecoin issuance and 1:1 conversion, crypto brokerage and order-book trading, held-rate quotes, custody, fiat and crypto transfers, identity/KYC and account onboarding" via API (search summary of docs.paxos.com; homepage fetch showed only section headers). — [docs.paxos.com](https://docs.paxos.com/)
- "Paxos Crypto Brokerage is a turnkey, API-based solution that enables companies to offer cryptocurrency buying, selling, holding and sending capabilities within their own applications ... while Paxos manages regulatory oversight". — [Paxos newsroom (Revolut release, 2020 — older info)](https://www.paxos.com/newsroom/paxos-crypto-brokerage-revolut-press-release)
- No fetched Paxos page documents USDC-on-Stellar intake or an end-user "deposit address → bank" off-ramp. — [docs.paxos.com](https://docs.paxos.com/)

#### BlindPay
- Stellar payout flow: `POST /v1/instances/{id}/payouts/stellar/authorize` (returns unsigned tx) → sign with sender key → `POST /v1/instances/{id}/payouts/stellar`; mainnet treasury "GCOSSQDM2SWMHRP7CDBOLL2V45NHCRLUWUCEHPPBA2ABCOOLPOLZKIHE"; testnet token USDB, mainnet USDC; prerequisites: customer `kyc_status: "approved"`, bank account `ba_...`, unexpired quote `qu_...`; "Stellar not yet supported for managed wallets". — [BlindPay docs: Payout Stellar](https://blindpay.com/docs/payout-stellar)
- Rails: "ACH, Wire, RTP — United States"; SEPA; PIX; SPEI (Bitso); ACH COP; Argentina transfers; SWIFT ("100 USD" min). SEPA min "11 USDC when quoting by sender amount, 10 EUR when quoting by receiver amount". Networks: "EVM (Ethereum, Base, Polygon, Arbitrum), Stellar, Solana"; testnets `base_sepolia`, `stellar_testnet`, `solana_devnet`. Flow: add bank account → payout quote ("locks the exchange rate and fees for 5 minutes") → execute. Third-party bank accounts allowed ("a customer named 'John' can have a payout sent to a bank account belonging to 'Jack'"). Webhooks `payout.new`, `payout.update`, `payout.complete`, `payout.partnerFee`. Dev instances auto-complete; $666 forces failed, $777 refunded. — [BlindPay docs: Payouts](https://blindpay.com/docs/payouts)
- Offramp wallets (BlindPay-managed deposit address auto-converting to a linked bank account): networks "Tron, Solana, Ethereum, Polygon, Arbitrum, Base, Tempo, and Arc" — Stellar NOT in this list; minimums 50 USDC (Solana) to 200 USDT (Tron); Tron adds 15 USDT fee, others 0–1 USDC; "USDT deposits always convert at a flat 1:1 rate with no market spread". — [BlindPay docs: Offramp wallets](https://blindpay.com/docs/offramp-wallets)
- Pricing: "$399/month, billed annually" (Basic), "$1,599/month, billed annually" (Business+), Enterprise custom; "Add your fees on each transaction"; per-rail transaction fees not published. — [blindpay.com/pricing](https://blindpay.com/pricing)

#### Borderless
- "one API integration" to "regulated on-ramp and off-ramp providers, local rails, and stablecoins around the world"; identity/compliance object must be created before payments. — [docs.borderless.xyz](https://docs.borderless.xyz/)
- Coverage: "100+ currencies" incl. USD, EUR, GBP; rails "e.g. local bank schemes (SPEI, SEPA, FPS), card rails, SWIFT"; no network/stablecoin list on the coverage page. — [Borderless docs: Coverage](https://docs.borderless.xyz/docs/coverage.md)
- Third-party listing: "USDC, USDT, and EURC across Ethereum, Polygon, Base, Optimism, Celo, and Solana"; "94 countries", "63 currencies", "14+ licensed financial institutions" (aggregator claims, not Borderless docs). — [thegrid.id profile](https://thegrid.id/profiles/borderless)

### Inferences
- For Normal's "USDC-on-Stellar in → user's US bank out" requirement, Bridge is the only provider with a documented permanent deposit-address + memo model on Stellar; BlindPay works but requires the client to build/sign a Stellar payment to BlindPay's treasury after a quote (5-minute expiry), which is a tighter UX coupling.
- Crossmint would require a Soroswap/CCTP hop to Solana/Base first unless Stellar is enabled "on request"; the team's earlier assumption that Crossmint takes Stellar USDC natively for offramp is NOT supported by its current offramp API reference.
- Zero Hash can technically take USDC.XLM, but its product is custody+brokerage for a "Platform Operator"; using it as a consumer off-ramp means Normal becomes the platform operator with a sell→fiat withdrawal integration (heavier build; see KQ2).

### Gaps
- Crossmint: whether Stellar can be enabled for offramp "on request" for US users — docs say contact support; no public confirmation. Crossmint's chain table says Stellar onramp is unavailable in the US; unknown whether the same applies to offramp.
- Sphere: Stellar status only from a search summary of a page that 404'd on direct fetch; no fetched Sphere page listed rails with limits.
- Coinflow: supported chains/tokens not found in any fetched page.
- Borderless: supported networks not documented on its coverage page; US rail specifics (ACH/RTP) not stated.
- Paxos: no end-user off-ramp documentation found; treat as institutional brokerage/issuer only.

---

## Key Question 2: Which providers require the partner to be the regulated party or to custody funds, vs. which handle user KYC and payout under their own license?

### Takeaway
Crossmint, Bridge, Zero Hash explicitly state they are the licensed money transmitter / MSB; Coinflow, Sphere, BlindPay, Borderless perform the end-user KYC under their own programs but their fetched docs do not state the licensing entity. None of the fetched docs say the integrating wallet needs its own MTL; equally, none make an explicit "you don't need a license" promise — all gate production behind KYB and (Crossmint) a signed order form.

### Cited Findings
- Crossmint: "Crossmint Financial Services US is registered with FinCEN as a Money Services Business (MSB)"; "Crossmint Europe, S.L. is authorised by the Spanish National Securities Market Commission (CNMV) as a crypto-asset service provider (CASP)"; "Crossmint Canada Ltd. is registered with FINTRAC as a Money Services Business (MSB)". Crossmint provides "regulatory and licensing coverage"; "You build the in-app experience and handle order creation/tracking." — [crossmint.com/products/offramps](https://www.crossmint.com/products/offramps); [How it works (md)](https://docs.crossmint.com/offramp/concepts/how-it-works.md)
- Crossmint custody: the user signs and broadcasts a Crossmint-prepared USDC transfer from the user's own wallet (`payerAddress`); Crossmint never holds the user's keys. — [Create order](https://docs.crossmint.com/offramp/api-reference/create-order.md)
- Crossmint compliance reservation: "Crossmint's compliance team may request a specific document from a user at any time". — [KYC and compliance](https://docs.crossmint.com/offramp/concepts/kyc-and-compliance.md)
- Bridge: "Money transmission services for applicable services provided to US residents are provided by Bridge Building Inc NMLS # 2450917"; EEA via "Bridge Building Sp. Z.o.o., KRS: 0001039515, RDWW-794"; non-EEA via "Bridge Ventures LLC". — [Bridge fee disclosure statement](https://bridge.xyz/legal/fee-disclosure-statement/overview)
- Bridge KYC/ToS: customers accept Bridge's own Terms of Service (`tos_link`) and complete Bridge's hosted KYC (`kyc_link`) — the end user is Bridge's customer of record. — [Bridge docs: KYC links](https://apidocs.bridge.xyz/platform/customers/customers/kyclinks.md)
- Zero Hash: FinCEN MSB; MTLs in 51 U.S. jurisdictions; NY BitLicense; NMLS 1699379. Fees are "negotiated between ZHEU and applicable Platform Operators" and disclosed to the end user — i.e. the partner is a "Platform Operator" on top of Zero Hash's regulated stack. — [zerohash.com](https://zerohash.com/); [Zero Hash pricing disclosures](https://zerohash.com/disclosures/pricing-and-fees)
- Coinflow: end-user KYC is Coinflow's ("Coinflow Prebuilt KYC"), but bring-your-own options need "pre-approval from Coinflow compliance"; licensing entity not stated in the fetched pages. — [Coinflow docs: What is KYC](https://docs.coinflow.cash/guides/payouts/kyc-verification/what-is-kyc)
- Sphere: KYC "mandated by anti-money laundering (AML) regulations" via Sumsub; Platform-Managed KYC requires "approval from Sphere's Compliance team before going live" and embedding Sphere's terms in the platform's documentation; licensing entity not stated. — [Sphere docs: Individual KYC](https://docs.spherepay.co/concepts/onboarding/individual-kyc)
- BlindPay: payouts require "a customer who has completed KYC"; funding either "BlindPay-managed wallet — custodied by BlindPay" or "External wallet — requires on-chain authorization"; licensing entity not stated on fetched pages. — [BlindPay docs: Payouts](https://blindpay.com/docs/payouts)
- Borderless: routes through "regulated on-ramp and off-ramp providers"; aggregator says "14+ licensed financial institutions". — [docs.borderless.xyz](https://docs.borderless.xyz/); [thegrid.id](https://thegrid.id/profiles/borderless)

### Inferences
- Crossmint and Bridge are the two with a clear, published "we are the US money transmitter and the user is our KYC'd customer" posture, which is the fit for a non-custodial wallet that must not touch funds.
- Zero Hash is structurally the same (regulated party) but assumes the partner operates a brokerage experience (quotes, orders, custody accounts), so it is heavier than a deposit-address off-ramp.
- BlindPay's "third-party bank account allowed" rule indicates a B2B payouts orientation; it still KYCs the customer, but the first-party-only guarantee Crossmint makes is absent.

### Gaps
- No fetched page from any provider explicitly says "the integrating app does not need its own money-transmitter registration." Legal confirmation should be obtained from each vendor's counsel/sales.
- Coinflow, Sphere, BlindPay, Borderless: licensed entity/NMLS not found in fetched docs.

---

## Key Question 3: Fees, limits, payout speed

### Takeaway
Only Crossmint publishes US rail limits/timing (ACH $50k/1 day, same-day ACH $50k, RTP $1M instant, wire no limit); Bridge publishes minimums (~$1) and rail cadence (ACH daily batch, wire/FedNow real-time) but says "reach out to sales" on fees, with a disclosed FX spread cap of 1%; BlindPay publishes subscription tiers ($399 / $1,599 per month) but not per-rail fees; Sphere claims a 0.01% conversion fee; Zero Hash discloses spread range 100–400 bps and negotiated commissions.

### Cited Findings
- Crossmint US rails: ACH "1 business day", "$50,000 per transaction"; Same-day ACH "Same day", "$50,000 per transaction"; RTP "Instant", "24/7", "$1,000,000 per transaction"; Wire "Same day", "No limit"; processing window "GMT 01:45pm to 08:00pm" for ACH/wire. — [Crossmint payment methods](https://docs.crossmint.com/offramp/payment-methods.md)
- Crossmint fees: "Fees vary based on payout method, destination country, and transaction volume. Pricing details are provided based on the specific integration." Partner revenue share: not stated. — [crossmint.com/products/offramps](https://www.crossmint.com/products/offramps)
- Bridge fees: "Please reach out to sales@bridge.xyz to discuss pricing." — [Bridge docs: Pricing](https://apidocs.bridge.xyz/platform/additional-information/pricing.md)
- Bridge FX: "your transaction will be charged a currency spread on top of the actual exchange rate up to 1% of the transaction's fiat value"; service charge "determined solely by the Partner". — [Bridge fee disclosure](https://bridge.xyz/legal/fee-disclosure-statement/overview)
- Bridge developer fee (partner revenue): "Fees are automatically withheld from the customer's transaction amount"; "settled and paid out monthly on the 5th of each month to your configured external account ... always pay out in USD"; liquidation addresses support global or per-address `custom_developer_fee_percent` (example "10.2"). "Minimums are enforced after developer fees are deducted." — [Bridge docs: Developer fees](https://apidocs.bridge.xyz/platform/orchestration/fees-and-mins/devfees); [Liquidation address](https://apidocs.bridge.xyz/platform/orchestration/liquidation_address/liquidation_address); [Transaction minimums](https://apidocs.bridge.xyz/platform/orchestration/fees-and-mins/mins.md)
- Bridge self-serve tier: "self-help option with no monthly minimum commitment for volumes up to $100K rolling per month"; passthrough fees for "KYC/KYB identity verification", "Virtual bank account provisioning", "On-chain transaction/network fees" (third-party help article, 2025-06-05). — [Rehive: Understanding Bridge's fees](https://rehive.intercom.help/en/articles/11519468-understanding-bridge-s-fees)
- Bridge timing: ACH daily batch "1:00 pm EST/EDT" (search summary); "Real-time rails (e.g. wire, sepa, blockchains): funds are sent instantly". Bridge user limits without photo ID: "$10,000 per transaction or $100,000 lifetime". — [Bridge offramp guide](https://apidocs.bridge.xyz/get-started/guides/move-money/offramp_liquidation); [Individuals compliance](https://apidocs.bridge.xyz/platform/customers/compliance/individuals.md)
- Sphere: "0.01% conversion fee applies to each transaction"; "transfer times ranging from instant to 2–3 days". — [Sphere FAQ](https://spherepay-knowledge-base.help.usepylon.com/articles/4410192956-frequently-asked-questions-faq-ramp-on-ramp-off-ramp)
- Coinflow: RTP instant to "~80% of US banks"; ACH same-day/standard; push-to-card; fees/limits not stated. — [Coinflow available countries](https://docs.coinflow.cash/guides/payouts/payout-methods/available-countries)
- BlindPay: "$399/month" / "$1,599/month" billed annually; per-rail fees not published; offramp-wallet minimums 50 USDC (Solana) to 200 USDT (Tron); Tron +15 USDT, others 0–1 USDC network fee; quote locks "for 5 minutes". — [blindpay.com/pricing](https://blindpay.com/pricing); [Offramp wallets](https://blindpay.com/docs/offramp-wallets); [Payouts](https://blindpay.com/docs/payouts)
- Zero Hash: spread "100 - 400 bps" (RFQ, ZHEU); commission fixed or % "negotiated"; no published ACH/wire fee. — [Zero Hash pricing disclosures](https://zerohash.com/disclosures/pricing-and-fees)

### Inferences
- Crossmint's RTP ($1M, instant, 24/7) plus same-day ACH gives the best documented US payout speed; Bridge's FedNow route should be comparable but its docs did not publish a per-rail limit.
- Real per-transaction cost for every provider except Sphere's headline 0.01% requires a sales conversation; budget for KYC passthrough fees (Bridge) or monthly platform fees (BlindPay).

### Gaps
- No provider publishes a partner revenue-share schedule except Bridge's developer-fee mechanics (amount is partner-set, not Bridge-paid).
- Bridge per-rail limits (max per ACH/FedNow/wire) not found.
- Coinflow fees, limits, and timing beyond rail availability: not stated.

---

## Key Question 4: Does each have a deposit-address + webhook model (so the wallet app can send with the user's own key)?

### Takeaway
Bridge (permanent liquidation address + Stellar memo + drains/webhooks) is the cleanest fit. Crossmint uses an order-scoped prepared transaction (serializedTransaction with memo) that the user's wallet signs — same effect, no reusable address. BlindPay offers per-customer offramp wallets (deposit address) on EVM/Solana/Tron/Tempo/Arc but NOT Stellar; on Stellar the client must sign a BlindPay-authorized payment to BlindPay's treasury. Coinflow's "Direct User Withdrawal" has the user's wallet sign. Sphere uses "off-loader wallets" (deposit address) but no Stellar.

### Cited Findings
- Bridge: liquidation address is "a permanent payment route"; Stellar response includes `blockchain_memo` which "must be included in the crypto deposit memo"; drains visible via `GET .../liquidation_addresses/<id>/drains`; webhooks documented with signature verification. — [Liquidation address](https://apidocs.bridge.xyz/platform/orchestration/liquidation_address/liquidation_address); [Offramp guide](https://apidocs.bridge.xyz/get-started/guides/move-money/offramp_liquidation); [Webhooks](https://apidocs.bridge.xyz/platform/additional-information/webhooks/overview.md); [Webhook signature](https://apidocs.bridge.xyz/platform/additional-information/webhooks/signature.md)
- Crossmint: response `payment.preparation.serializedTransaction` — "The serialized stablecoin transfer to broadcast. Deserialize it, then sign and send it from the payer wallet." plus `transactionParameters.memo`; "No separate deposit address field". Order tracking "by polling or webhooks". Statuses `awaiting-payment` → `completed`; `delivery.rail` e.g. `"ach-same-day"`. — [Create order](https://docs.crossmint.com/offramp/api-reference/create-order.md); [REST quickstart](https://docs.crossmint.com/offramp/quickstarts/rest-api.md); [Going to production](https://docs.crossmint.com/offramp/guides/going-to-production.md)
- BlindPay: offramp wallet = "a blockchain wallet that BlindPay creates and manages for you, tied to one of your customer's bank accounts"; "the moment funds land, conversion and settlement to the linked bank account happen on their own"; networks Tron/Solana/Ethereum/Polygon/Arbitrum/Base/Tempo/Arc (no Stellar). Stellar path: authorize → sign → create payout to treasury address. Webhook events `payout.new/update/complete/partnerFee`. — [Offramp wallets](https://blindpay.com/docs/offramp-wallets); [Payout Stellar](https://blindpay.com/docs/payout-stellar); [Payouts](https://blindpay.com/docs/payouts)
- Coinflow: "Direct User Withdrawal: 'User managed' balance where 'User's wallet' signs transactions"; withdraw webhooks page exists. — [Coinflow API integration](https://docs.coinflow.cash/guides/payouts/implementation-methods/api-integration); [Coinflow withdraw webhooks](https://docs.coinflow.cash/guides/developer-resources/webhooks/withdraw-webhooks.md)
- Sphere: "Each incoming transfer to an off-loader wallet automatically triggers an instant conversion" (search summary). — [Sphere off-ramp](https://docs.spherepay.co/guide/transfer/automating-transfer/off-ramp)
- Borderless: webhooks documented (`/docs/webhooks`, `/docs/withdrawal-webhooks`); off-ramp withdrawal page 404'd. — [Borderless llms index](https://docs.borderless.xyz/llms.txt)

### Inferences
- With Bridge, Normal can create one Stellar liquidation address per user per bank account, display address+memo in-app, and let the Turnkey-signed payment go out from the user's wallet; reconciliation is via drains/webhooks. This matches the existing MoneyGram SEP-24-style "send to anchor address with memo" pattern already in the codebase.
- Crossmint's prepared-transaction model is also compatible with self-custody (the app signs what Crossmint prepares), but requires Crossmint to produce a Stellar transaction — not documented today.

### Gaps
- Bridge Stellar-specific confirmation count / drain latency not found (chain-specific liquidation-address page 404'd).
- Crossmint webhook event names/signature scheme not extracted (Manage Orders page not fetched).

---

## Key Question 5: Sandbox before KYB, and KYB lead time

### Takeaway
Crossmint staging simulates payouts end-to-end and is API-key based; production needs "a signed Order Form and completed KYB verification". Bridge sandbox is NOT self-serve (email support@bridge.xyz for a developer account) and simulates everything with dummy data. Sphere has no sandbox at all ("Testing happens directly against production systems using real identity information"). BlindPay has development instances that auto-complete payouts. Coinflow's bring-your-own-KYC paths carry 1–4 week compliance lead times. No provider publishes a KYB SLA.

### Cited Findings
- Crossmint staging: "In the staging environment, payouts are **simulated**, so you can run the full flow end to end without funds moving." Production: "Production access requires a signed Order Form and completed KYB verification, and your project enabled for KYC data sharing." Production key scopes `orders`, `payment-methods`, `users.create`, `users.read`. — [How it works (md)](https://docs.crossmint.com/offramp/concepts/how-it-works.md); [Going to production](https://docs.crossmint.com/offramp/guides/going-to-production.md)
- Bridge sandbox: "reach out to support@bridge.xyz to get onboarded with a Developer account within Bridge"; base URL "https://api.sandbox.bridge.xyz"; "Virtual Accounts, Static Memos, Liquidation Addresses, and Transfers are created with dummy data"; "There is no real money movement in Sandbox"; `POST /v0/customers/{customer_id}/simulate_kyc_approval`. Getting started points new users to "Contact sales". — [Bridge sandbox setup](https://apidocs.bridge.xyz/get-started/introduction/quick-start/setting-up-sandbox.md); [Get set up with Bridge](https://apidocs.bridge.xyz/get-started/introduction/quick-start/get-set-up-with-bridge.md)
- Sphere: "SpherePay does not maintain a separate sandbox environment. Testing happens directly against production systems using real identity information." — [Sphere how it works](https://docs.spherepay.co/get-started/how-it-works)
- BlindPay: "Development instances complete payouts automatically"; $666 → failed, $777 → refunded; testnets base_sepolia/stellar_testnet/solana_devnet. — [BlindPay payouts](https://blindpay.com/docs/payouts)
- Coinflow: KYC Attestation "2-4 weeks (compliance review required)"; Sumsub/Persona token sharing "1-2 weeks". — [Coinflow What is KYC](https://docs.coinflow.cash/guides/payouts/kyc-verification/what-is-kyc)
- Borderless: sandbox page exists ("triggering test outcomes by varying the transaction amount"). — [Borderless llms index](https://docs.borderless.xyz/llms.txt)

### Inferences
- Crossmint and BlindPay allow a full build in staging before any KYB; Bridge requires at least a support-approved developer account; Sphere requires real identities from day one.

### Gaps
- KYB document lists and approval SLAs: not published by any provider in fetched docs.
- Whether Bridge's developer account for sandbox requires KYB first: not stated.

---

## Key Question 6: Stellar anchors offering USD bank withdrawals to US residents via SEP-24/SEP-6

### Takeaway
The Stellar Anchor Directory shows "No ramp assets available for this location" when filtered for the United States, and no search surfaced a US-serving SEP-24 anchor that pays USD to a bank account. MoneyGram remains the only widely cited US anchor and it is cash pickup, not bank.

### Cited Findings
- anchors.stellar.org (and ?country=US): "No ramp assets available for this location." Page description: "Anchors connect the Stellar network to traditional banking rails so that currencies around the world can interoperate on a single, seamless platform". — [Stellar Anchor Directory](https://anchors.stellar.org/?country=US)
- Stellar's requirement for USDC anchors: "Deposits and withdrawals must be processed through local domestic payment rails (ACH, SEPA, SPEI, etc.), not via wire transfer" (search summary of stellar.org USDC FAQ). — [Stellar USDC FAQ](https://stellar.org/blog/usdc-stellar-faq)
- SEP-24 withdraw mechanics: the wallet POSTs to the anchor's SEP-24 withdraw endpoint, opens the interactive URL, then "the wallet must make a payment to the Stellar address that the anchor provides." — [SEP-24 tutorial](https://developers.stellar.org/docs/build/apps/example-application-tutorial/anchor-integration/sep24); [SEP-0024 spec](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md)
- Named active anchors: "MoneyGram, Settle, and Tempo" (search summary); the fiat on/off-ramps blog post names only Franklin Templeton and MoneyGram as case studies and defers to the directory. — [Stellar blog: fiat on/off ramps](https://stellar.org/blog/fiat-on-off-ramps-and-cross-border-payments-on-stellar)

### Inferences
- There is no SEP-24 route to a US bank account today; the US bank leg has to come from an API provider (Bridge/BlindPay for native Stellar, or Crossmint after a chain hop).

### Gaps
- The directory is JS-rendered; the fetch may not reflect anchors that list USD without a country filter. No anchor fee tables or USDC-vs-own-token facts could be gathered because no US anchor was found.
- Settle and Tempo: countries/currencies not verified (likely LatAm / EUR respectively — not confirmed).

---

## Key Question 7 (supporting): EU/UK rails and React Native/web suitability

### Takeaway
All API providers cover SEPA; Faster Payments is live at Bridge and Coinflow, "Q4 launch" at Crossmint. KYC is hosted-link or embedded-component based everywhere, so webview/RN is feasible; no provider's fetched docs mention an official React Native SDK for offramp.

### Cited Findings
- Crossmint: SEPA Instant "€500,000 per transaction", SEPA "1 to 2 business days", SWIFT "Q4 launch", Faster Payments "Q4 launch", "£1,000,000 per transaction". — [Crossmint payment methods](https://docs.crossmint.com/offramp/payment-methods.md)
- Bridge: "SEPA (EUR)", "Faster Payments (GBP)"; EEA stablecoins limited to USDC & EURC. — [Bridge payment routes](https://apidocs.bridge.xyz/get-started/introduction/what-we-support/payment-routes)
- Coinflow: "UK Faster Payments withdrawals to GBP denominated accounts"; "SEPA Instant and SEPA standard withdrawals to Euro denominated IBAN accounts" (33 countries). — [Coinflow available countries](https://docs.coinflow.cash/guides/payouts/payout-methods/available-countries)
- BlindPay: SEPA (Europe), SWIFT global. — [BlindPay payouts](https://blindpay.com/docs/payouts)
- Sphere: SEPA, "USD and EUR bank accounts globally ... including multi-currency accounts like Wise or Revolut" (search summary). — [Sphere FAQ](https://spherepay-knowledge-base.help.usepylon.com/articles/4410192956-frequently-asked-questions-faq-ramp-on-ramp-off-ramp)
- Bridge KYC link supports `redirect_uri` and iframe embedding. — [Bridge KYC links](https://apidocs.bridge.xyz/platform/customers/customers/kyclinks.md)
- Crossmint KYC: "secure embedded components" (web). — [Crossmint KYC](https://docs.crossmint.com/offramp/concepts/kyc-and-compliance.md)

### Inferences
- For Expo/RN, a hosted KYC URL in an in-app browser (Bridge, Sphere hosted link, Coinflow prebuilt) is the lowest-friction path; Crossmint's embedded components are web-first and would need to be verified for RN.

### Gaps
- No official React Native SDK statement found for any provider's offramp product.
