# US Off-Ramp Providers: Transak, Ramp Network, Onramper, Meld (+ Banxa, Mercuryo) — fact sheets as of 2026-10-08

Research scope: US-first self-custody wallet (web + React Native) that wants a "sell crypto to bank" rail. Everything below is from primary docs/support pages fetched 2026-10-08 unless flagged. Where a page carries a "last updated" date I give it; several Ramp support pages are dated March–July 2026/2025, several Transak marketing pages carry no date. Pages on `transak.com` and `api.transak.com` return HTTP 403 to automated fetchers; those were read through a render proxy (r.jina.ai) of the same URL — I cite the underlying URL. Nothing in these notes is from training memory.

---

## Provider fact sheet: Transak

### Takeaway
Transak sells BTC/ETH/SOL/XLM and USDC on Ethereum/Solana/Base, but its own coverage page lists USDC-on-Stellar as buy-only and lists US off-ramp withdrawal methods as Visa/Mastercard card payout only (no ACH shown). Integration is widget-centric (URL/iFrame/RN WebView) with JWT-signed webhooks; "Transak Stream" gives a user a per-asset deposit address, but it is positioned as an end-user feature with Level 2 KYC, not a partner server-to-server API.

### Cited Findings
**US sell availability and payout rails**
- Transak's global coverage page, as rendered 2026-10-08, lists US off-ramp withdrawal methods as "Visa" and "Mastercard" only; buy-side US methods include Visa, Mastercard, Apple Pay, Google Pay, wire. All 50 states + DC + Puerto Rico are listed as supported; no excluded states shown — [transak.com/global-coverage](https://transak.com/global-coverage)
- UK off-ramp withdrawal methods on the same page: "Faster Payments," "Visa," "Mastercard" — [transak.com/global-coverage](https://transak.com/global-coverage)
- Transak's own docs describe off-ramp generically: "Cards, Bank transfers and Apple/Google Pay in multiple fiat currencies" and "136+ currencies in 45+ blockchains" — [docs.transak.com/products/off-ramp](https://docs.transak.com/products/off-ramp.md)
- Support article (undated) lists two payout methods: "Bank payout" and "Card payout"; card payout verification is "a zero-dollar (0$) transaction...through 3DS authentication by the customer's bank"; "Money once transferred cannot be refunded!" — [support.transak.com 7846035](https://support.transak.com/en/articles/7846035-what-is-offramp-and-how-does-it-work-on-transak)
- Secondary (Eco.com comparison, May 2026): Transak US sell "Rails: ACH (1-3 days), card"; "Fees range 0.99% to 1.99% depending on payment method, with an additional spread"; KYC "Lite ($1k), Standard ($15k), Pro (unlimited)" — [eco.com stablecoin offramps 2026](https://eco.com/support/en/articles/15210579-best-stablecoin-offramps-2026-cash-out-routes-compared). CONFLICT: this third-party claim of ACH payout is not corroborated by Transak's own US coverage page (card-only). Treat ACH-on-Transak-sell as unverified.

**Transak Stream (deposit-address off-ramp)**
- Launched 12 Dec 2024: "Users simply send their assets to their unique Transak Stream Address"; rails named are "bank account (SEPA, FASTER) or card (Visa/Mastercard)"; "Over 145 countries"; "40+ popular cryptocurrencies and stablecoins such as USDC, USDT, BTC, ETH, and SOL across 29+ major blockchain networks"; live test "19 seconds" — [decrypt.co press release](https://decrypt.co/296293/from-crypto-to-cash-in-one-click-introducing-transak-stream)
- Stream product page: "Transak Stream is available across 18+ countries that support normal off-ramp"; "You'll receive a unique wallet address for each cryptocurrency and network, such as separate addresses for ETH on Ethereum and SOL on Solana"; "Users need to complete Level 2 KYC verification to access Transak Stream"; "SEPA Instant and eligible fast-funds cards will receive payouts instantly", "Cards without fast-funds capability may take 48 hours and SEPA Standard payout may take upto 5 days"; "Most transactions complete within 2 minutes"; partners "Integrate using our custom query parameters or reach our to our development team" — [transak.com/stream](https://transak.com/stream)
- The changelog URL `docs.transak.com/changelog/transak-stream` and support article 12320616 ("Transak Offramp Stream Process") both returned 404 on 2026-10-08 — [docs.transak.com/changelog/transak-stream](https://docs.transak.com/changelog/transak-stream)

**Supported sell assets (Stellar focus)**
- Crypto coverage page (rendered 2026-10-08): "XLM - Stellar [Buy][Sell]" (sell supported); "USDC - USD Coin [Buy]" on Stellar (buy-only, no Sell link); BTC mainnet, ETH, SOL, USDC-Ethereum, USDC-Solana, USDC-Base all show Buy+Sell — [transak.com/crypto-coverage](https://transak.com/crypto-coverage)
- Dedicated page "How to Sell Stellar (XLM) for Fiat Currency" exists — [transak.com/sell/xlm](https://transak.com/sell/xlm) (403 to fetchers; existence only)

**Fees and partner economics**
- "You can configure a partner fee of up to 5%"; partner fee "is added on top of Transak's baseline fee"; automated payouts "between the 4th and 7th of every month" in "USDC or USDT"; "Payouts below $20 are rolled over"; the page does NOT state whether partner fee applies to sell orders — [docs.transak.com partner fees](https://docs.transak.com/guides/managing-partner-payouts-and-configuring-partner-fees.md)
- Transak's fee support article is 403 to fetchers — [support.transak.com 7845942](https://support.transak.com/en/articles/7845942-how-does-transak-calculate-prices-and-fees)

**Integration mechanics**
- Widget params for sell: `productsAvailed` = "SELL (off-ramp only), or BUY,SELL (both)"; `cryptoCurrencyCode`, `network`, `cryptoAmount` ("Fixed crypto amount to sell"), `fiatCurrency`, `countryCode`, `walletRedirection` ("Enables wallet redirection for off-ramp flows"), `redirectURL`, `partnerOrderId`, `partnerCustomerId`, `paymentMethod` ("Payment method to lock in"), `disablePaymentMethods`, `userData` — [docs.transak.com query-parameters](https://docs.transak.com/customization/query-parameters.md)
- Off-ramp doc: web = Redirection, iFrame, JavaScript SDK; mobile = Android, iOS, React Native WebView; use `redirectURL`, `walletRedirection=true`, and `WALLET_REDIRECTION` frontend events — [docs.transak.com/products/off-ramp](https://docs.transak.com/products/off-ramp.md)
- Sell webhook events: `ORDER_CREATED`/`AWAITING_PAYMENT_FROM_USER`, `ORDER_PAYMENT_VERIFYING`/`PAYMENT_DONE_MARKED_BY_USER`, `ORDER_PROCESSING`/`PENDING_DELIVERY_FROM_TRANSAK`, `ON_HOLD_PENDING_DELIVERY_FROM_TRANSAK`, `ORDER_COMPLETED`/`COMPLETED`, `ORDER_FAILED` (`EXPIRED`,`FAILED`,`CANCELLED`), `ORDER_REFUNDED`/`REFUNDED` ("refunded back to their wallet as fiat payout could not be fulfilled"). Payload: "The webhook data field is a signed JWT that should be verified using your Partner Access Token". Webhook URLs must be HTTPS/public, registered via support with environment `STAGING` or `PRODUCTION`; production registration "requires KYB approval" — [docs.transak.com webhooks](https://docs.transak.com/features/webhooks.md)
- Order status options: REST polling, webhooks, WebSockets ("near real-time order status streams") — [docs.transak.com track-order-status](https://docs.transak.com/guides/track-order-status.md)
- Order API: `GET https://api-stg.transak.com/partners/api/v2/order/{orderId}` with headers `x-api-key` and `access-token`; response fields include `walletAddress`, `cryptoAmount`, `network`, `status`, `isBuyOrSell`, `paymentOptionId`, `transactionHash`; the schema does not document a deposit-address or memo field for sell orders — [docs.transak.com get-order-by-order-id](https://docs.transak.com/api/public/get-order-by-order-id.md)
- React Native: `@transak/ui-react-native-sdk` (bare RN) and `@transak/ui-expo-sdk` (Expo), WebView-based `TransakWebView`; events `TRANSAK_ORDER_CREATED`, `TRANSAK_ORDER_SUCCESSFUL`, `TRANSAK_ORDER_FAILED`, `TRANSAK_ORDER_CANCELLED`, `TRANSAK_WALLET_REDIRECTION`; "A widgetUrl is valid for 5 minutes and can only be used once"; "Do not override the WebView user agent" — [docs.transak.com react-native](https://docs.transak.com/integration/mobile/react-native.md)

**Sandbox / staging**
- Staging exists; KYC "will be instantly approved in the staging environment"; US test identity (Jane Doe, SSN `123456789`); "+refund"/"+failed" email aliases simulate outcomes; on-ramp testnets deliver TRNSK test token on 7 EVM testnets; "For off-ramp, place orders only for native tokens supported and transfer the official testnet token on that network for order to be reconciled automatically" — [docs.transak.com sandbox-credentials](https://docs.transak.com/guides/sandbox-credentials.md)
- Partner dashboard account creation guide exists — [docs.transak.com create partner dashboard account](https://docs.transak.com/guides/how-to-create-partner-dashboard-account.md)

### Inferences
- Because production webhook registration is gated on "KYB approval" but staging webhooks are not, a partner can build and test the full sell loop on staging before KYB; production is gated.
- The sell order API exposes `walletAddress` (user's source) and `transactionHash` but no documented Transak deposit address — so the deposit address is shown inside the widget, and a wallet app must either deep-link/redirect (`walletRedirection`) or have the user copy it; there is no documented partner API to fetch it.
- USDC-on-Stellar being buy-only on Transak means a Stellar-USDC-native wallet would have to sell XLM, or route USDC via another chain, to use Transak.

### Gaps
- Could not confirm from a Transak primary source whether US sell supports ACH payout; the coverage page shows card-only for US withdrawals while a May-2026 third-party article says ACH. Needs a dashboard/API check (`GET /api/public/get-fiat-currencies` payout methods for USD) once a staging key exists.
- Transak baseline sell fee %, minimum fee, and per-method/per-tier limits are not on any fetchable Transak page (fee article 403; "fees & limits Notion" pages not surfaced by search).
- Whether the partner fee applies to sell orders is unstated.
- KYB lead time is not published.
- Memo/tag handling for Stellar sell is not documented anywhere I could reach.

---

## Provider fact sheet: Ramp Network

### Takeaway
Ramp is the strongest direct fit on paper: US off-ramp with ACH (≤2 business days) and RTP (as fast as 2 minutes) at 0.99% (min $1.99), with XLM and USDC-on-Stellar explicitly listed as sellable for USA users (July 2026 page), a documented "native flow" where the widget hands your app the deposit address + amount via a `SEND_CRYPTO` event and takes back a `txHash`, ECDSA-signed webhooks, and an official React Native SDK. Eight US states are excluded; Texas blocks stablecoins.

### Cited Findings
**US sell availability and payout rails**
- Payout methods (last updated March 19, 2025): United States "ACH (Automated Clearing House): Up to 2 business days", "RTP (Real-Time Payments): As fast as 2 minutes"; Europe SEPA "Up to 2 business days", SEPA Instant "As fast as 10 seconds", Visa/Mastercard payout-to-card "< 30 minutes (Fast Funds-enabled) or up to 2 business days"; Mexico SPEI; card payouts listed for "Global (excluding USA)". "Payouts must be sent to a bank account or card owned by, and under the same name as, the user who makes the sale." UK Faster Payments not mentioned — [support.rampnetwork.com 8992](https://support.rampnetwork.com/en/articles/8992-what-payout-methods-does-ramp-support-for-selling-crypto)
- Earlier launch blog: off-ramp "available for users in 35 states and territories in the US"; RTP "typically in under 20 seconds"; fee then "0.99% per transaction with a minimum of $3.99" (older figure, superseded by the $1.99 min on the current fee page) — [rampnetwork.com off-ramp blog](https://rampnetwork.com/blog/the-new-off-ramp-all-you-need-to-know)
- Unsupported US states: Louisiana, Minnesota, Nevada, New Jersey, New York, Pennsylvania, Vermont, Washington (8). Puerto Rico and US Virgin Islands are in the unsupported territories list. 130+ unsupported countries incl. Japan, South Korea, Thailand, Indonesia, Vietnam, Nigeria, Ukraine. "In some countries and territories, we may provide limited services and allow for crypto purchases only." — [support.rampnetwork.com 433](https://support.rampnetwork.com/en/articles/433-supported-countries-territories-and-us-states-for-buying-and-selling-crypto)

**Supported sell assets (page dated July 7, 2026)**
- USA selling: BTC on Bitcoin; ETH on Arbitrum, BSC, Base, Ethereum, Linea, OP Mainnet, Polygon, zkSync Era; SOL on Solana; "XLM (Stellar Lumens): Selling supported on Stellar network"; USDC selling on Arbitrum, Avalanche, Base, Celo, Ethereum, Linea, Monad, OP Mainnet, Polygon, Solana, Stellar, World Chain, zkSync Era. Texas: "stablecoins (and a few related assets) cannot be bought or sold" (USDC, USDT, USDT0, AUSD, EURC, EURQ, USDQ, RLUSD). Non-USA: XLM and USDC on Stellar also sellable — [support.rampnetwork.com 432](https://support.rampnetwork.com/en/articles/432-what-cryptoassets-does-ramp-network-support)
- Sell asset list "depends on your country or territory" (Mar 19, 2025) — [support.rampnetwork.com 8964](https://support.rampnetwork.com/en/articles/8964-what-cryptoassets-and-blockchains-does-ramp-support-for-selling)
- Docs asset table loads via API; the public host-API assets endpoint returned HTTP 400 without parameters — [docs.rampnetwork.com/assets](https://docs.rampnetwork.com/assets)

**Fees and partner economics**
- Sell fees (Mar 19, 2025): ACH 0.99% min $1.99; RTP 0.99% min $1.99; SEPA 0.99% min €1.99; SEPA Instant 0.99% min €1.99; SPEI 2.9% min $1; payout-to-card Visa/Mastercard 4.49% min €1.99. Network fee for the inbound send "must be paid by you directly from your wallet". "Partner fees may apply on third-party platforms" — [support.rampnetwork.com 8957](https://support.rampnetwork.com/en/articles/8957-what-are-the-fees-for-selling-crypto)
- Partner pricing (Feb 27, 2025): "Our team works with partners to design pricing that aligns with your business model"; "Many partners benefit from fees lower than those listed on our website"; "You may also monetize transactions through our partner commission program"; no published partner % — [support.rampnetwork.com 31326](https://support.rampnetwork.com/en/articles/31326-what-are-the-baseline-fees-for-integration-partners)
- Secondary (Eco.com, May 2026): Ramp US "ACH (1-3 days)", fees "0.99-2.5% depending on method/region", KYC "$1k lite, $15k standard, $50k+ enhanced" — [eco.com](https://eco.com/support/en/articles/15210579-best-stablecoin-offramps-2026-cash-out-routes-compared) (third-party; KYC tiers not found on Ramp's own pages)

**Integration mechanics**
- Config params: `enabledFlows` (`ONRAMP`,`OFFRAMP`), `defaultFlow`, `offrampAsset` (deprecated → `enabledCryptoAssets`), `offrampWebhookV3Url` ("subscribe to sale events via webhooks"), `useSendCryptoCallback` ("Only applicable for OFFRAMP mode... Send with your wallet button should be visible"), `hostApiKey` (required), `userAddress` ("For off-ramp, will be treated as a source address"), `selectedCountryCode`, `paymentMethodType` (`MANUAL_BANK_TRANSFER`, `AUTO_BANK_TRANSFER`, `PIX`, `APPLE_PAY`, `GOOGLE_PAY`, `CARD_PAYMENT`), `variant` (`auto`, `hosted`, `desktop`, `mobile`, `hosted-mobile`, `webview-mobile`, `webview-desktop`, `embedded-mobile`, `embedded-desktop`) — [docs.rampnetwork.com/configuration](https://docs.rampnetwork.com/configuration)
- Native flow: set `useSendCryptoCallback: true`; widget emits `{ "eventVersion": 1, "type": "SEND_CRYPTO", "payload": { assetInfo{address,symbol,chain,type,name,decimals}, amount (string, wei), address (receiver) } }`; integrator replies `{ "type": "SEND_CRYPTO_RESULT", "payload": { "txHash": "..." } }` or an error; web uses `onSendCrypto`; iOS `didRequestOfframp` with `SendCryptoPayload`; Android `onOfframpCryptoSent(txHash, error)`; non-SDK webview uses `useSendCryptoCallbackVersion=1` and postMessages. No memo/destination-tag field is documented in the payload — [docs.rampnetwork.com native flow](https://docs.rampnetwork.com/off-ramp-native-flow/integration)
- Off-ramp page: native flow is "required for mobile wallets" and "we recommend everyone to take advantage of the Native Flow when feasible" — [docs.rampnetwork.com/off-ramp](https://docs.rampnetwork.com/off-ramp)
- SDK reference: `onSendCrypto(callback)` "Only applicable for widget in OFFRAMP mode... called when the user clicks Send with your wallet"; resolves `{ txHash: string }`; `RampSale` statuses CREATED/RELEASED/EXPIRED — [docs.rampnetwork.com/sdk-reference](https://docs.rampnetwork.com/sdk-reference)
- Webhooks: event `type: 'CREATED' | 'RELEASED' | 'EXPIRED'`, `mode: 'OFFRAMP'`, `payload: RampSale` (sale id, tx hash, crypto amount/symbol/chain, fiat amount/currency/payout method, fees, rates). Signature header `X-Body-Signature`, "ECDSA key and sha256 hash function", body serialized with `fast-json-stable-stringify`; production and demo public keys published; retries "four times with a delay of 3 minutes" — [docs.rampnetwork.com/webhooks](https://docs.rampnetwork.com/webhooks)
- React Native SDK `@ramp-network/react-native-sdk`; supports `enabledFlows: ['ONRAMP','OFFRAMP']` and `useSendCryptoCallback: true`; iOS ≥11, Swift 5.5, Android minSdk 21 — [docs.rampnetwork.com react-native-sdk](https://docs.rampnetwork.com/mobile/react-native-sdk)
- End-user flow: user receives "a wallet address (from Ramp) where you need to send your crypto" (Jun 11, 2025) — [support.rampnetwork.com 209874](https://support.rampnetwork.com/en/articles/209874-how-to-sell-crypto)

**Sandbox / KYB**
- Demo: widget `https://app.demo.rampnetwork.com`, API `https://api.demo.rampnetwork.com/api`; testnets Ethereum Rinkeby, Matic Mumbai, Ronin, Celo Alfajores, Tezos Ghostnet, Flow, Solana; "All the remaining assets (e.g. BTC) are mocked"; min purchase €0.05. Page does not mention off-ramp testing or KYB — [docs.rampnetwork.com/testing-environment](https://docs.rampnetwork.com/testing-environment)
- API key: "Fill out this form and get full access to Ramp Network's SDK"; contact partner@ramp.network; no KYB criteria or lead time published — [docs.rampnetwork.com/api-keys](https://docs.rampnetwork.com/api-keys)

### Inferences
- Ramp's native flow is a widget-driven handshake, not a pure server-to-server API: the widget (in your WebView) emits the deposit address/amount; your app signs and broadcasts and returns the hash. For a self-custody RN wallet this is exactly the pattern needed and avoids asking users to copy addresses.
- The `SEND_CRYPTO` payload documents `address` but no memo field; since Ramp lists XLM and USDC-Stellar as sellable, Ramp must either use unique per-sale Stellar addresses or carry a memo in an undocumented field — this must be verified in the demo environment before relying on it.
- The testnet list (Rinkeby, Mumbai, Ghostnet) is stale (those testnets are deprecated), so the testing page is likely not maintained; expect to confirm demo behaviour with Ramp directly.

### Gaps
- Per-user sell limits (daily/monthly, by KYC tier) are not published on fetchable Ramp pages.
- Partner commission percentage for off-ramp is not published.
- KYB requirements and lead time not published.
- Whether the demo environment supports an end-to-end off-ramp test (and for which chains) is undocumented.
- Stellar memo handling in the sell flow is undocumented.

---

## Provider fact sheet: Onramper (aggregator)

### Takeaway
Onramper's off-ramp is a widget-only aggregation of seven providers (AlchemyPay, Banxa, MoonPay, Unlimit, Koywe, TransFi, Onramp Money — note: not Transak or Ramp) available only on the $599/mo Premium or custom White-Label plans; its "Wallet Initiation flow" redirects the user back to your app with `providerWalletAddress` so you can send programmatically, and the partner confirms via `POST /transactions/confirm/{type}`. KYB is with Onramper (single API key); webhooks are HMAC-SHA256. Stellar and US-ACH coverage are inside an iframe I could not read.

### Cited Findings
**Routing and providers**
- Offramp providers and flows: "AlchemyPay: QR code only; Banxa: Wallet Initiation only; MoonPay, Unlimit Crypto, Koywe, TransFi: Both flows; Onramp Money: Both flows (Wallet Initiation limited to specific networks)" — [docs.onramper.com offramp-process-flow](https://docs.onramper.com/docs/offramp-process-flow.md)
- Two flows: "Wallet Initiation Flow" ("Recommended for: integrations on mobile wallets and wallet-connected web applications"), triggered when `offrampCashoutRedirectUrl` is provided; after user action "the user will be redirected to the partner's system" where the partner extracts query params including `providerWalletAddress` and "initiates the transfer"; "QR Code Flow" lets the user "copy-paste the amount and wallet address" or scan a QR. Partner must "call the following API endpoint": `POST /transactions/confirm/{type}` — [docs.onramper.com offramp-process-flow](https://docs.onramper.com/docs/offramp-process-flow.md)
- `GET /supported/onramps/all` with `type` query = "buy" or "sell"; base URLs `https://api.onramper.com` and `https://api-stg.onramper.com`; example providers "UTORG, Sardine, Stripe, Coinify, Onramp Money, LocalRamp, Alchemy Pay, TransFi, Unlimit, Guardarian, Onmeta, Topper, Fonbnk, Banxa, Neocrypto, Koywe, GateConnect" — [docs.onramper.com get_supported-onramps-all](https://docs.onramper.com/reference/get_supported-onramps-all.md)
- `sell_recommendation` "Overrides default ranking with specific offramp"; `onlyOfframps` restricts providers — [docs.onramper.com offramp widget params](https://docs.onramper.com/docs/supported-widget-parameters-offramp.md)

**Widget parameters (sell)**
- `offrampCashoutRedirectUrl`, `sell_defaultFiat`, `sell_onlyFiats`, `sell_excludeFiats`, `sell_defaultCrypto`, `sell_onlyCryptos`, `sell_excludeCryptos`, `sell_defaultAmount` (requires `sell_defaultFiat`), `sell_onlyCryptoNetworks`, `sell_excludeCryptoNetworks`, `sell_defaultPaymentMethod`, `sell_excludePaymentMethods`, `onlyOfframps`, `sell_isAmountEditable`, `sell_recommendation`, `sell_popularCryptos`, `sell_maxAvailableCrypto` — [docs.onramper.com offramp widget params](https://docs.onramper.com/docs/supported-widget-parameters-offramp.md)
- Buy-side `wallets`, `networkWallets`, `walletAddressTags` ("Wallet address tags (destination tags/memos) supplied to widget") exist on the buy widget — [docs.onramper.com buy-widget](https://docs.onramper.com/v1.0/docs/buy-widget.md)

**API / webhooks**
- Checkout intent `POST /checkout/intent`: body `onramp`, `source`, `destination`, `amount`, `type`, `paymentMethod`, `network`, `wallet`, `uuid`, `originatingHost`, `partnerContext`; response `transactionId`, `url` (redirect to provider UI), `type` ("iframe"), `sessionInformation`; auth header `Authorization: pk_prod_...`. Example is buy; sell is by `type` value — [docs.onramper.com post_checkout-intent](https://docs.onramper.com/v1.0/reference/post_checkout-intent.md)
- Webhook payload required fields: `country, inAmount, onramp, onrampTransactionId, outAmount, sourceCurrency, status, statusDate, targetCurrency, transactionId, transactionType`; optional `paymentMethod, partnerContext, statusReason, transactionHash, walletAddress, isRecurringPayment`; statuses `new | pending | paid | completed | canceled | failed` ("specific statuses might vary among providers"); header `X-Onramper-Webhook-Signature`, HMAC-SHA256 hex of raw body with a secret issued on registration; registration "reach out to your Customer Success Manager". No retry policy or deposit-address field documented — [docs.onramper.com webhook-implementation](https://docs.onramper.com/v1.0/docs/webhook-implementation.md)

**Pricing / plans / partner fee**
- Essentials "$199 /month" (6 onramps, no off-ramp); Premium "US$599 /month" with "All 30+ onramps", "Support for off-ramps, P2P and crypto-to-crypto swaps", "Add your own fees"; White-Label "Custom pricing"; add-ons "+$300/mo" data/fee analysis, "+$400/mo" custom routing engine; "try 14 days free" — [onramper.com/pricing](https://onramper.com/pricing)

**Sandbox**
- Sandbox keys `pk_test` at `https://buy.onramper.dev`, production `pk_prod` at `https://buy.onramper.com`; "none of the providers support actual testnet blockchain transactions"; "Production Bleed-over: For providers without a dedicated sandbox, Onramper may display their production environment inside the .dev sandbox"; Banxa "the most mature sandbox environment available on Onramper"; offramp testing not addressed — [docs.onramper.com testing-overview](https://docs.onramper.com/docs/testing-overview.md)

**Coverage pages**
- Provider, network and asset coverage pages are iframes to `docs-archive.onramper.com/embedded/coverage` which returned empty content to fetchers — [docs.onramper.com onramp-providers](https://docs.onramper.com/docs/onramp-providers.md); [docs.onramper.com network-support](https://docs.onramper.com/docs/network-support.md)

### Inferences
- Because the partner authenticates with a single Onramper `pk_` key and provider onboarding is not mentioned anywhere in the docs, KYB appears to be with Onramper only; the underlying provider still runs end-user KYC in its own UI (the checkout-intent response is a redirect `url` to the provider).
- Fee stacking: provider fee (set by each offramp) + optional partner commission ("Add your own fees", Premium+) + Onramper's fixed monthly subscription; Onramper does not publish a per-transaction aggregator fee.
- For US ACH sell through Onramper, the realistic underlying providers are MoonPay and Banxa (both document US ACH sell; see Banxa/MoonPay notes below). Transak and Ramp are NOT in Onramper's offramp list, so Onramper does not get you Ramp's Stellar sell.

### Gaps
- Whether any Onramper offramp provider supports XLM or USDC-Stellar sell, and which support USD/ACH in the US, is inside an unreadable iframe; needs a `pk_test` key and `GET /supported/...?type=sell` queries.
- No published Onramper per-transaction fee or revenue share %.
- No documented offramp statuses beyond the generic six; no retry policy.
- No React Native SDK documented (widget URL/WebView only).
- KYB requirements/lead time not published.

---

## Provider fact sheet: Meld (aggregator)

### Takeaway
Meld exposes a true API-driven sell flow: `GET /network-partner/supported/routes/CRYPTO_OFFRAMP/{country}/{source}/{destination}` → `POST /payments/crypto/quote` (with `paymentMethodType` e.g. `"ACH"`) → `POST /crypto/session/widget` (`sessionType: "SELL"`) → provider widget for KYC/payout → `GET /payments/transactions/{id}` to read `cryptoDetails.destinationWalletAddress` and send programmatically; webhooks are HMAC-SHA256 over `timestamp.url.body`. Thirteen providers support sell (incl. Transak, Banxa, Unlimit, Coinbase Pay, Robinhood Connect). Sandbox exists but offramp is "quote generation only"; onboarding is sales-led, and the docs imply partners bring their own provider credentials unless Meld handles setup.

### Cited Findings
**Sell flow / mechanics**
- Base URLs sandbox `https://api-sb.meld.io`, production `https://api.meld.io`; header `Authorization: BASIC {apiKey}`; keys "environment-specific (Sandbox keys do not work in Production, and vice versa)"; "contact your Meld representative to get onboarded" — [docs.meld.io getting-started](https://docs.meld.io/docs/meld-api/getting-started.md)
- Sell quickstart (CRYPTO_OFFRAMP), five calls: routes → quote → session → widget → deposit address → poll. Routes: `GET /network-partner/supported/routes/CRYPTO_OFFRAMP/{country}/{source}/{destination}`. Quote: `sourceCurrencyCode` crypto (e.g. USDC), `destinationCurrencyCode` fiat (USD), `sourceAmount` number in crypto units, `paymentMethodType` canonical ID "e.g., "ACH"". Session: `sessionType: "SELL"`, `walletAddress` = user's send-from wallet, response `serviceProviderWidgetUrl`. Deposit address: `transaction.cryptoDetails.destinationWalletAddress ?? transaction.cryptoDetails.offrampDestinationWalletAddress`. Response fields `serviceProvider` (e.g. "TRANSAK"), `destinationAmount`, `totalFee`, `networkFee`, `transactionFee`, `partnerFee`, `blockchainTransactionId`. Statuses `PENDING → SETTLING → SETTLED` (or `FAILED`/`CANCELLED`). First webhook `TRANSACTION_CRYPTO_PENDING` with `paymentTransactionId`, `externalSessionId`, `paymentTransactionStatus` — [docs.meld.io whitelabel-quickstart](https://docs.meld.io/docs/stablecoins/white-label-api-integration/whitelabel-quickstart)
- Sell flow doc: "call Meld's force fetch transaction endpoint to fetch the token, amount, and the wallet address for the user to send crypto to (`cryptoDetails.destinationWalletAddress`)"; "On a sell, `cryptoDetails.destinationWalletAddress` is the offramp's deposit address. `sourceWalletAddress` and `sessionWalletAddress` are the user's own wallet, so never send crypto to them"; pre-2025-03-04 API versions use `offrampDestinationWalletAddress`; partner app should "queue up a transfer...and ask the user to confirm the transfer. Once they do, commence the transfer". No memo/tag documentation — [docs.meld.io sell-flow](https://docs.meld.io/docs/stablecoins/additional-information/flow/sell-flow.md)
- Providers supporting sell (13): "Preferred & Standard: Alchemy Pay, Transak, Unlimit; Preferred only: Banxa, OnMeta, Due Network, Noah, Uphold, Revolut; Standard only: Coinbase Pay, Koywe, Paybis, Robinhood Connect"; payout "credit/debit card and bank account transfers" — [docs.meld.io sell-flow](https://docs.meld.io/docs/stablecoins/additional-information/flow/sell-flow.md)
- Product framing: "The transaction itself — including KYC and payment — happens in the onramp's UI" — [docs.meld.io white-label index](https://docs.meld.io/docs/stablecoins/white-label-api-integration/index)
- Meld Checkout = "hosted, ready-to-use crypto buy/sell UI they can embed or redirect to from their app" — [docs.meld.io meld-checkout index](https://docs.meld.io/docs/stablecoins/meld-checkout-integration/index)
- Webhook auth: headers `meld-signature`, `meld-signature-timestamp`; `base64url(HMACSHA256(<TIMESTAMP>.<URL>.<BODY>))` with "the secret defined in the webhook profile"; Java sample provided — [docs.meld.io webhooks-authentication](https://docs.meld.io/docs/stablecoins/for-all-products/webhooks-authentication.md)
- SDK pages exist for Web, iOS and React Native (`.../headless-integration/sdks/react-native.md`) — [docs.meld.io documentation index](https://docs.meld.io/_llms/2026-02-03/documentation.md) (titles only; content not fetched)

**Provider setup / KYB / routing**
- Provider setup: "If Meld is handling service provider setup for you, you can skip this page"; otherwise the partner obtains API credentials from the provider and adds them under Integrations in the Meld dashboard (examples "Stripe, Transak, Mercuryo, etc."); "In production, the Meld team will work with you to select which onramps to enable to best suit your needs, based on coverage, conversion, and pricing" — [docs.meld.io service-provider-setup](https://docs.meld.io/docs/stablecoins/for-all-products/service-provider-setup.md)
- Quote response includes per-provider `partnerFee` alongside `transactionFee`/`networkFee` (fee stacking surfaced in the quote) — [docs.meld.io whitelabel-quickstart](https://docs.meld.io/docs/stablecoins/white-label-api-integration/whitelabel-quickstart)
- Routes endpoint is how a partner discovers which providers can do a given `{country}/{source}/{destination}` sell — [docs.meld.io whitelabel-quickstart](https://docs.meld.io/docs/stablecoins/white-label-api-integration/whitelabel-quickstart)

**Sandbox**
- Sandbox `https://api-sb.meld.io`; providers with full sandbox: Unlimit, Transak; limited: Banxa, Stripe, Paybis, BTC Direct; none: Robinhood, Coinbase Pay, Blockchain.com, Alchemy Pay; offramp: "Limited testing - quote generation only. Cannot complete full transactions in sandbox" — [docs.meld.io sandbox-guide](https://docs.meld.io/docs/stablecoins/sandbox-guide/index.md)
- Third-party (Portal HQ docs): "sign up for a Meld account at dashboard.meld.io and generate API keys for the environments you plan to use (sandbox and production are issued separately)" — [docs.portalhq.io meld](https://docs.portalhq.io/integrations/On-Off-Ramp/meld)

**Coverage / pricing**
- Coverage page points to meld.io/coverage and "Countries" pages and the Network Partner `list-supported-countries` endpoint; payment options summarized as "Card, Apple Pay, bank rails"; no Stellar mention — [docs.meld.io coverage](https://docs.meld.io/docs/stablecoins/coverage.md)
- `meld.io/pricing` returns 404; `meld.io/coverage/countries/united-states` returned HTTP 500 on 2026-10-08 — [meld.io/pricing](https://www.meld.io/pricing)

### Inferences
- Meld is the closest thing to "server-to-server" among the four: the deposit address is readable from Meld's transaction API, so a wallet backend can construct and sign the send; but the provider widget is still required once per sell for KYC + payout-account capture (per the "KYC and payment happens in the onramp's UI" statement).
- The provider-setup page implies partners (or Meld on their behalf) must hold credentials — and therefore accounts/KYB — with each underlying offramp unless Meld brokers it; this contradicts the "single KYB" assumption and must be asked explicitly.
- Because Transak, Banxa and Unlimit are Meld sell providers and Meld's quote accepts `paymentMethodType: "ACH"`, US ACH sell via Meld depends on at least one of those providers offering ACH payout for the chosen asset.

### Gaps
- Meld's own fee (platform fee / per-tx) and partner markup mechanics are not published (pricing page 404).
- US sell payment methods per provider on Meld, and Stellar/XLM/USDC-Stellar sell support, could not be read (coverage page 500; needs `GET /network-partner/supported/routes/CRYPTO_OFFRAMP/US/XLM/USD` with a sandbox key).
- Whether Meld handles provider KYB for small partners, and the lead time, are unpublished.
- Memo/tag handling for Stellar in `cryptoDetails` is undocumented.

---

## Brief: Banxa and Mercuryo (US sell)

### Takeaway
Banxa documents US USDC/ETH/BTC/XRP/ADA sell with ACH ("One to three business days"), state-dependent availability, API-first "Create Sell Order" integration, but off-ramp must be enabled per partner account. Mercuryo has no US sell today (per a tracker site) and announced a Coinme partnership (Oct 30, 2025) to add compliant US crypto-to-fiat; nothing confirms it is live.

### Cited Findings
- Banxa off-ramp overview: "Fiat payout methods vary by region" (examples PayID for AUD, SEPA for EUR); flow = select crypto/amount → payout details → KYC → transfer crypto to Banxa's wallet → fiat payout; "Non-custodial (customer transfers) and custodial (platform transfers)" variants; `GET /{partnerRef}/v2/payment-methods`; "Off-ramp must be enabled and configured for your partner account" — [docs.banxa.com/docs/off-ramp](https://docs.banxa.com/docs/off-ramp)
- Banxa "Sell USD Coin ACH": "One to three business days is the quoted range"; "Availability also differs by state rather than applying evenly across the country, which makes the quote screen the only guide"; limits "vary with verification level and location"; USDC "sell support varies by chain and country together rather than by the token alone"; no fee % published; Stellar not mentioned — [banxa.com sell-usd-coin-ach](https://banxa.com/coins/sell-usd-coin-ach)
- Banxa sell-order integration guide exists — [docs.banxa.com sell-order-integration-guide](https://docs.banxa.com/docs/sell-order-integration-guide)
- Mercuryo: "New York and Vermont are the only two states in the U.S where Mercuryo can't be used"; "users in Texas can't buy or sell USDC and USDT"; "Currently, U.S. users can't sell crypto for cash, and withdrawal to a bank card isn't available either" — [supportedcountries.com/mercuryo](https://supportedcountries.com/mercuryo/) (third-party tracker; site certificate expired on fetch, content via search snippet — low confidence)
- Mercuryo–Coinme partnership, Oct 30, 2025: "fully compliant fiat-to-crypto and crypto-to-fiat conversion services in the US" via Coinme's Crypto-as-a-Service; no payout methods, states or go-live date — [webull.com news](https://www.webull.com/news/13770572726221824)
- MoonPay (relevant as an Onramper offramp): US ACH sell blog (published 2021, last modified Aug 22, 2024): excluded "Hawaii, New York, and Rhode Island"; assets "Bitcoin, Ethereum, and Bitcoin Cash" at that time; "fixed and guaranteed price... provided they send us their digital assets within twenty minutes" — [moonpay.com ach-sell](https://www.moonpay.com/learn/blog/ach-sell); Eco.com (May 2026) says MoonPay sell "1% plus the network fee on the inbound transfer, with a $3.99 minimum" — [eco.com](https://eco.com/support/en/articles/15210579-best-stablecoin-offramps-2026-cash-out-routes-compared)

### Inferences
- Banxa is the most plausible US-ACH offramp reachable through BOTH aggregators (Onramper "Wallet Initiation only"; Meld "Preferred only").
- Mercuryo should be excluded for US sell planning until a Coinme-powered launch is confirmed.

### Gaps
- Banxa US state list, fee %, limits, and Stellar/XLM sell support not published on fetched pages.
- Mercuryo US sell go-live status post-Coinme unknown.

---

## Key question: Which of these offer US sell with ACH payout today, and which assets?

### Takeaway
Ramp Network is the only one of the four with a primary-source statement of US ACH (and RTP) payout, covering BTC, ETH (8 chains), SOL, XLM and USDC on 13 chains incl. Stellar for USA users. Transak's own US coverage page shows card payout only (ACH unconfirmed). Onramper and Meld inherit ACH from underlying providers (Banxa, MoonPay on Onramper; Transak/Banxa/Unlimit etc. on Meld) and Meld's quote API explicitly accepts `paymentMethodType: "ACH"`.

### Cited Findings
- Ramp US payouts: ACH "Up to 2 business days", RTP "As fast as 2 minutes" — [support.rampnetwork.com 8992](https://support.rampnetwork.com/en/articles/8992-what-payout-methods-does-ramp-support-for-selling-crypto)
- Ramp USA sellable: BTC; ETH on 8 chains; SOL; XLM; USDC on Arbitrum, Avalanche, Base, Celo, Ethereum, Linea, Monad, OP Mainnet, Polygon, Solana, Stellar, World Chain, zkSync Era (Jul 7, 2026) — [support.rampnetwork.com 432](https://support.rampnetwork.com/en/articles/432-what-cryptoassets-does-ramp-network-support)
- Ramp excluded states: LA, MN, NV, NJ, NY, PA, VT, WA; Texas no stablecoins — [support.rampnetwork.com 433](https://support.rampnetwork.com/en/articles/433-supported-countries-territories-and-us-states-for-buying-and-selling-crypto); [432](https://support.rampnetwork.com/en/articles/432-what-cryptoassets-does-ramp-network-support)
- Transak US off-ramp withdrawal methods shown: Visa, Mastercard only — [transak.com/global-coverage](https://transak.com/global-coverage); third-party claims ACH — [eco.com](https://eco.com/support/en/articles/15210579-best-stablecoin-offramps-2026-cash-out-routes-compared)
- Meld quote `paymentMethodType` "e.g., "ACH"" for CRYPTO_OFFRAMP — [docs.meld.io whitelabel-quickstart](https://docs.meld.io/docs/stablecoins/white-label-api-integration/whitelabel-quickstart)
- Banxa USDC→USD ACH "One to three business days" — [banxa.com](https://banxa.com/coins/sell-usd-coin-ach); MoonPay US ACH sell (47 states) — [moonpay.com](https://www.moonpay.com/learn/blog/ach-sell)
- Onramper offramp providers: AlchemyPay, Banxa, MoonPay, Unlimit, Koywe, TransFi, Onramp Money — [docs.onramper.com](https://docs.onramper.com/docs/offramp-process-flow.md)

### Inferences
- For a US-first wallet, Ramp direct is the only path with published ACH+RTP, Stellar, and a native mobile handshake; the aggregators add Banxa/MoonPay ACH but at the cost of an extra layer and (for Onramper) $599/mo.

### Gaps
- Transak ACH payout for US sell: unconfirmed by primary source.
- Instant debit-card payout and PayPal payout: none of the four documents US payout-to-card (Ramp says card payouts are "Global (excluding USA)"; Transak's US page lists Visa/Mastercard withdrawals but no timing); no provider documents PayPal payout for sell.

---

## Key question: Which support Stellar natively on the SELL side (XLM, and USDC on Stellar)?

### Takeaway
Ramp: yes for both XLM and USDC-on-Stellar, including USA users (Jul 2026 page). Transak: XLM yes, USDC-on-Stellar buy-only. Onramper/Meld/Banxa: not verifiable from fetchable pages.

### Cited Findings
- Ramp USA: "XLM (Stellar Lumens): Selling supported on Stellar network"; USDC selling includes "Stellar"; non-USA also both — [support.rampnetwork.com 432](https://support.rampnetwork.com/en/articles/432-what-cryptoassets-does-ramp-network-support)
- Transak coverage page: XLM Buy+Sell; USDC on Stellar "[Buy]" only — [transak.com/crypto-coverage](https://transak.com/crypto-coverage)
- Ramp `SEND_CRYPTO` payload has `address` but no documented memo field — [docs.rampnetwork.com native flow](https://docs.rampnetwork.com/off-ramp-native-flow/integration)
- Meld sell-flow docs contain no memo/tag guidance — [docs.meld.io sell-flow](https://docs.meld.io/docs/stablecoins/additional-information/flow/sell-flow.md)

### Inferences
- A Stellar-USDC-native wallet selling via Transak would need to sell XLM or bridge USDC to another chain first; via Ramp it can sell USDC-Stellar directly.
- Absence of a memo field in Ramp's/Meld's payloads suggests per-transaction deposit addresses; unverified.

### Gaps
- Stellar memo handling at every provider.
- Onramper/Meld Stellar sell routes (requires API key queries).

---

## Key question: Fee ranges for US sell and what the partner can earn

### Takeaway
Ramp publishes 0.99% (min $1.99) for ACH/RTP, 4.49% for card payout (non-US), with partner commission negotiated privately. Transak allows a partner fee up to 5% on top of an unpublished baseline (third party: 0.99–1.99% + spread), paid monthly in USDC/USDT with a $20 floor. Onramper charges $599/mo (Premium) for off-ramp access and lets partners add commission; Meld surfaces `partnerFee` in quotes but publishes no pricing.

### Cited Findings
- Ramp sell fees table (ACH/RTP 0.99% min $1.99; SEPA 0.99% min €1.99; SPEI 2.9%; card 4.49% min €1.99) — [support.rampnetwork.com 8957](https://support.rampnetwork.com/en/articles/8957-what-are-the-fees-for-selling-crypto)
- Ramp partner pricing: custom; "partner commission program" — [support.rampnetwork.com 31326](https://support.rampnetwork.com/en/articles/31326-what-are-the-baseline-fees-for-integration-partners)
- Transak partner fee "up to 5%", monthly payouts 4th–7th in USDC/USDT, $20 minimum — [docs.transak.com](https://docs.transak.com/guides/managing-partner-payouts-and-configuring-partner-fees.md)
- Transak sell fee (third-party, May 2026) "0.99% to 1.99%... with an additional spread" — [eco.com](https://eco.com/support/en/articles/15210579-best-stablecoin-offramps-2026-cash-out-routes-compared)
- Onramper plans $199/$599/custom; "Add your own fees" Premium+ — [onramper.com/pricing](https://onramper.com/pricing)
- Meld quote fields `totalFee`, `networkFee`, `transactionFee`, `partnerFee` — [docs.meld.io](https://docs.meld.io/docs/stablecoins/white-label-api-integration/whitelabel-quickstart)
- Network fee on the inbound send is paid by the user (Ramp) — [support.rampnetwork.com 8957](https://support.rampnetwork.com/en/articles/8957-what-are-the-fees-for-selling-crypto)

### Inferences
- Aggregator fee stack = provider fee + partner markup (+ Onramper subscription); neither aggregator publishes a per-tx take, so the user-facing all-in rate must be read from live quotes.

### Gaps
- Transak baseline sell fee and whether partner fee applies to sell; Ramp partner commission %; Meld's own fee; all unpublished.

---

## Key question: Server-to-server API (send to provider deposit address + webhooks) vs widget requiring a browser wallet?

### Takeaway
None of the four offers a fully headless partner API where your backend creates a sell order and receives a deposit address without a provider UI; end-user KYC and payout-account capture always happen in the provider widget. The closest fits for a self-custody RN wallet: Ramp's native flow (widget in your WebView emits `SEND_CRYPTO` {address, amount, assetInfo}; you broadcast and return `txHash`; webhooks are ECDSA-signed) and Meld (deposit address readable via `GET /payments/transactions/{id}` → `cryptoDetails.destinationWalletAddress`; HMAC webhooks). Onramper's Wallet Initiation flow redirects back with `providerWalletAddress`. Transak Stream gives users a persistent per-asset deposit address but is end-user-facing (Level 2 KYC) and its partner API surface is undocumented.

### Cited Findings
- Ramp: `useSendCryptoCallback`, `SEND_CRYPTO` payload `{assetInfo, amount, address}`, `SEND_CRYPTO_RESULT {txHash}`; native flow "required for mobile wallets" — [docs.rampnetwork.com native flow](https://docs.rampnetwork.com/off-ramp-native-flow/integration); [docs.rampnetwork.com/off-ramp](https://docs.rampnetwork.com/off-ramp)
- Ramp webhooks `X-Body-Signature` ECDSA/sha256, CREATED/RELEASED/EXPIRED, 4 retries @ 3 min — [docs.rampnetwork.com/webhooks](https://docs.rampnetwork.com/webhooks)
- Meld: "KYC and payment — happens in the onramp's UI"; deposit address from transaction API; webhooks `meld-signature` HMAC-SHA256 over `timestamp.url.body` — [docs.meld.io](https://docs.meld.io/docs/stablecoins/white-label-api-integration/index); [sell-flow](https://docs.meld.io/docs/stablecoins/additional-information/flow/sell-flow.md); [webhooks-authentication](https://docs.meld.io/docs/stablecoins/for-all-products/webhooks-authentication.md)
- Onramper: Wallet Initiation → redirect with `providerWalletAddress`; confirm via `POST /transactions/confirm/{type}`; webhooks `X-Onramper-Webhook-Signature` HMAC-SHA256 — [docs.onramper.com offramp-process-flow](https://docs.onramper.com/docs/offramp-process-flow.md); [webhook-implementation](https://docs.onramper.com/v1.0/docs/webhook-implementation.md)
- Transak: widget/WebView with `walletRedirection`; JWT webhooks verified with Partner Access Token; order API has no deposit-address field — [docs.transak.com webhooks](https://docs.transak.com/features/webhooks.md); [get-order-by-order-id](https://docs.transak.com/api/public/get-order-by-order-id.md); Stream "unique wallet address for each cryptocurrency and network", Level 2 KYC — [transak.com/stream](https://transak.com/stream)
- Banxa documents a "custodial (platform transfers)" off-ramp variant and a "Create Sell Order" API — [docs.banxa.com/docs/off-ramp](https://docs.banxa.com/docs/off-ramp)

### Inferences
- Banxa (direct) is the only provider whose docs describe an API-created sell order with a platform-initiated transfer; it may be the nearest to true server-to-server but its US sell details are thin and off-ramp must be enabled per account.

### Gaps
- Banxa Create Sell Order response fields (deposit address, memo) not fetched.
- Transak Stream partner-facing API: not documented anywhere reachable.

---

## Key question: Sandbox before KYB? Lead times?

### Takeaway
All four have a sandbox/staging. Transak's staging is self-serve with instant test KYC and off-ramp testable with native testnet tokens; production webhooks need KYB. Ramp's demo exists but is API-key-gated via a form and its testing page is stale/on-ramp-only. Onramper sells a 14-day free trial with `pk_test` keys but no testnet settlement. Meld sandbox requires a Meld representative and offramp is quote-only. No provider publishes a KYB lead time.

### Cited Findings
- Transak staging: instant KYC approval, test identities, off-ramp testnet reconciliation note; production webhook registration "requires KYB approval" — [docs.transak.com sandbox-credentials](https://docs.transak.com/guides/sandbox-credentials.md); [webhooks](https://docs.transak.com/features/webhooks.md)
- Ramp demo `app.demo.rampnetwork.com`, API key via form/partner@ramp.network — [docs.rampnetwork.com/testing-environment](https://docs.rampnetwork.com/testing-environment); [api-keys](https://docs.rampnetwork.com/api-keys)
- Onramper `pk_test` / `buy.onramper.dev`, "try 14 days free", no testnet tx — [docs.onramper.com testing-overview](https://docs.onramper.com/docs/testing-overview.md); [onramper.com/pricing](https://onramper.com/pricing)
- Meld sandbox via representative; offramp "quote generation only" — [docs.meld.io getting-started](https://docs.meld.io/docs/meld-api/getting-started.md); [sandbox-guide](https://docs.meld.io/docs/stablecoins/sandbox-guide/index.md)

### Inferences
- Transak is the fastest to a working end-to-end staging sell loop without talking to sales; Ramp and Meld require a human in the loop to even get keys.

### Gaps
- KYB document lists and approval lead times are unpublished for all four; must be asked in sales calls.
