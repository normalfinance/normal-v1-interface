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
  const { direction, sourceDomain, destDomain, amountWire, srcAsset, dstAsset, srcAddress, destAddress, quoteJson } = body ?? {};

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

  const transfers = await prisma.cctpTransfer.findMany({
    where: { userId: user.id, status: { in: [...PENDING_STATUSES, 'CREATED'] } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return NextResponse.json({ transfers });
}
