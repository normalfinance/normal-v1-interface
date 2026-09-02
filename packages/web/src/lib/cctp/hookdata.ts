// Hook-data encoding for CCTP transfers INTO Stellar via CctpForwarder.
//
// Layout (developers.circle.com/cctp/references/stellar), PROVEN on testnet by
// three successful mint_and_forward executions (Phase-0 spike, 2026-07-07):
//   bytes 0–23   magic          — all zeros
//   bytes 24–27  version (u32)  — 0, big-endian
//   bytes 28–31  length  (u32)  — byte length of recipient strkey, big-endian
//   bytes 32+    recipient      — Stellar strkey as ASCII (G / M / C prefix)
//
// CRITICAL invariants for the burn on the source chain (mistake = permanent
// fund loss on mainnet):
//   - mintRecipient   = CctpForwarder contract (32-byte contract key)
//   - destinationCaller = CctpForwarder contract (same 32 bytes)
//   - the real recipient goes ONLY in this hook data
// Runtime-agnostic (Uint8Array) so both server workers and the client can use it.

const STRKEY_RE = /^[GMC][A-Z2-7]{10,}$/;

export function encodeStellarHookData(recipientStrkey: string): Uint8Array {
  if (!STRKEY_RE.test(recipientStrkey)) {
    throw new Error(`not a Stellar strkey: ${recipientStrkey}`);
  }
  const recipient = new TextEncoder().encode(recipientStrkey);
  const out = new Uint8Array(32 + recipient.length);
  // bytes 0–23: zero magic; bytes 24–27: version 0 — already zeroed.
  new DataView(out.buffer).setUint32(28, recipient.length, false); // big-endian
  out.set(recipient, 32);
  return out;
}

export function decodeStellarHookData(data: Uint8Array): { version: number; recipient: string } {
  if (data.length < 32) throw new Error('hook data too short');
  for (let i = 0; i < 24; i++) {
    if (data[i] !== 0) throw new Error('hook data: bad magic');
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const version = view.getUint32(24, false);
  const length = view.getUint32(28, false);
  if (32 + length > data.length) throw new Error('hook data: length out of bounds');
  const recipient = new TextDecoder().decode(data.subarray(32, 32 + length));
  if (!STRKEY_RE.test(recipient)) throw new Error('hook data: recipient is not a strkey');
  return { version, recipient };
}

export const bytesToHex = (b: Uint8Array): `0x${string}` =>
  `0x${Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')}`;

export const hexToBytes = (hex: string): Uint8Array => {
  const clean = hex.replace(/^0x/, '');
  if (clean.length % 2 !== 0) throw new Error('odd-length hex');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
};
