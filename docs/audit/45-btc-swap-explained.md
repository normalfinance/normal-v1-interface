# 45 — The Bitcoin swap fix, explained

Companion to [44-btc-swap-fix-plan.md](44-btc-swap-fix-plan.md). That file is
the plan; this one explains the same work from scratch, assuming you have never
touched Bitcoin code before.

---

## 1. What was broken

Swapping **from** Bitcoin (BTC to ETH, BTC to SOL) failed at the signing step
with:

```
Turnkey error 3: failed to extract bitcoin address from script with error: UnrecognizedScript
```

Swapping **to** Bitcoin was fine. So was everything else. The failure was
specific to Bitcoin being the source.

---

## 2. Background: how a Bitcoin spend actually works

Bitcoin has no accounts and no balances. It has **UTXOs** — "unspent
transaction outputs", each one a discrete chunk of coin locked to a script.
Your "balance" is just the sum of the chunks that your key can unlock.

To spend, you build a transaction that:

- **consumes** one or more UTXOs (the *inputs*),
- **creates** new ones (the *outputs*),
- and proves you were allowed to consume each input, with a **signature**.

The difference between what goes in and what comes out is the miner fee. There
is no separate fee field.

### PSBT

A **PSBT** — Partially Signed Bitcoin Transaction, spec BIP-174 — is the
standard container for "here is a transaction, it still needs signatures". One
party builds it, another signs it, a third broadcasts it. It is a binary
key-value format.

In our swap, LI.FI builds the PSBT, we sign it, we broadcast it.

### Script types

Every output is locked by a small script. The common ones:

| Script | Meaning | Address looks like |
|---|---|---|
| P2WPKH | pay to a public key hash, segwit | `bc1q…` |
| P2SH | pay to a script hash | `3…` |
| P2TR | taproot | `bc1p…` |
| **OP_RETURN** | **provably unspendable — carries data, not money** | **no address at all** |

That last row is the whole story.

---

## 3. The real cause

The error message was blaming a "script". So the first job was to find out
*which* script. Instead of guessing, we wrote a small read-only PSBT decoder
([psbt-debug.ts](../../packages/web/src/lib/lifi/psbt-debug.ts)) that parses
the bytes and reports the structure. It never modifies anything — it exists
purely so a failure describes itself.

On a real failing swap it printed:

```
bytes=321  signWith=bc1qktd9dca…
inputs =[#0 P2WPKH {witness_utxo} | #1 P2WPKH {witness_utxo}]
outputs=[P2WPKH, OP_RETURN, P2WPKH, P2WPKH, P2WPKH]
```

Read it against Turnkey's documented rules:

- Both inputs are **P2WPKH** and carry **witness_utxo**, with no
  `non_witness_utxo` and no taproot fields. That is exactly what Turnkey's docs
  require. The inputs are correct.
- Four of the five outputs are ordinary addressable outputs.
- One output is an **OP_RETURN** — LI.FI's swap memo, telling the bridge where
  to deliver the funds.

Turnkey's parser walks every script and derives an address from it. OP_RETURN
has no address, by definition, so the derivation fails and the whole PSBT is
rejected.

