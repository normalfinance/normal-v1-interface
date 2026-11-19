// Doc 129 Phase 0, S3: a pre-signed permission, relayed. TESTNET ONLY.
//
// Proves the mechanism Phase 3 is built on, end to end with a real Circle
// burn:
//   1. the SERVER side builds the permission (a Soroban authorization entry
//      with address credentials) from its own knowledge of the call: no
//      simulation, so it works before the user holds the money;
//   2. the USER signs only the 32-byte hash, by raw ed25519 over it, which is
//      exactly what Turnkey's SIGN_RAW_PAYLOAD(S) does with HASH_FUNCTION_NOT_APPLICABLE;
//   3. the server checks that signature against the user's own address;
//   4. a SEPARATE relayer account wraps it in a transaction, simulates it
//      (the permission is kept, never replaced), pays the fee and submits;
//   5. Circle's sandbox attestation service finds the burn by its hash.
// It also records the same calls in "record" mode and compares the trees, and
// compares the testnet and mainnet TokenMessengerMinter code hashes.
//
// User: the CCTP spike's throwaway testnet account (../cctp-spike/state.json).
// Relayer: a fresh friendbot account every run. Nothing here touches mainnet
// except read-only ledger lookups.
//
//   node scripts/permission-spike/relay-burn.mjs            approve + burn 1 USDC
//   node scripts/permission-spike/relay-burn.mjs --dry      build, sign, simulate only

import { createRequire } from 'module';
import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const sdk = require('@stellar/stellar-sdk');
const { xdr, rpc, Address, Keypair, Networks, TransactionBuilder, Operation, nativeToScVal, hash } =
  sdk;

const DIR = dirname(fileURLToPath(import.meta.url));
const spike = JSON.parse(readFileSync(join(DIR, '..', 'cctp-spike', 'state.json'), 'utf8'));
const DRY = process.argv.includes('--dry');

const TESTNET = {
  rpc: 'https://soroban-testnet.stellar.org',
  friendbot: 'https://friendbot.stellar.org',
  passphrase: Networks.TESTNET,
  tokenMessengerMinter: 'CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP',
  usdcIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  iris: 'https://iris-api-sandbox.circle.com',
};
const MAINNET = {
  rpc: 'https://rpc.lightsail.network/',
  tokenMessengerMinter: 'CAE2G5Z77UP7GYPYGFOWFGW7C7J6I4YP2AFGSADRKQY62SYUFLPNFTXL',
};
const STELLAR_DOMAIN = 27;
const BASE_SEPOLIA_DOMAIN = 6;
const AMOUNT_7 = 10_000_000n; // 1 USDC in the SAC's 7 decimals

const server = new rpc.Server(TESTNET.rpc);
const user = Keypair.fromSecret(spike.stellarSecret);
const usdcSac = new sdk.Asset('USDC', TESTNET.usdcIssuer).contractId(TESTNET.passphrase);
const log = (...a) => console.log(...a);

// ---- the permission: built, hashed, signed, checked ------------------------

function contractFn(contractId, functionName, args) {
  return new xdr.InvokeContractArgs({
    contractAddress: new Address(contractId).toScAddress(),
    functionName,
    args,
  });
}

/** An unsigned permission for exactly this call (no inner calls need the user). */
function buildPermission(account, call, expiryLedger) {
  const nonce = xdr.Int64.fromString(BigInt.asIntN(64, randomBytes(8).readBigUInt64BE()).toString());
  const invocation = new xdr.SorobanAuthorizedInvocation({
    function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(call),
    subInvocations: [],
  });
  const entry = new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(
      new xdr.SorobanAddressCredentials({
        address: new Address(account).toScAddress(),
        nonce,
        signatureExpirationLedger: expiryLedger,
        signature: xdr.ScVal.scvVoid(),
      })
    ),
    rootInvocation: invocation,
  });
  return entry;
}

/** The 32 bytes the user signs: sha256 of the authorization preimage. */
function permissionHash(entry, passphrase) {
  const creds = entry.credentials().address();
  const preimage = xdr.HashIdPreimage.envelopeTypeSorobanAuthorization(
    new xdr.HashIdPreimageSorobanAuthorization({
      networkId: hash(Buffer.from(passphrase)),
      nonce: creds.nonce(),
      signatureExpirationLedger: creds.signatureExpirationLedger(),
      invocation: entry.rootInvocation(),
    })
  );
  return hash(preimage.toXDR());
}

