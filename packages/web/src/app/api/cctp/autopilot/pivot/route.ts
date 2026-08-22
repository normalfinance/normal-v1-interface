import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { BigNumber } from 'bignumber.js';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { autopilotEnabled } from '@/server/autopilot-signer';
import { autopilotPivotSwap } from '@/server/autopilot-pivot';
import { CHAINS, chainForSymbol } from '@/lib/chains/registry';
import { ensureTransferGas } from '@/server/cctp-transfer-gas';

// #33 Stage 3 payoff — the server-side outbound pivot. Called by the engine
// (or cron) once the CCTP mint lands USDC on the user's Base address, INSTEAD
// of prompting a passkey 20–50 minutes after the swap started. Same checks
// the banner's client recover() performs, plus session ownership; the
// delivery address comes from the user's OWN TurnkeyWallet row, never the
// request body. Any failure = the engine falls back to prompts.
export const dynamic = 'force-dynamic';
// Quote + top-up receipt + approve receipt + pivot receipt can span a couple
// of minutes on Base — the platform default timeout would kill the function
// mid-swap (the tx would still land; the row patch would not).
export const maxDuration = 300;

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    if (!autopilotEnabled()) {
      return NextResponse.json({ success: false, error: 'autopilot-disabled' }, { status: 409 });
    }
    const { transferId } = await request.json();
    if (typeof transferId !== 'string' || !transferId) {
      return NextResponse.json({ success: false, error: 'Missing transferId' }, { status: 400 });
    }

    const tr = await prisma.cctpTransfer.findUnique({ where: { id: transferId } });
    if (!tr || tr.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    // Banner's 'halt-finish' phase, verbatim: outbound, burn done, mint landed
    // (mintTxHash or bridge COMPLETED), pivot leg not yet executed.
    const mintLanded = !!tr.mintTxHash || tr.status === 'COMPLETED';
    if (
      tr.direction !== 'stellar_to_crosschain' ||
      !tr.burnTxHash ||
      !mintLanded ||
      tr.dstSwapTxHash ||
      tr.status === 'FAILED' ||
      tr.status === 'REFUNDED'
    ) {
      return NextResponse.json({ success: false, error: 'Not ready for pivot' }, { status: 409 });
    }

    const toSymbol = tr.dstAsset as 'BTC' | 'ETH' | 'SOL';
    const toChain = chainForSymbol(toSymbol);
    if (!toChain || toChain === 'stellar') {
      return NextResponse.json(
        { success: false, error: 'No pivot for this asset' },
        { status: 409 }
      );
    }

    // The signer address must be the user's OWN Turnkey EVM address (outbound
    // destAddress = their Base pivot address), and the delivery address is
    // read from the same row — the Turnkey policy cannot inspect LI.FI
    // calldata, so this lookup is what pins delivery to the user's own wallet.
    const wallet = await prisma.turnkeyWallet.findFirst({ where: { supabaseUid: user.id } });
    if (
      !wallet?.subOrgId ||
      !wallet.ethereumAddress ||
      wallet.ethereumAddress.toLowerCase() !== tr.destAddress.toLowerCase()
    ) {
      return NextResponse.json({ success: false, error: 'Wallet mismatch' }, { status: 409 });
    }
    const toAddress = wallet[CHAINS[toChain].addressField];
    if (!toAddress) {
      return NextResponse.json(
        { success: false, error: `No ${toSymbol} wallet on file` },
        { status: 409 }
      );
    }

    // Pivot whatever actually landed (mirrors the banner's recover()).
    const { http, erc20Abi, createPublicClient } = await import('viem');
    const { base, baseSepolia } = await import('viem/chains');
    const network = tr.network === 'mainnet' ? 'mainnet' : 'testnet';
    const client = createPublicClient({
      chain: network === 'mainnet' ? base : baseSepolia,
      transport: http(),
    });
    const { EVM_USDC } = await import('@/lib/cctp/config');
    const bal = await client.readContract({
      address: EVM_USDC.base[network],
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [tr.destAddress as `0x${string}`],
    });
    if (bal === 0n) {
      return NextResponse.json({ success: false, error: 'No USDC on Base yet' }, { status: 409 });
    }

    // Dust gas for the approve + pivot — same locked core as /api/cctp/gas-topup,
    // with a real receipt wait instead of the banner's blind sleep.
    const gas = await ensureTransferGas(tr.id);
    if (gas.outcome === 'sent') {
      await client.waitForTransactionReceipt({ hash: gas.txHash });
    } else if (gas.outcome === 'in-progress') {
      await new Promise((r) => {
        setTimeout(r, 6000);
      });
    } else if (gas.outcome === 'failed') {
      return NextResponse.json({ success: false, error: 'Gas top-up failed' }, { status: 502 });
    } else if (gas.outcome === 'invalid') {
      return NextResponse.json({ success: false, error: 'Not ready for pivot' }, { status: 409 });
    }

    const result = await autopilotPivotSwap({
      subOrgId: wallet.subOrgId,
      evmAddress: tr.destAddress,
      toSymbol,
      toAddress,
      amountWire: bal,
    });

    // Mirror the PATCH route: hash + delivered amount land once; a racing
    // writer (banner tap) can't be clobbered. No status flip here — outbound
    // rows are already COMPLETED bridge-side; delivery tracking is the
    // client's #66 LI.FI-status gate.
    const dstAmount = BigNumber(result.toAmountMin)
      .dividedBy(BigNumber(10).pow(CHAINS[toChain].decimals))
      .toFixed();
    await prisma.cctpTransfer.updateMany({
      where: { id: tr.id, dstSwapTxHash: null },
      data: { dstSwapTxHash: result.txHash, ...(tr.dstAmount ? {} : { dstAmount }) },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e?.message ?? e) }, { status: 502 });
  }
});