**It is a limitation in Turnkey's PSBT parser, not a bug in our code and not a
malformed PSBT.** Their docs list what they reject — P2SH-wrapped inputs, P2TR
script path, non-standard sighash types — and OP_RETURN is not on that list.
The same class of bug has appeared elsewhere:
[HWI issue #391](https://github.com/bitcoin-core/HWI/issues/391), where another
signer rejected OP_RETURN outputs with "Output is not an address".

### Two wrong theories that got ruled out first

Worth recording, because ruling them out is what made the real answer solid:

1. **"The PSBT is base64 and we are sending it as hex."** Checked the magic
   bytes (`70736274ff`, which is `psbt\xff`). It was already valid hex.
   Disproven.
2. **"There is a taproot output."** The hex contained `5120`, which is the
   taproot prefix. But a proper decode showed it was a coincidental substring
   in the middle of other data, not an output prefix. There is no taproot.
   Disproven.

Both looked plausible. Neither survived actually decoding the bytes. That is
the point of the decoder.

---

## 4. The fix

Turnkey documents the way out themselves, on their
[Bitcoin page](https://docs.turnkey.com/networks/bitcoin):

> for scenarios involving signing wrapped inputs … or with the usage of a
> non-standard sighash type you can use the `SIGN_RAW_PAYLOAD` endpoint to sign
> pre-generated sighashes — and handle reinsertion with a library like
> bitcoinjs-lib.

So: **stop asking Turnkey to read the PSBT.**

A signature does not sign the transaction bytes. It signs a 32-byte digest
called the **sighash**, computed from the transaction in a specific way
(BIP-143 for segwit inputs). If we compute the sighash ourselves, Turnkey only
ever sees 32 anonymous bytes. It never parses a script, so the OP_RETURN cannot
upset it.

The flow becomes:

```
LI.FI PSBT
    ↓
we compute one sighash per input we own    (bitcoinjs-lib, BIP-143)
    ↓
Turnkey signs those raw 32-byte digests    (SIGN_RAW_PAYLOADS + passkey)
    ↓
we insert the signatures back into the PSBT (bitcoinjs-lib)
    ↓
existing broadcast route finalises + sends  (unchanged)
```

### The most important property

**The transaction is never modified.** Not the outputs, not the inputs, not the
amounts, not the ordering. We only add signatures, which is what signing means.

This matters more than usual here. The standing rule in
[execute.ts](../../packages/web/src/lib/lifi/execute.ts) is that a Chainflip
PSBT must be signed exactly as returned, because changing an output can make a
deposit **unrefundable** — real, permanent loss. That rule is about *modifying*
the transaction, and it is fully respected: `btc-sign.ts` only ever calls
`updateInput` with a `partialSig`.

---

## 5. Walking through the code

New file:
[btc-sign.ts](../../packages/web/src/lib/lifi/btc-sign.ts). Step by step.

### Getting the public key

To build a signature into a transaction you need the **public key** as well as
the signature. Our database stores addresses, not public keys — and an address
is a *hash* of a public key, so you cannot work backwards.

Turnkey does return it: `publicKey` on a wallet account. New route
[btc-pubkey/route.ts](../../packages/web/src/app/api/turnkey/btc-pubkey/route.ts)
fetches it, authenticated.

Why a route rather than passing it from the browser? Because that key decides
which signature ends up in a Bitcoin transaction. It comes from Turnkey, never
from the client.

The field is optional in Turnkey's schema, so if it is ever missing the route
returns a clear 502 instead of continuing without it.

### Verifying the key before it can do damage

```ts
const ourPayment = payments.p2wpkh({ pubkey: publicKey, network });
if (ourPayment.address !== bitcoinAddress) throw new Error(...);
```

Derive the address *from* the key and check it matches the address we are
signing for. If it does not, stop.

Without this check, a wrong key produces a signature that is real but useless —
and you would not find out until the network rejected the broadcast, with an
error that explains nothing.

### Computing the sighashes

```ts
const unsignedTx = Transaction.fromBuffer(psbt.data.globalMap.unsignedTx.toBuffer());
const scriptCode = payments.p2pkh({ pubkey: publicKey, network }).output;

const sighash = unsignedTx.hashForWitnessV0(index, scriptCode, witnessUtxo.value, Transaction.SIGHASH_ALL);
```

Three things worth understanding:

- `hashForWitnessV0` is **bitcoinjs-lib's** BIP-143 implementation. We are not
  hand-rolling cryptography. Getting BIP-143 subtly wrong produces signatures
  that verify against the wrong data, which is a very bad failure mode.
- `scriptCode` uses the **P2PKH** script even though our address is P2WPKH.
  That looks wrong and is not: BIP-143 specifies that a P2WPKH input is signed
  against the equivalent P2PKH script. It is in the spec.
- `SIGHASH_ALL` means "this signature commits to every input and every output".
  Any change to the transaction after signing invalidates it. That is the
  strongest and standard choice, and here it is also a safety property — the
  OP_RETURN memo cannot be swapped out behind our signature.

### Only signing our own inputs

```ts
if (!witnessUtxo || !bytesEqual(witnessUtxo.script, ourScript)) return;
```

A PSBT can contain inputs belonging to several parties. We sign only the inputs
whose locking script is ours. Others are left untouched — we could not sign
them anyway, and it is not our business to try.

If nothing matches, we throw rather than broadcasting a transaction with
nothing signed.

### One passkey prompt, not one per input

The failing PSBT had **two** inputs. A naive loop means two Turnkey activities,
which means the user taps their passkey twice for one swap. That is a bad
experience and it looks broken.

Turnkey has a **plural** endpoint, `SIGN_RAW_PAYLOADS`. So we collect every
sighash first, then send them in a single activity:

```ts
await turnkeyClient.signRawPayloads({
  type: 'ACTIVITY_TYPE_SIGN_RAW_PAYLOADS',
  parameters: {
    signWith: bitcoinAddress,
    payloads: toSign.map((t) => bytesToHex(t.sighash)),
    encoding: 'PAYLOAD_ENCODING_HEXADECIMAL',
    hashFunction: 'HASH_FUNCTION_NO_OP',
  },
});
```

`HASH_FUNCTION_NO_OP` is important. Normally you hand a signer a message and it
hashes it before signing. Our payload **is already** the hash — BIP-143 sighash
is a double SHA-256. If Turnkey hashed it again, the signature would commit to
the wrong thing and fail verification everywhere. NO_OP means "sign these bytes
exactly as given".

This deviates from the plan, which had proposed `psbt.signInputAsync`. That API
signs one input per call, which is exactly the two-prompt problem. Recorded in
the plan doc rather than quietly changed.

### Low-S normalisation

```ts
if (sBig > SECP256K1_HALF_N) sBig = SECP256K1_N - sBig;
```

An ECDSA signature is two numbers, `r` and `s`. For any valid signature, both
`s` and `curveOrder - s` are mathematically valid — which historically let
someone alter a signature, and therefore the transaction ID, without the key.
That is transaction malleability.

Bitcoin's fix (BIP-62) is to require `s` in the lower half of the curve order.
A high-S signature is still cryptographically valid, but nodes treat it as
non-standard and **silently drop it**.

That failure mode is nasty: the broadcast appears to succeed and the
transaction simply never appears anywhere. Turnkey does not guarantee low-S, so
we normalise. It is four lines and it removes an entire class of
impossible-to-debug report.

### Verifying before broadcasting

```ts
const valid = psbt.validateSignaturesOfInput(index, (pubkey, msghash, signature) =>
  secp256k1.verify(signature, msghash, pubkey)
);
if (!valid) throw new Error(`Signature for input ${index} failed validation — not broadcasting`);
```

Check every signature against the digest it was made for, *before* anything
leaves the browser. A wrong key or a mangled signature dies here with a clear
message, rather than becoming a broadcast that quietly goes nowhere.

The general rule: when the failure mode is "money vanishes with no error",
spend the extra check.

---

### One bundle detail worth copying

`btc-sign.ts` is loaded with `await import(...)` inside `executeBtc`, not with
a normal top-of-file import.

The reason is measurable. `bitcoinjs-lib` is not small, and only Bitcoin-source
swaps need it. With a static import, the `/swap` page shipped 68.3 kB of
page JavaScript; with the dynamic import, 22.8 kB. Everyone swapping XLM was
downloading a Bitcoin library they would never run.

`execute.ts` already did this for `viem`, `@solana/web3.js` and `@turnkey/http`
— chain-specific weight is loaded only when that chain is actually used. The
first version of this fix broke that convention by accident; it now follows it.

The general lesson: when a module is only needed on one branch, import it on
that branch.

---

## 6. Why ETH and SOL are unaffected

[execute.ts](../../packages/web/src/lib/lifi/execute.ts) has three separate
functions — `executeEvm`, `executeBtc`, `executeSol` — chosen by the quote's
source chain. Only `executeBtc` changed.

Bitcoin as a **destination** (ETH to BTC, SOL to BTC) never runs this code at
all. Those swaps are signed on the source chain; the Bitcoin address is only a
payout target. They were never affected by the bug and are not affected by the
fix.

That is the reasoning. The test matrix below checks it rather than trusting it.

---

## 7. How to test

These are **real transactions with real money**. Use the smallest amount each
route allows.

| # | Swap | What it proves | Expected |
|---|---|---|---|
| 1 | **BTC → ETH** | the fix itself | **one** passkey prompt, swap completes |
| 2 | **BTC → SOL** | the fix, different destination | completes |
| 3 | ETH → BTC | EVM signing untouched | unchanged |
| 4 | SOL → BTC | Solana signing untouched | unchanged |
| 5 | ETH → SOL | general regression | unchanged |
| 6 | XLM ↔ USDC | Soroswap untouched | unchanged |

Tests 1 and 2 are the fix. Tests 3 to 6 prove nothing else moved.

**On test 1, watch the passkey prompt count.** One prompt is correct. Two means
the batching regressed, and while the swap would still work, the UX is wrong
and it should be reported.

### If something fails

Every Bitcoin signing error now carries the PSBT decode with it, so a failure
report should include the full console line beginning `[lifi-swap]`. It looks
like:

```
bytes=321 signWith=bc1q… inputs=[#0 P2WPKH {witness_utxo} | …] outputs=[P2WPKH, OP_RETURN, …]
```

That single line says more than the error message does. Include it.

---

## 8. Rollback

Self-contained. Revert `executeBtc` to the old `TRANSACTION_TYPE_BITCOIN` call
and the new module and route become inert — nothing else imports them. Of
course, reverting restores the bug.

---

## 9. Still to do

Report the OP_RETURN parser limitation to Turnkey, with the decode above.
Either their docs or their parser needs updating. We ship regardless of what
they say — the fix is their own documented alternative, not a workaround
around them.
