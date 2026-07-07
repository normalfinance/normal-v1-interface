// Generates the two CCTP relayer keypairs LOCALLY and prints them ONCE.
// Run on the machine of the person who will custody them (Justin):
//   node scripts/generate-cctp-relayer-keys.mjs
// Nothing is written to disk or sent anywhere — copy the secrets straight into
// a password manager and into Vercel env vars, then close the terminal.
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'));
const { Keypair } = require('@stellar/stellar-sdk');
const { generatePrivateKey, privateKeyToAccount } = require('viem/accounts');

const stellar = Keypair.random();
const evmPk = generatePrivateKey();
const evm = privateKeyToAccount(evmPk);

console.log('=== CCTP relayer keys — generated locally, shown ONCE ===\n');
console.log('EVM relayer (fund with ETH on Base):');
console.log('  address (public, for funding/monitoring):', evm.address);
console.log('  CCTP_RELAYER_EVM_PRIVATE_KEY =', evmPk);
console.log('');
console.log('Stellar relayer (fund with ~10 XLM):');
console.log('  address (public, for funding/monitoring):', stellar.publicKey());
console.log('  CCTP_RELAYER_STELLAR_SECRET =', stellar.secret());
console.log('');
console.log('Next: 1) save both secrets in the company password manager');
console.log('      2) add both env vars in Vercel → Production (mark Sensitive)');
console.log('      3) send the two PUBLIC addresses to the team for funding');
console.log('      4) redeploy production (env changes only apply on deploy)');
