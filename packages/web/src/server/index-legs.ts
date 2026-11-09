import type { CctpTransfer } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { BigNumber } from 'bignumber.js';
import { scopedAmountWire } from '@/lib/cctp/amounts';
import { autopilotEnabled } from '@/server/autopilot-signer';
import { autopilotPivotSwap } from '@/server/autopilot-pivot';
import { CHAINS, chainForSymbol } from '@/lib/chains/registry';
import { ensureTransferGas } from '@/server/cctp-transfer-gas';
import { evmFallbackTransport } from '@/lib/chains/rpc-fallback';
import {
  heldDetail,
  legRunnable,
  INDEX_DIRECTION,
  LEG_CRON_IDLE_MS,
  statusAfterFailure,
  purchaseReadyForLegs,
} from '@/lib/index/legs';
import {
  sanitizeTool,
  sanitizeTxHash,
  parseFailedTool,
  sanitizeToolList,
  pivotRevertDetail,
  parseFailedExchanges,
} from '@/lib/cctp/failure-class';

// ---------------------------------------------------------------------------
// Buys the coins of a crypto index purchase (lib/index/basket.ts) once Circle
// has released its USDC to the person's own Base address.
//
// Twin of server/autopilot-outbound.ts (one swap per transfer), with the same
// safety layers, per leg:
// - Autopilot signs, under the policy the person granted: Base only; the USDC,
//   Circle and LI.FI contracts; no ETH value. Nothing new is allowed.
// - The delivery address is read from the person's OWN wallet row, never
//   from the request: the policy cannot read LI.FI calldata, so this lookup
//   is what pins every coin to their own address.
// - A leg is claimed by compare-and-set before anything signs, and its swap
//   hash is written the moment it broadcasts, so two callers (the open page
//   and the cron) can never swap the same share twice.
// - A leg swaps only its own share of the Base balance (scopedAmountWire).
// - A reverted route is recorded and denied on the next try (bridge
//   failover); after LEG_MAX_ATTEMPTS the leg is HELD: its USDC stays at the
//   person's own Base address, where Bring back or support can move it.
// Legs run one after another, never in parallel: they sign from the same Base
// address, and parallel sends would race for the nonce.
// ---------------------------------------------------------------------------

export type LegOutcome =
  | { id: string; symbol: string; result: 'sent'; txHash: string; dstAmount: string }
  | { id: string; symbol: string; result: 'skipped'; reason: string }
  | { id: string; symbol: string; result: 'failed'; reason: string; held: boolean };

export type FinishIndexOutcome =
  | { ok: true; legs: LegOutcome[] }
  | {
      ok: false;
      reason: 'autopilot-disabled' | 'not-found' | 'not-ready' | 'wallet-mismatch';
      detail?: string;
    };

export async function finishIndexPurchase(purchaseId: string): Promise<FinishIndexOutcome> {
  if (!autopilotEnabled()) return { ok: false, reason: 'autopilot-disabled' };

  const purchase = await prisma.cctpTransfer.findUnique({ where: { id: purchaseId } });
  if (!purchase || purchase.direction !== INDEX_DIRECTION)
    return { ok: false, reason: 'not-found' };
  if (!purchaseReadyForLegs(purchase)) return { ok: false, reason: 'not-ready' };

  // The signer is the person's own Turnkey EVM address, and it is where the
  // USDC was minted; the delivery addresses come from the same row.
  const wallet = await prisma.turnkeyWallet.findFirst({ where: { supabaseUid: purchase.userId } });
  if (
    !wallet?.subOrgId ||
    !wallet.ethereumAddress ||
    wallet.ethereumAddress.toLowerCase() !== purchase.destAddress.toLowerCase()
  ) {
    return { ok: false, reason: 'wallet-mismatch' };
  }

  const legs = await prisma.indexLeg.findMany({
    where: { purchaseId },
    orderBy: { weightBps: 'desc' },
  });

  const outcomes: LegOutcome[] = [];
  for (const leg of legs) {
    if (!legRunnable(leg, Date.now())) {
      outcomes.push({ id: leg.id, symbol: leg.symbol, result: 'skipped', reason: leg.status });
      continue;
    }

    // One after another: the legs sign from the same Base address.
    outcomes.push(await runLeg(purchase, wallet, leg));
  }

  // Every coin's exchange is out (SENT: a hash alone can still be a swap
  // that reverts and is cleared): mark the purchase settled the way an
  // outbound swap is (its dstSwapTxHash), so Activity stops showing it as
  // pending. The first coin's swap stands for the purchase.
  const after = await prisma.indexLeg.findMany({
    where: { purchaseId },
    orderBy: { weightBps: 'desc' },
    select: { symbol: true, status: true, dstSwapTxHash: true },
  });
  if (after.length && after.every((l) => l.status === 'SENT' && !!l.dstSwapTxHash)) {
    await prisma.cctpTransfer
      .updateMany({
        where: { id: purchaseId, dstSwapTxHash: null },
        data: { dstSwapTxHash: after[0].dstSwapTxHash, errorDetail: null },
      })
      .catch(() => {});
  }
  // A coin that stopped retrying waits for the person: say so on the row,
  // so Activity and the swap details can offer "Try it again" from anywhere
  // (the buy page is only one way back).
  const heldLeg = after.find((l) => l.status === 'HELD');
  if (heldLeg) {
    await prisma.cctpTransfer
      .updateMany({
        where: { id: purchaseId, dstSwapTxHash: null },
        data: { errorDetail: heldDetail(heldLeg.symbol) },
      })
      .catch(() => {});
  }
  return { ok: true, legs: outcomes };
}

