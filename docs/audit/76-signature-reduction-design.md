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

> **D3 REVERSED 2026-08-24 (Niko).** The $2k/tx and $10k/day caps are
> REMOVED: "we dont want any cap. we want user to swap 100 000 per day if he
> wants." Limits are now opt-in (`AUTOPILOT_MAX_TX_USD`,
> `AUTOPILOT_MAX_DAILY_USD`; unset/0 = unlimited, the shipped default). The
> 90-day renew-on-use expiry is KEPT — it costs an active user nothing and
> limits how long a forgotten delegation stays reachable.
> What this gives up: the caps were the only VALUE bound surviving a leaked
> AUTOPILOT_API_PRIVATE_KEY, because the Turnkey policy cannot read LI.FI
> calldata and so cannot pin WHERE funds land if our route is bypassed. The
> remaining layers are the policy (what may be signed), route-side delivery
> pinning, the idle expiry, the audit trail and AUTOPILOT_DISABLED=1.
> Compensating controls recommended, not yet built: rotate the autopilot key
> on a schedule, and alert on autopilot_signatures above a threshold —
> detection in place of prevention.

Decisions locked: inline consent (D2), $2k/$10k/90d renew-on-use (D3),
autopilot-before-contract (D1).

## 9 · Payoff-slice port map (burn-evm read in full, 2026-08-20)

Server port `server/autopilot-burn.ts` = COPY of lib/cctp/burn-evm.ts with
exactly these changes, nothing else (every invariant ports verbatim —
forwarder as mintRecipient+destinationCaller, recipient ONLY in hookData,
G-address regex refusal, MAX_UINT256 hex literal never `**`, allowance
read-after-write loop, 4-attempt burn retry on allowance revert):
1. drop 'use client' + getTurnkeyWalletInfo (subOrgId comes from the
   transfer row's user via prisma, like /api/autopilot/status);
2. signEvmTxWithTurnkey(unsigned, subOrgId, addr) →
   signWithAutopilot({ subOrgId, signWith: addr, unsignedTransaction,
   purpose: 'cctp-inbound-burn' }) — FIRST verify the payload shape
   against lib/turnkey/evm-signer.ts (0x prefix handling / raw return
   assembly) and mirror it exactly;
3. caller = a server route /api/cctp/autopilot/burn (withAuth): loads the
   transfer row, VERIFIES ownership (row.userId == session user) + state
   (srcSwapTxHash set, burnTxHash null) + reads Base balance server-side,
   then burns and patches the row — the same checks the banner's client
   recover() does.
Then: outbound pivot port (same pattern over lib/cctp/pivot-swap.ts),
engine branches on /api/autopilot/status (skip client prompts; poll row),
inline consent moment, Part J. Slices remain atomic: port+route first,
engine branch second, consent UI third.

## 10 · Payoff slice SHIPPED (2026-08-20) — Stage 3 code-complete

All three payoff units landed (242 tests, full-src lint, build clean):
1. **Server ports:** `server/autopilot-burn.ts` + `server/autopilot-pivot.ts`
   (invariants verbatim; signWithAutopilot mirrors evm-signer's 0x contract).
   Shared cores extracted, not duplicated: `server/cctp-transfer-gas.ts`
   (the CAS-locked gas top-up — /api/cctp/gas-topup now calls it too) and
   `server/lifi-quote.ts` (the quote core — /api/lifi/quote now calls it).
2. **Routes:** /api/cctp/autopilot/burn + /pivot (withAuth, maxDuration 300):
   banner-recover() checks + ownership + address cross-check vs the
   TurnkeyWallet row (case-insensitive), delivery address resolved SERVER-side
   (policy can't see LI.FI calldata → the route pins it), status flip to
   BURN_SUBMITTED on the burn patch (else the cron never advances), updateMany
   guards so a racing banner tap can't clobber, receipt-wait on top-ups.
3. **Engine branches:** runInbound/runOutbound check /api/autopilot/status
   (failed check ⇒ prompts, never revocation) then hand the leg to the route;
   ANY failure falls back to the interactive path — autopilot removes
   prompts, never blocks. Consent: inline dialog before the first cctp swap
   (declined ⇒ localStorage nf:autopilot-declined:v1, never nags again);
   Settings card gained the "Turn on — one passkey" door (and clears the
   declined flag).

Signature counts now: inbound 1 (was 2–3), outbound 1 (was 2), +1 one-time
consent ceremony, +1 move for external-wallet sources (accepted).

STILL GATING GO-LIVE (unchanged from §8): user runs generate-autopilot-key +
3 env vars + autopilot_signatures.sql; verify ALLOWED_CONTRACTS vs
lib/cctp/config (Circle addr!); v2 ABI-arg hardening; doc 73 Part J live run.

## 11 · Ship-gate closure round (2026-08-20, post-env setup)

- **Allowlist verified + single-sourced:** autopilot-consent.ts now imports
  usdc + tokenMessengerV2 from lib/cctp/config (the same constants the
  burn code sends to — the live-proven addresses). LI.FI diamond verified
  against LI.FI's own deployment data (GET li.quest/v1/chains → chain 8453
  diamondAddress == 0x1231DEB6…4EaE, checked 2026-08-20). Policy mismatch
  failure mode = refused signature → interactive fallback, never a wrong
  signature.
- **D3 caps IMPLEMENTED in the signer** (one chokepoint, env-overridable:
  AUTOPILOT_MAX_TX_USD 2000 / AUTOPILOT_MAX_DAILY_USD 10000 /
  AUTOPILOT_IDLE_EXPIRY_DAYS 90): armed via amountUsd on the amount-bearing
  signature of each leg (burn / pivot; approves excluded — they move no
  funds alone). Daily sum + idle expiry read the audit table's NEW amountUsd
  column (docs/audit/sql/autopilot_signatures_amount.sql — additive, Niko
  runs). Resilience: audit INSERT falls back to the legacy shape until the
  column exists; failed sum reads 0 (per-tx cap + policy still bound every
  signature). Over-cap swap = prompt fallback, swap still completes.
  KNOWN GAP (documented): idle clock starts at FIRST USE (no grant-date
  row); exact grant-date tracking = v2.
- **REMAINING before real enablement:** v2 ABI-arg policy hardening
  (mintRecipient == own forwarder, approve spender ∈ allowlist, per-tx cap
  IN the policy) — needs Turnkey smart-contract-interface upload, built
  only after ONE live ceremony proves the v1 shape (blind-building risks
  bricking the ceremony). Then doc 73 Part J live run. NOTHING live-tested
  yet — v1 policy (chain 8453 + value==0 + 3 contracts) is the consent
  users would grant today.
