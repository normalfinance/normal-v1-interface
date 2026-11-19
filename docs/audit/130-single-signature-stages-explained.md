# 130: The single-signature work, stage by stage

- Branch: `feat/single-signature-base-usdc` (pushed). Stages 0 to 4 are in commit `b0b01d15`.
- The plan, every decision and the detailed status log: doc 129.

Each stage below answers the same questions in the same order:
1. What it is, in plain words.
2. What you will see.
3. How it works.
4. How it stays safe.
5. Switches and setup.
6. How to test it.
7. Status.

---

## Stage 0: proving it would work (spikes)

**What it is.** Before building anything, three small experiments answered whether the idea works at all.

**What we learned.**
- **The "permission slip" works.** A person can sign, ahead of time, a narrow permission for one exact contract call. This is a Soroban authorization entry: "burn exactly 1 USDC to my own Base address, once, before ledger L". A separate Normal account then sends it and pays the fee.
  - We ran a real Circle approve and burn this way on Stellar testnet. Both landed, and Circle's attestation service found the burn.
  - The exact call we build by hand is what Circle's deployed contracts require, on testnet and in real mainnet burns.
- **Turnkey can sign several Stellar items with one face scan.** Its own documentation supports this for the Stellar key type.
- **Soroswap's built-in fee is a trap.** Its API now accepts our fee settings but silently drops them. Turning it on would make swaps run without Normal's fee, so it stays off.

**Status.** Done. The proof script is `scripts/permission-spike/relay-burn.mjs`.

---

## Stage 1: one face scan for savings and swaps

**What it is.** These three actions are each two Stellar transactions: the action, then Normal's fee.
- savings deposit
- savings withdraw with earnings
- XLM⇄USDC swap

Today each transaction gets its own face scan. Now one scan signs both.

**What you will see.**
- **Savings deposit:** the review shows "Approve the deposit and the fee · One signature", and you get one face scan instead of two.
- **Withdrawal with earnings, and XLM⇄USDC swaps:** the same, one scan.
- **External wallets** (Freighter, Lobstr, Ledger, WalletConnect): no change, one prompt per transaction as before.

**How it works.**
1. Both transactions are built first, the fee chained right behind the action (sequence numbers N+1 and N+2).
2. One Turnkey request (`SIGN_RAW_PAYLOADS`) signs both.
3. Each signature is checked against your wallet's key before it is used.
4. The server's fee safety net is unchanged: escrow, record before sending, cron sweeper.

**How it stays safe.**
- Saying no to the face scan stops everything.
- If Turnkey errors, it quietly falls back to two scans.
- A local key that is already unlocked still signs with no prompt.

**Switch.** `NEXT_PUBLIC_STELLAR_BATCH_SIGN`. On by default; set it to `0` to go back to two scans.

**How to test.**
- If you deposit $1 into Savings, you will see one face scan, and the deposit and its fee land.
- If you swap a few XLM to USDC, you will see one face scan.

**Status.** Built. Not live-tested yet.

---

## Stage 2a: money on Base shows in the wallet

**What it is.** Your Ethereum address is also your Base address. Two things can sit there:
- **USDC:** a held Autoinvest coin, a swap that stopped on the way, or USDC someone sent there.
- **A few cents of ETH:** sent by Normal's relayer so Base steps can pay their network fees.

The wallet never looked at Base, so this money was invisible. Now it shows.

**What you will see.**
- **Assets and Home:** "Digital dollars · USDC · Base" directly under Digital dollars, and "Ethereum · ETH · Base · Network fees" directly under Ethereum.
  - Both count in your total.
  - They only appear when above zero.
- **Tapping either row** opens the **On Base** page:
  - the balances
  - a plain explanation of each
  - your address, with "Check it on BaseScan"

**How it works.**
- The server asks Base for both balances in one batched request per refresh, with the same 15-second cache as the other chains.
- If Base does not answer, you see the last known balance, never a made-up zero.
- Base gets its own field in the balance data. The many places that look up "USDC" keep meaning Stellar USDC.

**How to test.** If your Base address holds USDC, open Assets: you will see the second Digital dollars row. If it holds nothing, you will see no change.

