# 67 — Layer-1 cache (P0-1), explained for juniors

Branch: `feat/layer1-cache`. Design: [66-layer1-cache-plan.md](66-layer1-cache-plan.md).
This was the register's one item marked "mandatory between 1,000 and
10,000 users."

## The problem, in one picture

- Before: every user's **browser** asked Bitcoin's explorer and the
  Ethereum/Solana networks directly for balances — on every visit to the
  swap page, every open of the send dialog.
- Cause and effect: 1,000 users with the swap page open → thousands of
  direct calls to services with strict rate limits → they start refusing us
  → balances fail for everyone at exactly the moment we have the most
  users. Cost and risk grew with **users × open views**.

## The fix, in one sentence

The server asks once and everyone shares the answer — the swap and send
views now read the same server-cached portfolio the portfolio page has
been using all along.

## How it works now

1. One server endpoint aggregates ALL chains' balances + prices, caches
   the response for 15 seconds, and keeps a one-hour "last good" snapshot
   per user.
2. One shared client subscription reads it — the portfolio page, the swap
   card, and the send dialog all share a single request instead of five.
3. After a send or swap confirms → one cache-bypassing refresh of that
   shared data (the server rate-floors the bypass, so it can't be abused).
4. If a chain's data source is down → the server serves the last-good
   snapshot marked "stale" — the UI keeps showing real numbers instead of
   a lying zero. (The old BTC hook did this client-side; now every chain
   gets it, server-side.)

Deliberately NOT moved to the cache (the standing data-layer rule —
display reads share the cache, **action-time reads stay live**): the
off-ramp's balance preflight, transaction-confirmation probing, and the
Bitcoin fee quote. When money is about to move, we always ask the chain
directly.

## The bonus bug this caught

The #62 "don't show Done until balances are refreshed" gate was awaiting
the wrong function — it refreshed the wallet's **addresses**, not its
**balances** (the names were one word apart: `refetch` vs
`refetchBalance`). Balances still updated via a background event, so users
rarely noticed — but the guarantee wasn't what the design claimed. Now the
gate awaits a true, cache-bypassing balance refresh. Lesson: a guarantee
you haven't traced end to end is a hope, not a guarantee.

## Follow-up from Niko's live retest (the drawer SOL lag)

After an ETH→SOL swap said Done, the drawer showed the old SOL for a few
seconds. Why: the arrival refresh can run a beat before the chain's RPC
reflects the just-delivered funds — and under the shared cache, that
too-early answer got locked in for 15 seconds for every surface at once.
It *looked* fine before this batch only because the old drawer re-fetched
directly on every open — luck, not a guarantee, subsidized by the exact
per-view fetching we removed. Fix: the arrival gate now **verifies** the
destination balance actually moved; if it didn't, it waits just past the
server's anti-abuse floor and refreshes once more before showing Done.
One bounded retry, condition-driven — and because it repairs the shared
cache, the drawer, swap card, and portfolio all show the delivered
balance the moment Done appears.

## Follow-up 2 from Niko's retest (the send form wiped itself)

Typing an amount in the send dialog instantly snapped back to 0. Why: the
old hooks kept the token in React state — the same object between fetches.
The new selector hooks rebuilt the token object on **every render**, and
the send dialog had an effect watching the token list to reset the form on
open — so every keystroke's re-render looked like "the list changed" and
wiped the input. Fixed on both sides: the hooks now memoize the token (its
identity only changes when the data does), and the dialog's reset fires
only when it opens — a background balance refresh updates the selected
token's numbers without ever touching what you typed. Lesson: when you
replace "fetch into state" with "derive on render", object identity
changes meaning — every consumer that watches identity must be audited.

## How to test (do → see)

1. Open the swap page with DevTools → Network. You should see ONE
   `/api/wallet/portfolio` request — and **no** requests to
   `mempool.space/api/address/...`, `publicnode.com`, or any raw RPC for
   balances. (The mempool **fees** request when opening a BTC send is
   expected — that's an action-time read.)
2. Balances on the swap card match the portfolio page exactly — they are
   now literally the same data.
3. Do a swap or send → balances update just like before (the #62
   confirmation-driven refresh rides the same shared pipeline).
4. Finish a LI.FI swap → "Done" appears with the destination balance
   already updated — and now that's guaranteed by an awaited refresh, not
   by luck.

## Tests

4 new (178 total): the PortfolioAsset→Token mapper — legacy shape
preserved, missing row → null (absent beats a lying zero), null
balance/price → "0" strings, stale rows still display.
