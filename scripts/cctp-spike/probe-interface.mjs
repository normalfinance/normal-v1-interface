// Interface probe (no funds needed): simulate deposit_for_burn with a dust
// amount. If our function name/args/types are RIGHT, the simulation fails with
// a token-balance error; if WRONG, it fails with a missing-function/arg-parse
// error. Distinguishes integration bugs from (expected) empty-wallet errors.
import { createRequire } from 'module';
import { STELLAR, DOMAIN, MAX_FEE, MIN_FINALITY_THRESHOLD } from './config.mjs';
import { loadState } from './lib.mjs';

const require = createRequire(import.meta.url);
const sdk = require('@stellar/stellar-sdk');

const state = loadState();
const kp = sdk.Keypair.fromSecret(state.stellarSecret);
const server = new sdk.rpc.Server(STELLAR.sorobanRpc);
const account = await server.getAccount(kp.publicKey());
const contract = new sdk.Contract(STELLAR.tokenMessengerMinter);

const mintRecipient = Buffer.concat([Buffer.alloc(12), Buffer.from(state.evmAddress.slice(2), 'hex')]);

const tx = new sdk.TransactionBuilder(account, { fee: '10000000', networkPassphrase: sdk.Networks.TESTNET })
  .addOperation(contract.call(
    'deposit_for_burn',
    new sdk.Address(kp.publicKey()).toScVal(),
    sdk.nativeToScVal(10n, { type: 'i128' }),
    sdk.nativeToScVal(DOMAIN.baseSepolia, { type: 'u32' }),
    sdk.xdr.ScVal.scvBytes(mintRecipient),
    new sdk.Address(state.usdcSacTestnet).toScVal(),
    sdk.xdr.ScVal.scvBytes(Buffer.alloc(32)),
    sdk.nativeToScVal(MAX_FEE, { type: 'i128' }),
    sdk.nativeToScVal(MIN_FINALITY_THRESHOLD, { type: 'u32' }),
  ))
  .setTimeout(60)
  .build();

const sim = await server.simulateTransaction(tx);
if (sdk.rpc.Api.isSimulationSuccess(sim)) {
  console.log('SIMULATION SUCCEEDED — interface correct (and dust burn would pass?!)');
} else {
  console.log('simulation error (expected — read the class of error):\n');
  console.log(sim.error);
}
