# 74 — "Wallet without a USDC trustline" notices

> **STATUS: IMPLEMENTED 2026-08-17** (same day, after Niko's GO). Decisions:
> P5 post-connect toast YES (once ever per address, localStorage-deduped);
> drawer badge YES, per-tab so the fix belongs to the wallet shown, action
> inline (not a settings redirect); receive modal warn-not-block YES; NEW:
> swap-page notice block added (slot + companion). P3 settings and P4 onramp
> verified already-covered, no change. Foundation fix along the way:
> `fetchAccountStrict` — the lenient fetchAccount maps every failure to
> undefined, so "not activated" could be asserted from a network blip; the
> strict variant throws, `useAccountStatus.error` is now trustworthy, and
> `deriveWalletReadiness` maps failure to `unknown` → surfaces render nothing.

Trigger: the savings card's Lobstr tab shows "Set up savings" when the
connected wallet isn't ready (screenshot 2026-08-17). Niko: "if user has a
wallet connected without a trustline, we would want to tell him about that on
different places... where else we should have a notice + option to set it up."

## Where a missing trustline actually bites (verified in code)

A Stellar wallet without the USDC trustline cannot HOLD USDC. Concretely:

- **Incoming USDC bounces.** A payment of an asset the destination has no
  trustline for fails on-chain (`op_no_trust`) — the sender gets it back.
  This is the only place a user can cause a real failed payment today.
- Swaps/sends/deposits INTO such a wallet are blocked by their flows already.

## What already exists (do NOT duplicate)

| Surface | Coverage today |
|---|---|
| Savings card | full — both tabs route into setup ("Set up savings" / setup dialog) |
| Soroswap engine | `needsTrustline` → "Add USDC Trustline" (kit/slot); 4f routes companion → setup dialog |
| CCTP deliver-to-Lobstr pill | offers kit-signed changeTrust before selecting (B4) |
| Send flow | `send-plan` blocks USDC to a destination without trustline, pre-signature |
| Onramp dialog | checks `accountExists && hasUsdcTrustline`, has inline add (slot-scoped) |
| Settings | `AddUsdcTrustlineButton` exists (verify status-awareness at impl time) |
| Receive modal | **activation-aware but trustline-BLIND** — the real gap |
| Drawer wallet sections | no indicator at all |

## The blind spots → proposed notices (priority order)

**P1 — Receive modal (blocking notice).** User selects USDC to receive on a
wallet that has no trustline → today they copy the address and the incoming
payment bounces. Show: "This wallet can't receive USDC yet — if someone sends
USDC now, the payment bounces back to them." + inline **Add trustline** (kit
for external slot, passkey/setup dialog for Normal). Warn, don't hard-block
copying (they may add the trustline in the Lobstr app themselves). Must also
sequence: not-activated → "activate first (1 XLM)" before offering trustline.

**P2 — Drawer wallet-section badge (passive, persistent).** Small amber line
under the affected wallet's section header: "No USDC trustline — Set up".
Same always-visible philosophy as the #67 semaphore. Tap → the right fix flow
for that wallet.

**P3 — Settings accounts (status chip per wallet).** Make the existing
trustline button status-aware: per-wallet chip Ready / No USDC trustline /
Not activated, action only when actionable by that wallet's signer.

**P4 — Onramp preflight audit.** The check exists but is slot-scoped; verify
it guards the wallet the purchase actually DELIVERS to (hybrid case), not
just whoever is connected.

**P5 (decide) — Post-connect one-time notice.** Right after connecting an
external wallet, probe once; if not ready, one dismissible snackbar with the
fix action. Earliest possible moment, but adds a popup to connect — Niko call.

**P6 (tiny) — Swap source pill helper.** Selecting a trustline-less wallet as
USDC source shows a factual 0.00; optional one-liner naming why.

## Design rules (register lessons baked in)

1. **One source of truth:** everything reads `useAccountStatus(address)`
   (shared, cached, per-address Horizon probe). One new pure mapper on top:
   `walletReadiness → 'checking' | 'unknown' | 'not-activated' | 'no-trustline' | 'ready'`
   — unit-tested, reused by every surface. No surface does its own probe math.
2. **Failure ≠ empty (today's cold-load rule):** a FAILED probe maps to
   `unknown` → render NOTHING (or "couldn't check"), never "no trustline".
   And `checking` renders nothing — no flash-of-warning while loading.
3. **Signer routing:** only offer a fix the wallet can sign — external slot →
   kit changeTrust (its own key); Normal/companion → passkey via setup
   dialog. A kit can never sign the companion's changeTrust (4f rule).
4. **Sequencing:** unfunded account → activation (1 XLM) comes first; a
   changeTrust on a nonexistent account just fails. Copy mentions the ~0.5
   XLM reserve a trustline locks.
5. **No global banners.** Passive badge (drawer) + contextual notices at the
   action points where the missing trustline actually breaks something.

## Open decisions for Niko

- P5 post-connect snackbar: want it, or is the drawer badge enough?
- Drawer badge tap target: open the fix dialog directly, or navigate to
  Settings → accounts?
- Receive modal: agree with warn-not-block?

## Test plan sketch

- Pure mapper tests (probe result × wallet kind → state + allowed action).
- Live: Lobstr without trustline → receive USDC shows warning + working kit
  add; drawer badge appears/disappears after add; probe-failure (offline)
  shows NO warning; single-wallet Normal user sees zero change.
