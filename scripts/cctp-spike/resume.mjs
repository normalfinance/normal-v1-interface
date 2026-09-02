// Recovery: complete any burned-but-unminted transfer from state.json.
// Demonstrates the CCTP property our production state machine relies on —
// after a burn, the attestation is re-fetchable from Iris forever (re-attest
// after 24h if needed), so an interrupted flow is never lost funds.
// Usage: node resume.mjs
import { createRequire } from 'module';
import { STELLAR, BASE_SEPOLIA, DOMAIN } from './config.mjs';
import { loadState, invokeSoroban, pollAttestation, fmtUsdc6 } from './lib.mjs';

const require = createRequire(import.meta.url);
const sdk = require('@stellar/stellar-sdk');
const { createPublicClient, createWalletClient, http, erc20Abi } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');

const state = loadState();
const pub = createPublicClient({ chain: baseSepolia, transport: http() });

// Optional override: `node resume.mjs --inbound <burnTxHash>` recovers a specific
// Base→Stellar burn (e.g. one that state.json no longer remembers) and skips the
// outbound section.
const argIdx = process.argv.indexOf('--inbound');
if (argIdx !== -1) {
  state.lastInboundBurnHash = process.argv[argIdx + 1];
  state.lastOutboundBurnHash = null;
  console.log('override: recovering specific inbound burn', state.lastInboundBurnHash);
}
const outIdx = process.argv.indexOf('--outbound');
if (outIdx !== -1) {
  state.lastOutboundBurnHash = process.argv[outIdx + 1];
  state.lastInboundBurnHash = null;
  console.log('override: recovering specific outbound burn', state.lastOutboundBurnHash);
}

// --- 1. resume OUTBOUND (Stellar burn → Base mint) -----------------------------
if (state.lastOutboundBurnHash) {
  console.log('=== resuming outbound (burn:', state.lastOutboundBurnHash, ') ===');
  const before = await pub.readContract({ address: BASE_SEPOLIA.usdc, abi: erc20Abi, functionName: 'balanceOf', args: [state.evmAddress] });
  try {
    const msg = await pollAttestation(DOMAIN.stellar, state.lastOutboundBurnHash, { timeoutMs: 20 * 60_000 });
    const account = privateKeyToAccount(state.evmPrivateKey);
    const wallet = createWalletClient({ account, chain: baseSepolia, transport: http() });
    const mintTx = await wallet.writeContract({
      address: BASE_SEPOLIA.messageTransmitterV2,
      abi: [{
        type: 'function', name: 'receiveMessage', stateMutability: 'nonpayable',
        inputs: [{ name: 'message', type: 'bytes' }, { name: 'attestation', type: 'bytes' }],
        outputs: [{ name: 'success', type: 'bool' }],
      }],
      functionName: 'receiveMessage',
      args: [msg.message, msg.attestation],
    });
    const receipt = await pub.waitForTransactionReceipt({ hash: mintTx });
    const after = await pub.readContract({ address: BASE_SEPOLIA.usdc, abi: erc20Abi, functionName: 'balanceOf', args: [state.evmAddress] });
    console.log(`outbound recovered ✓ +${fmtUsdc6(after - before)} on Base (gas ${receipt.gasUsed})`);
    console.log('  https://sepolia.basescan.org/tx/' + mintTx);
  } catch (e) {
    const m = String(e?.message ?? e);
    if (m.includes('Nonce already used') || m.includes('nonce already used') || m.includes('reverted')) {
      console.log('outbound: mint already executed earlier (nonce used) — nothing to do ✓');
    } else {
      console.log('outbound resume failed:', m.slice(0, 300));
    }
  }
} else {
  console.log('no outbound burn recorded — skipping');
}

// --- 2. resume INBOUND (Base burn → Stellar mint_and_forward) --------------------
if (state.lastInboundBurnHash) {
  console.log('\n=== resuming inbound (burn:', state.lastInboundBurnHash, ') ===');
  const horizon = new sdk.Horizon.Server(STELLAR.horizon);
  const usdcOf = async () => (await horizon.loadAccount(state.stellarPublic)).balances
    .find((b) => b.asset_code === 'USDC' && b.asset_issuer === STELLAR.usdcIssuer)?.balance ?? '0';
  const before = await usdcOf();
  try {
    // Base Sepolia standard finality ≈ 13–19 min; poll generously.
    const msg = await pollAttestation(DOMAIN.baseSepolia, state.lastInboundBurnHash, { timeoutMs: 30 * 60_000 });
    const kp = sdk.Keypair.fromSecret(state.stellarSecret);
    const toBytes = (hex) => Buffer.from(hex.replace(/^0x/, ''), 'hex');
    const { hash } = await invokeSoroban({
      rpcUrl: STELLAR.sorobanRpc,
      keypair: kp,
      contractId: STELLAR.cctpForwarder,
      method: 'mint_and_forward',
      args: [sdk.xdr.ScVal.scvBytes(toBytes(msg.message)), sdk.xdr.ScVal.scvBytes(toBytes(msg.attestation))],
      label: 'mint_and_forward(stellar)',
    });
    const after = await usdcOf();
    console.log(`inbound recovered ✓ USDC on Stellar: ${before} → ${after}`);
    console.log('  https://stellar.expert/explorer/testnet/tx/' + hash);
  } catch (e) {
    const m = String(e?.message ?? e);
    if (m.includes('#8') || m.toLowerCase().includes('nonce')) {
      console.log('inbound: possibly already minted (check balance) —', m.slice(0, 160));
    } else {
      console.log('inbound resume failed:', m.slice(0, 300));
    }
  }
} else {
  console.log('no inbound burn recorded — skipping');
}
