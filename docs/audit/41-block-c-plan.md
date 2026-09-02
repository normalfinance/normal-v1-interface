# 41 — Block C: close the open write routes. Plan.

**Status: plan, then implement.** Sized S–M.

## What's wrong today

`swap/log-transaction` and `savings/log-transaction` accept POSTs from
**anyone**. Proven on staging: an unauthenticated request with a deliberately
invalid body returned a *validation* error (400), not a 401 — meaning it
reached business logic with nothing guarding the door.

Consequences, in order of severity:

1. **Fabricated financial records.** Anyone can write swap and deposit rows for
   any wallet address. These feed the Dune dashboard and the figures we report.
2. **Corrupted user-facing money figures.** `savings/log-transaction` writes
   `vault_deposits`, which is the fallback source for `totalDeposited` — the
   exact number behind the "deposit displayed as earnings" bug. Its integrity
   now affects what users read as their money, not just analytics.
3. **Unbounded writes.** Neither route is rate-limited, so the database can be
   filled at will.

## Two facts that shape the design

**Checked before designing, not assumed:**

1. **All three callers send no auth headers today**, and all are
   fire-and-forget (`.catch(console.error)`). Adding auth without updating them
   would make logging fail *silently* — we'd notice only when analytics went
   quiet. The callers must be updated in the same change.
2. **Swapping already requires a login session** (`src/sections/swap/index.tsx`
   renders "sign in" when there's no user). So requiring authentication locks
   out no legitimate user. This was the assumption that could have broken
   external-wallet users, so it was verified first.

## Design: authenticate AND verify ownership

Authentication alone is not enough. If we only check "is this a real user?",
any logged-in user could still write rows claiming *someone else's* wallet
address — the body is attacker-controlled.

So the rule is: **the claimed `walletAddress` must belong to the authenticated
user.** Two legitimate sources of ownership:

- `linked_wallets` — `(supabaseUid, walletAddress)`, the wallets a user has
  connected;
- `turnkey_wallets.stellarAddress` — the wallet we created for them.

If the address matches neither, reject with 403. That closes both the anonymous
case and the authenticated-impersonation case.

## Why not derive the address from the session instead of accepting it?

Tempting, and stricter. Rejected because a user can legitimately hold several
wallets and the client knows which one performed the swap; the server would
have to guess. Verifying the claim is as safe and doesn't lose information.

## Changes

1. **`lib/wallet-ownership.ts` (new)** — one helper, `userOwnsWallet(uid,
   address)`, so both routes share the rule rather than each implementing it.
2. **Both write routes** — require a session, verify ownership, then proceed.
   Rate-limit as a second line of defence.
3. **All three callers** — send `buildAuthHeaders()`, and **log failures
   loudly**. Fire-and-forget is right (a failed log must never break a
   completed swap), but silent is not: a 401 or 403 needs to be visible.
4. **`lifi/quote` + `swap/quote`** — rate-limit. These stay unauthenticated on
   purpose (quotes are shown before a wallet is connected), but they proxy
   services we pay for, so they need a ceiling.

## Not in this change

- **#2 (public activity-by-address reads)** — needs Niko's decision; chain data
  is public anyway, so this may be intentional. Read-only, no integrity risk.
- **#30 (turbo env vars)** — unrelated to security; separate commit.
- **The full rate-limit sweep across all 55 routes** — this change covers the
  routes that write or cost money. A blanket sweep deserves its own pass.

## Verification

- Unauthenticated POST to both write routes → **401** (previously 400).
- Authenticated POST claiming someone else's address → **403**.
- A real swap and a real deposit → still logged; row appears.
- Repeated quote requests → **429** after the limit.
- Watch for the new failure log: if logging breaks, it must be visible.

## Risk

Medium — this touches the path that records completed swaps and deposits. The
mitigations: callers updated in the same commit, failures made loud rather than
silent, and the fire-and-forget shape kept so a logging failure can never break
a user's transaction.
