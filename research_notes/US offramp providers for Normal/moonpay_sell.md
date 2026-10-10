# MoonPay Sell (Off-Ramp) for a US-first self-custody wallet (web + React Native) — fact sheet as of 2026-10-08

Scope note: everything below was pulled from live pages on 2026-10-08. Where a page carries its own "last updated" date it is quoted. Items marked (2021) or (2025) are older announcements kept for history; treat them as possibly stale.

## KQ1. Is MoonPay Sell live for US customers with ACH payout today? Which US states are excluded?

### Takeaway
Yes. ACH payout for Sell is live in the US (Plaid-linked, 3-5 business days), alongside instant rails (PayPal, Venmo, Cash App, Visa/Mastercard push-to-card, MoonPay Balance). The only explicit state-exclusion list I found is the 2021 launch post (Hawaii, New York, Rhode Island); no current page re-states or retracts it, so the present-day exclusion list is unverified.

### Cited Findings
- Sell payout methods table (support article last updated **August 26, 2026**): "ACH Payment — US regions supporting ACH — 3-5 business days"; "PayPal — US, UK, EU (excluding Croatia, Hungary, Iceland) — Instant"; "Venmo — US only — Instant"; "Cash App — US only — Instant"; "Visa Direct Payout — 50+ countries — Instant - Up to 1 business day"; "Mastercard Direct Payout — 30 EU/EEA countries + US/UK — Instant - Up to 1 business day"; "SEPA/SEPA Instant — EU (EUR only) — Instant - Up to 1-3 business days"; "UK Faster Payments — UK (GBP only) — 1 business day - Up to 1-2 business days"; "MoonPay Balance — US, UK, EU — Instant - Up to 3 business days" — [MoonPay support: all supported payment methods](https://support.moonpay.com/customers/docs/all-supported-payment-methods)
- ACH support article (last updated **February 15, 2026**): "If you're based in the US, you'll most likely see ACH as a payment option when you place an order." Sell flow steps: Sell tab → choose asset → identity verification if needed → select "Bank ACH" → provide Social Security Number → confirm via Plaid and select bank. "ACH payments typically take 3 to 5 business days. If it goes beyond 5 days, check with your bank for any issues." No state exclusions listed. — [MoonPay support: ACH](https://support.moonpay.com/customers/docs/ach)
- (2021) Launch post dated June 29, 2021: "Anyone in the US (except residents of Hawaii, New York, and Rhode Island), can now seamlessly cash out crypto straight to their bank account". Launch assets: Bitcoin, Ethereum, Bitcoin Cash. Price lock: "fixed and guaranteed price for their crypto, provided they send us their digital assets within twenty minutes of order creation"; late deposits → "accept updated quote or receive crypto back". MoonPay acts as "principal trader". — [MoonPay blog: ACH sell](https://www.moonpay.com/learn/blog/ach-sell)
- API `payoutMethod` enum for sell transactions: `ach_bank_transfer`, `credit_debit_card`, `paypal`, `gbp_bank_transfer`, `sepa_bank_transfer` (note: no separate venmo/cash_app enum value in the public sell-transaction schema) — [dev.moonpay.com GET sell transaction](https://dev.moonpay.com/api-reference/widget/getselltransaction.md)
- Account-limits FAQ (last updated May 1, 2026): "For residents of Maine, US, the maximum buy limit is $2,999 per transaction" (buy-side; the only state-specific rule on that page) — [MoonPay support: account limits FAQ](https://support.moonpay.com/en/articles/384264-account-limits-faq)
- Partners can fetch region/currency-specific payout methods via the `/payment_method_config` endpoint; "Supported payout methods vary by region and currency" — [dev.moonpay.com: design your off-ramp integration](https://dev.moonpay.com/docs/design-your-off-ramp-integration)
- Widget params exist to handle unsupported regions: `unsupportedRegionRedirectUrl` ("A URL you'd like to redirect the customer upon coming from unsupported region") and `skipUnsupportedRegionScreen` — [dev.moonpay.com off-ramp params](https://dev.moonpay.com/docs/ramps-sdk-sell-params)

### Inferences
- Venmo and Cash App appear in the consumer payout table but not in the partner API `payoutMethod` enum; they are likely surfaced via MoonPay Balance / MoonPay Account payouts rather than as direct widget payout methods. Verify with MoonPay before promising Venmo/Cash App inside an embedded widget.
- Since the sell transaction payload includes `country` and `state` fields, MoonPay evaluates state eligibility per transaction; a wallet can rely on the widget's unsupported-region screen rather than hardcoding a state list.

### Gaps
- No current (2025-2026) page lists which US states are excluded from Sell. The 2021 HI/NY/RI list may be outdated (NY in particular could have changed with licensing). Confirm with MoonPay sales/Partner Success.
- Whether Venmo / Cash App payouts are available inside the partner widget (vs only in the MoonPay consumer app) was not confirmed.

## KQ2. Is XLM sellable? Is USDC on Stellar sellable (vs USDC on Ethereum/Solana/Base)?

### Takeaway
XLM: MoonPay publishes a consumer "Sell XLM" page ("sell as little as $20 of XLM"), which strongly suggests XLM is on the sell list, but I could not confirm via the authoritative `GET /v3/currencies` (`isSellSupported`) without an API key. USDC on Stellar: no evidence anywhere that it is sellable; MoonPay's USDC code `usdc` is documented as "USD Coin (ERC-20)" and the sell expansion explicitly named USDC (Solana), not Stellar.

### Cited Findings
- Consumer page for selling Stellar exists and states "You can sell as little as $20 of XLM on MoonPay"; payout via bank transfer, Visa/Mastercard push-to-card, PayPal, MoonPay Balance; "Transaction fees are as low as 1% for bank transfers and 4.5% for Visa cards"; funds "may take between a few minutes to 2 business days"; page does not mention USDC on Stellar — [moonpay.com/sell/xlm](https://www.moonpay.com/sell/xlm)
- `GET /v3/currencies` is the authoritative source: CryptoCurrency objects expose `isSellSupported` ("Whether sales for this currency are supported"), `minSellAmount`, `maxSellAmount`, `supportsTestMode`, `metadata.networkCode`, `metadata.contractAddress`, `addressRegex`, `addressTagRegex`, `supportsAddressTag`. The example `usdc` code is described as "USD Coin (ERC-20)". — [dev.moonpay.com GET currencies](https://dev.moonpay.com/api-reference/widget/getcurrencies.md)
- MoonPay sell-asset expansion (search snippet, moonpay.com changelog): sell options expanded to "the top 20 buy assets such as USDC (Solana), MATIC (Polygon), USDT (BSC), ADA, and DOGE, bringing the total number of supported assets on off-ramp to 23" — [MoonPay changelog: sell now from your MoonPay account](https://www.moonpay.com/fr/newsroom/changelog/sell-now-from-your-moonpay-account) (snippet only; date not captured)
- Xaman (XRP) sell partnership announcement (published Sep 23, 2025, modified Feb 26, 2026) names XRP added to off-ramp; no mention of XLM or Stellar USDC — [MoonPay newsroom: Xaman sell](https://www.moonpay.com/en-gb/newsroom/xamansell)
- Sandbox testing guide lists Stellar among testnets for which MoonPay publishes return-coin wallet addresses (Bitcoin Testnet3, Ethereum Sepolia, Solana Devnet, Stellar, TON, XRP Ledger, others) — [dev.moonpay.com sandbox testing](https://dev.moonpay.com/widget/sandbox-testing.md)
- Consumer "Sell USDC" page: available in "80+ countries", payout via "bank transfer, PayPal, and Venmo (US only)" plus Visa/Mastercard push-to-card; minimum "$20"; page does not list which USDC networks are sellable — [moonpay.com/sell/usdc](https://www.moonpay.com/sell/usdc)
- Off-ramp design doc: when `depositWalletAddressTag` is returned "you must include this with the deposit, otherwise the transaction will fail" — memo-style chains (Stellar, XRP) are therefore architecturally supported by the sell deposit flow — [dev.moonpay.com: design your off-ramp integration](https://dev.moonpay.com/docs/design-your-off-ramp-integration)

### Inferences
- XLM sell is very likely live (dedicated marketing page + memo/tag support in the deposit flow), but Normal should confirm by calling `GET https://api.moonpay.com/v3/currencies?apiKey=pk_test_...` once it has a sandbox key and checking `xlm.isSellSupported`.
- USDC on Stellar is almost certainly NOT sellable through MoonPay today; MoonPay's USDC sell coverage is ERC-20 and Solana (plus whatever other EVM networks appear in the currencies list). For Normal (USDC on Stellar), this implies a swap-to-XLM or a bridge-to-USDC-on-Solana/Ethereum step before MoonPay Sell, or selling XLM directly.

### Gaps
- Could not query `/v3/currencies` (requires publishable key) to confirm `isSellSupported` for `xlm`, `usdc_sol`, `usdc_base`, or any Stellar-network USDC code.
- The "23 assets" changelog is undated in what I captured; the current count is likely higher.

## KQ3. Exact user fee for sell, partner configurable fee, affiliate commission

### Takeaway
Published consumer sell fees: ~1% bank transfer, up to 3.4% PayPal, up to 4.5% card/alternative methods, 0% to MoonPay Balance, with a minimum MoonPay fee of $3.99 (up to $4.50 when referred by a partner), plus a spread embedded in the price. Partner affiliate fee "typically 0.5-1.25%", configured through a Partner Success Manager (not self-serve), paid monthly once commissions reach $1,000.

### Cited Findings
- Pricing Disclosure (legal): MoonPay Fee "up to 4.5%" with "a minimum MoonPay fee of up to $3.99" for direct access and "a minimum MoonPay fee of up to $4.50" when partner-referred; for non-USD currencies the minimum rises "between 0.25% and 10%, depending on the fiat currency"; "Using MoonPay fiat balance for Buy and Sell transactions incurs zero MoonPay fees"; Network Fee "may vary depending on a number of factors, such as network congestion and operational costs"; "Ecosystem Fee" applied "by some, but not all, of our partners"; spreads are "included in the price of the digital asset shown to you during your checkout flow" — [MoonPay Pricing Disclosure](https://moonpay.com/legal/pricing_disclosure)
- Search-indexed fee breakdown (attributed to MoonPay pricing/fee pages): "sell processing fee is up to 4.5% for payment cards & alternative payment methods, up to 1% for bank transfers, and up to 3.4% for PayPal"; "minimum MoonPay Fee ... $3.99 ... or up to $4.50 ... in the case of a referral" — [MoonPay support: fees](https://support.moonpay.com/customers/docs/moonpay-fees) (page body did not render in fetch; figures from search snippet) and [Europe Pricing Disclosure (EUR 3.99 minimum)](https://www.moonpay.com/nl/legal/europe_pricing_disclosure)
- Consumer sell pages: "Transaction fees are as low as 1% for bank transfers and 4.5% for Visa cards"; zero fee to MoonPay Balance — [moonpay.com/sell/usdc](https://www.moonpay.com/sell/usdc), [moonpay.com/sell/xlm](https://www.moonpay.com/sell/xlm)
- Affiliate fee: "After completing the KYB process with MoonPay, you can add an additional affiliate fee to each order on top of the MoonPay fees"; "The affiliate fee typically ranges from 0.5-1.25%"; "You can adjust the fee amount and the payout address by contacting your MoonPay Partner Success Manager"; payout "Once you've accumulated at least 1,000 USD or equivalent in commissions"; payout methods BTC, USDC_ERC20, USDT_ERC20; "The payouts for the fees incurred in previous months will be processed on the 4th week of every month" — [MoonPay support: how do affiliate payouts work](https://support.moonpay.com/customers/docs/how-do-affiliate-payouts-work)
- Partner fee appears in the sell transaction object as `extraFeeAmount` ("A positive number representing your extra fee"), separate from `feeAmount` ("the fee for the transaction") — [dev.moonpay.com GET sell transaction](https://dev.moonpay.com/api-reference/widget/getselltransaction.md)
- Third-party critique (CoinStats, secondary source) headline: "MoonPay Fees: Up to 4.5 Percent, a Partner Margin on Top, and a Markup You Never See as a Fee" — [CoinStats news](https://coinstats.app/news/7b77c3a4553195e618873888715a34980589e3bb927fed5b9e7680ba3e4341ff_MoonPay-Fees-Up-to-45-Percent-a-Partner-Margin-on-Top-and-a-Markup-You-Never-See-as-a-Fee) (opinion piece; use only as corroboration that spread is not itemised)

### Inferences
- For a $100 XLM→ACH sell: MoonPay fee ≈ $3.99 (the minimum dominates below ~$399 at 1%), plus spread, plus any partner extra fee. Sell economics are therefore unattractive below roughly $50-100 per order.
- The affiliate article does not explicitly say sell orders earn commission, but `extraFeeAmount` exists on the sell transaction schema, so partner fees are applied to sells.

### Gaps
- No exact published spread figure for sell.
- No confirmation that the affiliate fee range (0.5-1.25%) is the same for sell as for buy, nor whether the dashboard now allows self-serve fee editing (the support article says contact Partner Success).

## KQ4. How the self-custody sell flow works technically (deposit address, matching, timeout, refunds)

### Takeaway
The widget creates a sell transaction and hands the wallet a MoonPay deposit address (and optional tag/memo) either via the SDK `onInitiateDeposit` handler or as query params appended to `redirectURL`. The wallet sends the exact `baseCurrencyAmount` to `depositWalletAddress`; MoonPay matches the on-chain deposit to the transaction (recorded as `depositHash`), status moves `waitingForDeposit → pending → completed`. Quotes expire (`quoteExpiresAt`; 20 minutes per the 2021 post); late/repriced deposits trigger `sell_transaction_requote_required` and the user accepts a new quote or is refunded to `refundWalletAddress`.

### Cited Findings
- Deposit instruction delivery: "Method 1 - SDK Handler (`onInitiateDeposit`)": widget passes `transactionId`, `baseCurrencyCode`, `baseCurrencyAmount`, `depositWalletAddress`. "Method 2 - URL Redirect (`redirectURL`)": MoonPay appends `transactionId`, `baseCurrencyCode`, `baseCurrencyAmount`, `depositWalletAddress`, and optionally `depositWalletAddressTag`. "When `depositWalletAddressTag` is included in the URL parameters, you must include this with the deposit, otherwise the transaction will fail." — [dev.moonpay.com: design your off-ramp integration](https://dev.moonpay.com/docs/design-your-off-ramp-integration)
- `onInitiateDeposit` "receives properties including the cryptocurrency code, cryptocurrency amount, and deposit wallet address, and you can use your own crypto deposit code to process the transaction and return a deposit ID"; recommended because it "removes friction from the deposit process by handling the crypto deposit within your application" — [dev.moonpay.com: integrate off-ramp using SDKs](https://dev.moonpay.com/docs/off-ramp-how-to-integrate-using-sdk) (via search snippet; the deeper page /docs/off-ramp-how-to-handle-crypto-deposits returned 404 on 2026-10-08)
- Sell transaction object: `status` enum `waitingForDeposit`, `pending`, `failed`, `completed` (webhook schema additionally includes `requoteRequired`); `depositHash` = "The cryptocurrency transaction identifier representing the transfer from the customer's wallet to MoonPay's wallet"; `refundWalletAddress` = "A wallet address at which the customer can receive cryptocurrency"; `quoteExpiresAt` ISO 8601 nullable; `depositWallet` object with `id`, `walletAddress`, `walletAddressTag`, `currencyId`; `failureReason` "Set when transaction's status is failed"; also `bankAccountId`, `customerId`, `country`, `state` — [GET sell transaction](https://dev.moonpay.com/api-reference/widget/getselltransaction.md); [webhooks OpenAPI](https://dev.moonpay.com/api-reference/widget/webhooks.openapi.json)
- Sell transaction API endpoints (public widget API): `GET /v3/sell_transactions/{transactionId}` authenticated by "Your publishable API key, passed as the `apiKey` query parameter"; also documented: `getSellQuote`, `getSellTransactions`, `getSellTransactionByExternalId`, `cancelSellTransaction`, `cancelSellTransactionByExternalId` — [GET sell transaction](https://dev.moonpay.com/api-reference/widget/getselltransaction.md); [docs index llms.txt](https://dev.moonpay.com/llms.txt)
- Requote flow: `sell_transaction_requote_required` fires when a sell transaction "requires a requote due to price changes or other market conditions"; payload includes `quoteExpiresAt`; partner should show "a clear call-to-action to accept or decline the new quote" — [requote webhooks](https://dev.moonpay.com/widget/requote-webhooks); [sell_transaction_requote_required](https://dev.moonpay.com/api-reference/widget/webhooks/sell-transaction-requote-required)
- (2021) Price lock "provided they send us their digital assets within twenty minutes of order creation"; otherwise "accept updated quote or receive crypto back" — [MoonPay blog: ACH sell](https://www.moonpay.com/learn/blog/ach-sell)
- Limits/validation guidance: use `GET /v3/currencies` for min/max; "The quote provided in this endpoint represents a platform-wide floor value, not a user-specific value"; partners "must estimate network fees separately and adjust maximum sellable amounts accordingly" (Fireblocks Network Fee API given as example) — [design your off-ramp integration](https://dev.moonpay.com/docs/design-your-off-ramp-integration)
- Transaction tracking options: webhooks, API polling, or MoonPay's hosted receipt `https://sell.moonpay.com/transaction_receipt?transactionId={id}`; MoonPay claims returning users are "13% more likely to complete another transaction" when status is surfaced — [design your off-ramp integration](https://dev.moonpay.com/docs/design-your-off-ramp-integration)
- Refund routing requires `refundWalletAddress` (or `refundWalletAddresses` JSON map) in the signed widget URL — [off-ramp params](https://dev.moonpay.com/docs/ramps-sdk-sell-params)

### Inferences
- Matching is by MoonPay-controlled deposit address (+ tag for memo chains) per transaction, not by amount alone; Normal must send exactly `baseCurrencyAmount` and include `depositWalletAddressTag` as the Stellar memo when selling XLM.
- The current quote-expiry window is exposed per transaction via `quoteExpiresAt`; do not hardcode 20 minutes.
- Because `onInitiateDeposit` lets the wallet return a deposit ID, the wallet can build/sign/broadcast the Stellar/BTC/ETH/SOL transaction with Turnkey inside the app and report the hash back, avoiding the user copy-pasting an address.

### Gaps
- The dedicated "Handle Off-Ramp crypto deposits" page (https://dev.moonpay.com/docs/off-ramp-how-to-handle-crypto-deposits) 404'd; exact `onInitiateDeposit` return type and whether MoonPay accepts under/over-payment were not verified.
- Explicit refund SLA / refund fee policy not found in docs.

## KQ5. Webhook event names, signature verification, sandbox webhook support

### Takeaway
Four sell events: `sell_transaction_created`, `sell_transaction_updated`, `sell_transaction_failed`, `sell_transaction_requote_required`. Payload envelope `{type, data: SellTransaction, externalCustomerId}`. Verify with header `Moonpay-Signature-V2` (`t=<ts>,s=<hex>`), HMAC-SHA256 over `<timestamp>.<raw body>` using the webhook key from the dashboard Developers page; reject if older than ~5 minutes. Test vs live keys determine sandbox vs live events; delivery is at-least-once, unordered, 9 retries with exponential backoff, 5-second 2xx requirement.

### Cited Findings
- Event type strings: `"sell_transaction_created"`, `"sell_transaction_updated"`, `"sell_transaction_failed"`, `"sell_transaction_requote_required"`; envelope fields `type` (required), `data` (required SellTransaction), `externalCustomerId` (optional) — [webhooks OpenAPI](https://dev.moonpay.com/api-reference/widget/webhooks.openapi.json)
- `sell_transaction_created`: "Sent when a customer creates a Sell transaction in the widget" — [sell-transaction-created](https://dev.moonpay.com/api-reference/widget/webhooks/sell-transaction-created.md); `sell_transaction_updated`: "Sent whenever a Sell transaction's status or details change"; delivery "at-least-once and unordered: duplicates can occur and events can arrive out of order"; handlers "must be idempotent" — [sell-transaction-updated](https://dev.moonpay.com/api-reference/widget/webhooks/sell-transaction-updated.md)
- Signature: header `Moonpay-Signature-V2`, example value `t=1492774577,s=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd`; key = "your webhook API key from the Developers page on the MoonPay dashboard"; algorithm "hash-based message authentication code (HMAC) with SHA-256"; signed payload = timestamp + "." + request body (POST) or query string (GET) — [webhook signature](https://dev.moonpay.com/api-reference/widget/webhooks/signature.md)
- Replay guidance (from the webhooks overview as indexed by search): "Reject any requests older than five minutes to prevent replay attacks"; both `Moonpay-Signature` (legacy) and `Moonpay-Signature-V2` headers are sent — [webhooks overview](https://dev.moonpay.com/reference/reference-webhooks-overview)
- Retries: "MoonPay retries a failed delivery up to 9 times with exponential backoff, starting at 1 second and roughly doubling per attempt"; must "Respond with a 2xx status code within 5 seconds"; "Using test or live API keys determines whether test events or live events are sent to your configured URL"; endpoints are added in the dashboard Webhook section ("Click Add Endpoint"; "You can add as many URLs as you like"); "swap_*" events do not apply to widget integrations — [webhooks overview](https://dev.moonpay.com/reference/reference-webhooks-overview)
- Sandbox webhooks: test with "sandbox API keys from your MoonPay Dashboard" and configure the endpoint to receive sandbox webhooks — [requote webhooks](https://dev.moonpay.com/widget/requote-webhooks)

### Inferences
- Normal needs one idempotent handler keyed on `data.id` + `data.status` + `updatedAt`, since created/updated/failed can arrive out of order.
- The 5-second response budget means the handler should enqueue and return immediately rather than do DB/fiat reconciliation inline.

### Gaps
- Documented V1 vs V2 signature differences and the exact replay-window number on the signature page itself were not visible; the "five minutes" figure comes from the overview page as summarised in search results.

## KQ6. Sandbox: self-serve before KYB? Test keys immediately?

### Takeaway
MoonPay provides a sandbox (`sell-sandbox.moonpay.com`, `pk_test_` keys) with test cards, skippable KYC and testnet deposit support including Stellar. Keys live on the dashboard Developers page, but I found no explicit statement that test keys are issued before KYB approval; the only dashboard-access statement ties access to "successful onboarding approval".

### Cited Findings
- Sell widget base URLs: sandbox `https://sell-sandbox.moonpay.com/?apiKey=pk_test_123`; production `https://sell.moonpay.com/?apiKey=pk_live_123` — [off-ramp URL integration](https://dev.moonpay.com/widget/off-ramp/integration-methods/url)
- Sandbox guide: "Find your API key on the Developers Page (https://dashboard.moonpay.com/developers/api-keys) in your MoonPay dashboard"; "KYC information entered will not be verified and when asked for documents you can skip by clicking the 'Skip document submission' button"; "Add a US or UK address for sandbox accounts, since these work best with our test credit cards"; off-ramp test card "Visa Direct payout" 4000 0209 5159 5032; testnets listed: Bitcoin (Testnet3), Ethereum (Sepolia), Solana (Devnet), Stellar, TON, XRP Ledger, others; "Sandbox purchases deliver 1/100th of the quoted amount" — [sandbox testing](https://dev.moonpay.com/widget/sandbox-testing.md)
- Dashboard access: "Following successful onboarding approval, the designated owner of the partner account will receive an email invitation with instructions for setting a password and logging in to access their dedicated dashboard" — [dev.moonpay.com FAQ](https://dev.moonpay.com/docs/faq) (via search snippet; the FAQ page body rendered as a generic intro on fetch)
- `supportsTestMode` boolean per currency in `GET /v3/currencies` — [GET currencies](https://dev.moonpay.com/api-reference/widget/getcurrencies.md)

### Inferences
- Stellar being in the sandbox testnet list suggests XLM sell can be exercised end-to-end in sandbox once a key is in hand.
- Dashboard (and therefore test keys) appears gated behind "onboarding approval"; expect to go through at least initial business sign-up before receiving `pk_test_`. Treat "instant self-serve test keys" as unconfirmed.

### Gaps
- No page states explicitly whether sandbox keys are available pre-KYB or only post-approval.
- Not verified whether sandbox sell transactions actually move testnet coins/triggers payouts or only simulate statuses.

## KQ7. KYB document list and lead time

### Takeaway
MoonPay says KYB "can vary ... from a few minutes to several days". I found no published KYB document checklist for widget partners, and no confirmation that SumSub is the KYB provider for partner onboarding (SumSub appears in MoonPay docs only as a customer-KYC data-sharing option).

### Cited Findings
- "The duration of the Know Your Business (KYB) verification process can vary significantly based on the completeness and complexity of the information submitted, ranging from a few minutes to several days, with MoonPay striving to complete all KYB verifications as quickly as possible" — [dev.moonpay.com FAQ](https://dev.moonpay.com/docs/faq) (search snippet)
- Affiliate fee can only be added "After completing the KYB process with MoonPay" — [affiliate payouts](https://support.moonpay.com/customers/docs/how-do-affiliate-payouts-work)
- SumSub reference in MoonPay docs is about sharing *customer* KYC: "If your organization already verifies customers through SumSub, you can share that verification data with MoonPay using a share token ... requires a tri-party agreement between MoonPay, your organization, and SumSub"; US customers' SumSub profile must carry SSN/ITIN in `fixedInfo.tin` — [dev.moonpay.com shared KYC](https://dev.moonpay.com/widget/shared-kyc); [MoonPay Enterprise reliance KYC token sharing](https://dev.enterprise.moonpay.com/reliance-kyc-token-sharing)
- MoonPay Enterprise (formerly Iron) exposes KYB for *your* business customers via "Hosted Link Flow" or "Programmatic Business API" — this is a product MoonPay sells, not its partner onboarding process — [dev.enterprise.moonpay.com KYB](https://dev.enterprise.moonpay.com/kyb)

### Inferences
- Partner KYB is handled through MoonPay's sales/onboarding team rather than a public self-serve checklist; plan for a sales conversation and "days" rather than "minutes".

### Gaps
- No public document list (incorporation docs, UBO IDs, licenses, etc.) for widget-partner KYB.
- Whether MoonPay uses SumSub internally for partner KYB is unverified.

## KQ8. Integration mechanics: widget URL params, SDKs (web + React Native)

### Takeaway
Sell widget params are documented and match the brief (`baseCurrencyCode`, `quoteCurrencyCode`, `baseCurrencyAmount`, `quoteCurrencyAmount`, `lockAmount`, `refundWalletAddress(es)` [signing required], `redirectURL`, `externalTransactionId`, `externalCustomerId`, `email`, `paymentMethod`, `theme`, `unsupportedRegionRedirectUrl`). Two React Native packages exist: `@moonpay/react-native-moonpay-sdk` (widget SDK, `flow: "sell"`, `environment: "sandbox"|"production"`) and `@moonpay/platform-sdk-react-native` (newer platform SDK; RN 0.73+, react-native-webview 13+, iOS 14+/Android API 26+).

### Cited Findings
- Off-ramp URL parameters (verbatim descriptions): `apiKey` publishable key; `baseCurrencyCode` "The code of the cryptocurrency you want the customer to sell" (customer cannot change); `defaultBaseCurrencyCode` (customer can change); `refundWalletAddress` "The cryptocurrency wallet address the funds will be sent to in case we have to issue a refund" (signing: Yes); `refundWalletAddresses` JSON map (signing: Yes; "only the cryptocurrencies for which you pass a wallet address will be shown ... unless you also pass `showAllCurrencies`"; takes precedence over `refundWalletAddress`); `quoteCurrencyCode` "The code of the fiat currency you want the customer to be paid in"; `baseCurrencyAmount`; `quoteCurrencyAmount`; `lockAmount`; `email`; `externalTransactionId` "An identifier you would like to associate with the transaction"; `externalCustomerId`; `paymentMethod` (e.g. `credit_debit_card`, `ach_bank_transfer`, `gbp_bank_transfer`); `redirectURL` "A URL you'd like to redirect the customer to after they complete the sell flow"; `showAllCurrencies`; `showWalletAddressForm`; `theme`; `themeId`; `unsupportedRegionRedirectUrl`; `skipUnsupportedRegionScreen` — [off-ramp params](https://dev.moonpay.com/docs/ramps-sdk-sell-params)
- Signing rule: "If you pass `refundWalletAddress`, `refundWalletAddresses`, or other sensitive parameters, the URL must carry a `signature` parameter computed server-side with your secret key. The widget fails to load without it." — [off-ramp URL integration](https://dev.moonpay.com/widget/off-ramp/integration-methods/url); signing algorithm page: [off-ramp URL signing](https://dev.moonpay.com/widget/off-ramp/customization/url-signing.md)
- React Native widget SDK: package `@moonpay/react-native-moonpay-sdk` (`npm install --save @moonpay/react-native-moonpay-sdk`); `sdkConfig: { flow, environment: "sandbox" | "production", params: { apiKey } }`; "Possible values for flow: buy, sell, swap, swapsCustomerSetup" — [off-ramp React Native SDK](https://dev.moonpay.com/widget/off-ramp/integration-methods/sdks/react-native.md)
- Platform React Native SDK: package `@moonpay/platform-sdk-react-native`; requirements "React Native 0.73+", "React >=18", "`react-native-webview` 13.0+", "iOS 14+ and Android API 26+" — [platform RN SDK overview](https://dev.moonpay.com/platform/sdk-reference/react-native/overview.md)
- Web React SDK for off-ramp exists — [off-ramp React SDK](https://dev.moonpay.com/docs/off-ramp-react-sdk); SDK integration guide — [integrate off-ramp using SDKs](https://dev.moonpay.com/docs/off-ramp-how-to-integrate-using-sdk)
- Full off-ramp docs set (for the implementer): parameters https://dev.moonpay.com/widget/off-ramp/customization/parameters.md; quickstart https://dev.moonpay.com/widget/off-ramp/quickstart.md; sell quote https://dev.moonpay.com/api-reference/widget/getsellquote.md; sell transactions list https://dev.moonpay.com/api-reference/widget/getselltransactions.md; by external id https://dev.moonpay.com/api-reference/widget/getselltransactionbyexternalid.md; cancel https://dev.moonpay.com/api-reference/widget/cancelselltransaction.md; countries https://dev.moonpay.com/api-reference/widget/getcountries.md; fees object https://dev.moonpay.com/api-reference/platform/objects-and-types/fees.md — [docs index llms.txt](https://dev.moonpay.com/llms.txt)

### Inferences
- For Normal: generate the signed sell URL server-side (Next.js API route holding the secret key), passing `refundWalletAddresses` for the user's Turnkey addresses so refunds land in the self-custody wallet, `externalTransactionId` for reconciliation, and `redirectURL` back into the app; on RN use `@moonpay/react-native-moonpay-sdk` with `flow: "sell"` and the `onInitiateDeposit` handler.
- Two RN packages suggests MoonPay is migrating from the "widget SDK" to a "platform SDK"; pick the one whose off-ramp docs are complete (`react-native-moonpay-sdk` has explicit sell flow support).

### Gaps
- `onInitiateDeposit` exact TypeScript signature and `onUrlSignatureRequested` behaviour in RN were not captured (SDK pages reference separate parameter docs).
- Whether `@moonpay/platform-sdk-react-native` supports sell (overview only mentions "fiat-to-crypto ramps").

## KQ9. KYC experience, limits, payout timing, countries, known limitations

### Takeaway
Users complete KYC inside the widget (a MoonPay account, i.e. email + identity verification + SSN for ACH, is required); MoonPay does not publish per-tier sell limits (only "determined by your verification status and jurisdiction"), minimum sell is quoted at $20 on consumer pages, and payouts range from instant (PayPal/Venmo/Cash App/card) to 3-5 business days (ACH). Sell is offered in 80+ countries.

### Cited Findings
- KYC: "Users complete Know Your Customer verification within the widget" — [design your off-ramp integration](https://dev.moonpay.com/docs/design-your-off-ramp-integration); ACH flow requires providing "Social Security Number" and Plaid bank linking — [MoonPay support: ACH](https://support.moonpay.com/customers/docs/ach); `email` widget param "If you pass a valid email address, the customer won't be prompted to enter one" — [off-ramp params](https://dev.moonpay.com/docs/ramps-sdk-sell-params)
- Shared KYC option: partners already using SumSub can pass a share token so "your customers do not need to go through KYC again" (tri-party agreement required) — [shared KYC](https://dev.moonpay.com/widget/shared-kyc)
- Limits (last updated May 1, 2026): "Account Limits determined by your verification status and jurisdiction" (do not reset; raising them requires "a short survey in the app" plus "documents related to your source of income"); "Payment Method Limits" vary by buy/sell and "reset exactly a day or month after you placed an order" — [account limits FAQ](https://support.moonpay.com/en/articles/384264-account-limits-faq)
- Third-party summary of limits (secondary, unverified): "Daily maximum limits can range from $50 for basic verification up to $50,000 for bank transfers with full verification" — [Baltex review 2026](https://baltex.io/blog/ecosystem/moonpay-review-fees-limits-credit-cards-2026)
- Minimum sell: "You can sell as little as $20 of XLM" / minimum "$20" USDC — [moonpay.com/sell/xlm](https://www.moonpay.com/sell/xlm); [moonpay.com/sell/usdc](https://www.moonpay.com/sell/usdc)
- Per-asset min/max via `minSellAmount` / `maxSellAmount` in `GET /v3/currencies` — [GET currencies](https://dev.moonpay.com/api-reference/widget/getcurrencies.md)
- Payout timing: ACH "3-5 business days"; PayPal/Venmo/Cash App "Instant"; Visa/Mastercard Direct "Instant - Up to 1 business day"; SEPA "Instant - Up to 1-3 business days"; UK FPS "1 business day - Up to 1-2 business days" — [all supported payment methods](https://support.moonpay.com/customers/docs/all-supported-payment-methods); consumer page: "between a few minutes to 2 business days" — [moonpay.com/sell/usdc](https://www.moonpay.com/sell/usdc)
- Countries: Sell "80+ countries"; push-to-card list of 68 countries — [moonpay.com/sell/usdc](https://www.moonpay.com/sell/usdc); Visa Direct 50+ countries; Mastercard Direct 30 EU/EEA + US/UK — [all supported payment methods](https://support.moonpay.com/customers/docs/all-supported-payment-methods); programmatic list via `GET /v3/countries` — [docs index](https://dev.moonpay.com/llms.txt)
- Known limitations from docs: partner must estimate network fees itself and reduce max sellable amount; currencies quote is a "platform-wide floor value, not a user-specific value"; `depositWalletAddressTag` must be included or "the transaction will fail" — [design your off-ramp integration](https://dev.moonpay.com/docs/design-your-off-ramp-integration); sandbox delivers 1/100th of quoted amount — [sandbox testing](https://dev.moonpay.com/widget/sandbox-testing.md)

### Inferences
- A user does need a MoonPay account (email-based) and MoonPay-run KYC; there is no "KYC-less" sell. Pre-filling `email` and `externalCustomerId` reduces friction but does not skip KYC. First-time KYC duration is not published.
- US EU/UK secondary coverage is strong (SEPA, FPS, PayPal, cards), so one MoonPay integration covers Normal's likely expansion markets.

### Gaps
- No published first-time KYC duration.
- No official per-method sell limits (daily/monthly, ACH vs card) for US users; only the generic FAQ. The $50-$50,000 range is from a third-party review.
- No official per-asset min/max for XLM, BTC, ETH, SOL (requires authenticated `/v3/currencies` call).
