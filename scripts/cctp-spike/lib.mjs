// Shared helpers for the CCTP spike: throwaway key state, Soroban invokes,
// Iris polling. Throwaway keys live in state.json (gitignored) — NEVER use
// Turnkey or user wallets here.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sdk = require('@stellar/stellar-sdk');
const { generatePrivateKey, privateKeyToAccount } = require('viem/accounts');

const DIR = dirname(fileURLToPath(import.meta.url));
export const STATE_FILE = join(DIR, 'state.json');

export function loadState() {
  return existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : {};
}

export function saveState(patch) {
  const next = { ...loadState(), ...patch };
  writeFileSync(STATE_FILE, JSON.stringify(next, null, 2));
  return next;
}

/** Create-or-load the throwaway Stellar + EVM keys. */
export function ensureKeys() {
  const state = loadState();
  if (state.stellarSecret && state.evmPrivateKey) return state;
  const stellarKp = sdk.Keypair.random();
  const evmPk = generatePrivateKey();
  return saveState({
    stellarSecret: stellarKp.secret(),
    stellarPublic: stellarKp.publicKey(),
    evmPrivateKey: evmPk,
    evmAddress: privateKeyToAccount(evmPk).address,
  });
}

/** Build → simulate → sign → send a Soroban contract invocation; poll to completion. */
export async function invokeSoroban({ rpcUrl, keypair, contractId, method, args, label }) {
  const server = new sdk.rpc.Server(rpcUrl);
  const account = await server.getAccount(keypair.publicKey());
  const contract = new sdk.Contract(contractId);

  let tx = new sdk.TransactionBuilder(account, {
    fee: '10000000', // inclusion fee cap; testnet
    networkPassphrase: sdk.Networks.TESTNET,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(120)
    .build();

  // Simulation doubles as a sanity check — wrong contract/args fail HERE, not on-chain.
  tx = await server.prepareTransaction(tx);
  tx.sign(keypair);

  const sent = await server.sendTransaction(tx);
  if (sent.status === 'ERROR') {
    throw new Error(`${label}: submit failed: ${JSON.stringify(sent.errorResult ?? sent)}`);
  }
  const hash = sent.hash;
  process.stdout.write(`${label}: submitted ${hash} `);

  for (let i = 0; i < 60; i++) {
    await sleep(2000);
    const res = await server.getTransaction(hash);
    if (res.status === 'SUCCESS') {
      console.log('✓ SUCCESS');
      return { hash, result: res };
    }
    if (res.status === 'FAILED') {
      throw new Error(`${label}: tx FAILED on-chain: ${JSON.stringify(res.resultXdr ?? res)}`);
    }
    process.stdout.write('.');
  }
  throw new Error(`${label}: timed out waiting for tx ${hash}`);
}

/** Poll Iris sandbox for a message + attestation by source tx hash. */
export async function pollAttestation(sourceDomain, txHash, { timeoutMs = 15 * 60_000 } = {}) {
  const { IRIS } = await import('./config.mjs');
  const started = Date.now();
  const url = `${IRIS}/v2/messages/${sourceDomain}?transactionHash=${txHash}`;
  console.log(`iris: polling ${url}`);
  let printedRaw = false;

  while (Date.now() - started < timeoutMs) {
    const r = await fetch(url);
    if (r.status === 404) {
      process.stdout.write('?'); // not indexed yet
    } else if (r.ok) {
      const data = await r.json();
      const msg = data?.messages?.[0];
      if (!printedRaw && msg) {
        printedRaw = true;
        console.log(`\niris: first sighting status=${msg.status} nonce=${msg.eventNonce ?? '?'}`);
      }
      if (msg?.status === 'complete' && msg.attestation && msg.attestation !== 'PENDING') {
        const secs = Math.round((Date.now() - started) / 1000);
        console.log(`iris: attestation complete after ${secs}s`);
        return msg; // { message, attestation, eventNonce, ... }
      }
      process.stdout.write('.');
    } else {
      process.stdout.write(`[${r.status}]`);
    }
    await sleep(3000);
  }
  throw new Error('iris: attestation timed out');
}

export const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

export const fmtUsdc6 = (n) => `${(Number(n) / 1e6).toFixed(6)} USDC`;
export const fmtUsdc7 = (n) => `${(Number(n) / 1e7).toFixed(7)} USDC`;
