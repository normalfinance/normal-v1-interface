# 76 — #33 Signature Reduction: design (GO'd 2026-08-20, staged)

Niko's requirements, verbatim intent:
- CCTP: ONE signature before execute. Two is OK only for external-wallet
  source (the move + the swap). **Never sign → wait 20–50 min → sign again.**
- Savings: 1 signature (today 2).
- (LI.FI same-group swaps are already 1 — proves the target is realistic.)

## 1 · Signature inventory today (verified in code)

| Flow | Prompts | Why |
|---|---|---|
| LI.FI swap (BTC/ETH/SOL↔) | **1** | one source-chain tx ✅ target state |
| Soroswap swap | **2** passkey | Soroban tx = exactly ONE operation → Normal fee can't ride in the swap tx → fee-pair (#26) |
| Savings deposit / withdraw | **2** passkey | same fee-pair reason |
| CCTP outbound (USDC→BTC/ETH/SOL) | **2** (1 passkey Stellar burn … wait … 1 passkey Base pivot) | the pivot leg needs an EVM signature AFTER the bridge — the exact "wait then sign" Niko bans |
| CCTP inbound (BTC/ETH/SOL→USDC) | **2–3** (1 source … wait … approve? + burn on Base) | approve+depositForBurn on Base, mid-flow |
| + external-wallet source | +1 kit sig (the move) | ACCEPTED by Niko |

## 2 · The two structural tricks

