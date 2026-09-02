// Step 1 of the spike: create throwaway keys, fund the Stellar side, create the
// USDC trustline, and print exactly what still needs manual faucet funding.
// Safe to re-run any time — it's idempotent.
import { createRequire } from 'module';
import { STELLAR, BASE_SEPOLIA } from './config.mjs';
import { ensureKeys, invokeSoroban, sleep } from './lib.mjs';

const require = createRequire(import.meta.url);
const sdk = require('@stellar/stellar-sdk');
const { createPublicClient, http, erc20Abi } = require('viem');
const { baseSepolia } = require('viem/chains');

const state = ensureKeys();
console.log('=== throwaway keys (state.json — gitignored, testnet only) ===');
console.log('Stellar:', state.stellarPublic);
console.log('EVM:    ', state.evmAddress);

// --- 1. friendbot XLM ---------------------------------------------------------
const horizon = new sdk.Horizon.Server(STELLAR.horizon);
let account = null;
try {
  account = await horizon.loadAccount(state.stellarPublic);
  console.log('\nStellar account already funded ✓');
} catch {
  console.log('\nfriendbot: funding…');
  const r = await fetch(`${STELLAR.friendbot}?addr=${state.stellarPublic}`);
  if (!r.ok && r.status !== 400) throw new Error(`friendbot failed: ${r.status}`);
  await sleep(3000);
  account = await horizon.loadAccount(state.stellarPublic);
  console.log('friendbot: funded ✓');
}

// --- 2. USDC trustline ----------------------------------------------------------
const usdcAsset = new sdk.Asset('USDC', STELLAR.usdcIssuer);
const hasTrustline = account.balances.some(
  (b) => b.asset_code === 'USDC' && b.asset_issuer === STELLAR.usdcIssuer
);
if (hasTrustline) {
  console.log('USDC trustline already exists ✓');
} else {
  const kp = sdk.Keypair.fromSecret(state.stellarSecret);
  const tx = new sdk.TransactionBuilder(account, {
    fee: '1000',
    networkPassphrase: sdk.Networks.TESTNET,
  })
    .addOperation(sdk.Operation.changeTrust({ asset: usdcAsset }))
    .setTimeout(60)
    .build();
  tx.sign(kp);
  await horizon.submitTransaction(tx);
  console.log('USDC trustline created ✓');
}

// Derive + record the USDC Soroban contract id (needed for deposit_for_burn).
const usdcSac = usdcAsset.contractId(sdk.Networks.TESTNET);
const { saveState } = await import('./lib.mjs');
saveState({ usdcSacTestnet: usdcSac });
console.log('USDC SAC (Soroban contract id):', usdcSac);

// --- 3. balances + what's missing ------------------------------------------------
const fresh = await horizon.loadAccount(state.stellarPublic);
const xlm = fresh.balances.find((b) => b.asset_type === 'native')?.balance ?? '0';
const usdcStellar = fresh.balances.find(
  (b) => b.asset_code === 'USDC' && b.asset_issuer === STELLAR.usdcIssuer
)?.balance ?? '0';

const pub = createPublicClient({ chain: baseSepolia, transport: http() });
const [ethWei, usdcBase] = await Promise.all([
  pub.getBalance({ address: state.evmAddress }),
  pub.readContract({ address: BASE_SEPOLIA.usdc, abi: erc20Abi, functionName: 'balanceOf', args: [state.evmAddress] }),
]);

console.log('\n=== balances ===');
console.log(`Stellar  XLM:  ${xlm}`);
console.log(`Stellar  USDC: ${usdcStellar}`);
console.log(`Base Sep ETH:  ${Number(ethWei) / 1e18}`);
console.log(`Base Sep USDC: ${Number(usdcBase) / 1e6}`);

console.log('\n=== manual faucet steps (captcha-gated, ~2 min) ===');
if (Number(usdcStellar) < 1) {
  console.log(`• Stellar USDC → https://faucet.circle.com  (network: Stellar testnet)\n    address: ${state.stellarPublic}`);
}
if (ethWei < 2_000_000_000_000_000n) {
  console.log(`• Base Sepolia ETH → https://portal.cdp.coinbase.com/products/faucet (or any Base Sepolia faucet)\n    address: ${state.evmAddress}`);
}
if (Number(usdcBase) < 1_000_000) {
  console.log(`• Base Sepolia USDC → https://faucet.circle.com  (network: Base Sepolia)\n    address: ${state.evmAddress}`);
}
console.log('\nThen run:  node outbound.mjs 1     (Stellar → Base, 1 USDC)');
console.log('And:       node inbound.mjs 1      (Base → Stellar, 1 USDC)');
