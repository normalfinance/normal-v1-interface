# 69 — Wave-4 reliability (#8 · #24 · #10), explained for juniors

Branch: `chore/wave4-reliability`. Design: [68-wave4-reliability-plan.md](68-wave4-reliability-plan.md).

## The theme

The app can no longer lose money. This batch removes the remaining ways it
could still **fall over or forget things** under real-world conditions.

## 1. The bridge robot gets its own phone line (#8)

- Our relayer — the server robot that finishes cross-chain swaps by
  minting bridged USDC and topping up gas — talked to Ethereum and Base
  through **free public endpoints** (that's what viem does when you give
  it no URL; we found four such places).
- Cause and effect: free endpoints are shared with the whole world and
  rate-limited → one bad hour there → the robot goes deaf → everyone's
  bridge transfers stall until cron retries land.
- Fix: a single `relayerTransport()` helper — if `CCTP_RPC_URL_BASE` /
  `CCTP_RPC_URL_ETHEREUM` are set in the environment, the robot uses our
  paid, keyed endpoints; if not, it falls back to today's behavior, so
  nothing breaks while the env vars roll out.

## 2. The app's memory of a Coinbase sale moves to the database (#24)

- "I still owe Coinbase a crypto send for sale X" used to live in the
  browser's localStorage — on ONE device.
- Cause and effect: clear the browser, or start a sale on the laptop and
  open the app on the phone → amnesia → the sale looks stuck and needs
  manual help. (Two separate copies of this localStorage logic existed —
  the sell modal and the activity feed.)
- Fix: a new `offramp_fills` table + one authenticated API. Claiming a
  sale, attaching the send's hash, and releasing a failed claim all go to
  the server, keyed on your login — so the memory follows the ACCOUNT, not
  the device. Existing localStorage entries migrate themselves to the DB
  the first time the new code runs, so in-flight sales survive the deploy.
- One safety rule worth noticing: a fill whose send actually happened
  (has a hash) can never be deleted — records of moved money are
  permanent; only unfulfilled claims can be released.

## 3. The database doorman (#10) — prepared, not flipped

- Today every serverless function opens its own database connection: a
  spike of users = a spike of connections = the pool fills = everything
  fails at once.
- The fix is Supabase's transaction pooler — a doorman that shares a few
  connections among everyone. It's ONE setting: the database URL.
- Why we did NOT flip it in this branch: the pooler dislikes a database
  feature Prisma uses by default (prepared statements — disabled by adding
  `pgbouncer=true` to the URL). The switch is an env change with a
  10-second rollback, so it must not ride a merge that also carries #8 and
  #24. This branch ships the proof instead: `scripts/verify-pooler.mjs`
  runs the exact four patterns that break on a misconfigured pooler
  (repeat queries, a transaction, concurrent reads) — all read-only. You
  flip the URL only after it prints ALL PASS.

## What we accomplish

- A cross-chain swap no longer depends on the internet's free tier.
- A Coinbase sale survives anything short of Coinbase forgetting it.
- The path to spike-proof database connections is proven and scripted,
  with a rollback measured in seconds.

## 4. Addendum (2026-08-14): why the live test swap failed, and what we changed

Niko ran the first real ETH → USDC(Stellar) swap and it failed at the very
first passkey prompt with "operation timed out or was not allowed" — and a
"Pending" row was left in the activity feed forever. Two separate lessons:

### a. The passkey bodyguard was only guarding some doors (#63, round 3 of #51)

- We HAVE a fix for exactly this error since #51: a guard that queues
  passkey prompts, waits for the previous dialog to settle, and silently
  retries one instant (<2s) failure — because an instant failure means the
  browser rejected the ceremony before any human saw a dialog.
- Cause and effect: the guard was wired into the Stellar and EVM signer
  libraries only → the LI.FI swap path (and the plain send buttons) called
  Turnkey directly → the exact same browser hiccup that #51 already solved
  killed a live swap on an unguarded door.
- This is the THIRD time narrow scoping of this guard produced a live
  failure (#51 savings → #54 external wallets → now LI.FI). The rule we
  wrote down: a ceremony guard is infrastructure — it protects EVERY door
  or it protects nothing.
- Fix: all six remaining unguarded signing sites now go through the guard.
  If the same browser hiccup happens again → the app retries it silently →
  you see one extra second, not a dead swap.

### b. A swap that dies before moving money must say "Failed", not "Pending"

- We create the transfer's database row BEFORE anything moves (on purpose —
  a crashed tab must never lose a record of moving money).