/** Attach a raw ed25519 signature, after checking it against the account's own key. */
function attachSignature(entry, account, payload, signature) {
  if (!Keypair.fromPublicKey(account).verify(payload, signature)) {
    throw new Error('signature does not verify against the account');
  }
  const sig = nativeToScVal(
    { public_key: Keypair.fromPublicKey(account).rawPublicKey(), signature },
    { type: { public_key: ['symbol', null], signature: ['symbol', null] } }
  );
  const signed = xdr.SorobanAuthorizationEntry.fromXDR(entry.toXDR());
  signed.credentials().address().signature(xdr.ScVal.scvVec([sig]));
  return signed;
}

// ---- the relayer --------------------------------------------------------------

async function fundRelayer() {
  const kp = Keypair.random();
  const res = await fetch(`${TESTNET.friendbot}?addr=${kp.publicKey()}`);
  if (!res.ok) throw new Error(`friendbot ${res.status}`);
  return kp;
}

function relayedTx(account, call, signedEntry) {
  return new TransactionBuilder(account, { fee: '10000000', networkPassphrase: TESTNET.passphrase })
    .addOperation(
      Operation.invokeHostFunction({
        func: xdr.HostFunction.hostFunctionTypeInvokeContract(call),
        auth: signedEntry ? [signedEntry] : [],
      })
    )
    .setTimeout(120)
    .build();
}

/** Record mode: what the deployed contract itself asks the user to approve. */
async function recordedTree(relayer, call) {
  const account = await server.getAccount(relayer.publicKey());
  const sim = await server.simulateTransaction(relayedTx(account, call, null));
  if (!rpc.Api.isSimulationSuccess(sim)) return { error: sim.error };
  const auth = sim.result?.auth ?? [];
  return { trees: auth.map((a) => a.rootInvocation().toXDR('base64')), count: auth.length };
}

async function relay(relayer, call, signedEntry, label) {
  const account = await server.getAccount(relayer.publicKey());
  const tx = relayedTx(account, call, signedEntry);
  const sim = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim)) throw new Error(`${label} simulation failed: ${sim.error}`);
  const assembled = rpc.assembleTransaction(tx, sim).build();
  const keptAuth = assembled.operations[0].auth?.[0]?.toXDR('base64');
  if (keptAuth !== signedEntry.toXDR('base64')) throw new Error(`${label}: permission was replaced`);
  log(`  ${label}: simulated with the signed permission (fee ${sim.minResourceFee} stroops)`);
  if (DRY) return null;
  assembled.sign(relayer);
  const sent = await server.sendTransaction(assembled);
  if (sent.status === 'ERROR') throw new Error(`${label} send: ${JSON.stringify(sent.errorResult)}`);
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const got = await server.getTransaction(sent.hash);
    if (got.status === 'SUCCESS') {
      log(`  ${label}: SUCCESS ${sent.hash}`);
      return sent.hash;
    }
    if (got.status === 'FAILED') throw new Error(`${label} FAILED ${sent.hash}`);
  }
  throw new Error(`${label}: not confirmed in 60 s (${sent.hash})`);
}

async function wasmHash(rpcUrl, contractId) {
  const s = new rpc.Server(rpcUrl);
  const key = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: new Address(contractId).toScAddress(),
      key: xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: xdr.ContractDataDurability.persistent(),
    })
  );
  const res = await s.getLedgerEntries(key);
  const exec = res.entries?.[0]?.val.contractData().val().instance().executable();
  return exec?.switch().name === 'contractExecutableWasm' ? exec.wasmHash().toString('hex') : exec?.switch().name;
}

// ---- run ----------------------------------------------------------------------

