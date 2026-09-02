// Debug: why does receiveMessage revert for a given source burn?
// Usage: node debug-mint.mjs <sourceDomain> <burnTxHash>
import { createRequire } from 'module';
import { IRIS, BASE_SEPOLIA } from './config.mjs';
import { loadState } from './lib.mjs';

const require = createRequire(import.meta.url);
const { createPublicClient, http, keccak256 } = require('viem');
const { baseSepolia } = require('viem/chains');

const [domain, burnHash] = [process.argv[2], process.argv[3]];
const state = loadState();
const pub = createPublicClient({ chain: baseSepolia, transport: http() });

const r = await fetch(`${IRIS}/v2/messages/${domain}?transactionHash=${burnHash}`);
const data = await r.json();
const msg = data?.messages?.[0];
if (!msg) { console.log('no message from iris:', JSON.stringify(data).slice(0, 300)); process.exit(1); }
console.log('iris status:', msg.status, '| nonce:', msg.eventNonce);
console.log('message hash:', keccak256(msg.message));

// V2 usedNonces takes the nonce (bytes32) — nonzero means consumed.
const used = await pub.readContract({
  address: BASE_SEPOLIA.messageTransmitterV2,
  abi: [{ type: 'function', name: 'usedNonces', stateMutability: 'view', inputs: [{ name: '', type: 'bytes32' }], outputs: [{ type: 'uint256' }] }],
  functionName: 'usedNonces',
  args: [msg.eventNonce],
});
console.log('usedNonces(eventNonce):', used.toString(), used > 0n ? '→ ALREADY MINTED' : '→ not yet minted');

if (used === 0n) {
  try {
    await pub.simulateContract({
      account: state.evmAddress,
      address: BASE_SEPOLIA.messageTransmitterV2,
      abi: [{ type: 'function', name: 'receiveMessage', stateMutability: 'nonpayable', inputs: [{ name: 'message', type: 'bytes' }, { name: 'attestation', type: 'bytes' }], outputs: [{ type: 'bool' }] }],
      functionName: 'receiveMessage',
      args: [msg.message, msg.attestation],
    });
    console.log('simulation: WOULD SUCCEED — previous failure was transient; re-run resume');
  } catch (e) {
    console.log('simulation revert detail:\n', String(e?.message ?? e).slice(0, 1200));
  }
}