**Status.** Built and checked on screen (desktop and phone).

---

## Stage 2b: Move to Stellar

**What it is.** A button on the On Base page that brings the USDC on your Base address home to your Stellar wallet.

**What you will see.** "Move to Stellar · About 20 minutes. Normal pays the network fees." Tapping it opens the usual review page and money journey:
1. Normal covers the Base fee.
2. You approve the move, or Auto-finish signs it when it is on.
3. Circle takes the USDC off Base.
4. About 20 minutes later it is in your Stellar wallet.

**How it works.** It uses exactly the steps of the existing "Bring back" refund:
1. The record is written before anything moves.
2. The gas is topped up.
3. The burn is signed by Auto-finish first, then by your passkey if needed, with the guard against sending twice.

**How it stays safe.** The server pins everything:
- Both addresses must be your own, from your wallet row.
- USDC only, Base to Stellar only.
- At least $1, and never more than Base really holds.
- One move at a time.

Like a refund, it skips the $10 swap minimum and the two-factor code, because the money only comes back to you.

**How to test.** With at least $1 of USDC on your Base address, tap Move to Stellar and confirm. About 20 minutes later your Stellar digital dollars go up and the Base row disappears.

**Status.** Built. The review is checked on screen. Not live-tested yet.

---

## Stage 3: one face scan for Circle transfers (pre-signed permissions)

**What it is.** Your first Circle swap (USDC → BTC/ETH/SOL) or first Autoinvest purchase asks twice today:
1. "Allow Circle to collect it" (approve).
2. The transfer itself (burn).

The burn cannot be prepared until the approve has landed, so the two can never be signed together as transactions. Signed as permission slips, they can. This stage is also the foundation for the combined swaps in Stage 5.

**What you will see.** One face scan, even the very first time, and then the swap runs as usual.

**How it works.**
1. The server builds the permissions from your transfer record and your wallet record:
   - an approve for exactly this amount, for about 20 minutes, only when needed
   - the burn to your own Base address
2. You sign their hashes with one face scan.
3. The server checks every signature against your key and stores them.
4. Normal's Stellar relayer sends the approve, then the burn, paying the network fee (about 0.002 to 0.004 XLM each).
5. Once the burn has landed, Circle's normal machinery takes over.

**How it stays safe.**
- **Each permission is exact and works once.** It names this amount and this recipient, and expires in about 10 minutes.
- **It cannot be changed.** A changed detail breaks your signature.
- **Each send is recorded first.** A step is claimed before it is sent, and its transaction is recorded before broadcast.
- **The transfer is only marked sent once the burn has really landed.** So a retry can never lose track of money.
- **If something fails before the burn, nothing moved.** Your USDC is still in your wallet.

**Switches and setup.**
1. ~~The `relayed_steps` table~~ Done (`prisma/migrations-manual/2026-11-19_relayed_steps.sql`).
2. `NEXT_PUBLIC_STELLAR_PERMISSIONS=1` turns it on. It is off by default and is a build setting, so it needs a redeploy. Staging first.

**How to test** (staging, switch on). From an account that has not done a Circle swap this month, swap $10 USDC to BTC. You will see one face scan instead of two, and the swap finishes as usual.

**Status.** Built. Proven end to end on testnet with the real server code and a real Circle burn. Not live-tested on mainnet yet.

---

## Stage 4: Core 4 (Stellar joins Autoinvest)

**What it is.** Autoinvest's index becomes **Core 4**: Bitcoin, Ethereum, Solana and Stellar, each by the square root of its market size.
- This still follows market size, but gives smaller coins a visible share.
- With 19 November prices: 60.2% / 24.9% / 11.2% / 3.7%.
- The smallest purchase is about $90.
- Normal's 0.5% applies to every coin, Stellar included.

