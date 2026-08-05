# 36 — Test plan for the optimisation changes (written for non-testers)

You don't need testing experience to run this. Each test says **what to do**,
**what should happen**, and **what "broken" looks like**. If something doesn't
match, that's a finding — report it using the template at the bottom.

**Test on staging.** ⚠️ Staging uses the **real production database**, so any
transaction you make is real. Use tiny amounts (a few cents).

**Before you start:** open the site, press **Ctrl+Shift+R** (Cmd+Shift+R on
Mac). This forces a fresh copy of the app. Do this once at the beginning.

---

## Part 1 — Nothing should look different (most important)

Most of this work was about speed and reliability, not new features. **The
main way we find a problem is if something that used to work now looks wrong.**

| # | Do this | Should happen | Broken looks like |
|---|---|---|---|
| 1.1 | Open the Portfolio page | Your assets appear: BTC, ETH, SOL, **XLM, USDC**, savings | Any asset missing, or a wrong balance |
| 1.2 | Open the account drawer (top-right avatar) → Assets tab | Same assets, same amounts as the Portfolio page | The two screens disagree |
| 1.3 | Open the homepage while logged in | The portfolio card shows the same total | A different total |
| 1.4 | Look at Activity (Portfolio page) | Your past transactions are listed, correct dates/amounts | Missing transactions, wrong amounts |
| 1.5 | Open Savings | Your balance and earnings show | Empty or zero when you have a deposit |

**The three screens in 1.1–1.3 must agree.** They used to read data from
different places; they now share one. If they disagree, that's the single most
valuable bug you can find.

## Part 2 — Loading should look calm

We fixed screens that used to fill in piece by piece.

| # | Do this | Should happen | Broken looks like |
|---|---|---|---|
| 2.1 | Hard-reload the Portfolio page and **watch carefully** | Grey placeholder boxes, then everything appears **together** | BTC/ETH/SOL appear first, then XLM/USDC pop in a second later |
| 2.2 | Same for the account drawer Assets tab | Placeholder rows, then all assets at once | List appears with some assets missing, then they arrive |
| 2.3 | Same for the homepage card (logged in) | Placeholder, then the full list | Numbers jump after appearing |
| 2.4 | Watch the Activity list load | Placeholder rows, then all transactions | Bitcoin rows appear, then Stellar rows a beat later |

**A brief placeholder is correct.** What's wrong is content appearing in
stages, or a number changing right after you see it.

## Part 3 — The wallet bug (please do this one)

This was the serious bug: a Stellar wallet address could be silently deleted,
making XLM, USDC and savings vanish until you signed in again.

| # | Do this | Should happen |
|---|---|---|
| 3.1 | Use the app normally for a few minutes — switch pages, open/close the drawer | XLM and USDC stay visible the whole time |
| 3.2 | Leave a tab open ~15 minutes, come back, reload | Everything still there |
| 3.3 | Log out, log back in | Everything back to normal |

**Report immediately if XLM/USDC ever disappear** while BTC/ETH/SOL stay —
that's exactly the bug we fixed, and it would mean it isn't fully fixed.

## Part 4 — Sending money (needs care, use tiny amounts)

Some of this work touched the code that decides *how* your wallet signs. It
should behave identically, but this is where a mistake would matter most.

| # | Do this | Should happen |
|---|---|---|
| 4.1 | Send a small amount of **XLM** to another wallet | Passkey/Face ID prompt, then success; appears in Activity **immediately** |
| 4.2 | Send a small amount of **ETH** | Same |
| 4.3 | Send a small amount of **SOL** | Same |
| 4.4 | Send a small amount of **BTC** | Same |
| 4.5 | Do a swap (XLM ↔ USDC) | Normal number of confirmations, completes |
| 4.6 | Do a cross-chain swap if you can | Completes, shows in Activity |
| 4.7 | Open MoneyGram (buy or sell) | The MoneyGram window opens normally |

**4.2 (ETH) matters most** — we changed how the app picks the Ethereum
network. It must still send on Ethereum and arrive.

## Part 5 — Speed (nice to confirm)

| # | Do this | Should happen |
|---|---|---|
| 5.1 | Open Activity, wait a minute, reload | Loads noticeably faster the second time |
| 5.2 | Open the app in two browser tabs | Both load quickly |
| 5.3 | Receive BTC (if you can) | The pending transaction appears within about a minute |

---

## How to report something

Tell us in one message:

1. **Which test number** (e.g. "3.1")
2. **What you saw** vs what the table said should happen
3. **Which asset/chain** (BTC, XLM…) and roughly **what time**
4. **A screenshot** of the whole window
5. If you're comfortable: press **F12** → **Console** tab → screenshot any red
   lines. That's often the single most useful thing.
6. For anything in Part 4, include the **transaction ID/hash** if you have it.

**Don't worry about whether it's "really" a bug.** If it looked wrong to you,
report it — a false alarm costs a minute, a missed bug costs a lot more.

## What matters most

If you only have 15 minutes: **Part 1 (nothing looks different)** and
**test 4.1 (send XLM)**. Those two cover the highest-risk changes.
