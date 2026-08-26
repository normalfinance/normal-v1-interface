# 90 — Honest Errors: app-wide error-handling audit

**Date:** 2026-08-26 · **Branch:** `feat/honest-errors` (off develop) · **Status:** ✅ ALL FOUR WAVES SHIPPED (same day). Residual deferrals are listed inside each wave's status block.

**Method:** four parallel code sweeps (swap flows · send/wallet/signing · savings/prices/portfolio · API/ramps/auth), ~102 findings, every one verified at file:line. Global counts: 70 error toasts, 20 raw `e.message` pass-throughs, 195 empty catches (user-facing subset listed below), 10 routes stringifying raw exceptions into responses, 3 different rate-limit wordings.

**The three failure classes:**
- **COPY** — a raw chain/node/SDK string reaches the user; needs the friendly-classifier treatment.
- **RESILIENCE** — an automatic retry/fallback fixes the failure better than any copy (the bridge-failover pattern).
- **SWALLOWED** — the user sees nothing at all. Worst class: outages render as "you have no money / no history / no pending transfers".

**Standing rules this audit adds to the bank:**
1. *Unknown is never zero.* A failed balance/price read must render as "—"/retry, never as 0. Money that looks gone is the worst error message in existence.
2. *Guards fail closed or say so.* A protection (memo check, fee semaphore, rent guard) whose data source died must either block or visibly warn — silently disarming is not an option.
3. *Money-state writes never swallow.* A failed PATCH that records a burn/refund/failure must retry and eventually surface — a lost hash strands funds invisibly.
4. *An error channel nobody renders is not error handling.* Several hooks dutifully export `error` that zero components read.

---

## Wave 1 — Cross-cutting infrastructure (one fix kills dozens)

