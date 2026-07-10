// Safety check for the CCTP relayer key: derives the PUBLIC address from a
// private key so you can confirm it matches the funded wallet — without the
// secret ever leaving the machine or being printed.
//
// Usage (avoids shell history): create a file `key.txt` containing ONLY the
// 0x… private key, then:
//   node scripts/derive-evm-address.mjs key.txt
// …compare the printed address, then DELETE key.txt.
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'));
const { privateKeyToAccount } = require('viem/accounts');

const file = process.argv[2];
if (!file || !existsSync(file)) {
  console.log('usage: node scripts/derive-evm-address.mjs <file containing the 0x… key>');
  process.exit(1);
}
let key = readFileSync(file, 'utf8').trim();
if (!key.startsWith('0x')) key = `0x${key}`; // MetaMask exports without the prefix
if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
  console.log('✗ not a valid EVM private key (expect 64 hex chars, 0x optional)');
  process.exit(1);
}
console.log('derived address:', privateKeyToAccount(key).address);
console.log('→ compare with the funded wallet address, then DELETE the key file.');