**What you will see.**
- **The Core 4 page** shows four coins, and the review splits your amount four ways. For $500: $292 BTC, $123 ETH, $64 SOL, $21.50 XLM (sample prices).
- **The journey** has a "Buy Stellar" step right after "Hand it to Circle". Circle carries only the part bought on Base.
- **With the Stage 3 switch on:** one face scan for the whole purchase.
- **With it off:** two, the transfer and then the Stellar swap.
- **Your XLM** arrives within seconds. BTC, ETH and SOL arrive in about 10 to 60 minutes as before.
- **If the XLM price moves too far,** that share stays as digital dollars in your Stellar wallet, and the page says so.
- **Old Top 3 purchases** still show as Top 3, and the old Top 3 link opens Core 4.

**How it works.**
- The XLM share never crosses the bridge. Your wallet swaps it on Soroswap, followed by its 0.5% fee payment.
- The server checks the swap is exactly that share and fee, and stamps the Stellar coin's record before anything is sent.
- The transfer goes first. If it fails, nothing moved at all.
- An XLM swap that the page never sent (the page closed) is marked held after 30 minutes. Nothing moved, so the purchase still settles.

**Other apps.** The server creates Core 4 only for a client that asks for it, which the web page does. Older app builds keep buying Top 3 until the mobile app learns Core 4 (doc 129 §11 lists what it needs).

**How to test.** Buy Core 4 for $90 or a bit more. You will see one face scan (switch on), XLM in your wallet within seconds, and the other coins arrive as usual.

**Status.** Built and checked on screen. Not live-tested yet.

---

## Stage 5 (being built): combined swaps

**What it is.** Swaps that need two networks and used to be impossible or two-step, each with one face scan:
- **XLM → BTC/ETH/SOL:** the XLM is swapped to exactly the USDC needed, then sent by Circle.
- **Savings → BTC/ETH/SOL:** the money comes out of Savings (with the usual commission on earnings), then Circle sends it.
- **XLM → Savings and Savings → XLM:** straight between XLM and Savings, with the usual fees.

**How it works.** Your swap transaction and the Circle permissions are signed with one face scan. The server sends your swap first, and the relayer sends the Circle transfer once the swap's USDC exists. Fees follow the locked rule: one 0.5% on the Base exchange, nothing extra on the Stellar swap.

**Needs.** The Stage 3 switch on, since it is built on permissions.

**Status of XLM → BTC/ETH/SOL** (2026-11-19):
- **Built.** The server part is proven on testnet with the real code: your own swap is sent first, and the transfer only goes once it has landed.
- **Not checked on screen yet.**

