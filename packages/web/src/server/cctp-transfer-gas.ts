// Shared server core of the CCTP dust-gas top-up: the /api/cctp/gas-topup
// route and the autopilot burn path both fund the user's EVM address through
// THIS function, so the re-entrant CAS lock (gasTopUpTxHash) stays the single
// writer no matter which door the top-up came through. Callers own auth; this
// re-reads the row fresh because the CAS must compare against the CURRENT
// lock value, not a stale snapshot.

import type { NetworkType } from '@normalfinance/utils';

import { prisma } from '@/lib/prisma';
import { sendGasTopUp, computeTopUpShortfall } from '@/lib/cctp/executor';

// Gas the recipient's upcoming txs will burn on Base. Deliberately GENEROUS:
// the outbound pivot can route through a gas-heavy bridge (Mayan USDC→SOL
// ≈ 1.5M gas), and under-funding fails the swap. The estimate is priced LIVE
// against the current gas price (+ floor/cap in computeTopUpShortfall), minus
// what the address already holds — cents at low gas, 0 for funded wallets.
const OUTBOUND_GAS_ESTIMATE = 2_000_000n; // pivot (approve + Mayan/LI.FI swap)
const INBOUND_GAS_ESTIMATE = 600_000n; // approve + depositForBurnWithHook

export type EnsureTransferGasResult =
  | { outcome: 'sent'; txHash: `0x${string}`; amountWei: bigint }
  | { outcome: 'skipped' } // address already holds enough gas
  | { outcome: 'in-progress' } // another request holds the lock right now
  | { outcome: 'invalid'; reason: string } // transfer state can't take a top-up
  | { outcome: 'failed'; error: string }; // send failed; lock released for retry

/** Evaluate and (if short) fund the transfer's EVM leg with dust gas.
 *  RE-ENTRANT: a retry re-evaluates the CURRENT balance and re-funds a
 *  still-short address; the CAS on the prior lock value stops double-sends. */
export async function ensureTransferGas(transferId: string): Promise<EnsureTransferGasResult> {
  const transfer = await prisma.cctpTransfer.findUnique({ where: { id: transferId } });
  if (!transfer) return { outcome: 'invalid', reason: 'not found' };

  // Which address needs gas depends on direction: inbound tops up the EVM
  // source BEFORE its burn; outbound tops up the EVM destination AFTER the
  // mint (so the pivot swap can pay for itself).
  const outbound = transfer.direction.startsWith('stellar');
  const evmTarget = outbound ? transfer.destAddress : transfer.srcAddress;
  if (outbound && !transfer.mintTxHash)
    return { outcome: 'invalid', reason: 'mint not yet executed' };
  if (!outbound && transfer.burnTxHash)
    return { outcome: 'invalid', reason: 'burn already executed' };
  if (!/^0x[a-fA-F0-9]{40}$/.test(evmTarget))
    return { outcome: 'invalid', reason: 'transfer has no EVM leg' };

  // OWNERSHIP PIN (scenario sweep 2026-08-21): the row's addresses are
  // client-supplied at creation — without this check, fake rows could milk
  // the relayer float into an arbitrary 0x address, one dust top-up per row.
  // Every legitimate flow's EVM leg is the user's own Turnkey ETH address
  // (the engine sets both directions from addresses.ETH), so pin to it.
  const owner = await prisma.turnkeyWallet.findFirst({
    where: { supabaseUid: transfer.userId },
    select: { ethereumAddress: true },
  });
  if (!owner?.ethereumAddress || owner.ethereumAddress.toLowerCase() !== evmTarget.toLowerCase())
    return { outcome: 'invalid', reason: 'top-up target is not the owner wallet' };

  // Re-entrant lock: reject only a genuinely in-flight top-up (a fresh
  // 'pending'); reclaim a stale one (a crashed request >60s ago). The CAS on
  // the PRIOR value lets a retry re-fund while concurrent calls can't double-send.
  const prior = transfer.gasTopUpTxHash;
  if (prior === 'pending' && Date.now() - transfer.updatedAt.getTime() < 60_000) {
    return { outcome: 'in-progress' };
  }
  const claimed = await prisma.cctpTransfer.updateMany({
    where: { id: transfer.id, gasTopUpTxHash: prior },
    data: { gasTopUpTxHash: 'pending' },
  });
  if (claimed.count === 0) return { outcome: 'in-progress' };

  try {
    const network = transfer.network as NetworkType;
    const shortfall = await computeTopUpShortfall({
      network,
      chain: 'base',
      to: evmTarget as `0x${string}`,
      gasEstimate: outbound ? OUTBOUND_GAS_ESTIMATE : INBOUND_GAS_ESTIMATE,
    });

    // Already funded (seasoned wallet, or a prior top-up landed) → send
    // nothing; keep any real prior hash, else mark 'skipped'.
    if (shortfall === 0n) {
      await prisma.cctpTransfer.update({
        where: { id: transfer.id },
        data: { gasTopUpTxHash: prior && prior !== 'pending' ? prior : 'skipped' },
      });
      return { outcome: 'skipped' };
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
    return { outcome: 'sent', txHash, amountWei: shortfall };
  } catch (e: any) {
    // Release the lock back to its prior value so a retry can reclaim + re-fund.
    await prisma.cctpTransfer.update({
      where: { id: transfer.id },
      data: {
        gasTopUpTxHash: prior === 'pending' ? null : prior,
        errorDetail: String(e?.message ?? e).slice(0, 500),
      },
    });
    return { outcome: 'failed', error: String(e?.message ?? e) };
  }
}
