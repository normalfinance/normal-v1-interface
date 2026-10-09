# Coinbase Developer Platform (CDP) Offramp — fact sheet for a US-first self-custody wallet (web + React Native)

Research date: 2026-10-08. All docs.cdp.coinbase.com pages were fetched live on that date (the docs site has been reorganised: old `/onramp-&-offramp/...` paths now redirect/duplicate to `/onramp/offramp/...`). Pages on coinbase.com (launch blog, Help Center) returned HTTP 403 to the fetcher, so those facts come from search-result snippets and are marked as such. Items marked "(older)" predate 2026.

## Key Question 1 — Can a user sell without a Coinbase account (guest checkout)? Roadmap?

### Takeaway
No. As of October 2026 the official Offramp FAQ states a Coinbase account with linked bank details is required and that guest checkout is not supported for fiat withdrawal. I found no public roadmap statement committing to guest-checkout sell.

### Cited Findings
- "A Coinbase account with linked bank details is required for Offramp and ACH withdrawals. Guest checkout is not supported for fiat withdrawal." — [CDP Onramp/Offramp FAQ](https://docs.cdp.coinbase.com/onramp/additional-resources/faq)
- Offramp is defined as letting users "convert crypto into fiat currency and send funds directly to a bank account (ACH) or Coinbase account." — [Offramp Overview](https://docs.cdp.coinbase.com/onramp-&-offramp/offramp-apis/offramp-overview)
- Offramp payment (cash-out) methods listed on the product welcome page: "ACH transfers (US), PayPal (select countries), and Coinbase balances" (Onramp, by contrast, lists debit/credit cards, Apple Pay, Google Pay, ACH and Coinbase balances). — [Onramp & Offramp Welcome](https://docs.cdp.coinbase.com/onramp/introduction/welcome.md)
- If crypto arrives after the 30-minute window, "they will still arrive in the users Coinbase account as a crypto balance, but the Offramp transaction will likely move to a TRANSACTION_STATUS_FAILED state" — i.e. the Coinbase deposit address is tied to the user's own Coinbase account. — [CDP FAQ](https://docs.cdp.coinbase.com/onramp/additional-resources/faq)
- Onramp (buy) does have guest checkout: the Sell Quote API's shared `paymentMethod` enum contains `GUEST_CHECKOUT_CARD` and `GUEST_CHECKOUT_APPLE_PAY`, but the FAQ explicitly excludes guest checkout for fiat withdrawal. — [Create Sell Quote API ref](https://docs.cdp.coinbase.com/api-reference/rest-api/onramp-offramp/create-sell-quote.md); [CDP FAQ](https://docs.cdp.coinbase.com/onramp/additional-resources/faq)

### Inferences
- The flow is effectively "send crypto from your wallet into the user's own Coinbase account, then Coinbase sells/cashes out." The user must therefore pass Coinbase KYC and link a US bank before the first sell; this is a hard funnel step for a self-custody app.
- Because the enum shared between buy and sell quotes includes guest/card/RTP values, Coinbase could technically extend them to sell later, but nothing public says so.

### Gaps
- No public roadmap statement (blog, changelog, docs) on guest-checkout sell was found. The launch blog (https://www.coinbase.com/developer-platform/discover/launches/introducing-offramp) returned 403 and could not be read.

## Key Question 2 — Which assets/networks are sellable? XLM? USDC-on-Stellar vs USDC on Base/Ethereum/Solana?

### Takeaway
Coinbase publishes no static sell-asset list; the authoritative source is the `GET /onramp/v1/sell/options?country=US&subdivision=XX` API. Docs name Bitcoin, Ethereum, Solana, Base (plus Polygon, Avalanche, Optimism, Arbitrum) and say Onramp covers "all assets and networks available for trade/send/receive on Coinbase.com"; Stellar/XLM and USDC-on-Stellar are not mentioned anywhere in the Offramp docs I could reach, so they must be verified by calling the Options API.

### Cited Findings
- Supported networks (product page, Onramp and Offramp together): "Layer 1 networks: Bitcoin, Ethereum, Solana, Polygon, Avalanche, and more" and "Layer 2 networks: Base, Optimism, Arbitrum"; assets "ETH, BTC, USDC, SOL, MATIC, and 200+ other cryptocurrencies". — [Welcome](https://docs.cdp.coinbase.com/onramp/introduction/welcome.md)
- "Coinbase Onramp supports all assets and networks available for trade/send/receive on Coinbase.com." Availability is checked via the Options API or the Asset Availability Checker Tool. — [CDP FAQ](https://docs.cdp.coinbase.com/onramp/additional-resources/faq.md)
- Offramp Options API: `GET https://api.developer.coinbase.com/onramp/v1/sell/options`, required params `country` (ISO 3166-1) and `subdivision` (ISO 3166-2, required for US). Response has `cashout_currencies` (fiat currencies, each with payment-method min/max limits) and `sell_currencies` (crypto assets with network details, contract addresses, chain IDs). — [Offramp Configurations](https://docs.cdp.coinbase.com/onramp/offramp/configurations.md)
- Offramp Config API: `GET https://api.developer.coinbase.com/onramp/v1/sell/config` returns supported countries, payment methods per country and US subdivisions; docs recommend calling periodically and caching. — [Offramp Configurations](https://docs.cdp.coinbase.com/onramp/offramp/configurations.md)
- Sell Quote request takes `sellCurrency` as "the ticker (e.g. BTC, USDC) or the UUID of crypto asset" and `sellNetwork` as "Network name crypto will be sent on e.g. ethereum, base". — [Create Sell Quote](https://docs.cdp.coinbase.com/api-reference/rest-api/onramp-offramp/create-sell-quote.md)
- Validation on the Coinbase side matches `from_address`, `to_address`, `amount`, `network`, `asset`; "Bitcoin-based assets don't validate from_address since it changes per transaction." — [Offramp Integration Guide](https://docs.cdp.coinbase.com/onramp/offramp/offramp-integration-guide.md)
- XLM has been tradable on Coinbase.com since 2019 (older). — [Coinbase blog: Stellar Lumens (XLM) now available on Coinbase](https://www.coinbase.com/blog/stellar-lumens-xlm-now-available-on-coinbase)

### Inferences
- Since Offramp funds land in the user's Coinbase account as a crypto balance, the sellable set should approximate what Coinbase.com can receive and sell; XLM qualifies on the exchange side, but no Offramp doc confirms `stellar` as a `sellNetwork`, and the OfframpTransaction schema has no memo/destination-tag field (see Q4), which is a red flag for any memo-required network.
- USDC-on-Stellar: nothing in the Offramp docs mentions it. Treat as unsupported until `/sell/options` for US returns a `stellar` network entry under USDC. USDC on Base/Ethereum/Solana is the documented, example-illustrated case (`sellNetwork` examples are `ethereum`, `base`; Solana is a listed L1).

### Gaps
- No live call to `/sell/options` was possible (needs a CDP secret key). Whether `XLM`/`stellar` and `USDC`/`stellar` appear in `sell_currencies` for US is unverified. Recommended verification: `GET /onramp/v1/sell/options?country=US&subdivision=CA` with a CDP key and grep for `stellar`.
- No public static table of sellable assets exists; the Asset Availability Checker Tool URL was not retrievable.

## Key Question 3 — What does the user pay, and what can the partner earn or configure?

### Takeaway
Fees are Coinbase's standard pricing (spread + a Coinbase fee that varies by payment method, plus estimated network fee on the on-chain send); the FAQ quotes 0.5% ACH and 2.5% card for onramp. Offramp is free for developers; there is no documented partner fee markup or revenue share, and "0% fees on USDC" is an opt-in subsidy "to select apps upon request".

### Cited Findings
- User-facing fees (FAQ): a spread included in the crypto price; "Coinbase fees (vary by payment method, order size, market conditions)"; "Credit cards: 2.5%"; "ACH: 0.5%"; "USDC: Zero-fee available for select subsidized partners"; network fees "charged based on estimated transaction costs". — [CDP FAQ](https://docs.cdp.coinbase.com/onramp/additional-resources/faq.md) (note: the FAQ fee table is written from the Onramp perspective; the Offramp quote exposes its own `coinbase_fee`)
- "Coinbase Onramp is free for developers to use." No developer fee or revenue share is mentioned. — [CDP FAQ](https://docs.cdp.coinbase.com/onramp/additional-resources/faq.md)
- Zero-fee USDC: CDP "Onramp and Offramp integrations now provide zero-fee onramping and offramping for USDC to select apps upon request"; "developers integrating Coinbase's Onramp and Offramp solutions can provide their users with 0% fees on all USDC on/offramps" (search snippet; page returned 403 on fetch). — [Introducing Zero-Fee Onramping and Offramping for USDC](https://www.coinbase.com/developer-platform/discover/launches/zero-fee-usdc)
- Sell Quote response fields: `sell_amount`, `cashout_subtotal`, `cashout_total`, `coinbase_fee` (all value+currency), `quote_id`, and `offramp_url`. — [Create Sell Quote](https://docs.cdp.coinbase.com/api-reference/rest-api/onramp-offramp/create-sell-quote.md)
- Offramp Transaction Status record exposes `total` ("Fiat received after fees"), `subtotal` ("Fiat before fees"), `coinbase_fee` ("Brokerage fees in fiat"), `exchange_rate` — all "null unless Offramp to Fiat". — [Offramp Transaction Status](https://docs.cdp.coinbase.com/onramp/offramp/transaction-status.md)
- Coinbase retail cash-out costs (third-party guide, last updated 2 Oct 2025, not an official source): ACH "Free", "1–3 business days"; instant debit card "About 1.5% to 2%", "Minutes", "commonly up to $2,500/day"; wire "Typically $10–$25", "$100,000 per day"; PayPal "often instant and fee-free in supported regions". — [CoinBureau: How to withdraw money on Coinbase](https://coinbureau.com/guides/how-to-withdraw-money-on-coinbase/)
- Context (Aug 2025, exchange-side, not CDP): Coinbase began charging 0.1% on USDC→USD conversions above $5M per 30 days; first $5M stays free. — [Cryptonews](https://cryptonews.com/news/coinbase-introduces-0-1-fee-on-usdc-swaps-over-5m/)

### Inferences
- There is no `partnerFee`/markup parameter in the sell URL or Sell Quote API; if Normal wants revenue on offramp it must be earned on its own leg (e.g. swap into USDC before hand-off), not through Coinbase.
- The USDC zero-fee program is the economically interesting path: sell USDC (Base/Ethereum/Solana) through Offramp with 0% Coinbase fee if Normal is approved as a subsidized partner. The user still pays the on-chain network fee from their wallet.

### Gaps
- Official Coinbase Help fee page (help.coinbase.com/.../pricing-and-fees/fees) returned 403; exact current instant-cashout fee/minimum could not be confirmed from a primary source.
- No source states whether the 0.5% ACH figure applies identically to Offramp (sell) or only Onramp.
- Criteria and process for the USDC zero-fee subsidy ("upon request") are not public.

## Key Question 4 — How does the self-custody flow work: deposit address, memo, validity, matching?

### Takeaway
The partner generates a session token server-side, opens `pay.coinbase.com/v3/sell/input`, the user confirms in Coinbase UI, and Coinbase then exposes a per-transaction `to_address` (a Coinbase-managed deposit address) plus `sell_amount`/`asset`/`network` via the Transaction Status API; the app must build and broadcast the on-chain send itself within 30 minutes. Matching is by from_address + to_address + amount + network + asset (from_address not checked for Bitcoin-based assets). No memo/destination-tag field is documented.

### Cited Findings
- Three phases: "Generate an Offramp URL with a session token"; create an on-chain transaction to send user funds from your app to Coinbase; Coinbase processes and deposits fiat into the user's account. — [Offramp Integration Guide](https://docs.cdp.coinbase.com/onramp/offramp/offramp-integration-guide.md)
- Users send to a "Coinbase managed onchain address" obtained via the Offramp Transaction Status API; the API returns `to_address`, `sell_amount`, `asset`, `network`. — [Offramp Integration Guide](https://docs.cdp.coinbase.com/onramp/offramp/offramp-integration-guide.md)
- "Coinbase validates matching from_address, to_address, amount, network, and asset. Exception: Bitcoin-based assets don't validate from_address since it changes per transaction." — [Offramp Integration Guide](https://docs.cdp.coinbase.com/onramp/offramp/offramp-integration-guide.md)
- "Offramp transactions time out 30 mins after users click the 'Cash out now' button"; users must complete the on-chain send within that window. — [Offramp Integration Guide](https://docs.cdp.coinbase.com/onramp/offramp/offramp-integration-guide.md)
- Late funds: still credited to the user's Coinbase account as crypto balance, but the Offramp transaction "will likely move to a TRANSACTION_STATUS_FAILED state." — [CDP FAQ](https://docs.cdp.coinbase.com/onramp/additional-resources/faq)
- Session Token API: `POST https://api.developer.coinbase.com/onramp/v1/token` with body `{"addresses":[{"address":"0x...","blockchains":["base","ethereum"]}],"clientIp":"192.0.2.1"}`; requires a CDP Secret API Key with signed requests; token "expires after 5 minutes and can only be used once"; a new token per session. — [Generating Offramp URL](https://docs.cdp.coinbase.com/onramp/offramp/generating-offramp-url.md); [Session token auth](https://docs.cdp.coinbase.com/onramp-&-offramp/session-token-authentication)
- Sell URL: `https://pay.coinbase.com/v3/sell/input?sessionToken=<token>&partnerUserRef=<id>&redirectUrl=<url>`. Required: `sessionToken`, `redirectUrl` ("URL to redirect the user to after they send crypto"), `partnerUserRef` ("Unique ID representing the end-user. Must be less than 50 chars"). Optional: `defaultNetwork`, `defaultAsset`, `presetCryptoAmount`, `presetFiatAmount` (USD, CAD, GBP, EUR only; overridden by crypto preset), `defaultCashoutMethod` (`FIAT_WALLET`, `CRYPTO_ACCOUNT`, `ACH_BANK_ACCOUNT`, `PAYPAL`), `fiatCurrency`, `disableEdit` ("If set to true, prevents users from editing their order in the One-Click Sell flow"). — [Generating Offramp URL](https://docs.cdp.coinbase.com/onramp/offramp/generating-offramp-url.md)
- "All transactions made during the session are linked to partnerUserRef" for later retrieval. — [Generating Offramp URL (old path)](https://docs.cdp.coinbase.com/onramp-&-offramp/offramp-apis/generating-offramp-url)
- One-Click Sell: "Prefill all query string parameters in the Offramp URL and take users straight to the order preview screen"; required `sessionToken`, `partnerUserRef`, `redirectUrl`, `defaultAsset`, and `presetFiatAmount` or `presetCryptoAmount`; `disableEdit` optional; a ready-made URL can come from the Sell Quote API. — [One-Click Sell URL](https://docs.cdp.coinbase.com/onramp/offramp/one-click-sell-url.md)
- Sell Quote: `POST /v1/sell/quote`, required `sellCurrency`, `sellAmount`, `cashoutCurrency`, `paymentMethod`, `country` (+ `subdivision` for US); optional `sellNetwork`, `sourceAddress`, `clientIp`, `partnerUserId`, `redirectUrl`. Returns `quote_id` ("should be passed into the Offramp Widget URL as the quoteId query parameter") and `offramp_url` ("Only returned when sourceAddress, redirectUrl, and partnerUserRef are ALL provided"). — [Create Sell Quote](https://docs.cdp.coinbase.com/api-reference/rest-api/onramp-offramp/create-sell-quote.md)
- OfframpTransaction schema: `id`, `asset`, `network`, `sell_amount`, `total`, `subtotal`, `coinbase_fee`, `exchange_rate`, `from_address` ("Wallet sending the transaction"), `to_address` ("Coinbase destination address"), `tx_hash`, `created_at`, `updated_at`, `status` (`TRANSACTION_STATUS_STARTED` | `TRANSACTION_STATUS_SUCCESS` | `TRANSACTION_STATUS_FAILED`), `payment_method` (`FIAT_WALLET` | `CRYPTO_WALLET` | `ACH_BANK_ACCOUNT` | `PAYPAL`). No memo/destination-tag field. — [Offramp Transaction Status](https://docs.cdp.coinbase.com/onramp/offramp/transaction-status.md)

### Inferences
- The `to_address` effectively has a 30-minute validity for matching purposes; after that, funds are not lost (they land in the user's Coinbase crypto balance) but the Offramp order fails and the user would need to sell manually inside Coinbase.
- The absence of a memo field in the schema means that for memo-based networks (Stellar, XRP) the integration guide gives no way to retrieve the required memo; even if `stellar` is returned by `/sell/options`, a self-custody send without memo risks landing in an unattributed Coinbase hot wallet. This must be verified end-to-end on a real sell before shipping XLM.
- Because validation includes `from_address`, the `addresses` passed at session-token time must be the exact wallet address the user will send from (per chain). For Bitcoin, change addresses are tolerated.

### Gaps
- Not documented: whether `to_address` is per-transaction or a stable per-user deposit address; whether partial/over amounts are accepted; what happens if a wrong `network` is used.
- Quote expiry for `quote_id` is not documented.

## Key Question 5 — Webhook for sell status, or only polling? Rate limits?

### Takeaway
Both exist. CDP webhooks publish `offramp.transaction.created/updated/success/failed` with at-least-once delivery and exponential-backoff retries, and the Transaction Status API (`GET /onramp/v1/sell/user/{partner_user_ref}/transactions`) supports polling with the FAQ recommending exponential backoff and no polling until the send exists. The documented rate limit is 10 req/s per app ID for the Buy/Sell Quote APIs (HTTP 429).

### Cited Findings
- Offramp event types: `offramp.transaction.created`, `offramp.transaction.updated`, `offramp.transaction.success`, `offramp.transaction.failed`. — [CDP Webhooks: Onramp & Offramp](https://docs.cdp.coinbase.com/webhooks/onramp.md); individual event refs: [created](https://docs.cdp.coinbase.com/api-reference/v2/webhooks/webhook-offramp-transaction-created), [updated](https://docs.cdp.coinbase.com/api-reference/v2/webhooks/webhook-offramp-transaction-updated), [success](https://docs.cdp.coinbase.com/api-reference/v2/webhooks/webhook-offramp-transaction-success)
- Subscription is created via CDP CLI: `cdp data webhooks subscriptions create description=... 'eventTypes:=[...]' target.url=https://your-url.com target.method=POST 'labels:={}' isEnabled:=true`; subscriptions carry a `metadata.secret` for signature verification; "Subscriptions may be automatically disabled if your endpoint experiences sustained delivery failures." — [CDP Webhooks: Onramp & Offramp](https://docs.cdp.coinbase.com/webhooks/onramp.md)
- CDP webhooks offer at-least-once delivery and exponential-backoff retries up to 60 retries per event (search snippet). — [CDP Webhooks overview](https://docs.cdp.coinbase.com/webhooks/overview)
- Polling endpoint: `GET https://api.developer.coinbase.com/onramp/v1/sell/user/{partner_user_ref}/transactions`, params `page_key`, `page_size` (default 1); returns `transactions` in reverse chronological order, `next_page_key`, `total_count`. — [Offramp Transaction Status](https://docs.cdp.coinbase.com/onramp/offramp/transaction-status.md); [API ref](https://docs.cdp.coinbase.com/api-reference/rest-api/onramp-offramp/get-offramp-transactions-by-id.md)
- Polling guidance: "avoid polling immediately after generating the URL; instead, wait until the send transaction is created. Additionally, using exponential backoff to manage polling frequency." — [CDP FAQ](https://docs.cdp.coinbase.com/onramp/additional-resources/faq)
- Rate limits: "Buy Quote API and Sell Quote API" enforce "10 requests per second" per app ID, HTTP 429 `rate_limit_exceeded`, sliding window. — [Offramp Integration Guide](https://docs.cdp.coinbase.com/onramp/offramp/offramp-integration-guide.md); [CDP FAQ](https://docs.cdp.coinbase.com/onramp/additional-resources/faq.md)

### Inferences
- The webhook docs show payload examples only for onramp events; the offramp payload presumably mirrors the OfframpTransaction schema, but this is unverified.
- Rate limits for the Session Token, Options/Config and Transaction Status endpoints are not published; design for caching Config/Options and for webhook-first status with polling as fallback.

### Gaps
- Offramp webhook payload schema not shown in docs; retry count (60) comes from a search snippet of the overview page rather than a fetched page.
- No published rate limit for `/sell/user/{ref}/transactions` or `/onramp/v1/token`.

## Key Question 6 — Redirect URL rules for mobile and domain allow-list

### Takeaway
`redirectUrl` must match an allow-list configured in the CDP Portal (Payments → Onramp & Offramp); HTTPS origins with sub-path matching, `https://*.domain.com` wildcards, and `custom-scheme://path` deep links (no wildcards) are all accepted. Unmatched URLs are silently ignored (user stays on Coinbase). Coinbase advises against WebViews and recommends Chrome Custom Tabs / SFSafariViewController / ASWebAuthenticationSession / react-native-inappbrowser-reborn.

### Cited Findings
- Allow-list location: "Payments → Onramp & Offramp" in the CDP Portal; required when passing `redirectUrl` to hosted Onramp, Create Onramp Session API, Offramp, or payment links. — [Security Requirements](https://docs.cdp.coinbase.com/onramp/security-requirements.md)
- Formats: `https://app.com` (matches all sub-paths); `https://*.domain.com` (wildcard subdomains, HTTPS/HTTP only); `custom-scheme://path` (mobile deep links, no wildcards). — [Security Requirements](https://docs.cdp.coinbase.com/onramp/security-requirements.md)
- "Unmatched redirectUrls are silently ignored; transactions complete but users remain on Coinbase domain." — [Security Requirements](https://docs.cdp.coinbase.com/onramp/security-requirements.md)
- "Production URLs must be added to your domain allowlist." — [Generating Offramp URL](https://docs.cdp.coinbase.com/onramp/offramp/generating-offramp-url.md)
- Mobile: avoid WebView/WKWebView due to WebAuthn (passkey) limitations; use Chrome Custom Tabs (Android), SFSafariViewController or ASWebAuthenticationSession (iOS), react-native-inappbrowser-reborn (React Native). — [CDP FAQ](https://docs.cdp.coinbase.com/onramp/additional-resources/faq.md)
- Session tokens must be minted server-side with a CDP Secret API Key and include `clientIp`. — [Generating Offramp URL](https://docs.cdp.coinbase.com/onramp/offramp/generating-offramp-url.md)

### Inferences
- For Normal's Expo app, a universal link (`https://www.normalfinance.io/...`) and a custom scheme both work; the universal-link form benefits from wildcard/sub-path matching, while custom schemes must be listed exactly.
- The redirect fires "after they send crypto" — but in the self-custody flow the on-chain send happens in Normal's app, so the redirect is mostly a return-to-app signal after the Coinbase confirmation step; status should be driven by webhook/polling, not by the redirect.

### Gaps
- No documentation on how the redirect carries state (query params such as transaction id) back to the app.

## Key Question 7 — Limits (min/max per sell, daily), payout timing to bank, countries beyond US, KYB/application, incidents

### Takeaway
Limits are returned per payment method by the Options API (the docs' example shows USD ACH min $10 / max $25,000 and card min $10 / max $7,500 — example data, not a published schedule). Payout timing is not stated in CDP docs; Coinbase retail ACH cash-outs are commonly described as 1–3 business days. Offramp to bank is US-only (ACH); PayPal "select countries"; Coinbase-balance cash-out everywhere Coinbase operates except Japan. I found no published KYB checklist beyond CDP Portal onboarding, and no public incidents specific to Offramp.

### Cited Findings
- Options API example response: USD — card min $10 / max $7,500; ACH bank account min $10 / max $25,000 (illustrative example in docs). — [Offramp Configurations](https://docs.cdp.coinbase.com/onramp/offramp/configurations.md)
- Config API example: US with payment methods `CRYPTO_WALLET`, `FIAT_WALLET`, `ACH_BANK_ACCOUNT` and subdivisions; Canada listed with `CARD`. — [Offramp Configurations](https://docs.cdp.coinbase.com/onramp/offramp/configurations.md)
- Payment methods page (shared Onramp/Offramp): crypto balance and fiat balance in Coinbase account "all countries except Japan"; debit/credit cards "US and 90+ additional countries including EU, UK, CA"; ACH "US only"; PayPal "Canada, UK and few additional countries" (search snippet). — [Payment methods](https://docs.cdp.coinbase.com/onramp/additional-resources/payment-methods)
- Offramp cash-out methods on welcome page: "ACH transfers (US), PayPal (select countries), and Coinbase balances". — [Welcome](https://docs.cdp.coinbase.com/onramp/introduction/welcome.md)
- `presetFiatAmount` supports USD, CAD, GBP, EUR only. — [Generating Offramp URL](https://docs.cdp.coinbase.com/onramp/offramp/generating-offramp-url.md)
- Retail Coinbase cash-out timing (third-party, Oct 2025): ACH free, 1–3 business days; instant debit minutes, ~1.5–2% fee, ~$2,500/day; wire same day, $10–$25; PayPal often instant. — [CoinBureau](https://coinbureau.com/guides/how-to-withdraw-money-on-coinbase/)
- Onboarding: developers onboard through the Coinbase Developer Platform / Quickstart; no KYB requirements or review timeline documented. — [CDP FAQ](https://docs.cdp.coinbase.com/onramp/additional-resources/faq.md)
- Testing: mock transactions via a Debug Menu (click "Secured" 10 times at modal bottom, toggle "Enable Mocked Buy and Send"). — [CDP FAQ](https://docs.cdp.coinbase.com/onramp/additional-resources/faq.md)
- Demo app for reference implementation. — [coinbase/onramp-demo-application](https://github.com/coinbase/onramp-demo-application)

### Inferences
- EU/UK: card is listed as a payment method for 90+ countries but only on the shared payment-methods page; the Offramp-specific list names only ACH (US), PayPal (select countries) and Coinbase balances. Offramp for EU/UK users therefore appears limited to cashing out into their Coinbase fiat/crypto balance or PayPal (UK) — bank payout in EUR/GBP is not documented. Treat EU/UK bank sell as unsupported until `/sell/config` shows otherwise.
- Payout speed is governed by Coinbase retail rails after the sell settles inside the user's Coinbase account; Offramp docs do not promise any SLA.

### Gaps
- No official CDP statement on ACH payout time, instant cash-out availability through Offramp (`RTP`/`CARD` appear in the shared quote enum but not in `defaultCashoutMethod` values), or daily/monthly limits beyond the Options API example.
- No public incident reports or status-page entries specific to CDP Offramp were found in search.
- Official Help Center fee/timing pages (help.coinbase.com) returned 403 and could not be cited directly.
