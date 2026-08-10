// Vercel Cron: complete escrowed fee pairs (#26). The primary driver is the
// execute-pair route itself; this tick is the guarantee — if that invocation,
// the client tab, or the network died mid-pair, the sweeper probes Horizon
// and finishes the job (or records the terminal outcome). Registered in
// packages/web/vercel.json. Same auth pattern as cctp-advance.
import { NextResponse } from 'next/server';
import { sweepFeeEscrow } from '@/server/fee-escrow';

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

  const result = await sweepFeeEscrow();
  return NextResponse.json(result);
}
