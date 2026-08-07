import type { NetworkType } from '@normalfinance/utils';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
// Dust-gas top-up for the burn chain. In the inbound flow (BTC/ETH/SOL →
// Stellar) the user's swapped USDC lands on Base where they hold zero ETH, so
// the relayer fronts enough gas for their approve + burn/pivot transactions.
// RE-ENTRANT: a retry (or a "Finish"/"Bring back" recovery tap) re-evaluates the
// CURRENT balance and re-funds a still-short address, instead of skipping after
// the first send. Cost is priced into the quote.
import { NextResponse } from 'next/server';
import { sendGasTopUp, computeTopUpShortfall } from '@/lib/cctp/executor';

export const dynamic = 'force-dynamic';

// Gas the recipient's upcoming txs will burn on Base. Deliberately GENEROUS: the
//  outbound pivot can route through a gas-heavy bridge (Mayan USDC→SOL ≈ 1.5M
//  gas), and under-funding fails the swap. The estimate is priced LIVE against
//  the current gas price (+ a floor in computeTopUpShortfall), minus what the
//  address already holds — so it's cents at low gas and 0 for funded wallets.
const OUTBOUND_GAS_ESTIMATE = 2_000_000n; // pivot (approve + Mayan/LI.FI swap)
const INBOUND_GAS_ESTIMATE = 600_000n; // approve + depositForBurnWithHook

export const POST = withAuth(async (req: Request, { user }) => {
  const { transferId } = await req.json();
  const transfer = await prisma.cctpTransfer.findUnique({ where: { id: transferId } });
  if (!transfer || transfer.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  // Which address needs gas depends on direction: inbound tops up the EVM
  // source BEFORE its burn; outbound tops up the EVM destination AFTER the
  // mint (so the user can sign the pivot swap).
  const outbound = transfer.direction.startsWith('stellar');
  const evmTarget = outbound ? transfer.destAddress : transfer.srcAddress;
  if (outbound && !transfer.mintTxHash) {
    return NextResponse.json({ error: 'mint not yet executed' }, { status: 400 });
  }
  if (!outbound && transfer.burnTxHash) {
    return NextResponse.json({ error: 'burn already executed' }, { status: 400 });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(evmTarget)) {
    return NextResponse.json({ error: 'transfer has no EVM leg' }, { status: 400 });
  }

  // Re-entrant lock: reject only a genuinely in-flight top-up (a fresh
  // 'pending'); reclaim a stale one (a crashed request >60s ago). The CAS on the
  // PRIOR value lets a retry re-fund while two concurrent calls can't double-send.
  const prior = transfer.gasTopUpTxHash;
  if (prior === 'pending' && Date.now() - transfer.updatedAt.getTime() < 60_000) {
    return NextResponse.json({ error: 'top-up already in progress' }, { status: 409 });
  }
  const claimed = await prisma.cctpTransfer.updateMany({
    where: { id: transfer.id, gasTopUpTxHash: prior },
    data: { gasTopUpTxHash: 'pending' },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ error: 'top-up already in progress' }, { status: 409 });
  }

  try {
    const network = transfer.network as NetworkType;
    const shortfall = await computeTopUpShortfall({
      network,
      chain: 'base',
      to: evmTarget as `0x${string}`,
      gasEstimate: outbound ? OUTBOUND_GAS_ESTIMATE : INBOUND_GAS_ESTIMATE,
    });

    // Already funded (seasoned wallet, or a prior top-up landed) → send nothing;
    // keep any real prior hash, else mark 'skipped'.
    if (shortfall === 0n) {
      await prisma.cctpTransfer.update({
        where: { id: transfer.id },
        data: { gasTopUpTxHash: prior && prior !== 'pending' ? prior : 'skipped' },
      });
      return NextResponse.json({ skipped: true, reason: 'recipient already has enough gas' });
    }

    const txHash = await sendGasTopUp({
      network,
      chain: 'base',
      to: evmTarget as `0x${string}`,
      amountWei: shortfall,
    });
    await prisma.cctpTransfer.update({
      where: { id: transfer.id },
      data: { gasTopUpTxHash: txHash },
    });
    return NextResponse.json({ txHash, amountWei: shortfall.toString() });
  } catch (e: any) {
    // Release the lock back to its prior value so a retry can reclaim + re-fund.
    await prisma.cctpTransfer.update({
      where: { id: transfer.id },
      data: {
        gasTopUpTxHash: prior === 'pending' ? null : prior,
        errorDetail: String(e?.message ?? e).slice(0, 500),
      },
    });
    return NextResponse.json({ error: 'top-up failed' }, { status: 502 });
  }
});
