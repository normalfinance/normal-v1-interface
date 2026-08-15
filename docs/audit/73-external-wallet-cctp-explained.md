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
