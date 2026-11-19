# 129: One signature for Stellar flows, XLM in Autoinvest, Base USDC in the wallet

- Date: 2026-11-19
- Branch: `feat/single-signature-base-usdc` (from develop 6b1edf60)
- Status: PLAN + work in progress. Nothing here is live. Each phase ends with a status note in §11.

## 0. Decisions

Made by Niko on 2026-11-19:

1. **XLM joins the Autoinvest index as a 4th coin** (BTC, ETH, SOL, XLM). Paying with XLM is not the ask.
2. **USDC on Base gets its own row under Digital dollars.**
3. **ETH on Base** (the gas our relayer leaves on the user's Base address) **is shown**, with a clear explanation of what it is and where it came from (§7.3).

Answered by Niko later the same day (§10):

4. **Split by the square root of market cap** (BTC 60.2%, ETH 24.9%, SOL 11.2%, XLM 3.7% on 2026-11-19 caps; smallest purchase about $90). It replaces plain market cap for the index.
5. **The index is called "Core 4".**
6. **The XLM slice pays Normal's 0.5% too**, like every other coin. That is one extra fee transaction, signed in the same single prompt.

## 1. Summary

Two signing techniques, both standard Stellar, with no new smart contract:

1. **Batch signing.** One passkey ceremony signs several transactions at once (Turnkey `ACTIVITY_TYPE_SIGN_RAW_PAYLOADS`, already used for Bitcoin). This fixes every flow whose steps are *independent*: savings deposit + fee, savings withdraw + commission, and XLM⇄USDC swap + fee. Each goes from 2 face scans to 1.
2. **Pre-signed permissions.** These are Soroban authorization entries. The user signs, inside that same ceremony, a one-time permission for an exact later contract call: "burn exactly 250 USDC to my own Base address, before ledger L, once". Our existing Stellar relayer submits it when the earlier step has landed. This fixes every flow whose later step *depends* on an earlier one:
   - XLM → BTC/ETH/SOL
   - Savings → BTC/ETH/SOL
   - The first-time "approve, then burn" double prompt on every Circle swap and index purchase

With both techniques, XLM can join the index and every new combined flow is one face scan. That holds even for flows that end on Stellar after the bridge (BTC → XLM, BTC → Savings), which the chat plan said would stay at 2.

**Base:**
- The server also reads the user's USDC and ETH on Base.
- USDC on Base gets its own row under Digital dollars, with Move to Stellar and Swap.
- ETH on Base gets its own row with a plain explanation.

**Change from the chat plan:** the chat plan proposed a Normal "router" contract (new code, external audit, immutable deploy). Pre-signed permissions give the same one-scan result using only Stellar's built-in authorization, so the router drops to an optional later upgrade (§4.4). Nothing in this plan needs a contract deploy or an audit.

## 2. What the code does today (verified 2026-11-19)

| Fact | Where |
|---|---|
| One passkey ceremony per Stellar transaction (`SIGN_RAW_PAYLOAD_V2`). | `packages/web/src/lib/turnkey/stellar-signer.ts:39` |
| Savings deposit signs twice (deposit, then fee). | `hooks/stellar/use-defindex-savings.tsx:375,378` |
| Savings withdraw with earnings signs twice (withdraw, then commission). A withdraw with no commission already signs once (:660). | `hooks/stellar/use-defindex-savings.tsx:629,632` |
| Soroswap swap signs twice (swap, then fee). | `hooks/stellar/use-swap.tsx:396,398` |
| The fee pair is chained by sequence number and escrowed by the server (#26), and recorded before broadcast (#27). | `lib/stellar/fee-pair.ts`, `/api/fees/execute-pair` |
| Bitcoin already signs many payloads in one ceremony. | `lib/lifi/btc-sign.ts:213` |
| Turnkey's own type docs for the batch activity: "must be set to HASH_FUNCTION_NOT_APPLICABLE for EdDSA/ed25519 signature requests". So ed25519 (Stellar) batches are supported. | `@turnkey/http` `v1SignRawPayloadsIntent` |
| A Circle burn on Stellar is `approve` then `deposit_for_burn`, two ceremonies when no allowance exists. TokenMessengerMinter pulls the USDC with `transfer_from`. | `lib/cctp/burn-stellar.ts:186-241` |
| The approval is 1e16 units for about a month, so later swaps skip it. The index page says "Later purchases skip this." | `burn-stellar.ts:37-38`, `sections/crypto-index/index.tsx:651` |
| Normal already runs a Stellar relayer key (`CCTP_RELAYER_STELLAR_SECRET`) that submits contract calls and pays their fee. It retries on `tx_bad_seq` because it is one shared account. | `lib/cctp/executor.ts:193-255` |
| The index is BTC/ETH/SOL by market cap. Its id `crypto-3` is stored on every purchase and never changes. Every slice must be at least $10 (bridge costs), so the smallest coin sets the minimum purchase. | `lib/index/basket.ts`, `lib/index/indexes.ts` |
| Index legs are `IndexLeg` rows run by Autopilot on Base, one LI.FI swap per coin. HELD legs keep their USDC on the user's own Base address. | `prisma/schema.prisma` (IndexLeg), `server/index-legs.ts` |
| The portfolio reads Bitcoin, Ethereum, Solana and Stellar, never Base. | `lib/portfolio/aggregate.ts:231` |
| Base USDC is read only by two client-side recovery copies of `readBaseUsdc`. | `sections/swap/cctp-resume-banner.tsx:97`, `sections/swap/engines/use-cctp-engine.tsx:217` |
| About 66 places in 34 files find USDC by its symbol. A second "USDC" in the asset list would be double counted or picked wrongly, so Base must be an additive field. | grep over `packages/web/src` |
| The Assets page groups rows as Digital dollars / Crypto / Savings. | `sections/assets/index.tsx:202-224` |
| Soroswap quotes only the `soroswap` protocol and supports exact-out (`strict-receive`). The embedded-fee one-transaction swap is coded but off since August (upstream build error, doc 76 §7). | `app/api/swap/quote/route.ts:13,55-95` |

## 3. Why "dependent" steps need something more than batch signing

Every Stellar contract transaction is test-run (simulated) before it is signed. Simulation fixes:
- the ledger entries the transaction may touch
- its resource limits
- its fee

The signature covers all of that.

For XLM → BTC, step 2 (burn 250 USDC) cannot be simulated until step 1 (swap XLM to USDC) has really happened, because the USDC does not exist yet. So step 2 cannot be built, and therefore cannot be signed, at the moment the user approves.

Stellar separates two things:
- **The transaction**, which needs the simulation and a sequence number.
- **The authorization**: "this account allows this exact call".

An authorization entry (`SorobanAuthorizationEntry` with address credentials) covers:
- the network
- a random nonce (so it works once)
- a last valid ledger
- the exact call: contract, function, every argument, and any inner calls that need the user's approval

It does not cover the transaction around it. So the user can sign the permission now, and anyone can later wrap it in a transaction, simulate it then, and submit it. Normal's relayer does this and pays the network fee.

What the relayer can do with it:
- Only the exact call the user approved: same amount, same recipient, at most once, before the expiry ledger.
- It cannot change an argument. Any change breaks the signature.
- If it is never submitted, it simply expires.

## 4. The design

### 4.1 Batch signing (Phase 1)

- New `signStellarHashesWithTurnkey(hashes[])`: one `SIGN_RAW_PAYLOADS` call returns one ed25519 signature per 32-byte hash. Two helpers sit on top:
  - `signStellarXdrsWithTurnkey(xdrs[])` attaches signatures to transactions.
  - `signAuthEntriesWithTurnkey(entries[])` (Phase 3) attaches them to authorization entries.
- New `signStellarTxsForMgi(xdrs[], passphrase, account)` handles every wallet type:
  - Turnkey: one batch.
  - Local Normal key: a loop, no prompts.
  - External wallet (Freighter and the others): a loop, one prompt each, exactly as today.
- Three call sites switch to it:
  - savings deposit + fee
  - savings withdraw + commission
  - Soroswap swap + fee
- The fee-pair escrow, the chained sequence numbers and record-before-broadcast stay unchanged. Only the number of prompts changes.
- Review page and money journey: the two "sign" steps become one when the wallet batches.
- Safety valve: if Turnkey rejects the batch for any reason other than the user cancelling, the code signs one by one (today's behaviour). `NEXT_PUBLIC_STELLAR_BATCH_SIGN=0` turns batching off without a deploy of new code.

### 4.2 Pre-signed permissions and the relayer (Phase 3)

**Server builds, user signs, server checks.**
- The server builds every permission from its own knowledge of the flow. The client never sends a call tree.
- The client signs the 32-byte hashes the server returns, in the same batch as the transactions.
- The server checks each ed25519 signature against the user's own Stellar address from their wallet row before it stores anything.

**New table `RelayedStep`.** Fields:
- `id`, `userId`, `network`, `flowId` (the CctpTransfer or swap id), `order`, `kind` (`approve` | `burn` | `vault_deposit` | `swap`)
- `entryXdr` (signed), `summaryJson` (contract, function, arguments, for support and audit)
- `nonce`, `expiresLedger`
- `status`, `txHash`, `errorDetail`, `attempts`, timestamps

Statuses: `AWAITING_SIGNATURE → READY → SUBMITTING → SUBMITTED → DONE`, or `FAILED` / `EXPIRED`.

Indexes:
- `(status)`, `(flowId)` and `(userId)`
- unique `(flowId, order)`

**Executor `server/relayed-steps.ts`:**
- Claims a step by compare-and-set.
- Waits until the step before it is confirmed on chain.
- Builds the transaction (relayer as source, the user's signed entry attached), simulates it, records the hash, then submits and follows it.
- Triggered by the open page (a poke after the first step lands) and by a cron sweep, the same two triggers the index legs use.

**Expiry ledgers:**
- About 5 minutes for flows that continue within seconds (outbound).
- About 1 hour for flows that wait for a bridge (inbound, Phase 6).

**On failure:**
- Nothing that already happened is undone.
- The money sits in the user's own Stellar wallet as USDC (or XLM), shown as "held" with one tap to finish. These are the same words and the same idea as held index legs.

**First user:** the Circle burn itself. The approve (only when the allowance is short, for exactly the amount, about 100 ledgers) and the burn become pre-signed permissions. Every first Circle swap and first index purchase drops from 2 prompts to 1. The month-long 1e16 approvals stop for new flows.

### 4.3 Why this is safe

- **No new key can move money.** The user's own passkey signs everything. Unlike Autopilot on Base, nothing signs for the user later.
- **Each permission is exact.** It names the contract, the function, the amount and the recipient. A changed argument fails the signature check on chain.
- **One-time and short-lived.** A random nonce and an expiry ledger make sure of that.
- **The recipient is fixed by the user.** In the burn it is the user's own Base address, inside the signed arguments. This is the same custody rule as today (`burn-stellar.ts:168`).
- **A leaked permission is harmless to the user.** Whoever submits it can only perform the user's own action, for the user.
- **A failed step leaves money in the user's own wallet**, never in a contract and never with Normal.

### 4.4 The router contract: optional, later

A router contract would make a combined flow atomic (all or nothing in one transaction). The cost:
- new Rust code
- an external audit
- an immutable deploy

Our DeFindex vault has no receiver parameter, so the router could never hold funds anyway.

Revisit only if pilot data shows "held" states are common.

## 5. Phases

Each phase ends with:
- the checks green (`yarn fm:check` over all web src, lint, tsc, jest)
- a status note in §11
- a hand-over: Niko commits

| Phase | What | Size | Needs |
|---|---|---|---|
| 0 | Spikes: Soroswap embedded fee re-probe; record the exact permission trees on mainnet (read-only simulation); prove a relayed permission on testnet | days | nothing live |
| 1 | Batch signing for savings deposit, withdraw and swap | days | Niko's passkey test on localhost |
| 2 | Base USDC row + ETH on Base row, with explanation; Move to Stellar and Swap actions | about a week | none |
| 3 | Pre-signed permissions + relayer; first-time Circle burn becomes 1 scan | about a week | migration (coworker applies), small mainnet test by Niko |
| 4 | XLM joins the index (4 coins) | about a week | decisions §10 |
| 5 | XLM → BTC/ETH/SOL; Savings → BTC/ETH/SOL/XLM; XLM → Savings | about a week | Phase 3 live |
| 6 | Bridge-then-Stellar flows (BTC/ETH/SOL → XLM or Savings) | about a week | Phase 5 live |
| 7 | Mobile app parity (same server routes; its own batch signer) | mobile agent | Phases 1 and 3 |

### Phase 0: spikes (go/no-go)

**S1, Turnkey batch ed25519.** Already supported according to Turnkey's own types (§2). The real proof is Niko's first Phase 1 test on localhost (§11).

**S2, Soroswap embedded fee.** Ask Soroswap's `/quote/build` again with `referralId`. If it builds now, a swap is one transaction with the fee inside, which is better than two transactions in one ceremony. Switching it on is an env flag the coworker sets.

Result 2026-11-19, **do not switch it on.**
- Quote and build now succeed with `feeBps` + `referralId`, but the fee is silently dropped. The amount out, every argument and the call tree are identical to the no-fee build, and the fee address appears nowhere in the transaction.
- With `SOROSWAP_EMBEDDED_FEE=1`, swaps would run without Normal's fee.
- The aggregator (`CARVQXFP4JF5ELLXUMQ6DALR346YVGBMQOHB4ENA7SSVXAYABXLBDDC4`) does have an on-chain `partner: Option<Partner { bps, id }>` argument. Its fee goes to Soroswap's treasury as attribution, so getting it to Normal is a business arrangement with Soroswap, not code.
- The aggregator is also admin-upgradable (`upgrade`), one more reason for the tree canary in §9.
- The fee pair stays, and Phase 1 makes it one ceremony.

**S3, permission trees and relay.** Two parts:
- **Mainnet, read-only:** simulate in "record" mode, as a public account that holds USDC, each call that will become a permission:
  - USDC `approve`
  - TokenMessengerMinter `deposit_for_burn`
  - DeFindex vault `deposit`
  - Soroswap swaps

  Record the exact inner calls that need the user's approval. These trees are what the server must build.
- **Testnet:**
  1. A throwaway user signs a permission for an XLM transfer by raw ed25519 over the hash, exactly as Turnkey signs.
  2. A separate relayer account wraps it, simulates and submits it.
  3. Success proves the mechanism end to end.

**Go if:**
- the trees are fixed and buildable without the user holding the money yet
- the testnet relay succeeds

### Phase 1: batch signing

Covered in §4.1.

Tests:
- unit tests for the signature attach and the fallback rules
- the existing fee-pair tests stay green

**You will see:** a savings deposit, a savings withdraw with earnings, or an XLM⇄USDC swap asks for your face once instead of twice.

### Phase 2: Base in the wallet

Covered in §7.

**You will see:** if any USDC sits on your Base address, a "Digital dollars on Base" row under Digital dollars, with Move to Stellar and Swap. If any ETH sits there, an "Ethereum on Base" row that says what it is. Both count in your total.

### Phase 3: pre-signed permissions

Covered in §4.2. Includes a Prisma migration (`RelayedStep`). Niko or the coworker applies it.

**You will see:** your first Circle swap or first index purchase asks for your face once.

### Phase 4: XLM in the index

Covered in §8.

**You will see:** Autoinvest shows 4 coins. A purchase asks for your face once, the XLM arrives in your Stellar wallet within seconds, and the other three follow as today.

### Phase 5: combined flows

| Flow | Ceremony contents |
|---|---|
| XLM → BTC/ETH/SOL | exact-out swap XLM → USDC (user transaction), then permissions for approve (if needed) + burn. Base side unchanged: Autopilot buys the coin. |
| Savings → BTC/ETH/SOL | vault withdraw + commission (user transactions), then approve/burn permissions for the guaranteed minimum out. Any few cents over stay as digital dollars. |
| XLM → Savings | swap (user transaction), then a vault deposit permission. |
| Savings → XLM | withdraw + commission (user transactions), then a swap permission. |

Fees follow the locked rule: one 0.5% on the LI.FI leg, nothing on the Soroswap leg. Savings keeps its commission.

`sections/swap/engines/types.ts:53` stops excluding XLM as a Circle source, and Swap gets "From: Savings".

**You will see:** these appear as normal pairs in Swap, each with one face scan.

### Phase 6: bridge-then-Stellar flows

- Same mechanism.
- Expiry about 1 hour.
- Amount = the least the bridge guarantees (LI.FI minimum out minus Circle's maximum fee). Any extra stays as digital dollars.

**You will see:** BTC → XLM or BTC → Savings asks once, and finishes about 15 to 20 minutes later on its own.

## 6. What does not change

- **Turnkey wallets stay passkey-only.** No Stellar delegate key, no Stellar Autopilot.
- **External Stellar wallets** (Freighter, Lobstr, Ledger, WalletConnect) keep one prompt per transaction. Cross-chain flows stay Turnkey-only, as today.
- **Fee escrow, record-before-broadcast and the cron sweepers stay.** Permissions add their own record-before-broadcast.
- **Payload changes are additive only.** The mobile app keeps working before it adopts them.

## 7. Base USDC and ETH on Base

### 7.1 Reading

- `aggregatePortfolio` adds one JSON-RPC batch to Base for users with an Ethereum address (it is the same address on Base). The batch holds:
  - `eth_call` USDC `balanceOf`
  - `eth_getBalance`
- RPC: the existing `BASE_RPC_URLS` fallback pool (`lib/chains/rpc-fallback.ts`, keyed first).
- Same 15 s response cache and 24 h stale fallback as the other chains. If Base is down, the last known value shows as stale. It is never shown as zero.
- USDC on Base: `EVM_USDC.base` (`lib/cctp/config.ts:80`).
- Base facts (chain id 8453, LI.FI id, explorer, USDC address) move into one `BASE_NETWORK` entry next to the chain registry. It is not added to `CHAINS`, because Base holds no coin of its own in our product.
- The stray `8453` in `sections/crypto-index/index.tsx:93` and `lib/push/sweeps.ts:45` read from that entry.

### 7.2 The payload

`PortfolioPayload.base?: { address, usdc: {balance, usdValue}, eth: {balance, price, usdValue}, status } | null`

It is a new optional field. `assets` is unchanged, so the 66 USDC-by-symbol readers keep seeing only Stellar USDC.

### 7.3 The rows

**Digital dollars on Base:**
- Under the Stellar Digital dollars row, in the Digital dollars group. Only shown when above zero.
- Name "Digital dollars", ticker "USDC · Base".
- Opens a sheet with what it is and two actions:
  - **Move to Stellar:** the existing Bring back flow, about 15 to 20 minutes, our relayer pays the gas.
  - **Swap:** the existing Base → LI.FI path, one scan.
- When an index purchase has HELD legs, the sheet says how much of it belongs to that purchase and offers Finish purchase first.

**Ethereum on Base:**
- In the Crypto group, under Ethereum. Only shown when above zero.
- Ticker "ETH · Base · Network fees".
- Its sheet explains it in plain words:

  > Base is the network your Autoinvest purchases and Circle swaps pass through. Each step there costs a small network fee, paid in ETH. When one of your purchases or swaps needs it, Normal sends a few cents of ETH to your own Base address so the step can finish. What is left stays at your address and pays for the next step. It is yours and it counts toward your total. You do not need to do anything with it.

- No send button in v1. The amount is cents, and sending it would cost most of it in fees.
- The facts behind the copy: the relayer tops up the user's Base address before Base legs (`server/cctp-transfer-gas.ts`, `lib/cctp/executor.ts` top-up math). Autopilot legs pay gas from that address.

**Totals:**
- The Assets total, the group totals, the allocation ring and the Home total include both rows.
- The rows always add up to the total.

### 7.4 Activity

Later: Base USDC arrivals from outside (an exchange withdrawal to the Base address) appear in activity, deduplicated against our CCTP rows by tx hash. Receiving on Base as an offered option comes only after this, so nobody can receive money they cannot see.

## 8. XLM in the index

### 8.1 How a purchase moves

1. **One ceremony signs:**
   - the XLM slice: a Soroswap swap USDC → XLM, a user transaction simulated now (the user holds the USDC now)
   - the burn of the other three slices (a user transaction when the allowance covers it, otherwise approve and burn permissions)
2. **The XLM swap lands in seconds** and the XLM is in the user's Stellar wallet.
3. **BTC/ETH/SOL run exactly as today:** Circle to Base, then Autopilot, one LI.FI swap each.
4. **The XLM leg is an `IndexLeg` row** with its Stellar swap hash, recorded before broadcast. The Base leg runner skips it. If the swap fails (price moved past the limit), the leg is HELD and its USDC stays in the user's Stellar wallet.

**Index id:** a new index id (for example `crypto-4`) for the 4-coin index. Old purchases keep `crypto-3` and still read correctly (`indexById`).

### 8.2 The split (live market caps, CoinGecko, 2026-11-19)

| Coin | Market cap | Cap weight | Square-root weight |
|---|---|---|---|
| BTC | $1,284.9B | 82.6% | 60.2% |
| ETH | $221.1B | 14.2% | 24.9% |
| SOL | $44.5B | 2.9% | 11.2% |
| XLM | $4.9B | 0.31% | 3.7% |
| Smallest purchase | | $350 (set by SOL) | $90 (set by SOL) |

- **Cap weighting is today's rule** (Niko 2026-11-10). With it, XLM is a third of a percent: about $1.10 on the smallest purchase.
- **Square-root weighting** (open since the 2026-11-16 round) gives XLM 3.7% and lowers the minimum to $90.
- This is Niko's call.

### 8.3 The minimum

- The $10 per-slice floor exists because of bridge costs. The XLM slice never touches a bridge.
- So the floor applies to BTC/ETH/SOL only.
- XLM gets its own small floor ($1) to avoid dust swaps.

### 8.4 The fee

- BTC/ETH/SOL pay 0.5% on their LI.FI swaps, as today.
- The XLM slice is a Soroswap swap. Charging it 0.5% means a fee transaction in the same ceremony (the existing fee pair). Under cap weighting that fee is about half a cent.
- Recommendation: no fee on the XLM slice while it is under 5% of the index. Niko's call.

### 8.5 The name

"Top 3" with 4 coins is wrong. XLM is not a top-4 coin by market cap, so "Top 4" is wrong too. Niko's call (options in §10).

## 9. Scale and failure modes

- **Base read:** one extra batched RPC call per uncached portfolio refresh, only for users with an Ethereum address. Cached 15 s per user.
- **Relayer throughput:**
  - Stellar accepts one pending transaction per source account at a time, so one relayer account is roughly one submission per ledger (about 5 s).
  - It is shared with the inbound mints. That is fine for the pilot.
  - Before broad launch, a small pool of channel accounts (N relayer accounts, one Redis lock each) multiplies throughput by N.
  - Measure first, then size the pool.
- **Relayer fees:** about 0.01 to 0.05 XLM per relayed step. 1,000 combined flows a day ≈ 100 XLM ≈ $14 a day at today's price. It gets a balance alert, like the Base gas float (docs 127/128).
- **Failure leaves money in the user's own wallet:**
  - **The relayer is down past the expiry:** the money stays in the user's wallet as USDC, held, and one tap finishes it.
  - **The user moves the money between steps:** the step fails cleanly and the flow is marked held.
  - **A permission tree no longer matches** (a contract upgrade by Circle, DeFindex or Soroswap): the step fails on chain, nothing moves, and the flow is held. Mitigation: a daily read-only canary that rebuilds each tree and simulates it against mainnet, alerting on change.
- **Database:** `RelayedStep` is indexed by status for the cron, by flow for the page, and by user for support. No per-row polling loops: the cron batches by status.

## 10. Decisions still needed

1. **Index split with XLM:**
   - market cap (XLM 0.31%, minimum $350)
   - square root (XLM 3.7%, minimum $90)
   - something else
2. **Index name for 4 coins:** for example "Core 4", "Crypto 4" or "Big 3 + Stellar".
3. **XLM slice fee:** none while under 5% (recommended), or 0.5% via a fee transaction in the same ceremony.

## 11. Status log

(Updated at the end of each phase.)

- 2026-11-19: plan written, branch created.
- 2026-11-19, **Phase 0 done: GO.**
  - **S3 on testnet:** a real Circle burn, end to end (`scripts/permission-spike/relay-burn.mjs`).
    - The testnet spike account signed two permissions (approve 1 USDC, `deposit_for_burn` 1 USDC to its own Base Sepolia address) in one pass, by raw ed25519 over the hashes, the way Turnkey signs.
    - Each signature was checked against the account key.
    - A separate, fresh relayer account wrapped, simulated, paid for and submitted both:
      - approve `975182da037b03267553ce5a920faea1e8d2a5ed128b26c963c4cc3c0a47be95`
      - burn `0a346247e8fa6d733fe2fda2bb3fbe7d56b58b5fd5b7ee1d432513f64b60ac7b`
    - Both succeeded. Resource fees were 15,484 and 24,044 stroops (about 0.002 XLM each).
    - Record mode on the deployed contracts gave exactly the trees we built: root only, no inner calls need the user.
    - The SDK keeps a signed permission when it assembles (`existingAuth.length > 0`, stellar-sdk 14.4.3).
    - Circle's sandbox Iris found the relayed burn by its hash.
  - **S3 on mainnet:**
    - Circle's mainnet TokenMessengerMinter runs different code from testnet (wasm `a6c1acc6...` vs `a04c09f4...`).
    - Real successful mainnet `deposit_for_burn` transactions carry the same root-only tree (read from their envelopes, read-only).
    - The token `approve` is Stellar's built-in asset contract, identical on both networks.
  - **S2:** see above. Do not enable the embedded fee.
  - **S1:** Turnkey's own types document ed25519 support for `SIGN_RAW_PAYLOADS`. The live proof is Niko's first Phase 1 test.
  - **Side finding:** `scripts/cctp-spike/state.json` (testnet-only keys) is committed even though `.gitignore` lists it. Testnet only, so no money at risk, but it is a secret in git.
- 2026-11-19, **Phase 1 code done** (live test pending, Niko).
  - `lib/turnkey/stellar-signer.ts`: `signStellarHashesWithTurnkey` and `signStellarXdrsWithTurnkey`, one `SIGN_RAW_PAYLOADS` ceremony.
  - `lib/turnkey/stellar-signatures.ts`: every signature is verified against the wallet key before use.
  - `lib/stellar/batch-sign.ts`: `signStellarTxsInOrder` and `batchesStellar`.
    - Order of precedence: a local key unlocked in memory (no prompt), then the Turnkey batch, then one by one.
    - A passkey refusal stops. A Turnkey error falls back to one by one.
  - Wired into savings deposit, savings withdraw with commission, and the Soroswap fee pair.
  - Review pages show one "Approve the X and the fee · One signature" step when batched (`lib/flow/plans.ts`, `batched` param).
  - Kill switch `NEXT_PUBLIC_STELLAR_BATCH_SIGN=0` (declared in `turbo.jsonc`).
  - Checks: jest 1,351/1,351, tsc clean, prettier clean, eslint clean on touched files (one existing warning at `use-soroswap-engine.tsx:559`, untouched).
- 2026-11-19, **Phase 2a done: Base in the wallet (read + rows + page).**
  - **Server** (`lib/portfolio/aggregate.ts`): one JSON-RPC batch per uncached refresh (`eth_call` USDC `balanceOf` + `eth_getBalance`) through the keyed-first `BASE_RPC_URLS` pool (`BASE_SEPOLIA_RPC_URLS` on testnet). Checked live: mainnet.base.org and publicnode both answer batches.
  - **Payload:** new optional `base: { address, assets: [USDC, ETH] }` with `chain: 'base'` and Base decimals (USDC 6, ETH 18). `assets` is unchanged.
  - **Failures:** stale fallback under `base:` snapshot keys, same address only, and the same rule in the client cache (`fillErroredFromKnown`). A failed Base read never shows a zero.
  - **Rows:**
    - Home and Assets: "Digital dollars · USDC · Base" directly under Digital dollars, and "Ethereum · ETH · Base · Network fees" directly under Ethereum (`placeBaseRows`).
    - Only shown above zero.
    - Counted in the total, the group totals and the ring (the ring merges by coin).
    - Base rows link to the new `/app/assets/base` page ("On Base"), which gives the balances, the plain explanation of both (§7.3) and the address with a BaseScan link.
    - The Base USDC icon carries no Stellar badge. The words name Base. An official Base badge waits for their brand kit.
  - **Screenshots** (desktop + phone, preview harness on a temporary dev server :8093): rows in place, totals add up, no overflow.
  - **Checks:** jest 1,363/1,363 (12 new in `lib/portfolio/base-rows.test.ts`), tsc, prettier, eslint (two existing warnings in `use-wallet-balances.ts:118`, untouched).
  - **Deferred:** folding the stray `8453`s into one Base entry (§7.1). It is cleanup, no behaviour change.
- 2026-11-19, **Phase 2b done: "Move to Stellar"** on the On Base page (live test pending, Niko).
  - The same money movement as a swap's Bring back, so `lib/cctp/refund.ts` now runs one shared set of steps for both:
    1. read the Base balance
    2. write the row before anything moves
    3. gas top-up
    4. Autopilot burn first, with the double-burn guard, otherwise the passkey burn
  - `runCctpRefund` behaves exactly as before. `runBaseBringHome` is new.
  - **Server** (`api/cctp/transfers`, `bringHome: true`, rules in `server/base-usdc.ts`):
    - Like a refund, it skips the $10 minimum, the cap and the 2FA code, because it brings money back.
    - Pinned instead:
      - Both addresses must match the wallet row (Turnkey EVM to Turnkey Stellar).
      - USDC only, Base to Stellar only.
      - At least $1.
      - At most what Base holds right now (read on the server).
      - One at a time: refused while a move's burn is in flight or one started in the last 2 minutes.
    - The gas top-up was already pinned to the owner's address (`server/cctp-transfer-gas.ts`). Autopilot's recipient was already pinned to an owned wallet (`server/autopilot-inbound.ts`).
  - **Page:** a "Move to Stellar" button under Digital dollars on Base (hidden under $1, with the reason given). It opens the app's review page and money journey (`cctpRefundPlan` with `kind: 'move'`: "Approve the move", "In your Stellar wallet"). The page is wrapped in `FlowHost` like Savings and Swap.
  - **Screenshots:** review on desktop and phone. Pressing confirm against mocks stops at step 1 with "Move stopped", and the money is shown still on Base.
  - **Checks:** jest 1,371/1,371 (8 new), tsc, prettier, eslint.
  - **Not done** (follow-ups):
    - "Swap from Base" directly. Today: Move to Stellar, then swap.
    - Base arrivals in Activity (§7.4).
- 2026-11-19, **Phase 3 code done: the Circle burn as pre-signed permissions.** Behind `NEXT_PUBLIC_STELLAR_PERMISSIONS=1`, default OFF.
  - **Core:**
    - `lib/stellar/permissions.ts` (build, hash, attach + verify, read back). Byte-identical to the Stellar SDK's reference `authorizeEntry` (tested).
    - `lib/cctp/stellar-burn-calls.ts`: the one builder for `approve` and `deposit_for_burn` arguments and the allowance read, shared by the passkey path and the permission path.
  - **Server** (`server/relayed-steps.ts`):
    - Builds the permissions from the transfer row and wallet row. Custody pins: the Stellar account and the Base mint recipient are the person's own, from the wallet row.
    - Approves only when the allowance is short, then for the exact amount for about 20 minutes.
    - Signatures expire after about 10 minutes, and every signature is verified before READY.
    - Steps claimed by compare-and-set, hash recorded before broadcast, the relayed transaction must keep the signed permission unchanged, and `tx_bad_seq` / `TRY_AGAIN_LATER` are rebuilt.
    - The transfer gets `burnTxHash` + `BURN_SUBMITTED` only once the burn LANDED, so a never-landed burn can be resent with the same permission without stranding a hash.
    - Expired or refused steps say nothing moved.
  - **Routes:** `api/stellar/permissions/{prepare,commit,advance}`. The `cctp-advance` cron also runs `advanceRelayedSteps`.
  - **Data:** new `RelayedStep` model and the additive SQL in `prisma/migrations-manual/2026-11-19_relayed_steps.sql`. Apply on staging, then production, BEFORE turning the switch on.
  - **Client:** `burnUsdcOnStellar({ transferId })`. Both callers (Circle swap engine, Autoinvest) pass it. With the switch on and a Turnkey wallet: prepare, ONE passkey prompt for every hash, commit, follow until the burn lands. Everything else runs as before.
  - **Proof:** `src/server/relayed-steps.testnet.test.ts` (opt-in, `RUN_TESTNET_E2E=1`) ran the real module end to end on Stellar testnet with a real 1 USDC Circle burn, an in-memory DB stand-in and a fresh relayer, in 12 s:
    - approve `2a6ed37b18d3c8ec821fa8c8b1b866dbcce2cca7e61c30bd4354c75ac6dcf1c2`
    - burn `ce27be2c471279f191edb5c7cc860e089c4363cc0c57c06846d0a623e6cc8884`
    - transfer row: `BURN_SUBMITTED` with that hash
  - **Checks:** jest 1,394 passed + 1 opt-in skipped, tsc, prettier, eslint. One existing warning, `use-cctp-engine.tsx:1152`, untouched.
  - **Before switching it on:**
    1. Apply the SQL.
    2. Set the switch on staging.
    3. Niko runs one small mainnet Circle swap from an account without a standing allowance and should see ONE prompt.
    4. Watch the relayer's XLM: each relayed step costs about 0.002 to 0.004 XLM.
  - **Cosmetic follow-up:** the review page still lists "approve" as its own step for first-timers. With permissions it is covered by the same prompt.
- 2026-11-19, **Phase 4 code done: Core 4** (Niko: square-root split, name "Core 4", 0.5% on the XLM slice too).
  - **Basket:**
    - `CORE_INDEX` (`core-4`: BTC, ETH, SOL, XLM, `sqrt-market-cap`). The old `crypto-3` stays market-cap so its purchases read as they were.
    - The $10 bridge floor applies to bridged coins only; Stellar coins have a $1 floor. Live 2026-11-19 caps give 60.15 / 24.95 / 11.19 / 3.71% and a $90 minimum (tested).
    - `bridgedWire` and `stellarSliceAmounts` (0.5% fee out of the slice).
  - **Registry:** `INDEXES = [CORE_4]`. Old purchases still resolve to Top 3, and `/app/autoinvest/top-3` opens Core 4. The chart math follows the split: a square-root index moves as today's split, held.
  - **Server:**
    - The purchase row carries the bridged amount (what Circle moves). Its quote carries `totalWire` and the XLM leg's exact `feeWire` / `swapWire`.
    - The XLM leg is an `IndexLeg` row:
      - The fee-pair funnel (`api/fees/execute-pair`, new optional `indexLeg`) claims and stamps it with the swap hash BEFORE broadcast, and refuses a swap that is not exactly that share and fee.
      - It is settled with the swap (SENT, or HELD with "its share stays as digital dollars in your Stellar wallet").
      - `reconcileStellarLegs` settles unclear ones from Horizon and holds a never-sent one after 30 minutes. Nothing moved in that case.
      - The Base runner skips Stellar legs, and "Try again" is not offered for them in v1.
    - Purchase views show the total paid (`purchaseTotalWire`).
  - **Page:**
    - Permission path (Phase 3 switch on, Turnkey): the XLM swap + fee are built first and signed in the SAME prompt as the burn permissions, and sent once the burn has landed.
    - Otherwise: built after the burn so sequence numbers follow, then one more prompt.
    - The journey has "Buy Stellar" right after "Hand it to Circle", Circle carries only the bridged amount, and the wallets place shows four coins (2×2).
    - Copy is derived from the index's coins. The fee row says Normal 0.5% on each coin, plus each exchange's own fee.
    - The homepage demo shows Core 4.
  - **Screenshots** (preview harness through Niko's running 8082, every `/api` mocked): page, $500 split, review. The review shows Circle taking 478.5 USDC and "Buy Stellar" 21.5 USDC.
  - **Checks:** jest 1,404 passed + 1 opt-in skipped, tsc, prettier, eslint.
  - **Not live-tested.** The first real purchase should be a small one on mainnet with Autopilot on.
  - **Rollout rule for other clients:** `POST /api/index/purchases` creates Core 4 only when the body says `index: 'core-4'`, which the web page sends. Any other client (an older mobile build that does not know the Stellar leg) keeps getting Top 3 exactly as before. The mobile app needs to:
    1. Send `index: 'core-4'`.
    2. Burn the response's `purchase.amountWire` (the bridged part), not the total.
    3. Run `stellarLegs` like `lib/index/stellar-leg.ts`.
- 2026-11-19, **Phases 0 to 4 committed and pushed** (`b0b01d15` on `feat/single-signature-base-usdc`). The `relayed_steps` SQL was run by Niko.
- 2026-11-19, **Phase 5a code done: XLM → BTC/ETH/SOL with one face scan** (behind `NEXT_PUBLIC_STELLAR_PERMISSIONS`, like Phase 3).
  - **Server** (`server/relayed-steps.ts`): the commit step takes the person's own first transaction (`firstTx`).
    - `firstTxRefusal`: it must come from the transfer's own wallet, be signed by it, be one Soroban call, and belong to a transfer whose source is XLM.
    - Its hash goes on the transfer (`srcSwapTxHash`) BEFORE broadcast, then it is sent.
    - The relay gate sends no Circle step until it has landed. If it fails or never lands (10 minutes), every step fails cleanly and nothing else moves.
  - **Proven on testnet:** the real module ran a real Soroban transaction as the first transaction, confirmed it, then relayed approve `369affb1…` and burn `36970caa…`.
  - **Client:**
    - `burnUsdcOnStellar({ first })` signs the swap in the same prompt as the permissions (permission path only, otherwise a clear error).
    - The engine quotes XLM → the USDC it is guaranteed to buy (Soroswap minimum out), then LI.FI for that USDC. At signing it builds the swap as "exactly that USDC" (strict-receive).
    - `canPair` offers XLM → BTC/ETH/SOL only with the switch on.
    - The plan has "Approve the swap", then "Swap your XLM to USDC", then Circle.
    - No Normal fee on the Soroswap leg (locked rule).
  - **Checks:** jest 1,411 passed + 2 opt-in skipped, tsc, prettier, eslint.
  - **NOT yet seen on screen.** A temporary second dev server on :8093 shared `packages/web/.next` with Niko's running :8082 server and broke both (React "Missing ActionQueueContext", hydration errors). Lesson: never run a second `next dev` in `packages/web` while another one runs.
  - **Ops note:** `prisma generate` could not replace the query engine binary while Niko's dev server on 8082 held it. The client types and JS did regenerate, and the engine binary is unchanged. Run `yarn db:generate` once with the dev server stopped. About 17 old `.tmp` engine copies from earlier attempts sit in `node_modules/.prisma/client`. They are harmless and can be deleted.

## 12. In plain words

- **A signature** is your face or fingerprint saying "yes" to a sealed instruction. Turnkey seals it with your key.
- **Why two scans today:** Stellar allows one contract call per transaction. A savings deposit is two things (the deposit and our fee), so it is two transactions. Our signer seals one transaction per scan.
- **Fix 1, batch signing:** seal both with one scan, like stamping two letters with one press.
- **Why fix 1 cannot do XLM → BTC:** every transaction is test-run before it is sealed. "Bridge 250 USDC" cannot be test-run before the swap has produced those 250 USDC.
- **Fix 2, a signed permission slip:** instead of sealing the bridge transaction, you sign a slip that says "Normal may bridge exactly 250 USDC from my wallet to my own Base address, once, in the next five minutes".
  - Our relayer waits for the swap, then wraps your slip in a transaction, test-runs it and sends it.
  - The slip cannot be changed: any change breaks your signature.
  - It works once and then expires.
- **Why that is safe:** the slip only does what you already said, for you. If something goes wrong in between, your money waits in your own wallet as digital dollars, and one tap finishes the job.
- **Base:** your Ethereum address is also your Base address. Autoinvest and Circle swaps pass through Base, so sometimes USDC (and a few cents of ETH for fees) sits there. The wallet never asked Base before, so that money was invisible. Now it asks and shows it, and you can move it home or swap it.

## 13. Sources

- [Stellar: authorization (auth entries, address credentials, nonces)](https://developers.stellar.org/docs/learn/fundamentals/contract-development/authorization)
- [Stellar RPC simulateTransaction (auth modes)](https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/simulateTransaction)
- [Turnkey policy language](https://docs.turnkey.com/concepts/policies/language)
- [DeFindex vault source](https://github.com/paltalabs/defindex/blob/main/apps/contracts/vault/src/lib.rs)
- Doc 76 (signature reduction, August), docs 127/128 (gas float), `reference_cctp_stellar` memory.