type Wallet = NonNullable<Awaited<ReturnType<typeof prisma.turnkeyWallet.findFirst>>>;
type Leg = Awaited<ReturnType<typeof prisma.indexLeg.findMany>>[number];

async function runLeg(purchase: CctpTransfer, wallet: Wallet, leg: Leg): Promise<LegOutcome> {
  const base = { id: leg.id, symbol: leg.symbol };

  // Claim: only one caller gets past this for this attempt.
  const claimed = await prisma.indexLeg.updateMany({
    where: { id: leg.id, status: leg.status, retryCount: leg.retryCount, dstSwapTxHash: null },
    data: { status: 'SWAPPING', retryCount: { increment: 1 } },
  });
  if (claimed.count === 0) return { ...base, result: 'skipped', reason: 'claimed elsewhere' };
  const attempt = leg.retryCount + 1;

  const release = async (detail: string): Promise<LegOutcome> => {
    const status = statusAfterFailure(attempt);
    await prisma.indexLeg
      .updateMany({
        where: { id: leg.id, dstSwapTxHash: null },
        data: { status, errorDetail: detail.slice(0, 500) },
      })
      .catch(() => {});
    return { ...base, result: 'failed', reason: detail, held: status === 'HELD' };
  };

  const symbol = leg.symbol as 'BTC' | 'ETH' | 'SOL';
  const toChain = chainForSymbol(symbol);
  if (!toChain || toChain === 'stellar') return release(`no chain for ${leg.symbol}`);
  const toAddress = wallet[CHAINS[toChain].addressField];
  if (!toAddress) return release(`no ${CHAINS[toChain].name} address on this wallet`);

  const network = purchase.network === 'mainnet' ? 'mainnet' : 'testnet';
  const { erc20Abi, createPublicClient } = await import('viem');
  const { base: baseChain, baseSepolia } = await import('viem/chains');
  const client = createPublicClient({
    chain: network === 'mainnet' ? baseChain : baseSepolia,
    transport: await evmFallbackTransport('base', network),
  });

  // Gas for this leg's approve + swap. Re-entrant: each call re-checks the
  // address's live balance and tops up only what one more swap needs.
  const gas = await ensureTransferGas(purchase.id);
  if (gas.outcome === 'sent') {
    await client.waitForTransactionReceipt({ hash: gas.txHash });
  } else if (gas.outcome === 'in-progress') {
    await new Promise((r) => {
      setTimeout(r, 6000);
    });
  } else if (gas.outcome === 'failed') {
    return release(`gas: ${gas.error}`);
  } else if (gas.outcome === 'invalid') {
    return release(`gas: ${gas.reason}`);
  }

  const { EVM_USDC } = await import('@/lib/cctp/config');
  const balance = (await client.readContract({
    address: EVM_USDC.base[network],
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [purchase.destAddress as `0x${string}`],
  })) as bigint;
  // This leg's share only: the other legs' USDC sits in the same balance.
  const pivotWire = scopedAmountWire(balance, BigInt(leg.amountWire));
  if (pivotWire === 0n) return release('no USDC found on Base for this leg');

  const denyBridges = [parseFailedTool(leg.errorDetail)].filter((x): x is string => !!x);
  const denyExchanges = parseFailedExchanges(leg.errorDetail);
  try {
    const result = await autopilotPivotSwap({
      subOrgId: wallet.subOrgId!,
      evmAddress: purchase.destAddress,
      toSymbol: symbol,
      toAddress,
      amountWire: pivotWire,
      denyBridges: denyBridges.length ? denyBridges : undefined,
      denyExchanges: denyExchanges.length ? denyExchanges : undefined,
      // The hash lands on the leg the moment it broadcasts, before any
      // receipt wait can lose it: from then on no caller swaps this share.
      onBroadcast: async (hash, label) => {
        if (label !== 'pivot') return;
        await prisma.indexLeg
          .updateMany({ where: { id: leg.id, dstSwapTxHash: null }, data: { dstSwapTxHash: hash } })
          .catch(() => {});
      },
    });
    const dstAmount = BigNumber(result.toAmountMin)
      .dividedBy(BigNumber(10).pow(CHAINS[toChain].decimals))
      .toFixed();
    await prisma.indexLeg.update({
      where: { id: leg.id },
      data: { status: 'SENT', dstSwapTxHash: result.txHash, dstAmount, errorDetail: null },
    });
    return { ...base, result: 'sent', txHash: result.txHash, dstAmount };
  } catch (e: any) {
    // A swap that went out but reverted still wrote its hash (onBroadcast):
    // the leg must not retry over it. Record the failed route so the next
    // attempt denies it, as the single-coin swap does.
    if (e?.__pivotRevert) {
      const detail = pivotRevertDetail(
        sanitizeTool(e.tool),
        sanitizeTxHash(e.txHash),
        sanitizeToolList(e.exchanges)
      );
      // The revert's hash is on the leg; clear it so the retry can run (the
      // USDC never left: a reverted swap moves nothing).
      await prisma.indexLeg
        .update({
          where: { id: leg.id },
          data: { dstSwapTxHash: null, status: statusAfterFailure(attempt), errorDetail: detail },
        })
        .catch(() => {});
      return {
        ...base,
        result: 'failed',
        reason: detail,
        held: statusAfterFailure(attempt) === 'HELD',
      };
    }
    // Not a revert. If the swap broadcast before the error (a receipt wait
    // that timed out, a lost answer), its hash is on the leg: the swap is
    // out, and only LI.FI can say how it ends. Never retry over it.
    const now = await prisma.indexLeg.findUnique({ where: { id: leg.id } }).catch(() => null);
    if (now?.dstSwapTxHash) {
      await prisma.indexLeg
        .update({ where: { id: leg.id }, data: { status: 'SENT' } })
        .catch(() => {});
      return { ...base, result: 'sent', txHash: now.dstSwapTxHash, dstAmount: now.dstAmount ?? '' };
    }
    return release(String(e?.message ?? e));
  }
}

