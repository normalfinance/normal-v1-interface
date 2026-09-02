# 83 — Many Turnkey wallets per user: plan

Status: **PROPOSED — awaiting GO.** No code written.
Decisions taken 2026-08-24 (Niko) are recorded in §6.

Scope note, in Niko's words: importing a Stellar phrase is **old technology**
for us — it was how a user brought an existing wallet in, and it puts that
wallet into Turnkey. A user ending up with two Turnkey wallets is therefore
**rare**. This plan is sized for "rare but dangerous", not for a headline
feature.

**This plan does not touch external wallets.** Lobstr, Freighter, Ledger and
WalletConnect keep their keys in their own apps, and everything already built
around connecting, showing, sending and disconnecting them is untouched. The
subject here is only wallets that live at Turnkey.

---

## 1. The model, in plain terms

| Word | What it is | How many per user |
|---|---|---|
| **Sub-organization** | The user's private box at Turnkey. Holds their passkey and their wallets. | **One.** Created at signup, never changes. |
| **Wallet** | One seed phrase. | Today one. Import creates a second. |
| **Account / address** | One chain address derived from a seed. | Many per wallet. |

One seed produces every chain address through derivation paths:

```
one phrase → m/44'/148'/0'    → Stellar   GD6VNX3Y…
           → m/84'/0'/0'/0/0  → Bitcoin   bc1…
           → m/44'/60'/0'/0/0 → Ethereum  0x31d8…
           → m/44'/501'/0'/0' → Solana    6D5Zhb…
```

So **one phrase covers all chains**, and two wallets means two phrases, each
with its own full set of addresses.

## 2. The fact that makes this small (verified in code)

Signing at Turnkey looks like this:

```ts
client.signTransaction({
  organizationId: subOrgId,   // the user's box
  signWith: address,          // WHICH ADDRESS
  ...
})
```

There is **no `walletId`**. Turnkey signs for any address inside the sub-org,
whichever seed it came from. Checked in `stellar-signer.ts` and
`evm-signer.ts`; the autopilot signer is the same.

**So the app can already sign for several wallets.** Passkeys, credential
lookups and the autopilot policy are also sub-org level, not per wallet. Only
two things cannot cope with a second wallet:

1. our database row, which has room for one set of addresses
2. the export dialog, which picks the wallet by `walletId`

That is the entire defect surface. No signing path changes.

## 3. What breaks today

```
turnkey_wallets
  supabaseUid   UNIQUE   ← the database enforces "one row per user"
  subOrgId
  walletId               ← exactly ONE wallet
  stellarAddress …
```

1. The user has wallet **A** (created at signup, Stellar `GD6V…`).
2. They import a phrase. Turnkey creates wallet **B** in the same sub-org.
   *This part works and is not a bug.*
3. Our import route overwrites the single row's `walletId` → **B**.
4. Address columns are only written when empty, so `stellarAddress` stays **A**.
5. The row now says **walletId = B, stellarAddress = A**.
6. `wallet-export-dialog` exports by `walletId` → it returns **B's phrase**
   while the app shows and spends **A's address**.

**Cause and effect: import a second wallet today → the phrase we hand you does
not open the wallet we are showing you.**

## 4. What I want to do

Two phases. No third — see §5 for what I deliberately dropped.

### Phase 1 — stop the corruption (small, no UI change)

One additive table. `turnkey_wallets` keeps its exact meaning: the user's
sub-org and their **primary** wallet (the one created at signup, which is what
new chain accounts are derived on). Nothing that reads it today changes.

```sql
-- docs/audit/sql/turnkey_wallet_seeds.sql  (additive; run in Supabase)
CREATE TABLE IF NOT EXISTS turnkey_wallet_seeds (
  id                TEXT PRIMARY KEY,
  "supabaseUid"     TEXT NOT NULL,
  "walletId"        TEXT NOT NULL,
  label             TEXT,                  -- "Normal wallet", "Imported · GD6V…4S"
  origin            TEXT NOT NULL,         -- 'created' | 'imported'
  "isPrimary"       BOOLEAN NOT NULL DEFAULT false,
  "stellarAddress"  TEXT,
  "bitcoinAddress"  TEXT,
  "ethereumAddress" TEXT,
  "solanaAddress"   TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("supabaseUid", "walletId")
);
CREATE INDEX IF NOT EXISTS turnkey_wallet_seeds_uid_idx
  ON turnkey_wallet_seeds ("supabaseUid");
CREATE INDEX IF NOT EXISTS turnkey_wallet_seeds_stellar_idx
  ON turnkey_wallet_seeds ("stellarAddress");

-- backfill: today's single wallet becomes each user's primary seed
INSERT INTO turnkey_wallet_seeds
  (id, "supabaseUid", "walletId", label, origin, "isPrimary",
   "stellarAddress", "bitcoinAddress", "ethereumAddress", "solanaAddress", "createdAt")
SELECT gen_random_uuid()::text, "supabaseUid", "walletId", 'Normal wallet', 'created', true,
       "stellarAddress", "bitcoinAddress", "ethereumAddress", "solanaAddress", "createdAt"
FROM turnkey_wallets
ON CONFLICT ("supabaseUid", "walletId") DO NOTHING;
```

