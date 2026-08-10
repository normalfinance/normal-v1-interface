# 55 — Fee ordering (#26): plan v2 — sign everything, then submit

**Status: v2 APPROVED (GO 2026-08-07), implementing.** Branch:
`fix/fee-ordering`. Sized L. v1 ("reorder and accept leakage") was rejected —
rightly — as the easy path: it moved the loss instead of removing it.

## The invariant

> **Nothing irreversible happens until every signature exists.** Either the
> user signs both transactions and the system drives BOTH to completion, or
> nothing is submitted at all. A fee can neither outlive a failed service nor
> go uncollected because a human closed a tab.

## Why v1 was wrong — the failure taxonomy

Fee collection after a service fails five ways: user rejects the second
prompt; user closes the tab; wallet jam (#54); session expiry; network. Four
of five happen **at the signature**, and are only possible because the first
transaction was already irreversible when we asked for the second signature.
v1 kept that window open and recorded the losses. v2 closes the window.

## The design

For each flow (savings deposit, savings withdraw, swap XLM↔USDC):

1. **Build both transactions up front** as consecutive Stellar transactions:
   the service tx at sequence N+1, the fee tx at N+2 (the fee builder gains a
   `sourceSequence` parameter; the client reads the service tx's sequence and
   passes it). Fee tx gets a ~15-minute time window so escrow retries have
   room; after that window Stellar itself makes it dead — escrow is
   inherently short-lived.
2. **Collect both signatures** (still two prompts — count is #33's problem).
   A rejection, jam, or closed tab here aborts EVERYTHING: nothing was
   submitted, nothing happened, retry costs nothing.
3. **Hand both signed transactions to the server** (`/api/fees/execute-pair`,
   withAuth + wallet-ownership checked). The server **stores the signed fee
   tx durably first** (Redis, TTL = its time window), then submits the
   service tx, and on its success submits the fee tx.
4. **If anything dies mid-sequence** — tab, serverless instance — a cron
   sweeper (every 2 minutes, same pattern as cctp-advance) finds escrowed
   fee txs, verifies their service tx landed, and submits them. Idempotent:
   it checks the fee tx's own hash on Horizon before submitting, so a retry
   can never double-charge.
5. **If the service tx fails**, the fee tx is never submitted — and its
   sequence number makes it unsubmittable garbage anyway. The escrow entry
   is dropped.

### Sequence-number mechanics (why the pair is safe)

Both txs come from the user's account. Service consumes seq N+1; fee needs
N+2. If the service FAILS in consensus, N+1 is consumed and the fee tx at
N+2 would technically be valid — which is why the server only submits the
fee after a CONFIRMED service success. If the service is rejected before
consensus, the account stays at N, and the N+2 fee tx cannot be applied at
all. The design degrades safely in both directions.

### Swap specifics

Fee stays in the input asset, amounts keep today's exact semantics — the
build order changes (swap tx first, fee tx second), not the economics. MAX
already reserves the fee today (fee was charged before swapping); the same
reservation now simply sits in the wallet until the fee tx lands.

### What can still go wrong, honestly, and what happens then

| Residual case | Handling |
|---|---|
| Fee tx expires (our infra down > ~15 min after a service success) | sweeper marks it lost; the action's log row carries `feeTxHash: null` — a measurable receivable, now for lightning strikes only |
| User submits a competing tx from another app inside the window | fee tx gets `tx_bad_seq`; same receivable backstop |
| Service submitted, response lost (timeout) | escrow holds the fee; sweeper verifies the service hash on Horizon and completes — the pair heals server-side |

## Files

- `lib/build-fee-payment.ts` — `sourceSequence` + `timeoutSeconds` params
- `api/fees/build-payment` — pass-through
- **new** `server/fee-escrow.ts` — escrow store + idempotent submit + sweep
- **new** `api/fees/execute-pair` — the orchestrated submit (withAuth + ownership)
- **new** `api/cron/fee-escrow-sweep` + `vercel.json` entry (cron-secret auth)
- `hooks/stellar/use-defindex-savings.tsx` — deposit + withdraw restructured;
  logging ALWAYS fires (fixes withdraw's latent skip-log bug); fee-pending →
  calm notice, never an error after success
- `hooks/stellar/use-swap.tsx` — same restructure
- `components/_common/savings-card.tsx` — step order/labels
- tests: sequence helper + escrow entry logic; conformance test auto-covers
  the new routes

## Manual test matrix (staging)

| # | Do | You should see |
|---|---|---|
| 1 | Deposit normally | prompts: deposit then fee, BEFORE anything submits; then one submitting phase; success; Activity row with fee hash |
| 2 | Deposit, reject the SECOND (fee) prompt | **nothing happened at all** — no deposit, no fee, wallet untouched, clean retry |
| 3 | Deposit, reject the FIRST prompt | same — nothing |
| 4 | Deposit, close the tab right after the second signature | deposit AND fee both complete anyway within ~2 min (server + sweeper own it); visible on stellar.expert |
| 5 | Swap MAX | works, economics unchanged |
| 6 | Withdraw, reject the commission prompt | nothing happened — funds stay in savings, retry clean |
| 7 | Make the service tx fail (e.g. vault error) | error shown, NO fee charged, no escrow leftovers |
