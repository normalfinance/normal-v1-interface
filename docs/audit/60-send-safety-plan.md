# 60 — #29 ETH/SOL send safety: implementation plan

**Branch:** `fix/send-safety` · **Status: PLAN — awaiting GO.** Builds on the
#27 record-before-broadcast machinery (tx-records reconciler, cron).

## The two confirmed defects (register §#29, re-verified in code 2026-08-12)

1. **Hardcoded `gas: 21000n`** — [send-adapters/ethereum.ts:96](../../packages/web/src/components/_common/send-adapters/ethereum.ts).
   21000 is exactly a wallet-to-wallet transfer. Send to a CONTRACT address
   (most exchange deposit addresses, every Safe/smart wallet) → out-of-gas
   revert → **user burns the fee for a guaranteed failure**.
2. **Broadcast-then-lost-response = double send.** Both adapters end
   `catch → onError → return ''`. If the network drops AFTER the node
   accepted the tx, the UI says "failed" while the send is live. A retry
   reads a FRESH pending nonce (ETH) / new blockhash (SOL) → the second tx
   does not collide with the first → **funds sent twice**. Nothing records
   the attempt server-side, so nobody can even notice.

Scope note: sends are NATIVE coins only (ETH, SOL) — no ERC-20/SPL send UI
exists. BTC already goes through our API with a pending watcher — untouched.
The CCTP and LI.FI swap legs already estimate gas live — out of scope,
except one 3-line carve-in (below).

## The invariant

> A send is recorded server-side BEFORE it is broadcast, broadcast happens
> server-side (like BTC already does), a send with an unknown outcome BLOCKS
> further sends on that chain until the chain says what happened, and gas is
> estimated, never assumed.

## Design

### 1. New table `send_logs` (additive SQL, Niko runs it BEFORE deploy)

```sql
CREATE TABLE IF NOT EXISTS send_logs (
  id            TEXT PRIMARY KEY,
  "walletAddress" TEXT NOT NULL,
  chain         TEXT NOT NULL,            -- 'ethereum' | 'solana' (registry id)
  symbol        TEXT,
  amount        TEXT NOT NULL,
  destination   TEXT NOT NULL,
  "txHash"      TEXT,
  nonce         INTEGER,                  -- EVM only; the double-send key
  status        TEXT NOT NULL DEFAULT 'pending',
  "statusReason" TEXT,
  network       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS send_logs_wallet_idx  ON send_logs ("walletAddress");
CREATE INDEX IF NOT EXISTS send_logs_status_idx  ON send_logs (status);
CREATE INDEX IF NOT EXISTS send_logs_tx_hash_idx ON send_logs ("txHash");
```

Matching Prisma model + `prisma generate` (never migrate/db push). Same
status vocabulary as #27: pending / submitted / confirmed / failed /
abandoned; terminal never overwritten. NOT wired into activity feeds — sends
already appear there via the chain activity APIs and the #47 pending rows;
this table is the integrity record.

### 2. Server broadcast route — `POST /api/send/execute` (withAuth)

The client still builds and signs with the user's passkey (custody
unchanged — the server only relays a fully-signed tx, exactly like
`broadcast-btc` does for Bitcoin today). The route:

1. Validates: chain ∈ {evm, solana}; signed tx parses; the tx's `from`
   (EVM: recovered from the signed tx; SOL: fee payer) **equals a
   turnkey_wallets address owned by the authed user** (ethereumAddress /
   solanaAddress columns — verified present). The body's claimed
   amount/destination are cross-checked against the decoded tx (value + to),
   so the record cannot lie.
2. **Guard: any existing non-terminal send row for this wallet+chain →
   409 "previous send still confirming"** — the load-bearing double-send
   block. (The reconciler settles unknowns within ~2 min; EVM/SOL confirm in
   seconds, so this window is rarely felt.)
3. Writes the `send_logs` row `pending` (with EVM nonce) — record before
   broadcast; a DB failure aborts with nothing on-chain.
4. Broadcasts via server RPC. Success → `submitted` + returns hash
   (confirmation is the reconciler's job, sends don't need to block on it);
   node rejection → `failed` + reason; transport-unknown → row stays
   `submitted`-equivalent for the reconciler.

### 3. Settlement — extend the existing #27 reconciler (same cron, no new entry)

