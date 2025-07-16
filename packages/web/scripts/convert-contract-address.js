require('ts-node/register/transpile-only');

const { Address } = require('stellar-sdk');

function printUsage() {
  console.error('Usage: node scripts/convert-contract-address.js <contract_address>');
}

function main() {
  const [, , contractAddress] = process.argv;

  if (!contractAddress) {
    printUsage();
    process.exit(1);
  }

  // Create Address object
  const address = Address.fromString(contractAddress);

  // Extract raw 32-byte contract ID as hex
  const contractIdHex = Buffer.from(address.toScAddress().contractId()).toString('hex');

  console.log('Contract ID (hex):', contractIdHex);

  process.exit(0);
}

main();
