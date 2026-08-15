# 72 — External wallets × CCTP: transfer-first design (#32)

Branch: `feat/external-wallet-cctp`. Decision already locked (2026-08-15,
Niko): **transfer-first (Option B)** — external wallets never sign
non-Stellar legs; the user creates a Normal (Turnkey) wallet, moves funds
there, and swaps run entirely on Turnkey rails, where #33 can later push
signatures toward one. Hybrid per-swap signing (Option A) is RULED OUT:
2–4 prompts per swap across two wallet UIs, forever irreducible, plus the
#54 WalletConnect fragility. Do not re-propose.

UX directive (Niko): external user picks USDC → BTC/ETH/SOL and hits the
swap button → popup: "this needs your Normal wallet" → guided creation →
guided funding → swap.

## 1. Current state — verified in code, 2026-08-15

**"Is connecting an external wallet to an existing Turnkey wallet even
possible now?" — Server: yes. Client: no, and the client is where every
bug will come from.**

Server side (all fine already):
- `turnkey_wallets` is one row per Supabase user with NULLABLE per-chain
  columns — an external-wallet user owning a Turnkey row is fully
  representable. No schema change needed.
- `ensureChainAccount(chain, userId, email)` (lib/turnkey/add-account)
  already handles every starting state lazily: nothing yet → passkey
  registration + sub-org + single-chain wallet; sub-org exists → derive
  the chain. External users are ordinary Supabase users — the route works
  for them today.
- `linked_wallets`: the old "external wallets never linked → 403 on
  log-transaction" regression is ALREADY FIXED (`ensureWalletLinked` on
  kit connect, finding #41 / doc 46). Turnkey-created Stellar wallets are
  linked by their creation flows.
- The CCTP Stellar burn signs through `signStellarTxForMgi` — a
  signer-universal path (passkey / local key / external kit). No signer
  work needed for the burn on Turnkey rails.

Client side (the three collisions):

| # | Collision | Where | Effect if ignored |
|---|---|---|---|
| C1 | **Single wallet slot.** The persist store holds ONE wallet; `connectWallet` overwrites it. `ChainSetupDialog`'s stellar branch ends with `connectWalletWithoutKeypair(turnkeyAddress)` | createConnectWalletActions.ts; chain-setup-dialog.tsx | Creating the Normal wallet REPLACES the connected Lobstr wallet — the user's external balances, savings view and activity all vanish from the UI mid-flow |
| C2 | **Self-heal auto-connects Turnkey** whenever `wallet.address` is empty | use-normal-wallet.tsx (recovery effect) | This is finding #42's suspected repro. Today it needs an imported wallet to trigger; once MANY external users own Turnkey rows, "disconnect → reload → silently connected to a different wallet" becomes a common event |
| C3 | **Address & balance sourcing.** Engines use `wallet.address` as the Stellar side; the token store holds the CONNECTED wallet's balances | use-cctp-engine, swap-card, getAllTokens | Transfer-first funds live on the Turnkey address — the swap card would show the wrong USDC balance and the engine would burn from the wrong account |

## 2. Target model — one rule that prevents the bug class

**The persist-store slot ALWAYS holds the wallet the user chose to
connect. For an external-wallet user, the Turnkey wallet is a COMPANION:
server-known (turnkey_wallets row), read via `useTurnkeyWallet` /
portfolio aggregate, used explicitly by the cross-chain flow — and NEVER
written into the slot automatically.**

Consequences, stated as invariants (each gets a test):
- I1: connecting/creating a companion never changes `wallet.address` or
  `walletType` while an external wallet is connected.
- I2: the self-heal restores a Turnkey address ONLY when the last
  connected wallet was 'normal-wallet' (new persisted breadcrumb
  `lastWalletType`, preserved by `disconnectWallet`). External user
  disconnects → stays disconnected. This FIXES #42 structurally.
- I3: savings, sends, Soroswap XLM↔USDC, MGI — everything existing keys
  off the slot and is therefore UNTOUCHED by this feature.
- I4: only the CCTP/LI.FI engines and the new setup/funding UI ever read
  the companion address, and every UI that shows companion funds labels
  them ("your Normal wallet").

