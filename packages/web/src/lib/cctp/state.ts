// The CCTP transfer state machine. Server-only.
//
// A transfer row is created (and the burn intent persisted) BEFORE the burn is
// broadcast; from then on `advanceTransfer` can always move it forward, no
// matter how many times the process died in between — attestations are
// re-fetchable from Iris indefinitely (re-attested after ~24h expiry).
//
//   BURN_SUBMITTED ──(iris complete)──▶ ATTESTED ──(execute mint)──▶
//   MINT_SUBMITTED ──(tx confirmed)──▶ COMPLETED
//                                        └─(dst swap leg, Phase 2)─▶ DST_SWAP_PENDING
//
// Transitions use optimistic guards (updateMany with expected status) so the
// cron and an opportunistic status-read can race harmlessly.

import type { CctpTransfer } from '@prisma/client';
import type { NetworkType } from '@normalfinance/utils';

import { prisma } from '@/lib/prisma';
import { lifiSourceVerdict } from '@/lib/cctp/lifi-verdict';

import { IrisClient } from './iris';
import { wireToUsdc } from './decimals';
import {
  destChainOf,
  executeEvmMint,
  isEvmTxConfirmed,
  isStellarTxConfirmed,
  executeStellarMintAndForward,
} from './executor';

export const PENDING_STATUSES = [
  'BURN_SUBMITTED',
  'BURN_CONFIRMED',
  'ATTESTED',
  'MINT_SUBMITTED',
] as const;

