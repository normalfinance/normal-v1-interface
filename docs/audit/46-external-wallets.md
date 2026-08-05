# 46 — Does the tested work hold up on external wallets?

Question asked: everything in the tester guide
([36-test-plan.md](36-test-plan.md) / [42-tester-guide.html](42-tester-guide.html))
was written assuming a Normal wallet. **Does it also hold for someone signed in
with Freighter, Lobstr, Ledger or WalletConnect?**

Answer in one line: **mostly yes for Stellar, no for the other chains, and one
regression shipped today breaks transaction logging for them entirely.**

> **STATUS 2026-08-05 — two fixes applied, typecheck/lint/build clean.**
> Product decision confirmed: **external wallets are Stellar-only by design.**
>
> - **Finding A/#41 FIXED** — external wallets now get a `linked_wallets` row,
>   on connect *and* as a backfill on session restore, so existing users are
>   repaired without reconnecting.
> - **Cross-chain now gated off for external wallets** (§4) — restores the
>   behaviour of the lost `3e1ab40`, and the "silently provision a Turnkey
>   wallet mid-swap" contradiction with it.
>
> Findings B (#42), C (#43) and E remain open; none is a blocker for staging.

Everything below was read in the code, not assumed. Nothing here has been run
live — where a conclusion is a code-path reading rather than an observation, it
says so.

---

## 1. There are three wallet models, not two

| Model | `walletType` | Holds keys | Signs |
|---|---|---|---|
| Normal wallet, Turnkey-managed | `normal-wallet` | Turnkey sub-org, passkey | Stellar **+ BTC/ETH/SOL** |
| Normal wallet, self-custody | `normal-wallet` | local key, password-encrypted | Stellar only |
| **External wallet** | `freighter` · `lobstr` · `wallet-connect` · `ledger` | the user's own app/device | **Stellar only** |

The two Normal variants share a `walletType`; `use-normal-wallet.tsx`
distinguishes them at signing time by asking Turnkey.

### Which external wallets are actually connectable

`packages/state/src/state/stellar-wallet-kit/actions.ts:61-74` registers exactly
four modules: **Freighter, Lobstr, WalletConnect, Ledger**.

`packages/types/src/state/wallet.ts` still lists `xbull`, `hana` and
`stellar-wallets-kit` in the type union, and
`use-stellar-wallets-kit.tsx:12-25` still has a restore branch for them — but
both modules were deleted in commit `9a2fff6` (2026-05-14, *"remove xbull and
hana"*). A pre-May user with `xbull` or `hana` persisted hits the
`getWalletIdFromType → null` branch on load, which calls `disconnectWallet()`
and wipes their address. They can reconnect, but only as one of the four.

**Testers should not be asked to test xBull or HANA.** They are not offered.

---

## 2. The tester guide, line by line

Legend: ✅ works · ⚠ works with a caveat · ❌ does not apply

| Test | External wallet | Why |
|---|---|---|
| 1.1 Portfolio shows assets | ⚠ | XLM/USDC yes. BTC/ETH/SOL only exist if they also provisioned a Turnkey wallet — absent is **correct**, not a bug |
| 1.2 Drawer Assets tab | ⚠ | same source, same caveat |
| 1.3 Homepage card | ⚠ | same |
| 1.4 Activity list | ⚠ | on-chain Stellar history yes; **swap and savings rows will be missing — see Finding A** |
| 1.5 Savings balance | ✅ | savings is fully wallet-agnostic |
| 2.1–2.4 Loading behaviour | ✅ | identical code path |
| 3.1–3.3 The wallet bug | ❌ | the fix is Turnkey-specific and does not protect them — **Finding B** |
| 4.1 Send XLM | ⚠ | works; Lobstr/WalletConnect need a reconnect after any page reload |
| 4.2 Send ETH | ❌ | Turnkey-only signer |
| 4.3 Send SOL | ❌ | Turnkey-only signer |
| 4.4 Send BTC | ❌ | Turnkey-only signer |
| 4.5 Swap XLM ↔ USDC | ⚠ | the swap succeeds; **it will not appear as a Swap in Activity — Finding A** |
| 4.6 Cross-chain swap | ⚠ | only after the app provisions a Turnkey wallet for them — see §4 |
| 4.7 MoneyGram | ✅ | `lib/mgi/kit-signer.ts` explicitly dispatches to the kit |
| 5.1–5.2 Speed | ✅ | unaffected |
| 5.3 Receive BTC | ❌ | Turnkey-only address |

**So the guide needs a second, shorter variant for external-wallet testers** —
handing them the current one guarantees false bug reports on 4.2, 4.3, 4.4 and
5.3, which are working as designed.

---

## 3. Why Stellar works everywhere

Four features branch on wallet type, and all four do it identically:

```ts
const isNormalWallet = walletType === 'normal-wallet';
const signTransaction = isNormalWallet ? signNormalWallet : signOrReconnect;
```

- [use-send-token.ts:75](../../packages/web/src/hooks/stellar/use-send-token.ts#L75)
- [use-swap.tsx:157](../../packages/web/src/hooks/stellar/use-swap.tsx#L157)
- [use-defindex-savings.tsx:194](../../packages/web/src/hooks/stellar/use-defindex-savings.tsx#L194) (and again at 450, for withdraw)
- [use-trustline.ts:37](../../packages/web/src/hooks/stellar/tokens/use-trustline.ts#L37)

`signOrReconnect` wraps the kit and adds session-expiry recovery. Read paths
are address-keyed rather than wallet-typed: `/api/wallet/portfolio` explicitly
accepts a `stellar=` query param *"for externally connected wallets"*
([route.ts:48-51](../../packages/web/src/app/api/wallet/portfolio/route.ts#L48-L51)),
and savings reads by address with no Turnkey reference at all.

This part of the architecture is genuinely sound.

## 4. Why the other chains do not

BTC, ETH and SOL addresses come from the `turnkey_wallets` row keyed to the
Supabase user, and every one of those signers takes a `subOrgId` and stamps
with a passkey. A Stellar wallet cannot produce a secp256k1 or ed25519
signature for another chain — this is a property of the wallets, not a gap in
our code.

`executeLifiSwap` states it plainly
([execute.ts:317-318](../../packages/web/src/lib/lifi/execute.ts#L317-L318)):

```ts
const info = await getTurnkeyWalletInfo();
if (!info?.subOrgId) throw new Error('Turnkey wallet not found');
```

**What the system map says about this is now out of date.** Chapter #32 of
[10-system-map.md](10-system-map.md) records that we *"gate cross-chain/CCTP to
Normal-wallet users (swap-card.tsx)"*. There is no such gate today — a grep for
`walletType` across `sections/swap/` returns nothing. Lazy provisioning
replaced it: when an address is missing, the LI.FI and CCTP engines open
`ChainSetupDialog`, and `ensureChainAccount` creates a passkey + sub-org for a
first-timer ([add-account.ts:92-132](../../packages/web/src/lib/turnkey/add-account.ts#L92)).

So an external-wallet user *can* reach cross-chain swaps — by being given a
Normal wallet mid-flow. Worth being explicit about the consequence: **the
cross-chain swap then runs on their new Turnkey addresses, not on their
Freighter balance.** That is a product decision worth confirming, not a defect.

Corrected in the system map as part of this work.

### The July safety gate is gone — but the thing it protected is still covered

A fix from 2026-07-11 added `isExternalWallet` / `needsNormalWallet` to
`swap-card.tsx`, disabling cross-chain for external wallets with `action: null`
so **no signature could fire** — closing a fund-stranding risk on CCTP
outbound.

**That code is not in the repository, and the optimisation work did not remove
it.** Traced in git:

- it was committed as `3e1ab40` *"fix(swap): block cross-chain swaps for
  external Stellar wallets (Lobstr etc.)"*, 2026-07-11
- that commit exists **only** on `feat/advanced-xlm-swaps`;
  `git merge-base --is-ancestor 3e1ab40 HEAD` says **no**
- the PR that merged that work — `d644679` *"Feat/advanced xlm swaps (#466)"* —
  does not contain the gate at either `d644679^` or `d644679`

So it was written, committed to a feature branch, and **lost in the squash or
rebase that produced PR #466**. It never reached master, and it predates the
optimisation batch entirely.

Whether that matters comes down to two things, and both were checked:

**1. Can an external-wallet user start an outbound CCTP swap they cannot
finish?** No. The outbound route is: Stellar burn (their wallet) → relayer
mints USDC on Base → **LI.FI pivot swap, signed client-side with their Turnkey
passkey** ([pivot-swap.ts:36-37](../../packages/web/src/lib/cctp/pivot-swap.ts#L36)).
So a Turnkey wallet genuinely is required. But the CCTP engine gates every
missing piece with `action: null` before any signature — missing destination
address, **missing Ethereum/Base address**, missing Stellar account, missing
USDC trustline
([use-cctp-engine.tsx:459-483](../../packages/web/src/sections/swap/engines/use-cctp-engine.tsx#L459)).
A user without a Turnkey EVM address cannot reach the burn.

**2. If the pivot fails anyway, are funds lost?** No. `cctp-resume-banner.tsx`
has a `halt-finish` phase for exactly this case — CCTP minted USDC to the
user's own Base address but the pivot never ran — and one tap completes it.
Principal sits at the user's own addresses throughout.

So the fund-stranding path the July gate closed is now covered by the address
gates plus resume, and the missing gate is not by itself a reason to hold
staging.

**One caveat I will not paper over.** The July note attributes the original
failure to `CREDENTIAL_NOT_FOUND` — an external-wallet session being unable to
present the Turnkey passkey. That mechanism does not follow from how WebAuthn
works: a passkey is bound to the user and the rpId, not to which Stellar wallet
the app has connected. The same note records that rpId was investigated and
ruled out. **So the July root cause was never actually established**, and I am
not going to assert either that the risk is gone or that it is live. It needs
one live test: connect Lobstr on an account that also has a Turnkey wallet, and
attempt a cross-chain swap.

---

## 5. Findings

### Finding A — external wallets can no longer log transactions (REGRESSION, today)

**Confirmed.** `linkWallet()` is called from exactly four places:
`chain-setup-dialog.tsx:75`, `onboarding-wizard.tsx:547`, and three times in
`use-normal-wallet.tsx` (create / import mnemonic / import key). **Every one is
a Normal-wallet path.**

Connecting an external wallet never links it. All three connect handlers —
[onboarding-wizard.tsx:637](../../packages/web/src/components/_common/onboarding-wizard.tsx#L637),
[account-drawer.tsx:296](../../packages/web/src/layouts/components/account-drawer.tsx#L296),
[wallet-gate.tsx:74](../../packages/web/src/components/_common/wallet-gate.tsx#L74)
— call the kit, then `persistStore.connectWallet`, which is local state only
([createConnectWalletActions.ts:18-53](../../packages/state/src/state/persist/createConnectWalletActions.ts#L18)).
No `linked_wallets` row is ever written.

Commit `245d7ad` (*"fix(security): close the unauthenticated transaction-log
routes"*, today) added `userOwnsWallet()`, which accepts a wallet only if it is
in `linked_wallets` **or** `turnkey_wallets`. An external wallet is in neither.

Result: `/api/swap/log-transaction` and `/api/savings/log-transaction` return
**403** for every external-wallet user. Verified against `245d7ad^` that those
routes previously had no auth at all, so this worked before today.

Impact, in order of severity:

1. **Swaps disappear from Activity.** `/api/wallet/activity` is DB-only
   (`SwapLog` + `VaultDeposit`), so a completed XLM↔USDC swap shows only as a
   raw Horizon operation, not as a labelled Swap row.
2. **Dune analytics under-count** every external-wallet user.
3. **Savings stays correct** — `totalDeposited` reads the DeFindex events API
   as authoritative and only falls back to the DB
   ([user-position/route.ts:270-297](../../packages/web/src/app/api/savings/user-position/route.ts#L270)),
   so the position is right; only the fallback is lost.

The user sees nothing. `postTransactionLog` is deliberately fire-and-forget and
writes one `console.error`.

**Fix (small):** call `linkWallet(address)` after a successful kit connect. Best
done once inside the kit store's `connectWallet` rather than at the three call
sites, so a fourth connect path cannot forget it. Needs a tolerated failure
(the link route is weekly-rate-limited) and must not block the connection.

### Finding B — the wallet-loss fix does not cover external wallets, and may switch wallets on hybrid users

**Code-path reading, not yet observed live.** The self-heal added for the
XLM/USDC data-loss bug
([use-normal-wallet.tsx:114-139](../../packages/web/src/hooks/stellar/use-normal-wallet.tsx#L114))
fires whenever `persistStore.wallet.address` is empty, and restores the address
**from Turnkey**:

```ts
const info = await getTurnkeyWalletInfo();
if (!info?.stellarAddress) return;
await persistStore.connectWallet(info.stellarAddress, 'normal-wallet');
```

Two consequences:

- **Pure external-wallet user:** `getTurnkeyWalletInfo()` returns null, the
  effect no-ops. They get no protection from Part 3 of the test plan. Their
  equivalent recovery is the kit's own restore path, which is separate code.
- **Hybrid user** (external Stellar wallet *plus* a Turnkey wallet provisioned
  for BTC/ETH/SOL): if their address is ever cleared — disconnect, or the
  `xbull`/`hana` branch above — the next page load silently connects the
  **Turnkey** Stellar address and sets `walletType: 'normal-wallet'`. Different
  address, different XLM/USDC, no notification.

Worth reproducing deliberately before staging: connect Freighter, provision BTC
through a swap, disconnect Freighter, reload.

### Finding C — dead wallet types

`xbull` / `hana` / `stellar-wallets-kit` survive in the type union and the
restore switch after the modules were removed in `9a2fff6`. Harmless but
misleading — it is why the memory notes and the system map both list six
supported wallets when there are four. Cleanup, not a defect.

### Finding D — `/api/wallet/activity` has no auth

Already registered as Block C finding #2. Noting only that it is the route
serving external-wallet activity too, so it inherits the same exposure.

---

### Finding E — cross-chain on an external wallet is untested, not unsafe

Covered in §4. No code change proposed; **one live test needed**: connect
Lobstr on an account that also has a Turnkey wallet and attempt a cross-chain
swap. If it succeeds, the July `CREDENTIAL_NOT_FOUND` report is stale and the
missing gate is a non-issue. If it fails, we have a real root cause to chase
and the gate should come back.

---

---

## 5b. Which of these belong to the staging batch

Decision confirmed 2026-08-05: **external wallets are meant to be Stellar-only.**
That closes every "BTC/ETH/SOL doesn't work" item as working-as-designed, and
narrows the list to what this batch actually caused.

| Finding | Ours? | Evidence |
|---|---|---|
| **#41** log 403 | **YES — regression, today** | `245d7ad`; verified working at `245d7ad^` |
| **#42** self-heal switches wallet | **YES — behaviour change** | the effect added for the wallet data-loss fix |
| #43 dead xbull/hana types | no | `9a2fff6`, 2026-05-14 |
| #E missing cross-chain gate | no | lost in PR #466 (see above), predates this work |
| `/api/wallet/activity` no auth | no | pre-existing, already Block C #2 |

### One near-miss, checked and cleared

`postTransactionLog` dispatches `nf:activity-updated` only after a **successful**
write, so for an external wallet (403) it never fires. That could have meant no
balance/activity refresh after a savings deposit.

It is not a regression. Verified at `245d7ad^`: savings previously did a bare
`fetch` with **no dispatch at all**, so external wallets simply do not receive
the new improvement — they behave as they did before. Swaps are unaffected
either way, because `use-soroswap-engine.tsx:107` dispatches independently of
the log write.

### Batch changes confirmed safe for external wallets

- `/api/wallet/portfolio` explicitly accepts the `stellar=` param for
  externally connected wallets — XLM/USDC load correctly
- savings caching is address-keyed, with no Turnkey coupling anywhere in the hook
- the #19 auth cache keys on the Supabase token, independent of wallet type
- the chain registry only describes Turnkey chains, so it cannot affect them
- `isTurnkeyStellarAddressStrict` runs only when `walletType === 'normal-wallet'`

### New question raised by the Stellar-only decision

If external wallets are Stellar-only **by design**, then the current behaviour
contradicts it: a Lobstr user selecting XLM → BTC is offered a dialog that
silently provisions a Turnkey wallet mid-swap. Either that is the intended
upsell (#32's "create-Turnkey CTA", in which case it should say so plainly), or
cross-chain should be gated off for external wallets again — which is what
`3e1ab40` did before it was lost. **Product decision, not a bug.**

---

---

## 6. What was fixed (2026-08-05)

### Fix 1 — external wallets are registered against the account (#41)

`packages/web/src/hooks/stellar/use-stellar-wallets-kit.tsx`

A single `ensureWalletLinked()` helper, called from **two** places:

- **`connectWallet`** — every UI connect path (account drawer, wallet gate,
  onboarding wizard) goes through this hook, so one call covers all three and a
  fourth path cannot forget.
- **the session-restore effect** — a backfill. Users who connected before this
  change would otherwise stay unlinked until they happened to reconnect, which
  most never would. On their next page load they are repaired silently.

Three details that were not obvious:

- **It checks before writing.** `POST /api/wallets/link` consumes the "3
  wallets per day" creation quota *even for an address that is already linked*
  — that route's `isWalletLinked` early-return is commented out. Linking
  unconditionally on every connect would burn the allowance a genuine new
  wallet needs. So: `isWalletLinked` first, `updateLastUsed` if present, POST
  only when actually absent.
- **The address is read from `getState()`**, not from the store value captured
  in the callback — that one is from the render *before* the connect and is
  still stale.
- **It never throws.** A failure clears the session guard so a later mount
  retries, and logs a warning. A bookkeeping problem must not break a working
  wallet connection.

### Fix 2 — cross-chain is gated off for external wallets

`packages/web/src/sections/swap/swap-card.tsx`

Restores `3e1ab40`, with one improvement. The gate is computed **above** the
engines, so it does two things rather than one:

```ts
const isExternalWallet = wallet.walletType != null && wallet.walletType !== 'normal-wallet';
const needsNormalWallet = isExternalWallet && pairType !== 'stellar';
```

- `enabled: pairType === 'crosschain' && !needsNormalWallet` (and the same for
  CCTP) — a hybrid user with Turnkey chain addresses would otherwise pass the
  address checks and burn LI.FI quote quota on swaps the CTA can never run.
- the CTA becomes `action: null` with an explanation, so **no signature can
  fire**. That is the load-bearing part: outbound CCTP burns on Stellar first
  and only then needs the passkey for the Base pivot, so a half-executed route
  would strand USDC on Base.

XLM ↔ USDC is untouched and fully enabled. The render now reads `button`
throughout, never `engine.button` — the gate has to win over the engine's own
state machine.

Verified: typecheck clean, lint clean, production build clean. `/swap` bundle
22.9 kB (was 22.8 kB).

## 7. Still open

1. **Reproduce Finding B (#42)** deliberately rather than waiting for a tester
   to report "my balance changed": connect Freighter, provision BTC via a swap,
   disconnect, reload.
2. **Finding E** is now moot for shipping — cross-chain is gated, so the
   unresolved July `CREDENTIAL_NOT_FOUND` question cannot bite a user. It
   returns when #32 is picked up.
3. **Write a short external-wallet tester sheet** — otherwise 4.2/4.3/4.4/5.3
   generate false reports.
4. Findings C (#43 dead types) and D are hygiene; schedule, do not rush.
5. Worth considering separately: `POST /api/wallets/link` charging the
   creation quota for an already-linked wallet is wrong semantics for every
   caller, not just this one. Fixed here by checking first, but the route could
   defend itself.

Nothing here changes the ranking of the existing roadmap items #32 and #33.
This is verification of current state, which is what Phase 2 asked for.
