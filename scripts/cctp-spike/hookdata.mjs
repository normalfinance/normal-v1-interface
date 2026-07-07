// Hook-data encoder for CCTP transfers INTO Stellar via CctpForwarder.
// Layout (developers.circle.com/cctp/references/stellar):
//   bytes 0–23   magic          — all zeros
//   bytes 24–27  version (u32)  — 0, big-endian
//   bytes 28–31  length  (u32)  — byte length of recipient strkey, big-endian
//   bytes 32+    recipient      — Stellar strkey as ASCII (G / M / C prefix)
// Getting this wrong on mainnet = permanently lost funds; the spike validates
// it live on testnet before any real code depends on it.

export function encodeStellarHookData(recipientStrkey) {
  if (!/^[GMC][A-Z2-7]{10,}$/.test(recipientStrkey)) {
    throw new Error(`not a Stellar strkey: ${recipientStrkey}`);
  }
  const magic = Buffer.alloc(24);
  const version = Buffer.alloc(4); // u32 BE = 0
  const recipient = Buffer.from(recipientStrkey, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(recipient.length);
  return Buffer.concat([magic, version, length, recipient]);
}

export function decodeStellarHookData(buf) {
  if (buf.length < 32) throw new Error('hook data too short');
  if (!buf.subarray(0, 24).every((b) => b === 0)) throw new Error('bad magic');
  const version = buf.readUInt32BE(24);
  const length = buf.readUInt32BE(28);
  const recipient = buf.subarray(32, 32 + length).toString('ascii');
  return { version, recipient };
}

// Self-test: node hookdata.mjs
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const g = 'GDUVSYJH725PV4COO777SKSHYMP2QWM5OQG3ISS4MEDJN456E3Y7SIGY';
  const encoded = encodeStellarHookData(g);
  const decoded = decodeStellarHookData(encoded);
  console.log('encoded length:', encoded.length, '(expect 32 +', g.length, '=', 32 + g.length + ')');
  console.log('hex:', encoded.toString('hex'));
  console.log('round-trip:', decoded.recipient === g && decoded.version === 0 ? 'OK ✓' : `FAIL: ${JSON.stringify(decoded)}`);
}
