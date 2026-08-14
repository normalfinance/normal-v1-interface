# 71 — XLM savings guard + fee semaphore, explained for juniors

Branch: `fix/xlm-savings-guard`. Plan: [70-xlm-savings-guard-plan.md](70-xlm-savings-guard-plan.md). Finding #67.

## The problem in one sentence

Savings money moves on Stellar, and every move costs a little XLM — so a
user who sends or swaps away ALL their XLM has locked themselves out of
their own savings.

## What was broken (three holes, one of them a surprise)

1. **The MAX button kept a 1 XLM buffer… for the wrong people.** It
   triggered on "has a USDC trustline", not "has savings" — so a user with
   zero deposits was docked 1 XLM for no reason, while the real protection
   was…
2. **…bypassable by typing.** The typed-amount check only knew about the
   network reserve. Cause and effect: type your full balance instead of
   pressing MAX → the send goes through → savings stranded.
3. **Swaps had no reserve AT ALL — not even the network one.** A true MAX
   XLM swap offered the ~2 XLM Stellar itself refuses to release, so the
   transaction failed on-chain for everyone, saver or not. (Found while
   building this; fixed by the same change.)

## The fix — one rule, computed in one place

`spendableXlmForOutflow(balance, subentries, hasActiveSavings)` in
`utils/stellar-reserve.ts`:

    spendable = balance − network reserve − tx fee − (1 XLM if you have savings)

Send MAX, send typed-amount validation, swap balance, swap MAX and the
Soroswap engine all read this one helper — they can never disagree. The
trigger is the REAL savings position (the same shared cached read savings
uses), not the trustline proxy. While the position is still loading, MAX
stays conservative (old proxy behavior) but typing is never blocked on a
guess. The Soroswap engine's own ad-hoc "minus 1 XLM" was deleted — with
the reserve now inside the balance, it would have been subtracted twice.

Niko's decisions, locked: **no override** (the reserve always holds while
savings exist — withdrawing everything lifts it automatically) and
**1 XLM** buffer.

Deliberate layering: the execution-time check in `use-send-token` still
enforces only the NETWORK reserve. It exists to stop `op_underfunded`;
making it savings-aware would let a stale position cache reject a
legitimate full send after the UI already approved it.

## The semaphore — always on, one classifier

`xlmFeeStatus(balance)` → green / yellow / red, from the same constants
the guard and the action-block use, so the three can never tell different
stories:

- 🟢 **green** (≥ 1 XLM free for fees): "XLM fee reserve healthy" — a
  quiet one-liner on the savings card. Visible on purpose: silence used to
  mean "fine or broken, who knows".
- 🟡 **yellow** (0.5–1): amber banner — "about one more action left" with
  the exact number, plus three one-tap fixes: **Swap USDC → XLM** (deep
  link `/swap?from=USDC` — savers always hold USDC, so this is the
  fastest), Buy XLM, Receive XLM.
- 🔴 **red** (< 0.5): red banner — deposits/withdrawals are paused (the
  buttons were already blocked at exactly this threshold; now the why is
  on screen), same three fixes. Re-checks every 4s so it clears itself the
  moment a top-up lands.

Why the light matters even with the guard: the guard only controls
outflows made in OUR app. Lobstr/Freighter users can spend XLM elsewhere,
Soroban fees can spike, and pre-guard users may already be drained — the
light detects what the guard cannot prevent.

New savings-page card ("Network fees (XLM)", above "Need USDC?"): the
plain-language version — why XLM is needed, why Send/Swap show slightly
less than the full balance while you have savings, your live fee-available
number, and the Get-XLM shortcut when not green.

## Who sees what

- **New user, no savings**: nothing changes anywhere; the guard activates
  on their first deposit.
- **Saver with headroom**: Send/Swap MAX ≈ balance − ~1.5 network reserve
  − 1 buffer; typing past it says "Keeps X XLM for network & savings
  fees", not a bare "insufficient".
- **Existing saver already low**: the guard takes nothing (that XLM was
  already locked by the network) — they now SEE why, in color, with a fix
  button. No migration; everything derives live from balance + position.
- **Saver leaving**: withdraw all → position 0 → guard lifts by itself.

## Tests

11 new unit tests (`stellar-reserve.test.ts`): the buffer's exact size,
the zero floor inside the protected zone, subentry scaling, every
semaphore boundary (0.5 and 1.0 edges), and the invariant that an account
the guard just protected always classifies green. Swap-card component
test extended with the savings-position mock. 191 total.
