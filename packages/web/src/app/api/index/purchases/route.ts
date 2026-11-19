import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { readMarkets } from '@/server/markets';
import { indexEnabled } from '@/lib/index/flag';
import { CCTP_DOMAIN } from '@/lib/cctp/config';
import { networkFromCookie } from '@/server/network-cookie';
import { withAuth, actionCodeRefusal } from '@/lib/with-auth';
import { autopilotStatusFor } from '@/server/autopilot-status';
import { INDEX_DIRECTION, INDEX_DST_ASSET } from '@/lib/index/legs';
import {
  CORE_INDEX,
  bridgedWire,
  CRYPTO_INDEX,
  parseWeights,
  isStellarCoin,
  marketWeights,
  weightsWithin,
  purchaseVerdict,
  wireToUsdNumber,
  stellarSliceAmounts,
  WEIGHT_TOLERANCE_BPS,
} from '@/lib/index/basket';

// ---------------------------------------------------------------------------
// POST /api/index/purchases: record a crypto index purchase BEFORE anything is
// signed (the same rule as a Circle swap: the burn intent exists before the
// burn). One CctpTransfer row (direction 'stellar_to_index') for the single
// Stellar burn, plus one IndexLeg per coin with its exact share.
//
// The server decides every address that money moves to: the mint goes to the
// person's own Base address and each coin to their own address on its chain,
// all read from their wallet row. The request says how much, and the shares
// the person reviewed: the index is weighted by market size (lib/index/basket),
// so the server reads the same market data the page did and takes the
// reviewed shares only when they agree with it (WEIGHT_TOLERANCE_BPS).
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (req: Request, { user, accessToken }) => {
  if (!indexEnabled()) {
    return NextResponse.json({ error: 'The crypto index is not available yet' }, { status: 404 });
  }
  // Moving money: the two-factor action code, when the person has 2FA on.
  const refusal = actionCodeRefusal(user, accessToken);
  if (refusal) return refusal;

  const body = await req.json().catch(() => null);
  const amountWire = body?.amountWire;
  if (typeof amountWire !== 'string' || !/^\d+$/.test(amountWire)) {
    return NextResponse.json(
      { error: 'amountWire must be a whole number of USDC units (6 decimals)' },
      { status: 400 }
    );
  }

  // Doc 129: the index this client buys. Core 4 only when the client asks for
  // it by id: it runs a Stellar swap from the page, which a client that does
  // not know Core 4 (an older app build) would never send. Any other client
  // keeps buying Top 3, exactly as before, until it updates.
  const INDEX_DEF = body?.index === CORE_INDEX.id ? CORE_INDEX : CRYPTO_INDEX;

  // The shares: market sizes from the cache the page read them from.
  const read = await readMarkets();
  const current = read
    ? marketWeights(INDEX_DEF, (symbol) => read.markets.find((m) => m.symbol === symbol)?.marketCap)
    : null;
  if (!current) {
    return NextResponse.json(
      {
        error:
          'Market sizes are unavailable right now, so the split can’t be set. Please try again in a few minutes.',
      },
      { status: 503 }
    );
  }
  let weights = current;
  // The shares the person reviewed, when the page sends them (a client that
  // doesn't is split by the server's own reading).
  if (body?.weights !== undefined) {
    const reviewed = parseWeights(INDEX_DEF, body.weights);
    if (!reviewed) {
      return NextResponse.json(
        { error: 'weights must be the index’s coins in whole basis points summing to 10,000' },
        { status: 400 }
      );
    }
    if (!weightsWithin(reviewed, current, WEIGHT_TOLERANCE_BPS)) {
      return NextResponse.json(
        {
          error: 'The coins’ market sizes moved since you looked. Go back to see the new split.',
          code: 'weights-changed',
          weights: current,
        },
        { status: 409 }
      );
    }
    weights = reviewed;
  }

  const cookieStore = await cookies();
  const network = networkFromCookie(cookieStore);
  const capUsd = Number(process.env.CCTP_PILOT_MAX_USD);
  const maximumWire =
    network === 'mainnet' && Number.isFinite(capUsd) && capUsd > 0
      ? BigInt(Math.round(capUsd * 1_000_000))
      : null;
  const verdict = purchaseVerdict(BigInt(amountWire), maximumWire, weights);
  if (!verdict.ok) {
    return NextResponse.json(
      verdict.reason === 'too-small'
        ? { error: `The smallest purchase is $${wireToUsdNumber(verdict.minimumWire)}` }
        : { error: `Purchases are capped at $${wireToUsdNumber(verdict.maximumWire)} for now` },
      { status: 400 }
    );
  }

  const wallet = await prisma.turnkeyWallet.findFirst({ where: { supabaseUid: user.id } });
  if (!wallet?.stellarAddress || !wallet.ethereumAddress) {
    return NextResponse.json({ error: 'Set up your wallet first' }, { status: 409 });
  }
  const missing = INDEX_DEF.coins.filter(
    (symbol) =>
      (symbol === 'BTC' && !wallet.bitcoinAddress) ||
      (symbol === 'ETH' && !wallet.ethereumAddress) ||
      (symbol === 'SOL' && !wallet.solanaAddress) ||
      (symbol === 'XLM' && !wallet.stellarAddress)
  );
  if (missing.length) {
    return NextResponse.json(
      {
        error: 'Add these coins to your wallet first',
        missing,
      },
      { status: 409 }
    );
  }

  // One signature is the point: without Autopilot the coins could not be
  // bought once the person leaves, so the page asks for it before this call.
  const autopilot = await autopilotStatusFor(user.id).catch(() => null);
  if (!autopilot?.active) {
    return NextResponse.json(
      { error: 'Turn on auto-finish first, then try again.', autopilot: false },
      { status: 409 }
    );
  }

  // Doc 129: a Stellar coin's slice is bought on Stellar from the same
  // signature; only the other slices cross to Base. The row is Circle's
  // transfer, so it carries the bridged amount; the purchase total and the
  // Stellar slices' exact swap and fee live in its quote.
  const bridged = bridgedWire(verdict.slices);
  const stellarLegs = verdict.slices
    .filter((sl) => isStellarCoin(sl.symbol))
    .map((sl) => {
      const { feeWire, swapWire } = stellarSliceAmounts(sl.amountWire);
      return {
        symbol: sl.symbol,
        amountWire: sl.amountWire.toString(),
        feeWire: feeWire.toString(),
        swapWire: swapWire.toString(),
      };
    });

  const purchase = await prisma.$transaction(async (tx) => {
    const row = await tx.cctpTransfer.create({
      data: {
        userId: user.id,
        network,
        direction: INDEX_DIRECTION,
        sourceDomain: CCTP_DOMAIN.stellar,
        destDomain: CCTP_DOMAIN.base,
        amountWire: bridged.toString(),
        srcAsset: 'USDC',
        dstAsset: INDEX_DST_ASSET,
        srcAmount: String(wireToUsdNumber(BigInt(amountWire))),
        srcAddress: wallet.stellarAddress!,
        destAddress: wallet.ethereumAddress!,
        quoteJson: JSON.stringify({
          index: INDEX_DEF.id,
          weighting: INDEX_DEF.weighting,
          totalWire: amountWire,
          legs: verdict.slices.map((sl) => ({ ...sl, amountWire: sl.amountWire.toString() })),
          stellarLegs,
        }),
      },
    });
    await tx.indexLeg.createMany({
      data: verdict.slices.map((s) => ({
        purchaseId: row.id,
        userId: user.id,
        symbol: s.symbol,
        weightBps: s.weightBps,
        amountWire: s.amountWire.toString(),
      })),
    });
    return row;
  });

  return NextResponse.json({
    // amountWire: what Circle moves (the burn); totalWire: what the person pays.
    purchase: {
      id: purchase.id,
      amountWire: bridged.toString(),
      totalWire: amountWire,
      destAddress: purchase.destAddress,
    },
    stellarLegs,
    legs: verdict.slices.map((s) => ({
      symbol: s.symbol,
      weightBps: s.weightBps,
      amountWire: s.amountWire.toString(),
    })),
  });
});
