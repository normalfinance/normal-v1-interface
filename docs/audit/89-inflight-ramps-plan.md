# 89 — F2, money in flight: plan

Status: **PROPOSED — awaiting GO.** No code. Branch: `feat/better-ramps`.
Parent: doc 86 §3 (the sketch), doc 88 B2 (the worklist entry).

---

## 1. The problem, explained from zero

Every ramp has the same shape, and the gap in the middle is unavoidable:

```
user leaves our app → pays at the provider → provider sends the crypto
                    → the chain confirms it → our balance query sees it
```

The provider says "done" when *it* is done. The asset appears in our UI only
after the chain confirms and our cache refreshes. Seconds usually; minutes on
a busy chain; **days** on an off-ramp payout to a bank. In that window the
user stares at an unchanged balance having just spent real money — the single
most alarming moment in the product, and today we show nothing.

Except for one provider. MoneyGram already does this right:

- every MGI transaction is **mirrored into our DB** (`MoneyGramTransaction`)
- a **pending banner** renders above the USDC activity table from those rows —
  survives closed dialogs, reloads, other devices
- the **activity feed** joins the same rows with live statuses

F2 is: make that the rule for every provider, instead of MoneyGram's private
superpower.

## 2. Answers to Niko's two questions first

**Will the message be on the asset page?** Yes — but not in the circled
top-right spot. The MoneyGram banner already renders **above the Activity
table** (`asset-details-view.tsx:635`), and that placement is right: pending
money is *action* information and belongs where the user looks for their
transactions, next to the rows it will become. The Token Information card is
static reference (address, network, decimals); parking live status there
buries it in the corner users read once. The circled emptiness is a layout
gap, not a home for status. (If you disagree after seeing it live, the same
component mounts anywhere — that is a one-line decision, not a design change.)

Concretely: the slot at line 635 stops being MoneyGram-and-USDC-only —

```tsx
// today                                    // after F2
{token.symbol === 'USDC' &&                 <RampPendingBanner
  <MoneyGramPendingBanner />}                 symbol={token.symbol} />
```

— one banner, any provider, any asset, showing e.g.
*"$20 USDC on the way from Coinbase — usually under a minute"* or
*"Sold 15 USDC via MoneyGram — cash pickup pending"*.

**Will it be in the activity rows?** Yes. The feed already unions MGI
transactions, Coinbase off-ramp fills, pending sends and swap logs — in-flight
ramps join that union as rows with a status pill (`On the way` /
`Processing` / `Arrived` / `Failed`), under the existing Buy/Sell types, in
the drawer and the portfolio card automatically since they read the same feed.

## 3. What exists, and what each piece keeps doing

| Piece | Today | Under F2 |
|---|---|---|
| `MoneyGramTransaction` | SEP-24 mirror, rich protocol statuses | **Stays.** Read-side adapter maps it into the unified view-model — no migration, MGI keeps its richness |
| `OfframpFill` | joins a Coinbase off-ramp to its on-chain tx for completion | **Stays** — completion mechanics are not status display |
| `offramp-resume-handler` | completes the Coinbase off-ramp send after the return redirect | **Stays** — it *completes*; F2 *reports* |
| Coinbase on-ramp | fire-and-forget: nothing after handoff | **Gets a record** (the actual gap) |
| MoonPay (F3) | not built | Born onto F2 — writes the same records, webhook feeds the same reconciler |

The design rule: **one new table for the gap, adapters for what already
works.** Rebuilding MGI's mirror into a new shape would be churn without user
benefit; leaving Coinbase untracked is the actual hole.

## 4. The design

### 4.1 One record per handoff — `ramp_transfers` (additive SQL)

```sql
CREATE TABLE IF NOT EXISTS ramp_transfers (
  id              TEXT PRIMARY KEY,
  "supabaseUid"   TEXT NOT NULL,
  direction       TEXT NOT NULL,          -- 'onramp' | 'offramp'
  provider        TEXT NOT NULL,          -- 'coinbase' | 'moonpay' | ...
  asset           TEXT NOT NULL,          -- 'USDC'
  chain           TEXT NOT NULL,          -- 'stellar' | 'bitcoin' | ...
  "walletAddress" TEXT NOT NULL,          -- the WalletChoice-selected wallet
  "amountExpected" TEXT,                  -- NULL until known (see 4.4)
  "amountFinal"    TEXT,
  status          TEXT NOT NULL DEFAULT 'committed',
  "providerRef"   TEXT,                   -- partnerUserRef / session id
  "baselineBalance" TEXT,                 -- destination balance AT COMMIT
  "failureReason" TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "settledAt"     TIMESTAMPTZ
);
-- indexes: (supabaseUid), (status), (supabaseUid, status)
```