## 3. The guided flow (Niko's popup), step by step

Trigger: external user on a cctp pair hits the CTA (today's disabled
gate becomes an enabled "Continue with your Normal wallet" button).

Dialog `NormalWalletSetupDialog` — four resumable, idempotent steps; the
dialog re-derives completed steps on open, so a killed tab resumes:

| Step | What happens | Who signs | Sigs |
|---|---|---|---|
| 1. Create | `ensureChainAccount('stellar')` → passkey + sub-org + Stellar wallet; `linkWallet`; NO slot connect (C1 fix) | passkey (creation ceremony) | 1 |
| 2. Activate | Pre-filled XLM send from the external wallet to the new address (createAccount). Amount ≈ 4 XLM: 1 network reserve for 2 base + 0.5 trustline subentry + ~2.5 fee headroom (#67 semaphore-green from day one) | external kit (#54-guarded) | 1 |
| 3. Trustline | USDC changeTrust on the companion | passkey | 1 |
| 4. Fund | Pre-filled USDC payment external → companion (default = swap amount + small margin; editable) | external kit | 1 |

One-time total: 2 passkey ceremonies + 2 external signatures. After
setup, every swap is passkey-only on Turnkey rails — identical to a
normal-wallet user, and #33's reductions apply to these users
automatically. Repeat swaps skip steps 1–3 (already exist) and offer
step 4 only when the companion's USDC is short of the typed amount.

Steps 2 and 4 reuse the existing send machinery (kit signing via
signOrReconnect, #54 guard, memo n/a — own address). Step 3 reuses the
trustline flow the savings setup already has, pointed at the companion
via passkey.

## 4. Swap wiring after setup (C3 fix)

For `walletType !== 'normal-wallet'` on cctp pairs:
- The engine's Stellar side (burn source, mint recipient, USDC balance)
  = companion address, threaded EXPLICITLY (`cctpStellarAddress`) — never
  `wallet.address`.
- The swap card's USDC row shows the COMPANION balance for cctp pairs,
  labeled "From your Normal wallet · X USDC", with the external wallet's
  USDC shown as "available to move" when larger. XLM↔USDC (Soroswap)
  keeps using the slot wallet — unchanged.
- The companion's Stellar balances come from the existing portfolio
  aggregate (server already reads turnkey rows; add the stellar column to
  the aggregate read if absent).
- Inbound (BTC→USDC) delivery target = companion Stellar address (it has
  the trustline by construction). A later "sweep back to my external
  wallet" convenience is OUT of v1 scope — the drawer shows companion
  funds and normal sends work from... (companion sends are passkey sends,
  already supported for normal-wallet users — v1: user can switch nothing;
  companion funds are visible and swappable; moving them out = swap page
  or a follow-up).

## 4b. Login & signup — explicitly untouched (added after Niko's review)

- **Signup is safe by construction.** The no-steal rule is "adopt into
  the slot only when the slot is EMPTY". Every signup flow (onboarding
  wizard, GetStartedPicker, asset-first, import) runs with an empty slot,
  so wallet creation connects exactly as today. Behavior changes ONLY
  when an external wallet already occupies the slot — a state signup
  never runs in. Supabase auth, captcha, passkey registration and
  linkWallet are not modified anywhere.
- **Self-heal semantics (corrected — the draft would have broken
  new-device login).** The breadcrumb guard must be:
  fire when `lastWalletType` is `'normal-wallet'` **or absent** —
  absent = fresh device/cleared storage, which is today's behavior and
  must stay (a normal-wallet user logging in on a new laptop sees their
  wallet appear). Suppress ONLY when the breadcrumb explicitly records
  an external type: that is the one state where an empty slot means "the
  user chose to disconnect", not "the app forgot". Still fixes #42.
  Accepted edge (documented): an external-wallet user on a BRAND-NEW
  device with a Turnkey row gets the Normal wallet connected until they
  connect their external wallet manually — the device has no evidence of
  their preference, and showing their own funds beats showing nothing.
- **External-wallet login** — kit restore path reads persisted
  walletType/address and reconnects; slot model unchanged.
- New invariant tests: I5 signup still adopts into the empty slot;
  I6 breadcrumb-absent self-heal still fires (new-device login);
  I7 breadcrumb-external self-heal stays silent.

## 4c. Login recognition matrix (added after Niko's second review)

The recognizer is `handleAfterAuth` (onboarding-wizard): after auth it
reads linked_wallets, then Turnkey info, and routes. Niko's requirement:
**a recognized account NEVER re-runs onboarding — it lands in the app
with a wallet connected.** The matrix, today → after #32:

| Account shape | Today | After #32 |
|---|---|---|
| Brand-new (0 linked) | asset-first 'get-started' | unchanged |
| Turnkey user | silent connect → wizard closes → in the app | unchanged (I8 pins it) |
| Legacy/external-only (no Turnkey) | linked-accounts picker (external wallets can't be silently reconnected — the kit needs user interaction) | unchanged |
| External user WITH companion (new shape #32 creates) | n/a | see routing rule below |

Routing rule for the new shape — DECISION (recommendation first):
- **Recommended: most-recently-used wins.** linked_wallets already
  tracks `lastUsedAt` (updated on every connect). If the most recently
  used wallet is the Turnkey one → silent connect (today's fast path).
  If it's an external wallet → show the linked-accounts picker exactly
  as legacy users get today (silent reconnect of an external wallet is
  not technically possible — the kit requires interaction). Cause and
  effect: everyone lands in the flow they last chose; nobody is dumped
  into a wallet they weren't using.
- Simpler fallback: Turnkey always wins silently (external stays one tap
  away in the drawer). Cheaper, but changes external users' login from
  "picker" to "silently in the Normal wallet" — surprising.

New invariant test I8: a Turnkey user's login lands in the app with the
wallet connected and the wizard closed — no extra steps, ever.

## 4d. The reverse direction: a Turnkey user connects an external wallet

Symmetric under the companion model — the slot is simply "the wallet the
user chose most recently", and the Turnkey wallet can never be lost
because it is server-known:

- Connecting Lobstr from the drawer switches the slot to Lobstr (their
  explicit choice — same as today), sets the breadcrumb, and the Turnkey
  wallet remains fully visible in the drawer as the companion.
- Balances/savings/activity follow the slot (per-wallet accounting, as
  today). The drawer switcher (below) makes flipping back one tap —
  which turns today's #40 confusion ("my other wallet vanished") into a
  visible choice.
- CCTP swaps ALWAYS run on the Turnkey wallet regardless of which
  Stellar wallet holds the slot — one rule for both directions.

## 4e. Wallet display inventory — every surface, verified

| Surface | Today | Change under #32 |
|---|---|---|
| Account drawer, Stellar row | shows the SLOT address only (`persist.wallet.address \|\| publicKey`) — a companion Stellar wallet would be INVISIBLE | Stellar section lists BOTH wallets (labels: "Normal wallet" / wallet-kit name), active one marked, tap to switch (external switch opens the kit connect). This is the drawer decision from §7, now recommended as a SWITCHER |
| Account drawer, BTC/ETH/SOL rows | Turnkey addresses from the DB row | unchanged (they are companion chains already) |
| Settings → Accounts | lists ALL linked_wallets with rename/unlink | companion row gets a "Normal wallet" label; UNLINK of the Turnkey wallet should be blocked (it would break ownership checks for CCTP logs) — small guard, rides chunk 2 |
| Onboarding wizard, linked-accounts step | returning-user picker | gains the routing rule of §4c; otherwise unchanged |
| Receive dialogs | per-chain address + QR | Stellar receive gains a wallet selector ONLY if the drawer switcher ships (else unchanged — receives go to the slot wallet) |
| Send modal | implicit from slot (Stellar) / Turnkey rows (chains) | unchanged in v1 (companion Stellar sends = follow-up; funds there are swappable) |
| Savings card/page | implicit from slot | unchanged (I3) |
| Swap card | balances from slot + Turnkey chain hooks | cctp pairs read companion Stellar balance, labeled (§4) |

## 4f-0. REVISION (Niko, review 4): coexistence, NO picker, actions carry the wallet

Niko's clarified model supersedes the "active wallet + make-active
switcher" framing below where they conflict:

- The account's wallets simply COEXIST and are ALL displayed — Normal
  wallet, the connected external wallet, and other linked Stellar
  wallets (read-only balance display; Stellar balances are public).
  No picker modal anywhere; login lands in the app showing everything.
- "Which wallet signs" is answered by WHERE the action starts, not by a
  global active-wallet toggle: an action launched from a wallet's own
  row acts on that wallet (external rows → kit signing, connecting on
  demand if the session lapsed); cross-chain swaps always act on the
  Normal wallet (labeled); savings act on the wallet holding the
  position. Global surfaces default to today's behavior (the wallet the
  user connected), so nothing existing moves.
- The wizard's linked-accounts picker and the "Switch Wallets" button
  remain ONLY as legacy paths for accounts with no Turnkey wallet; they
  are not part of the dual-wallet UX and shrink over time.

## 4f. Drawer design — both wallets, split sections (layout still applies)

**Assets are displayed SPLIT per wallet, never combined.** Why, cause →
effect: a combined XLM row would sum two wallets → no single action can
spend that sum → the displayed number stops matching what send/swap will
accept — the exact #55-class trust break we spent weeks fixing. Split
means every number on screen maps to an action that can spend exactly
that number. The portfolio PAGE remains the aggregate total-wealth view;
the drawer is the operational per-wallet view. Two views, two jobs.

Layout (replaces today's single combined list once chunk 2 lands):

    ┌ Normal wallet          ✓ active ┐
    │ G…abc [copy]                    │
    │ XLM · USDC · BTC · ETH · SOL    │  ← chain assets live ONLY here
    ├ Lobstr        [make active] ────┤
    │ G…xyz [copy]                    │
    │ XLM · USDC                      │
    └ Savings — of the ACTIVE wallet ─┘

- Tapping the inactive wallet switches the slot (external target → kit
  connect flow; Normal target → instant). Breadcrumb updates (§4b).
- A user with only one wallet sees exactly today's drawer (single
  section, no switcher chrome) — zero change for the majority.

**Top-button audit** (verified: Settings / "Create New Account" + /
"Switch Wallets" ⟳):

| Button | Today | Under #32 |
|---|---|---|
| Settings | → settings page | unchanged |
| "Create New Account" (+) | wizard 'choose-wallet' (create/import) | becomes **"Connect external wallet"** when the user already has a Turnkey wallet — opens the wallets-kit picker, links, switches slot (§4d). This is THE entry point Niko asked for. Create/import stays reachable for users with no wallet, and import stays in settings |
| "Switch Wallets" (⟳) | wizard 'linked-accounts' picker | largely superseded by the inline section switcher; DECISION: keep as "All wallets" (legacy multi-wallet users) or remove. Recommend keep-renamed in v1, remove when unused |

## 4g. How swaps act with two wallets — one table

| Pair | Source wallet | Signer | If funds are in the other wallet |
|---|---|---|---|
| XLM ↔ USDC (Soroswap) | the ACTIVE wallet | active wallet's signer (kit or passkey) — exactly today's behavior | switch wallets in the drawer |
| USDC → BTC/ETH/SOL (CCTP out) | **always the Normal wallet**, labeled "From Normal wallet · X USDC" | passkey only | inline "Move USDC from {wallet}" button = the guided flow's funding step (1 external sig), then the swap continues passkey-only |
| BTC/ETH/SOL → USDC (CCTP in) | Normal wallet chains | passkey only | n/a (chain assets only exist on the Normal wallet) |
| Delivery of inbound USDC | lands on the Normal wallet — drawer shows it in that section | — | user can keep it there (it swaps/saves) or send it to their external wallet (normal passkey send) |

The swap card's source labeling is mandatory (I4): whenever the source
wallet is NOT the active drawer wallet, the card says so explicitly —
no silent cross-wallet spending, ever.

## 5. Risk register — what could break, and the countermeasure

| Risk | Countermeasure |
|---|---|
| Slot steal on creation (C1) | ChainSetupDialog stellar branch gains an `adoptIntoSlot` condition: connect only when NO wallet is connected. Invariant test I1 |
| #42 silent wallet switch (C2) | `lastWalletType` breadcrumb + guarded self-heal (fire on 'normal-wallet' OR absent; suppress only on explicit external — see §4b). Invariant tests I2/I6/I7; closes #42 |
| Breaking new-device login for normal-wallet users | The §4b "absent = fire" rule keeps today's restore exactly; pinned by invariant test I6 |
| Savings re-keys to companion | Savings reads the slot only (I3); regression test: external wallet + companion → savings position still keyed to external address |
| Wrong balance shown/burned (C3) | Explicit `cctpStellarAddress` threading; never a fallback chain that could silently pick the other wallet — missing companion = gate, not guess |
| Ownership 403 on swap logging | Companion is in BOTH turnkey_wallets and linked_wallets (step 1 links it) — existing ownership check passes; verify in the chunk-4 test |
| Address-keyed caches (position cache, events cache) | Keys are addresses — the two wallets never share a key; no migration. Verified per cache in chunk 2 |
| WalletConnect fragility during steps 2/4 | Kit signing already runs through the #54 wallet-kit-guard funnels |
| Mid-setup abandonment (paid XLM, no trustline) | Every step idempotent + re-derived on open; the dialog reopens where it left off. Funds sit on the user's own companion at every step |
| Creation rate limit (3 wallets/day) | ensureChainAccount reuses existing sub-orgs; only true first-timers consume quota |
| Two-wallet confusion in UI | Every companion surface labeled "Normal wallet"; drawer lists both (read-only list, #40 minimal) |

## 6. Implementation chunks — each independently testable

1. **Slot protection + #42 fix — DONE 2026-08-15.** `lastWalletType`
   breadcrumb (types+state, survives disconnect, additive migration),
   self-heal guarded per §4b, ChainSetupDialog no-steal. Pure decision
   module `lib/wallet-slot.ts`; invariants I1/I2/I5/I6/I7 as named unit
   tests (6 new, 197 total). All gates green. Known leftover for chunk 3:
   the wizard's own create-wallet path (drawer "+" entry) still adopts
   unconditionally — redesigned there anyway.
   TEST: connect Freighter → disconnect → reload → still disconnected;
   Turnkey user unaffected.
2. **Companion read model — DONE 2026-08-15.** /api/wallet/portfolio
   returns `companionStellar` (aggregateStellarOnly, one Horizon call,
   15s cache) when the connected wallet is external; drawer renders split
   sections per §4f-0 (zero-balance companions hidden; single-wallet
   users pixel-identical); header shows the labeled Normal Stellar row;
   settings blocks unlinking the Turnkey wallet (server 400 + UI badge).
   TEST: external user with a funded companion sees both wallets,
   balances correct, savings untouched.
3. **NormalWalletSetupDialog**: the 4-step guided flow, wired to the swap
   CTA for external users (gate → "Continue with your Normal wallet").
   TEST: fresh external account walks 1→4 on staging; kill the tab after
   each step and reopen — resumes correctly.
4. **Engine wiring**: cctpStellarAddress threading, swap-card companion
   balance display, component-test evolution (the "twice-lost decision"
   test updates: external users still never reach engine signing without
   a companion — the INVARIANT survives, the UX changes).
   TEST: full live matrix — external USDC → BTC/ETH/SOL and back.
5. **Polish**: activity feed for companion legs, docs, register, #40
   leftovers.

Chunk order is dependency order; a stop after any chunk leaves the app
consistent. Chunks 1–2 carry zero user-visible risk and de-risk the rest.

## 7. Open items for Niko (non-blocking until chunk 3)

DECIDED in review 3: drawer shows BOTH wallets, assets SPLIT per wallet
(§4f), inline section switcher, "+" becomes "Connect external wallet"
for Turnkey users.

1. Step-2 funding amount: fixed suggestion (~4 XLM) or computed from live
   reserve+fee display? (Recommend fixed + editable.)
2. Login routing for the new dual-wallet shape (§4c): most-recently-used
   wins (recommended) vs Turnkey-always-wins.
3. "Switch Wallets" (⟳) button fate (§4f): keep renamed "All wallets"
   (recommended for legacy users) vs remove.
4. Copy for the popup ("Cross-chain swaps run through your Normal wallet
   — a passkey-secured wallet that can hold BTC, ETH and SOL").