`reconcileTxRecords` gains a `send_logs` pass with chain-specific probes:
EVM `getTransactionReceipt` (found → confirmed/failed by receipt status),
SOL `getSignatureStatuses`. Not found: EVM past 30 min with its nonce
already consumed by another tx → abandoned; SOL past blockhash expiry
(~2 min, use 10 min for margin) → abandoned. Settling frees the guard in
step 2, so a genuinely-dead send unblocks retry automatically.

### 4. Gas estimation (ETH adapter)

- Before signing: `client.estimateGas({from, to, value})` → ×1.2 buffer →
  that is the tx's gas. EOA destinations still cost exactly 21000 (estimate
  returns it); contracts get what they need.
- Estimation REVERTS → that address cannot accept plain ETH → **block the
  send before any signature or fee**, message: "This address cannot accept
  ETH directly. Check the destination — if it is an exchange, use the
  deposit address for ETH, not a contract address."
- MAX-send honesty: `getSpendableBalance` stays a sync flat reserve for
  display, but the pre-send validation recomputes with the real estimate ×
  live fees; if amount + real gas > balance → clear "reduce by ~X" error
  instead of a node rejection. (Full dynamic display reserve needs the
  adapter interface to go async — deliberately deferred, cosmetic.)

### 5. Retry semantics (client, SendReview surface)

- Route 409 (previous send unsettled) → not an error tone: "Your previous
  send is still confirming — this usually takes under a minute." with the
  recorded hash linked.
- Transport failure on the execute call itself → client polls the send
  record briefly (GET by row id) → settled confirmed → show success;
  otherwise the 409 guard protects any impatient retry anyway. No blind
  client retries anywhere.
- The nonce is pinned in the record: even in the worst race (two tabs), both
  EVM txs are built off the same recorded/pending nonce → the chain lets at
  most one apply.

### 6. Carve-in (3 lines): LI.FI EVM leg gas fallback

[lifi/execute.ts:106](../../packages/web/src/lib/lifi/execute.ts) —
`gas: BigInt(tx.gasLimit ?? '0')` would broadcast with gas 0 if LI.FI ever
omitted the field. Fallback to `client.estimateGas` when absent.

## Every scenario

| Scenario | Outcome |
|---|---|
| Send to normal wallet | estimate=21000, works as today, row confirmed |
| Send to contract that accepts ETH | estimated gas, succeeds (today: guaranteed failure) |
| Send to contract that rejects ETH | blocked BEFORE signing, fee saved, clear message |
| Node rejects broadcast | row failed + reason, retry immediately allowed |
| Response lost after node accepted | row submitted → reconciler confirms ≤2 min; meanwhile new sends 409-blocked → **double send impossible** |
| Tab closed right after signing | server already owns broadcast + record; send completes |
| DB down | request aborts before broadcast — nothing moved |
| Two tabs racing | 409 guard; EVM nonce collision as physics backstop |
| Old app bundle mid-deploy | old client-side path still works (adapters changed, routes additive) — no breakage window |
| SOL send unknown | blockhash expiry bounds it; reconciler settles; guard blocks retries meanwhile |

## Files

- **new** `api/send/execute/route.ts` (record → broadcast → settle; ownership from signed tx)
- **new** send probe support in `server/tx-records.ts` (send_logs pass in the reconciler; EVM/SOL probes)
- `send-adapters/ethereum.ts` — estimateGas + build/sign only, broadcast via the route
- `send-adapters/solana.ts` — sign only, broadcast via the route
- `send-modal.tsx` / `SendReview` — 409 + polling states (exact wiring read at implementation)
- `lifi/execute.ts` — the gasLimit fallback
- `prisma/schema.prisma` — SendLog model (+ user-run SQL above)
- conformance test: new route is withAuth (auto-covered)

## Tests

- Pure: send settlement decisions (receipt found/failed/missing × age ×
  nonce-consumed), the 409-guard predicate, EVM amount/destination
  cross-check against a real signed tx (viem in jest).
- Manual matrix (staging): normal send · send to a contract (e.g. WETH
  contract accepts deposits) · kill network mid-send → row settles, no
  double send possible, UI recovers.

## Deployment order

1. Niko runs the send_logs SQL (one shared DB, one run).
2. Merge + deploy.
3. Staging: one ETH send → `send_logs` row goes pending → submitted →
   confirmed; Etherscan hash matches the row.

## Explicitly out of scope

ERC-20/SPL sends (no UI exists), BTC (already safe), swap-leg double-send
hardening beyond the carve-in (CCTP/LI.FI have their own state machines),
async dynamic display reserve (cosmetic).
