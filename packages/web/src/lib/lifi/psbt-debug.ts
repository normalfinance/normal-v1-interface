'use client';

// ---------------------------------------------------------------------------
// Minimal PSBT structure reader — diagnostics only. It never modifies the PSBT.
//
// Turnkey rejects LI.FI's Bitcoin PSBT with "failed to extract bitcoin address
// from script: UnrecognizedScript". Their docs are specific about what each
// input must carry (docs.turnkey.com/networks/bitcoin):
//
//   P2WPKH / P2WSH : witness_utxo REQUIRED, non_witness_utxo FORBIDDEN
//   P2PKH  / P2SH  : non_witness_utxo REQUIRED, witness_utxo FORBIDDEN
//   P2TR           : witness_utxo REQUIRED, and tap_scripts / tap_merkle_root /
//                    tap_script_sigs must NOT be present (key path only)
//   Wrapped P2SH-P2WPKH / P2SH-P2WSH : NOT SUPPORTED AT ALL
//
// Our wallet is P2WPKH (bc1q…). This reads which fields LI.FI actually sent so
// we can see which of those rules is being broken, instead of guessing.
// ---------------------------------------------------------------------------

/** PSBT input key types we care about (BIP-174 / BIP-371). */
const INPUT_KEY_NAMES: Record<number, string> = {
  0x00: 'non_witness_utxo',
  0x01: 'witness_utxo',
  0x02: 'partial_sig',
  0x03: 'sighash_type',
  0x04: 'redeem_script',
  0x05: 'witness_script',
  0x06: 'bip32_derivation',
  0x07: 'final_scriptsig',
  0x08: 'final_scriptwitness',
  0x13: 'tap_key_sig',
  0x14: 'tap_script_sig',
  0x15: 'tap_leaf_script',
  0x16: 'tap_bip32_derivation',
  0x17: 'tap_internal_key',
  0x18: 'tap_merkle_root',
};

function classifyScript(hex: string): string {
  if (/^0014[0-9a-f]{40}$/i.test(hex)) return 'P2WPKH';
  if (/^0020[0-9a-f]{64}$/i.test(hex)) return 'P2WSH';
  if (/^5120[0-9a-f]{64}$/i.test(hex)) return 'P2TR (taproot)';
  if (/^76a914[0-9a-f]{40}88ac$/i.test(hex)) return 'P2PKH';
  if (/^a914[0-9a-f]{40}87$/i.test(hex)) return 'P2SH';
  if (/^6a/i.test(hex)) return 'OP_RETURN';
  return `unknown (${hex.slice(0, 12)}…)`;
}

/* eslint-disable no-bitwise -- parsing a binary format requires bit operations */
class Reader {
  private pos = 0;

  constructor(private readonly buf: Uint8Array) {}

  get offset() {
    return this.pos;
  }

  get done() {
    return this.pos >= this.buf.length;
  }

  byte(): number {
    return this.buf[this.pos++];
  }

  /** BIP-174 uses Bitcoin's compact-size integers for lengths. */
  varint(): number {
    const first = this.byte();
    if (first < 0xfd) return first;
    if (first === 0xfd) return this.byte() | (this.byte() << 8);
    if (first === 0xfe) {
      let v = 0;
      for (let i = 0; i < 4; i++) v |= this.byte() << (8 * i);
      return v >>> 0;
    }
    // 8-byte lengths don't occur in these PSBTs; read and ignore the high half.
    let v = 0;
    for (let i = 0; i < 8; i++) {
      const b = this.byte();
      if (i < 4) v |= b << (8 * i);
    }
    return v >>> 0;
  }

  bytes(n: number): Uint8Array {
    const out = this.buf.slice(this.pos, this.pos + n);
    this.pos += n;
    return out;
  }
}

const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/** Reads one key-value map, returning the key types present (and select values). */
function readMap(r: Reader): { keys: number[]; values: Map<number, Uint8Array> } {
  const keys: number[] = [];
  const values = new Map<number, Uint8Array>();
  while (!r.done) {
    const keyLen = r.varint();
    if (keyLen === 0) break; // 0x00 terminates the map
    const key = r.bytes(keyLen);
    const valLen = r.varint();
    const val = r.bytes(valLen);
    keys.push(key[0]);
    if (!values.has(key[0])) values.set(key[0], val);
  }
  return { keys, values };
}

/** Counts inputs/outputs from the unsigned transaction in the global map. */
function countFromUnsignedTx(tx: Uint8Array): { inputs: number; outputs: number } {
  const r = new Reader(tx);
  r.bytes(4); // version
  const inputs = r.varint();
  for (let i = 0; i < inputs; i++) {
    r.bytes(36); // prevout txid + index
    r.bytes(r.varint()); // scriptSig (empty in an unsigned tx)
    r.bytes(4); // sequence
  }
  const outputs = r.varint();
  return { inputs, outputs };
}

export interface PsbtSummary {
  inputs: { index: number; fields: string[]; witnessUtxoScript?: string }[];
  outputs: { index: number; script: string }[];
  error?: string;
}

/**
 * Describes a PSBT's structure. Read-only: it parses bytes and reports, and is
 * deliberately kept away from the signing path.
 */
export function describePsbt(psbtHex: string): PsbtSummary {
  try {
    const bytes = new Uint8Array(
      (psbtHex.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16))
    );
    const r = new Reader(bytes);
    r.bytes(5); // magic: 70736274ff

    const globals = readMap(r);
    const unsignedTx = globals.values.get(0x00);
    if (!unsignedTx) return { inputs: [], outputs: [], error: 'no unsigned tx in globals' };

    const { inputs: nIn, outputs: nOut } = countFromUnsignedTx(unsignedTx);

    const inputs: PsbtSummary['inputs'] = [];
    for (let i = 0; i < nIn; i++) {
      const map = readMap(r);
      const fields = map.keys.map((k) => INPUT_KEY_NAMES[k] ?? `0x${k.toString(16)}`);
      // witness_utxo = 8-byte value + varint scriptPubKey length + script
      let witnessUtxoScript: string | undefined;
      const wu = map.values.get(0x01);
      if (wu) {
        const wr = new Reader(wu);
        wr.bytes(8);
        witnessUtxoScript = classifyScript(toHex(wr.bytes(wr.varint())));
      }
      inputs.push({ index: i, fields, witnessUtxoScript });
    }

    // Output scripts come from the unsigned tx, not the PSBT output maps.
    const txr = new Reader(unsignedTx);
    txr.bytes(4);
    const vin = txr.varint();
    for (let i = 0; i < vin; i++) {
      txr.bytes(36);
      txr.bytes(txr.varint());
      txr.bytes(4);
    }
    const vout = txr.varint();
    const outputs: PsbtSummary['outputs'] = [];
    for (let i = 0; i < vout; i++) {
      txr.bytes(8); // value
      outputs.push({ index: i, script: classifyScript(toHex(txr.bytes(txr.varint()))) });
    }

    return { inputs, outputs: outputs.slice(0, nOut) };
  } catch (error) {
    return { inputs: [], outputs: [], error: String(error) };
  }
}
