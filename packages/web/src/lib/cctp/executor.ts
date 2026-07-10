// Destination-side execution (the "relayer"): submits the mint on the chain
// where USDC arrives, paying gas from small company-controlled wallets. Users
// never need gas on the destination — the float cost is priced into quotes.
//
// SERVER-ONLY. Keys come from env (never NEXT_PUBLIC): the mint functions are
// permissionless (destinationCaller = 0 in our burns), so these wallets hold
// only gas dust — worst case on key loss is refilling a new wallet.
//   CCTP_RELAYER_EVM_PRIVATE_KEY   0x… key funded with ETH on Base/Ethereum
//   CCTP_RELAYER_STELLAR_SECRET    S… key funded with a few XLM

import { privateKeyToAccount } from 'viem/accounts';
import { base, mainnet, sepolia, baseSepolia } from 'viem/chains';
import { http, createWalletClient, createPublicClient } from 'viem';
import { type NetworkType, getStellarConfigForNetwork } from '@normalfinance/utils';
import { rpc, xdr, Keypair, Contract, Networks, TransactionBuilder } from '@stellar/stellar-sdk';

import { hexToBytes } from './hookdata';
import { EVM_CCTP, STELLAR_CCTP, type CctpChain } from './config';

const RECEIVE_MESSAGE_ABI = [
  {
    type: 'function',
    name: 'receiveMessage',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'message', type: 'bytes' },
      { name: 'attestation', type: 'bytes' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
  },
] as const;

const EVM_CHAINS = {
  mainnet: { base, ethereum: mainnet },
  testnet: { base: baseSepolia, ethereum: sepolia },
} as const;

function evmChain(network: NetworkType, chain: 'base' | 'ethereum') {
  return EVM_CHAINS[network][chain];
}

