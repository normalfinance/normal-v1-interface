# CCTP Phase-0 Spike — Stellar ⇄ Base (TESTNET ONLY)

Proves the CCTP bridge leg end-to-end before any app code depends on it:
Soroban `deposit_for_burn`, Iris attestation, EVM `receiveMessage`, and the
inbound `CctpForwarder` + hookData path (the one where a mistake on mainnet
means permanently lost funds).

Uses **throwaway keys only** (`state.json`, gitignored) — never Turnkey or user
wallets. All funds are faucet money.

## Run order

```bash
cd scripts/cctp-spike

# 0. hookData encoder self-test (no network)
node hookdata.mjs

# 1. create keys, friendbot XLM, USDC trustline; prints faucet TODOs
node setup.mjs

# 2. manual faucets (~2 min, captcha):
#    - https://faucet.circle.com  → USDC to the Stellar G-address (Stellar testnet)
#    - https://faucet.circle.com  → USDC to the 0x address (Base Sepolia)
#    - Base Sepolia ETH faucet    → the 0x address (e.g. portal.cdp.coinbase.com/products/faucet)
#    re-run `node setup.mjs` to confirm balances

# 3. Stellar → Base (burn on Soroban, mint on Base Sepolia)
node outbound.mjs 1

# 4. Base → Stellar (burn with hookData, mint_and_forward via CctpForwarder)
node inbound.mjs 1
```

## What success tells us

- outbound: Soroban burn interface + args are right; Iris indexes Stellar (domain
  27) by tx hash; attestation latency from Stellar (~expect seconds–minutes);
  mint gas cost on EVM (relayer float sizing).
- ALREADY VALIDATED by `probe-interface.mjs` (simulation, no funds): the
  deposit_for_burn interface + derived USDC SAC are correct, and the burn pulls
  USDC via `transfer_from` → a prior SAC `approve` is required (2-signature
  flow in the app, mirroring the savings 2-tx UX). outbound.mjs does both.
- inbound: **hookData layout is exactly right** (forwarder reverts otherwise);
  trustline prerequisite behavior; `mint_and_forward` XLM cost (relayer float);
  attestation latency from Base Sepolia at finality threshold 2000.
- Timings printed by both scripts feed the ETA copy in the swap UI and the
  Ethereum-direct vs Base-hop decision.

## Re-attestation check (optional)

Attestations expire ~24h. To test recovery, take `lastOutboundNonce` from
state.json a day later and:

```bash
curl -X POST https://iris-api-sandbox.circle.com/v2/reattest/<nonce>
```

then re-run the mint step with the refreshed attestation.

## Notes

- Iris sandbox rate limit is 35 req/s shared; these scripts poll at 1 req/3s.
- Domain IDs: Stellar 27, Base Sepolia 6. Contracts in `config.mjs`.
- If `outbound.mjs` fails in simulation with a token error, the testnet USDC
  issuer in `config.mjs` doesn't match what the TokenMessengerMinter burns —
  check the asset you received from faucet.circle.com in state and update
  `usdcIssuer`.
