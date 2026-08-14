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
