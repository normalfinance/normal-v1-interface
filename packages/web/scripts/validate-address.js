require('ts-node/register/transpile-only');

const {
  AddressType,
  detectAddressType,
  isValidCryptoAddress,
  validateCryptoAddress,
} = require('../src/utils/address-validator');

function printUsage() {
  console.error('Usage: node scripts/validate-address.js <address> [btc|eth|sol]');
}

function toAddressType(arg = '') {
  switch (arg.toLowerCase()) {
    case 'btc':
    case 'bitcoin':
      return AddressType.Bitcoin;
    case 'eth':
    case 'ethereum':
      return AddressType.Ethereum;
    case 'sol':
    case 'solana':
      return AddressType.Solana;
    case 'xlm':
    case 'stellar':
      return AddressType.Stellar;
    case '':
      return AddressType.Unknown;
    default:
      console.error(`Unknown network type: ${arg}`);
      printUsage();
      process.exit(1);
  }
}

function main() {
  const [, , address, networkArg] = process.argv;

  if (!address) {
    printUsage();
    process.exit(1);
  }

  const expectedType = toAddressType(networkArg);

  if (expectedType === AddressType.Unknown) {
    if (!isValidCryptoAddress(address)) {
      console.error('❌  Invalid or unrecognised crypto address.');
      process.exit(1);
    }

    const detected = detectAddressType(address);
    console.log(`✅  Address is a valid ${detected} address.`);
    process.exit(0);
  }

  const error = validateCryptoAddress(address, expectedType);
  if (error) {
    console.error(`❌  ${error}`);
    process.exit(1);
  }

  console.log('✅  Address is valid.');
  process.exit(0);
}

main();
