'use client';

import type { TurnkeyClient } from '@turnkey/http';

import { buildAuthHeaders } from '@/utils/http';
import { secp256k1 } from '@noble/curves/secp256k1';
import { Psbt, script, networks, payments, Transaction } from 'bitcoinjs-lib';

// ---------------------------------------------------------------------------
// Signing LI.FI's Bitcoin PSBT without asking Turnkey to parse it.
//
// WHY: Turnkey's PSBT parser derives an address from every script and fails on
// LI.FI's OP_RETURN memo output — which has no address by definition — with
// "failed to extract bitcoin address from script: UnrecognizedScript". Our
// inputs meet every documented requirement (P2WPKH + witness_utxo, no
// non_witness_utxo, no tap fields); it is the output that trips it.
//
// HOW: Turnkey's own docs give the way around it — compute the sighashes
// locally and sign them with SIGN_RAW_PAYLOAD(S), reinserting with
// bitcoinjs-lib. Turnkey never sees the OP_RETURN.
//
// WHAT THIS DOES NOT DO: it never modifies the transaction. Outputs, inputs,
// amounts and ordering are untouched — we only add signatures. Altering a
// Chainflip PSBT's outputs can make a deposit unrefundable, which is why the
// distinction matters.
//
// See docs/audit/44-btc-swap-fix-plan.md.
// ---------------------------------------------------------------------------

/** secp256k1 curve order, for low-S normalisation. */
const SECP256K1_N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
const SECP256K1_HALF_N = SECP256K1_N / 2n;

const hexToBytes = (hex: string): Uint8Array =>
  Uint8Array.from((hex.match(/.{2}/g) ?? []).map((b) => parseInt(b, 16)));

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const bytesEqual = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Bitcoin consensus requires the signature's S value in the lower half of the
 * curve order (BIP-62). A high-S signature is valid cryptographically but
 * non-standard, so relays drop it — the transaction would look broadcast yet
 * never appear. Turnkey does not guarantee low-S, so normalise here.
 */
function normaliseLowS(r: string, s: string): Uint8Array {
  let sBig = BigInt(`0x${s}`);
  if (sBig > SECP256K1_HALF_N) sBig = SECP256K1_N - sBig;
  const sHex = sBig.toString(16).padStart(64, '0');
  return hexToBytes(r.padStart(64, '0') + sHex);
}