/** Advance a single transfer one step if possible. Returns the fresh row. */
export async function advanceTransfer(transfer: CctpTransfer): Promise<CctpTransfer> {
  const network = transfer.network as NetworkType;

  try {
    switch (transfer.status) {
      // Niko 2026-08-28: an inbound row whose SOURCE leg reverted on-chain
      // stayed CREATED forever — the banner kept offering "finish once it
      // arrives" for money that provably never moved, and Try again dead-
      // ended on "No USDC found on Base". Every advance pass (the banner's
      // 30s poke, the cron) now asks LI.FI and retires the ghost, so the
      // banner clears without the user doing anything.
      case 'CREATED': {
        if (
          transfer.direction !== 'crosschain_to_stellar' ||
          !transfer.srcSwapTxHash ||
          transfer.burnTxHash
        )
          break;
        const vres = await fetch(
          `https://li.quest/v1/status?txHash=${encodeURIComponent(transfer.srcSwapTxHash)}`,
          {
            cache: 'no-store',
            signal: AbortSignal.timeout(15_000),
            headers: process.env.LIFI_API_KEY ? { 'x-lifi-api-key': process.env.LIFI_API_KEY } : {},
          }
        );
        if (!vres.ok) break;
        const vd = await vres.json();
        const verdict = lifiSourceVerdict(vd?.status, vd?.substatus);
        if (verdict) {
          await prisma.cctpTransfer.updateMany({
            where: { id: transfer.id, status: 'CREATED' },
            data: {
              status: 'FAILED',
              errorDetail:
                verdict === 'REFUNDED'
                  ? 'Source swap refunded — funds returned to the sender; nothing was bridged'
                  : 'Source transaction reverted on-chain — funds never left the sender; nothing was bridged',
            },
          });
        }
        break;
      }

      case 'BURN_SUBMITTED':
      case 'BURN_CONFIRMED': {
        if (!transfer.burnTxHash) break;
        const iris = new IrisClient(network);
        const msg = await iris.getMessageByTxHash(
          transfer.sourceDomain,
          transfer.burnTxHash,
          transfer.destDomain
        );
        if (IrisClient.isComplete(msg)) {
          await prisma.cctpTransfer.updateMany({
            where: { id: transfer.id, status: transfer.status },
            data: {
              status: 'ATTESTED',
              messageHex: msg.message,
              attestationHex: msg.attestation,
              eventNonce: msg.eventNonce,
            },
          });
        }
        break;
      }

      case 'ATTESTED': {
        if (!transfer.messageHex || !transfer.attestationHex) break;
        // Claim the row first so two racing advancers can't double-submit.
        const claimed = await prisma.cctpTransfer.updateMany({
          where: { id: transfer.id, status: 'ATTESTED' },
          data: { status: 'MINT_SUBMITTED' },
        });
        if (claimed.count === 0) break;

        try {
          const destChain = destChainOf(transfer.destDomain);
          let mintTxHash: string;
          if (destChain === 'stellar') {
            mintTxHash = await executeStellarMintAndForward({
              network,
              message: transfer.messageHex as `0x${string}`,
              attestation: transfer.attestationHex as `0x${string}`,
            });
          } else if (destChain === 'base' || destChain === 'ethereum') {
            mintTxHash = await executeEvmMint({
              network,
              chain: destChain,
              message: transfer.messageHex as `0x${string}`,
              attestation: transfer.attestationHex as `0x${string}`,
            });
          } else {
            throw new Error(`destination ${destChain} not yet supported`);
          }
          await prisma.cctpTransfer.update({
            where: { id: transfer.id },
            data: { mintTxHash },
          });
        } catch (e: any) {
          const msg = String(e?.message ?? e);
          // Someone else already executed the mint (destinationCaller is open)
          // — the recipient has their USDC; verify via balance rather than fail.
          if (/nonce already used|already received/i.test(msg)) {
            await prisma.cctpTransfer.update({
              where: { id: transfer.id },
              data: { status: 'COMPLETED', errorDetail: 'mint executed externally' },
            });
          } else {
            // Roll back the claim so the next tick retries.
            await prisma.cctpTransfer.update({
              where: { id: transfer.id },
              data: {
                status: 'ATTESTED',
                retryCount: { increment: 1 },
                errorDetail: msg.slice(0, 500),
              },
            });
          }
        }
        break;
      }

      case 'MINT_SUBMITTED': {
        if (!transfer.mintTxHash) break;
        const destChain = destChainOf(transfer.destDomain);
        const confirmed =
          destChain === 'stellar'
            ? await isStellarTxConfirmed({ network, txHash: transfer.mintTxHash })
            : await isEvmTxConfirmed({
                network,
                chain: destChain as 'base' | 'ethereum',
                txHash: transfer.mintTxHash as `0x${string}`,
              });
        if (confirmed) {
          await prisma.cctpTransfer.updateMany({
            where: { id: transfer.id, status: 'MINT_SUBMITTED' },
            data: {
              status: 'COMPLETED',
              // Inbound mints the burned amount 1:1 as USDC on Stellar, so the
              // delivered amount is known HERE, server-side. The client used to
              // be the only writer (after its status poll resolved) — a dead
              // tab or dropped poll left dstAmount null: the activity feed
              // showed $0 forever and the delivery-dedupe (which keys on
              // dstAmount) let the same USDC appear again as a Receive row.
              // Outbound stays client-written: its delivered amount comes from
              // the LI.FI pivot result, which only the client has.
              ...(transfer.direction === 'crosschain_to_stellar' &&
              transfer.dstAsset === 'USDC' &&
              !transfer.dstAmount
                ? { dstAmount: wireToUsdc(BigInt(transfer.amountWire)) }
                : {}),
            },
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (e: any) {
    await prisma.cctpTransfer.update({
      where: { id: transfer.id },
      data: { retryCount: { increment: 1 }, errorDetail: String(e?.message ?? e).slice(0, 500) },
    });
  }

  return prisma.cctpTransfer.findUniqueOrThrow({ where: { id: transfer.id } });
}

// A row born CREATED that never gained a tx hash within this window is a
// swap that died at (or before) its first signature — nothing reached a
// chain, so nothing will ever advance it. Expire it instead of re-scanning
// it on every cron tick forever (and rendering an eternal "pending" row in
// the activity feed). Trade-off, documented: if a broadcast succeeded but
// the hash-attaching PATCH failed, this marks a live transfer FAILED — the
// funds are still safe (every recipient address is the user's own), only
// the row's label lies, and it takes two independent failures to get there.
const STALE_CREATED_MS = 60 * 60_000;

/** Advance every in-flight transfer (cron entrypoint). */
export async function advancePendingTransfers(): Promise<{
  advanced: number;
  byStatus: Record<string, number>;
}> {
  await prisma.cctpTransfer.updateMany({
    where: {
      status: 'CREATED',
      burnTxHash: null,
      srcSwapTxHash: null,
      createdAt: { lt: new Date(Date.now() - STALE_CREATED_MS) },
    },
    data: {
      status: 'FAILED',
      errorDetail: 'Expired — no transaction was ever sent; no funds moved',
    },
  });

  // Repair COMPLETED inbound rows that predate the server-side dstAmount
  // write above (their client died before reporting) — bounded, and a no-op
  // once the backlog is drained.
  const missingAmount = await prisma.cctpTransfer.findMany({
    where: {
      status: 'COMPLETED',
      direction: 'crosschain_to_stellar',
      dstAsset: 'USDC',
      dstAmount: null,
    },
    take: 20,
  });
  for (const row of missingAmount) {
    await prisma.cctpTransfer.update({
      where: { id: row.id },
      data: { dstAmount: wireToUsdc(BigInt(row.amountWire)) },
    });
  }

  // CREATED inbound rows WITH a source hash are excluded from
  // PENDING_STATUSES on purpose (in-session rows belong to the modal) — but
  // a reverted source leg leaves them as permanent ghosts. Sweep them through
  // advanceTransfer, which retires any whose leg LI.FI reports terminal.
  const ghosts = await prisma.cctpTransfer.findMany({
    where: {
      status: 'CREATED',
      direction: 'crosschain_to_stellar',
      srcSwapTxHash: { not: null },
      burnTxHash: null,
    },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  const pending = await prisma.cctpTransfer.findMany({
    where: { status: { in: [...PENDING_STATUSES] } },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  const byStatus: Record<string, number> = {};
  for (const t of [...ghosts, ...pending]) {
    const after = await advanceTransfer(t);
    byStatus[after.status] = (byStatus[after.status] ?? 0) + 1;
  }
  return { advanced: pending.length, byStatus };
}
