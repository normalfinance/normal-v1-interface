# 70 — XLM savings guard (branch `fix/xlm-savings-guard`)

Requirement (Niko): "user never sends out all XLM unless savings don't
work." Savings deposits/withdrawals are Soroban transactions paying XLM
fees (0.05–0.5+ XLM each, two txs per action). A saver who moves out all
their XLM has money locked in a vault they can no longer touch.

## 1. Verified current state (all confirmed in code, 2026-08-14)

| Path | Guard today | Gap |
|---|---|---|
| Send XLM — MAX button | `spendableXlm` (network reserve + fee) − `SAVINGS_XLM_BUFFER` (1 XLM), but only when `subentry_count > 0` | Trustline is a proxy for "savings-capable", NOT "has savings": every trustline holder gets docked 1 XLM even with zero deposits, and it is MAX-only |
| Send XLM — typed amount | `spendableXlm` only (network reserve) | Typing bypasses the buffer entirely — the exact drain the requirement forbids |
| Swap XLM (Soroswap XLM→USDC) | `fromBalance = balance − pendingOutflow` — **no reserve of any kind** | Two bugs: (a) no savings buffer; (b) not even the NETWORK reserve — a true MAX XLM swap offers locked reserve XLM and fails on-chain, savings or not (latent bug, fixed by this work) |
| Savings card itself | #28: blocks deposit/withdraw when `xlmAvailableForFees < MIN_XLM_FOR_SAVINGS_TX` (0.5), auto-recheck 4s | Already correct — unchanged |

Constants today: `SAVINGS_XLM_BUFFER = 1`, `MIN_XLM_FOR_SAVINGS_TX = 0.5`,
`stellarMinReserve = (2 + subentries) × 0.5`.

## 2. Design

**One rule, one helper, every XLM outflow.**

```
protected XLM = stellarMinReserve(subentries)         // network minimum (exists)
              + (hasActiveSavings ? SAVINGS_XLM_BUFFER : 0)   // 1 XLM
spendable for outflow = max(0, balance − protected − tx fee)
```

- `hasActiveSavings` = the user's DeFindex position > 0 (from
  `useDefindexSavings`, the same cached read savings uses) — the REAL
  signal, replacing the trustline proxy. A trustline holder with no
  deposits is no longer docked; a saver who typed an amount is no longer
  let through.
- Applied in BOTH the MAX computation and the typed-amount validation, in
  BOTH the send modal and the swap card. The swap card additionally gains
  the network reserve it never had (the latent MAX-swap bug).
- Loading semantics (monotonic vs today — never looser, sometimes
  tighter): while the position is still unknown, MAX keeps today's
  conservative trustline-proxy behavior; the hard typed-amount block only
  engages once a position > 0 is confirmed. A no-savings user is never
  blocked by a loading state.
- 1 XLM buffer ≈ two to four full deposit/withdraw round-trips at current
  Soroban fee levels — kept at the existing constant.

