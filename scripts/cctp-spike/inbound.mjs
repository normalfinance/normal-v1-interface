// INBOUND spike: Base Sepolia USDC → Stellar testnet USDC (the risky direction).
//   1. approve + depositForBurnWithHook on Base Sepolia TokenMessengerV2, with
//      mintRecipient = destinationCaller = CctpForwarder and the recipient
//      G-address encoded in hookData (THE landmine this spike de-risks)
//   2. poll Iris sandbox (source domain 6)
//   3. mint_and_forward on Stellar CctpForwarder (anyone may call; here the
//      throwaway Stellar key plays "relayer" and pays the dust XLM fee)
// Usage: node inbound.mjs [amountUsdc=1]
import { createRequire } from 'module';
import { STELLAR, BASE_SEPOLIA, DOMAIN, MAX_FEE, MIN_FINALITY_THRESHOLD } from './config.mjs';
import { encodeStellarHookData } from './hookdata.mjs';
import { loadState, saveState, invokeSoroban, pollAttestation, fmtUsdc7 } from './lib.mjs';

const require = createRequire(import.meta.url);
const sdk = require('@stellar/stellar-sdk');
const { createPublicClient, createWalletClient, http, erc20Abi, toHex } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');

const state = loadState();
if (!state.stellarSecret) throw new Error('run setup.mjs first');
const amountUsdc = Number(process.argv[2] ?? '1');
const amount6 = BigInt(Math.round(amountUsdc * 1e6));

console.log(`burning ${amountUsdc} USDC on Base Sepolia → ${state.stellarPublic} on Stellar testnet`);
const t0 = Date.now();

// CRITICAL (per Circle Stellar docs): BOTH mintRecipient and destinationCaller
// must be the CctpForwarder contract; the real recipient goes in hookData.
const forwarderBytes32 = toHex(sdk.StrKey.decodeContract(STELLAR.cctpForwarder));
const hookData = toHex(encodeStellarHookData(state.stellarPublic));

const account = privateKeyToAccount(state.evmPrivateKey);
const pub = createPublicClient({ chain: baseSepolia, transport: http() });
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http() });

// --- 1a. approve -----------------------------------------------------------------
const allowance = await pub.readContract({
  address: BASE_SEPOLIA.usdc, abi: erc20Abi, functionName: 'allowance',
  args: [state.evmAddress, BASE_SEPOLIA.tokenMessengerV2],
});
if (allowance < amount6) {
  const approveTx = await wallet.writeContract({
    address: BASE_SEPOLIA.usdc, abi: erc20Abi, functionName: 'approve',
    args: [BASE_SEPOLIA.tokenMessengerV2, amount6],
  });
  await pub.waitForTransactionReceipt({ hash: approveTx });
  console.log('approve(base): ✓');
}

// --- 1b. burn with hook -------------------------------------------------------------
const burnTx = await wallet.writeContract({
  address: BASE_SEPOLIA.tokenMessengerV2,
  abi: [{
    type: 'function', name: 'depositForBurnWithHook', stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' },
      { name: 'destinationCaller', type: 'bytes32' },
      { name: 'maxFee', type: 'uint256' },
      { name: 'minFinalityThreshold', type: 'uint32' },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [],
  }],
  functionName: 'depositForBurnWithHook',
  args: [
    amount6,
    DOMAIN.stellar,
    forwarderBytes32,   // mintRecipient = CctpForwarder
    BASE_SEPOLIA.usdc,
    forwarderBytes32,   // destinationCaller = CctpForwarder
    MAX_FEE,
    MIN_FINALITY_THRESHOLD,
    hookData,           // magic + version + len + recipient strkey
  ],
});
console.log('burn(base): submitted', burnTx);
const burnReceipt = await pub.waitForTransactionReceipt({ hash: burnTx });
if (burnReceipt.status !== 'success') throw new Error('burn tx reverted');
const tBurn = Date.now();
saveState({ lastInboundBurnHash: burnTx });

// --- 2. attestation ---------------------------------------------------------------
const msg = await pollAttestation(DOMAIN.baseSepolia, burnTx);
const tAttest = Date.now();
saveState({ lastInboundMessage: msg.message, lastInboundAttestation: msg.attestation, lastInboundNonce: msg.eventNonce });

// --- 3. mint_and_forward on Stellar -------------------------------------------------
const horizon = new sdk.Horizon.Server(STELLAR.horizon);
const balancesBefore = await horizon.loadAccount(state.stellarPublic);
const usdcBefore = balancesBefore.balances.find(
  (b) => b.asset_code === 'USDC' && b.asset_issuer === STELLAR.usdcIssuer
)?.balance ?? '0';

const kp = sdk.Keypair.fromSecret(state.stellarSecret);
const toBytes = (hex) => Buffer.from(hex.replace(/^0x/, ''), 'hex');
const { hash: mintHash } = await invokeSoroban({
  rpcUrl: STELLAR.sorobanRpc,
  keypair: kp,
  contractId: STELLAR.cctpForwarder,
  method: 'mint_and_forward',
  args: [
    sdk.xdr.ScVal.scvBytes(toBytes(msg.message)),
    sdk.xdr.ScVal.scvBytes(toBytes(msg.attestation)),
  ],
  label: 'mint_and_forward(stellar)',
});
const tMint = Date.now();

const balancesAfter = await horizon.loadAccount(state.stellarPublic);
const usdcAfter = balancesAfter.balances.find(
  (b) => b.asset_code === 'USDC' && b.asset_issuer === STELLAR.usdcIssuer
)?.balance ?? '0';

console.log('\n=== INBOUND RESULT ===');
console.log('USDC on Stellar:', usdcBefore, '→', usdcAfter,
  `(+${(Number(usdcAfter) - Number(usdcBefore)).toFixed(7)})`);
console.log('timings: burn', Math.round((tBurn - t0) / 1000) + 's',
  '| attestation', Math.round((tAttest - tBurn) / 1000) + 's',
  '| mint+forward', Math.round((tMint - tAttest) / 1000) + 's',
  '| TOTAL', Math.round((tMint - t0) / 1000) + 's');
console.log('explorer: https://sepolia.basescan.org/tx/' + burnTx);
console.log('          https://stellar.expert/explorer/testnet/tx/' + mintHash);
