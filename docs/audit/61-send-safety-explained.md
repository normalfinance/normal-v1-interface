# 61 — Send safety (#29), explained for juniors

Branch: `fix/send-safety`. Design: [60-send-safety-plan.md](60-send-safety-plan.md).

## The two bugs we killed

**Bug 1 — the gas guess.** Ethereum transactions carry a gas budget. Ours
was hardcoded to 21000 — the exact cost of a wallet-to-wallet transfer. But
many addresses are programs (most exchange deposit addresses, all smart
wallets), and paying a program costs more.

- If you sent ETH to one of those → out of budget → the chain cancels the
  send **but keeps the fee** → you paid for a guaranteed failure.

**Bug 2 — the double send.** After broadcasting, we wait for the node's
answer. If the connection died after the node accepted → the screen said
"failed" while the send was live → the user retried → and here is the trap:
Ethereum gives the retry the NEXT transaction number (it counts the first
send it already has), so the two sends don't collide — **both go through**.
No server record existed, so nobody would even notice.

## What changed — cause and effect

- If you send now → the app first asks the network what this exact send
  costs. A normal wallet: 21000, same as ever. A contract: its real cost —
  the send now works. An address that can't accept ETH: **blocked before
  you sign or pay anything**, with a message telling you to check the
  deposit address.
- If your amount plus the real fee exceeds your balance → you get "reduce
  by about X" instead of a raw node error.
- Your passkey still signs everything (custody unchanged) — but the signed
  bytes now go to our server, which **writes the record first, then
  broadcasts** — exactly how Bitcoin sends have always worked here. The
  server decodes the signed transaction and checks the amount, destination,
  and that the sender inside it is really your wallet — the record cannot
  lie, and the route cannot be used to relay someone else's transaction.
- If a send's outcome is ever unknown → the server **refuses to broadcast
  another send on that chain** until the blockchain answers ("your previous
  send is still confirming"). The every-2-minutes job asks the chain and
  settles the record — usually within seconds — which unblocks you
  automatically. Double sends are now structurally impossible: there is no
  path where send #2 exists while send #1 is in limbo.

## One design rule worth remembering

The broadcast-error classifier is deliberately paranoid **in one
direction**: only definitive node rejections ("insufficient funds", "nonce
too low"…) mark a record as failed. "Already known" counts as success (a
previous attempt made it). Anything ambiguous stays *unknown* — because
marking a possibly-live transaction "failed" would be a lying record, and a
lying record is worse than a late one. The chain itself is always the final
judge.

## What changed, by category

**New (2):** `send_logs` table (+ user-run SQL in doc 60),
`api/send/execute` (decode → cross-check → ownership → guard → record →
broadcast → settle). **Server (2):** `server/send-records.ts` (classifier,
base58, probes, reconciler pass), cron route runs the send reconciler.
**Client (2):** ETH adapter (estimateGas + balance preflight + funnel), SOL
adapter (funnel). **Carve-in (1):** LI.FI EVM leg estimates gas if a quote
ever omits its gas limit. **Tests:** 9 new (158 total).

## How to test (do → see)

- Send ETH to a normal wallet → works as always; `send_logs` row goes
  pending → submitted → confirmed.
- Send ETH to a contract that accepts it (e.g. the WETH contract) → now
  succeeds; before this fix it burned your fee and failed.
- Kill your network right after confirming a send → the app may say it is
  confirming; trying again immediately says "previous send still
  confirming" — and about a minute later everything is settled and correct.
  At no point can the money leave twice.