- Cause and effect: the swap died before its first transaction → the row
  stayed in its newborn "CREATED" state → the activity feed shows every
  not-finished row as "Pending" → a swap that moved zero money looked
  stuck forever.
- Fix, in three layers (client, server rule, cron janitor):
  1. The engine knows whether anything reached a chain; if not, it marks
     the row FAILED on the way out.
  2. The server accepts that mark ONLY while the row has no transaction
     hashes — so a buggy or malicious client can never bury a transfer
     whose money actually moved.
  3. The cron sweeper expires hash-less CREATED rows older than an hour —
     this is what cleans up the phantom row from the failed test, and any
     future case where the tab died before it could report.
- Trade-off we accepted (written in the code): if a transaction broadcast
  but the "attach the hash" call failed, the row could be wrongly expired.
  The money is still in your own addresses either way — only the label can
  lie, and it takes two independent failures at once.

### What we accomplish

- The WebAuthn hiccup class of failure now self-heals on every signing
  path in the app, not just savings.
- The activity feed can no longer show an eternal "Pending" for a swap
  that never moved money — and no cleanup path exists that could mislabel
  a transfer that DID move money, except the documented double-failure.

## 5. Addendum 2 (2026-08-14): the swap that succeeded but looked stuck (#64)

The retried swap WORKED — USDC arrived on Stellar, the banner above the
swap card noticed and removed itself — but the progress modal kept
spinning at "Bridging to Stellar" and the activity row said $0. Two
causes, both about reporting, not money:

- **The modal's ID badge expired mid-bridge.** The modal saved its login
  proof (auth headers) once, at swap start. A bridge takes 20-30+
  minutes; login tokens rotate underneath. Cause and effect: token
  rotates → every status check the modal makes is rejected with 401 →
  the old code treated ANY bad answer as "not finished yet" → infinite
  spinner. The banner asks for fresh proof on every poll — that's why it
  knew the truth and the modal didn't. Fix: every request now fetches
  fresh headers, a rejected answer is no longer counted as "still
  bridging", and ten bad answers in a row make the modal say honestly
  "lost connection — the swap continues on our servers" instead of
  spinning forever.
- **Only the modal knew the delivered amount.** The database's
  "delivered amount" was written by the modal at the very end — but the
  modal invites you to close it ("safe to close")! Cause and effect:
  modal dies before the finish line → delivered amount never recorded →
  activity shows $0 forever, and the feed can't recognize the incoming
  USDC as part of the swap, so it can show up twice. Fix: for inbound
  swaps the SERVER now records the delivered amount the moment the
  bridge completes (it mints 1:1, so the server knows the number
  exactly), and the cron repairs old rows stuck at $0.

Rule this reinforces (same as #62): a fact about finished money movement
must be recorded by something durable (the server), never only by a
browser tab that may not live to tell it.

## 6. Addendum 3 (2026-08-14): the $25 that was "in the bridge" for a month (#65)

While cleaning up the rows above, the cron surfaced a July swap stuck at
"mint submitted" for a month. The money had actually arrived within 30
minutes — Stellar's full history (Horizon) proved it. Our checker asked
a different service (Soroban RPC) that only remembers about a day of
history: cause and effect — confirmation missed for longer than a day →
the checker's "not found" answer became permanent → the row could never
complete, no matter how long you waited. The checker now falls back to
Horizon (which never forgets) before calling a transaction "pending".
The July row completed on the next tick with its real delivered amount.

## 7. Addendum 4 (2026-08-14): "Done" now waits for the wallet to see the money (#66)

Niko's USDC→SOL swap said Done while the SOL was still crossing from Base
to Solana — invisible in the wallet for a couple of minutes. Same lesson
as the regular LI.FI swaps (#62), applied to the CCTP engine:

- Cause and effect: the final swap leg confirms on BASE first → the SOL
  arrives on Solana 1-3 minutes LATER → the old code said Done at the
  Base confirmation → wallet shows no SOL → user thinks funds are lost.
- Fix: a new visible step — "Delivering SOL · cross-chain arrival" —
  keeps the modal honest until the bridge reports actual delivery, and
  then "Done" waits (up to 15s) for the wallet's balance to be re-read
  before it appears. So when you see Done, the number is already there.
- BTC stays different on purpose: its delivery takes many minutes, so the
  modal closes with "BTC is on its way" and the activity feed's pending
  badge tracks the arrival — a 20-minute spinner would be worse than the
  message.

**Follow-up to #66:** the banner above the swap card used to check the
server only every 30 seconds — so after the modal said Done, the banner's
spinner could linger up to half a minute. The engine already broadcasts
"something settled" at the exact moment; the banner now listens for that
broadcast and clears instantly.
