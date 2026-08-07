import type { NetworkType } from '@normalfinance/utils';

// CCTP-leg quote + policy. The swap engine composes the full quote from three
// sources: the Soroswap quote (existing route), THIS (the bridge leg — free at
// protocol level, but carries ETA + relayer gas pricing + fee policy), and the
// LI.FI quote (existing route, where our single 0.5% integrator fee lives).
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAccessToken } from '@/utils/http';
import { CCTP_DOMAIN, CCTP_ETA_SECONDS } from '@/lib/cctp/config';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

export const dynamic = 'force-dynamic';

// Product limits (locked decisions): min $10; mainnet pilot cap $50 until the
// pilot week is clean, then raised via env without a code change.
const MIN_WIRE = 10_000_000n; // $10
const pilotMaxWire = (): bigint => {
  const usd = Number(process.env.CCTP_PILOT_MAX_USD ?? 50);
  return BigInt(Math.round(usd * 1_000_000));
};

// v1 static estimates, from Phase-0 measurements (mint gas 154,589 on Base at
// sub-gwei prices) plus the dust top-up for the user's destination swap. These
// are deliberately conservative; refined once live telemetry exists.
const DEST_COSTS: Record<'base' | 'ethereum' | 'stellar', { gasUsd: number; topUpUsd: number }> = {
  base: { gasUsd: 0.05, topUpUsd: 0.1 },
  ethereum: { gasUsd: 5, topUpUsd: 4 },
  stellar: { gasUsd: 0.01, topUpUsd: 0 }, // relayer XLM dust; no top-up (Soroswap fees ~dust)
};

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(getAccessToken(req));
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { sourceDomain, destDomain, amountWire } = body ?? {};

  const domains = new Set<number>(Object.values(CCTP_DOMAIN));
  if (!domains.has(sourceDomain) || !domains.has(destDomain) || sourceDomain === destDomain) {
    return NextResponse.json({ error: 'invalid domains' }, { status: 400 });
  }
  if (typeof amountWire !== 'string' || !/^\d+$/.test(amountWire)) {
    return NextResponse.json({ error: 'amountWire must be an integer string' }, { status: 400 });
  }

  const amount = BigInt(amountWire);
  if (amount < MIN_WIRE) {
    return NextResponse.json(
      { error: 'below_minimum', minAmountWire: MIN_WIRE.toString() },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const network = (cookieStore.get('normal-network')?.value ?? 'mainnet') as NetworkType;
  const maxWire = network === 'mainnet' ? pilotMaxWire() : null;
  if (maxWire && amount > maxWire) {
    return NextResponse.json(
      { error: 'above_pilot_cap', maxAmountWire: maxWire.toString() },
      { status: 400 }
    );
  }

  const destChain =
    destDomain === CCTP_DOMAIN.stellar
      ? 'stellar'
      : destDomain === CCTP_DOMAIN.ethereum
        ? 'ethereum'
        : 'base';
  const costs = DEST_COSTS[destChain];

  return NextResponse.json({
    network,
    cctpFeeWire: '0', // Circle standard transfer: no protocol fee
    estimatedDestCostsUsd: costs.gasUsd + costs.topUpUsd,
    etaSeconds:
      sourceDomain === CCTP_DOMAIN.stellar
        ? CCTP_ETA_SECONDS.fromStellar
        : CCTP_ETA_SECONDS.fromEvm,
    feeBps: 50,
    feeOnLeg: 'lifi', // single 0.5%, collected on the LI.FI leg; Soroswap leg fee disabled for composite routes
    minAmountWire: MIN_WIRE.toString(),
    maxAmountWire: maxWire?.toString() ?? null,
  });
}