Two code changes:

- **`/api/turnkey/import` writes a NEW seed row** instead of overwriting
  `turnkey_wallets.walletId`. The primary row stops being corrupted, and both
  wallets exist as real records.
- **`wallet-export-dialog` exports the seed you chose**, and lists the
  addresses that phrase controls *before* revealing it. With one wallet that
  is just useful; with two it is the difference between saving the right
  phrase and the wrong one.

There is **no `isActive` flag and no activation transaction.** Because signing
resolves by address, nothing needs to know which wallet is "current".

### Phase 2 — show both (UI)

- The drawer lists every seed, labelled, instead of one wallet. This is the
  original #40 complaint, solved properly.
- The portfolio and the send/swap source pickers include all of them, exactly
  as they already include the connected Lobstr wallet — same pattern, one more
  row, no new mental model.
- Labels default to something honest (`Imported · GD6V…4S`) and are editable.
- Removing an imported wallet **hides it from the list and never deletes the
  wallet at Turnkey** — the user's funds may be on it (decision §6.2).

## 5. What I dropped, and why

An earlier draft had a third phase migrating 13 server files from "read the
user's row" to "look up by address", plus an "active wallet" concept with a
denormalised copy kept in sync by a transaction.

Both are unnecessary. Signing already resolves by address (§2), and with the
primary row untouched there is no second source of truth to drift. Given two
wallets is rare, a large mechanical migration would be cost with no user
benefit. If it ever becomes common, phase 3 is still available.

## 6. Decisions (taken 2026-08-24)

1. **Two Turnkey wallets → show both.** Not an "active wallet" switch. It
   follows the pattern already built for Normal + Lobstr: both visible, both
   sendable, source chosen per action. Niko: *"I think if it comes to that
   user has 2 wallets it should show both, but I think that would be very
   rare."*
2. **"Remove" means hide.** The Turnkey wallet is never deleted — funds may
   sit on it, and a hidden wallet can be shown again; a deleted one cannot.
3. **The autopilot may sign for any wallet in the sub-org.** The installed
   policy is:
   ```
   eth.tx.chain_id == 8453 && eth.tx.value == 0 && eth.tx.to in [allowlist]
   ```
   It constrains the chain, forbids moving raw ETH, and restricts which
   contracts may be called — it never names a wallet. Example: you enable
   one-signature swaps today; next month you import a wallet holding USDC on
   Base and swap from it; the server completes those Base legs without asking,
   because the permission never named a wallet. That is the intent ("approve
   once, everything is automatic"), and it is how the system behaves today.
   **Action: reword the consent screen** to say the permission covers all
   wallets in the user's Normal account, so it is stated rather than implied.

## 7. Repairing users this already hit

A row where `stellarAddress` does not belong to `walletId` cannot be found by
SQL alone, because the truth lives at Turnkey:

```
for each turnkey_wallets row:
  accounts = turnkey.getWalletAccounts(subOrgId, walletId)
  if row.stellarAddress not in accounts → MISMATCH
```

Given import is legacy and the case is rare, expect a handful at most. Repair
by hand: decide which wallet is really theirs (the one holding funds), write
both records correctly, and tell the user which phrase to keep if they exported
during the broken window.

## 8. Risk

| Risk | Handling |
|---|---|
| A user exported the wrong phrase before phase 1 | The repair pass in §7 identifies them; worth a direct message rather than a silent fix |
| The seed table disagrees with `turnkey_wallets` | The primary row is written once at creation and never mirrored, so there is nothing to drift. A test asserts the primary seed matches the row |
| Backfill misses a user | `ON CONFLICT DO NOTHING` makes it re-runnable; count before and after proves coverage |
| An imported wallet has no Stellar account on-chain | Same activation gate as any wallet ("Add XLM to activate") — no new case |

## 9. Tests

- **Pure:** label defaults, which addresses a given seed controls, and
  choosing a seed from a list
- **Route:** import creates a SECOND seed row and leaves `turnkey_wallets`
  internally consistent — the exact regression that started this
- **Guard:** the primary seed's addresses always equal `turnkey_wallets`'
  addresses
- **Manual (doc 80):** import a second wallet, see both listed, send from each,
  export each and confirm the phrase matches the addresses shown for it

## 10. Sizing

Phase 1 **S** — one table, two code paths, the SQL you run.
Phase 2 **S–M** — list plus labels, reusing the existing multi-wallet UI
pattern.

Phase 1 is what stops a user being handed a phrase that does not open their
wallet, so it ships on its own rather than waiting for the UI.
