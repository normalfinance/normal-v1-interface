# 93 — Swap-Matrix Hardening: the systematic error hunt

**Date:** 2026-08-27 · **Branch:** `feat/swap-matrix-hardening` (off develop, after the current merge) · **Status:** plan awaiting GO per phase.

**Why this exists:** every bug found this week belonged to a repeating CLASS (poisoned provider route, race between read and broadcast, rounding of native units, swallowed money-state write, single-provider dependency, stale cache shown as truth, config door). Bugs live in **legs**, not asset pairs — so we sweep by leg, with the class list as the checklist, instead of waiting for testers to trip over cells one by one.

---

## The class checklist (born from real incidents — each one bit us at least once)

| class | incident that taught it |
|---|---|
| Poisoned provider route | fly/TSLA: three bridges burned by one DEX step |
| Read-vs-broadcast race | "nonce too low" during recovery retry |
| Native-unit rounding | 9 lamports of rent-dust from an 8dp display MAX |
| Swallowed money-state write | burn hash lost → invisible stranded funds |
| Single-provider dependency | one public RPC = "swap failed, no funds moved" (false) |
| Stale/unknown shown as truth | "$0.00 / No holdings yet" during outages |
| Config door | session-mode pooler, pool_size 15 |
| State machine with no exit | ramp rows only a dead cron could clear |
| Double mapping / copy collision | "signature was declined" for an on-chain revert |
| Guard failing open | memo check silently disarmed |

## Phase 0 — Niko's flow principles (added 2026-08-27, before the sweep)

> **0a + 0b STATUS: SHIPPED 2026-08-27, run 1** — explainer: `94-explainer-instant-prompts-auto-refund.html`. 0c (run page) pending after Phases 1-3.

