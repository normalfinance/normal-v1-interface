# 95 — Swap-leg static sweep: findings + fix waves

**Date:** 2026-08-27 · **Branch:** `feat/swap-matrix-hardening` · **Method:** doc 93 Phase 2 — four parallel review agents (CCTP legs · LI.FI direct · Soroswap/fee-pair · funding-move/wallet-setup), each hunting the ten bug classes from real incidents. **82 findings**, every one at file:line. Status: **awaiting GO per wave.**

Already-shipped fixes (0a/0b run 1, honest-errors waves 1–4) are excluded. Severity = money-critical (funds lost/stranded/mis-sent) › money › UX.

---

## The through-line: the browser tab is load-bearing for money

The single most important pattern across the CCTP + LI.FI findings: **after the user signs, completion depends on the tab staying open.** No server actor finishes the job.
- CCTP outbound: nothing server-side runs the pivot after the mint (only this tab or the banner) — close the tab and USDC sits on Base while the row reads COMPLETED.
- CCTP inbound: once the source-swap hash is recorded, no cron burns — tab closed = USDC parked on Base, row "pending" forever.
- LI.FI direct: unmounting the swap card mid-confirm kills the tracker before the activity row is ever written — funds left, no record.
- The cron that *should* cover these has a never-called re-attestation path, a starvable queue, and mint-states with no exit.

This is the same class as the ramp "state machine with no exit" and the dead staging crons — and it is the reason your coworker's closed-tab swaps looked lost. **Wave 1 is this.**

---

## Wave 1 — Server finishes the job (money-critical: stranding)
The tab must never be required after signing.
- `lib/cctp/state.ts:216` — cron queue has no retryCount ceiling/skip: 50 wedged rows starve every newer transfer. Add ordering + skip.
- `lib/cctp/state.ts:90,124,98` — mint states with no exit: hash-write gap pins MINT_SUBMITTED forever; a reverted mint never re-submits; "already minted" detected by fragile substring. Give each a terminal/retry path.
- `lib/cctp/iris.ts:62` — `reattest` has zero call sites though the cron claims it: attestations expire ~24h, a weekend-stalled row can never mint. Wire it in.
- `use-cctp-engine.tsx:931,703` + cron — **no server-side pivot/burn driver**: cctp-advance must run the outbound pivot and inbound burn (autopilot) so a closed tab still completes; STALE sweep must stop skipping srcSwapTxHash rows.
- `lib/cctp/refund.ts:68` — refund's gas-topup result discarded + blind 6s sleep + stale balance + un-retried patch: mirror the engine's verified-topup + 3-attempt patcher (partly done in 0b; finish it).

## Wave 2 — Never sign what we didn't verify (money-critical: blind signing)

> **STATUS: SHIPPED 2026-08-27, run 2** — explainer `97-explainer-verify-before-sign.html`;
> 6 new tests (`lib/cctp/iris-message.test.ts`). Correction to the sweep's wording: the
> `submit-single` route was NOT an open relay — it does require auth (`withAuth`). What it
> lacked were the ownership check, rate limit, fee verification and config-aware Horizon that
> `execute-pair` has; all four are now in place.
> Key de-risking step: the fee-in-XDR check was verified against the LIVE Soroswap build API
> before shipping (the referral address is embedded as its raw 32-byte key), so it enforces
> from day one instead of running log-only.
> **Same-day regression + fix:** the PSBT check initially demanded "exactly one payment output"
> and refused every real BTC swap (live). Decoding an actual LI.FI PSBT showed five outputs
> (deposit, OP_RETURN, our change, route protocol fee, our own integrator-fee wallet). Replaced
> with a structure-agnostic overspend bound in `lib/lifi/btc-spend-verdict.ts`, pinned by 7 tests
> built from the real transaction's numbers. Lesson recorded: verify provider data shapes
> empirically BEFORE constraining them — the Soroswap fee check was verified first and shipped
> clean; the PSBT shape was assumed and broke a live flow.
- `app/api/swap/submit-single/route.ts:24,42,15` — **open relay**: no rate limit, no `userOwnsWallet`, no fee-embed check, hardcoded Horizon; broadcasts arbitrary signed XDR + writes swap_logs. Add the guards `execute-pair` already has (or retire the route).
- `app/api/swap/quote/route.ts:228` + `use-swap.tsx` — Soroswap `built.xdr` signed with zero verification (ops/assets/amount/destination). Cross-check the built tx against the quote before returning it.
- `lib/lifi/btc-sign.ts:115,121,119` — PSBT signed without checking outputs/amounts/change/fee against the quote; `sighashType` ignored (always SIGHASH_ALL); non-witness inputs silently skipped. Validate the PSBT shape; honor declared sighash; refuse unknown input types.
- `lib/cctp/iris.ts:51` — Iris `messages[0]` trusted blind (no domain/amount/recipient match) → wrong-message mint. Match against the row.
- `app/api/cctp/transfers/route.ts:58` — `refund:true` from the body skips the min + cap; cap parse `NaN`-fails open. Validate refund server-side; harden the cap parse.

## Wave 3 — Broadcast races (money: double-spend / stranded / bad-seq)

