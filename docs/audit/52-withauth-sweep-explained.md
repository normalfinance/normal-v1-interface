# 52 — The withAuth sweep, explained

Companion to [50-ci-and-withauth-plan.md](50-ci-and-withauth-plan.md) (the
inventory and decisions). This explains the batch that finished the job: every
API route now authenticates by default, and a test makes that permanent.

---

## 1. What problem this finishes

Next.js routes are **born public** — authentication exists only where a
developer remembered to paste the check. Across this project that produced
four incidents (log-transaction, wallet/activity, broadcast-btc, and the
referral POST found *during this very sweep*). The `withAuth` wrapper from the
last batch inverted the default for three routes; this batch made it the rule
for all of them.

A route now reads:

```ts
export const POST = withAuth(async (request, { user }) => { ... });
```

The wrapper authenticates before the handler runs and hands over the verified
`user`. Forgetting auth is no longer a thing that can happen silently — an
unwrapped route *looks* different, and (section 4) a test fails if one appears.

## 2. What was migrated — 40+ handlers across 37 files

Three shapes existed, and each needed its own treatment:

- **The standard shape** (28 files): handler starts with the copy-pasted
  token-fetch → user-fetch → `if (!user) return 401` block. A script stripped
  the block and wrapped the handler; TypeScript then re-verified every file.
- **The edge-config family** (7 files: send, transaction, referral/*): these
  already compose through `createEdgeConfigHandler(innerHandler)`. The inner
  handlers got wrapped, so the chain is now *edge-config → withAuth → logic* —
  their logging/kill-switch layer still runs first, auth still precedes any
  route logic.
- **The custom pair**: `cctp/transfers/[id]` authenticated inside a helper
  shared by GET and PATCH — the helper now takes a `userId` and only answers
  ownership, while withAuth owns authentication. And `wallets/link` compares
  the raw token against an admin secret, so the wrapper's context now carries
  `accessToken` for exactly this kind of rare need.

**A subtle ordering change, accepted on purpose:** requests that are both
unauthenticated *and* malformed used to sometimes get the "malformed" error;
now they always get 401 first. We do zero work for anonymous callers.

## 3. The doors that were fully open (finding #50 — all closed)

The route inventory found routes with **no auth and no rate limit at all**:

| Route | What an anonymous caller could do | Now |
|---|---|---|
| `savings/deposit` / `savings/withdraw` | burn our DeFindex API quota — the exact quota behind the 429 incident | auth + per-user rate limit |
| `fees/build-payment` | have us build transactions for free | auth + per-user rate limit |
| `lifi/status` | drain LI.FI quota through our key | auth + per-user rate limit |
| `lifi/statuses` (batch) | same — **caught by the new test on its first run** | auth |
| `referral/user` POST | create database rows anonymously — found mid-sweep | auth |
| `portfolio/activity` | read the old activity system | auth (stopgap — the route's real fate is deletion in the scheduled consolidation) |

None of these could move funds — they build *unsigned* transactions or read
status — so this was quota-theft and probing surface, not theft. But the
DeFindex pair meant a stranger with a loop could recreate the savings outage
on demand. Not anymore.

**The other half of each fix was client-side:** these routes' callers had
never needed to prove who they were, so six fetch sites (savings deposit /
withdraw / fees ×2, both LI.FI status polls) now send the auth headers the
rest of the app already sends everywhere.

## 4. The test that makes this permanent

`src/app/api/route-auth-conformance.test.ts` — the most important artifact of
the batch. It walks **every** `route.ts` under the API directory and asserts,
for each: either the file uses `withAuth`, or the route is in a short
allowlist **with a written reason** (public quotes shown before a wallet
exists, address-keyed public chain data, cron-secret routes…).

Three properties worth understanding:

- **A new public-by-accident route fails CI on the PR that adds it.** The
  error message tells the author exactly what to do: wrap it, or allowlist it
  with a reason a reviewer can judge.
- **The allowlist keeps itself honest**: a route that gains auth but stays
  listed also fails — the list can only contain real exceptions — and a
  listed route that stops existing fails too.
- **It proved itself immediately**: on its very first run it flagged
  `lifi/statuses`, which every human pass over the inventory had missed.

It reads source text rather than importing the routes — importing would drag
prisma and Supabase into jest for no extra proof.

## 5. What to take away

- **Defaults beat discipline.** Four incidents came from one wrong default.
  The fix wasn't "be more careful" — it was making the safe thing the path of
  least resistance and the unsafe thing loud.
- **Inventories find what reviews miss.** Both bonus finds (`lifi/statuses`,
  the referral POST) came from mechanical enumeration, not from reading code
  "carefully".
- **A guard that only exists in people's heads dies with their attention.**
  The conformance test is the sweep's memory, running on every PR forever.
