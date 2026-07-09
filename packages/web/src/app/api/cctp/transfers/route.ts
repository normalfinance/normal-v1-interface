import type { NetworkType } from '@normalfinance/utils';

import { prisma } from '@/lib/prisma';
// CCTP transfers — create (persist burn intent BEFORE broadcasting the burn)
// and list the caller's in-flight transfers (drives the resume banner).
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAccessToken } from '@/utils/http';
import { CCTP_DOMAIN } from '@/lib/cctp/config';
import { PENDING_STATUSES } from '@/lib/cctp/state';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

export const dynamic = 'force-dynamic';

const VALID_DOMAINS = new Set<number>(Object.values(CCTP_DOMAIN));

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(getAccessToken(req));
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { direction, sourceDomain, destDomain, amountWire, srcAsset, dstAsset, srcAmount, srcAddress, destAddress, quoteJson } = body ?? {};

  if (!VALID_DOMAINS.has(sourceDomain) || !VALID_DOMAINS.has(destDomain) || sourceDomain === destDomain) {
    return NextResponse.json({ error: 'invalid domains' }, { status: 400 });
  }
  if (typeof amountWire !== 'string' || !/^\d+$/.test(amountWire) || BigInt(amountWire) <= 0n) {
    return NextResponse.json({ error: 'amountWire must be a positive integer string (6dp units)' }, { status: 400 });
  }
  if (!srcAddress || !destAddress || !direction) {
    return NextResponse.json({ error: 'missing direction/addresses' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const network = (cookieStore.get('normal-network')?.value ?? 'mainnet') as NetworkType;

  // Product limits (authoritative here — quotes are advisory): min keeps the
  // fixed costs sane; the mainnet pilot cap bounds blast radius until the
  // rollout week is clean, then is raised via env without a code change.
  const amount = BigInt(amountWire);
  const MIN_WIRE = 10_000_000n; // $10
  if (amount < MIN_WIRE) {
    return NextResponse.json({ error: 'Minimum swap is $10' }, { status: 400 });
  }
  if (network === 'mainnet') {
    const capUsd = Number(process.env.CCTP_PILOT_MAX_USD ?? 50);
    if (amount > BigInt(Math.round(capUsd * 1_000_000))) {
      return NextResponse.json(
        { error: `During the pilot, swaps are capped at $${capUsd}` },
        { status: 400 }
      );
    }
  }

  const transfer = await prisma.cctpTransfer.create({
    data: {
      userId: user.id,
      network,
      direction,
      sourceDomain,
      destDomain,
      amountWire,
      srcAsset: srcAsset ?? 'USDC',
      dstAsset: dstAsset ?? 'USDC',
      srcAmount: typeof srcAmount === 'string' ? srcAmount : null,
      srcAddress,
      destAddress,
      quoteJson: quoteJson ? JSON.stringify(quoteJson) : null,
    },
  });

  return NextResponse.json({ id: transfer.id, status: transfer.status });
}

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(getAccessToken(req));
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ?history=1 → all recent transfers (every status) for the Activity feed;
  // default → in-flight only, for the resume banner.
  const history = new URL(req.url).searchParams.get('history') === '1';
  const transfers = await prisma.cctpTransfer.findMany({
    where: history
      ? { userId: user.id }
      : { userId: user.id, status: { in: [...PENDING_STATUSES, 'CREATED'] } },
    orderBy: { createdAt: 'desc' },
    take: history ? 30 : 20,
  });
  return NextResponse.json({ transfers });
}
