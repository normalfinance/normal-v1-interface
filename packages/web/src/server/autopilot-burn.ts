// #33 Stage 3 payoff — SERVER-side inbound burn (approve + depositForBurn-
// WithHook on Circle's TokenMessengerV2), signed by the AUTOPILOT delegation
// instead of an interactive passkey. Port of lib/cctp/burn-evm.ts per doc 76
// §9: every money invariant is verbatim —
//   mintRecipient      = CctpForwarder contract (bytes32)
//   destinationCaller  = CctpForwarder contract (bytes32)
//   recipient G-address ONLY in hookData
//   MAX_UINT256 via hex literal (never `**` on BigInt)
//   allowance read-after-write loop; 4-attempt burn retry on allowance revert
// The recipient's USDC trustline MUST be verified before calling this.

import { type NetworkType } from '@normalfinance/utils';
import { stellarContractToBytes32 } from '@/lib/cctp/addresses';
import { bytesToHex, encodeStellarHookData } from '@/lib/cctp/hookdata';
import {
  EVM_CCTP,
  EVM_USDC,
  CCTP_DOMAIN,
  STELLAR_CCTP,
  CCTP_MAX_FEE,
  CCTP_MIN_FINALITY_THRESHOLD,
} from '@/lib/cctp/config';

import { signWithAutopilot } from './autopilot-signer';

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

export interface AutopilotBurnParams {
  network: NetworkType;
  chain: 'base' | 'ethereum';
  /** The user's Turnkey sub-org (resolved by the route from the session). */
  subOrgId: string;
  /** User's EVM address (burn source; the autopilot signs as it). */
  evmAddress: string;
  /** Amount in 6-dp wire units (= native USDC units on EVM). */
  amountWire: bigint;
  /** Final recipient on Stellar (G…). Trustline must already exist. */
  stellarRecipient: string;
}

/** Runs approve (if needed) + depositForBurnWithHook via the autopilot
 *  delegation. Throws on any failure — callers fall back to the interactive
 *  path. Returns the burn hash. */
export async function autopilotBurnUsdc(params: AutopilotBurnParams): Promise<{
  approveTxHash: `0x${string}` | null;
  burnTxHash: `0x${string}`;
}> {
  // Custody invariant: the recipient of the bridged USDC is fixed HERE,
  // inside the signed burn (mintRecipient = CctpForwarder; the real
  // recipient is this G-address, carried in hookData). Refuse to sign a burn
  // whose recipient is malformed — a burn to nowhere is unrecoverable.
  if (!/^G[A-Z2-7]{55}$/.test(params.stellarRecipient)) {
    throw new Error('refusing to burn: invalid Stellar recipient address');
  }

  const { http, erc20Abi, createPublicClient, encodeFunctionData, serializeTransaction } =
    await import('viem');
  const { base, mainnet, sepolia, baseSepolia } = await import('viem/chains');
  const chains = {
    mainnet: { base, ethereum: mainnet },
    testnet: { base: baseSepolia, ethereum: sepolia },
  } as const;
  const chain = chains[params.network][params.chain];
  const client = createPublicClient({ chain, transport: http() });

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
    const raw = (await signWithAutopilot({
      subOrgId: params.subOrgId,
      signWith: params.evmAddress,
      unsignedTransaction: unsigned,
      purpose: `cctp-inbound-${label}`,
    })) as `0x${string}`;
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

  // 1) approve, only when the current allowance is insufficient. Approve MAX
  // so the exact burn amount can never be one unit short.
  let approveTxHash: `0x${string}` | null = null;
  // NB: `2n ** 256n` must NOT be used — the build target transpiles `**` to
  // Math.pow(), which throws on BigInt operands. Hex literal instead.
  const MAX_UINT256 = BigInt(`0x${'f'.repeat(64)}`);
  if ((await readAllowance()) < params.amountWire) {
    approveTxHash = await signAndSend(
      usdc,
      encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [tokenMessenger, MAX_UINT256],
      }),
      'approve'
    );
    // Read-after-write: wait until the approve is visible to the RPC before
    // the burn estimates gas (lagging load-balanced nodes false-revert).
    for (let i = 0; i < 15; i++) {
      if ((await readAllowance()) >= params.amountWire) break;
      await new Promise((r) => {
        setTimeout(r, 2000);
      });
    }
  }

  // 2) burn with the forwarder + hookData (recipient trustline pre-verified).
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
        await new Promise((r) => {
          setTimeout(r, 3000);
        });
        continue;
      }
      throw e;
    }
  }

  return { approveTxHash, burnTxHash: burnTxHash! };
}
