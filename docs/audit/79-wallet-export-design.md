# 79 — Wallet Export (recovery phrase): research + design

Requested by Niko 2026-08-21 ("users should feel safe in case something
goes wrong with our app"). STATUS: **GO'd 2026-08-21** — D2 = MANDATORY at
creation, D3 = phrase-only. Research verified against live sources on
2026-08-21; nothing here is from memory.

## 1 · The ask

1. When a user creates any wallet, they should be able to get its private
   key / passphrase and save it to their computer.
2. Export must also be available from Settings → Accounts.
3. Question raised: "Turnkey doesn't give us a passphrase, right?"

## 2 · Verified facts (sources inline)

- **A real seed phrase EXISTS — the premise was wrong in our favor.**
  Every Turnkey wallet is a standard BIP-39 HD wallet: ONE mnemonic behind
  all four chain accounts. Turnkey supports first-class export:
  `ACTIVITY_TYPE_EXPORT_WALLET` (returns the mnemonic),
  `EXPORT_WALLET_ACCOUNT` / `EXPORT_PRIVATE_KEY` (per-account keys).
  [docs.turnkey.com/wallets/export-wallets, fetched 2026-08-21]
- **The plaintext can never touch our app or servers.** The enclave
  encrypts the mnemonic (HPKE) to a one-time Target Encryption Key whose
  private half lives in a Turnkey-hosted page (`export.turnkey.com`)
  embedded as an iframe; that page decrypts and displays the phrase in its
  OWN browser origin. Docs verbatim: "neither your app nor Turnkey ever
  sees the plaintext." Client package: `@turnkey/iframe-stamper`
  (NOT yet a dependency — the only new package this feature needs).
  [same source]
- **Only the user's passkey can authorize an export.** Turnkey is
  deny-by-default ("Almost all actions on Turnkey are implicitly denied by
  default"); only the sub-org's root quorum — the user's passkey — bypasses
  policies. Verified consequences: our parent server key CANNOT export
  user wallets, and the autopilot delegate CANNOT either (its only ALLOW
  policy covers Base `eth.tx` signing; export falls under implicit deny).
  [docs.turnkey.com/concepts/policies/overview, fetched 2026-08-21]
- **The exported phrase is PORTABLE — our derivation paths are all
  ecosystem standards** (verified in `src/lib/turnkey/account-specs.ts`):
  | Chain | Path | Standard | Restores in |
  |---|---|---|---|
  | Bitcoin | m/84'/0'/0'/0/0 | BIP-84 native segwit | Sparrow, BlueWallet |
  | Ethereum | m/44'/60'/0'/0/0 | BIP-44 | MetaMask (default path) |
  | Solana | m/44'/501'/0'/0' | BIP-44 ed25519 | Phantom (default path) |
  | Stellar | m/44'/148'/0' | SEP-0005 | Freighter, Lobstr recovery |
  Cause-effect: if Normal disappeared tomorrow → the user types the phrase
  into MetaMask/Phantom/Freighter/Sparrow → all funds recovered. This is
  the marketing-grade safety story the feature exists for.

## 3 · Custody analysis

This feature STRENGTHENS the non-custodial story: the user gains a
Normal-independent recovery path while we remain cryptographically unable
to read the secret (enclave → iframe origin, never ours). New standing
rule it creates: **no delegate policy may ever include export activities**
— the autopilot's `eth.tx`-only condition already satisfies this; any
future policy must be checked against it (add to the autopilot v2 review).

## 4 · Design decisions

- **D1 — iframe flow, not DIY decryption. DECIDED (recommendation).**
  `@turnkey/crypto` could decrypt the bundle in our own JS, giving full UI
  control — but that puts the plaintext phrase in our app's memory, one
  XSS away from disaster, and destroys the "we never see it" claim. The
  iframe costs visual control and buys the strongest security sentence.
- **D2 — creation-time UX. DECIDED: MANDATORY (Niko 2026-08-21).** After a
  Normal wallet is created, the export/backup step is REQUIRED before the
  flow completes — the user must open the recovery phrase and confirm
  they've saved it. Design care this forces on us: (a) it must not
  re-trigger for a user who ALREADY has a wallet (only true first creation
  — keyed on "wallet did not exist before this action"); (b) the guided
  cross-chain flows (NormalWalletSetupDialog / ChainSetupDialog) create the
  wallet mid-swap, so the mandatory step is inserted BETWEEN creation and
  the action resuming, and must be resumable (kill-the-tab → reopen still
  demands backup, since the wallet now exists without a confirmed backup);
  (c) we cannot PROVE the user saved it (the phrase is in Turnkey's iframe,
  not our state) — "confirm" is an honest checkbox ("I've saved my recovery
  phrase somewhere safe"), and a `nf:wallet-backed-up:<subOrgId>`
  localStorage marker suppresses the re-prompt. NOT a server flag: backup
  status is a device-local UX nudge, never a gate on the user's own funds.
- **D3 — phrase-only. DECIDED (Niko 2026-08-21).** Export the ONE recovery
  phrase (`EXPORT_WALLET`), which restores every chain (see table). No
  per-chain private-key export in v1 (`EXPORT_WALLET_ACCOUNT` can be added
  to the same dialog later if ever needed).
- **D4 — "save to computer". DECIDED (explicit ask).** The dialog offers
  Copy + "Download as file". HONESTY REQUIREMENT: a plaintext file in
  Downloads is genuinely less safe than paper — the download button carries
  that warning and recommends offline storage. (Note: the download happens
  from the IFRAME's origin if Turnkey's page supports it; otherwise our
  copy is limited to instructions + the iframe's own copy control — to be
  confirmed in the spike, see §6.1.)

## 5 · Implementation plan (after GO)

No new server routes, no schema, no env: export is entirely
client ↔ Turnkey, passkey-stamped. Slices:

1. **Spike (½ h):** add `@turnkey/iframe-stamper`; hard-code a dev-only
   export against my test sub-org; confirm (a) no org feature flag blocks
   export on our account, (b) the iframe renders from localhost, (c) what
   in-iframe controls exist (copy/download). Findings appended here.
2. **`components/_common/wallet-export-dialog.tsx`:** warning screen
   ("anyone with this phrase controls all your crypto · never share it ·
   Normal will never ask for it") → passkey ceremony (`runWebauthnCeremony`
   like every other ceremony, #51/#63 rule) → `EXPORT_WALLET` with the
   iframe's target public key → bundle injected → phrase displayed inside
   the iframe. Failure = calm error + retry; nothing sensitive in state.
3. **Settings → Accounts:** "Export recovery phrase" button on the Normal
   wallet card (next to the address list from the 2026-08-21 batch).
4. **Post-creation nudge (per D2):** one shared banner line rendered after
   wallet creation in the three creation sites — NormalWalletSetupDialog's
   "ready" step, ChainSetupDialog success, onboarding wizard — opening the
   same dialog. (If D2 = forced: same component, auto-opened.)
5. **Docs:** junior explainer section (doc 78 or standalone 79.html),
   register entry, doc 73/78 test rows (Part L below).

## 5.1 · Spike findings (2026-08-21)

Static verification DONE (the runtime parts need a live browser+passkey =
Niko's test, listed as ship gates):
- `@turnkey/iframe-stamper@2.11.1` installed. API confirmed from its types:
  `new IframeStamper({ iframeUrl, iframeElementId, iframeContainer })` →
  `await init()` returns the iframe's TEK **public key** →
  `injectWalletExportBundle(bundle, organizationId)` decrypts + displays
  inside the iframe. `clearClipboardOnPaste` + a `clear()` teardown exist.
- Export activity confirmed on our existing `@turnkey/http` TurnkeyClient:
  `exportWallet({ type: 'ACTIVITY_TYPE_EXPORT_WALLET', organizationId:
  <subOrgId>, parameters: { walletId, targetPublicKey } })` →
  `activity.result.exportWalletResult.exportBundle`. Passkey-stamped via
  `WebauthnStamper` — the SAME pattern as autopilot-consent.ts, wrapped in
  `runWebauthnCeremony` (#51/#63 rule).
- **CSP: none configured** in next.config / middleware, so no `frame-src`
  blocks export.turnkey.com today. (If a CSP is ever added, it must include
  `frame-src https://export.turnkey.com`.)
- Iframe URL: `https://export.turnkey.com`.

## 6 · Ship gates

1. Spike confirms export is enabled for our org + iframe embeds on
   localhost/staging/prod (CSP frame-src for export.turnkey.com needed?).
2. **Round-trip live test:** export the phrase → import into Freighter
   (Stellar) AND MetaMask (ETH) → the SAME addresses must appear. This is
   the proof the safety story is true, not claimed.
3. Grep: no delegate/policy code path grants export (§3 rule).
4. Live test of both entry points + a passkey-rejection path.

## 7 · Test plan (Part L candidates)

| # | Test | Expect |
|---|---|---|
| L1 | Settings → Export recovery phrase → passkey | Warning screen first; phrase renders INSIDE the Turnkey iframe; our DOM/network tab shows only the encrypted bundle |
| L2 | Reject the passkey | Calm error, retry available, nothing displayed |
| L3 | Round-trip: phrase → Freighter + MetaMask | Same G… and 0x… addresses as in Normal |
| L4 | Create a fresh wallet (any chain) | Backup nudge appears (or forced step, per D2) |
| L5 | Autopilot negative: call EXPORT_WALLET with the delegate key (dev) | Turnkey refuses — implicit deny |
| L6 | External wallet card (Lobstr) | NO export button — their keys live in their app |

## 8 · What does NOT change

Signing flows, autopilot, custody model, onboarding order, external
wallets (we can't and shouldn't export what we never held). No server
code at all.

## 9 · Effort

One focused session after GO; the only unknown is the spike (§5.1), which
runs first and updates this doc before the UI is built.
