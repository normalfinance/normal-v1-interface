# 34 — Chain registry (#39): plan

Goal: adding an asset should be a registry entry, not a 28-file archaeology
dig. Written after reading the DB schema, the Turnkey wallet route, the send
adapters and the CCTP config.

## What "add a chain" costs today (measured)

- `grep -rl bitcoinAddress src/` → **28 files**
- Chains are modelled as four **named fields** (`bitcoinAddress`,
  `ethereumAddress`, `solanaAddress`, `stellarAddress`) rather than a keyed map
- `SendAdapter.network` is a **closed union type**
- `ASSET_META` (asset → chain + decimals) is its own separate map
- **The database has one column per chain** (`TurnkeyWallet.bitcoinAddress`, …)
  — so a new chain is a migration too

## The insight that splits the work in two

**EVM addresses are chain-agnostic.** One secp256k1 address is valid on
Ethereum, Avalanche C-Chain, Base, Polygon, Arbitrum — the same bytes. So an
EVM chain needs **no new Turnkey address and no new DB column**; it reuses
`ethereumAddress`.

This is already proven in our own codebase: `lib/cctp/config.ts` runs
`ethereum` and `base` off one address, noting "CCTP V2 contracts are deployed
at identical addresses on every EVM mainnet".

Therefore:

| New chain | Real cost |
|---|---|
| **Avalanche / Base / Polygon** (EVM) | registry entry + RPC/USDC constants. **No DB change, no new address, no new adapter** once the EVM adapter is chain-parameterised |
| **Cardano** (non-EVM) | registry entry + new adapter + activity provider + **DB column** + **Turnkey signing support must be verified first — do not assume it exists** |

That reframes the ask: if Avalanche is what's wanted soon, it is genuinely
cheap. Cardano is a different size of job.

## Stage 1 — code layer (no DB change, ships now)

1. **`lib/chains/registry.ts`** — one entry per chain: `id`, `symbol`, `name`,
   `kind` (`evm` | `svm` | `utxo` | `stellar`), `decimals`, `addressField`
   (which Turnkey/DB field holds it — every EVM chain points at
   `ethereumAddress`), `activityPath`, `explorerTx`, `icon`, optional
   `evmChainId` and `cctpDomain`.
2. **`getChainAddress(walletInfo, chainId)`** — the accessor that replaces
   `info.bitcoinAddress` style reads, so consumers stop naming fields.
3. **Derive, don't duplicate** — `ASSET_META` and the `SendAdapter` union come
   from the registry instead of being parallel lists that drift.
4. **Chain-parameterise the EVM adapter** — `ethereum.ts` currently hardcodes
   `chain: mainnet` / `chainId: mainnet.id`.

Consumers migrate incrementally: the accessor works alongside the existing
named fields, so this is additive and reviewable rather than a big-bang rename.

## Stage 2 — data layer (needs a decision, not started)

The per-chain columns are the last thing forcing a migration per non-EVM
chain. Normalising to a `TurnkeyWalletAddress(walletId, chainId, address)`
child table removes that permanently, but it is a real data migration against
the consolidated production database. **Not bundled here** — Stage 1 delivers
the code-layer win with zero DB risk, and Stage 2 is worth doing only when a
non-EVM chain is actually planned.

## Success test

"Add Avalanche" should touch: the registry, plus chain-specific constants
(RPC, USDC address, CCTP domain). Nothing in the send modal, drawer,
portfolio, assets pages, or onboarding.