> **STATUS: SHIPPED 2026-08-27, run 4** — explainer `99-explainer-broadcast-races.html`;
> 7 new tests (`lib/cctp/amounts.test.ts`) built from the LIVE incident numbers.
> The whole-balance bug was caught in production data, not just in review: two BTC swaps
> 30 min apart, row B's burn took row A's 15.59 USDC, row C's took 32.40 (~2 transfers),
> and row A (`cmtakn7t00`) is permanently stuck in CREATED with nothing left to burn. No
> funds lost — same user, same destination — but one transfer can never complete and the
> feed misreports amounts. Fixed by one shared rule (`lib/cctp/amounts.ts`):
> `take = min(available, quoted + 5% slippage headroom)`, which ALSO fixes the opposite
> client-side bug (clamping to the quoted minimum stranded positive slippage on Base).
> Also landed: hash persisted on broadcast (a receipt-wait failure used to discard a real
> burn and trigger a second one); nonce rebuild ported to BOTH server signers and the
> LI.FI ETH leg; BTC broadcast made idempotent by txid; funding guard no longer wiped by
> unrelated engines and now verifies baseline+delta; Stellar relayer retries a sequence
> collision.
> **Not yet done in this wave:** the setup-dialog's second funding path
> (`normal-wallet-setup.ts:48` — balance-based readiness) still needs unifying with the
> engine's guard; tracked into Wave 4.
- `server/autopilot-burn.ts:96` + `autopilot-pivot.ts:78` — server signers lack the nonce-rebuild the client twins have (my own gap). Port it.
- `server/autopilot-burn.ts:119` + `burn/route.ts` — receipt-wait throws after a successful broadcast → hash discarded → 502 → engine does a SECOND burn. Persist the hash before the receipt wait.
- `autopilot/pivot/route.ts:139` / `burn/route.ts` — balance read then whole-balance pivot minutes later sweeps a *second* transfer's minted USDC into this row. Scope to the row's amount, not the address balance.
- `lib/cctp/executor.ts:178` — relayer mint: client GET poke + 2-min cron double-submit from one keypair → tx_bad_seq. Serialize/lock the relayer.
- `swap-card.tsx:389,486,489,1159` + `normal-wallet-setup.ts:48` + `use-cctp-engine.tsx:1103` — **double-funding cluster**: one in-memory guard shared across engines and cleared by any unrelated swap; two funding paths (engine + setup dialog) with one guard; balance-based verification instead of baseline+delta; no in-flight ref on execute. This is the 2026-08-22 incident's remaining surface. Unify to one baseline+delta guard that covers both paths.
- `lifi/execute.ts:95` — LI.FI ETH nonce read then 10–30s passkey with no rebuild. Same nonce guard.
- `broadcast-btc/route.ts:46` — mempool accepts but response lost → reported failure while BTC is in mempool → double-broadcast on retry. Idempotency by txid.

## Wave 4 — Single-provider on money paths (money: outage = stranded)
- `server/autopilot-*.ts`, `autopilot/*/route.ts`, `executor.ts:53` — server CCTP paths use viem default `http()` (no key, no fallback) while client paths use fallback lists. Route them through `evmFallbackTransport`/`baseFallbackTransport`.
- `lifi/execute.ts:93,303` + `broadcast-btc` — LI.FI ETH leg + BTC broadcast are single-endpoint. Add fallbacks / a second BTC relay.
- `normal-wallet-setup.ts:57` + `use-send-token.ts` — funding move + verification on one Horizon, no retry. Add retry/fallback.

## Wave 5 — Amount & accounting truth (money-low, silent)
- dstAmount written from the *quoted min* and set-once-guarded so the real delivered amount never replaces it (`state.ts:145`, `autopilot/pivot/route.ts:148`) — Activity + Dune under-report every swap by the slippage.
- positive-slippage left on Base (`use-cctp-engine.tsx:725`); 7dp-vs-6dp funding dust (`:1130`); `swap_logs.amountOut` stores the estimate not the realized (`use-swap.tsx:393`); embedded fee `NaN`/0 accounting (`quote/route.ts:246`, `use-swap.tsx:323`).

## Wave 6 — Guards & quotes that fail open (money/UX)
- `lifi/execute.ts:130,143,267` — zero-fee EIP-1559 signed (fees rejected → 0), gas-shortfall guard skipped on RPC hiccup, PSBT rule-check passes on a parse failure.
- `use-lifi-engine.tsx:222` + `:146,191` — **no quote expiry** (stale quote → closed Chainflip channel / reverting deadline); typed full-balance BTC/SOL bypasses the reserve guard; `ROUND_HALF_UP` can quote 1 unit over balance.
- `use-soroswap-engine.tsx:138` + `stellar-reserve.ts:14` — no XLM-for-fees gate on Stellar swaps; MAX XLM holds back only 0.0002 XLM, not the real Soroban fee → guaranteed fail after two signatures.
- `execute-pair/route.ts:230` — 15-min service window can broadcast an abandoned swap at a stale quote.
- `add-account.ts:116` — wallet setup uses best-effort info → transient blip loops a fresh passkey per lap (should use the Strict variant).

## Wave 7 — Copy collisions & honest failure (UX)
- Triple `friendlyAppError` application collapsing our own messages to the generic; `cctp-progress-modal.tsx:98` re-maps "not enough ETH/XLM for the fee" into "network didn't answer — try again" (tells users to retry a guaranteed failure); `fee-pair.ts:143` 40s give-up with no reconciliation; funding-fail state paints the *succeeded* step red and offers a dead Bring-back button.
- config doors: `LIFI_DENY_EXCHANGES=""` silently disables the fly blocklist; network-cookie default mismatch (testnet vs mainnet) on first visit; `CRON_SECRET` unset = open cron.

---

## Recommended order & gating
Wave 1 and Wave 2 are the ones that lose or misdirect real money — do them first, each as its own GO with jest + full gates + a per-run HTML explainer (doc 96+) + QA rows in doc 91. Waves 3–4 (races, providers) next; 5–7 are correctness/polish. Phase 3 (live matrix run) happens AFTER waves 1–4 so testers aren't chasing bugs we already know about.

**Carried prerequisites:** LI.FI fly/TSLA report (urgent), Vercel DB URLs, staging crons with Justin (Wave 1 depends on crons actually running), relayer top-ups.