**0a. Every "approve in your wallet" step prompts INSTANTLY.** Observed: "Starting
the Circle bridge" sits waiting (the Lobstr→Normal funding move hasn't settled)
before the biometric appears. Waiting is its own honest step ("USDC arriving in
your Normal wallet — a few seconds"); a step that names a signature must mean
the prompt is already on screen. Engine change: a distinct funding-settle stage.

**0b. No dead-end errors — the system always knows the next move.** When an
outbound swap exhausts its options (revert + failover + retry all failed), the
app starts the refund AUTOMATICALLY and explains why — the user should never
stare at a failure wondering what to click. Key insight: the refund burn is a
`depositForBurn` on Base, which the AUTOPILOT policy allowlist already covers —
so for autopilot users the automatic refund is signature-less; for others it
auto-opens with one clear "Confirm return" prompt. Failure UI becomes: what
happened → what we're doing about it → (at most) one confirmation.

**0c. EVERY swap runs on a PAGE, not a popup** (own branch: `feat/swap-run-page`).
Scope confirmed by Niko 2026-08-27: ALL THREE engines — Soroswap (USDC↔XLM on
Stellar), LI.FI direct (BTC/ETH/SOL cross-chain), and CCTP composite — one run
page, per-engine step content. Clicking Swap navigates to it: desktop = visual
panel left, steps right; mobile single column. The page shows ALL steps up
front — including any wallet-setup steps ("Set up your SOL wallet") — with an
explicit **Start swap** button, instead of a popup that brute-forces into
signing. Closing/navigating is inherently safe: the page rehydrates from its
run identity (CCTP: transfer id + resume machinery; LI.FI: tracked source tx +
status overrides; Soroswap: service tx hash). The same reviewed-steps pattern
applies to wallet creation for new users — never "wallet created, now you're
suddenly mid-swap". Subsumes the open "Try again shouldn't close the popup"
item. 0a (waiting-is-a-step) and 0b (auto-next-move) apply to all three
engines' step lists on this page as well.

**Order:** 0a + 0b ride `feat/swap-matrix-hardening` (engine-level, small).
Phases 1–3 then hunt logic bugs on the current UI. 0c (the run page) builds
after the logic is hardened, so the new UI lands on proven legs — then the key
matrix cells re-run once on the new page.

## Phase 1 — The matrix (1 doc, no code)

> **STATUS: SHIPPED 2026-08-27** — the table below. It is the map Phase 2 sweeps and the checklist Phase 3 runs (one row = one live test cell; Status column filled during Phase 3).

### Swaps

| # | flow | engine | legs (in order) | signers | providers | Phase-3 status |
|---|---|---|---|---|---|---|
| S1 | XLM→USDC / USDC→XLM (Normal wallet) | Soroswap | quote → build swap+fee pair (consecutive sequences) → 1 passkey (fee embedded) → submit pair → balance gate | Turnkey passkey | Soroswap API, Horizon, fee-escrow route | ☐ |
| S2 | XLM↔USDC (Lobstr) | Soroswap | same, 2 signatures (swap, then fee) via wallet kit | Lobstr | Soroswap API, Horizon | ☐ |
| S3 | USDC→BTC/ETH/SOL (Normal wallet) | CCTP out | quote → burn-prepare → Stellar approve+depositForBurn (1–2 passkeys) → attestation → Base mint (relayer, cron/poke) → gas top-up → pivot (autopilot else passkey; deny-list failover; auto-refund on exhaustion) → delivery tracking | passkey + autopilot | LI.FI quote, IRIS, Base RPC list, Soroban RPC, relayer | ☐ |
| S4 | USDC→BTC/ETH/SOL (Lobstr-funded) | CCTP out | funding move (Lobstr send + companion-visibility wait) THEN all of S3 | Lobstr + passkey + autopilot | + Horizon | ☐ |
| S5 | BTC/ETH/SOL→USDC | CCTP in | LI.FI source swap on native chain (passkey; PSBT for BTC) → USDC arriving on Base → gas top-up → Base burn (autopilot else passkey) → attestation → Stellar mint (relayer) | passkey + autopilot | LI.FI, IRIS, native RPCs, Base RPC list, relayer | ☐ |
| S6 | BTC↔ETH, BTC↔SOL, ETH↔SOL | LI.FI direct | quote → sign source (PSBT for BTC) → source confirm (RPC list) → bridge tracking → delivery + arrival-gated Done | passkey | LI.FI, bridges, native RPC lists | ☐ |
| S7 | Refund (any failed outbound) | CCTP refund | balance read → create refund row → top-up → burn (autopilot-first, else 1 passkey) → return bridge (~20 min, poke/cron) | autopilot else passkey | Base RPC list, relayer, IRIS | ☐ |

### Sends / Receives

| # | flow | legs | signers | providers | status |
|---|---|---|---|---|---|
| T1 | Send XLM / USDC (Normal wallet, incl. memo-exchange dest) | reserve+savings-buffer math → memo guard → build → passkey → Horizon submit | passkey | Horizon | ☐ |
| T2 | Send XLM / USDC (Lobstr) | same via wallet kit | Lobstr | Horizon | ☐ |
| T3 | Send BTC (incl. MAX) | UTXO fetch → server PSBT build (fee/change/dust) → passkey → server broadcast | passkey | mempool.space, Turnkey | ☐ |
| T4 | Send ETH (incl. MAX, contract dest) | live gas estimate + guards → passkey → server execute funnel | passkey | ETH RPC list | ☐ |
| T5 | Send SOL (incl. MAX / rent guards) | live-lamport MAX → rent guard → blockhash → passkey → server funnel | passkey | SOL RPC list | ☐ |
| T6 | Receive (each of 5 assets) | address + QR + chain-name highlight; BTC pending watcher | — | mempool WS (BTC) | ☐ |

### Buy / Sell / Savings

| # | flow | legs | providers | status |
|---|---|---|---|---|
| B1 | Buy via Coinbase (each asset) | session route → checkout → F2 row (server baseline) → in-card chip → chain-proven arrival | Coinbase, chain RPCs | ☐ |
| B2 | Buy USDC via MoneyGram | SEP-10 (passkey) → SEP-24 deposit → drop-off flow → status polls | MGI anchor, Horizon | ☐ |
| B3 | Sell via Coinbase (each asset) | offramp status → matched order → send crypto (T1–T5 legs) → settle poll | Coinbase | ☐ |
| B4 | Sell USDC via MoneyGram | SEP-10 → SEP-24 withdraw → send → cash pickup | MGI anchor | ☐ |
| V1 | Savings deposit (Normal / Lobstr tab) | pre-check → deposit+fee pair (2 sigs) → escrowed-fee sweep → position confirm read | DeFindex, Blend, Horizon, fee escrow | ☐ |
| V2 | Savings withdraw | same shape, 2 tx | DeFindex, Horizon | ☐ |

Wallet-source dimension: every S/T/V row runs once per applicable source (Normal wallet vs Lobstr-funded) — the table's Lobstr rows call it out where the legs differ; where they don't, one run per source suffices.

## Phase 2 — Static leg sweep (parallel code-review agents)

> **STATUS: SHIPPED 2026-08-27** — 4 agents, 82 findings, classified into 7 fix waves in `95-swap-leg-findings.md`. Through-line: the browser tab is load-bearing for money after signing (no server actor finishes). Wave 1 = that.

One reviewer per LEG, each armed with the class checklist above:
funding-move · Soroswap · Stellar burn/mint · attestation · gas top-up · Base pivot · LI.FI direct (incl. BTC PSBT path) · delivery tracking · refund · native sends (4 chains) · Stellar sends · ramps.
Each agent reports file:line findings classified by the table. Same method as the honest-errors audit (which yielded 102 verified findings) — pointed at flow LOGIC this time, not error display.

## Phase 3 — Live matrix run (staging, small amounts)
Scripted checklist run of every matrix cell by Niko + coworker, ~$5–15 per cell, network tab open. Claude watches the DB + chains live from the session and verifies each leg's on-chain truth as cells execute. Every failure gets the forensic treatment (replay, classify, wave-fix).

## Phase 4 — Failure injection playbook
The R31–R43 devtools-blocking method, standardized: for each flow, the ordered list of endpoints to block and the expected honest behavior. Doubles as the regression script for every future release.

## Phase 5 — Fix waves + closeout
Findings → classified waves → GO per wave (the established rhythm: jest + full gates + QA rows + explainer per wave). Ends with the original optimization Phase 5: a load test and the monitoring habit (Supabase connections graph, Vercel logs, relayer balances).

---

**Standing prerequisites being carried along:** the LI.FI support report (fly/TSLA — urgent, three bridges burned), Vercel DB URLs flipped (the pooler fix), staging crons with Justin, relayer top-ups.
