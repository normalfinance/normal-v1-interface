# 63 — Balance freshness (#62), explained for juniors

Branch: `fix/balance-freshness`. Design: [62-balance-freshness-plan.md](62-balance-freshness-plan.md).
Both key design rules came from Niko's review of the first draft.

## The two complaints, and the one root cause

- A finished SOL send left the old balance on screen for "a few refreshes".
- A finished ETH→SOL swap briefly looked like the funds were lost.

Both happened because we refreshed balances on **timer guesses** (instantly,
+8s, +45s) instead of on the **real signal** ("the chain confirmed it"):

- The instant refresh runs before the chain confirms → it reads the OLD
  balance → our server caches that stale answer AND starts its anti-abuse
  cooldown → the +8s refresh gets served the stale cache → truth waits for
  +45s. This was the 7th finding caused by a timer standing in for a signal.

## Fix 1 — swaps: "Done" is not shown until the money is visible

Niko's rule: never display "Done" against a balance that hasn't caught up.

- When the bridge reports the swap delivered → we now refresh the
  **destination chain's** balances FIRST → only then the modal flips to
  Done.
- Safety valve: the wait is capped at 10 seconds. The funds ARE on-chain the
  moment the bridge confirms — a hiccuping refresh must not make a
  successful swap look stuck.
- We deliberately do NOT compare before/after balance numbers — slippage,
  fees, and other transactions landing in between make that comparison lie.

## Fix 2 — sends: refresh at the moment of confirmation, not on a timer

- After a send broadcasts, a small watcher asks the chain directly (no
  server, no cache, no cooldown): "confirmed yet?" — SOL answers in ~2
  seconds, ETH in ~15–30. Hard caps (60s/90s), then it stops forever.
- The moment the chain says confirmed → ONE balance refresh fires — the one
  moment a refresh is guaranteed to read the new number.
- The success message now also tells the truth about exchanges: we can see
  funds arrive at the destination **address**; nobody can see Coinbase
  credit its **internal account** — so we say it may take them a few extra
  minutes. That's the honest maximum.

## Fix 3 — MAX can never offer money that already left

Niko's catch: send SOL → the balance display lags a few seconds → open swap
→ MAX would offer the pre-send balance → the chain would reject it with a
confusing error.

- Every place that OFFERS money now computes
  **spendable = displayed balance − pending outflows**, where pending
  outflows come from ledgers we already keep: the pending-send rows and a
  registry of in-flight swap source amounts.
- This is a pure calculation, recomputed every render — deliberately NOT an
  optimistic write into the balance store, because stored fake numbers
  fighting refreshes is exactly what caused the stuck-balance bugs (#52,
  #55). Nothing stored → nothing can stick, clobber, or need reconciling.
- The display may lag a few seconds; the app can no longer OFFER committed
  money. When the send confirms, the pending row clears and the adjustment
  vanishes by itself.

## Two follow-ups from Niko's live retest (same day)

- **The swap row said "pending" after delivery.** The server caches the
  bridge status for 30 seconds, and the feed asked right when the swap
  finished — so it was served the stale "PENDING". Now the tab that ran the
  swap tells its own feed the terminal state directly (a session-local
  override); the server cache catches up for everyone else within 30s.
- **"Previous send is still confirming" blocked a NEW send even though the
  previous one was long confirmed.** The one-send-at-a-time guard only
  unblocked when the background job settled the record — every 2 minutes in
  production, and never on localhost. Now the guard checks the chain the
  moment it trips: if the earlier send is confirmed or failed, it settles
  the record right there and lets the new send through. Only a genuinely
  unknown outcome still blocks — which is exactly the case the guard exists
  for.

## How to test (do → see)

- Send SOL → balance updates within a couple of seconds of on-chain
  confirmation, no manual refreshes.
- Immediately after sending, open swap and hit MAX on SOL → the offered
  amount already excludes what you just sent.
- Do an ETH→SOL swap → the modal shows Done only once the SOL balance is
  already updated — no "lost funds" moment.
- Send to Coinbase → success message notes the exchange may take a few
  minutes; the pending badge in Activity clears when the chain confirms.
