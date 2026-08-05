# 44 — Fixing Bitcoin-source swaps: plan

**Status: IMPLEMENTED, awaiting live test.** Sized M. Money-signing code — the
plan is deliberately detailed.

Typecheck and lint are clean. The test matrix at the bottom has **not** been run
yet: it needs real transactions on mainnet, so it is a testing task, not a
coding one.

## The confirmed diagnosis

Decoded from a real failing swap (`lib/lifi/psbt-debug.ts`):

```
bytes=321  signWith=bc1qktd9dca…(P2WPKH)
inputs =[#0 P2WPKH {witness_utxo} | #1 P2WPKH {witness_utxo}]
outputs=[P2WPKH, OP_RETURN, P2WPKH, P2WPKH, P2WPKH]
```

Both inputs satisfy **every** documented Turnkey requirement for P2WPKH:
`witness_utxo` present, `non_witness_utxo` absent, no tap fields. There is **no
taproot** — the earlier `5120` reading was a coincidental hex substring.

Every output is addressable **except the OP_RETURN** (LI.FI's swap memo), which
by definition has no address. Turnkey's error is literally *"failed to extract
bitcoin address from script"*. Same failure shape as
[HWI #391](https://github.com/bitcoin-core/HWI/issues/391), where a different
signer rejected PSBTs containing OP_RETURN with "Output is not an address".

**Conclusion: an undocumented limitation in Turnkey's PSBT parser.** Their docs
list the rejection cases (P2SH-wrapped, P2TR script path, non-standard sighash)
and OP_RETURN is not among them.

## The fix is Turnkey's own documented alternative

From [their Bitcoin docs](https://docs.turnkey.com/networks/bitcoin):

> for scenarios involving signing wrapped inputs … or with the usage of a
> non-standard sighash type you can use the `SIGN_RAW_PAYLOAD` endpoint to sign
> pre-generated sighashes — and handle reinsertion with a library like
> bitcoinjs-lib.

So instead of handing Turnkey the PSBT to parse, we compute the signature
hashes locally and ask it to sign those. **Turnkey never sees the OP_RETURN.**

`bitcoinjs-lib` v7 and `bip174` are already installed.

## What must not change

**The PSBT's outputs are never touched.** We only add signatures — which is
what signing is. The standing warning about Chainflip deposits becoming
unrefundable applies to *modifying* outputs, and does not apply here.

## Design

### 1. Public key (the one dependency, now resolved)
`v1WalletAccount.publicKey` exists in Turnkey's API — "the public component of
this wallet account's underlying cryptographic key pair". Our wallet route
returns addresses only, so add a small authenticated route that returns the
compressed pubkey for the user's Bitcoin account.

The field is optional in their schema, so if it is ever absent we fail with a
clear message rather than guessing.

**Verification, not assumption:** before signing we check that
`hash160(pubkey)` equals the witness program in our address. If it doesn't
match, we stop. A wrong key would produce a signature that silently fails to
validate.

### 2. Sign with bitcoinjs as the driver
Rather than hand-rolling BIP-143, use `psbt.signInputAsync(i, signer)` with a
custom signer whose `sign(hash)` calls Turnkey. bitcoinjs then computes the
sighash, DER-encodes, and finalises — all the fiddly, easy-to-get-wrong parts
stay in a well-tested library, and our code only bridges to Turnkey.

> **As built, this changed.** `signInputAsync` signs one input per call, which
> means one Turnkey activity — and therefore one passkey prompt — per input.
> The failing PSBT has two inputs, so that route would prompt twice, which
> point 3 below explicitly rules out. The implementation instead calls
> `tx.hashForWitnessV0(...)` directly (still bitcoinjs, still the library's
> BIP-143 implementation — nothing hand-rolled), collects every sighash first,
> signs them in ONE `SIGN_RAW_PAYLOADS` activity, and inserts the results with
> `psbt.updateInput`. DER encoding is still bitcoinjs
> (`script.signature.encode`), and finalisation is still bitcoinjs, in the
> existing broadcast route.

### 3. One passkey prompt, not one per input
The failing PSBT had **two** inputs, and a naive loop would mean two passkey
prompts. Turnkey's **plural** `SIGN_RAW_PAYLOADS` signs several payloads in one
activity. Compute both sighashes first, sign in a single activity, then insert.

### 4. Low-S normalisation
Bitcoin consensus requires the signature's S value to be in the lower half of
the curve order. If Turnkey returns a high S, the transaction is non-standard
and relays will drop it — a failure that would look like "broadcast succeeded
but nothing happened". Normalise before insertion.

### 5. Only sign our own inputs
LI.FI may combine UTXOs from several addresses. Sign only inputs whose
`witness_utxo` script matches our address; leave others alone.

## Files

- **new** `lib/lifi/btc-sign.ts` — the signer bridge and sighash flow
- **new** `api/turnkey/btc-pubkey/route.ts` — authenticated pubkey lookup
- `lib/lifi/execute.ts` — `executeBtc` calls the new path
- `lib/lifi/psbt-debug.ts` — kept; the decode stays attached to errors
- `api/turnkey/broadcast-btc/route.ts` — **unchanged, and verified so.** It
  already takes a signed *PSBT* hex, finalises it and extracts the raw
  transaction, which is exactly what the new signer returns.

### Two things found while building

**`btc-sign.ts` is imported dynamically, and that matters.** The first version
imported it at the top of `execute.ts`, which put `bitcoinjs-lib` in the bundle
of every user who opens `/swap` — measured, not assumed:

| | `/swap` page JS | first load |
|---|---|---|
| static import | 68.3 kB | 1.40 MB |
| dynamic import | **22.8 kB** | **1.36 MB** |

45 kB of Bitcoin library was being shipped to people swapping XLM. `execute.ts`
already dynamic-imports viem, `@solana/web3.js` and `@turnkey/http` for exactly
this reason, so the fix was to follow the convention already in the file.


`btc-sign.ts` is the first client-side use of `bitcoinjs-lib` in this app —
until now it only ran in API routes, where Node provides `Buffer`. Next does
not polyfill the `Buffer` global for browser bundles and `next.config.mjs` adds
no polyfill, so a `Buffer.from(...)` in this file could have thrown
`Buffer is not defined` at signing time — the worst possible moment.

bitcoinjs-lib v7 dropped `Buffer` from its API in favour of `Uint8Array`
(verified in `node_modules`: `witnessUtxo.value` is a `bigint`, `partialSig`
fields are `Uint8Array`), so the file uses `Uint8Array` throughout and needs no
polyfill. Worth knowing before anyone adds a `Buffer.from` here later.

## Impact on ETH and SOL — none, and here is why

`executeEvm`, `executeBtc` and `executeSol` are separate functions selected by
the quote's source chain. Only the Bitcoin branch changes.

**Bitcoin as a *destination* (ETH→BTC, SOL→BTC) never touches this code**:
those swaps are signed on the source chain, and the BTC address is only a
payout target. They should already work, and the test matrix confirms it rather
than assuming it.

## Test matrix

| # | Swap | Exercises | Expected |
|---|---|---|---|
| 1 | **BTC → ETH** | the fix | one passkey prompt, completes |
| 2 | **BTC → SOL** | the fix, different destination | completes |
| 3 | ETH → BTC | EVM signing, BTC as destination | unchanged |
| 4 | SOL → BTC | Solana signing, BTC as destination | unchanged |
| 5 | ETH → SOL | regression check | unchanged |
| 6 | XLM ↔ USDC | Soroswap untouched | unchanged |

Tests 1 and 2 are the fix. Tests 3–6 prove nothing else moved.

Use the smallest amounts the routes allow — these are real transactions.

## Risks

| Risk | Handling |
|---|---|
| Wrong public key → invalid signature | verified against the address before signing |
| High-S signature → silently dropped by relays | normalised |
| Signing an input that isn't ours | only inputs matching our script are signed |
| Finalisation produces a malformed tx | bitcoinjs finalises; we broadcast only if extraction succeeds |
| Regression on ETH/SOL | separate code paths, plus tests 3–6 |

## Rollback

Self-contained: revert `executeBtc` to the `TRANSACTION_TYPE_BITCOIN` call. The
new module and route are additive and inert without it.

## Also worth doing (not blocking)

Report the parser limitation to Turnkey with the decode above. Their docs don't
list OP_RETURN as unsupported, so either the docs or the parser needs updating.
We ship regardless of their answer.
