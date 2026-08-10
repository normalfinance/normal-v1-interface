# 54 — Bug report for Turnkey: PSBT parser rejects OP_RETURN outputs

**How to use this file:** everything below the line is ready to paste into
Turnkey's support channel (dashboard support, or your partnership contact) as
one message. Nothing in our app depends on their answer — our workaround
shipped weeks ago — but reporting it may fix the road for everyone behind us,
and it's the professional move toward a partner.

If they reply asking for the full PSBT hex, we can regenerate a failing
example on request (any LI.FI Bitcoin swap quote produces one).

---

**Subject: SIGN_TRANSACTION (TRANSACTION_TYPE_BITCOIN) rejects valid PSBTs
containing OP_RETURN outputs — undocumented limitation**

Hi Turnkey team,

We hit a reproducible failure in your Bitcoin PSBT signing path and want to
report it, since it does not appear in your documented limitations.

**What happens**

Submitting `ACTIVITY_TYPE_SIGN_TRANSACTION_V2` with
`TRANSACTION_TYPE_BITCOIN` for a PSBT that contains an `OP_RETURN` output
fails with:

```
Turnkey error 3: failed to extract bitcoin address from script with error: UnrecognizedScript
```

**The PSBT is spec-valid.** Decoded structure of a real failing example
(produced by LI.FI's swap API for a Bitcoin→ETH swap, signed with a P2WPKH
account):

```
bytes=321
inputs  = [#0 P2WPKH {witness_utxo} | #1 P2WPKH {witness_utxo}]
outputs = [P2WPKH, OP_RETURN, P2WPKH, P2WPKH, P2WPKH]
```

Both inputs satisfy every requirement your Bitcoin docs state for P2WPKH:
`witness_utxo` present, `non_witness_utxo` absent, no taproot fields. The
failure is caused by the **output** at index 1: `OP_RETURN` carries data, not
value, and by definition has no address — so an "extract an address from
every script" pass cannot succeed on it, and the whole signing request is
rejected.

**Why this matters beyond us**

OP_RETURN outputs are standard Bitcoin (memo/attestation data, ≤80 bytes,
relayed by default) and are emitted routinely by bridge and swap protocols —
in our case, LI.FI/Chainflip deposit transactions carry their routing memo
this way. Any Turnkey customer signing such flows with
`TRANSACTION_TYPE_BITCOIN` will hit this. For precedent, the same class of
bug existed in bitcoin-core/HWI issue #391 ("Output is not an address").

**Docs gap**

Your Bitcoin page documents the unsupported cases (P2SH-wrapped inputs, P2TR
script-path, non-standard sighash types). OP_RETURN outputs are not listed —
so integrators reasonably expect them to work.

**Our workaround (from your own docs)**

We now compute the BIP-143 sighashes locally and sign them via
`ACTIVITY_TYPE_SIGN_RAW_PAYLOADS` with `HASH_FUNCTION_NO_OP`, reinserting the
signatures with bitcoinjs-lib. That works well (and batches multi-input PSBTs
into a single passkey prompt). We are unblocked — this report is so the next
team doesn't lose days to an error message that points at the inputs when
the problem is an output.

**Ask**

Either accept OP_RETURN outputs in the PSBT parser (they never need address
extraction — nothing spends them), or add the limitation to the Bitcoin
documentation next to the other unsupported cases. Happy to provide a full
failing PSBT hex on request.

Thanks!