/**
 * Cron fallback for a closed page: purchases whose USDC is on Base and whose
 * legs wait. The page normally asks for this itself the moment the mint lands;
 * the idle gate keeps the cron from racing it (the leg claims would stop a
 * double swap anyway, this just saves the wasted work).
 */
export async function finishIdleIndexPurchases(limit = 5): Promise<number> {
  // Only purchases Circle has delivered to Base can buy anything. Legs are
  // written when the purchase is saved, so a purchase abandoned at the
  // passkey (or failed before the bridge) keeps three PENDING legs forever;
  // picking legs alone let five of those fill the take on every tick and the
  // live purchases behind them never got their fallback (found 2026-11-09).
  // Longest-idle first, so a purchase that keeps failing cannot hog it either.
  const idleBefore = new Date(Date.now() - LEG_CRON_IDLE_MS);
  const waiting = await prisma.$queryRaw<{ purchaseId: string }[]>`
    SELECT l."purchaseId"
    FROM index_legs l
    JOIN cctp_transfers t ON t.id = l."purchaseId"
    WHERE l.status IN ('PENDING', 'SWAPPING')
      AND l."dstSwapTxHash" IS NULL
      AND l."updatedAt" < ${idleBefore}
      AND t.direction = ${INDEX_DIRECTION}
      AND (t."mintTxHash" IS NOT NULL OR t.status = 'COMPLETED')
      AND t.status NOT IN ('FAILED', 'REFUNDED')
    GROUP BY l."purchaseId"
    ORDER BY MIN(l."updatedAt") ASC
    LIMIT ${limit}
  `;
  let finished = 0;
  for (const { purchaseId } of waiting) {
    const res = await finishIndexPurchase(purchaseId).catch(() => null);
    if (res?.ok && res.legs.some((l) => l.result === 'sent')) finished += 1;
    if (!res?.ok) {
      // Refused before any leg ran (wallet-mismatch, autopilot switched off,
      // an error): nothing touched its legs, so they would stay the longest
      // idle and head the queue on every tick. Move them to the back.
      await prisma.indexLeg
        .updateMany({
          where: { purchaseId, status: 'PENDING', dstSwapTxHash: null },
          data: { updatedAt: new Date() },
        })
        .catch(() => {});
    }
  }
  return finished;
}
