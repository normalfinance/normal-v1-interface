// #33 Stage 3 payoff — SERVER-side outbound pivot: swap the CCTP-minted USDC
// on Base into the target asset via LI.FI, signed by the AUTOPILOT delegation
// instead of an interactive passkey. Port of lib/cctp/pivot-swap.ts per doc
// 76 §9; the flow is identical —
//   1. LI.FI quote  USDC(Base) → BTC/ETH/SOL (delivery to the user's address)
//   2. ERC-20 approve to LI.FI's router (first time / insufficient allowance)
//   3. sign + broadcast LI.FI's transactionRequest on Base
// — with only the server-mapped differences: quote via getLifiQuote
// in-process (a route can't fetch itself), signWithAutopilot instead of the
// passkey signer, subOrgId/toAddress as params (the ROUTE resolves toAddress
// from the user's own TurnkeyWallet row — never from a request body: the
// Turnkey policy cannot see inside LI.FI calldata, so delivery pinning is
// this layer's job). Mainnet-only Base, same as the client version.

import { EVM_USDC } from '@/lib/cctp/config';
import { baseFallbackTransport } from '@/lib/chains/rpc-fallback';

import { getLifiQuote } from './lifi-quote';
import { signWithAutopilot } from './autopilot-signer';

// Approve MAX once so repeat swaps skip the approval signature. (`**` transpiles
// to Math.pow, which throws on BigInt — build the constant from a hex literal.)
const MAX_UINT256 = BigInt(`0x${'f'.repeat(64)}`);

export interface AutopilotPivotResult {
  txHash: `0x${string}`;
  /** minimum target-asset amount (base units) LI.FI guarantees */
  toAmountMin: string;
  /** seconds LI.FI expects until delivery on the target chain */
  etaSeconds: number;
  /** LI.FI chain ids for the status endpoint (#66 delivery gate) */
  fromChainId?: number;
  toChainId?: number;
}

export async function autopilotPivotSwap(params: {
  /** The user's Turnkey sub-org (resolved by the route from the session). */
  subOrgId: string;
  /** User's Base address holding the minted USDC (the autopilot signs as it). */
  evmAddress: string;
  toSymbol: 'BTC' | 'ETH' | 'SOL';
  /** user's OWN address on the target chain, from their TurnkeyWallet row */
  toAddress: string;
  /** USDC to swap, 6-dp wire units */
  amountWire: bigint;
  /** bridge-failover: LI.FI tool keys to exclude from THIS quote only */
  denyBridges?: string[];
  /** DEX steps to exclude — the failure can live in the swap, not the bridge */
  denyExchanges?: string[];
  /** Doc 95 Wave 3: called the moment a leg is broadcast, before its receipt
   *  is awaited, so a real hash is never lost to a receipt-wait failure. */
  onBroadcast?: (hash: `0x${string}`, label: string) => Promise<void> | void;
}): Promise<AutopilotPivotResult> {
  const { erc20Abi, createPublicClient, encodeFunctionData, serializeTransaction } = await import(
    'viem'
  );
  const { base } = await import('viem/chains');
  // Doc 95 Wave 4: fallback list instead of viem's default public RPC.
  const client = createPublicClient({ chain: base, transport: await baseFallbackTransport() });
  const from = params.evmAddress as `0x${string}`;
  const usdc = EVM_USDC.base.mainnet;

  // --- 1. quote ---------------------------------------------------------------
  const { quote } = await getLifiQuote({
    fromSymbol: 'USDC_BASE',
    toSymbol: params.toSymbol,
    fromAmount: params.amountWire.toString(),
    fromAddress: params.evmAddress,
    toAddress: params.toAddress,
    denyBridges: params.denyBridges,
    denyExchanges: params.denyExchanges,
  });
  const approvalAddress: `0x${string}` | undefined = quote.estimate?.approvalAddress;
  const txr = quote.transactionRequest;
  if (!txr?.to || !txr?.data) throw new Error('LI.FI returned no executable transaction');

  const signAndSend = async (
    to: `0x${string}`,
    dataHex: `0x${string}`,
    value: bigint,
    label: string,
    gasHint?: bigint
  ) => {
    // Doc 95 Wave 3: nonce-race rebuild, matching the client twin.
    let hash: `0x${string}` | null = null;
    for (let attempt = 0; hash === null; attempt++) {
      const [nonce, fees, gas] = await Promise.all([
        client.getTransactionCount({ address: from, blockTag: 'pending' }),
        client.estimateFeesPerGas(),
        gasHint
          ? Promise.resolve(gasHint)
          : client.estimateGas({ account: from, to, data: dataHex, value }),
      ]);
      const unsigned = serializeTransaction({
        chainId: base.id,
        type: 'eip1559',
        nonce,
        to,
        data: dataHex,
        value,
        gas: (gas * 12n) / 10n,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      });
      const raw = (await signWithAutopilot({
        subOrgId: params.subOrgId,
        signWith: params.evmAddress,
        unsignedTransaction: unsigned,
        purpose: `cctp-outbound-${label}`,
        // USDC wire ≈ USD; caps armed on the pivot itself, not the approve.
        amountUsd: label === 'pivot' ? Number(params.amountWire) / 1e6 : undefined,
      })) as `0x${string}`;
      try {
        hash = await client.sendRawTransaction({ serializedTransaction: raw });
      } catch (sendErr: any) {
        const m = String(sendErr?.shortMessage ?? sendErr?.message ?? '');
        if (
          attempt === 0 &&
          /nonce too low|already known|replacement transaction underpriced/i.test(m)
        ) {
          continue;
        }
        throw sendErr;
      }
    }
    // Hash first, receipt second (see autopilot-burn).
    await params.onBroadcast?.(hash, label);
    const receipt = await client.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') {
      // Classified revert (2026-08-26): the tx broadcast and failed ON-CHAIN.
      // The route maps this to failureClass 'reverted' + the quoted bridge so
      // the engine can fail over instead of re-prompting a signature.
      const err: any = new Error(`transaction reverted (${hash})`);
      err.__pivotRevert = true;
      err.txHash = hash;
      err.tool = quote.tool ?? quote.toolDetails?.key ?? null;
      err.exchanges = Array.isArray(quote.includedSteps)
        ? quote.includedSteps
            .filter((st: any) => st?.type === 'swap' && typeof st?.tool === 'string')
            .map((st: any) => st.tool)
        : [];
      throw err;
    }
    return hash;
  };

  // --- 2. approval --------------------------------------------------------------
  if (approvalAddress) {
    const allowance = await client.readContract({
      address: usdc,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [from, approvalAddress],
    });
    if (allowance < params.amountWire) {
      // Approve MAX (not the exact amount) so subsequent pivots to the same
      // router skip this approval entirely.
      await signAndSend(
        usdc,
        encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [approvalAddress, MAX_UINT256],
        }),
        0n,
        'approve'
      );
    }
  }

  // --- 3. the swap ---------------------------------------------------------------
  const txHash = await signAndSend(
    txr.to as `0x${string}`,
    txr.data as `0x${string}`,
    BigInt(txr.value ?? '0'),
    'pivot',
    txr.gasLimit ? BigInt(txr.gasLimit) : undefined
  );

  return {
    txHash,
    toAmountMin: quote.estimate.toAmountMin,
    etaSeconds: quote.estimate.executionDuration ?? 300,
    fromChainId: quote.action?.fromChainId,
    toChainId: quote.action?.toChainId,
  };
}
