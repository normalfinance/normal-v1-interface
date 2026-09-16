# Normal — the Summer 2026 optimization update

**Audience:** Justin, for a Normal blog post.
**Period covered:** 20 July → 2 September 2026, the "make Normal ready for thousands of users" project.
**Scale:** 252 commits on the production branch, 128 numbered engineering documents, 0 → 566 automated tests.

Everything below shipped to production. Where a number is quoted it was measured, not estimated; the environment it was measured on is named. This version has been reviewed for public sharing: it describes protections without giving their exact parameters.

---

## The one-paragraph version

Over six weeks we rebuilt the plumbing under Normal without changing what it is. The app now loads in a fraction of the time, every screen shows the same balance because there is one place that knows it, every action you take is reflected within seconds instead of after a manual refresh, and every money flow was reworked so that a failure can never cost you a fee, a duplicate send, or a lost deposit. We added cross-chain swaps that need one signature instead of four, let people use their Lobstr or Freighter wallet side by side with their Normal wallet, and made the app tell the truth about what is happening at every step. Underneath, we went from no tests and a broken CI to a codebase that refuses to ship a route without authentication or an environment variable that was never declared.

---

## 1. Speed: the app got fast

**What people feel:** the portfolio appears at once, savings no longer "loads last", and a returning user sees their balances before the network answers.

- **Portfolio load: 22 seconds → 0.36 seconds** (median, staging, measured before/after). The cause was a cache misconfiguration that turned every request into a 20-second retry loop. Fixing it also switched on rate limiting on staging for the first time.
- **One balance cache for every screen.** Portfolio, account drawer, asset pages, swap and send all read the same server-side aggregate instead of each fetching from blockchain providers per view. Provider cost is now bounded by the cache window, not by users × page views. This is the change that makes 10,000 users affordable.
- **Session checks cached.** Every authenticated API call used to make a live round trip to the auth provider with no timeout (0.5 s warm, 7.7 s cold). Verification is now cached briefly and bounded by a timeout, across roughly 60 routes.
- **Half the API round trips removed.** A trailing-slash redirect was silently doubling every API call.
- **Wallet lookups: ~22 per session → 1–2.** A missing single-flight guard had nine components fetching the same thing at once.
- **Solana history: 3,000 → 205 provider credits per user.** We were calling a 100-credit method every 30 seconds; the answer rarely changes.
- **Savings position: 8.1 seconds → 0.15 seconds warm**, with graceful handling when the yield provider rate-limits us instead of a blank error.
- **Skeletons, never fake zeros.** Four screens showed "$0.00" while still loading. Loading gates now cover every data source they display, and a cold tab paints the last known balances from a local snapshot before any request completes.
- **Balances refresh themselves after actions.** After a send, swap or deposit the new balance appears within seconds, driven by chain confirmation rather than timers. Spendable balance subtracts money that is already on its way out.

## 2. Money safety: a failure can no longer cost you

**What people feel:** nothing, which is the point. These are the changes that make the app safe to hand to strangers.

- **Every API route authenticates by default.** A shared wrapper makes authentication the default and public routes the documented exception; a test in CI fails the build if a new route forgets. Authentication is no longer something each route has to remember.
- **You can never pay a fee for something that did not happen.** Fee and action are signed first, then submitted in order by the server with the fee held in escrow; if the action fails, the fee is never charged. A previous ordering had charged a fee for a deposit that then failed.
- **Every transaction is recorded before it is broadcast**, then settled by a background reconciler, so an action can never vanish from history or be double-counted.
- **Sends cannot be duplicated.** Ethereum and Solana sends go through a server funnel that checks amount and destination inside the signed transaction, estimates gas properly (a hard-coded value broke contract destinations), and refuses a second send while one is still unconfirmed.
- **Exchange deposits require a memo.** After a real 5 XLM deposit to an exchange was lost for lack of a memo, the app now knows which addresses require one and refuses to send without it. The ecosystem-standard check alone had passed.
- **Savings totals are reconciled by transaction hash**, fixing a case where a fast withdraw-then-deposit displayed the wrong "Your deposits" figure.
- **Savings never strands you without fee XLM.** An always-visible indicator and a one-XLM buffer protect the small amount needed to withdraw later.
- **Bitcoin swaps fixed.** The wallet provider's transaction parser rejected the bridge's memo output; we sign the Bitcoin inputs ourselves now.
- **Passkey prompts are scoped to your account and serialized**, ending the intermittent "operation not allowed" failures and the wrong-passkey dead end on shared devices.
- **No money path depends on a single provider.** Balance reads and confirmations fail over across RPC providers on Ethereum, Solana and Stellar instead of going blank.
- **Guards fail closed.** When a check cannot tell, it stops rather than waving you through, and the app verifies the aggregator route, the Bitcoin transaction shape, the bridge attestation and refunds before asking for a signature.
- **Accounting records what was delivered, not what was quoted**, and integrator fees from swaps now count toward revenue and are excluded from TVL.

