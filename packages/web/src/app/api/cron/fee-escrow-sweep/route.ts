// Vercel Cron: complete escrowed fee pairs (#26) and settle tx records (#27).
// The primary driver is the execute-pair route itself; this tick is the
// guarantee — if that invocation, the client tab, or the network died
// mid-pair, the sweeper probes Horizon and finishes the job, and every
// terminal outcome is written onto the pair's DB record so no transaction
// can succeed, fail, or vanish without a truthful row. Registered in
// packages/web/vercel.json. Same auth pattern as cctp-advance.
import { NextResponse } from 'next/server';
import { sweepFeeEscrow } from '@/server/fee-escrow';
import { reconcileSendRecords } from '@/server/send-records';
import {
  settleRecord,
  annotateRecord,
  reconcileTxRecords,
  escrowStatusToRecordUpdate,
} from '@/server/tx-records';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // 1. Complete/kill dead fee pairs (#26)...
  const sweep = await sweepFeeEscrow();

  // 2. ...and mirror each terminal outcome onto its tx record (#27). Done
  //    here rather than inside fee-escrow so the two modules stay one-way.
  for (const result of sweep.results) {
    if (result.action !== 'resolved' || !result.status) continue;
    const update = escrowStatusToRecordUpdate(result.status);
    if (!update) continue;
    try {
      if ('reasonOnly' in update) {
        await annotateRecord({
          kind: result.kind,
          serviceHash: result.serviceHash,
          reason: update.reasonOnly,
        });
      } else {
        await settleRecord({
          kind: result.kind,
          serviceHash: result.serviceHash,
          status: update.status,
          reason: update.reason,
          walletAddress: result.walletAddress,
          network: result.network,
        });
        // Fee-leg-only problems still mean the service SUCCEEDED — keep the
        // note on the (possibly already-confirmed) row.
        if (update.reason === 'fee_uncollected' || update.reason === 'fee_tx_failed') {
          await annotateRecord({
            kind: result.kind,
            serviceHash: result.serviceHash,
            reason: update.reason,
          });
        }
      }
    } catch (err) {
      console.warn('[fee-escrow-sweep] record settle failed for', result.serviceHash, err);
    }
  }

  // 3. Settle records whose execute-pair invocation died before reaching a
  //    terminal state and that have no live escrow driving them (#27).
  const records = await reconcileTxRecords();

  // 4. Settle ETH/SOL send records the same way (#29) — this is also what
  //    releases the one-send-at-a-time guard after an unknown outcome.
  const sends = await reconcileSendRecords();

  return NextResponse.json({ ...sweep, records, sends });
}