async function main() {
  log(`user ${user.publicKey()} (testnet spike account), USDC SAC ${usdcSac}`);
  const relayer = await fundRelayer();
  log(`relayer ${relayer.publicKey()} (fresh friendbot account)`);

  const { sequence } = await server.getLatestLedger();
  const expiry = sequence + 100; // about 8 minutes

  // 1) approve exactly this burn, for about 100 ledgers
  const approveCall = contractFn(usdcSac, 'approve', [
    new Address(user.publicKey()).toScVal(),
    new Address(TESTNET.tokenMessengerMinter).toScVal(),
    nativeToScVal(AMOUNT_7, { type: 'i128' }),
    nativeToScVal(sequence + 100, { type: 'u32' }),
  ]);
  // 2) burn exactly 1 USDC to the spike's own Base Sepolia address
  const recipient = Buffer.concat([Buffer.alloc(12), Buffer.from(spike.evmAddress.slice(2), 'hex')]);
  const burnCall = contractFn(TESTNET.tokenMessengerMinter, 'deposit_for_burn', [
    new Address(user.publicKey()).toScVal(),
    nativeToScVal(AMOUNT_7, { type: 'i128' }),
    nativeToScVal(BASE_SEPOLIA_DOMAIN, { type: 'u32' }),
    xdr.ScVal.scvBytes(recipient),
    new Address(usdcSac).toScVal(),
    xdr.ScVal.scvBytes(Buffer.alloc(32)),
    nativeToScVal(0n, { type: 'i128' }),
    nativeToScVal(2000, { type: 'u32' }),
  ]);

  // Both permissions are built and signed up front, as one ceremony would.
  const approveEntry = buildPermission(user.publicKey(), approveCall, expiry);
  const burnEntry = buildPermission(user.publicKey(), burnCall, expiry);
  const hashes = [permissionHash(approveEntry, TESTNET.passphrase), permissionHash(burnEntry, TESTNET.passphrase)];
  const signatures = hashes.map((h) => user.sign(h)); // = Turnkey raw ed25519 over the hash
  const signedApprove = attachSignature(approveEntry, user.publicKey(), hashes[0], signatures[0]);
  const signedBurn = attachSignature(burnEntry, user.publicKey(), hashes[1], signatures[1]);
  log('signed 2 permissions in one pass (hashes verified against the user key)');

  // The tree the contract records must equal the one we built.
  const recApprove = await recordedTree(relayer, approveCall);
  log(
    `record mode, approve: ${recApprove.count ?? 0} entr${recApprove.count === 1 ? 'y' : 'ies'}, tree ${
      recApprove.trees?.[0] === approveEntry.rootInvocation().toXDR('base64') ? 'MATCHES' : 'DIFFERS'
    }${recApprove.error ? ` (${recApprove.error.slice(0, 120)})` : ''}`
  );

  const approveHash = await relay(relayer, approveCall, signedApprove, 'approve');

  // After the approve lands, the burn can be recorded too (it needs the allowance).
  const recBurn = await recordedTree(relayer, burnCall);
  log(
    `record mode, burn: ${recBurn.count ?? 0} entr${recBurn.count === 1 ? 'y' : 'ies'}, tree ${
      recBurn.trees?.[0] === burnEntry.rootInvocation().toXDR('base64') ? 'MATCHES' : 'DIFFERS'
    }${recBurn.error ? ` (${recBurn.error.slice(0, 160)})` : ''}`
  );

  const burnHash = DRY ? null : await relay(relayer, burnCall, signedBurn, 'deposit_for_burn');

  if (burnHash) {
    let found = null;
    for (let i = 0; i < 20 && !found; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await fetch(`${TESTNET.iris}/v2/messages/${STELLAR_DOMAIN}?transactionHash=${burnHash}`);
      if (res.ok) {
        const j = await res.json();
        found = j?.messages?.[0] ?? null;
      }
    }
    log(
      found
        ? `Iris found the burn: status ${found.status}, nonce ${String(found.eventNonce).slice(0, 18)}...`
        : 'Iris has not indexed the burn yet (try find-burns later)'
    );
  }

  const [tn, mn] = await Promise.all([
    wasmHash(TESTNET.rpc, TESTNET.tokenMessengerMinter),
    wasmHash(MAINNET.rpc, MAINNET.tokenMessengerMinter),
  ]);
  log(`TokenMessengerMinter code: testnet ${tn}`);
  log(`                           mainnet ${mn} ${tn === mn ? '(SAME code)' : '(DIFFERENT code)'}`);
  log(JSON.stringify({ approveHash, burnHash }));
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