## 3. Cross-chain swaps that finish themselves

**What people feel:** a swap between Stellar and Bitcoin, Ethereum or Solana shows honest progress, survives a closed tab, and needs one signature.

- **Truthful progress end to end.** Progress is stored on the server; the browser is no longer the only thing that knows where a swap is. A background job finishes swaps whose tab was closed, in both directions.
- **Recovery is always visible.** If a swap needs a signature or a decision, a banner shows it on every screen until it is resolved. A failed leg offers both "retry" and "bring my USDC back" in the same popup, in plain language.
- **Automatic bridge failover.** If one bridge route reverts, the next attempt avoids it.
- **One signature instead of up to four ("Autopilot").** With a one-time consent, a policy-bound delegated key signs the intermediate legs on Base, constrained by an on-chain policy to a fixed allowlist of contracts and to zero native value. The user's passkey remains the only key that can sign on Stellar, and the delegation can be revoked at any time.
- **Gas honesty.** The real network fee appears next to the "free bridge" label, a pre-signature check catches insufficient gas, and a one-tap top-up fixes it.
- **Delivery, not departure.** A swap says "done" only after the destination chain shows the funds, with honest ETAs for Bitcoin.

## 4. Your own wallet, or ours, or both

**What people feel:** a Lobstr or Freighter user can use every feature, and a Normal wallet user can add an external wallet without anything switching under them.

- **External Stellar wallets coexist with a Normal wallet.** Guided setup creates the Normal wallet as a companion; the drawer, savings, send and swap show both with per-wallet tabs and clear labels.
- **Choose the source and destination wallet** for swaps, savings and sends, including "move from Lobstr and swap" in one flow.
- **Login never switches your wallet.** A set of tested invariants protects the connected wallet from being replaced by an auto-connect, a self-heal, or a wallet-creation flow.
- **Account-wide views.** Asset pages, holdings and the activity feed show every wallet, each row tagged with its owner.
- **Recovery-phrase export.** One phrase covers all four chains and restores in MetaMask, Phantom, Freighter or Sparrow; decryption happens inside the wallet provider's isolated frame, never in our page. A mandatory backup step follows wallet creation.

## 5. Sends, receives and ramps

- **Every send shows a pending row instantly** and refreshes the balance on confirmation, on all four chains.
- **The network is named on every send and receive surface**, tinted in its own colour.
- **Exact "Max"** per asset with dust guards before the passkey prompt.
- **Ramps track money in flight** from handoff to chain confirmation, with an in-flight indicator in the balance card; the user chooses which wallet a ramp uses.

## 6. Honesty in the interface

- A four-wave sweep replaced technical error text with messages that say what happened and what to do next.
- Swaps that moved nothing end calmly and clean up after themselves.
- Browser consoles are silent in production; Safari 15 and earlier work again.
- One row per asset everywhere, Swap available from every asset row, pickers sorted by value, real wallet names.

## 7. Foundations (for the engineers in the audience)

- **A chain registry.** Adding a blockchain used to touch 28 files; it is now one entry.
- **Tests: 0 → 566** across 67 suites, wired into CI. Two guards run on every commit: no API route without authentication, and no environment variable read that is not declared to the build system.
- **CI resurrected.** It had failed 40 of 40 runs for weeks, skipping type checks and builds; it is green and blocking now.
- **One source of truth for balances.** The persisted token store, responsible for three separate wrong-balance bugs, was retired.
- **Databases consolidated** from two projects into one, losslessly; the cache provider moved to a company account.
- **Observability:** Speed Insights, cron heartbeats, relayer gas-float monitoring, and a rebuilt Dune dashboard (revenue, TVL, transaction log) synced daily.
- **128 numbered engineering documents** in `docs/audit/`, each fix with a plan and a plain-English explainer.

---

## What is next

The same discipline now carries into the mobile app: it is a second client of this backend, shares the same passkeys, and inherited every guard above. The first internal builds are already signing on a phone.

## Suggested blog angles

- "22 seconds to a third of a second: what was actually slow" (section 1, first bullet).
- "You should never pay a fee for something that did not happen" (section 2, fee escrow).
- "One signature for a cross-chain swap" (section 3, Autopilot), including that the delegation is policy-bound and revocable.
- "Bring your own wallet" (section 4).
- "From zero tests to a build that refuses to ship an open route" (section 7).