**What is deliberately NOT guarded**
- Savings operations themselves (they are the thing being protected; the
  savings card's own 0.5 threshold still governs them).
- USDC sends/swaps (classic-payment fees are ~0.00001 XLM — irrelevant).
- Receives, trustline ops, MGI deposits.
- No server-side enforcement: this guard protects the user from stranding
  their own savings, not Normal from abuse — the client is the correct
  layer. (Stated decision, not a shortcut: a user determined to bypass it
  via raw API calls is exercising self-custody.)

## 3. What each user type experiences

**New user, no savings** — nothing changes. Send/swap XLM down to the
network minimum as today. The guard activates only after their first
deposit.

**Saver with headroom** (e.g. 20 XLM, USDC trustline, $50 deposited) —
network reserve ≈ 1.5–2 XLM + 1 XLM buffer. Send/swap MAX offers ≈ 17
XLM; typing 18.5 is blocked with: *"1 XLM is kept so you can always
withdraw your savings ($50 deposited). Withdraw savings to free it."*

**Existing saver already low on XLM** (e.g. 1.2 XLM total) — the guard
takes nothing away: that XLM was already below the network reserve and
unsendable. Available-to-send shows 0 with the savings explanation
instead of a bare 0. Their withdrawals are governed by the savings card's
existing "Add XLM to continue" flow, unchanged. **No migration, no data
change** — the guard is derived per render from position + balance.

**Saver exiting entirely** — withdraw all savings → position reaches 0 →
the guard lifts by itself (worst case ~30s of position-cache lag) → they
can send everything above the network minimum.

**Savings genuinely broken** (DeFindex down, can't withdraw) — the guard
still holds 1 XLM. DECISION FOR NIKO (§5): with no override, that 1 XLM
stays parked until savings recovers; with an override link ("I
understand, send anyway"), the requirement's "unless savings don't work"
clause is user-invokable but also user-abusable.

## 3b. Always-visible XLM fee status (Niko's addition, 2026-08-14)

A traffic-light line that is ALWAYS present on the Normal Savings card —
not only when something is already wrong — plus a detailed explainer
card on the savings page (right column, above "Need USDC?").

Status is computed live from `xlmAvailableForFees(balance, subentries)`
against the two existing constants (no new magic numbers):

| Light | Condition (fee-available XLM) | Message on the card |
|---|---|---|
| 🟢 green | ≥ `SAVINGS_XLM_BUFFER` (1) | "XLM fee reserve healthy — deposits & withdrawals covered." |
| 🟡 yellow | ≥ `MIN_XLM_FOR_SAVINGS_TX` (0.5), < 1 | "XLM running low — enough for about one more action. Top up to stay safe." |
| 🔴 red | < 0.5 | "Not enough XLM for network fees — deposits & withdrawals are paused until you add XLM." (actions already blocked by #28) |

- Yellow/red include a one-tap CTA: "Get XLM" → swap card prefilled
  USDC→XLM (savers hold USDC by definition), falling back to the receive
  dialog when they hold nothing to swap.
- The explainer card ("Network fees on Stellar") states: every savings
  action is a Stellar transaction with a small XLM fee; when you have
  savings the app keeps 1 XLM aside so withdrawals always work — that is
  why Send/Swap MAX shows slightly less than your full XLM balance; your
  current status + exact fee-available XLM.
- Why the light matters even WITH the guard: the guard only controls
  outflows made in our app. External wallets (Lobstr/Freighter) can
  spend XLM outside it, and Soroban fees can spike — the light detects
  what the guard cannot prevent. Red today is also the state of any
  pre-guard user who already drained their XLM.
- Uses the same 4s self-recheck the savings card already runs while
  blocked, so the light flips green the moment a top-up lands.

## 4. Implementation map

1. `utils/stellar-reserve.ts` — add `spendableXlmForOutflow(balance,
   subentries, hasActiveSavings)`; existing helpers unchanged.
2. `send-modal.tsx` + `send-adapters/stellar.ts` — MAX and
   `getSpendableBalance` take the new helper; hasActiveSavings threaded
   from `useDefindexSavings` (SWR-deduped; +1 cached position read on
   surfaces that didn't load it, 30s server cache — negligible).
3. `swap-card.tsx` — XLM `fromBalance` becomes reserve-aware (network +
   conditional buffer); `insufficient` message distinguishes "exceeds
   balance" from "keeps 1 XLM for savings fees".
4. Copy: one explanatory line under Available/MAX in both surfaces, shown
   only when the buffer is actually being applied.
5. `savings-card.tsx` — always-visible 3-state fee-status line (§3b),
   replacing the current only-when-broken warning; shared pure classifier
   `xlmFeeStatus(balance, subentries): 'ok'|'low'|'blocked'` in
   `stellar-reserve.ts`.
6. Savings page — "Network fees on Stellar" explainer card above "Need
   USDC?" (§3b), same status source.
7. Tests: unit suites for `spendableXlmForOutflow` AND `xlmFeeStatus`
   (boundary cases at 0.5 and 1.0, subentry variation, below-reserve);
   adapter spendable cases; swap-card XLM balance case in the existing
   component-test pattern.

No schema, no routes, no cron. Client-only. One session.

## 5. Decisions Niko owes before GO

1. **Override or not** when savings can't be withdrawn (§3 last case).
   Recommendation: NO override in v1 — 1 XLM is small, the failure mode
   is rare, and the message can name the amount so nothing feels stolen.
2. **Buffer size** — keep 1 XLM (recommendation) or raise.
