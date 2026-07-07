import type { NetworkType } from '@normalfinance/utils';

import { prisma } from '@/lib/prisma';
// Dust-gas top-up for the burn chain. In the inbound flow (BTC/ETH/SOL →
// Stellar) the user's swapped USDC lands on Base where they hold zero ETH, so
// the relayer fronts just enough gas for the approve + burn transactions. Once
// per transfer (gasTopUpTxHash guard); cost is priced into the quote.
import { NextResponse } from 'next/server';
import { getAccessToken } from '@/utils/http';
import { sendGasTopUp } from '@/lib/cctp/executor';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

export const dynamic = 'force-dynamic';

// Approve (~60k) + depositForBurnWithHook (~180k) at Base's sub-gwei prices is
// well under 0.00003 ETH; 0.0001 leaves generous headroom for fee spikes.
const TOP_UP_WEI = 100_000_000_000_000n; // 0.0001 ETH

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(getAccessToken(req));
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { transferId } = await req.json();
  const transfer = await prisma.cctpTransfer.findUnique({ where: { id: transferId } });
  if (!transfer || transfer.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (transfer.gasTopUpTxHash) {
    return NextResponse.json({ txHash: transfer.gasTopUpTxHash, alreadySent: true });
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

  // Claim before sending so concurrent calls can't double-spend the float.
  const claimed = await prisma.cctpTransfer.updateMany({
    where: { id: transfer.id, gasTopUpTxHash: null },
    data: { gasTopUpTxHash: 'pending' },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ error: 'top-up already in progress' }, { status: 409 });
  }

  try {
    const txHash = await sendGasTopUp({
      network: transfer.network as NetworkType,
      chain: 'base',
      to: evmTarget as `0x${string}`,
      amountWei: TOP_UP_WEI,
    });
    await prisma.cctpTransfer.update({ where: { id: transfer.id }, data: { gasTopUpTxHash: txHash } });
    return NextResponse.json({ txHash });
  } catch (e: any) {
    await prisma.cctpTransfer.update({
      where: { id: transfer.id },
      data: { gasTopUpTxHash: null, errorDetail: String(e?.message ?? e).slice(0, 500) },
    });
    return NextResponse.json({ error: 'top-up failed' }, { status: 502 });
  }
}