/** The user's compressed public key, read from Turnkey (never from the client). */
async function fetchBitcoinPublicKey(): Promise<{ publicKey: Uint8Array; address: string }> {
  const headers = await buildAuthHeaders();
  const res = await fetch('/api/turnkey/btc-pubkey', { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Could not fetch Bitcoin public key (${res.status})`);
  }
  const data = await res.json();
  return { publicKey: hexToBytes(data.publicKey), address: data.address };
}

/**
 * Signs every input of `psbtHex` that belongs to `bitcoinAddress`, and returns
 * the signed PSBT as hex (ready for /api/turnkey/broadcast-btc, which
 * finalises and extracts).
 */
export async function signLifiBtcPsbt(
  psbtHex: string,
  bitcoinAddress: string,
  subOrgId: string,
  turnkeyClient: TurnkeyClient,
  /** Doc 95 Wave 2: the amount (sats) the quote says we are depositing. When
   *  provided, the deposit output must cover it — a PSBT that pays the bridge
   *  less than quoted is refused BEFORE the passkey. */
  expectedDepositSat?: bigint
): Promise<string> {
  const network = networks.bitcoin;
  const psbt = Psbt.fromHex(psbtHex, { network });

  const { publicKey, address: turnkeyAddress } = await fetchBitcoinPublicKey();

  if (turnkeyAddress !== bitcoinAddress) {
    throw new Error(
      `Bitcoin account mismatch: signing ${bitcoinAddress} but Turnkey returned ${turnkeyAddress}`
    );
  }

  // Verify the key actually corresponds to the address before it can influence
  // a signature. A mismatch would otherwise surface as an opaque validation
  // failure at broadcast time.
  const ourPayment = payments.p2wpkh({ pubkey: publicKey, network });
  if (ourPayment.address !== bitcoinAddress) {
    throw new Error(
      `Public key does not match ${bitcoinAddress} (derives ${ourPayment.address}) — refusing to sign`
    );
  }
  const ourScript = ourPayment.output;
  if (!ourScript) throw new Error('Could not derive our output script');

  // Rebuild the unsigned transaction to compute sighashes. bitcoinjs exposes
  // hashForWitnessV0, which implements BIP-143 — we do not hand-roll it.
  //
  // Everything below stays on Uint8Array: bitcoinjs v7 dropped Buffer from its
  // API, and this is the first client-side use of the library here — Next does
  // not polyfill the Buffer global for browser bundles.
  const unsignedTx = Transaction.fromBuffer(psbt.data.globalMap.unsignedTx.toBuffer());

  // P2WPKH is signed against the corresponding P2PKH script (BIP-143).
  const scriptCode = payments.p2pkh({ pubkey: publicKey, network }).output;
  if (!scriptCode) throw new Error('Could not derive the script code');

  // ------------------------------------------------------------------
  // Doc 95 Wave 2: verify the transaction BEFORE signing it. We still never
  // modify it (altering a Chainflip PSBT can make a deposit unrefundable) —
  // we refuse to sign one that does not look like the swap we quoted.
  // ------------------------------------------------------------------
  const isOurs = (script_: Uint8Array) => bytesEqual(script_, ourScript);
  const isOpReturn = (script_: Uint8Array) => script_.length > 0 && script_[0] === 0x6a;

  const external = unsignedTx.outs.filter((o) => !isOurs(o.script) && !isOpReturn(o.script));
  if (external.length !== 1) {
    throw new Error(
      `Refusing to sign: expected exactly one payment output, found ${external.length} — ` +
        `the transaction does not match a single-destination swap`
    );
  }
  const depositSat = BigInt(external[0].value);
  if (expectedDepositSat !== undefined && depositSat < expectedDepositSat) {
    throw new Error(
      `Refusing to sign: the transaction pays ${depositSat} sats but the quote said ` +
        `${expectedDepositSat} sats`
    );
  }

  // Fee sanity — only computable when every input is ours (the normal case:
  // LI.FI spends our UTXO set). A route that burns most of the amount as a
  // miner fee is refused rather than signed.
  const allInputsOurs = psbt.data.inputs.every(
    (i) => i.witnessUtxo && isOurs(i.witnessUtxo.script)
  );
  if (allInputsOurs) {
    const inTotal = psbt.data.inputs.reduce((sum, i) => sum + BigInt(i.witnessUtxo!.value), 0n);
    const outTotal = unsignedTx.outs.reduce((sum, o) => sum + BigInt(o.value), 0n);
    const fee = inTotal - outTotal;
    if (fee < 0n) throw new Error('Refusing to sign: outputs exceed inputs');
    if (depositSat > 0n && fee * 4n > depositSat) {
      throw new Error(
        `Refusing to sign: the miner fee (${fee} sats) is more than 25% of the ` +
          `${depositSat} sats being sent`
      );
    }
  }

  const toSign: { index: number; sighash: Uint8Array; sighashType: number }[] = [];
  psbt.data.inputs.forEach((input, index) => {
    const witnessUtxo = input.witnessUtxo;
    if (!witnessUtxo) {
      // An input we cannot read is an input we cannot classify. If it is ours
      // we would silently skip it and hand back a PARTIALLY signed PSBT that
      // fails at broadcast — say so instead (doc 95 Wave 2).
      const prev = input.nonWitnessUtxo;
      if (prev) {
        const prevTx = Transaction.fromBuffer(prev);
        const vout = unsignedTx.ins[index]?.index ?? -1;
        const prevOut = prevTx.outs[vout];
        if (prevOut && isOurs(prevOut.script)) {
          throw new Error(
            `Refusing to sign: input ${index} is ours but carries no witness_utxo — ` +
              `this wallet can only sign segwit (P2WPKH) inputs`
          );
        }
      }
      return;
    }
    // Only sign what is ours. LI.FI may combine UTXOs from several addresses,
    // and signing another party's input is neither possible nor our business.
    if (!isOurs(witnessUtxo.script)) return;

    // Honour a declared sighash type instead of assuming SIGHASH_ALL: signing
    // the wrong hash produces a signature that validates locally (we verify
    // against our own hash) and is rejected at consensus (doc 95 Wave 2).
    const sighashType = input.sighashType ?? Transaction.SIGHASH_ALL;
    const sighash = unsignedTx.hashForWitnessV0(index, scriptCode, witnessUtxo.value, sighashType);
    toSign.push({ index, sighash, sighashType });
  });

  if (toSign.length === 0) {
    throw new Error(`No PSBT inputs belong to ${bitcoinAddress} — nothing to sign`);
  }

  // ONE activity for all inputs, so the user sees a single passkey prompt
  // regardless of how many UTXOs LI.FI combined.
  const result = await turnkeyClient.signRawPayloads({
    type: 'ACTIVITY_TYPE_SIGN_RAW_PAYLOADS',
    timestampMs: String(Date.now()),
    organizationId: subOrgId,
    parameters: {
      signWith: bitcoinAddress,
      payloads: toSign.map((t) => bytesToHex(t.sighash)),
      encoding: 'PAYLOAD_ENCODING_HEXADECIMAL',
      // The payload is already a sighash (double-SHA256); Turnkey must sign it
      // as-is rather than hashing it again.
      hashFunction: 'HASH_FUNCTION_NO_OP',
    },
  });

  const signatures = result?.activity?.result?.signRawPayloadsResult?.signatures;
  if (!signatures || signatures.length !== toSign.length) {
    throw new Error(
      `Turnkey returned ${signatures?.length ?? 0} signatures for ${toSign.length} inputs`
    );
  }

  toSign.forEach(({ index, sighashType }, i) => {
    const sig = signatures[i];
    if (!sig?.r || !sig?.s) throw new Error(`Missing r/s in signature ${i}`);
    const compact = normaliseLowS(sig.r, sig.s);
    psbt.updateInput(index, {
      partialSig: [
        {
          pubkey: publicKey,
          // DER encoding + the sighash byte the input actually declared.
          signature: script.signature.encode(compact, sighashType),
        },
      ],
    });
  });

  // Verify before it leaves: each signature must validate against the sighash
  // it was produced for. Catches a wrong key or a mangled signature here rather
  // than as a silent broadcast failure that looks like "sent but never arrived".
  toSign.forEach(({ index }) => {
    const valid = psbt.validateSignaturesOfInput(index, (pubkey, msghash, signature) =>
      secp256k1.verify(signature, msghash, pubkey)
    );
    if (!valid)
      throw new Error(`Signature for input ${index} failed validation — not broadcasting`);
  });

  return psbt.toHex();
}
