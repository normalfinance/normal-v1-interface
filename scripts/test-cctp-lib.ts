/* Unit tests for the pure CCTP lib (hookdata encoding + decimal conversions).
 * Run: npx tsx scripts/test-cctp-lib.ts */
import {
  hexToBytes,
  bytesToHex,
  encodeStellarHookData,
  decodeStellarHookData,
} from '../packages/web/src/lib/cctp/hookdata';
import {
  usdcToWire,
  wireToUsdc,
  wireToStellar7,
  stellar7ToWire,
  stellarBalanceTo7dp,
} from '../packages/web/src/lib/cctp/decimals';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, msg: string) => {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ FAIL: ${msg}`); }
};
const throws = (fn: () => unknown, msg: string) => {
  try { fn(); fail++; console.log(`  ✗ FAIL (no throw): ${msg}`); }
  catch { pass++; console.log(`  ✓ ${msg}`); }
};

console.log('\n=== hookdata: golden vector (proven on-chain by the Phase-0 spike) ===');
{
  // This exact recipient encoding was executed successfully three times on
  // Stellar testnet via CctpForwarder.mint_and_forward (txs 352a2ccb…,
  // 97b83bf8…, e664439e… on 2026-07-07).
  const g = 'GCIHI5IPXECWNRM72BT2HGYSOSGAIS4B633IQH64IHHFKRBSRVOWXCKT';
  const encoded = encodeStellarHookData(g);
  const expected =
    '0x' +
    '00'.repeat(24) + // magic
    '00000000' + // version 0
    '00000038' + // length 56, big-endian
    Buffer.from(g, 'ascii').toString('hex');
  ok(bytesToHex(encoded) === expected, 'byte-exact golden vector');
  ok(encoded.length === 32 + 56, 'length 88 for a G-address');

  const decoded = decodeStellarHookData(encoded);
  ok(decoded.recipient === g && decoded.version === 0, 'round-trip decode');
}

console.log('\n=== hookdata: validation ===');
{
  throws(() => encodeStellarHookData('0xAa49152da62751Eb2a98e143934B1C44e91C1a24'), 'rejects EVM address');
  throws(() => encodeStellarHookData('SABC123'), 'rejects secret-key prefix');
  throws(() => decodeStellarHookData(new Uint8Array(10)), 'rejects short data');
  const bad = encodeStellarHookData('GCIHI5IPXECWNRM72BT2HGYSOSGAIS4B633IQH64IHHFKRBSRVOWXCKT');
  bad[0] = 1;
  throws(() => decodeStellarHookData(bad), 'rejects bad magic');
}

console.log('\n=== hookdata: hex helpers ===');
{
  ok(bytesToHex(hexToBytes('0xdeadBEEF')) === '0xdeadbeef', 'hex round-trip normalizes case');
  throws(() => hexToBytes('0xabc'), 'rejects odd-length hex');
}

console.log('\n=== decimals ===');
{
  ok(usdcToWire('1') === 1_000_000n, '1 USDC → 1e6 wire');
  ok(usdcToWire('12.34') === 12_340_000n, '12.34 USDC');
  ok(usdcToWire('0.000001') === 1n, 'smallest wire unit');
  throws(() => usdcToWire('1.0000001'), 'rejects 7 decimals');
  throws(() => usdcToWire('-1'), 'rejects negative');
  throws(() => usdcToWire('1e6'), 'rejects scientific notation');

  ok(wireToUsdc(1_000_000n) === '1', 'wire → human whole');
  ok(wireToUsdc(12_340_000n) === '12.34', 'wire → human trims zeros');
  ok(wireToUsdc(1n) === '0.000001', 'wire → human dust');

  ok(wireToStellar7(1_000_000n) === 10_000_000n, 'mint scales ×10 (Circle rule)');

  const { wire, dust7 } = stellar7ToWire(12_345_678_9n);
  ok(wire === 12_345_678n && dust7 === 9n, 'burn truncates 7th decimal, reports dust');
  ok(stellar7ToWire(10_000_000n).wire === 1_000_000n, '1 USDC on Stellar → 1 USDC wire');

  ok(stellarBalanceTo7dp('12.3456789') === 123_456_789n, 'balance string → 7dp units');
  ok(stellarBalanceTo7dp('20') === 200_000_000n, 'whole balance');
  throws(() => stellarBalanceTo7dp('1.12345678'), 'rejects 8 decimals');

  // The invariant the whole pipeline depends on: human → wire → stellar mint
  // → burn → wire → human is lossless for 6-dp amounts.
  const round = wireToUsdc(stellar7ToWire(wireToStellar7(usdcToWire('7.654321'))).wire);
  ok(round === '7.654321', 'full 6dp round-trip is lossless');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
