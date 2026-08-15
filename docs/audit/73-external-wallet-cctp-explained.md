# 73 — External wallets × CCTP, explained for juniors (chunk by chunk)

Branch: `feat/external-wallet-cctp`. Design: [72-external-wallet-cctp-design.md](72-external-wallet-cctp-design.md).

## The goal in one sentence

A user whose Stellar wallet is Lobstr or Freighter should be able to swap
USDC into BTC/ETH/SOL — which physically requires our passkey (Normal)
wallet, because external Stellar wallets cannot sign on other chains —
without ever losing sight of their own wallet, and without extra
signatures per swap.

## Chunk 1 — stop the app from swapping wallets behind your back

**The problem.** The app has ONE "connected wallet" slot — like a TV with
a single HDMI input. Everything on screen reads from it. Two background
behaviors used to shove a different wallet into that slot uninvited:

1. **Wallet creation stole the screen.** Create a Normal wallet while
   Lobstr is connected → Lobstr vanishes from the whole app mid-flow.
2. **The "self-heal" hijacked an empty slot.** Whenever the slot was
   empty, a recovery routine plugged the Turnkey wallet in. Good on a new
   laptop (your wallet just appears — that's why the routine exists);
   terrible after a deliberate disconnect of an external wallet — reload
   and you're silently in a different wallet (bug #42).

**The fix.** A tiny persisted breadcrumb: `lastWalletType` — the wallet
type you last CONNECTED, kept even after disconnect. Now an empty slot
has two distinguishable meanings:

- breadcrumb absent → fresh device / cleared storage → restore the
  Turnkey wallet (new-laptop login works exactly as before)
- breadcrumb says "lobstr" → you disconnected on purpose → stay
  disconnected

And wallet creation now adopts the new wallet into the slot ONLY when the
slot is empty (signup — unchanged). With an external wallet connected,
the new Normal wallet is linked to the account but the screen stays put.

The decisions live in one pure file (`lib/wallet-slot.ts`) with the
design invariants as named tests — I1 "creation never steals",
I2/I7 "external disconnect stays disconnected", I5 "signup still adopts",
I6 "new-device login still restores". If any future change breaks one of
these promises, a test with that name fails.

## Chunk 2 — show everything the account owns, split by wallet

**Server.** `/api/wallet/portfolio` now returns a `companionStellar`
field — the Normal wallet's XLM/USDC — whenever the CONNECTED wallet is
external. Cost: exactly one extra Horizon call, sharing the cached
prices, riding the existing 15-second cache. Nothing changes for
single-wallet users.

**Drawer.** With both wallets present, the Assets tab shows two labeled
groups: "Normal wallet" (its XLM/USDC + BTC/ETH/SOL) and "Connected
wallet" (the external wallet's tokens), each with its shortened address.
Two rules worth understanding:

- **Numbers are never summed across wallets in the lists.** A combined
  "XLM 20" row would be a number NO single action could spend — the same
  class of trust-break as the savings display bug we spent a week on.
  The Total-balance row at the top does sum the account, because a total
  is information, not an action.
- **A companion with zero balances is hidden.** An unactivated wallet in
  the drawer would only confuse; the guided flow (chunk 3) introduces it
  properly.

**Why no database change?** People expected one. The tables already
support coexistence: `turnkey_wallets` = one Normal wallet per account;
`linked_wallets` = MANY external wallets per account (every connect
links one automatically). Only the browser's "who signs right now" slot
is single — necessarily, since an external wallet signs only while its
app session is open.

**The unlink guard.** The settings page happily offered to unlink the
Turnkey wallet — the wallet holding all the user's funds and the row our
swap-logging ownership checks rely on. Now the server refuses (400) and
the settings card explains instead of offering the button. Two layers on
purpose: a UI bug can't reopen the hole.

## Chunk 3 — the guided "get a Normal wallet" popup (SHIPPED, see below)

**Who sees it: only an external-wallet user who tries a cross-chain
swap.** Signup/onboarding is untouched — same asset-first flow as
today, pinned by test I5. Turnkey users never see the dialog.

**The trigger.** Today, an external user picking USDC → BTC hits a dead
button. Now the button says "Continue with your Normal wallet" and opens
a dialog that walks through the four physically-required steps, each at
the moment it's needed:

1. **Create** — one passkey ceremony makes the Normal wallet (chunk 1's
   guard keeps Lobstr connected — the screen doesn't blink).
2. **Activate** — a new Stellar account doesn't exist on-chain until it
   receives XLM (Stellar's rule, not ours). Pre-filled 4 XLM payment
   from the external wallet; approve in Lobstr. Editable, and 4 XLM
   lands the new wallet semaphore-green (#67) from day one.
3. **Trustline** — Stellar accounts opt in to each asset; one passkey
   tap adds the USDC line (signed by the passkey because the SOURCE of
   this transaction is the Normal wallet — the universal signer picks
   the signer from the transaction's source account).
4. **Fund** — pre-filled USDC payment (the swap amount) from the
   external wallet; approve in Lobstr.

**Resumable by construction.** Each step is DERIVED, not remembered:
opening the dialog asks "does the wallet exist? is it on-chain? does it
have the trustline? does it hold enough USDC?" and starts at the first
unmet condition. Kill the tab after any step — reopening resumes
exactly there. A returning user with a funded Normal wallet skips
straight past the dialog.

**One-time cost: 2 passkey ceremonies + 2 external-wallet approvals.**
After that, every swap is passkey-only — the same experience as a
native Normal-wallet user, and the #33 signature-reduction program
applies to these users automatically.

**Also in this chunk:** the drawer's "+" button becomes **"Connect
external wallet"** for users who already have a Normal wallet (opens the
wallet-kit picker directly); the ⟳ button is renamed "All wallets"; and
the onboarding wizard's create-wallet path got the same no-steal guard
as chunk 1 (the last remaining slot-stealer).

## Chunk 4 (next) — the swap itself

The CCTP engines learn to read the Normal wallet explicitly while an
external wallet is connected: burn from it, deliver to it, display its
USDC as the swap balance ("From Normal wallet"). The gate disappears;
the guided dialog + engines connect end to end.

## Chunk 3 field note — "my assets disappeared" (and why they hadn't)

First live hybrid test: connecting an empty Lobstr made the portfolio
page drop from $32 to $1.86 and pop "Set up Normal Savings" — while the
drawer showed both wallets correctly. Nothing was lost: page surfaces
read the CONNECTED wallet's Stellar assets, and the connected wallet had
just become an empty Lobstr. Cause and effect: slot switches → any
surface reading only the slot shows the new wallet's (empty) numbers.

Fixed the two offenders: the portfolio page now folds the Normal
wallet's XLM/USDC back in as rows labeled "· Normal wallet" (the page is
the account-wide wealth view; labels keep every number honest), and the
savings setup no longer nags you to activate a SECOND wallet when your
account already has a working Normal wallet. The general lesson for this
feature: every surface must decide explicitly whether it shows THE
ACCOUNT or ONE WALLET — defaulting to "whatever is connected" is how
assets appear to vanish.

## Chunk 4a — the swap actually runs (engine wiring)

The design for the whole of chunk 4 is doc 72 §4h — six scenarios
covering every place funds can sit. 4a ships the foundation:

- **The engine's Stellar side is now an explicit input.** For an
  external-wallet user the CCTP engine burns from / delivers to the
  companion Normal wallet — passed in explicitly, never guessed. If the
  companion is missing, the card shows the setup CTA; the engine never
  silently falls back to the connected wallet. (Silent fallback is how
  money ends up in the wrong place.)
- **The gate became a ladder.** Before: external user → everything off.
  Now: no companion → "Continue with your Normal wallet" (setup dialog);
  companion exists but needs something → the button names it and opens
  the dialog at exactly that step — "Set up your Normal wallet", "Add
  USDC to your Normal wallet", "Top up XLM to swap"; everything ready →
  the swap just runs, passkey-only.
- **New preflight: fee XLM.** The outbound burn pays its Stellar fee in
  XLM from the Normal wallet — a wallet the user may never have topped
  up. The engine checks it (same 0.5 threshold as savings and the #67
  light), and the setup dialog's XLM step now doubles as a top-up
  (deriveSetupStep gained the low-XLM condition, with a test).
- **Balance honesty:** for hybrid users the card's USDC balance shows
  the Normal wallet's USDC labeled "· Normal wallet" — the number the
  swap will actually spend.
- **Free win:** the same gate rework un-gates BTC↔ETH↔SOL swaps (pure
  Turnkey-chain, no Stellar involved) for external users — that was
  sub-chunk 4d, delivered early.
- Tests: the gate suite gained two cases — hybrid user's engines are
  live and pinned to the companion address; normal-wallet users get no
  override at all. 206 total.

Still to come: 4b the "Move X USDC from Lobstr & swap" inline funding +
source picker, 4c the "Deliver to" selector for inbound.

## Chunk 4b — swapping straight from the external wallet (move-and-swap)

Niko's decision: the user PICKS which wallet funds a cross-chain swap.

- **The source picker.** On USDC → BTC/ETH/SOL pairs, a hybrid user sees
  two pills above the amount: "Normal wallet · 27.48" and
  "Lobstr · 12.50". Balance, validation and MAX all follow the selected
  pill — every number on screen is spendable by exactly the wallet named
  next to it.
- **Picking the external wallet = move-and-swap.** The button itself
  announces the plan: "Move 12.50 USDC from Lobstr & swap", with a
  helper line underneath spelling out the two halves (one approval in
  Lobstr, then passkey). Nothing is ever silent: the progress modal
  gains a first step — "Moving USDC from Lobstr" — and the move is a
  normal recorded transfer in the activity feed.
- **The safety rule that makes it sound:** the engine does not touch the
  bridge until the moved USDC is VISIBLE on the Normal wallet. The
  funding call resolves only after re-reading the companion's balance
  (bounded retries) — the same verify-before-act rule as #62 — so a
  burn can never fire against money that hasn't arrived. If the move
  fails or is declined, the error says plainly: "nothing was swapped".
- **A trustline subtlety caught in review:** the move DELIVERS USDC to
  the Normal wallet, which therefore needs its USDC trustline even for
  an outbound swap — the trustline preflight now covers both directions
  whenever the funding path is active.

With 4a + 4b, every scenario in the design matrix except the inbound
"Deliver to" choice (4c) is live.
