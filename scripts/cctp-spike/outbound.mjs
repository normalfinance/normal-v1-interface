// OUTBOUND spike: Stellar testnet USDC → Base Sepolia USDC.
//   1. deposit_for_burn on Stellar TokenMessengerMinterV2 (user-signed burn)
//   2. poll Iris sandbox for the attestation (source domain 27)
//   3. receiveMessage on Base Sepolia MessageTransmitterV2 (relayer-style mint)
// Usage: node outbound.mjs [amountUsdc=1]
import { createRequire } from 'module';
import { STELLAR, BASE_SEPOLIA, DOMAIN, MAX_FEE, MIN_FINALITY_THRESHOLD } from './config.mjs';
import { loadState, saveState, invokeSoroban, pollAttestation, fmtUsdc6 } from './lib.mjs';

const require = createRequire(import.meta.url);
const sdk = require('@stellar/stellar-sdk');
const { createPublicClient, createWalletClient, http, erc20Abi, pad } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');

const state = loadState();
if (!state.stellarSecret) throw new Error('run setup.mjs first');
const amountUsdc = Number(process.argv[2] ?? '1');

// Stellar SAC amounts are 7-decimals; CCTP wire is 6 — the 7th digit must be 0.
const amount7 = BigInt(Math.round(amountUsdc * 1e7));
if (amount7 % 10n !== 0n) throw new Error('amount must have at most 6 decimals');
console.log(`burning ${amountUsdc} USDC on Stellar testnet → ${state.evmAddress} on Base Sepolia`);

const t0 = Date.now();
const kp = sdk.Keypair.fromSecret(state.stellarSecret);

// Discovered via interface probe: TokenMessengerMinter pulls USDC with
// transfer_from, so the burn needs a prior SAC `approve` (like EVM). In the app
// this makes the burn a 2-signature flow — same as the savings deposit UX.
{
  const server = new sdk.rpc.Server(STELLAR.sorobanRpc);
  const { sequence } = await server.getLatestLedger();
  await invokeSoroban({
    rpcUrl: STELLAR.sorobanRpc,
    keypair: kp,
    contractId: state.usdcSacTestnet,
    method: 'approve',
    args: [
      new sdk.Address(kp.publicKey()).toScVal(),                    // from
      new sdk.Address(STELLAR.tokenMessengerMinter).toScVal(),      // spender
      sdk.nativeToScVal(amount7, { type: 'i128' }),                 // amount (7dp)
      sdk.nativeToScVal(sequence + 1000, { type: 'u32' }),          // expiration ledger (~1.4h)
    ],
    label: 'approve(stellar)',
  });
}

// mint_recipient: EVM address left-padded to 32 bytes; destination_caller: zeros (open).
const mintRecipient = Buffer.concat([Buffer.alloc(12), Buffer.from(state.evmAddress.slice(2), 'hex')]);
const destinationCaller = Buffer.alloc(32);

const args = [
  new sdk.Address(kp.publicKey()).toScVal(),                       // caller
  sdk.nativeToScVal(amount7, { type: 'i128' }),                    // amount (7dp SAC units)
  sdk.nativeToScVal(DOMAIN.baseSepolia, { type: 'u32' }),          // destination_domain
  sdk.xdr.ScVal.scvBytes(mintRecipient),                           // mint_recipient (BytesN<32>)
  new sdk.Address(state.usdcSacTestnet).toScVal(),                 // burn_token
  sdk.xdr.ScVal.scvBytes(destinationCaller),                       // destination_caller = 0 (open)
  sdk.nativeToScVal(MAX_FEE, { type: 'i128' }),                    // max_fee (0 = standard)
  sdk.nativeToScVal(MIN_FINALITY_THRESHOLD, { type: 'u32' }),      // min_finality_threshold
];

const { hash: burnHash } = await invokeSoroban({
  rpcUrl: STELLAR.sorobanRpc,
  keypair: kp,
  contractId: STELLAR.tokenMessengerMinter,
  method: 'deposit_for_burn',
  args,
  label: 'burn(stellar)',
});
const tBurn = Date.now();
saveState({ lastOutboundBurnHash: burnHash });

// --- attestation -------------------------------------------------------------
const msg = await pollAttestation(DOMAIN.stellar, burnHash);
const tAttest = Date.now();
saveState({ lastOutboundMessage: msg.message, lastOutboundAttestation: msg.attestation, lastOutboundNonce: msg.eventNonce });

// --- mint on Base Sepolia ----------------------------------------------------
const account = privateKeyToAccount(state.evmPrivateKey);
const pub = createPublicClient({ chain: baseSepolia, transport: http() });
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http() });

const before = await pub.readContract({ address: BASE_SEPOLIA.usdc, abi: erc20Abi, functionName: 'balanceOf', args: [state.evmAddress] });

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
console.log('mint(base): submitted', mintTx);
const receipt = await pub.waitForTransactionReceipt({ hash: mintTx });
const tMint = Date.now();
if (receipt.status !== 'success') throw new Error('mint tx reverted');

const after = await pub.readContract({ address: BASE_SEPOLIA.usdc, abi: erc20Abi, functionName: 'balanceOf', args: [state.evmAddress] });

console.log('\n=== OUTBOUND RESULT ===');
console.log('received on Base Sepolia:', fmtUsdc6(after - before), `(gas used: ${receipt.gasUsed})`);
console.log('timings: burn', Math.round((tBurn - t0) / 1000) + 's',
  '| attestation', Math.round((tAttest - tBurn) / 1000) + 's',
  '| mint', Math.round((tMint - tAttest) / 1000) + 's',
  '| TOTAL', Math.round((tMint - t0) / 1000) + 's');
console.log('explorer: https://sepolia.basescan.org/tx/' + mintTx);
console.log('          https://stellar.expert/explorer/testnet/tx/' + burnHash);