/** MetaMask & co. export private keys without the 0x prefix — accept both. */
function relayerEvmKey(): `0x${string}` {
  const pk = process.env.CCTP_RELAYER_EVM_PRIVATE_KEY?.trim();
  if (!pk) throw new Error('CCTP_RELAYER_EVM_PRIVATE_KEY not configured');
  const normalized = pk.startsWith('0x') ? pk : `0x${pk}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error('CCTP_RELAYER_EVM_PRIVATE_KEY is not a valid EVM private key');
  }
  return normalized as `0x${string}`;
}

/** Submit receiveMessage on an EVM chain. Returns the mint tx hash. Throws
 *  "nonce already used" style errors if someone already executed it — callers
 *  treat that as success (the mint recipient got their USDC either way). */
export async function executeEvmMint(params: {
  network: NetworkType;
  chain: 'base' | 'ethereum';
  message: `0x${string}`;
  attestation: `0x${string}`;
}): Promise<`0x${string}`> {
  const chain = evmChain(params.network, params.chain);
  const account = privateKeyToAccount(relayerEvmKey());
  const wallet = createWalletClient({ account, chain, transport: http() });

  return wallet.writeContract({
    address: EVM_CCTP[params.network].messageTransmitterV2,
    abi: RECEIVE_MESSAGE_ABI,
    functionName: 'receiveMessage',
    args: [params.message, params.attestation],
  });
}

/** True once an EVM tx is confirmed; false while pending; throws on revert. */
export async function isEvmTxConfirmed(params: {
  network: NetworkType;
  chain: 'base' | 'ethereum';
  txHash: `0x${string}`;
}): Promise<boolean> {
  const pub = createPublicClient({ chain: evmChain(params.network, params.chain), transport: http() });
  try {
    const receipt = await pub.getTransactionReceipt({ hash: params.txHash });
    if (receipt.status === 'reverted') throw new Error(`mint tx reverted: ${params.txHash}`);
    return true;
  } catch (e: any) {
    if (e?.name === 'TransactionReceiptNotFoundError') return false;
    throw e;
  }
}

/** Send a dust amount of native gas to the user's destination address so they
 *  can sign the follow-up swap (LI.FI leg). Cost is priced into the quote. */
export async function sendGasTopUp(params: {
  network: NetworkType;
  chain: 'base' | 'ethereum';
  to: `0x${string}`;
  amountWei: bigint;
}): Promise<`0x${string}`> {
  const account = privateKeyToAccount(relayerEvmKey());
  const wallet = createWalletClient({
    account,
    chain: evmChain(params.network, params.chain),
    transport: http(),
  });
  return wallet.sendTransaction({ to: params.to, value: params.amountWei });
}

// Ceiling so an extreme gas spike can't drain the float; floor so a too-low
// estimate or a noisy gas read can never under-fund a gas-heavy route (a Mayan
// USDC→SOL pivot burns ~1.5M gas). Base gas is ~free, so over-shooting is cents
// and the leftover pre-funds the user's next swap — and the balance check below
// keeps already-funded ("seasoned") wallets at a 0 top-up.
const TOP_UP_MAX_WEI = 3_000_000_000_000_000n; // 0.003 ETH
const TOP_UP_MIN_WEI = 50_000_000_000_000n; // 0.00005 ETH — covers a ~1.5M-gas pivot with margin

/** How much gas the recipient actually needs RIGHT NOW, minus what they already
 *  hold. Live gas price × generous estimate, floored/capped, so we never
 *  under-fund a gas-heavy tx and send 0 when they're already funded (leftover
 *  from a prior swap). `gasEstimate` = expected gas for their upcoming txs. */
export async function computeTopUpShortfall(params: {
  network: NetworkType;
  chain: 'base' | 'ethereum';
  to: `0x${string}`;
  gasEstimate: bigint;
}): Promise<bigint> {
  const pub = createPublicClient({ chain: evmChain(params.network, params.chain), transport: http() });
  const [balance, fees] = await Promise.all([
    pub.getBalance({ address: params.to }),
    pub.estimateFeesPerGas(),
  ]);
  // 2× the estimated fee guards against price drift between now and the user's
  // signature a few seconds later; the floor guards against the estimate itself
  // being too low for the actual route.
  const dynamic = params.gasEstimate * fees.maxFeePerGas * 2n;
  const floored = dynamic > TOP_UP_MIN_WEI ? dynamic : TOP_UP_MIN_WEI;
  const target = floored > TOP_UP_MAX_WEI ? TOP_UP_MAX_WEI : floored;
  return target > balance ? target - balance : 0n;
}

/** Execute CctpForwarder.mint_and_forward on Stellar (inbound direction).
 *  Anyone may call it; the recipient comes from the message's hook data.
 *  Costs dust XLM. Returns the Stellar tx hash. */
export async function executeStellarMintAndForward(params: {
  network: NetworkType;
  message: `0x${string}`;
  attestation: `0x${string}`;
}): Promise<string> {
  const secret = process.env.CCTP_RELAYER_STELLAR_SECRET;
  if (!secret) throw new Error('CCTP_RELAYER_STELLAR_SECRET not configured');

  const stellarCfg = getStellarConfigForNetwork(params.network);
  const server = new rpc.Server(stellarCfg.RPC_URL, {
    allowHttp: stellarCfg.RPC_URL.startsWith('http://'),
  });
  const keypair = Keypair.fromSecret(secret);
  const passphrase =
    params.network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

  const account = await server.getAccount(keypair.publicKey());
  const contract = new Contract(STELLAR_CCTP[params.network].cctpForwarder);

  let tx = new TransactionBuilder(account, { fee: '10000000', networkPassphrase: passphrase })
    .addOperation(
      contract.call(
        'mint_and_forward',
        xdr.ScVal.scvBytes(Buffer.from(hexToBytes(params.message))),
        xdr.ScVal.scvBytes(Buffer.from(hexToBytes(params.attestation)))
      )
    )
    .setTimeout(120)
    .build();

  tx = await server.prepareTransaction(tx);
  tx.sign(keypair);
  const sent = await server.sendTransaction(tx);
  if (sent.status === 'ERROR') {
    throw new Error(`mint_and_forward submit failed: ${JSON.stringify(sent.errorResult ?? sent)}`);
  }
  return sent.hash;
}

/** True once a Stellar tx succeeded; false while pending; throws on failure. */
export async function isStellarTxConfirmed(params: {
  network: NetworkType;
  txHash: string;
}): Promise<boolean> {
  const stellarCfg = getStellarConfigForNetwork(params.network);
  const server = new rpc.Server(stellarCfg.RPC_URL, {
    allowHttp: stellarCfg.RPC_URL.startsWith('http://'),
  });
  const res = await server.getTransaction(params.txHash);
  if (res.status === 'SUCCESS') return true;
  if (res.status === 'FAILED') throw new Error(`stellar tx failed: ${params.txHash}`);
  return false; // NOT_FOUND = still pending (or dropped; advance loop retries)
}

/** Which destination chain executes the mint for a transfer row. */
export function destChainOf(destDomain: number): CctpChain {
  const entry = Object.entries({ ethereum: 0, solana: 5, base: 6, stellar: 27 }).find(
    ([, d]) => d === destDomain
  );
  if (!entry) throw new Error(`unknown CCTP domain ${destDomain}`);
  return entry[0] as CctpChain;
}