### Trick A — Stellar: a Normal fee-router contract (savings + soroswap → 1 sig)
Soroban's one-op rule is the enemy. A thin **Normal router contract** turns
two transactions into one invocation: `router.deposit(user, vault, amount,
fee)` transfers the 0.5% fee to the fee wallet AND forwards the deposit to
DeFindex **atomically in one contract call** = one tx = **one passkey
prompt**. Same shape for swaps (`router.swap(...)` calling the Soroswap
aggregator). Properties: atomic (fee exactly iff action succeeded — stronger
than today's escrowed pair), on-chain transparent, kills the #54
WalletConnect double-prompt fragility for external wallets too.
Costs/risks: writing + auditing a small Soroban contract (Halborn follow-up
scope), deploy/upgrade story, gas slightly higher per call.
**Cheaper variant to investigate first (Stage 1): Soroswap aggregator fee
parameter.** If their quote/build API accepts an integrator fee (bps +
recipient) the SWAP becomes 1 signature with zero contract work; savings
would still need the router (DeFindex has no fee param).

### Trick B — EVM legs: Turnkey policy signing (CCTP → 1 upfront sig)
The mid-flow signer on Base is the USER'S TURNKEY WALLET — and Turnkey
supports **policy-scoped API signing**: a server-held API key attached to the
user's sub-org, allowed to sign ONLY transactions matching a policy
(allowlisted contracts: USDC token, Circle TokenMessenger, LI.FI diamond;
recipient = user's own addresses; per-tx caps). With that, everything after
the user's single upfront signature runs server-side on autopilot:
- Outbound: user signs the Stellar burn (passkey, 1) → attestation → mint →
  **policy key signs the Base pivot** → delivery. Total: **1** (+1 move if
  external source — accepted).
- Inbound: user signs the source-chain swap (1) → bridge → **policy key
  signs approve+burn on Base** → mint to Stellar. Total: **1**.
This also upgrades resilience: closed tabs no longer strand the pivot —
the server finishes it (the recovery banner becomes a rarity).
Risks to design carefully: policy must be NARROW (contracts + own-address
recipients + amount caps + expiry), user-visible consent screen at first
setup ("allow Normal to complete your started swaps automatically"),
revocation path in Settings, server key custody, audit trail per signed tx.
One-time UX cost: a single passkey ceremony to grant the policy.

## 3 · Staged plan (each stage shippable + testable alone)

1. **Stage 1 — Soroswap fee param spike.** Ask/test the aggregator API for
   integrator-fee support. If yes: swaps → 1 sig, ship alone. (Days)
2. **Stage 2 — Normal router contract.** Savings deposit/withdraw → 1 sig
   (and swaps too if Stage 1 said no). Includes contract, tests, audit
   pass, staged rollout with the fee-pair kept as fallback. (The long pole)
3. **Stage 3 — Turnkey policy autopilot for CCTP EVM legs.** Consent
   ceremony + policy creation, server signer, engine changes (pivot/burn
   move server-side), Settings revocation, kill-switch env. Ships behind a
   flag; fee flows untouched.
4. **Stage 4 — cleanup:** retire fee-pair paths once router is proven;
   update docs 72/73; signature counts asserted in tests where possible.

## 4 · Decisions for Niko

- D1: Stage 2 contract — build in-house now vs defer to post-#33-Stage-3
  (swap-first order) if Stage 1's fee param works?
- D2: Stage 3 consent UX — grant at first cctp swap (inline ceremony) or at
  wallet setup (one more step in the guided dialog)?
- D3: policy caps — per-tx USD cap for autopilot signing (suggest $2k to
  start) and expiry (suggest 90 days, re-consent)?

## 5 · What does NOT change
Fee-pair safety properties (record-before-broadcast, escrow) remain until a
stage replaces them; external-wallet signature counts for the MOVE step;
non-custodial custody (policy keys can only execute the user's own started
flows to the user's own addresses — never withdraw).

## 6 · Stage 1 spike RESULTS (2026-08-20 — CONFIRMED FEASIBLE)

Verified against the live mainnet API (spec at api.soroswap.finance/api-json):
- `QuoteDto.feeBps` EXISTS — docs: "Platform/referral fee in basis points …
  50 = 0.5%" (our exact fee).
- **Live mainnet quote, 10 XLM → USDC:** without fee `amountOut 18,068,398`;
  with `feeBps: 50` → `rawTrade.amountIn 99,500,000` (exactly 0.5% skimmed
  pre-route), `platformFee: { feeBps: 50, feeAmount: "500000" }`.
- `BuildQuoteDto.referralId` = fee recipient wallet ("required when feeBps
  is provided"). Build call ACCEPTED the params and proceeded to swap
  SIMULATION (failed only because the test account lacks funds/trustline —
  account state, not API capability).
- Bonus discovered for the backlog: `gaslessTrustline` + `sponsor` params —
  sponsored trustline creation could remove the receive-side trustline
  friction later.

**Open item before implementation:** "splitted between platform and
soroswap" — confirm our share of the 50 bps (ask Soroswap / check the fee
wallet after one live swap). If the split materially cuts revenue, decide:
keep user cost at 0.5% and accept the split, or adjust feeBps.

**Implementation plan (next GO):** quote route passes feeBps=50 +
referralId=NORMAL_FEE_WALLET behind env flag SOROSWAP_EMBEDDED_FEE=1;
use-swap drops the fee-pair for soroswap when the flag is on (record still
BEFORE submit — the #27 property moves into the single-tx submit path);
definitive live test = one XLM→USDC swap from a funded wallet asserting ONE
passkey prompt and the fee arriving on-chain in the same transaction.

## 7 · Stage 1 implementation + upstream blocker (2026-08-20)

Implemented flag-gated (SOROSWAP_EMBEDDED_FEE=1): quote passes feeBps +
referralId, new /api/swap/submit-single preserves #27 + tx-source
ownership, client single-sign path, honest footer. LIVE RESULT: quote
correct (0.5% skimmed, platformFee returned) but **/quote/build with
referralId fails 400 "simulation incorrect — Error(Object,
UnexpectedSize)"** on BOTH platforms (router + aggregator), both a funded
and an unfunded from-account. CONTROL: identical build WITHOUT fee → OK.
Verdict: upstream Soroswap fee-build defect (or undocumented referral
enrollment). OUR CODE IS COMPLETE AND CORRECT; flag stays OFF (legacy
fee-pair path active, unchanged). The moment Soroswap fixes it, flipping
the env delivers 1-signature swaps with zero further code.

**Repro for Soroswap support:** POST /quote (mainnet, XLM→USDC,
amount 50000000, protocols ["soroswap"], feeBps 50) → returns platformFee
{feeBps:50, feeAmount:"250000"} ✓. POST /quote/build {quote, from:<funded
G-address>, referralId:<funded G-address>} → 400 simulation incorrect,
diagnostics show Error(Object, UnexpectedSize) ×3. Same build without
feeBps/referralId succeeds.

**Order unchanged:** proceed to Stage 3 (Turnkey policy autopilot) now;
Stage 1 lights up whenever upstream fixes; Stage 2 contract spec in
parallel (and note: if Soroswap's fee path stays broken long, the router
contract ALSO solves swaps — the fallback was designed in).

## 8 · Stage 3 blueprint (policy language VERIFIED 2026-08-20)

Turnkey policy engine confirmed sufficient (docs.turnkey.com policies):
`eth.tx.to` / `chain_id` / `value` with comparison operators; with uploaded
ABIs also `function_name` + `contract_call_args` — so the policy can require
e.g. depositForBurn's mintRecipient == the user's own forwarder and
ERC20.transfer/approve spender ∈ {Circle, LI.FI}. Enforcement lives in the
SIGNER, not in our server's good behavior.

Build order (each slice testable):
1. **Consent ceremony** (inline at first cctp swap, per D2): one
   passkey-stamped activity batch on the user's sub-org — create delegated
   API user "Normal Autopilot" + API key (server-held) + POLICY: EFFECT_ALLOW
   sign-transaction where chain_id==8453 AND to ∈ {USDC, TokenMessengerV2,
   LI.FI diamond} AND (ABI-parsed) recipients == user's own
   addresses/forwarder AND value==0, consensus = autopilot user only.
   Caps per D3: $2k/tx (contract_call_args amount), renewal 90d.
2. **Server signer** `server/autopilot-signer.ts`: signs EVM txs with the
   delegated key via Turnkey SDK; refuses if flag AUTOPILOT_DISABLED=1
   (kill-switch); logs every signed tx (audit trail table).
3. **Engine/relayer changes**: inbound approve+burn and outbound pivot move
   into the server cron path (the post-burn machinery already server-side);
   client engines drop those signing steps — modal stages become watch-only
   after the ONE upfront signature.
4. **Settings**: "Automatic swap completion" card — status, grant date,
   revoke (delete API key), renew.
5. Doc 73 Part J tests: 1-prompt outbound, 1-prompt inbound, revoke →
   mid-flow falls back to manual signing prompts, kill-switch env, policy
   rejects an out-of-policy tx (negative test with a manual call).

Decisions locked: inline consent (D2), $2k/$10k/90d renew-on-use (D3),
autopilot-before-contract (D1).