Written **before** the user leaves for the provider — a closed tab or dead
phone cannot lose it. `walletAddress` is the picker's selection, so the
banner can say *which wallet* the money is heading to (F1 and F2 compose).

### 4.2 The status machine — a pure module, tested first

```
committed ──► provider_processing ──► provider_complete ──► arrived ✓
    │                 │                      │
    └──► abandoned ✗  └──► failed ✗          └──(offramp)──► paid_out ✓
```

Rules that make it honest:

- **Transitions only move forward.** A PATCH can never un-arrive a transfer.
- **Nothing pends forever** (doc 86's rule). `committed` with no provider
  signal → `abandoned` after 45 minutes — the user opened Coinbase and closed
  the tab; the row says so instead of haunting the banner.
- **`arrived` requires the chain, not the provider.** Provider-complete means
  *"expect it any second"* and triggers the balance check; only a real balance
  change (or a found on-chain tx) marks `arrived`. The provider's word is a
  forecast; the chain is the fact.
- **Off-ramp mirrors it**: crypto leaves instantly, money lands later — its
  banner copy is *"Sold — payout on the way, arrives by <estimate>"*, because
  the user just watched their balance drop with nothing to show for it.

### 4.3 Two completion signals, three carriers

1. **Provider status** — the reconciler cron `/api/cron/ramp-reconcile/`
   (every 2 min, `CRON_SECRET`, heartbeat, same skeleton as the three existing
   crons) asks each provider about non-terminal rows: Coinbase via the
   existing `/api/coinbase/offramp-status` internals, MGI via the existing
   refresh, MoonPay later via **webhook** (a route F3 plugs into — pushes
   beat polls when offered).
2. **Balance arrival** — on `provider_complete`, the client fires the doc-67
   **cache-bypassing refresh** (`refreshFresh`) and compares against
   `baselineBalance`; the reconciler double-checks server-side via Horizon for
   Stellar rows, so arrival is detected even with every tab closed.

### 4.4 The unknown-amount problem, stated honestly

For a Coinbase on-ramp the user picks the amount *on Coinbase's page* — at
commit we may not know it. So `amountExpected` is nullable; the banner says
*"USDC on the way from Coinbase"* until the provider status or the balance
delta fills the number. A guessed amount would eventually contradict the
chain, and the banner's credibility is the entire feature.

### 4.5 Read side — one view-model, three surfaces

`useInFlightRamps()` merges `ramp_transfers` + the MGI adapter into one list.
Consumed by:

- **`RampPendingBanner`** on asset pages (the generalized 635 slot)
- **the activity feed** (new rows join the existing union)
- the **drawer/portfolio** — free, they read the same feed

### 4.6 Security

- POST/PATCH under `withAuth`; `walletAddress` must pass **`userOwnsWallet`**
  (the same check the log routes use — a row against someone else's address
  must 403)
- status transitions validated server-side (forward-only)
- reconciler under `CRON_SECRET`; MoonPay webhook signature-verified (F3)
- rate limits on the write routes, same as the log routes

## 5. Build order

| Step | What | Size |
|---|---|---|
| F2a | Pure status-machine module + tests; SQL file; POST/PATCH routes | S |
| F2b | Commit writes in both dialogs (Coinbase on+off) + baseline capture | S |
| F2c | `useInFlightRamps` + MGI adapter + `RampPendingBanner` + activity rows | M |
| F2d | Reconciler cron + abandonment + Horizon arrival check + `refreshFresh` wiring | M |

Each step ships green independently; F2c is visible to testers before F2d
automates the back half.

## 6. What F2 deliberately does not do

- **No push notifications** — the banner and feed are the surfaces; notifying
  is a product later.
- **No migration of MGI history** — adapter, not rewrite.
- **No Stripe rows** — B3 is parked; tracking a bare link would fake
  precision we do not have.
- **No custom ETA promises** — "usually under a minute" per provider class,
  a range for bank payouts; never a countdown we cannot honour.

## 7. Tests

- **Pure:** every legal/illegal transition; the 45-minute abandonment; arrival
  requiring chain-confirmation; view-model mapping incl. MGI adapter and the
  unknown-amount copy
- **Routes:** ownership 403; forward-only enforcement; cron auth
- **Manual (doc 80):** buy on Coinbase → banner appears before leaving our
  app, survives a reload mid-purchase, resolves to `arrived` when the balance
  lands, and the activity row's pill follows; off-ramp shows the payout copy;
  abandon a session → row says abandoned within the hour, banner clears