> **STATUS: SHIPPED 2026-08-26** (branch feat/honest-errors). What landed:
> - `utils/errors/error-classifier.ts` → `friendlyAppError()` — THE classifier
>   (Horizon/Soroban codes incl. tx_insufficient_balance, Turnkey/WebAuthn,
>   viem races, reverts, rate limits, timeouts; human text passes through,
>   dumps collapse to one neutral sentence; 12 jest cases).
> - 18 funnels converted: send-review, 3 send adapters, use-send-token,
>   use-swap (+SOROSWAP_API_KEY leak removed), soroswap modal, LI.FI engine
>   (snackbar + inline quote), CCTP engine (3 catches + inline quote), CCTP
>   banner (recover + refund toasts), onramp/offramp MGI funnels, defindex
>   deposit/withdraw (raw kept for the trustline probe), execute-pair route.
> - `utils/authed-fetch.ts` — 401 → silent refreshSession + one retry → the
>   single `nf:session-expired` banner (rendered by SupabaseAuthProvider,
>   debounced); provider's getSession can no longer strand isLoading.
>   First callers: use-inflight-ramps (now THROWS on failure so SWR keeps
>   previous data — outage ≠ "nothing pending"), mgi/client (challenge —
>   which now SHOWS the anchor's useful text — complete, deposit).
> - Server hygiene: 6 MGI routes stripped of `stack:`; sentTo/sentBody/
>   bodySnippet/details leaks removed (7 sites); coinbase session +
>   offramp-status no longer echo raw exceptions.
> - RPC fallbacks: `lib/chains/rpc-fallback.ts` (BASE/ETH/SOL URL lists +
>   viem fallback transport) wired into pivot-swap + engine readBaseUsdc;
>   lifi-tracker confirms source txs across the URL list (an RPC outage no
>   longer reports "swap failed — no funds were moved"); solana blockhash
>   one quiet retry; BTC fee estimate falls back to the builder's 15 sat/vB.
> Deferred within Wave 1 scope: burn-evm + banner readBaseUsdc transports
> (network-aware variant — ride Wave 2), MGI history 401 (Wave 2).

### 1a. Global authed fetch: refresh-then-retry on 401 + ONE session-expired surface
Today an expired session degrades into a different cryptic failure at every surface. One shared wrapper (around `buildAuthHeaders` + fetch) that refreshes the Supabase session and retries once, then shows a single "Your session expired — sign in again" modal, resolves all of these at once:
- `lib/with-auth.ts:51` — every authed route returns bare `{"error":"Unauthorized"}`; no client interceptor exists
- `utils/http.ts:25-38` — silently omits the Authorization header when session is null
- `providers/SupabaseAuthProvider.tsx:35-64` — `getSession()` unhandled rejection leaves `isLoading` true forever; SIGNED_OUT never surfaces
- `lib/mgi/client.ts:97` — "challenge failed: 401 Unauthorized" toasted raw
- `hooks/use-inflight-ramps.ts:38-40` — 401 makes the money-in-flight banner silently vanish (res.ok never checked)
- `sections/swap/cctp-resume-banner.tsx:197` — 401 removes the money-recovery UI entirely, silently
- `hooks/use-swap.tsx:432` — WalletSessionExpiredError swallowed → progress modal spins forever
- `components/_common/onramp-dialog.tsx:300,344` — Coinbase session start: one generic string for 401/429/provider-reject
- `lib/mgi/history.ts:23` + `client.ts:62` — expired SEP-10 token fails every poll forever; `clearMgiToken()` never called on 401

### 1b. ONE user-facing error classifier (extend `utils/errors/error-classifier.ts`)
A single `friendlyAppError(raw)` used by every snackbar/modal funnel. Maps: Turnkey codes (reuse `friendlyTurnkeyError`), WebAuthn classes, viem strings (nonce too low, underpriced, insufficient funds for gas), Horizon/Soroban result codes (extend `TX/OP_CODE_MESSAGES` — `tx_insufficient_balance` is missing entirely), rate limits (one wording + wait hint), network timeouts. Funnels to convert:
- `send-review.tsx:127` — the final send confirm shows raw Turnkey machine text (bypasses friendlyTurnkeyError)
- `send-adapters/bitcoin.ts:166`, `ethereum.ts:220` (shortMessage outranks friendly strings), `solana.ts:209`
- `hooks/stellar/use-send-token.ts:266` — raw Horizon codes win over the friendly message
- `hooks/stellar/use-swap.tsx:436` + `soroswap-progress-modal.tsx:236` — Soroswap path has no friendlyError at all; double-surfaces raw strings
- `use-cctp-engine.tsx:761,957,1055` — anything not reverted/declined/timeout reaches users verbatim
- `use-lifi-engine.tsx:293` — full PSBT diagnostic dumps land in a snackbar
- `cctp-resume-banner.tsx:407,484` — recovery + refund toasts show raw viem/Turnkey strings at peak user anxiety
- `onramp-dialog.tsx:388` — the MGI funnel toasts whatever client.ts threw (raw JSON diagnostics)
- `offramp-dialog.tsx:451` — opposite bug: throws away MoneyGram's actionable "below minimum" message; pass `MoneyGram:`-prefixed text through
- `app/api/fees/execute-pair/route.ts:296` — raw `tx_insufficient_balance` / `op_underfunded` reach savings users
- `use-defindex-savings.tsx:415,636` — deposit/withdraw raw passthrough, no throttled-vs-can't-afford distinction
- `hooks/stellar/use-swap.tsx:351` — "Ensure SOROSWAP_API_KEY is set on the server" leaks config to users
- `lib/cctp/burn-stellar.ts:94` — raw XDR result JSON-dumped into the failure box
- `lib/cctp/burn-evm.ts:113` — inbound burn reverts wear the WRONG friendly copy (offers "Bring back" which doesn't exist inbound); tag burn vs pivot
- Rate-limit unification: `api/send/execute:157`, `api/swap/quote:36`, `api/lifi/quote:23`, `api/send:45`, `api/transaction:98` — adopt the classifier string + `reset` hint (the wallets/link route already does this right)

### 1c. Server response hygiene — no stacks, hosts, or raw exceptions in client JSON
Server logs keep the detail (+ traceId); responses carry a code + friendly text:
- `api/mgi/sep10/complete/route.ts:95` (+ sep24 deposit:130, withdraw:116, withdraw/cancel:91, moreinfo:58, proxy:62) — `stack:` in response bodies
- `api/mgi/sep10/complete/route.ts:70-78` — anchor host (`sentTo`) + raw anchor body forwarded to toasts
- `api/mgi/sep24/deposit/route.ts:118-127` — 2KB `bodySnippet` + full `sentBody` reach users
- `api/mgi/sep10/challenge/route.ts:41` — the one place the anchor's GOOD message exists, the client drops it (show it)
- `api/coinbase/session/route.ts:66` + `offramp-status:83` — raw Node/JWT internals in `error`
- `api/send/execute/route.ts:186` — decoder internals in the 400 body (409 sibling does it right)

### 1d. RPC/provider fallbacks — the single-point-of-failure class
- `lib/cctp/pivot-swap.ts:50` + `use-cctp-engine.tsx:146` — unkeyed default viem Base RPC on money-moving legs → shared `fallback([...])` transport list
- `lifi-tracker.ts:97` — source-tx polling on one public RPC; an outage becomes "swap failed — no funds were moved" (FALSE claim) → fallbacks + distinguish "couldn't verify" from "failed"
- `send-adapters/solana.ts:209` — blockhash fetch retry with backoff (public RPC 429s are routine)
- `send-adapters/bitcoin.ts:93` + `send-modal.tsx:402` — mempool.space single point of failure for BTC MAX + fee estimate (retry, fall back to `balance − estimatedFee` and the adapter's 15 sat/vB default; never a permanent "Fetching fee estimate…" over an enabled Review)

---

## Wave 2 — Money-path truth (the dangerous silents)

> **STATUS: SHIPPED 2026-08-26** (branch feat/honest-errors). What landed:
> - CCTP patcher: every row PATCH retries 3× with backoff; the critical hash
>   writes (srcSwapTxHash/burnTxHash) SAY it when recording permanently fails
>   ("keep this tab open"); a timed-out Stellar burn hands its hash to the
>   catch so the row keeps it (burn-stellar attaches txHash/mayStillLand).
> - LI.FI tracker: >20-min bridges get an honest "still on its way" info
>   toast instead of an eternal spinner; the activity record POST retries 3×.
> - Soroswap: session expiry surfaces in the modal ("reconnect and try
>   again") instead of the forever-"Preparing" spinner.
> - Memo guard fails VISIBLE: an unreachable check renders an amber "we could
>   not verify whether this address needs a memo" warning (never silently
>   green); MemoRequirement gained `unknown`.
> - Wallet export: a failed wallet-list fetch BLOCKS the export with a red
>   retry card — never falls back to a possibly-wrong wallet's phrase.
> - Wallet connect: store failures toast via the classifier; a closed picker
>   says "cancelled — nothing was linked" instead of total silence.
> - Passkey credentials: one quiet retry before the fail-open unrestricted
>   prompt; wallet-info timeouts say "could not load your wallet just now",
>   never "Turnkey wallet not found".
> - Coinbase offramp: a failed status fetch is an outage warning, never
>   "No pending cash-out"; polling skips outage ticks; resume survives page
>   refresh via a sessionStorage latch (cleared on close).
> - MGI: 15-20s timeouts on all client fetches; the drop-off-details button
>   catches + toasts; poll exhaustion says "still processing — check
>   Activity"; a 401 clears the cached SEP-10 token so the next attempt
>   re-authenticates.
> - Ramp fail-open row creation now logs the tracking loss server-side.
> - Deferred-from-W1 closed: network-aware fallback transports on burn-evm
>   and the banner's readBaseUsdc.

- `use-cctp-engine.tsx:388` — `patch({burnTxHash})` failures swallowed → cron AND banner blind to the money. Retry with backoff; surface if permanently failing. Same for `markFailed`/`markSourceRefunded` at :668, :742, :771, :965 (stuck-forever activity rows)
- `lib/cctp/burn-stellar.ts:103` — burn timeout throws BEFORE patching the hash; the burn may have succeeded → patch hash first, keep polling
- `lifi-tracker.ts:149` — bridges >20 min spin forever → honest "still bridging — track here" ending (CCTP already has one)
- `lifi-tracker.ts:226` — swap record failure = swap never in activity though funds moved → retry/server reconcile
- `hooks/use-swap.tsx:432` + `use-soroswap-engine.tsx:163` — session-expired signature → eternal "Preparing the swap" spinner → error state + re-auth (rides 1a)
- `coinbase-offramp-modal.tsx:105` — failed status fetch concludes "No pending cash-out" after a real sale → error stage + retry + re-auth
- `offramp-resume-handler.tsx:76` — resume markers stripped from URL before resolving → latch to sessionStorage; render a retry card
- `lib/stellar/memo-required.ts:58,63` — the memo guard fails OPEN → on check failure show "couldn't verify memo requirement — double-check with your exchange" warning (rule 2)
- `wallet-export-dialog.tsx:108` — seed-picker fetch failure falls back to a possibly-WRONG wallet → block with retry instead
- `use-stellar-wallets-kit.tsx:227,256,266` — wallet-connect rejection/failure = total silence → distinguish "you declined" from "failed", toast accordingly
- `send-modal.tsx:1427` — guard unavailability proceeds silently → inline "couldn't pre-check" note
- `passkey-stamper.ts:75` — credentials fetch fail-open builds an unrestricted passkey prompt → user pays a biometric then gets error 16 → retry lookup once; fail closed for sends
- `lib/turnkey/wallet-info.ts:111` + adapters `ethereum.ts:67`/`solana.ts:98` — timeout misdiagnosed as "Turnkey wallet not found" → distinguish unavailable-vs-absent, retry once
- `api/ramp/transfers/route.ts:106-110` — fail-open row creation is right, but add telemetry so we know tracking was lost
- `mgi/client.ts:288,338-341` — dead "View drop-off details" button + poll loop exhausts silently → try/catch + "still processing — check Activity"; `client.ts:91-152` — no timeouts on any MGI fetch → AbortSignal.timeout + one retry on idempotent GETs

---

## Wave 3 — Unknown ≠ zero (balances, prices, savings honesty)

> **STATUS: SHIPPED 2026-08-26** (branch feat/honest-errors). What landed:
> - **DeFindex 429 (the oldest backlog item)**: every call rides a shared
>   request gate (`server/request-gate.ts`, jest-covered — the spacing test
>   caught a real reservation race): concurrency 2, 300ms spaced starts, and
>   retries grew to 3 attempts with jitter so parallel retries stop landing
>   on the same instant. user-position's null answer now names its reason.
> - **Prices**: a long-TTL last-good spot copy — a CoinGecko outage serves
>   week-old prices with a server warning instead of valuing BTC/ETH/SOL at
>   $0; price-history serves a stale series (marked) instead of an empty
>   chart; the asset page renders '—' instead of "$0.00 / BTC" when the
>   price is unknown.
> - **Portfolio**: hero shows "Couldn't load your balances — Retry" instead
>   of "Total $0.00"; Holdings shows an outage row instead of "No holdings
>   yet"; BTC finally exports `error` (its retry branch was unreachable);
>   the companion Normal wallet gets its own last-good snapshot so one
>   Horizon blip cannot erase it from every surface.
> - **Savings**: accountExists is tri-state (null = unknown) — a Horizon
>   blip no longer flips a set-up account into the "Activate your account"
>   nag, silently disarms the XLM fee semaphore, or auto-opens the setup
>   dialog; deriveWalletReadiness answers 'unknown' for null; position stats
>   show "Unavailable — retrying…" instead of a forever-skeleton; the
>   earnings chart says it failed instead of drawing a flat $0 curve; the
>   history card says "Couldn't load — retrying…" instead of "No
>   transactions yet".
> Consciously deferred (small visual polish, unchanged data machinery):
> stale-marker dots on holdings rows, the APY-chip error/stale flag, the
> XLM-fees-card tri-state row (the aggregate's stale snapshot already covers
> the realistic case), the drawer error row, and native-token null-balance
> typing (per-chain `error` surfaces carry the honesty instead).

- `use-wallet-balances.ts:138` — portfolio fetch failure renders "Total $0.00 / No holdings yet"; `error` exported, read by NOBODY → error state + retry in portfolio hero, drawer, asset pages
- `lib/portfolio/native-token.ts:52` — `balance ?? '0'`: outage renders confident zeros → null balance + skeleton
- `use-btc-portfolio.ts:36` — BTC is the only chain with NO failure surface (the retry branch is unreachable) → export `error` like ETH/SOL
- `lib/portfolio/normalize.ts:74` — 1h-stale snapshots rendered as live → "as of HH:MM" marker
- `api/wallet/portfolio/route.ts:94` — one Horizon blip erases the companion wallet from every view → include in stale-snapshot machinery
- `savings-card.tsx:106` + `savings-xlm-fees-card.tsx:50` — null-vs-zero: funded users told their USDC/XLM is gone → "Balance unavailable" block state
- `use-account-status.ts:88` + `savings-card.tsx:220,358,1034` — Horizon blip flips to "Activate your account" and AUTO-OPENS setup; the XLM fee semaphore silently disarms → "unknown" is its own state; never auto-open on unknown
- **DeFindex 429 (the long-standing backlog item)** — `server/defindex.ts:70` one fixed-delay retry, 5 concurrent cold-load calls re-trip the limit → shared token bucket + staggered sequencing + exponential jitter; `api/savings/user-position/route.ts:358` returns `success:true, userPosition:null` on failure → `success:false, error:'upstream_unavailable'`
- `use-savings-position.ts:151` + `savings-card.tsx:576` — permanent skeletons instead of "couldn't load your savings — retry"
- `use-defindex-savings.tsx:142` — `fetchError` consumed by zero components → render it (APY chips/hero)
- `api/savings/vault-info/route.ts:138` — stale APY served with `stale:true`, client drops the flag → surface it (it drives "estimated yearly earnings")
- `savings-chart.tsx:112` + `savings-history-card.tsx:266` — fetch failures rendered as "$0.00 earnings" / "No transactions yet" → error states
- `lib/portfolio/aggregate.ts:88` — CoinGecko failure prices everything at $0 → Redis last-good price fallback (longer TTL) + stale marker
- `use-price-history.ts:61` + `api/prices/history/route.ts:116` — price 0-as-unknown → "—"; add stale-cache fallback + retry button

---

## Wave 4 — Flow polish + automatic retries

> **STATUS: SHIPPED 2026-08-26** (branch feat/honest-errors). What landed:
> - Gas top-up: 3 attempts on the idempotent relayer call, then a real Base
>   balance poll (capped ~20s) instead of the blind 8-second sleep.
> - Autopilot downgrade is SAID: when the delegation was active but a step
>   falls back to interactive, an info toast announces the passkey before it
>   pops ("Autopilot could not finish this step — confirming with your
>   passkey instead") on both the burn and pivot legs.
> - Quote fetches (LI.FI + CCTP cards): one quiet 6s retry on 429/5xx/network
>   before parking an error; the PIVOT quote (money already minted on Base)
>   gets 3 attempts with backoff and drops the deny lists on the last one —
>   a previously-failed bridge beats no route at all.
> - WebAuthn guard: the one-quiet-retry now also covers NETWORK-layer blips
>   mid-ceremony (narrow by contract — API errors still never retry; new
>   jest case pins it); the rich friendlyTurnkeyError branches now fire on
>   guard-wrapped errors too (regex learned the wrapped phrase).
> - Savings: a failed pre-check WARNS before costing two signatures; the
>   escrowed 0.5% fee announces "settles as a separate small transaction";
>   the only optimistic-write confirm read retries once and logs if it
>   still fails.
> - QR failures are quiet inline text in both receive modals — no eternal
>   spinner, no alarming error toast, address always copyable.
> - Send modal: the BTC display-MAX fallback reserves the estimated sweep
>   fee (was the full balance — a guaranteed builder failure); a failed
>   fresh-read MAX says "used the cached value".
>
> **Documented deviations (deliberate):**
> - `tx_bad_seq`/`tx_too_late` and viem nonce races are NOT silently
>   retried: Stellar/EVM signatures cover the sequence/nonce, so a rebuild
>   requires a fresh signature — "silent" is physically impossible without
>   custody-side signing. The W1 classifier copy ("the network was
>   mid-update — try again, it usually works immediately") is the honest
>   ceiling here.
> - fee-pair's "taking longer than expected" optimistic-state mismatch
>   needs a deposit-flow state machine — out of scope, tracked.
> - Quote-CTA wording and send-picker outage states are covered by the W1
>   classifier and the W3 stale/error machinery respectively.

- Stellar races: `tx_bad_seq`/`tx_too_late` → reload account, rebuild, resubmit once silently (`use-send-token.ts:266`)
- viem races: nonce too low / replacement underpriced → refetch pending nonce + fees, retry once (`ethereum.ts:220`)
- `use-cctp-engine.tsx:436` — gas top-up: retry 2-3× (idempotent by design) + verify by balance instead of fixed 8s sleep
- `lib/cctp/pivot-swap.ts:70` — pivot re-quote with backoff; last attempt WITHOUT the deny list before dead-ending minted funds
- Quote fetches (`use-lifi-engine.tsx:192`, `use-cctp-engine.tsx:296`) — auto-refresh with backoff on 429/5xx; stop blaming the amount for provider outages
- `webauthn-guard.ts:33,56` — stop overwriting the better `friendlyTurnkeyError` messages; widen the one-quiet-retry to transient non-NotAllowed failures
- `use-cctp-engine.tsx:540` — autopilot silent downgrade → "finishing this step manually" notice before the surprise passkey
- `use-defindex-savings.tsx:287` — failed pre-check collects TWO signatures then fails → block or warn first
- `use-defindex-savings.tsx:351` — fee escrowed for the sweeper → say "the 0.5% fee settles separately in a few minutes" (`pair.feeSubmitted` is returned and ignored)
- `use-savings-position.ts:316` — the only optimistic-write verification has an empty catch → retry + flag
- `fee-pair.ts:144` — "taking longer than expected" but numbers say nothing happened → pending-state row like :126's pattern
- MGI: poll-exhaustion message, re-auth on 401, minimum-amount pass-through (`offramp-dialog.tsx:451`)
- Cosmetics: `chain-receive-modal.tsx:55` eternal QR spinner vs `receive-modal.tsx:75` alarming QR toast → one quiet "QR unavailable — copy the address" line
- `send-modal.tsx:545` BTC MAX fallback = full balance (guaranteed builder failure) → fall back to `balance − estimatedFee`; `send-modal.tsx:576,393,103,79` — MAX/reserve/picker silent fallbacks get inline notes or error states

---

## Order & gating

1. **Wave 1** first — later waves depend on the wrapper (1a) and classifier (1b). Largest blast radius, mostly additive.
2. **Wave 2** — money-path truth; each item small, all high-stakes.
3. **Wave 3** — display honesty; touches many components, mechanical.
4. **Wave 4** — retries/polish; lowest risk, highest count.

Each wave ships with: jest tests for pure logic (classifier mappings, retry policies), QA rows in the current QA-round doc (doc 91+ — doc 80 is frozen at R24), and the usual gates (jest, lint, tsc, prettier, isolated build). GO is per wave.
