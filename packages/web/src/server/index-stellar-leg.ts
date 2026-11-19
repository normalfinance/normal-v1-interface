import { prisma } from '@/lib/prisma';
import { isStellarCoin, stellarSliceAmounts } from '@/lib/index/basket';
import { INDEX_DIRECTION, STELLAR_SWAP_FAILED_DETAIL } from '@/lib/index/legs';
import { type NetworkType, getStellarConfigForNetwork } from '@normalfinance/utils';

import { markPurchaseIfSettled } from './index-legs';

// ---------------------------------------------------------------------------
// Doc 129: Core 4's Stellar coin (XLM). Its share never crosses the bridge:
// the person signs a Soroswap swap of that share (less Normal's 0.5%) and the
// fee payment in the same passkey prompt as the purchase, and the swap runs
// through the fee-pair funnel (api/fees/execute-pair) like any other swap.
// The funnel claims the leg and stamps it with the swap's hash BEFORE
// broadcast, then settles it with the swap; reconcileStellarLegs settles a leg
// whose answer was unclear (Horizon timed out) from the network's own record.
// ---------------------------------------------------------------------------

export interface StellarLegClaim {
  ok: true;
  legId: string;
}
export interface StellarLegRefusal {
  ok: false;
  status: number;
  error: string;
}

/** A 7-decimal amount string as 6-decimal wire units, or null when it is not one. */
export function wireOf(amount: unknown): bigint | null {
  if (typeof amount !== 'string' || !/^\d+(\.\d{1,7})?$/.test(amount)) return null;
  const [whole, frac = ''] = amount.split('.');
  // 7-decimal strings round down to 6: the swap and fee are built from wire units.
  return BigInt(whole) * 1_000_000n + BigInt((frac + '0000000').slice(0, 6));
}

/** Within one wire unit: the 7-to-6-decimal rounding of an exact amount. */
const near = (a: bigint | null, b: bigint) => a !== null && (a > b ? a - b : b - a) <= 1n;

/**
 * Claim the leg for this swap, before anything is broadcast. Refused unless
 * the purchase is the person's, the swap comes from the purchase's own
 * Stellar wallet, and the swap and fee are exactly this coin's share and 0.5%.
 */
export async function claimStellarLeg(p: {
  userId: string;
  purchaseId: unknown;
  symbol: unknown;
  walletAddress: string;
  serviceHash: string;
  amountIn: unknown;
  feeAmount: unknown;
}): Promise<StellarLegClaim | StellarLegRefusal> {
  if (
    typeof p.purchaseId !== 'string' ||
    typeof p.symbol !== 'string' ||
    !isStellarCoin(p.symbol)
  ) {
    return { ok: false, status: 400, error: 'indexLeg must name a Stellar coin of a purchase' };
  }
  const purchase = await prisma.cctpTransfer.findUnique({ where: { id: p.purchaseId } });
  if (!purchase || purchase.userId !== p.userId || purchase.direction !== INDEX_DIRECTION) {
    return { ok: false, status: 404, error: 'Purchase not found' };
  }
  if (purchase.srcAddress !== p.walletAddress) {
    return { ok: false, status: 403, error: 'The swap must come from the purchase’s own wallet' };
  }
  const leg = await prisma.indexLeg.findUnique({
    where: { purchaseId_symbol: { purchaseId: p.purchaseId, symbol: p.symbol } },
  });
  if (!leg) return { ok: false, status: 404, error: 'This coin is not part of the purchase' };

  const { feeWire, swapWire } = stellarSliceAmounts(BigInt(leg.amountWire));
  if (!near(wireOf(p.amountIn), swapWire) || !near(wireOf(p.feeAmount), feeWire)) {
    return { ok: false, status: 400, error: 'The swap does not match this coin’s share' };
  }

  const claimed = await prisma.indexLeg.updateMany({
    where: { id: leg.id, status: 'PENDING', dstSwapTxHash: null },
    data: { status: 'SWAPPING', dstSwapTxHash: p.serviceHash, retryCount: { increment: 1 } },
  });
  if (claimed.count === 0) {
    return { ok: false, status: 409, error: 'This coin is already being bought' };
  }
  return { ok: true, legId: leg.id };
}

/** Settle a claimed leg with its swap's outcome. */
export async function settleStellarLeg(
  legId: string,
  outcome: { sent: true; amountOut: string | null } | { sent: false }
): Promise<void> {
  const leg = await prisma.indexLeg.findUnique({ where: { id: legId } });
  if (!leg || leg.status !== 'SWAPPING') return;
  await prisma.indexLeg.update({
    where: { id: legId },
    data: outcome.sent
      ? { status: 'SENT', dstAmount: outcome.amountOut, errorDetail: null }
      : // The swap did not happen: its share is still USDC in the Stellar wallet.
        { status: 'HELD', dstSwapTxHash: null, errorDetail: STELLAR_SWAP_FAILED_DETAIL },
  });
  await markPurchaseIfSettled(leg.purchaseId);
}

/** How long Horizon may stay unsure before the network's own record is asked. */
const UNCLEAR_AFTER_MS = 2 * 60_000;

/** A Stellar leg never sent by its page: held after this long (nothing moved). */
const NEVER_SENT_AFTER_MS = 30 * 60_000;

/**
 * A Stellar leg left SWAPPING (the funnel's answer was unclear): settle it
 * from Horizon, which keeps the full history. Unknown stays as it is.
 */
export async function reconcileStellarLegs(purchaseId: string): Promise<void> {
  const purchase = await prisma.cctpTransfer.findUnique({
    where: { id: purchaseId },
    select: { network: true },
  });
  if (!purchase) return;
  // A Stellar leg the page never sent (it closed before the swap went out):
  // nothing moved, its share is still USDC in the Stellar wallet. After a
  // while it is held, so the purchase can settle and say so.
  const unsent = await prisma.indexLeg.findMany({
    where: { purchaseId, status: 'PENDING', dstSwapTxHash: null },
  });
  for (const leg of unsent) {
    if (!isStellarCoin(leg.symbol)) continue;
    if (Date.now() - leg.createdAt.getTime() < NEVER_SENT_AFTER_MS) continue;
    await prisma.indexLeg.updateMany({
      where: { id: leg.id, status: 'PENDING', dstSwapTxHash: null },
      data: { status: 'HELD', errorDetail: STELLAR_SWAP_FAILED_DETAIL },
    });
    await markPurchaseIfSettled(purchaseId);
  }

  const legs = await prisma.indexLeg.findMany({ where: { purchaseId, status: 'SWAPPING' } });
  const cfg = getStellarConfigForNetwork(purchase.network as NetworkType);
  for (const leg of legs) {
    if (!isStellarCoin(leg.symbol) || !leg.dstSwapTxHash) continue;
    if (Date.now() - leg.updatedAt.getTime() < UNCLEAR_AFTER_MS) continue;
    let res: Response;
    try {
      res = await fetch(`${cfg.HORIZON_URL}/transactions/${leg.dstSwapTxHash}`, {
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      continue;
    }
    if (res.status === 404) {
      // Its time limit passed long ago (the swap's 2-minute window): it never landed.
      if (Date.now() - leg.updatedAt.getTime() > 10 * 60_000) {
        await settleStellarLeg(leg.id, { sent: false });
      }
      continue;
    }
    if (!res.ok) continue;
    const tx = (await res.json().catch(() => null)) as { successful?: boolean } | null;
    if (tx?.successful === true)
      await settleStellarLeg(leg.id, { sent: true, amountOut: leg.dstAmount });
    if (tx?.successful === false) await settleStellarLeg(leg.id, { sent: false });
  }
}
