// Forensics: list ALL depositForBurn txs our throwaway address ever made on
// Base Sepolia by scanning TokenMessengerV2 event logs (2000-block chunks —
// public RPC limit). Flags which ones state.json knows about.
import { createRequire } from 'module';
import { BASE_SEPOLIA } from './config.mjs';
import { loadState } from './lib.mjs';

const require = createRequire(import.meta.url);
const { createPublicClient, http, pad } = require('viem');
const { baseSepolia } = require('viem/chains');

const state = loadState();
const pub = createPublicClient({ chain: baseSepolia, transport: http() });
const latest = await pub.getBlockNumber();
const ours = pad(state.evmAddress.toLowerCase(), { size: 32 });

const SPAN = 1999n;
const WINDOWS = 12; // ~24k blocks ≈ 13h on Base's 2s blocks
const hits = new Set();

for (let i = 0; i < WINDOWS; i++) {
  const toBlock = latest - BigInt(i) * (SPAN + 1n);
  const fromBlock = toBlock - SPAN;
  const logs = await pub.getLogs({ address: BASE_SEPOLIA.tokenMessengerV2, fromBlock, toBlock });
  for (const l of logs) {
    if (l.topics.some((t) => t && t.toLowerCase() === ours)) hits.add(l.transactionHash);
  }
  process.stdout.write('.');
}

console.log('\nburn txs from', state.evmAddress, ':');
for (const h of hits) {
  const known = h === state.lastInboundBurnHash ? '  <-- in state.json (being recovered)' : '  <-- ORPHAN (needs recovery)';
  console.log(' ', h, known);
}
if (hits.size === 0) console.log('  none found in scanned range');
