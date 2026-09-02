// Find the receiveMessage tx that consumed a given CCTP nonce on Base Sepolia,
// and show where the minted USDC went.
// Usage: node find-mint.mjs <eventNonceHex>
import { createRequire } from 'module';
import { BASE_SEPOLIA } from './config.mjs';

const require = createRequire(import.meta.url);
const { createPublicClient, http } = require('viem');
const { baseSepolia } = require('viem/chains');

const nonce = process.argv[2].toLowerCase().replace(/^0x/, '');
const pub = createPublicClient({ chain: baseSepolia, transport: http() });
const latest = await pub.getBlockNumber();

const SPAN = 1999n;
outer:
for (let i = 0; i < 24; i++) {
  const toBlock = latest - BigInt(i) * (SPAN + 1n);
  const fromBlock = toBlock - SPAN;
  const logs = await pub.getLogs({ address: BASE_SEPOLIA.messageTransmitterV2, fromBlock, toBlock });
  const txs = [...new Set(logs.map((l) => l.transactionHash))];
  for (const tx of txs) {
    const receipt = await pub.getTransactionReceipt({ hash: tx });
    const hit = receipt.logs.some((l) =>
      (l.data && l.data.toLowerCase().includes(nonce)) ||
      l.topics.some((t) => t && t.toLowerCase().includes(nonce))
    );
    if (!hit) continue;
    console.log('found mint tx:', tx, '(block', receipt.blockNumber.toString() + ')');
    console.log('executed by:', (await pub.getTransaction({ hash: tx })).from);
    const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    for (const l of receipt.logs) {
      if (l.address.toLowerCase() === BASE_SEPOLIA.usdc.toLowerCase() && l.topics[0] === TRANSFER) {
        const from = '0x' + l.topics[1].slice(26);
        const to = '0x' + l.topics[2].slice(26);
        const amount = Number(BigInt(l.data)) / 1e6;
        console.log(`USDC transfer: ${from} → ${to}  ${amount} USDC`);
      }
    }
    break outer;
  }
  process.stdout.write('.');
}
