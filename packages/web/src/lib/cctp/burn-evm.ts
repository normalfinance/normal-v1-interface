'use client';

// Inbound burn on an EVM chain (Base/Ethereum → Stellar): approve +
// depositForBurnWithHook on Circle's TokenMessengerV2, signed with the user's
// Turnkey EVM key (passkey). Validated by the Phase-0 spike (inbound.mjs).
//
// THE critical invariants (mistake = permanently lost funds on mainnet):
//   mintRecipient      = CctpForwarder contract (bytes32)
//   destinationCaller  = CctpForwarder contract (bytes32)
//   recipient G-address ONLY in hookData (encodeStellarHookData)
// The recipient's USDC trustline MUST be verified before calling this.

import { type NetworkType } from '@normalfinance/utils';
import { signEvmTxWithTurnkey } from '@/lib/turnkey/evm-signer';
import { getTurnkeyWalletInfo } from '@/lib/turnkey/wallet-info';
import { evmFallbackTransport } from '@/lib/chains/rpc-fallback';

import { stellarContractToBytes32 } from './addresses';
import { bytesToHex, encodeStellarHookData } from './hookdata';
import {
  EVM_CCTP,
  EVM_USDC,
  CCTP_DOMAIN,
  STELLAR_CCTP,
  CCTP_MAX_FEE,
  CCTP_MIN_FINALITY_THRESHOLD,
} from './config';

const DEPOSIT_FOR_BURN_WITH_HOOK_ABI = [
  {
    type: 'function',
    name: 'depositForBurnWithHook',
    stateMutability: 'nonpayable',
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
  },
] as const;

export interface EvmBurnParams {
  network: NetworkType;
  chain: 'base' | 'ethereum';
  /** User's EVM address (burn source; signs both txs). */
  evmAddress: string;
  /** Amount in 6-dp wire units (= native USDC units on EVM). */
  amountWire: bigint;
  /** Final recipient on Stellar (G…). Trustline must already exist. */
  stellarRecipient: string;
  onStep?: (step: 'approve' | 'burn') => void;
}

/** Runs approve (if needed) + depositForBurnWithHook. Returns the burn hash. */
export async function burnUsdcOnEvm(params: EvmBurnParams): Promise<{
  approveTxHash: `0x${string}` | null;
  burnTxHash: `0x${string}`;
}> {
  const info = await getTurnkeyWalletInfo();
  if (!info?.subOrgId) throw new Error('Turnkey wallet not found');

  // Custody invariant: the recipient of the bridged USDC is fixed HERE, inside
  // the user-signed burn (mintRecipient = CctpForwarder; the real recipient is
  // this G-address, carried in hookData). The relayer only replays this signed
  // message on Stellar — it can never redirect the funds. Refuse to sign a burn
  // whose recipient is malformed (a burn to nowhere would be unrecoverable).
  if (!/^G[A-Z2-7]{55}$/.test(params.stellarRecipient)) {
    throw new Error('refusing to burn: invalid Stellar recipient address');
  }

  const { erc20Abi, createPublicClient, encodeFunctionData, serializeTransaction } = await import(
    'viem'
  );
  const { base, mainnet, sepolia, baseSepolia } = await import('viem/chains');
  const chains = {
    mainnet: { base, ethereum: mainnet },
    testnet: { base: baseSepolia, ethereum: sepolia },
  } as const;
  const chain = chains[params.network][params.chain];
  const client = createPublicClient({
    chain,
    transport: await evmFallbackTransport(params.chain, params.network),
  });

  const usdc = EVM_USDC[params.chain][params.network];
  const tokenMessenger = EVM_CCTP[params.network].tokenMessengerV2;
  const from = params.evmAddress as `0x${string}`;

  const signAndSend = async (
    to: `0x${string}`,
    data: `0x${string}`,
    label: string
  ): Promise<`0x${string}`> => {
    const [nonce, fees, gas] = await Promise.all([
      client.getTransactionCount({ address: from, blockTag: 'pending' }),
      client.estimateFeesPerGas(),
      client.estimateGas({ account: from, to, data }),
    ]);
    const unsigned = serializeTransaction({
      chainId: chain.id,
      type: 'eip1559',
      nonce,
      to,
      data,
      gas: (gas * 12n) / 10n, // 20% headroom
      maxFeePerGas: fees.maxFeePerGas,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
    });
    const raw = await signEvmTxWithTurnkey(unsigned, info.subOrgId!, params.evmAddress);
    const hash = await client.sendRawTransaction({ serializedTransaction: raw });
    const receipt = await client.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error(`${label} reverted (${hash})`);
    return hash;
  };

  const readAllowance = () =>
    client.readContract({
      address: usdc,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [from, tokenMessenger],
    });

  // 1) approve, only when the current allowance is insufficient. Approve MAX so
  // the exact burn amount can never be one unit short and repeat burns skip it.
  let approveTxHash: `0x${string}` | null = null;
  // NB: `2n ** 256n` must NOT be used — the build target transpiles `**` to
  // Math.pow(), which throws "Cannot convert a BigInt value to a number" on
  // BigInt operands. Use a hex literal (64 nibbles = 256 bits) instead.
  const MAX_UINT256 = BigInt(`0x${'f'.repeat(64)}`);
  if ((await readAllowance()) < params.amountWire) {
    params.onStep?.('approve');
    approveTxHash = await signAndSend(
      usdc,
      encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [tokenMessenger, MAX_UINT256],
      }),
      'approve'
    );
    // Read-after-write: wait until the approve is visible to the RPC before the
    // burn estimates gas, so a lagging (load-balanced) node can't false-revert
    // with "transfer amount exceeds allowance".
    for (let i = 0; i < 15; i++) {
      if ((await readAllowance()) >= params.amountWire) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // 2) burn with the forwarder + hookData (recipient trustline pre-verified).
  // Retry on an allowance revert — the approve is confirmed on-chain, so a stale
  // read during gas estimation clears within a couple of seconds.
  params.onStep?.('burn');
  const forwarder = stellarContractToBytes32(STELLAR_CCTP[params.network].cctpForwarder);
  const burnData = encodeFunctionData({
    abi: DEPOSIT_FOR_BURN_WITH_HOOK_ABI,
    functionName: 'depositForBurnWithHook',
    args: [
      params.amountWire,
      CCTP_DOMAIN.stellar,
      forwarder, // mintRecipient = CctpForwarder
      usdc,
      forwarder, // destinationCaller = CctpForwarder
      CCTP_MAX_FEE,
      CCTP_MIN_FINALITY_THRESHOLD,
      bytesToHex(encodeStellarHookData(params.stellarRecipient)),
    ],
  });
  let burnTxHash: `0x${string}` | undefined;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      burnTxHash = await signAndSend(tokenMessenger, burnData, 'depositForBurnWithHook');
      break;
    } catch (e: any) {
      const msg = String(e?.shortMessage ?? e?.message ?? e);
      if (attempt < 3 && /allowance/i.test(msg)) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      throw e;
    }
  }

  return { approveTxHash, burnTxHash: burnTxHash! };
}
