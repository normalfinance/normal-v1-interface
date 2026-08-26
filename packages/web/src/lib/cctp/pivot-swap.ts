'use client';

// Pivot-side leg of the OUTBOUND route: swap the CCTP-minted USDC on Base into
// the target asset via LI.FI, executed from the user's own Base address with
// their Turnkey passkey. Requires the relayer gas top-up to have landed first
// (the address holds no ETH otherwise).
//   1. LI.FI quote  USDC(Base) → BTC/ETH/SOL (delivery to the user's address)
//   2. ERC-20 approve to LI.FI's router (first time / insufficient allowance)
//   3. sign + broadcast LI.FI's transactionRequest on Base

import { signEvmTxWithTurnkey } from '@/lib/turnkey/evm-signer';
import { getTurnkeyWalletInfo } from '@/lib/turnkey/wallet-info';
import { baseFallbackTransport } from '@/lib/chains/rpc-fallback';

import { EVM_USDC } from './config';

// Approve MAX once so repeat swaps skip the approval signature. (`**` transpiles
// to Math.pow, which throws on BigInt — build the constant from a hex literal.)
const MAX_UINT256 = BigInt(`0x${'f'.repeat(64)}`);

export interface PivotSwapResult {
  txHash: `0x${string}`;
  /** minimum target-asset amount (base units) LI.FI guarantees */
  toAmountMin: string;
  /** seconds LI.FI expects until delivery on the target chain */
  etaSeconds: number;
  /** LI.FI chain ids for the status endpoint (#66 delivery gate) */
  fromChainId?: number;
  toChainId?: number;
}

export async function executePivotSwap(params: {
  evmAddress: string;
  toSymbol: 'BTC' | 'ETH' | 'SOL';
  /** user's address on the target chain (BTC / ETH-mainnet / SOL) */
  toAddress: string;
  /** USDC to swap, 6-dp wire units */
  amountWire: bigint;
  /** bridge-failover: LI.FI tool keys to exclude from THIS quote only */
  denyBridges?: string[];
  /** DEX steps to exclude — the failure can live in the swap, not the bridge */
  denyExchanges?: string[];
  onStep?: (step: 'quote' | 'approve' | 'swap') => void;
}): Promise<PivotSwapResult> {
  const info = await getTurnkeyWalletInfo();
  if (!info?.subOrgId)
    throw new Error('Could not load your wallet just now — check your connection and try again.');

  const { erc20Abi, createPublicClient, encodeFunctionData, serializeTransaction } = await import(
    'viem'
  );
  const { base } = await import('viem/chains');
  const client = createPublicClient({ chain: base, transport: await baseFallbackTransport() });
  const from = params.evmAddress as `0x${string}`;
  const usdc = EVM_USDC.base.mainnet;

  // --- 1. quote ---------------------------------------------------------------
  params.onStep?.('quote');
  const res = await fetch('/api/lifi/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fromSymbol: 'USDC_BASE',
      toSymbol: params.toSymbol,
      fromAmount: params.amountWire.toString(),
      fromAddress: params.evmAddress,
      toAddress: params.toAddress,
      denyBridges: params.denyBridges,
      denyExchanges: params.denyExchanges,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success)
    throw new Error(data.error ?? 'No route from Base — try again shortly');
  const quote = data.quote;
  const approvalAddress: `0x${string}` | undefined = quote.estimate?.approvalAddress;
  const txr = quote.transactionRequest;
  if (!txr?.to || !txr?.data) throw new Error('LI.FI returned no executable transaction');

  const signAndSend = async (
    to: `0x${string}`,
    dataHex: `0x${string}`,
    value: bigint,
    gasHint?: bigint
  ) => {
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
    const raw = await signEvmTxWithTurnkey(unsigned, info.subOrgId!, params.evmAddress);
    const hash = await client.sendRawTransaction({ serializedTransaction: raw });
    const receipt = await client.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') {
      // Classified failure (2026-08-26): a revert is an ON-CHAIN outcome, not
      // a signing problem — callers must not re-prompt signatures for it. The
      // quoted bridge rides along so the retry can exclude it.
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
      params.onStep?.('approve');
      // Approve MAX (not the exact amount) so subsequent pivots to the same
      // router skip this signature entirely.
      await signAndSend(
        usdc,
        encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [approvalAddress, MAX_UINT256],
        }),
        0n
      );
    }
  }

  // --- 3. the swap ---------------------------------------------------------------
  params.onStep?.('swap');
  const txHash = await signAndSend(
    txr.to as `0x${string}`,
    txr.data as `0x${string}`,
    BigInt(txr.value ?? '0'),
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
