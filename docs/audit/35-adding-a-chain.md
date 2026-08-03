# 35 — Adding a chain: what it costs now

Companion to `34-chain-registry-plan.md`. This is the honest checklist of what
"we're ready for new assets" actually means today — what's one entry, and what
still needs a hand.

## The short version

| | EVM chain (Avalanche, Base, Polygon…) | Non-EVM chain (Cardano, TON…) |
|---|---|---|
| Turnkey address | **reuses the existing one** ✅ | new address type — **verify Turnkey supports the curve/format FIRST** |
| Database | **no change** ✅ | new column on `TurnkeyWallet` |
| Send adapter | **reuses the EVM adapter** ✅ | new adapter implementing `SendAdapter` |
| Registry entry | 1 | 1 |
| Activity route | 1 small route | 1 small route |
| Balances | add to the aggregator | add to the aggregator |

**Why EVM is nearly free:** one secp256k1 address is valid on every EVM chain,
so Avalanche reuses `ethereumAddress` — no new address, no migration. Already
proven in `lib/cctp/config.ts`, which runs ethereum + base off one address.

## Step by step — an EVM chain

1. Add an entry to `lib/chains/registry.ts` (`kind: 'evm'`, `evmChainId`,
   `addressField: 'ethereumAddress'`, explorer, activity path, `cctpDomain` if
   bridgeable).
2. Add the RPC URL and, if using CCTP/LI.FI, the chain's USDC address.
3. Copy `api/activity/ethereum/route.ts` for the new chain's explorer API.
4. Include the asset in the portfolio aggregator.

The send modal, drawer, portfolio, assets pages and onboarding need **no
edits** — they read through `getChainAddress()` and the registry.

## Step by step — a non-EVM chain

All of the above, plus:

1. **Verify Turnkey signing support before anything else.** If Turnkey can't
   sign for the chain, nothing downstream matters. Do not assume.
2. Add the address column to `TurnkeyWallet` + migration, and a new
   `AddressField` in the registry (types derive from it automatically).
3. Write a send adapter implementing the `SendAdapter` contract.
4. Provide an activity source.

## What's done vs. what's honest

**Done:**
- `lib/chains/registry.ts` — the single description of every chain
- `getChainAddress(wallet, chainId)` — read an address without naming a field
- `TurnkeyWalletInfo` / `TurnkeyAddresses` derive from the registry, so a new
  `AddressField` extends every consumer's type automatically
- `ASSET_META` derives from the registry (no parallel list to drift)
- `SendAdapter.network` is `ChainId`, not a hand-written union
- The EVM adapter takes a chain instead of hardcoding Ethereum mainnet

**Not done, deliberately:**
- **~25 files still read named fields** (`info.bitcoinAddress`). They keep
  working — the accessor is additive — but each one is a place a future chain
  *could* need a look. Migrating them is mechanical and best done as its own
  reviewable pass, not mixed into the structural change.
- **The DB still has one column per chain.** Normalising to a
  `TurnkeyWalletAddress(walletId, chainId, address)` table would remove the
  last per-chain migration, but it's a real data migration against the
  production database and buys nothing until a non-EVM chain is actually
  planned. Decision, not a default.

## The test for "are we ready?"

Adding Avalanche should touch: the registry, RPC/USDC constants, one activity
route, one aggregator line. If it touches the send modal, the drawer or the
portfolio page, something still needs migrating — and that's the signal to
finish the consumer pass above.