**How to test it** (switch on). In Swap, pick XLM, then Bitcoin, and type 100. You will see:
- the quote in BTC
- a review with "Approve the swap", then "Swap your XLM to USDC", then "Allow Circle to collect it" (Normal's step), then Circle
- one face scan, after which the swap finishes like a USDC → BTC swap

**Status of Savings → BTC/ETH/SOL** (2026-11-19):
- **Built**, checked on screen through the dev preview (`/app/dev/flow?s=savings-btc`). Not live-tested.
- **What you will see** (switch on, with money in Savings): Digital dollars → Bitcoin gets a third chip, **Savings · 500.00**. Pick it and type 500. The review:
  - starts at "Normal Savings"
  - shows the commission on earnings, as with any withdrawal
  - shows "Moved by Circle", the amount Savings guarantees
  - asks for one face scan
- **How it stays safe:**
  - The server reads the guaranteed amount from the signed withdrawal itself, and refuses anything that is not a withdrawal from your own Savings.
  - The withdrawal is recorded, and its commission held, before anything is sent, like any withdrawal.
  - Circle only moves money once the withdrawal has landed. If it does not land, nothing moved and your money is still in Savings.
  - Anything over the guaranteed amount stays in your wallet as digital dollars.
- **How to test it** (mainnet, switch on): with at least $11 in Savings, swap $11 from Savings to Bitcoin. If you then look at Activity, you will see a Savings withdrawal and a swap. Your Savings balance goes down by $11, and the Bitcoin arrives as usual.


**Status of XLM ⇄ Savings** (2026-11-19):
- **Built**, checked on screen through the dev preview (`/app/dev/flow?s=xlm-savings` and `?s=savings-xlm`). Not run anywhere live yet.
- **What you will see** (switch on, Normal wallet):
  - **XLM → Digital dollars** gets **Into: Wallet | Savings**. Pick Savings and type 100. The review shows the 0.5% swap fee, exactly the USDC bought, the Savings fee, what goes into Savings, and one face scan.
  - **Digital dollars → XLM** gets **From: Normal wallet | Savings**. Pick Savings. The review shows the commission on earnings, the 0.5% swap fee, the XLM you get at least, and one face scan.
- **Prices** come from Stellar's own exchange. Soroswap's direct pool gave about 8% less for 100 USDC.
- **Fees** are what the same steps cost one by one (your call: "it should pay the fee to us").
- **How it stays safe:**
  - The swap and its fee are one transaction: no swap, no fee.
  - Each later step is sent only after the one before it has landed.
  - A step that does not go through stops everything after it, so a fee is never sent without what it pays for, and your money waits in your wallet as digital dollars.
- **Setup:** one more table. Run `packages/web/prisma/migrations-manual/2026-11-19_relayed_actions.sql` before the switch goes on.
- **How to test it** (mainnet, switch on, small amounts):
  - Swap 20 XLM into Savings. You will see one face scan, and Savings goes up by about the USDC shown.
  - Then take $2 from Savings to XLM. You will see one face scan, and your XLM goes up.

---

## Stage 6: bridge first, then Stellar

**What it is.** BTC/ETH/SOL → XLM or → Savings. The Stellar step runs about 15 to 90 minutes later, when the money lands, from what you signed at the start, for the least amount the bridge guarantees. Anything over stays as digital dollars.

**What you will see** (switch on, Normal wallet):
- **Bitcoin → XLM** (or Ethereum, Solana) is a new pair.
- **Bitcoin → Digital dollars** gets **Into: Wallet | Savings**.
- **Two face scans at the start, nothing later** (your choice: the coin and Stellar are different keys, and Turnkey asks once per key). Stellar comes first, so turning it down costs nothing. Then the coin.
- **When the USDC lands,** Normal sends the swap to XLM (on Stellar's own exchange, with the 0.5% fee inside it) or the deposit into Savings (then the Savings fee).

**How it stays safe:**
- The swap to XLM is one transaction signed at the start. It stays valid even if you use your wallet in between, and Normal pays its network fee.
- If the price moved more than 3%, or the money did not land within 3 hours, nothing more is done and the money waits in your wallet as digital dollars.

**How to test it** (mainnet, switch on, auto-finish on, small amounts):
- Swap a little Bitcoin, Ethereum or Solana (about $15) to XLM. You will see two face scans now, and the XLM about 20 minutes after the coin arrives on Base.
- Then the same into Savings.

**Status (2026-11-19):** Built, checked on screen through the dev preview (`/app/dev/flow?s=btc-xlm` and `?s=btc-savings`). Not run anywhere live yet. No new SQL.

---

## Stage 7: the mobile app

The mobile app uses the same server and needs its own small client changes:
- batch signing (Stage 1)
- permissions (Stage 3)
- Core 4's Stellar leg (Stage 4)

Until then it keeps working exactly as today.

---

## Checklist: what is done and what is left

| | Item | Who |
|---|---|---|
| ✅ | Code for Stages 0 to 4, pushed | Done |
| ✅ | `relayed_steps` table | Done |
| ☐ | If production does NOT share staging's database, run the same SQL there | Niko or coworker |
| ☐ | Run `prisma/migrations-manual/2026-11-19_relayed_actions.sql` (XLM ⇄ Savings) | Niko |
| ☐ | `yarn db:generate` once locally, with the dev server stopped | Niko |
| ☐ | Open a pull request to `develop`, then deploy to staging | Niko |
| ☐ | Set `NEXT_PUBLIC_STELLAR_PERMISSIONS=1` on staging, then redeploy | Coworker |
| ☐ | Check the Stellar relayer account (the key in `CCTP_RELAYER_STELLAR_SECRET`) holds a buffer of XLM, for example 50 or more | Coworker |
| ☐ | Live tests: Stage 1, then 2, then 3 (staging), then 4 | Niko |
| ☐ | Mobile: batch signing, permissions, Core 4 (doc 129 §11) | Mobile agent |
