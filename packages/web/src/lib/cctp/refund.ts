'use client';

// THE outbound refund (Niko 2026-08-26/27): bring CCTP-minted USDC on Base
// back to the user's own Stellar account via a fresh Base→Stellar bridge,
// then retire the original swap as refunded. Extracted from the resume
// banner so the progress popup can run the SAME flow with live steps.

import type { NetworkType } from '@normalfinance/utils';

import { buildAuthHeaders } from '@/utils/http';
import { wireToUsdc } from '@/lib/cctp/decimals';
import { burnUsdcOnEvm } from '@/lib/cctp/burn-evm';
import { abortTimeout } from '@/utils/abort-timeout';
import { EVM_USDC, CCTP_DOMAIN } from '@/lib/cctp/config';
import { baseFallbackTransport } from '@/lib/chains/rpc-fallback';

export async function runCctpRefund(args: {
  /** The FAILED outbound transfer being abandoned. */
  transferId: string;
  network: NetworkType;
  /** User's Base address holding the minted USDC (outbound destAddress). */
  baseAddress: string;
  /** User's Stellar account (outbound srcAddress) — the refund recipient. */
  stellarAddress: string;
  /** Doc 93 0b: try the server-side autopilot burn first — the policy
   *  allowlist already covers depositForBurn, so autopilot users get a
   *  signature-less refund; any failure falls through to the passkey burn. */
  tryAutopilotFirst?: boolean;
  onStage?: (s: 'topup' | 'burn') => void;
}): Promise<{ newId: string; burnTxHash: string }> {
  const { transferId, network, baseAddress, stellarAddress, onStage } = args;
  const headers = await buildAuthHeaders();

  const { http, erc20Abi, createPublicClient } = await import('viem');
  const { base, baseSepolia } = await import('viem/chains');
  const client = createPublicClient({
    chain: network === 'mainnet' ? base : baseSepolia,
    transport: network === 'mainnet' ? await baseFallbackTransport() : http(),
  });
  const bal = (await client.readContract({
    address: EVM_USDC.base[network],
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [baseAddress as `0x${string}`],
  })) as bigint;
  if (bal === 0n) throw new Error('No USDC found on Base — it may already be moving.');

  // Fresh Base→Stellar bridge to the user's own account. `refund` bypasses
  // the $10 min / cap — this recovers existing funds, not a new swap.
  const createRes = await fetch('/api/cctp/transfers', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      direction: 'crosschain_to_stellar',
      sourceDomain: CCTP_DOMAIN.base,
      destDomain: CCTP_DOMAIN.stellar,
      amountWire: bal.toString(),
      srcAsset: 'USDC',
      dstAsset: 'USDC',
      srcAmount: wireToUsdc(bal),
      srcAddress: baseAddress,
      destAddress: stellarAddress,
      refund: true,
      // Doc 95 Wave 2: the server verifies this is the caller's own
      // unfinished outbound swap before allowing the min/cap bypass.
      refundOfTransferId: transferId,
    }),
  });
  const createData = await createRes.json().catch(() => null);
  if (!createRes.ok || !createData?.id)
    throw new Error(createData?.error ?? 'Could not start the refund.');
  const newId: string = createData.id;

  onStage?.('topup');
  await fetch('/api/cctp/gas-topup', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ transferId: newId }),
  });
  await new Promise((r) => setTimeout(r, 6000));

  onStage?.('burn');
  if (args.tryAutopilotFirst) {
    try {
      const apRes = await fetch('/api/cctp/autopilot/burn', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ transferId: newId }),
        signal: abortTimeout(300_000),
      });
      const apData = await apRes.json().catch(() => null);
      if (apRes.ok && apData?.success && apData?.burnTxHash) {
        // Server already patched burnTxHash + BURN_SUBMITTED on the new row.
        const patchOriginal = await fetch(`/api/cctp/transfers/${transferId}`, {
          method: 'PATCH',
          headers,
          credentials: 'include',
          body: JSON.stringify({ markRefunded: 'true' }),
        });
        void patchOriginal;
        return { newId, burnTxHash: apData.burnTxHash };
      }
    } catch {
      /* autopilot unavailable — fall through to the passkey burn */
    }
  }
  const { burnTxHash } = await burnUsdcOnEvm({
    network,
    chain: 'base',
    evmAddress: baseAddress,
    amountWire: bal,
    stellarRecipient: stellarAddress,
  });

  const patch = (id: string, body: Record<string, string>) =>
    fetch(`/api/cctp/transfers/${id}`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
    });
  await patch(newId, { burnTxHash, dstAmount: wireToUsdc(bal) });
  // Retire the original outbound swap as refunded.
  await patch(transferId, { markRefunded: 'true' });

  return { newId, burnTxHash };
}
